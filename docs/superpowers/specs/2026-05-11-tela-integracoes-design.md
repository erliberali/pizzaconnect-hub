# Tela de Integrações — Design

**Data:** 2026-05-11
**Status:** aprovado, aguardando plano de implementação
**Escopo:** substituir a tela `Integracoes.tsx` (hoje 100% mock) por uma tela funcional de configuração + monitoramento das integrações CardapioWeb.

## Objetivo

Permitir ao operador da plataforma:
1. Gerenciar credenciais CardapioWeb (CRUD) por pizzaria.
2. Disparar reimportações manuais de pedidos por período.
3. Monitorar o estado das sincronizações (em fila, rodando, concluídas, falhas) e a saúde geral das integrações.

## Decisões-chave

| Decisão | Escolha |
|---|---|
| Escopo da iteração | Config + monitoramento (sem webhook) |
| Permissões | `super_admin` faz tudo; `admin_pizzaria` edita só a credencial da própria pizzaria; demais papéis só leitura |
| Reconciliação manual | Seletor de período (range custom, máx 90 dias) |
| Arquitetura de sync manual | Job queue via tabela `sync_job` no Supabase; worker no backend NestJS |
| Webhook receiver | **Fora de escopo** (sub-projeto separado) |
| Criptografia da API key | Passthrough (AES-256 fica como pendência separada) |
| Layout | Tabs: Credenciais / Sincronizações / Eventos |
| Modelo de job | Mínimo + progresso em tempo real (sem cancelamento nesta iteração) |

## Arquitetura

```
Frontend (Lovable)              Supabase                     Backend NestJS (Railway)
────────────────────            ─────────                    ────────────────────────
Integracoes.tsx                 integracao_credencial   ←──  CardapiowebImporterService
  ├─ tab Credenciais            sync_job  ◄───────────────►  SyncWorkerService (cron 5s)
  ├─ tab Sincronizações         evento_integracao            CardapioWeb cron incremental
  └─ tab Eventos                pedido / pedido_item         (já existente)

Frontend ←───── Realtime subscribe (sync_job changes) ─────── Supabase
```

**Princípios:**
- Frontend só fala com Supabase (alinha com a preferência `feedback_backend_approach`).
- Worker pode rodar local hoje ou no Railway amanhã sem mudar nada no frontend.
- `SKIP LOCKED` no SELECT do worker permite escalar para N instâncias sem dupla execução.

## Schema novo

```sql
CREATE TABLE sync_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_id UUID NOT NULL REFERENCES integracao_credencial(id) ON DELETE CASCADE,
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed')),
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
CREATE INDEX sync_job_credencial_idx ON sync_job (credencial_id, created_at DESC);

-- RLS: SELECT/INSERT para anon filtrando por pizzarias acessíveis
-- (mesmo padrão da tabela pedido). UPDATE apenas via service_role (worker).
```

## Componentes

### Tela `src/pages/Integracoes.tsx`

Estrutura:
- Header (`<h1>Integrações</h1>`).
- 4 stats cards sempre visíveis:
  - `Credenciais ativas` — count `integracao_credencial WHERE ativo`.
  - `Sync rodando agora` — count `sync_job WHERE status='running'`.
  - `Pedidos importados (7d)` — count `pedido WHERE origem='cardapioweb' AND created_at >= now()-interval '7 days'`.
  - `Falhas (7d)` — count `sync_job WHERE status='failed' AND finished_at >= now()-interval '7 days'`.
- `<Tabs>` com 3 abas (componente `Tabs` do shadcn).

### Tab 1 — Credenciais

- Lista de cards (uma credencial por card):
  - Badge `Ativa`/`Inativa`, nome da pizzaria, CardapioWeb ID, API key mascarada (`••••••••<últimos 4>`), `last_sync_at`.
  - Botões `Editar` e `Sincronizar` (este último abre o `SyncDialog` com a credencial pré-selecionada).
- Botão `Nova credencial` no topo (apenas `super_admin`).
- Em visão consolidada, mostra coluna/badge `Pizzaria` em cada card; em visão single, oculta.

**`<CredencialDialog />`** (criar/editar):
- Form React Hook Form + Zod.
- Campos:
  - `pizzaria_id`: `Select` (só na criação; na edição é read-only).
  - `estabelecimento_externo_id`: `Input`, validação `/^\d+$/`.
  - `api_key`: `Input password`. Obrigatório na criação; vazio na edição = não alterar.
  - `ativo`: `Switch`.
- Submit: `upsert` em `integracao_credencial`. Tratamento de erro Postgres `23505` (duplicata) com toast específico.

### Tab 2 — Sincronizações

- Botão `Nova sincronização` no topo → abre `<SyncDialog />`.
- Tabela de jobs (mais recentes primeiro):
  - Colunas: `Credencial`, `Período`, `Status`, `Progresso`, `Importados/Atualizados/Erros`, `Iniciado em`, `Duração`.
  - Linha de job `running` atualiza ao vivo via Supabase Realtime.
  - Linha clicável → drawer com detalhes (`error_message` completo, contadores).
- Banner amarelo no topo se `count(status='queued' AND created_at < now()-5min) > 0` ("worker offline").

**`<SyncDialog />`**:
- Campos:
  - `credencial_id`: `Select` (pizzarias acessíveis ao usuário).
  - `periodo`: `DateRangePicker`. Default: últimos 7 dias.
- Validações Zod:
  - `periodo_fim >= periodo_inicio`.
  - `periodo_fim <= hoje`.
  - Range total ≤ 90 dias.
- Submit: `insert` em `sync_job` com `status='queued'`. Antes do insert, valida no client se já existe job `queued|running` pra mesma credencial (query rápida) e bloqueia com toast se sim.

### Tab 3 — Eventos

- Tabela igual à atual (status, tipo, recurso, recebido, processado, erro), lendo de `evento_integracao` filtrado por pizzaria.
- Empty state explicando que eventos chegam quando o webhook estiver implementado (link para o follow-up no roadmap).

## Hooks (`src/hooks/integracoes/`)

```
useCredenciais.ts         // useQuery, filtra por tenant
useUpsertCredencial.ts    // useMutation
useToggleAtivoCredencial.ts // useMutation, marca ativo=true/false (sem delete físico)
useSyncJobs.ts            // useQuery + realtime subscription, fallback polling 3s
useEnqueueSyncJob.ts      // useMutation, valida duplicata antes do insert
useEventosIntegracao.ts   // useQuery
useIntegracoesStats.ts    // useQuery para os 4 stats cards
```

## Worker (`backend/src/integracoes/sync-worker/`)

- `sync-worker.module.ts` registra o service.
- `sync-worker.service.ts`:
  - `@Cron('*/5 * * * * *')` — a cada 5s.
  - Pega 1 job com `SELECT ... FOR UPDATE SKIP LOCKED`, marca `running`.
  - Carrega credencial, chama `importerService.importarPeriodo(credencial, inicio, fim, onProgress)`.
  - `onProgress` atualiza `sync_job` com debounce de 2s (ou por página, o que vier primeiro).
  - Finaliza com `completed` (contadores) ou `failed` (`error_message`).
  - `onModuleInit`: reset de jobs em `running` há mais de 15 min para `failed` com mensagem "worker reiniciado".
- Usa `SUPABASE_SERVICE_ROLE_KEY` para escapar do RLS no UPDATE.

**Refator no `cardapioweb.importer.service.ts`:** extrair `importarPeriodo(credencial, inicio, fim, onProgress?)` separada do sync incremental. Ambas chamam a mesma rotina interna; a diferença é só como o range é decidido.

## Permissões (UI + RLS)

| Papel | Ver credenciais | Editar credencial | Criar credencial | Disparar sync |
|---|---|---|---|---|
| `super_admin` | todas | sim | sim | sim |
| `admin_pizzaria` | só sua pizzaria | sim (sua) | não | sim (sua) |
| `gestor`/`operacao`/`financeiro` | só sua pizzaria | não | não | não |
| `leitura` | só sua pizzaria | não | não | não |

Frontend esconde/desabilita botões; RLS no Supabase é a barreira real.

## Tratamento de erros

- Duplicata de credencial: erro `23505` capturado → toast "Já existe credencial pra esse CardapioWeb ID".
- Validações de form: Zod com mensagens em pt-BR, exibidas inline.
- Job já em andamento: bloqueio no client com toast antes de tentar insert.
- Worker offline: banner inline, sem bloquear criação de jobs.
- Job falhou: linha vermelha na tabela com `error_message` em tooltip + drawer com detalhe.
- Erro de rede no Supabase: React Query retry padrão (3x) + toast.

## Estados de loading/empty/error

- Cada tab tem skeleton enquanto carrega.
- Empty states com CTA contextual:
  - Sem credenciais: "Cadastre a primeira credencial CardapioWeb" + botão (se super_admin).
  - Sem jobs: "Nenhuma sincronização ainda. Clique em Nova sincronização para começar."
  - Sem eventos: explicação sobre webhook + link para roadmap.

## Testes

### Frontend (Vitest + RTL)
- `useCredenciais.test.ts`: filtro por tenant.
- `useEnqueueSyncJob.test.ts`: bloqueio de duplicatas, `created_by` correto.
- `CredencialDialog.test.tsx`: validações Zod, erro `23505`.
- `SyncDialog.test.tsx`: validações de período.
- `Integracoes.test.tsx`: tabs, esconder edição por role, banner worker offline.

### Backend (Jest)
- `sync-worker.service.spec.ts`: ciclo completo (queued → running → completed/failed), debounce, reset de jobs presos.
- `cardapioweb.importer.service.spec.ts`: `importarPeriodo` com range manual.

### Manual smoke test
1. Cadastrar credencial nova → aparece na lista.
2. Sync de 1 dia → queued → running com progresso → completed.
3. Sync com range > 90d → erro no form.
4. Parar backend → criar job → após 5min, banner "worker offline".
5. Trocar para conta single-tenant → ver só uma pizzaria.

## Fora de escopo (follow-ups)

- **Webhook receiver CardapioWeb**: edge function `cardapioweb-webhook` com validação HMAC, idempotência via `event_external_id`, atualização de `pedido`. **Razão extra:** `/orders/history` da API só arquiva pedidos com 1-2 dias de delay, então sync manual histórico não pega o dia atual. Webhook é o único caminho confiável pra tempo real (alternativa: usar `/orders` como fallback no importer, mas só retorna últimos ~24-48h sem range, complica idempotência).
- **AES-256 real para `api_key_encrypted`**: pgsodium ou Supabase Vault.
- **Botão "Testar conexão"**: edge function leve que valida API key contra `/orders/history`.
- **Cancelamento de job em andamento**: campo `cancel_requested` + verificação no worker entre páginas.
- **Endurecer RLS cross-tenant**: hoje `sync_job`, `pedido` e `integracao_credencial` usam `USING (true)` pra `anon`, dependendo do filtro do client para isolar tenants. Após auth real (Supabase Auth), trocar para `USING (pizzaria_id IN (SELECT pizzaria_id FROM usuario_pizzaria WHERE user_id = auth.uid()))` em todas essas tabelas. Aplicável também ao `INSERT` em `sync_job` (validar `pizzaria_id` no `WITH CHECK`) e à FK opcional `created_by → usuario(id)`.

## Arquivos afetados

**Novos:**
- `backend/supabase/migrations/00X_sync_job.sql`
- `backend/src/integracoes/sync-worker/sync-worker.module.ts`
- `backend/src/integracoes/sync-worker/sync-worker.service.ts`
- `src/hooks/integracoes/{useCredenciais,useUpsertCredencial,useSyncJobs,useEnqueueSyncJob,useEventosIntegracao,useIntegracoesStats}.ts`
- `src/components/integracoes/{CredencialDialog,SyncDialog,SyncJobRow,IntegracoesStats}.tsx`
- Testes correspondentes.

**Modificados:**
- `src/pages/Integracoes.tsx` — reescrita para usar tabs + hooks reais.
- `backend/src/integracoes/cardapioweb/cardapioweb.importer.service.ts` — extrair `importarPeriodo`.
- `backend/src/integracoes/integracoes.module.ts` — registrar `SyncWorkerModule`.
- `backend/src/common/supabase/database.types.ts` — regenerar após migration.
