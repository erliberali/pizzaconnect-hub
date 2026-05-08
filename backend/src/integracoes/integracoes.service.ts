import { Injectable } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CardapioWebImporterService } from './cardapioweb/cardapioweb.importer.service';

export class CriarCredencialDto {
  @IsString() pizzaria_id: string;
  @IsString() estabelecimento_externo_id: string;
  @IsString() api_key: string;
  @IsString() partner_key: string;
  @IsOptional() @IsString() webhook_secret?: string;
}

@Injectable()
export class IntegracoesService {
  constructor(
    private supabase: SupabaseService,
    private importer: CardapioWebImporterService,
  ) {}

  async listarCredenciais(pizzariaId?: string) {
    let query = this.supabase.db.from('integracao_credencial').select('*').order('created_at', { ascending: false });
    if (pizzariaId) query = query.eq('pizzaria_id', pizzariaId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async criarCredencial(dto: CriarCredencialDto) {
    const { data, error } = await this.supabase.db
      .from('integracao_credencial')
      .insert({
        pizzaria_id: dto.pizzaria_id,
        origem: 'cardapioweb',
        estabelecimento_externo_id: dto.estabelecimento_externo_id,
        // TODO: criptografar com ENCRYPTION_KEY antes de persistir
        api_key_encrypted: dto.api_key,
        partner_key_encrypted: dto.partner_key,
        webhook_secret: dto.webhook_secret ?? null,
        ativo: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async reconciliar(credencialId: string) {
    return this.importer.importarPedidosDaCredencial(credencialId);
  }

  async listarEventos(pizzariaId?: string, limit = 50) {
    let query = this.supabase.db
      .from('evento_integracao')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);
    if (pizzariaId) query = query.eq('pizzaria_id', pizzariaId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
