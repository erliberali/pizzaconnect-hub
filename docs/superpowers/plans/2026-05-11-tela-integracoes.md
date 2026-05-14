# Tela de Integrações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `src/pages/Integracoes.tsx` (hoje 100% mock) por tela funcional com 3 tabs (Credenciais / Sincronizações / Eventos), CRUD de credenciais, reconciliação manual via job queue (`sync_job`) e monitoramento em tempo real.

**Architecture:** Frontend lê/escreve direto no Supabase (alinha com preferência do projeto). Reconciliação manual = `INSERT` em `sync_job`. Worker no backend NestJS (cron 5s) pega job via `FOR UPDATE SKIP LOCKED`, executa `importarPeriodo` (refator do importer existente), atualiza progresso. UI acompanha via Supabase Realtime.

**Tech Stack:** React 18 + TypeScript + Vite, shadcn/ui, React Hook Form + Zod, TanStack React Query v5, Supabase JS, NestJS, `@nestjs/schedule`, Vitest + RTL, Jest.

**Spec:** `docs/superpowers/specs/2026-05-11-tela-integracoes-design.md`

---

## Phase 1 — Migration `sync_job`

### Task 1: Criar migration `sync_job`

**Files:**
- Create: `backend/supabase/migrations/002_sync_job.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- backend/supabase/migrations/002_sync_job.sql
CREATE TYPE sync_job_status AS ENUM ('queued', 'running', 'completed', 'failed');

CREATE TABLE sync_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_id UUID NOT NULL REFERENCES integracao_credencial(id) ON DELETE CASCADE,
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status sync_job_status NOT NULL DEFAULT 'queued',
  total_pages INT,
  current_page INT,
  total_count INT,
  processed_count INT,
  imported_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX sync_job_status_created_idx ON sync_job (status, created_at);
CREATE INDEX sync_job_credencial_created_idx ON sync_job (credencial_id, created_at DESC);

ALTER TABLE sync_job ENABLE ROW LEVEL SECURITY;

-- Leitura: anon pode ler (RLS de pizzaria_id é controlado pelo client filter por enquanto;
-- alinha com o padrão atual de pedido/integracao_credencial).
CREATE POLICY sync_job_select_anon ON sync_job
  FOR SELECT TO anon
  USING (true);

-- Insert via anon: permitido (frontend enfileira jobs)
CREATE POLICY sync_job_insert_anon ON sync_job
  FOR INSERT TO anon
  WITH CHECK (status = 'queued');

-- Update apenas via service_role (worker)
CREATE POLICY sync_job_update_service_role ON sync_job
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Aplicar migration via MCP Supabase**

Use `mcp__plugin_supabase_supabase__apply_migration` com `name: "002_sync_job"` e `query` = conteúdo do arquivo. Projeto: `qfvzdxptqtjxxoscedrk`.

- [ ] **Step 3: Verificar a tabela foi criada**

Use `mcp__plugin_supabase_supabase__list_tables` (schemas: `["public"]`) e confirme que `sync_job` aparece com as colunas esperadas.

- [ ] **Step 4: Regenerar `database.types.ts`**

```bash
cd backend && npx supabase gen types typescript --project-id qfvzdxptqtjxxoscedrk > src/common/supabase/database.types.ts
```

(Se o CLI Supabase não estiver instalado, usar o MCP `generate_typescript_types` e salvar o conteúdo no arquivo.)

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migrations/002_sync_job.sql backend/src/common/supabase/database.types.ts
git commit -m "feat(integracoes): migration sync_job + RLS"
```

---

## Phase 2 — Backend: refator do importer + worker

### Task 2: Extrair `importarPeriodo` no importer

**Files:**
- Modify: `backend/src/integracoes/cardapioweb/cardapioweb.importer.service.ts`

- [ ] **Step 1: Adicionar tipo de progresso**

No topo do arquivo, após os imports:

```typescript
export interface ImportProgress {
  current_page: number;
  total_pages: number;
  processed_count: number;
  total_count: number;
}

export interface ImportResult {
  importados: number;
  atualizados: number;
  erros: number;
}
```

- [ ] **Step 2: Adicionar método `importarPeriodo`**

Adicionar depois de `importarPedidosDaCredencial`:

```typescript
async importarPeriodo(
  credencialId: string,
  inicio: Date,
  fim: Date,
  onProgress?: (p: ImportProgress) => void | Promise<void>,
): Promise<ImportResult> {
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

  let importados = 0;
  let atualizados = 0;
  let erros = 0;
  let processed = 0;
  let totalCount = 0;
  let totalPages = 0;
  let pageGlobal = 0;

  for (const chunk of this.gerarChunksmensais(inicio, fim)) {
    const r = await this.importarChunkComProgresso(
      cwCred,
      cred.pizzaria_id,
      chunk.inicio,
      chunk.fim,
      async (pageInfo) => {
        pageGlobal++;
        totalPages = Math.max(totalPages, pageInfo.totalPagesAcumulado);
        totalCount = Math.max(totalCount, pageInfo.totalCountAcumulado);
        processed = pageInfo.processedAcumulado;
        if (onProgress) {
          await onProgress({
            current_page: pageGlobal,
            total_pages: totalPages,
            processed_count: processed,
            total_count: totalCount,
          });
        }
      },
    );
    importados += r.importados;
    atualizados += r.atualizados;
    erros += r.erros;
    await this.sleep(2000);
  }

  return { importados, atualizados, erros };
}
```

- [ ] **Step 3: Adicionar `importarChunkComProgresso` (refator)**

Adicionar como private method. Reaproveita lógica de `importarChunk` mas chama callback após cada página:

```typescript
private async importarChunkComProgresso(
  cwCred: CwCredencial,
  pizzariaId: string,
  inicio: Date,
  fim: Date,
  onPage: (info: {
    totalPagesAcumulado: number;
    totalCountAcumulado: number;
    processedAcumulado: number;
  }) => void | Promise<void>,
): Promise<ImportResult> {
  let importados = 0;
  let atualizados = 0;
  let erros = 0;
  let processed = 0;
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;

  do {
    let historico: import('./cardapioweb.types').CwHistoryItem[];
    try {
      const result = await this.pollHistoryComRetry(cwCred, inicio, fim, page);
      historico = result.items;
      totalPages = result.pagination.total_pages;
      totalCount = result.pagination.total_orders ?? totalCount;
    } catch (err) {
      this.logger.error(`Falha history p${page}: ${err.message}`);
      erros++;
      break;
    }

    for (const item of historico) {
      try {
        const order: CwOrder = await this.cwClient.getOrder(cwCred, item.id);
        const wasUpdate = await this.upsertPedidoReturnAction(order, pizzariaId);
        if (wasUpdate) atualizados++;
        else importados++;
        processed++;
      } catch (err) {
        this.logger.error(`Erro order ${item.id}: ${err.message}`);
        erros++;
      }
      await this.sleep(300);
    }

    await onPage({
      totalPagesAcumulado: totalPages,
      totalCountAcumulado: totalCount,
      processedAcumulado: processed,
    });

    page++;
    if (page <= totalPages) await this.sleep(2000);
  } while (page <= totalPages);

  return { importados, atualizados, erros };
}
```

- [ ] **Step 4: Adicionar `upsertPedidoReturnAction`**

Modifica `upsertPedido` original para retornar se foi insert ou update. Pode ser feito checando se o registro já existia antes:

```typescript
private async upsertPedidoReturnAction(order: CwOrder, pizzariaId: string): Promise<boolean> {
  const { pedido, itens } = mapOrderParaCanonico(order, pizzariaId);

  const { data: existing } = await this.supabase.db
    .from('pedido')
    .select('id')
    .eq('pizzaria_id', pizzariaId)
    .eq('origem', pedido.origem)
    .eq('pedido_externo_id', pedido.pedido_externo_id)
    .maybeSingle();

  const wasUpdate = !!existing;

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

  return wasUpdate;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/integracoes/cardapioweb/cardapioweb.importer.service.ts
git commit -m "feat(integracoes): expor importarPeriodo com callback de progresso"
```

### Task 3: Teste do `importarPeriodo`

**Files:**
- Create: `backend/src/integracoes/cardapioweb/cardapioweb.importer.service.spec.ts`

- [ ] **Step 1: Escrever teste do callback de progresso**

```typescript
import { Test } from '@nestjs/testing';
import { CardapioWebImporterService } from './cardapioweb.importer.service';
import { CardapioWebClient } from './cardapioweb.client';
import { SupabaseService } from '../../common/supabase/supabase.service';

describe('CardapioWebImporterService.importarPeriodo', () => {
  let service: CardapioWebImporterService;
  let client: jest.Mocked<CardapioWebClient>;
  let supabase: any;

  beforeEach(async () => {
    client = {
      pollHistory: jest.fn(),
      getOrder: jest.fn(),
    } as any;

    const credData = {
      id: 'cred-1', pizzaria_id: 'piz-1',
      estabelecimento_externo_id: '18583', api_key_encrypted: 'key',
    };

    supabase = {
      db: {
        from: jest.fn((tbl: string) => {
          if (tbl === 'integracao_credencial') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: credData, error: null }) }) }) };
          }
          if (tbl === 'pedido') {
            return {
              select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
              upsert: () => ({ select: () => ({ single: async () => ({ data: { id: 'p-1' }, error: null }) }) }),
            };
          }
          if (tbl === 'pedido_item') {
            return { delete: () => ({ eq: async () => ({}) }), insert: async () => ({}) };
          }
          return {};
        }),
      },
    };

    const mod = await Test.createTestingModule({
      providers: [
        CardapioWebImporterService,
        { provide: CardapioWebClient, useValue: client },
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    service = mod.get(CardapioWebImporterService);
    // Desabilita sleeps para acelerar o teste
    (service as any).sleep = () => Promise.resolve();
  });

  it('chama onProgress após cada página com contadores acumulados', async () => {
    client.pollHistory.mockResolvedValueOnce({
      items: [{ id: 1 } as any, { id: 2 } as any],
      pagination: { current_page: 1, total_pages: 2, total_orders: 3 } as any,
    });
    client.pollHistory.mockResolvedValueOnce({
      items: [{ id: 3 } as any],
      pagination: { current_page: 2, total_pages: 2, total_orders: 3 } as any,
    });
    client.getOrder.mockResolvedValue({ id: 1 } as any);

    const progressCalls: any[] = [];
    const res = await service.importarPeriodo(
      'cred-1',
      new Date('2026-04-01'),
      new Date('2026-04-30'),
      (p) => { progressCalls.push(p); },
    );

    expect(progressCalls.length).toBe(2);
    expect(progressCalls[0]).toMatchObject({ current_page: 1, total_pages: 2, processed_count: 2, total_count: 3 });
    expect(progressCalls[1]).toMatchObject({ current_page: 2, total_pages: 2, processed_count: 3, total_count: 3 });
    expect(res.importados + res.atualizados + res.erros).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar e verificar**

```bash
cd backend && npx jest cardapioweb.importer.service.spec --no-coverage
```

Expected: PASS (1 test).

- [ ] **Step 3: Commit**

```bash
git add backend/src/integracoes/cardapioweb/cardapioweb.importer.service.spec.ts
git commit -m "test(integracoes): cobrir importarPeriodo com callback de progresso"
```

### Task 4: Criar `SyncWorkerService`

**Files:**
- Create: `backend/src/integracoes/sync-worker/sync-worker.module.ts`
- Create: `backend/src/integracoes/sync-worker/sync-worker.service.ts`
- Modify: `backend/src/integracoes/integracoes.module.ts`

- [ ] **Step 1: Criar `sync-worker.service.ts`**

```typescript
// backend/src/integracoes/sync-worker/sync-worker.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CardapioWebImporterService, ImportProgress } from '../cardapioweb/cardapioweb.importer.service';

const STUCK_JOB_THRESHOLD_MIN = 15;
const PROGRESS_DEBOUNCE_MS = 2000;

@Injectable()
export class SyncWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SyncWorkerService.name);
  private busy = false;

  constructor(
    private supabase: SupabaseService,
    private importer: CardapioWebImporterService,
  ) {}

  async onModuleInit() {
    await this.resetStuckJobs();
  }

  @Cron('*/5 * * * * *', { name: 'sync-worker' })
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.claimNextJob();
      if (!job) return;
      await this.processJob(job);
    } catch (err: any) {
      this.logger.error(`Worker tick error: ${err.message}`);
    } finally {
      this.busy = false;
    }
  }

  private async claimNextJob(): Promise<any | null> {
    // Usa RPC porque supabase-js não suporta SELECT FOR UPDATE diretamente.
    // Alternativa: chamada SQL via .rpc('claim_sync_job').
    // Para esta iteração, fazemos a estratégia "update returning" otimista.
    const { data, error } = await this.supabase.db.rpc('claim_sync_job');
    if (error) {
      this.logger.error(`claim_sync_job: ${error.message}`);
      return null;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  private async processJob(job: any) {
    this.logger.log(`Processing job ${job.id} (${job.periodo_inicio} → ${job.periodo_fim})`);
    let lastProgressAt = 0;

    const onProgress = async (p: ImportProgress) => {
      const now = Date.now();
      if (now - lastProgressAt < PROGRESS_DEBOUNCE_MS) return;
      lastProgressAt = now;
      await this.supabase.db
        .from('sync_job')
        .update({
          current_page: p.current_page,
          total_pages: p.total_pages,
          processed_count: p.processed_count,
          total_count: p.total_count,
        })
        .eq('id', job.id);
    };

    try {
      const result = await this.importer.importarPeriodo(
        job.credencial_id,
        new Date(job.periodo_inicio),
        new Date(job.periodo_fim),
        onProgress,
      );

      await this.supabase.db
        .from('sync_job')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          imported_count: result.importados,
          updated_count: result.atualizados,
          error_count: result.erros,
        })
        .eq('id', job.id);

      this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    } catch (err: any) {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      await this.supabase.db
        .from('sync_job')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: String(err.message ?? err).slice(0, 1000),
        })
        .eq('id', job.id);
    }
  }

  private async resetStuckJobs() {
    const cutoff = new Date(Date.now() - STUCK_JOB_THRESHOLD_MIN * 60_000).toISOString();
    const { error, count } = await this.supabase.db
      .from('sync_job')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: 'worker reiniciado',
      }, { count: 'exact' })
      .eq('status', 'running')
      .lt('started_at', cutoff);
    if (error) this.logger.warn(`resetStuckJobs: ${error.message}`);
    else if (count) this.logger.warn(`${count} job(s) presos foram marcados como failed`);
  }
}
```

- [ ] **Step 2: Criar `sync-worker.module.ts`**

```typescript
// backend/src/integracoes/sync-worker/sync-worker.module.ts
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { CardapioWebModule } from '../cardapioweb/cardapioweb.module';
import { SyncWorkerService } from './sync-worker.service';

@Module({
  imports: [SupabaseModule, CardapioWebModule],
  providers: [SyncWorkerService],
})
export class SyncWorkerModule {}
```

- [ ] **Step 3: Criar função SQL `claim_sync_job`**

Migration nova: `backend/supabase/migrations/003_claim_sync_job_fn.sql`

```sql
CREATE OR REPLACE FUNCTION claim_sync_job()
RETURNS sync_job
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job sync_job;
BEGIN
  UPDATE sync_job
  SET status = 'running', started_at = now()
  WHERE id = (
    SELECT id FROM sync_job
    WHERE status = 'queued'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_sync_job() FROM anon;
GRANT EXECUTE ON FUNCTION claim_sync_job() TO service_role;
```

Aplicar via MCP `apply_migration` com `name: "003_claim_sync_job_fn"`.

- [ ] **Step 4: Registrar `SyncWorkerModule` em `integracoes.module.ts`**

```typescript
// backend/src/integracoes/integracoes.module.ts
import { Module } from '@nestjs/common';
import { CardapioWebModule } from './cardapioweb/cardapioweb.module';
import { SyncWorkerModule } from './sync-worker/sync-worker.module';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesService } from './integracoes.service';

@Module({
  imports: [CardapioWebModule, SyncWorkerModule],
  controllers: [IntegracoesController],
  providers: [IntegracoesService],
})
export class IntegracoesModule {}
```

- [ ] **Step 5: Build local**

```bash
cd backend && npx nest build
```

Expected: build OK, sem erros TS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/integracoes/sync-worker backend/src/integracoes/integracoes.module.ts backend/supabase/migrations/003_claim_sync_job_fn.sql
git commit -m "feat(integracoes): SyncWorkerService + claim_sync_job RPC"
```

### Task 5: Teste do `SyncWorkerService`

**Files:**
- Create: `backend/src/integracoes/sync-worker/sync-worker.service.spec.ts`

- [ ] **Step 1: Escrever teste do ciclo queued→running→completed**

```typescript
import { Test } from '@nestjs/testing';
import { SyncWorkerService } from './sync-worker.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CardapioWebImporterService } from '../cardapioweb/cardapioweb.importer.service';

describe('SyncWorkerService', () => {
  let service: SyncWorkerService;
  let importer: jest.Mocked<CardapioWebImporterService>;
  let updateMock: jest.Mock;
  let rpcMock: jest.Mock;

  const makeSupabase = (job: any) => {
    updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    rpcMock = jest.fn().mockResolvedValue({ data: job, error: null });
    return {
      db: {
        rpc: rpcMock,
        from: jest.fn(() => ({ update: updateMock })),
      },
    } as any;
  };

  beforeEach(async () => {
    importer = { importarPeriodo: jest.fn() } as any;
  });

  it('marca completed ao terminar com sucesso', async () => {
    const job = { id: 'j-1', credencial_id: 'c-1', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-10' };
    const supa = makeSupabase(job);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    importer.importarPeriodo.mockResolvedValue({ importados: 5, atualizados: 2, erros: 0 });

    await service.tick();

    expect(importer.importarPeriodo).toHaveBeenCalledWith('c-1', new Date('2026-04-01'), new Date('2026-04-10'), expect.any(Function));
    const lastCall = updateMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ status: 'completed', imported_count: 5, updated_count: 2, error_count: 0 });
  });

  it('marca failed quando importer lança', async () => {
    const job = { id: 'j-2', credencial_id: 'c-1', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-10' };
    const supa = makeSupabase(job);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    importer.importarPeriodo.mockRejectedValue(new Error('boom'));

    await service.tick();

    const lastCall = updateMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ status: 'failed', error_message: expect.stringContaining('boom') });
  });

  it('não processa quando claim_sync_job retorna null', async () => {
    const supa = makeSupabase(null);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    await service.tick();
    expect(importer.importarPeriodo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar**

```bash
cd backend && npx jest sync-worker.service.spec --no-coverage
```

Expected: 3 testes PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/integracoes/sync-worker/sync-worker.service.spec.ts
git commit -m "test(integracoes): cobrir ciclo do SyncWorkerService"
```

---

## Phase 3 — Frontend: tipos e hooks

### Task 6: Tipos TypeScript

**Files:**
- Modify: `src/types/index.ts` (ou onde estão os tipos)
- Create: `src/types/integracoes.ts` (se não houver lugar óbvio)

- [ ] **Step 1: Verificar tipos existentes**

```bash
ls src/types
```

Se `index.ts` existe e centraliza tipos, adicionar lá. Se não, criar `src/types/integracoes.ts`.

- [ ] **Step 2: Adicionar tipos**

```typescript
export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SyncJob {
  id: string;
  credencial_id: string;
  pizzaria_id: string;
  periodo_inicio: string; // YYYY-MM-DD
  periodo_fim: string;
  status: SyncJobStatus;
  total_pages: number | null;
  current_page: number | null;
  total_count: number | null;
  processed_count: number | null;
  imported_count: number;
  updated_count: number;
  error_count: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface IntegracaoCredencial {
  id: string;
  pizzaria_id: string;
  origem: string;
  estabelecimento_externo_id: string;
  api_key_encrypted: string | null;
  webhook_secret: string | null;
  ativo: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface EventoIntegracao {
  id: string;
  pizzaria_id: string;
  credencial_id: string | null;
  origem: string;
  tipo_evento: string;
  event_external_id: string | null;
  resource_type: string | null;
  resource_external_id: string | null;
  received_at: string;
  processed_at: string | null;
  status: 'received' | 'processing' | 'processed' | 'failed';
  error_message: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types
git commit -m "feat(integracoes): tipos TS para SyncJob, Credencial, Evento"
```

### Task 7: Hook `useCredenciais`

**Files:**
- Create: `src/hooks/integracoes/useCredenciais.ts`
- Create: `src/hooks/integracoes/index.ts`

- [ ] **Step 1: Escrever teste do hook**

`src/hooks/integracoes/useCredenciais.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCredenciais } from './useCredenciais';

const mockSelect = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ order: mockSelect }) }) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useCredenciais', () => {
  beforeEach(() => mockSelect.mockReset());

  it('retorna credenciais ordenadas', async () => {
    mockSelect.mockResolvedValue({
      data: [
        { id: 'a', pizzaria_id: 'p1', estabelecimento_externo_id: '18583', ativo: true },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCredenciais(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar — espera falhar**

```bash
npx vitest run src/hooks/integracoes/useCredenciais.test
```

Expected: FAIL com "Cannot find module './useCredenciais'".

- [ ] **Step 3: Criar `useCredenciais.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IntegracaoCredencial } from '@/types/integracoes';

export function useCredenciais(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['credenciais', pizzariaId ?? 'all'],
    queryFn: async (): Promise<IntegracaoCredencial[]> => {
      let q = supabase.from('integracao_credencial').select('*').order('created_at', { ascending: false });
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegracaoCredencial[];
    },
    staleTime: 30 * 1000,
  });
}
```

- [ ] **Step 4: Criar `index.ts` (barrel)**

```typescript
export * from './useCredenciais';
```

- [ ] **Step 5: Rodar teste — passa**

```bash
npx vitest run src/hooks/integracoes/useCredenciais.test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/integracoes
git commit -m "feat(integracoes): useCredenciais hook + teste"
```

### Task 8: Hook `useUpsertCredencial`

**Files:**
- Create: `src/hooks/integracoes/useUpsertCredencial.ts`
- Modify: `src/hooks/integracoes/index.ts`

- [ ] **Step 1: Escrever teste**

`src/hooks/integracoes/useUpsertCredencial.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpsertCredencial } from './useUpsertCredencial';

const upsertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ upsert: upsertMock }) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useUpsertCredencial', () => {
  it('chama upsert com payload e propaga erro 23505', async () => {
    upsertMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } });
    const { result } = renderHook(() => useUpsertCredencial(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await expect(
      result.current.mutateAsync({ pizzaria_id: 'p1', estabelecimento_externo_id: '123', api_key: 'k', ativo: true })
    ).rejects.toMatchObject({ code: '23505' });
  });
});
```

- [ ] **Step 2: Implementar**

```typescript
// src/hooks/integracoes/useUpsertCredencial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpsertCredencialInput {
  id?: string;
  pizzaria_id: string;
  estabelecimento_externo_id: string;
  api_key?: string;
  ativo: boolean;
}

export function useUpsertCredencial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertCredencialInput) => {
      const payload: any = {
        ...(input.id ? { id: input.id } : {}),
        pizzaria_id: input.pizzaria_id,
        estabelecimento_externo_id: input.estabelecimento_externo_id,
        origem: 'cardapioweb',
        ativo: input.ativo,
      };
      if (input.api_key && input.api_key.trim().length > 0) {
        payload.api_key_encrypted = input.api_key;
      }
      const { data, error } = await supabase
        .from('integracao_credencial')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credenciais'] }),
  });
}
```

- [ ] **Step 3: Atualizar barrel**

Adicionar em `src/hooks/integracoes/index.ts`:
```typescript
export * from './useUpsertCredencial';
```

- [ ] **Step 4: Rodar teste**

```bash
npx vitest run src/hooks/integracoes/useUpsertCredencial.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/integracoes
git commit -m "feat(integracoes): useUpsertCredencial hook + teste"
```

### Task 9: Hook `useSyncJobs` com realtime

**Files:**
- Create: `src/hooks/integracoes/useSyncJobs.ts`
- Modify: `src/hooks/integracoes/index.ts`

- [ ] **Step 1: Implementar (sem teste de realtime — testar manualmente)**

```typescript
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SyncJob } from '@/types/integracoes';

export function useSyncJobs(params: { pizzariaId?: string | null; credencialId?: string | null; limit?: number } = {}) {
  const qc = useQueryClient();
  const { pizzariaId, credencialId, limit = 50 } = params;
  const queryKey = ['sync-jobs', pizzariaId ?? 'all', credencialId ?? 'all', limit];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SyncJob[]> => {
      let q = supabase.from('sync_job').select('*').order('created_at', { ascending: false }).limit(limit);
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      if (credencialId) q = (q as any).eq('credencial_id', credencialId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SyncJob[];
    },
    staleTime: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`sync-jobs-${pizzariaId ?? 'all'}-${credencialId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_job' }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pizzariaId, credencialId, qc, queryKey.join(',')]);

  return query;
}
```

- [ ] **Step 2: Atualizar barrel**

```typescript
export * from './useSyncJobs';
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/integracoes
git commit -m "feat(integracoes): useSyncJobs com realtime subscription"
```

### Task 10: Hook `useEnqueueSyncJob`

**Files:**
- Create: `src/hooks/integracoes/useEnqueueSyncJob.ts`
- Modify: `src/hooks/integracoes/index.ts`

- [ ] **Step 1: Escrever teste**

`src/hooks/integracoes/useEnqueueSyncJob.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnqueueSyncJob } from './useEnqueueSyncJob';

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tbl: string) => fromMock(tbl), auth: { getUser: async () => ({ data: { user: null } }) } },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useEnqueueSyncJob', () => {
  it('bloqueia quando já há job ativo pra mesma credencial', async () => {
    fromMock.mockImplementation((tbl: string) => {
      if (tbl === 'sync_job') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({ limit: () => Promise.resolve({ data: [{ id: 'existing' }], error: null }) }),
            }),
          }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEnqueueSyncJob(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await expect(
      result.current.mutateAsync({
        credencial_id: 'c1', pizzaria_id: 'p1',
        periodo_inicio: '2026-04-01', periodo_fim: '2026-04-10',
      })
    ).rejects.toThrow(/já existe sync/i);
  });
});
```

- [ ] **Step 2: Implementar**

```typescript
// src/hooks/integracoes/useEnqueueSyncJob.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EnqueueSyncJobInput {
  credencial_id: string;
  pizzaria_id: string;
  periodo_inicio: string; // YYYY-MM-DD
  periodo_fim: string;
}

export function useEnqueueSyncJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EnqueueSyncJobInput) => {
      const { data: existing } = await supabase
        .from('sync_job')
        .select('id')
        .eq('credencial_id', input.credencial_id)
        .in('status', ['queued', 'running'])
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error('Já existe sync em andamento pra essa credencial');
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('sync_job')
        .insert({
          credencial_id: input.credencial_id,
          pizzaria_id: input.pizzaria_id,
          periodo_inicio: input.periodo_inicio,
          periodo_fim: input.periodo_fim,
          status: 'queued',
          created_by: userData?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sync-jobs'] }),
  });
}
```

- [ ] **Step 3: Atualizar barrel + rodar teste**

```bash
npx vitest run src/hooks/integracoes/useEnqueueSyncJob.test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/integracoes
git commit -m "feat(integracoes): useEnqueueSyncJob com bloqueio de duplicatas"
```

### Task 11: Hooks `useEventosIntegracao` e `useIntegracoesStats`

**Files:**
- Create: `src/hooks/integracoes/useEventosIntegracao.ts`
- Create: `src/hooks/integracoes/useIntegracoesStats.ts`
- Modify: `src/hooks/integracoes/index.ts`

- [ ] **Step 1: `useEventosIntegracao.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EventoIntegracao } from '@/types/integracoes';

export function useEventosIntegracao(pizzariaId?: string | null, limit = 50) {
  return useQuery({
    queryKey: ['eventos-integracao', pizzariaId ?? 'all', limit],
    queryFn: async (): Promise<EventoIntegracao[]> => {
      let q = supabase.from('evento_integracao').select('*').order('received_at', { ascending: false }).limit(limit);
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EventoIntegracao[];
    },
    staleTime: 30 * 1000,
  });
}
```

- [ ] **Step 2: `useIntegracoesStats.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IntegracoesStats {
  credenciaisAtivas: number;
  syncRodando: number;
  pedidos7d: number;
  falhas7d: number;
}

export function useIntegracoesStats(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['integracoes-stats', pizzariaId ?? 'all'],
    queryFn: async (): Promise<IntegracoesStats> => {
      const sete = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const filtroPiz = (q: any) => (pizzariaId ? q.eq('pizzaria_id', pizzariaId) : q);

      const [credR, runR, pedR, falhaR] = await Promise.all([
        filtroPiz(supabase.from('integracao_credencial').select('id', { count: 'exact', head: true }).eq('ativo', true)),
        filtroPiz(supabase.from('sync_job').select('id', { count: 'exact', head: true }).eq('status', 'running')),
        filtroPiz(supabase.from('pedido').select('id', { count: 'exact', head: true }).eq('origem', 'cardapioweb').gte('created_at', sete)),
        filtroPiz(supabase.from('sync_job').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('finished_at', sete)),
      ]);

      return {
        credenciaisAtivas: credR.count ?? 0,
        syncRodando: runR.count ?? 0,
        pedidos7d: pedR.count ?? 0,
        falhas7d: falhaR.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
  });
}
```

- [ ] **Step 3: Atualizar barrel**

```typescript
// src/hooks/integracoes/index.ts
export * from './useCredenciais';
export * from './useUpsertCredencial';
export * from './useSyncJobs';
export * from './useEnqueueSyncJob';
export * from './useEventosIntegracao';
export * from './useIntegracoesStats';
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/integracoes
git commit -m "feat(integracoes): hooks useEventosIntegracao e useIntegracoesStats"
```

---

## Phase 4 — Frontend: componentes

### Task 12: `CredencialDialog`

**Files:**
- Create: `src/components/integracoes/CredencialDialog.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUpsertCredencial } from '@/hooks/integracoes';
import { usePizzarias } from '@/hooks/usePizzarias';
import type { IntegracaoCredencial } from '@/types/integracoes';

const schema = z.object({
  pizzaria_id: z.string().min(1, 'Selecione uma pizzaria'),
  estabelecimento_externo_id: z.string().regex(/^\d+$/, 'Apenas dígitos'),
  api_key: z.string().optional(),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credencial?: IntegracaoCredencial | null;
}

export function CredencialDialog({ open, onOpenChange, credencial }: Props) {
  const { toast } = useToast();
  const { data: pizzarias = [] } = usePizzarias();
  const upsert = useUpsertCredencial();
  const isEdit = !!credencial;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pizzaria_id: '',
      estabelecimento_externo_id: '',
      api_key: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        pizzaria_id: credencial?.pizzaria_id ?? '',
        estabelecimento_externo_id: credencial?.estabelecimento_externo_id ?? '',
        api_key: '',
        ativo: credencial?.ativo ?? true,
      });
    }
  }, [open, credencial, form]);

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && (!values.api_key || values.api_key.trim().length === 0)) {
      form.setError('api_key', { message: 'API key obrigatória na criação' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: credencial?.id,
        pizzaria_id: values.pizzaria_id,
        estabelecimento_externo_id: values.estabelecimento_externo_id,
        api_key: values.api_key,
        ativo: values.ativo,
      });
      toast({ title: isEdit ? 'Credencial atualizada' : 'Credencial criada' });
      onOpenChange(false);
    } catch (err: any) {
      if (err?.code === '23505') {
        toast({ variant: 'destructive', title: 'CardapioWeb ID já cadastrado', description: 'Já existe credencial para esse estabelecimento.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message ?? 'Erro desconhecido' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Pizzaria</Label>
            <Select
              value={form.watch('pizzaria_id')}
              onValueChange={(v) => form.setValue('pizzaria_id', v)}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pizzarias.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            {form.formState.errors.pizzaria_id && (
              <p className="text-xs text-destructive">{form.formState.errors.pizzaria_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>CardapioWeb ID</Label>
            <Input {...form.register('estabelecimento_externo_id')} placeholder="18583" />
            {form.formState.errors.estabelecimento_externo_id && (
              <p className="text-xs text-destructive">{form.formState.errors.estabelecimento_externo_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>API Key {isEdit && <span className="text-xs text-muted-foreground">(deixe vazio para manter)</span>}</Label>
            <Input type="password" {...form.register('api_key')} placeholder={isEdit ? '••••••••' : ''} />
            {form.formState.errors.api_key && (
              <p className="text-xs text-destructive">{form.formState.errors.api_key.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.watch('ativo')}
              onCheckedChange={(v) => form.setValue('ativo', v)}
            />
            <Label>Ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/integracoes/CredencialDialog.tsx
git commit -m "feat(integracoes): CredencialDialog (criar/editar)"
```

### Task 13: `SyncDialog`

**Files:**
- Create: `src/components/integracoes/SyncDialog.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCredenciais, useEnqueueSyncJob } from '@/hooks/integracoes';

const MAX_RANGE_DIAS = 90;

const schema = z.object({
  credencial_id: z.string().min(1, 'Selecione uma credencial'),
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
}).refine((v) => v.periodo_fim >= v.periodo_inicio, {
  message: 'Data final deve ser >= inicial', path: ['periodo_fim'],
}).refine((v) => v.periodo_fim <= new Date().toISOString().slice(0, 10), {
  message: 'Data final não pode estar no futuro', path: ['periodo_fim'],
}).refine((v) => {
  const ms = new Date(v.periodo_fim).getTime() - new Date(v.periodo_inicio).getTime();
  return ms / (1000 * 60 * 60 * 24) <= MAX_RANGE_DIAS;
}, { message: `Range máximo: ${MAX_RANGE_DIAS} dias`, path: ['periodo_fim'] });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pizzariaId?: string | null;
  defaultCredencialId?: string;
}

export function SyncDialog({ open, onOpenChange, pizzariaId, defaultCredencialId }: Props) {
  const { toast } = useToast();
  const { data: credenciais = [] } = useCredenciais(pizzariaId);
  const enqueue = useEnqueueSyncJob();

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credencial_id: defaultCredencialId ?? '', periodo_inicio: seteDiasAtras, periodo_fim: hoje },
  });

  useEffect(() => {
    if (open) {
      form.reset({ credencial_id: defaultCredencialId ?? '', periodo_inicio: seteDiasAtras, periodo_fim: hoje });
    }
  }, [open, defaultCredencialId]);

  const onSubmit = async (values: FormValues) => {
    const cred = credenciais.find((c) => c.id === values.credencial_id);
    if (!cred) return;
    try {
      await enqueue.mutateAsync({
        credencial_id: cred.id,
        pizzaria_id: cred.pizzaria_id,
        periodo_inicio: values.periodo_inicio,
        periodo_fim: values.periodo_fim,
      });
      toast({ title: 'Sincronização enfileirada', description: 'O worker vai processar em instantes.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Não foi possível enfileirar', description: err?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova sincronização</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Credencial</Label>
            <Select
              value={form.watch('credencial_id')}
              onValueChange={(v) => form.setValue('credencial_id', v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {credenciais.filter(c => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>CardapioWeb #{c.estabelecimento_externo_id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.credencial_id && (
              <p className="text-xs text-destructive">{form.formState.errors.credencial_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Início</Label>
              <Input type="date" {...form.register('periodo_inicio')} />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input type="date" {...form.register('periodo_fim')} />
              {form.formState.errors.periodo_fim && (
                <p className="text-xs text-destructive">{form.formState.errors.periodo_fim.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={enqueue.isPending}>
              {enqueue.isPending ? 'Enfileirando...' : 'Enfileirar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/integracoes/SyncDialog.tsx
git commit -m "feat(integracoes): SyncDialog (nova sincronização)"
```

### Task 14: `IntegracoesStats` + `SyncJobRow`

**Files:**
- Create: `src/components/integracoes/IntegracoesStats.tsx`
- Create: `src/components/integracoes/SyncJobRow.tsx`

- [ ] **Step 1: `IntegracoesStats.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Link2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useIntegracoesStats } from '@/hooks/integracoes';

export function IntegracoesStats({ pizzariaId }: { pizzariaId?: string | null }) {
  const { data } = useIntegracoesStats(pizzariaId);
  const cards = [
    { icon: Link2, label: 'Credenciais ativas', value: data?.credenciaisAtivas ?? 0, color: 'text-primary' },
    { icon: RefreshCw, label: 'Sync rodando', value: data?.syncRodando ?? 0, color: 'text-info' },
    { icon: CheckCircle, label: 'Pedidos importados (7d)', value: data?.pedidos7d ?? 0, color: 'text-success' },
    { icon: AlertTriangle, label: 'Falhas (7d)', value: data?.falhas7d ?? 0, color: 'text-destructive' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-2xl font-display font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `SyncJobRow.tsx`**

```tsx
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SyncJob } from '@/types/integracoes';

const statusVariant: Record<SyncJob['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Na fila', variant: 'secondary' },
  running: { label: 'Rodando', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const fmtRange = (a: string, b: string) => `${a.split('-').reverse().join('/')} → ${b.split('-').reverse().join('/')}`;
const duracao = (job: SyncJob): string => {
  if (!job.started_at) return '—';
  const end = job.finished_at ? new Date(job.finished_at).getTime() : Date.now();
  const ms = end - new Date(job.started_at).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
};

export function SyncJobRow({ job, onClick }: { job: SyncJob; onClick?: () => void }) {
  const st = statusVariant[job.status];
  const pct = job.total_pages && job.current_page ? Math.round((job.current_page / job.total_pages) * 100) : 0;
  return (
    <TableRow className={onClick ? 'cursor-pointer hover:bg-muted/30' : ''} onClick={onClick}>
      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
      <TableCell className="text-xs">{fmtRange(job.periodo_inicio, job.periodo_fim)}</TableCell>
      <TableCell className="w-48">
        {job.status === 'running' ? (
          <div className="space-y-1">
            <Progress value={pct} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              p{job.current_page ?? 0}/{job.total_pages ?? '?'} — {job.processed_count ?? 0}/{job.total_count ?? '?'} pedidos
            </p>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs">
        <span className="text-success">{job.imported_count}</span> /{' '}
        <span className="text-info">{job.updated_count}</span> /{' '}
        <span className="text-destructive">{job.error_count}</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmt(job.started_at)}</TableCell>
      <TableCell className="text-xs">{duracao(job)}</TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/integracoes
git commit -m "feat(integracoes): IntegracoesStats e SyncJobRow"
```

---

## Phase 5 — Frontend: tela com tabs

### Task 15: Reescrever `Integracoes.tsx`

**Files:**
- Modify: `src/pages/Integracoes.tsx`

- [ ] **Step 1: Reescrita completa**

```tsx
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredenciais, useSyncJobs, useEventosIntegracao } from '@/hooks/integracoes';
import { usePizzarias } from '@/hooks/usePizzarias';
import { CredencialDialog } from '@/components/integracoes/CredencialDialog';
import { SyncDialog } from '@/components/integracoes/SyncDialog';
import { IntegracoesStats } from '@/components/integracoes/IntegracoesStats';
import { SyncJobRow } from '@/components/integracoes/SyncJobRow';
import { Plus, RefreshCw, Pencil, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { IntegracaoCredencial, SyncJob } from '@/types/integracoes';

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const mascarar = (s?: string | null) => s && s.length > 4 ? `••••••${s.slice(-4)}` : '••••••';

const eventoIcon: Record<string, JSX.Element> = {
  processed: <CheckCircle className="w-4 h-4 text-success" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
  received: <Clock className="w-4 h-4 text-warning" />,
  processing: <RefreshCw className="w-4 h-4 text-info animate-spin" />,
};

export default function Integracoes() {
  const { currentPizzaria, isConsolidated } = useTenant();
  const { user } = useAuth();
  const role = user?.role;
  const pizzariaId = isConsolidated ? null : currentPizzaria?.id ?? null;

  const podeEditar = role === 'super_admin' || role === 'admin_pizzaria';
  const podeCriar = role === 'super_admin';

  const { data: credenciais = [] } = useCredenciais(pizzariaId);
  const { data: jobs = [] } = useSyncJobs({ pizzariaId });
  const { data: eventos = [] } = useEventosIntegracao(pizzariaId);
  const { data: pizzarias = [] } = usePizzarias();

  const [credDialog, setCredDialog] = useState<{ open: boolean; credencial: IntegracaoCredencial | null }>({ open: false, credencial: null });
  const [syncDialog, setSyncDialog] = useState<{ open: boolean; credencialId?: string }>({ open: false });

  const pizzariaNome = useMemo(() => {
    const m = new Map(pizzarias.map((p) => [p.id, p.nome]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pizzarias]);

  const workerOffline = useMemo(() => {
    const cutoff = Date.now() - 5 * 60_000;
    return jobs.some((j) => j.status === 'queued' && new Date(j.created_at).getTime() < cutoff);
  }, [jobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Credenciais, sincronizações e eventos</p>
      </div>

      <IntegracoesStats pizzariaId={pizzariaId} />

      <Tabs defaultValue="credenciais">
        <TabsList>
          <TabsTrigger value="credenciais">Credenciais</TabsTrigger>
          <TabsTrigger value="sincronizacoes">Sincronizações</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
        </TabsList>

        {/* ---------- Credenciais ---------- */}
        <TabsContent value="credenciais" className="space-y-4">
          <div className="flex justify-end">
            {podeCriar && (
              <Button onClick={() => setCredDialog({ open: true, credencial: null })}>
                <Plus className="w-4 h-4 mr-1" /> Nova credencial
              </Button>
            )}
          </div>

          {credenciais.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma credencial cadastrada{podeCriar ? '. Clique em "Nova credencial".' : '.'}
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {credenciais.map((cred) => (
                <Card key={cred.id}>
                  <CardContent className="pt-4 pb-3 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={cred.ativo ? 'default' : 'secondary'}>{cred.ativo ? 'Ativa' : 'Inativa'}</Badge>
                        {isConsolidated && <Badge variant="outline">{pizzariaNome(cred.pizzaria_id)}</Badge>}
                        <span className="text-sm font-medium">CardapioWeb #{cred.estabelecimento_externo_id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">API key: <span className="font-mono">{mascarar(cred.api_key_encrypted)}</span></p>
                      <p className="text-xs text-muted-foreground">Última sync: {fmt(cred.last_sync_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {podeEditar && (
                        <Button size="sm" variant="outline" onClick={() => setCredDialog({ open: true, credencial: cred })}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                      )}
                      {cred.ativo && (
                        <Button size="sm" onClick={() => setSyncDialog({ open: true, credencialId: cred.id })}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sincronizar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- Sincronizações ---------- */}
        <TabsContent value="sincronizacoes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSyncDialog({ open: true })}>
              <Plus className="w-4 h-4 mr-1" /> Nova sincronização
            </Button>
          </div>

          {workerOffline && (
            <Card className="border-warning bg-warning/10">
              <CardContent className="pt-3 pb-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Há jobs aguardando há mais de 5 min — o worker pode estar offline.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Imp/Upd/Err</TableHead>
                    <TableHead>Iniciado</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      Nenhuma sincronização ainda.
                    </TableCell></TableRow>
                  ) : jobs.map((j: SyncJob) => <SyncJobRow key={j.id} job={j} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Eventos ---------- */}
        <TabsContent value="eventos">
          <Card>
            <CardHeader><CardTitle className="text-base">Eventos de webhook</CardTitle></CardHeader>
            <CardContent className="p-0">
              {eventos.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground px-6">
                  Nenhum evento ainda. Eventos chegarão quando o webhook do CardapioWeb estiver configurado (sub-projeto separado).
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Processado</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{eventoIcon[e.status]}</TableCell>
                        <TableCell className="font-mono text-xs">{e.tipo_evento}</TableCell>
                        <TableCell className="font-mono text-xs">{e.resource_external_id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmt(e.received_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmt(e.processed_at)}</TableCell>
                        <TableCell className="text-xs text-destructive">{e.error_message ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CredencialDialog
        open={credDialog.open}
        onOpenChange={(open) => setCredDialog((s) => ({ ...s, open }))}
        credencial={credDialog.credencial}
      />
      <SyncDialog
        open={syncDialog.open}
        onOpenChange={(open) => setSyncDialog({ open })}
        pizzariaId={pizzariaId}
        defaultCredencialId={syncDialog.credencialId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que `mocks/data` não é mais importado nem `mockCredenciais`/`mockEventos` referenciados nesta tela**

```bash
npx grep -r "mockCredenciais\|mockEventos" src/pages/Integracoes.tsx
```

Expected: sem matches.

- [ ] **Step 3: Build local**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Integracoes.tsx
git commit -m "feat(integracoes): tela com tabs, conectada ao Supabase real"
```

### Task 16: Teste de renderização da tela

**Files:**
- Create: `src/pages/Integracoes.test.tsx`

- [ ] **Step 1: Escrever teste de permissão e render**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Integracoes from './Integracoes';

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ currentPizzaria: { id: 'p1', nome: 'Peché' }, isConsolidated: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'leitura' } }),
}));
vi.mock('@/hooks/integracoes', () => ({
  useCredenciais: () => ({ data: [] }),
  useSyncJobs: () => ({ data: [] }),
  useEventosIntegracao: () => ({ data: [] }),
  useIntegracoesStats: () => ({ data: { credenciaisAtivas: 0, syncRodando: 0, pedidos7d: 0, falhas7d: 0 } }),
}));
vi.mock('@/hooks/usePizzarias', () => ({ usePizzarias: () => ({ data: [] }) }));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
};

describe('Integracoes', () => {
  it('papel leitura não vê botão "Nova credencial"', () => {
    render(<Integracoes />, { wrapper });
    expect(screen.queryByRole('button', { name: /nova credencial/i })).not.toBeInTheDocument();
  });

  it('renderiza as três tabs', () => {
    render(<Integracoes />, { wrapper });
    expect(screen.getByRole('tab', { name: /credenciais/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sincronizações/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /eventos/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/Integracoes.test
```

Expected: 2 testes PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Integracoes.test.tsx
git commit -m "test(integracoes): permissão de role e render de tabs"
```

---

## Phase 6 — Smoke test manual

### Task 17: Smoke test end-to-end

- [ ] **Step 1: Reiniciar backend local**

```bash
cd backend && npm run dev
```

Verificar log `Nest application successfully started` e que `SyncWorkerService` apareceu nos providers.

- [ ] **Step 2: Verificar reset de jobs presos**

No primeiro start, qualquer job em `running` há mais de 15min deve ter virado `failed` com mensagem "worker reiniciado". Consultar via Supabase MCP `execute_sql`:

```sql
SELECT id, status, error_message FROM sync_job WHERE error_message = 'worker reiniciado' ORDER BY finished_at DESC LIMIT 5;
```

(OK se vazio — significa que não havia jobs presos.)

- [ ] **Step 3: Abrir `http://localhost:8080/integracoes` e logar como super_admin**

Esperado:
- Stats cards exibem números reais.
- Tab Credenciais mostra Peché + Mozzarella.
- Botão "Nova credencial" visível.

- [ ] **Step 4: Disparar sync de 1 dia**

- Tab Sincronizações → Nova sincronização → selecionar Peché → período `hoje-1` a `hoje` → Enfileirar.
- Em até 5s, status muda para `running`, barra de progresso aparece, contadores avançam.
- Ao final, status `completed`, contadores `imported/updated` preenchidos.

- [ ] **Step 5: Range inválido**

- Nova sincronização → período de 100 dias → deve falhar validação no client com "Range máximo: 90 dias".

- [ ] **Step 6: Duplicata**

- Enfileirar 2 syncs seguidos pra mesma credencial — segundo deve falhar com toast "Já existe sync em andamento".

- [ ] **Step 7: Banner worker offline**

- Parar o backend (`Ctrl+C`).
- Enfileirar um job → após 5 min, banner amarelo aparece na tab Sincronizações.

- [ ] **Step 8: Visão consolidada**

- Trocar para visão consolidada → ver as 2 pizzarias na tab Credenciais, cada uma com badge da pizzaria.

- [ ] **Step 9: Documentar no spec o que foi validado**

Atualizar a seção "Fora de escopo (follow-ups)" do spec se algum item virou pendência nova durante o smoke.

- [ ] **Step 10: Push**

```bash
git push origin main
```

Lovable vai redeployar o frontend automaticamente. Worker continua local até o Railway estar 100%.
