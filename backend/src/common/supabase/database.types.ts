export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      caixa: {
        Row: {
          data_abertura: string
          data_fechamento: string | null
          id: string
          observacao: string | null
          pizzaria_id: string
          saldo_final: number | null
          saldo_inicial: number
          status: Database["public"]["Enums"]["caixa_status"]
          usuario_abertura_id: string | null
          usuario_fechamento_id: string | null
        }
        Insert: {
          data_abertura?: string
          data_fechamento?: string | null
          id?: string
          observacao?: string | null
          pizzaria_id: string
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["caixa_status"]
          usuario_abertura_id?: string | null
          usuario_fechamento_id?: string | null
        }
        Update: {
          data_abertura?: string
          data_fechamento?: string | null
          id?: string
          observacao?: string | null
          pizzaria_id?: string
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["caixa_status"]
          usuario_abertura_id?: string | null
          usuario_fechamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_usuario_abertura_id_fkey"
            columns: ["usuario_abertura_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_usuario_fechamento_id_fkey"
            columns: ["usuario_fechamento_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_movimento: {
        Row: {
          caixa_id: string
          criado_em: string
          descricao: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["caixa_mov_origem"]
          pizzaria_id: string
          tipo: Database["public"]["Enums"]["caixa_mov_tipo"]
          usuario_id: string | null
          valor: number
        }
        Insert: {
          caixa_id: string
          criado_em?: string
          descricao?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["caixa_mov_origem"]
          pizzaria_id: string
          tipo: Database["public"]["Enums"]["caixa_mov_tipo"]
          usuario_id?: string | null
          valor: number
        }
        Update: {
          caixa_id?: string
          criado_em?: string
          descricao?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["caixa_mov_origem"]
          pizzaria_id?: string
          tipo?: Database["public"]["Enums"]["caixa_mov_tipo"]
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimento_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimento_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_despesa: {
        Row: {
          id: string
          nome: string
          pizzaria_id: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
        }
        Insert: {
          id?: string
          nome: string
          pizzaria_id: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
        }
        Update: {
          id?: string
          nome?: string
          pizzaria_id?: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "categoria_despesa_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_pagar: {
        Row: {
          categoria_id: string | null
          criado_em: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          fornecedor_id: string | null
          id: string
          nota_id: string | null
          pago_em: string | null
          parcela_num: number
          parcelas_total: number
          pizzaria_id: string
          status: Database["public"]["Enums"]["conta_status"]
          valor: number
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          id?: string
          nota_id?: string | null
          pago_em?: string | null
          parcela_num?: number
          parcelas_total?: number
          pizzaria_id: string
          status?: Database["public"]["Enums"]["conta_status"]
          valor: number
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          id?: string
          nota_id?: string | null
          pago_em?: string | null
          parcela_num?: number
          parcelas_total?: number
          pizzaria_id?: string
          status?: Database["public"]["Enums"]["conta_status"]
          valor?: number
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "conta_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_despesa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nota_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_receber: {
        Row: {
          criado_em: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          pedido_id: string | null
          pizzaria_id: string
          recebido_em: string | null
          status: Database["public"]["Enums"]["conta_status"]
          valor: number
          valor_recebido: number | null
          vencimento: string
        }
        Insert: {
          criado_em?: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          pedido_id?: string | null
          pizzaria_id: string
          recebido_em?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          valor: number
          valor_recebido?: number | null
          vencimento: string
        }
        Update: {
          criado_em?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          pedido_id?: string | null
          pizzaria_id?: string
          recebido_em?: string | null
          status?: Database["public"]["Enums"]["conta_status"]
          valor?: number
          valor_recebido?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "conta_receber_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_receber_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      deposito: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          pizzaria_id: string
          tipo: Database["public"]["Enums"]["deposito_tipo"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          pizzaria_id: string
          tipo?: Database["public"]["Enums"]["deposito_tipo"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          pizzaria_id?: string
          tipo?: Database["public"]["Enums"]["deposito_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "deposito_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      despesa_avulsa: {
        Row: {
          categoria_id: string | null
          criado_em: string
          descricao: string
          fornecedor_id: string | null
          id: string
          intervalo_dias: number
          parcelas_total: number
          pizzaria_id: string
          primeiro_vencimento: string
          usuario_id: string | null
          valor_total: number
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string
          descricao: string
          fornecedor_id?: string | null
          id?: string
          intervalo_dias?: number
          parcelas_total?: number
          pizzaria_id: string
          primeiro_vencimento: string
          usuario_id?: string | null
          valor_total: number
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          intervalo_dias?: number
          parcelas_total?: number
          pizzaria_id?: string
          primeiro_vencimento?: string
          usuario_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesa_avulsa_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_despesa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesa_avulsa_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesa_avulsa_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesa_avulsa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_saldo: {
        Row: {
          atualizado_em: string
          deposito_id: string
          id: string
          lote_id: string | null
          produto_id: string
          quantidade: number
        }
        Insert: {
          atualizado_em?: string
          deposito_id: string
          id?: string
          lote_id?: string | null
          produto_id: string
          quantidade?: number
        }
        Update: {
          atualizado_em?: string
          deposito_id?: string
          id?: string
          lote_id?: string | null
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_saldo_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "deposito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldo_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "estoque_saldo_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldo_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "estoque_saldo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      evento_integracao: {
        Row: {
          credencial_id: string | null
          error_message: string | null
          event_external_id: string | null
          id: string
          origem: string
          payload_hash: string | null
          payload_raw: Json | null
          pizzaria_id: string
          processed_at: string | null
          received_at: string
          resource_external_id: string | null
          resource_type: string | null
          status: Database["public"]["Enums"]["evento_status"]
          tipo_evento: string
        }
        Insert: {
          credencial_id?: string | null
          error_message?: string | null
          event_external_id?: string | null
          id?: string
          origem?: string
          payload_hash?: string | null
          payload_raw?: Json | null
          pizzaria_id: string
          processed_at?: string | null
          received_at?: string
          resource_external_id?: string | null
          resource_type?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo_evento: string
        }
        Update: {
          credencial_id?: string | null
          error_message?: string | null
          event_external_id?: string | null
          id?: string
          origem?: string
          payload_hash?: string | null
          payload_raw?: Json | null
          pizzaria_id?: string
          processed_at?: string | null
          received_at?: string
          resource_external_id?: string | null
          resource_type?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_integracao_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "integracao_credencial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_integracao_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tecnica: {
        Row: {
          ativa: boolean
          descricao: string | null
          id: string
          pizzaria_id: string
          produto_venda_ref: string
          rendimento: number
        }
        Insert: {
          ativa?: boolean
          descricao?: string | null
          id?: string
          pizzaria_id: string
          produto_venda_ref: string
          rendimento?: number
        }
        Update: {
          ativa?: boolean
          descricao?: string | null
          id?: string
          pizzaria_id?: string
          produto_venda_ref?: string
          rendimento?: number
        }
        Relationships: [
          {
            foreignKeyName: "ficha_tecnica_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tecnica_insumo: {
        Row: {
          ficha_id: string
          id: string
          perda_percent: number
          produto_estoque_id: string
          quantidade: number
        }
        Insert: {
          ficha_id: string
          id?: string
          perda_percent?: number
          produto_estoque_id: string
          quantidade: number
        }
        Update: {
          ficha_id?: string
          id?: string
          perda_percent?: number
          produto_estoque_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "ficha_tecnica_insumo_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "ficha_tecnica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_tecnica_insumo_produto_estoque_id_fkey"
            columns: ["produto_estoque_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_tecnica_insumo_produto_estoque_id_fkey"
            columns: ["produto_estoque_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      fornecedor: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato: string | null
          criado_em: string
          email: string | null
          id: string
          nome_fantasia: string | null
          pizzaria_id: string
          razao_social: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          pizzaria_id: string
          razao_social: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          pizzaria_id?: string
          razao_social?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_credencial: {
        Row: {
          api_key_encrypted: string | null
          ativo: boolean
          created_at: string
          estabelecimento_externo_id: string
          id: string
          last_sync_at: string | null
          origem: string
          partner_key_encrypted: string | null
          pizzaria_id: string
          webhook_secret: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          ativo?: boolean
          created_at?: string
          estabelecimento_externo_id: string
          id?: string
          last_sync_at?: string | null
          origem?: string
          partner_key_encrypted?: string | null
          pizzaria_id: string
          webhook_secret?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          ativo?: boolean
          created_at?: string
          estabelecimento_externo_id?: string
          id?: string
          last_sync_at?: string | null
          origem?: string
          partner_key_encrypted?: string | null
          pizzaria_id?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracao_credencial_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          criado_em: string
          data: string
          deposito_id: string
          id: string
          pizzaria_id: string
          status: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          data?: string
          deposito_id: string
          id?: string
          pizzaria_id: string
          status?: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          data?: string
          deposito_id?: string
          id?: string
          pizzaria_id?: string
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "deposito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "inventario_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_item: {
        Row: {
          diferenca: number | null
          id: string
          inventario_id: string
          lote_id: string | null
          produto_id: string
          quantidade_contada: number
          quantidade_sistema: number
        }
        Insert: {
          diferenca?: number | null
          id?: string
          inventario_id: string
          lote_id?: string | null
          produto_id: string
          quantidade_contada?: number
          quantidade_sistema?: number
        }
        Update: {
          diferenca?: number | null
          id?: string
          inventario_id?: string
          lote_id?: string | null
          produto_id?: string
          quantidade_contada?: number
          quantidade_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_item_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_item_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_item_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "inventario_item_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_item_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      lote: {
        Row: {
          criado_em: string
          custo_unitario: number
          id: string
          numero_lote: string
          produto_id: string
          quantidade_inicial: number
          validade: string | null
        }
        Insert: {
          criado_em?: string
          custo_unitario?: number
          id?: string
          numero_lote: string
          produto_id: string
          quantidade_inicial?: number
          validade?: string | null
        }
        Update: {
          criado_em?: string
          custo_unitario?: number
          id?: string
          numero_lote?: string
          produto_id?: string
          quantidade_inicial?: number
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      movimento_estoque: {
        Row: {
          criado_em: string
          custo_unitario: number
          deposito_id: string
          id: string
          lote_id: string | null
          observacao: string | null
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["movimento_origem"]
          pizzaria_id: string
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          custo_unitario?: number
          deposito_id: string
          id?: string
          lote_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["movimento_origem"]
          pizzaria_id: string
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          custo_unitario?: number
          deposito_id?: string
          id?: string
          lote_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["movimento_origem"]
          pizzaria_id?: string
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimento_estoque_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "deposito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_estoque_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "movimento_estoque_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_estoque_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "movimento_estoque_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "movimento_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_compra: {
        Row: {
          criado_em: string
          data_emissao: string
          data_entrada: string
          fornecedor_id: string
          id: string
          numero: string
          observacao: string | null
          pizzaria_id: string
          serie: string | null
          status: Database["public"]["Enums"]["nota_status"]
          usuario_id: string | null
          valor_desconto: number
          valor_frete: number
          valor_total: number
        }
        Insert: {
          criado_em?: string
          data_emissao: string
          data_entrada?: string
          fornecedor_id: string
          id?: string
          numero: string
          observacao?: string | null
          pizzaria_id: string
          serie?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          usuario_id?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total?: number
        }
        Update: {
          criado_em?: string
          data_emissao?: string
          data_entrada?: string
          fornecedor_id?: string
          id?: string
          numero?: string
          observacao?: string | null
          pizzaria_id?: string
          serie?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          usuario_id?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "nota_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_compra_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_compra_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_compra_item: {
        Row: {
          custo_unitario: number
          deposito_id: string
          id: string
          lote_numero: string | null
          nota_id: string
          produto_id: string
          quantidade: number
          validade: string | null
          valor_total: number | null
        }
        Insert: {
          custo_unitario: number
          deposito_id: string
          id?: string
          lote_numero?: string | null
          nota_id: string
          produto_id: string
          quantidade: number
          validade?: string | null
          valor_total?: number | null
        }
        Update: {
          custo_unitario?: number
          deposito_id?: string
          id?: string
          lote_numero?: string | null
          nota_id?: string
          produto_id?: string
          quantidade?: number
          validade?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_compra_item_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "deposito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_compra_item_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "nota_compra_item_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nota_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_compra_item_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_compra_item_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_atual"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      pedido: {
        Row: {
          canal: Database["public"]["Enums"]["pedido_canal"]
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string
          created_at_origem: string | null
          descontos: number
          external_key: string
          id: string
          origem: string
          pedido_externo_id: string
          pizzaria_id: string
          status: Database["public"]["Enums"]["pedido_status"]
          taxas: number
          total_bruto: number
          total_liquido: number
          updated_at: string
          updated_at_origem: string | null
        }
        Insert: {
          canal?: Database["public"]["Enums"]["pedido_canal"]
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          created_at_origem?: string | null
          descontos?: number
          external_key: string
          id?: string
          origem?: string
          pedido_externo_id: string
          pizzaria_id: string
          status?: Database["public"]["Enums"]["pedido_status"]
          taxas?: number
          total_bruto: number
          total_liquido: number
          updated_at?: string
          updated_at_origem?: string | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["pedido_canal"]
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          created_at_origem?: string | null
          descontos?: number
          external_key?: string
          id?: string
          origem?: string
          pedido_externo_id?: string
          pizzaria_id?: string
          status?: Database["public"]["Enums"]["pedido_status"]
          taxas?: number
          total_bruto?: number
          total_liquido?: number
          updated_at?: string
          updated_at_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_item: {
        Row: {
          descricao: string
          id: string
          modificadores: Json | null
          observacoes: string | null
          pedido_id: string
          preco_unit: number
          produto_externo_id: string | null
          qtd: number
          sku_externo_id: string | null
          total: number
        }
        Insert: {
          descricao: string
          id?: string
          modificadores?: Json | null
          observacoes?: string | null
          pedido_id: string
          preco_unit: number
          produto_externo_id?: string | null
          qtd: number
          sku_externo_id?: string | null
          total: number
        }
        Update: {
          descricao?: string
          id?: string
          modificadores?: Json | null
          observacoes?: string | null
          pedido_id?: string
          preco_unit?: number
          produto_externo_id?: string | null
          qtd?: number
          sku_externo_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      pizzaria: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["pizzaria_status"]
          telefone: string | null
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["pizzaria_status"]
          telefone?: string | null
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["pizzaria_status"]
          telefone?: string | null
        }
        Relationships: []
      }
      produto_estoque: {
        Row: {
          ativo: boolean
          categoria: string | null
          controla_lote: boolean
          controla_validade: boolean
          criado_em: string
          custo_medio: number
          estoque_minimo: number
          id: string
          nome: string
          pizzaria_id: string
          sku: string | null
          unidade: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          controla_lote?: boolean
          controla_validade?: boolean
          criado_em?: string
          custo_medio?: number
          estoque_minimo?: number
          id?: string
          nome: string
          pizzaria_id: string
          sku?: string | null
          unidade?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          controla_lote?: boolean
          controla_validade?: boolean
          criado_em?: string
          custo_medio?: number
          estoque_minimo?: number
          id?: string
          nome?: string
          pizzaria_id?: string
          sku?: string | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_estoque_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      status_map: {
        Row: {
          id: string
          origem: string
          status_canonico: string
          status_externo: string
        }
        Insert: {
          id?: string
          origem: string
          status_canonico: string
          status_externo: string
        }
        Update: {
          id?: string
          origem?: string
          status_canonico?: string
          status_externo?: string
        }
        Relationships: []
      }
      sync_job: {
        Row: {
          created_at: string
          created_by: string | null
          credencial_id: string
          current_page: number | null
          error_count: number
          error_message: string | null
          finished_at: string | null
          id: string
          imported_count: number
          periodo_fim: string
          periodo_inicio: string
          pizzaria_id: string
          processed_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
          total_count: number | null
          total_pages: number | null
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credencial_id: string
          current_page?: number | null
          error_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number
          periodo_fim: string
          periodo_inicio: string
          pizzaria_id: string
          processed_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          total_count?: number | null
          total_pages?: number | null
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credencial_id?: string
          current_page?: number | null
          error_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number
          periodo_fim?: string
          periodo_inicio?: string
          pizzaria_id?: string
          processed_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          total_count?: number | null
          total_pages?: number | null
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sync_job_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "integracao_credencial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_job_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          password_hash: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          password_hash?: string
        }
        Relationships: []
      }
      usuario_pizzaria: {
        Row: {
          id: string
          pizzaria_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          pizzaria_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          pizzaria_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_pizzaria_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_pizzaria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_caixa_consolidado: {
        Row: {
          dia: string | null
          entradas: number | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          liquido: number | null
          pizzaria_id: string | null
          saidas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimento_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dre_simplificado: {
        Row: {
          categoria: string | null
          mes: string | null
          pizzaria_id: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_estoque_atual: {
        Row: {
          custo_medio: number | null
          deposito: string | null
          deposito_id: string | null
          estoque_minimo: number | null
          lote_id: string | null
          numero_lote: string | null
          pizzaria_id: string | null
          produto: string | null
          produto_id: string | null
          quantidade: number | null
          unidade: string | null
          validade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_estoque_pizzaria_id_fkey"
            columns: ["pizzaria_id"]
            isOneToOne: false
            referencedRelation: "pizzaria"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_fechar_caixa: { Args: { _caixa_id: string }; Returns: number }
      fn_gerar_parcelas_nota: {
        Args: {
          _categoria_id?: string
          _forma?: Database["public"]["Enums"]["forma_pagamento"]
          _intervalo_dias?: number
          _nota_id: string
          _parcelas: number
          _primeiro_vencimento: string
        }
        Returns: number
      }
      fn_recalc_custo_medio: {
        Args: {
          _custo_entrada: number
          _produto_id: string
          _qtd_entrada: number
        }
        Returns: undefined
      }
    }
    Enums: {
      caixa_mov_origem:
        | "conta_receber"
        | "conta_pagar"
        | "manual"
        | "venda_dinheiro"
      caixa_mov_tipo: "entrada" | "saida" | "sangria" | "suprimento"
      caixa_status: "aberto" | "fechado"
      categoria_tipo: "custo_fixo" | "custo_variavel" | "imposto" | "outro"
      conta_status: "aberta" | "paga" | "vencida" | "cancelada" | "recebida"
      deposito_tipo: "principal" | "geladeira" | "freezer" | "outro"
      evento_status: "received" | "processing" | "processed" | "failed"
      forma_pagamento:
        | "dinheiro"
        | "pix"
        | "credito"
        | "debito"
        | "boleto"
        | "transferencia"
        | "outro"
      movimento_origem:
        | "nota_compra"
        | "pedido"
        | "inventario"
        | "manual"
        | "transferencia"
      movimento_tipo:
        | "entrada_compra"
        | "saida_venda"
        | "ajuste"
        | "transferencia"
        | "perda"
        | "inventario"
      nota_status: "rascunho" | "lancada" | "cancelada"
      pedido_canal: "delivery" | "mesa" | "balcao" | "retirada"
      pedido_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
      pizzaria_status: "ativa" | "inativa" | "suspensa"
      sync_job_status: "queued" | "running" | "completed" | "failed"
      user_role:
        | "super_admin"
        | "admin_pizzaria"
        | "gestor"
        | "operacao"
        | "financeiro"
        | "leitura"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      caixa_mov_origem: [
        "conta_receber",
        "conta_pagar",
        "manual",
        "venda_dinheiro",
      ],
      caixa_mov_tipo: ["entrada", "saida", "sangria", "suprimento"],
      caixa_status: ["aberto", "fechado"],
      categoria_tipo: ["custo_fixo", "custo_variavel", "imposto", "outro"],
      conta_status: ["aberta", "paga", "vencida", "cancelada", "recebida"],
      deposito_tipo: ["principal", "geladeira", "freezer", "outro"],
      evento_status: ["received", "processing", "processed", "failed"],
      forma_pagamento: [
        "dinheiro",
        "pix",
        "credito",
        "debito",
        "boleto",
        "transferencia",
        "outro",
      ],
      movimento_origem: [
        "nota_compra",
        "pedido",
        "inventario",
        "manual",
        "transferencia",
      ],
      movimento_tipo: [
        "entrada_compra",
        "saida_venda",
        "ajuste",
        "transferencia",
        "perda",
        "inventario",
      ],
      nota_status: ["rascunho", "lancada", "cancelada"],
      pedido_canal: ["delivery", "mesa", "balcao", "retirada"],
      pedido_status: [
        "novo",
        "confirmado",
        "em_preparo",
        "pronto",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
      pizzaria_status: ["ativa", "inativa", "suspensa"],
      sync_job_status: ["queued", "running", "completed", "failed"],
      user_role: [
        "super_admin",
        "admin_pizzaria",
        "gestor",
        "operacao",
        "financeiro",
        "leitura",
      ],
    },
  },
} as const

