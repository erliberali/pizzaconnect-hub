// ========================
// Multi-tenant Pizzaria Management Types
// ========================

export type UserRole = 'super_admin' | 'admin_pizzaria' | 'gestor' | 'operacao' | 'financeiro' | 'leitura';

export interface User {
  id: string;
  email: string;
  nome: string;
  avatar_url?: string;
  created_at: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  pizzaria_id: string;
  role: UserRole;
  user?: User;
  pizzaria?: Pizzaria;
}

export interface Pizzaria {
  id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  status: 'ativa' | 'inativa' | 'suspensa';
  created_at: string;
}

export interface IntegracaoCredencial {
  id: string;
  pizzaria_id: string;
  origem: 'cardapioweb';
  estabelecimento_externo_id: string;
  api_key_encrypted: string | null;
  partner_key_encrypted?: string | null;
  webhook_secret?: string | null;
  ativo: boolean;
  last_sync_at?: string | null;
  created_at: string;
}

export type EventoStatus = 'received' | 'processing' | 'processed' | 'failed';

export interface EventoIntegracao {
  id: string;
  pizzaria_id: string;
  origem: 'cardapioweb';
  tipo_evento: string;
  event_external_id?: string;
  resource_type: string;
  resource_external_id: string;
  payload_raw: Record<string, unknown>;
  payload_hash: string;
  received_at: string;
  processed_at?: string;
  status: EventoStatus;
  error_message?: string;
}

export type PedidoStatus = 'novo' | 'confirmado' | 'em_preparo' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PedidoCanal = 'delivery' | 'mesa' | 'balcao' | 'retirada';

export interface Pedido {
  id: string;
  pizzaria_id: string;
  origem: 'cardapioweb';
  external_key: string; // cardapioweb:{estabelecimento_id}:{pedido_id}
  pedido_externo_id: string;
  status: PedidoStatus;
  canal: PedidoCanal;
  cliente_nome?: string;
  cliente_telefone?: string;
  total_bruto: number;
  descontos: number;
  taxas: number;
  total_liquido: number;
  created_at_origem: string;
  updated_at_origem: string;
  created_at: string;
  itens?: PedidoItem[];
  pizzaria?: { id: string; nome: string } | null;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  sku_externo_id?: string;
  produto_externo_id: string;
  descricao: string;
  qtd: number;
  preco_unit: number;
  total: number;
  observacoes?: string;
  modificadores?: Record<string, unknown>;
}

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
  processed_count: number;
  imported_count: number;
  updated_count: number;
  error_count: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

// ---------- Compras / Estoque ----------

export interface Fornecedor {
  id: string;
  pizzaria_id: string | null; // NULL = compartilhado entre todas (rotulado "Ambas")
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface ProdutoEstoque {
  id: string;
  pizzaria_id: string | null; // NULL = compartilhado entre todas ("Ambas")
  sku: string | null;
  nome: string;
  unidade: string; // 'un' | 'kg' | 'g' | 'l' | 'ml' | etc (livre)
  categoria: string | null;
  custo_medio: number;
  estoque_minimo: number;
  controla_lote: boolean;
  controla_validade: boolean;
  ativo: boolean;
  criado_em: string;
}

export type DepositoTipo = 'principal' | 'geladeira' | 'freezer' | 'outro';

export interface Deposito {
  id: string;
  pizzaria_id: string;
  nome: string;
  tipo: DepositoTipo;
  ativo: boolean;
  criado_em: string;
}

export type CategoriaTipo = 'custo_fixo' | 'custo_variavel' | 'imposto' | 'outro';

export interface CategoriaDespesa {
  id: string;
  pizzaria_id: string;
  nome: string;
  tipo: CategoriaTipo;
}

export type NotaCompraStatus = 'rascunho' | 'lancada' | 'cancelada';

export interface NotaCompraItem {
  id: string;
  nota_id: string;
  produto_id: string;
  deposito_id: string;
  lote_numero: string | null;
  validade: string | null; // YYYY-MM-DD
  quantidade: number;
  custo_unitario: number;
  valor_total?: number; // generated column
  produto?: { id: string; nome: string; unidade: string } | null;
}

export interface NotaCompra {
  id: string;
  pizzaria_id: string;
  fornecedor_id: string;
  numero: string;
  serie: string | null;
  data_emissao: string; // YYYY-MM-DD
  data_entrada: string;
  valor_total: number;
  valor_frete: number;
  valor_desconto: number;
  status: NotaCompraStatus;
  observacao: string | null;
  usuario_id: string | null;
  criado_em: string;
  fornecedor?: { id: string; razao_social: string } | null;
  itens?: NotaCompraItem[];
}

// Dashboard KPIs
export interface DashboardKPIs {
  pedidos_dia: number;
  faturamento_dia: number;
  ticket_medio: number;
  cancelamentos_dia: number;
  pedidos_por_canal: Record<PedidoCanal, number>;
  faturamento_por_canal: Record<PedidoCanal, number>;
}
