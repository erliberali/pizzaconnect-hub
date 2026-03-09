import type {
  Pizzaria, User, UserMembership, IntegracaoCredencial,
  EventoIntegracao, Pedido, PedidoItem, PedidoStatus, PedidoCanal
} from '@/types';

// ========== PIZZARIAS ==========
export const mockPizzarias: Pizzaria[] = [
  {
    id: 'pz-001',
    nome: 'Pizzaria Bella Napoli',
    endereco: 'Rua das Flores, 123 - Centro',
    telefone: '(11) 3456-7890',
    status: 'ativa',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'pz-002',
    nome: 'Pizzaria Forno & Brasa',
    endereco: 'Av. Brasil, 456 - Jardins',
    telefone: '(11) 3456-1234',
    status: 'ativa',
    created_at: '2024-02-01T10:00:00Z',
  },
];

// ========== USERS ==========
export const mockUsers: User[] = [
  { id: 'usr-001', email: 'admin@gestao.com', nome: 'Carlos Admin', created_at: '2024-01-01T00:00:00Z' },
  { id: 'usr-002', email: 'gestor@bellanapoli.com', nome: 'Ana Gestora', created_at: '2024-01-10T00:00:00Z' },
  { id: 'usr-003', email: 'ops@fornobrasa.com', nome: 'João Operação', created_at: '2024-02-05T00:00:00Z' },
  { id: 'usr-004', email: 'fin@gestao.com', nome: 'Maria Financeiro', created_at: '2024-03-01T00:00:00Z' },
];

export const mockMemberships: UserMembership[] = [
  { id: 'mb-001', user_id: 'usr-001', pizzaria_id: 'pz-001', role: 'super_admin' },
  { id: 'mb-002', user_id: 'usr-001', pizzaria_id: 'pz-002', role: 'super_admin' },
  { id: 'mb-003', user_id: 'usr-002', pizzaria_id: 'pz-001', role: 'gestor' },
  { id: 'mb-004', user_id: 'usr-003', pizzaria_id: 'pz-002', role: 'operacao' },
  { id: 'mb-005', user_id: 'usr-004', pizzaria_id: 'pz-001', role: 'financeiro' },
  { id: 'mb-006', user_id: 'usr-004', pizzaria_id: 'pz-002', role: 'financeiro' },
];

// ========== CREDENCIAIS ==========
export const mockCredenciais: IntegracaoCredencial[] = [
  {
    id: 'cred-001', pizzaria_id: 'pz-001', origem: 'cardapioweb',
    estabelecimento_externo_id: 'CW-EST-1001', token_encrypted: '***encrypted***',
    webhook_secret: 'whsec_abc123', ativo: true, last_sync_at: '2025-03-09T14:30:00Z',
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'cred-002', pizzaria_id: 'pz-002', origem: 'cardapioweb',
    estabelecimento_externo_id: 'CW-EST-2002', token_encrypted: '***encrypted***',
    webhook_secret: 'whsec_def456', ativo: true, last_sync_at: '2025-03-09T14:25:00Z',
    created_at: '2024-02-10T00:00:00Z',
  },
];

// ========== PEDIDOS ==========
const statusOptions: PedidoStatus[] = ['novo', 'confirmado', 'em_preparo', 'pronto', 'saiu_entrega', 'entregue', 'cancelado'];
const canalOptions: PedidoCanal[] = ['delivery', 'mesa', 'balcao', 'retirada'];
const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Lucas Lima', 'Julia Ferreira', 'Rafael Souza', 'Camila Alves'];
const pizzas = [
  { desc: 'Pizza Margherita Grande', preco: 45.90 },
  { desc: 'Pizza Calabresa Grande', preco: 42.90 },
  { desc: 'Pizza 4 Queijos Grande', preco: 49.90 },
  { desc: 'Pizza Portuguesa Grande', preco: 47.90 },
  { desc: 'Pizza Frango c/ Catupiry Grande', preco: 46.90 },
  { desc: 'Refrigerante 2L', preco: 12.00 },
  { desc: 'Suco Natural 500ml', preco: 10.00 },
  { desc: 'Borda Recheada Cheddar', preco: 8.00 },
];

function generatePedidos(pizzariaId: string, estId: string, count: number, dateOffset: number): Pedido[] {
  const pedidos: Pedido[] = [];
  for (let i = 0; i < count; i++) {
    const pedidoId = `PED-${estId}-${String(i + 1).padStart(4, '0')}`;
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    const canal = canalOptions[Math.floor(Math.random() * canalOptions.length)];
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const itens: PedidoItem[] = [];
    let totalBruto = 0;
    for (let j = 0; j < itemCount; j++) {
      const pizza = pizzas[Math.floor(Math.random() * pizzas.length)];
      const qtd = 1 + Math.floor(Math.random() * 2);
      const total = pizza.preco * qtd;
      totalBruto += total;
      itens.push({
        id: `item-${pedidoId}-${j}`,
        pedido_id: pedidoId,
        produto_externo_id: `PROD-${Math.floor(Math.random() * 1000)}`,
        descricao: pizza.desc,
        qtd,
        preco_unit: pizza.preco,
        total,
      });
    }
    const descontos = Math.random() > 0.7 ? Math.round(totalBruto * 0.1 * 100) / 100 : 0;
    const taxas = canal === 'delivery' ? 8.00 : 0;
    const hora = Math.floor(Math.random() * 14) + 8;
    const minuto = Math.floor(Math.random() * 60);
    const dataBase = new Date();
    dataBase.setDate(dataBase.getDate() - dateOffset);
    dataBase.setHours(hora, minuto, 0, 0);

    pedidos.push({
      id: pedidoId,
      pizzaria_id: pizzariaId,
      origem: 'cardapioweb',
      external_key: `cardapioweb:${estId}:${pedidoId}`,
      pedido_externo_id: pedidoId,
      status,
      canal,
      cliente_nome: nomes[Math.floor(Math.random() * nomes.length)],
      cliente_telefone: `(11) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      total_bruto: Math.round(totalBruto * 100) / 100,
      descontos,
      taxas,
      total_liquido: Math.round((totalBruto - descontos + taxas) * 100) / 100,
      created_at_origem: dataBase.toISOString(),
      updated_at_origem: dataBase.toISOString(),
      created_at: dataBase.toISOString(),
      itens,
    });
  }
  return pedidos;
}

export const mockPedidos: Pedido[] = [
  ...generatePedidos('pz-001', 'CW-EST-1001', 25, 0),
  ...generatePedidos('pz-001', 'CW-EST-1001', 20, 1),
  ...generatePedidos('pz-002', 'CW-EST-2002', 18, 0),
  ...generatePedidos('pz-002', 'CW-EST-2002', 15, 1),
];

// ========== EVENTOS ==========
export const mockEventos: EventoIntegracao[] = mockPedidos.slice(0, 15).map((p, i) => ({
  id: `evt-${String(i + 1).padStart(4, '0')}`,
  pizzaria_id: p.pizzaria_id,
  origem: 'cardapioweb' as const,
  tipo_evento: i % 3 === 0 ? 'order.created' : i % 3 === 1 ? 'order.updated' : 'order.status_changed',
  event_external_id: `ext-evt-${i + 1}`,
  resource_type: 'order',
  resource_external_id: p.pedido_externo_id,
  payload_raw: { pedido_id: p.pedido_externo_id, status: p.status },
  payload_hash: `hash-${i}`,
  received_at: p.created_at,
  processed_at: p.created_at,
  status: (i % 10 === 9 ? 'failed' : 'processed') as EventoIntegracao['status'],
  error_message: i % 10 === 9 ? 'Timeout ao processar evento' : undefined,
}));
