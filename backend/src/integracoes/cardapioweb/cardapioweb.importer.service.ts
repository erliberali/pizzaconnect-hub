import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CardapioWebClient } from './cardapioweb.client';
import { mapOrderParaCanonico } from './cardapioweb.mapper';
import type { CwCredencial, CwOrder } from './cardapioweb.types';

// Quantos dias atrás buscar quando não há last_sync_at
const DIAS_HISTORICO_INICIAL = 10;

@Injectable()
export class CardapioWebImporterService {
  private readonly logger = new Logger(CardapioWebImporterService.name);

  constructor(
    private supabase: SupabaseService,
    private cwClient: CardapioWebClient,
  ) {}

  @Cron('*/10 * * * *', { name: 'reconciliador-incremental' })
  async reconciliarTodasPizzarias() {
    this.logger.log('Iniciando reconciliação incremental...');

    const { data: credenciais, error } = await this.supabase.db
      .from('integracao_credencial')
      .select('id')
      .eq('ativo', true)
      .eq('origem', 'cardapioweb');

    if (error) { this.logger.error(error.message); return; }
    if (!credenciais?.length) { this.logger.warn('Nenhuma credencial ativa.'); return; }

    for (const cred of credenciais) {
      await this.importarPedidosDaCredencial(cred.id);
    }

    this.logger.log(`Reconciliação concluída para ${credenciais.length} pizzaria(s).`);
  }

  async importarPedidosDaCredencial(credencialId: string): Promise<{ importados: number; erros: number }> {
    const { data: cred, error: credErr } = await this.supabase.db
      .from('integracao_credencial')
      .select('*')
      .eq('id', credencialId)
      .single();

    if (credErr || !cred) throw new Error(`Credencial não encontrada: ${credencialId}`);

    const cwCred: CwCredencial = {
      estabelecimento_externo_id: cred.estabelecimento_externo_id,
      api_key: this.descriptografar(cred.api_key_encrypted ?? ''),
    };

    // Define o intervalo de busca
    const dataInicio = cred.last_sync_at
      ? new Date(cred.last_sync_at)
      : this.dataInicioHistorico();
    const dataFim = new Date();

    this.logger.log(
      `Importando [${cred.estabelecimento_externo_id}] de ${this.formatarData(dataInicio)} até ${this.formatarData(dataFim)}`,
    );

    let importados = 0;
    let erros = 0;

    // Itera por chunks mensais com delay para respeitar rate limit da API
    for (const chunk of this.gerarChunksmensais(dataInicio, dataFim)) {
      const { importados: imp, erros: err } = await this.importarChunk(
        cwCred,
        cred.pizzaria_id,
        chunk.inicio,
        chunk.fim,
      );
      importados += imp;
      erros += err;
      await this.sleep(2000); // 2s entre chunks para evitar 429
    }

    if (importados > 0) {
      await this.supabase.db
        .from('integracao_credencial')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', credencialId);
    }

    this.logger.log(`[${cred.estabelecimento_externo_id}] importados=${importados} erros=${erros}`);
    return { importados, erros };
  }

  private async importarChunk(
    cwCred: CwCredencial,
    pizzariaId: string,
    inicio: Date,
    fim: Date,
  ): Promise<{ importados: number; erros: number }> {
    let importados = 0;
    let erros = 0;
    let page = 1;
    let totalPages = 1;

    do {
      let historico: import('./cardapioweb.types').CwHistoryItem[];

      try {
        const result = await this.pollHistoryComRetry(cwCred, inicio, fim, page);
        historico = result.items;
        totalPages = result.pagination.total_pages;
        this.logger.log(
          `[${cwCred.estabelecimento_externo_id}] ${this.formatarData(inicio)}→${this.formatarData(fim)} p${page}/${totalPages}: ${historico.length} pedido(s)`,
        );
      } catch (err) {
        this.logger.error(
          `Falha no history [${cwCred.estabelecimento_externo_id}] ${this.formatarData(inicio)}→${this.formatarData(fim)} p${page}: ${err.message}`,
        );
        erros++;
        break;
      }

      for (const item of historico) {
        try {
          const order: CwOrder = await this.cwClient.getOrder(cwCred, item.id);
          await this.upsertPedido(order, pizzariaId);
          importados++;
        } catch (err) {
          this.logger.error(`Erro ao importar order ${item.id}: ${err.message}`);
          erros++;
        }
        await this.sleep(300); // 300ms entre cada GET /orders/{id} para evitar rate limit
      }

      page++;
      if (page <= totalPages) await this.sleep(2000); // 2s entre páginas do history
    } while (page <= totalPages);

    return { importados, erros };
  }

  private async upsertPedido(order: CwOrder, pizzariaId: string) {
    const { pedido, itens } = mapOrderParaCanonico(order, pizzariaId);

    const { data: saved, error } = await this.supabase.db
      .from('pedido')
      .upsert(pedido as any, {
        onConflict: 'pizzaria_id,origem,pedido_externo_id',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    if (itens.length > 0 && saved) {
      await this.supabase.db.from('pedido_item').delete().eq('pedido_id', saved.id);
      await this.supabase.db.from('pedido_item').insert(
        itens.map((item) => ({ ...item, pedido_id: saved.id })),
      );
    }
  }

  private async pollHistoryComRetry(
    cwCred: CwCredencial,
    inicio: Date,
    fim: Date,
    page = 1,
    tentativas = 3,
  ): Promise<{ items: import('./cardapioweb.types').CwHistoryItem[]; pagination: import('./cardapioweb.types').CwHistoryPagination }> {
    for (let t = 1; t <= tentativas; t++) {
      try {
        return await this.cwClient.pollHistory(cwCred, {
          start_date: this.formatarData(inicio),
          end_date: this.formatarData(fim),
          page,
        });
      } catch (err) {
        const status = err?.response?.status;
        if (status === 429 && t < tentativas) {
          const delay = t * 5000;
          this.logger.warn(`Rate limit 429 [${cwCred.estabelecimento_externo_id}], aguardando ${delay / 1000}s (${t}/${tentativas})`);
          await this.sleep(delay);
        } else {
          throw err;
        }
      }
    }
    throw new Error('Todas as tentativas falharam');
  }

  // Gera chunks de [inicio, fim] por mês (primeiro chunk usa a data exata de inicio)
  private *gerarChunksmensais(inicio: Date, fim: Date): Generator<{ inicio: Date; fim: Date }> {
    let cursor = new Date(inicio);

    while (cursor <= fim) {
      const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // último dia do mês
      yield {
        inicio: new Date(cursor),
        fim: fimMes < fim ? fimMes : new Date(fim),
      };
      // Avança para o 1º do próximo mês
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  // Formato DD/MM/YYYY exigido pela API CardapioWeb
  private formatarData(data: Date): string {
    const d = String(data.getDate()).padStart(2, '0');
    const m = String(data.getMonth() + 1).padStart(2, '0');
    const y = data.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private dataInicioHistorico(): Date {
    const d = new Date();
    d.setDate(d.getDate() - DIAS_HISTORICO_INICIAL);
    return d;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // TODO: implementar AES-256 com ENCRYPTION_KEY
  private descriptografar(valor: string): string {
    return valor;
  }
}
