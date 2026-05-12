import type { PedidoStatus, PedidoCanal } from '../../common/supabase/database-aliases';
import type { CwOrder } from './cardapioweb.types';

// Status reais retornados pela API CardapioWeb
const STATUS_MAP: Record<string, PedidoStatus> = {
  pending: 'novo',
  confirmed: 'confirmado',
  preparing: 'em_preparo',
  ready: 'pronto',
  dispatched: 'saiu_entrega',
  closed: 'entregue',
  cancelled: 'cancelado',
  canceled: 'cancelado',
  // Aliases observados
  new: 'novo',
  accepted: 'confirmado',
  in_preparation: 'em_preparo',
  delivered: 'entregue',
};

// order_type real da API
const CANAL_MAP: Record<string, PedidoCanal> = {
  delivery: 'delivery',
  table: 'mesa',
  counter: 'balcao',
  pickup: 'retirada',
  // Aliases
  balcao: 'balcao',
  retirada: 'retirada',
};

export function mapStatus(statusCw: string): PedidoStatus {
  return STATUS_MAP[statusCw?.toLowerCase()] ?? 'novo';
}

export function mapCanal(orderType: string): PedidoCanal {
  return CANAL_MAP[orderType?.toLowerCase()] ?? 'delivery';
}

export function mapOrderParaCanonico(
  order: CwOrder,
  pizzariaId: string,
) {
  // Calcula total bruto (soma dos itens sem desconto)
  const totalBruto = order.items.reduce((sum, item) => sum + item.total_price, 0);
  const descontos = order.discounts.reduce((sum, d) => sum + d.total, 0);
  const taxas = (order.delivery_fee ?? 0) + (order.service_fee ?? 0) + (order.additional_fee ?? 0);
  // total_liquido = valor que o cliente pagou
  const totalLiquido = order.total;

  const pedido = {
    pizzaria_id: pizzariaId,
    origem: 'cardapioweb' as const,
    external_key: `cardapioweb:${order.merchant_id}:${order.id}`,
    pedido_externo_id: String(order.id),
    status: mapStatus(order.status),
    canal: mapCanal(order.order_type),
    cliente_nome: order.customer?.name ?? null,
    cliente_telefone: order.customer?.phone ?? null,
    total_bruto: totalBruto > 0 ? totalBruto : totalLiquido,
    descontos,
    taxas,
    total_liquido: totalLiquido,
    created_at_origem: order.created_at ? new Date(order.created_at).toISOString() : null,
    updated_at_origem: order.updated_at ? new Date(order.updated_at).toISOString() : null,
  };

  const itens = order.items.map((item) => ({
    pedido_id: '',
    sku_externo_id: item.external_code ?? null,
    produto_externo_id: String(item.item_id),
    descricao: item.name,
    qtd: item.quantity,
    preco_unit: item.unit_price,
    total: item.total_price,
    observacoes: item.observation ?? null,
    modificadores: item.options?.length > 0 ? item.options : null,
  }));

  return { pedido, itens };
}
