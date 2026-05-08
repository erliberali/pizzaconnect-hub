// Tipos gerados manualmente com base no schema Prisma.
// Para regenerar automaticamente: npx supabase gen types typescript --project-id <id>

export type PizzariaStatus = 'ativa' | 'inativa' | 'suspensa';
export type UserRole = 'super_admin' | 'admin_pizzaria' | 'gestor' | 'operacao' | 'financeiro' | 'leitura';
export type PedidoStatus = 'novo' | 'confirmado' | 'em_preparo' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type PedidoCanal = 'delivery' | 'mesa' | 'balcao' | 'retirada';
export type EventoStatus = 'received' | 'processing' | 'processed' | 'failed';

export interface Database {
  public: {
    Tables: {
      pizzaria: {
        Row: {
          id: string;
          nome: string;
          endereco: string | null;
          telefone: string | null;
          status: PizzariaStatus;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pizzaria']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['pizzaria']['Insert']>;
      };
      usuario: {
        Row: {
          id: string;
          email: string;
          nome: string;
          password_hash: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['usuario']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['usuario']['Insert']>;
      };
      usuario_pizzaria: {
        Row: {
          id: string;
          user_id: string;
          pizzaria_id: string;
          role: UserRole;
        };
        Insert: Database['public']['Tables']['usuario_pizzaria']['Row'];
        Update: Partial<Database['public']['Tables']['usuario_pizzaria']['Insert']>;
      };
      integracao_credencial: {
        Row: {
          id: string;
          pizzaria_id: string;
          origem: string;
          estabelecimento_externo_id: string;
          api_key_encrypted: string | null;
          partner_key_encrypted: string | null;
          webhook_secret: string | null;
          ativo: boolean;
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['integracao_credencial']['Row'], 'created_at'> & { created_at?: string; id?: string };
        Update: Partial<Database['public']['Tables']['integracao_credencial']['Insert']>;
      };
      evento_integracao: {
        Row: {
          id: string;
          pizzaria_id: string;
          credencial_id: string | null;
          origem: string;
          tipo_evento: string;
          event_external_id: string | null;
          resource_type: string | null;
          resource_external_id: string | null;
          payload_raw: Record<string, unknown> | null;
          payload_hash: string | null;
          received_at: string;
          processed_at: string | null;
          status: EventoStatus;
          error_message: string | null;
        };
        Insert: Omit<Database['public']['Tables']['evento_integracao']['Row'], 'received_at'> & { received_at?: string; id?: string };
        Update: Partial<Database['public']['Tables']['evento_integracao']['Insert']>;
      };
      pedido: {
        Row: {
          id: string;
          pizzaria_id: string;
          origem: string;
          external_key: string;
          pedido_externo_id: string;
          status: PedidoStatus;
          canal: PedidoCanal;
          cliente_nome: string | null;
          cliente_telefone: string | null;
          total_bruto: number;
          descontos: number;
          taxas: number;
          total_liquido: number;
          created_at_origem: string | null;
          updated_at_origem: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pedido']['Row'], 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string; id?: string };
        Update: Partial<Database['public']['Tables']['pedido']['Insert']>;
      };
      pedido_item: {
        Row: {
          id: string;
          pedido_id: string;
          sku_externo_id: string | null;
          produto_externo_id: string | null;
          descricao: string;
          qtd: number;
          preco_unit: number;
          total: number;
          observacoes: string | null;
          modificadores: Record<string, unknown> | null;
        };
        Insert: Omit<Database['public']['Tables']['pedido_item']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['pedido_item']['Insert']>;
      };
      status_map: {
        Row: {
          id: string;
          origem: string;
          status_externo: string;
          status_canonico: string;
        };
        Insert: Omit<Database['public']['Tables']['status_map']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['status_map']['Insert']>;
      };
    };
  };
}
