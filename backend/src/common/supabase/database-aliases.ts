import type { Database } from './database.types';

export type PedidoStatus = Database['public']['Enums']['pedido_status'];
export type PedidoCanal = Database['public']['Enums']['pedido_canal'];
export type EventoStatus = Database['public']['Enums']['evento_status'];
export type SyncJobStatus = Database['public']['Enums']['sync_job_status'];
