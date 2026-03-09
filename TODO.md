# TODO — PizzaGestão Multi-Tenant

## Visão Geral
Sistema de gestão multi-tenant para pizzarias integrado com CardapioWeb (API + Webhook Open Delivery). Arquitetura: 1 serviço multi-tenant. Todos os dados particionados por `pizzaria_id`.

---

## Setup Local (Backend Externo)
```bash
# 1. Clone o repo do backend (NestJS/Express)
git clone <BACKEND_REPO_URL>
cd backend

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente (.env)
cp .env.example .env

# 4. Rode migrations
npx prisma migrate dev

# 5. Rode seed
npx prisma db seed

# 6. Inicie o servidor
npm run dev
```

## Variáveis de Ambiente (Backend)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/pizzagestao
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=<32-byte-hex-key>  # Para criptografar tokens de integração
CARDAPIOWEB_BASE_URL=https://api.cardapioweb.com/v1
WEBHOOK_RATE_LIMIT=100  # req/min por IP
LOG_LEVEL=info
```

---

## Módulos

### 1. Auth
- [x] Login (email+senha) — frontend mockado
- [ ] Implementar JWT real (backend)
- [ ] Hash bcrypt para senhas
- [ ] Reset de senha com token por email
- [ ] Seed SuperAdmin (`admin@gestao.com` / senha segura)
- [ ] Middleware de autorização por pizzaria + role

### 2. Tenants (Pizzarias)
- [x] Modelo de dados definido
- [x] Seletor de pizzaria no frontend
- [ ] CRUD de pizzarias (backend)
- [ ] Validar `pizzaria_id` em todas as queries
- [ ] RLS ou filtro obrigatório por tenant

### 3. Pedidos
- [x] Listagem com filtros (frontend)
- [x] Detalhe de pedido com itens
- [ ] Endpoint REST: `GET /api/pedidos?pizzaria_id=&status=&canal=&desde=`
- [ ] Upsert idempotente: `UNIQUE(pizzaria_id, origem, pedido_externo_id)`
- [ ] Mapeamento de status: tabela `status_map(origem, status_externo, status_canonico)`
- [ ] external_key composto: `cardapioweb:{estabelecimento_id}:{pedido_id}`

### 4. Integrações (CardapioWeb)
- [x] Tela de credenciais e eventos (frontend)
- [ ] Tabela `integracao_credencial` com token criptografado (AES-256)
- [ ] Endpoint webhook: `POST /webhooks/cardapioweb`
  - Identificar pizzaria por `estabelecimento_externo_id`
  - Validar assinatura HMAC (se disponível)
  - Persistir em `evento_integracao` (status=received)
  - Publicar na fila `cardapioweb.events`
  - Rate limit: 100 req/min
- [ ] Client HTTP CardapioWeb com adaptadores e mocks
- [ ] Mapear schemas reais quando disponíveis (TODO)

### 5. Filas (Event Processor)
- [ ] Setup BullMQ + Redis (ou SQS/RabbitMQ)
- [ ] Worker `cardapioweb.events`:
  1. Carregar evento bruto
  2. Checar idempotência
  3. Buscar detalhes na API (se payload incompleto)
  4. Upsert pedido + itens
  5. Marcar evento como `processed` ou `failed`
- [ ] Dead-letter queue para eventos com falha
- [ ] Retry com backoff exponencial (max 3 tentativas)

### 6. Reconciliador
- [ ] Job incremental a cada 10 min por pizzaria:
  - `GET /api/cardapioweb/orders?updated_since={last_sync_at}`
  - Upsert em pedido/itens
  - Atualizar `last_sync_at`
- [ ] Job diário D-1:
  - Buscar todos os pedidos de ontem
  - Garantir consistência
- [x] Botão "Reconciliar" no frontend (mock)

### 7. Dashboard / BI
- [x] KPIs: pedidos dia, faturamento, ticket médio, cancelamentos
- [x] Gráfico de pedidos por canal (pizza)
- [x] Gráfico de faturamento por pizzaria/canal (barras)
- [x] Visão consolidada e por pizzaria
- [ ] Endpoint: `GET /api/dashboard/kpis?pizzaria_id=&data=`
- [ ] Tempo médio de preparo (quando dados disponíveis)

---

## Endpoints Principais (Backend)

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login email+senha → JWT |
| POST | `/api/auth/reset-password` | Solicitar reset |
| POST | `/api/auth/reset-password/confirm` | Confirmar reset |

### Tenants
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pizzarias` | Listar pizzarias do usuário |
| POST | `/api/pizzarias` | Criar pizzaria (SuperAdmin) |
| PUT | `/api/pizzarias/:id` | Atualizar pizzaria |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pedidos` | Listar com filtros |
| GET | `/api/pedidos/:id` | Detalhe com itens |

### Integrações
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhooks/cardapioweb` | Receber webhook |
| GET | `/api/integracoes/credenciais` | Listar credenciais |
| POST | `/api/integracoes/credenciais` | Cadastrar credencial |
| POST | `/api/integracoes/reconciliar/:id` | Disparar reconciliação |
| GET | `/api/integracoes/eventos` | Listar eventos |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/kpis` | KPIs por pizzaria |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/usuarios` | Listar membros |
| POST | `/api/usuarios/convidar` | Convidar membro |
| PUT | `/api/usuarios/:id/role` | Alterar role |
| DELETE | `/api/usuarios/:id` | Remover membro |

---

## Modelo de Dados

### Tabelas e Chaves Únicas

```
pizzaria
├── id UUID PK
├── nome TEXT NOT NULL
├── endereco TEXT
├── telefone TEXT
├── status ENUM(ativa, inativa, suspensa)
└── created_at TIMESTAMPTZ

usuario
├── id UUID PK
├── email TEXT UNIQUE NOT NULL
├── nome TEXT NOT NULL
├── password_hash TEXT NOT NULL
└── created_at TIMESTAMPTZ

usuario_pizzaria (membership)
├── id UUID PK
├── user_id UUID FK → usuario
├── pizzaria_id UUID FK → pizzaria
├── role ENUM(super_admin, admin_pizzaria, gestor, operacao, financeiro, leitura)
└── UNIQUE(user_id, pizzaria_id)

integracao_credencial
├── id UUID PK
├── pizzaria_id UUID FK → pizzaria
├── origem TEXT DEFAULT 'cardapioweb'
├── estabelecimento_externo_id TEXT NOT NULL
├── token_encrypted TEXT
├── webhook_secret TEXT
├── ativo BOOLEAN DEFAULT true
├── last_sync_at TIMESTAMPTZ
├── created_at TIMESTAMPTZ
└── UNIQUE(origem, estabelecimento_externo_id)

evento_integracao
├── id UUID PK
├── pizzaria_id UUID FK → pizzaria
├── origem TEXT DEFAULT 'cardapioweb'
├── tipo_evento TEXT NOT NULL
├── event_external_id TEXT
├── resource_type TEXT
├── resource_external_id TEXT
├── payload_raw JSONB
├── payload_hash TEXT
├── received_at TIMESTAMPTZ
├── processed_at TIMESTAMPTZ
├── status ENUM(received, processing, processed, failed)
├── error_message TEXT
├── UNIQUE(pizzaria_id, origem, event_external_id) — quando há event_id
└── UNIQUE(pizzaria_id, origem, payload_hash, tipo_evento, resource_external_id) — fallback

pedido
├── id UUID PK
├── pizzaria_id UUID FK → pizzaria
├── origem TEXT DEFAULT 'cardapioweb'
├── external_key TEXT NOT NULL  -- cardapioweb:{est_id}:{pedido_id}
├── pedido_externo_id TEXT NOT NULL
├── status ENUM(novo, confirmado, em_preparo, pronto, saiu_entrega, entregue, cancelado)
├── canal ENUM(delivery, mesa, balcao, retirada)
├── cliente_nome TEXT
├── cliente_telefone TEXT
├── total_bruto DECIMAL(12,2)
├── descontos DECIMAL(12,2) DEFAULT 0
├── taxas DECIMAL(12,2) DEFAULT 0
├── total_liquido DECIMAL(12,2)
├── created_at_origem TIMESTAMPTZ
├── updated_at_origem TIMESTAMPTZ
├── created_at TIMESTAMPTZ
└── UNIQUE(pizzaria_id, origem, pedido_externo_id)

pedido_item
├── id UUID PK
├── pedido_id UUID FK → pedido
├── sku_externo_id TEXT
├── produto_externo_id TEXT
├── descricao TEXT
├── qtd INTEGER
├── preco_unit DECIMAL(10,2)
├── total DECIMAL(10,2)
├── observacoes TEXT
└── modificadores JSONB

status_map
├── id UUID PK
├── origem TEXT
├── status_externo TEXT
├── status_canonico TEXT
└── UNIQUE(origem, status_externo)
```

---

## Idempotência / Dedupe

### Com `event_external_id` (provedor fornece ID)
- `UNIQUE INDEX ON evento_integracao(pizzaria_id, origem, event_external_id)`
- Antes de processar: `SELECT EXISTS(... WHERE status = 'processed')`
- Se já processado: skip silencioso

### Sem `event_external_id` (fallback por hash)
- `payload_hash = SHA256(JSON.stringify(sortKeys(payload_raw)))`
- `UNIQUE INDEX ON evento_integracao(pizzaria_id, origem, payload_hash, tipo_evento, resource_external_id)`

### Upsert de Pedidos
- `ON CONFLICT (pizzaria_id, origem, pedido_externo_id) DO UPDATE`
- Atualizar status, totais, timestamps — nunca duplicar

---

## Integração Real — Passos

### 1. Obter credenciais
- [ ] Criar conta no CardapioWeb para cada pizzaria
- [ ] Obter `estabelecimento_id`, `client_id`, `client_secret`
- [ ] Cadastrar em `integracao_credencial` (token criptografado)

### 2. Configurar Webhook
- [ ] Publicar endpoint `POST /webhooks/cardapioweb` (HTTPS)
- [ ] Registrar URL do webhook no painel CardapioWeb para cada estabelecimento
- [ ] Configurar secret de assinatura (se disponível)

### 3. Mapear Payloads
- [ ] Obter exemplo real de webhook `order.created`
- [ ] Obter exemplo real de webhook `order.status_changed`
- [ ] Obter exemplo de resposta `GET /orders/:id` (detalhe)
- [ ] Mapear campos para modelo canônico
- [ ] Popular `status_map` com mapeamentos reais

### 4. Eventos Internos (preparação multi-origem)
```
OrderImported    → pedido criado via integração
OrderUpdated     → pedido atualizado (itens/totais)
OrderStatusChanged → status alterado
```
Esses eventos internos permitem futuras integrações (iFood, WhatsApp, PDV) sem reescrever core.

---

## Payloads Mockados (Exemplo)

### Webhook `order.created`
```json
{
  "event_id": "evt-12345",
  "event_type": "order.created",
  "establishment_id": "CW-EST-1001",
  "timestamp": "2025-03-09T14:30:00Z",
  "data": {
    "order_id": "ORD-98765",
    "status": "PENDING",
    "channel": "DELIVERY",
    "customer": { "name": "João Silva", "phone": "11999998888" },
    "items": [
      { "product_id": "PROD-001", "name": "Pizza Margherita G", "quantity": 1, "unit_price": 45.90, "total": 45.90 },
      { "product_id": "PROD-010", "name": "Refrigerante 2L", "quantity": 1, "unit_price": 12.00, "total": 12.00 }
    ],
    "subtotal": 57.90,
    "discount": 0,
    "delivery_fee": 8.00,
    "total": 65.90,
    "created_at": "2025-03-09T14:28:00Z"
  }
}
```

### Webhook `order.status_changed`
```json
{
  "event_id": "evt-12346",
  "event_type": "order.status_changed",
  "establishment_id": "CW-EST-1001",
  "timestamp": "2025-03-09T14:35:00Z",
  "data": {
    "order_id": "ORD-98765",
    "previous_status": "PENDING",
    "new_status": "CONFIRMED"
  }
}
```

---

## Roadmap

### MVP (Sprint 1-2)
- [x] Frontend completo com mocks (login, dashboard, pedidos, integrações, usuários)
- [x] Modelo de dados definido
- [x] Documentação técnica
- [ ] Backend: schema + migrations + seed
- [ ] Backend: auth JWT + RBAC
- [ ] Backend: webhook receiver + fila
- [ ] Backend: processor + upsert idempotente

### v1 (Sprint 3-4)
- [ ] Reconciliador incremental + diário
- [ ] Client HTTP CardapioWeb real
- [ ] Mapeamento de payloads reais
- [ ] Dashboard com dados reais
- [ ] Logs estruturados + observabilidade
- [ ] Rate limit + WAF
- [ ] Testes E2E

### v2 (Futuro)
- [ ] Integração iFood
- [ ] Integração WhatsApp
- [ ] Módulo financeiro (DRE simplificado)
- [ ] Gestão de cardápio/produtos
- [ ] App mobile (React Native)
- [ ] Multi-região
