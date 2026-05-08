// Tipos que representam as respostas reais da API CardapioWeb
// Base URL: https://integracao.cardapioweb.com/api/partner/v1
// Auth: header X-API-KEY

export interface CwCredencial {
  estabelecimento_externo_id: string;
  api_key: string;
}

// ----- Histórico de Pedidos: GET /orders/history -----
export interface CwHistoryParams {
  start_date: string;  // "DD/MM/YYYY"
  end_date: string;    // "DD/MM/YYYY"
  page?: number;
}

// /orders/history retorna { orders: [...], pagination: {...} }
export interface CwHistoryResponse {
  orders: CwHistoryItem[];
  pagination: CwHistoryPagination;
}

export interface CwHistoryPagination {
  current_page: number;
  total_pages: number;
  total_orders: number;
}

export interface CwHistoryItem {
  id: number;
  status: string;
  order_type: string;
  sales_channel: string;
  created_at: string;
  updated_at: string;
}

// ----- Poll de Pedidos: GET /orders -----
export interface CwOrdersParams {
  status?: string;
  created_at_gteq?: string;
  page?: number;
  per_page?: number;
}

// /orders retorna array direto (sem wrapper de paginação)
export type CwOrdersResponse = CwOrder[];

// ----- Dados do Pedido: GET /orders/{id} -----
export interface CwOrder {
  id: number;
  display_id: number;
  external_display_id: string | null;
  external_order_id: string | null;
  merchant_id: number;
  status: string;             // "pending", "closed", "cancelled", etc.
  order_type: string;         // "delivery", "table", "counter", "pickup"
  order_timing: string;
  sales_channel: string;
  delivered_by: string;
  table_number: number | null;
  estimated_time: number | null;
  cancellation_reason: string | null;
  observation: string | null;
  delivery_fee: number;
  service_fee: number;
  additional_fee: number;
  total: number;              // valor final (após descontos)
  created_at: string;
  updated_at: string;
  customer: CwCustomer;
  delivery_address: CwAddress | null;
  items: CwItem[];
  discounts: CwDiscount[];
  payments: CwPayment[];
}

export interface CwCustomer {
  id: number;
  name: string;
  phone: string;
  ddi: string;
}

export interface CwAddress {
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  postal_code: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
}

export interface CwItem {
  item_id: number;
  order_item_id: number;
  external_code: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  kind: string;
  observation: string | null;
  options: CwItemOption[];
  items: CwItem[];  // sub-itens
}

export interface CwItemOption {
  option_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  option_group_id: number;
  option_group_name: string;
}

export interface CwDiscount {
  kind: string;
  category: string;
  sponsorship: string;
  total: number;
  coupon_code: string | null;
}

export interface CwPayment {
  total: number;
  payment_type: string;
  payment_method: string;
  status: string;
}
