import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import type { PedidoStatus, PedidoCanal } from '../common/supabase/database.types';

export interface FiltrosPedidos {
  pizzaria_id?: string;
  status?: PedidoStatus;
  canal?: PedidoCanal;
  desde?: string;
  ate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PedidosService {
  constructor(private supabase: SupabaseService) {}

  async listar(filtros: FiltrosPedidos) {
    const { pizzaria_id, status, canal, desde, ate, page = 1, limit = 50 } = filtros;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('pedido')
      .select('*, itens:pedido_item(*)', { count: 'exact' })
      .order('created_at_origem', { ascending: false })
      .range(from, to);

    if (pizzaria_id) query = query.eq('pizzaria_id', pizzaria_id);
    if (status) query = query.eq('status', status);
    if (canal) query = query.eq('canal', canal);
    if (desde) query = query.gte('created_at_origem', desde);
    if (ate) query = query.lte('created_at_origem', ate);

    const { data, error, count } = await query;
    if (error) throw error;
    return { pedidos: data, total: count ?? 0, page, limit };
  }

  async buscarPorId(id: string) {
    const { data, error } = await this.supabase.db
      .from('pedido')
      .select('*, itens:pedido_item(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async kpis(pizzariaId?: string, data?: string) {
    const dataRef = data ? new Date(data) : new Date();
    const inicio = new Date(dataRef);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataRef);
    fim.setHours(23, 59, 59, 999);

    let query = this.supabase.db
      .from('pedido')
      .select('total_liquido, canal, pizzaria_id, status')
      .gte('created_at_origem', inicio.toISOString())
      .lte('created_at_origem', fim.toISOString());

    if (pizzariaId) query = query.eq('pizzaria_id', pizzariaId);

    const { data: pedidos, error } = await query;
    if (error) throw error;

    const ativos = pedidos.filter((p) => p.status !== 'cancelado');
    const cancelados = pedidos.filter((p) => p.status === 'cancelado').length;
    const faturamento = ativos.reduce((s, p) => s + Number(p.total_liquido), 0);
    const ticketMedio = ativos.length > 0 ? faturamento / ativos.length : 0;

    const porCanal = ativos.reduce((acc, p) => {
      acc[p.canal] = (acc[p.canal] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const faturamentoPorCanal = ativos.reduce((acc, p) => {
      acc[p.canal] = (acc[p.canal] ?? 0) + Number(p.total_liquido);
      return acc;
    }, {} as Record<string, number>);

    return {
      pedidos_dia: ativos.length,
      faturamento_dia: faturamento,
      ticket_medio: ticketMedio,
      cancelamentos_dia: cancelados,
      pedidos_por_canal: porCanal,
      faturamento_por_canal: faturamentoPorCanal,
    };
  }
}
