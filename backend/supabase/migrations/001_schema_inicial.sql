-- Schema inicial PizzaConnect Hub
-- Executar no Supabase Dashboard > SQL Editor

-- Enums
CREATE TYPE pizzaria_status AS ENUM ('ativa', 'inativa', 'suspensa');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin_pizzaria', 'gestor', 'operacao', 'financeiro', 'leitura');
CREATE TYPE pedido_status AS ENUM ('novo', 'confirmado', 'em_preparo', 'pronto', 'saiu_entrega', 'entregue', 'cancelado');
CREATE TYPE pedido_canal AS ENUM ('delivery', 'mesa', 'balcao', 'retirada');
CREATE TYPE evento_status AS ENUM ('received', 'processing', 'processed', 'failed');

-- Pizzarias
CREATE TABLE pizzaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  status pizzaria_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuários
CREATE TABLE usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Memberships
CREATE TABLE usuario_pizzaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  UNIQUE(user_id, pizzaria_id)
);

-- Credenciais de integração
CREATE TABLE integracao_credencial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  origem TEXT NOT NULL DEFAULT 'cardapioweb',
  estabelecimento_externo_id TEXT NOT NULL,
  api_key_encrypted TEXT,
  partner_key_encrypted TEXT,
  webhook_secret TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(origem, estabelecimento_externo_id)
);

-- Eventos de integração
CREATE TABLE evento_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  credencial_id UUID REFERENCES integracao_credencial(id),
  origem TEXT NOT NULL DEFAULT 'cardapioweb',
  tipo_evento TEXT NOT NULL,
  event_external_id TEXT,
  resource_type TEXT,
  resource_external_id TEXT,
  payload_raw JSONB,
  payload_hash TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status evento_status NOT NULL DEFAULT 'received',
  error_message TEXT,
  UNIQUE(pizzaria_id, origem, event_external_id)
);

-- Pedidos
CREATE TABLE pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  origem TEXT NOT NULL DEFAULT 'cardapioweb',
  external_key TEXT NOT NULL,
  pedido_externo_id TEXT NOT NULL,
  status pedido_status NOT NULL DEFAULT 'novo',
  canal pedido_canal NOT NULL DEFAULT 'delivery',
  cliente_nome TEXT,
  cliente_telefone TEXT,
  total_bruto DECIMAL(12,2) NOT NULL,
  descontos DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxas DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_liquido DECIMAL(12,2) NOT NULL,
  created_at_origem TIMESTAMPTZ,
  updated_at_origem TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pizzaria_id, origem, pedido_externo_id)
);

CREATE INDEX idx_pedido_pizzaria_status ON pedido(pizzaria_id, status);
CREATE INDEX idx_pedido_pizzaria_data ON pedido(pizzaria_id, created_at_origem DESC);

-- Itens do pedido
CREATE TABLE pedido_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  sku_externo_id TEXT,
  produto_externo_id TEXT,
  descricao TEXT NOT NULL,
  qtd INTEGER NOT NULL,
  preco_unit DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  modificadores JSONB
);

-- Mapeamento de status
CREATE TABLE status_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT NOT NULL,
  status_externo TEXT NOT NULL,
  status_canonico TEXT NOT NULL,
  UNIQUE(origem, status_externo)
);

-- Seed status_map CardapioWeb
INSERT INTO status_map (origem, status_externo, status_canonico) VALUES
  ('cardapioweb', 'PENDING', 'novo'),
  ('cardapioweb', 'NEW', 'novo'),
  ('cardapioweb', 'CONFIRMED', 'confirmado'),
  ('cardapioweb', 'ACCEPTED', 'confirmado'),
  ('cardapioweb', 'PREPARING', 'em_preparo'),
  ('cardapioweb', 'IN_PREPARATION', 'em_preparo'),
  ('cardapioweb', 'READY', 'pronto'),
  ('cardapioweb', 'DONE', 'pronto'),
  ('cardapioweb', 'OUT_FOR_DELIVERY', 'saiu_entrega'),
  ('cardapioweb', 'DELIVERED', 'entregue'),
  ('cardapioweb', 'CANCELLED', 'cancelado'),
  ('cardapioweb', 'CANCELED', 'cancelado')
ON CONFLICT (origem, status_externo) DO NOTHING;

-- Seed pizzarias reais
INSERT INTO pizzaria (nome, endereco, telefone, status) VALUES
  ('Peché Pizzaria', 'Rua das Flores, 123 - Centro', '(11) 3456-7890', 'ativa'),
  ('Mozzarella Mais', 'Av. Brasil, 456 - Jardins', '(11) 3456-1234', 'ativa')
ON CONFLICT DO NOTHING;
