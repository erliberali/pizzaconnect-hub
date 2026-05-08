import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type { CwCredencial, CwHistoryParams, CwHistoryResponse, CwHistoryItem, CwHistoryPagination, CwOrdersParams, CwOrdersResponse, CwOrder } from './cardapioweb.types';

@Injectable()
export class CardapioWebClient {
  private readonly logger = new Logger(CardapioWebClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('cardapioweb.baseUrl')!;
    this.timeoutMs = this.config.get<number>('cardapioweb.timeoutMs')!;
  }

  private buildClient(credencial: CwCredencial): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'X-API-KEY': credencial.api_key,
        'Accept': 'application/json',
      },
      // Segue redirects automaticamente (axios padrão)
      maxRedirects: 5,
    });
  }

  async pollHistory(credencial: CwCredencial, params: CwHistoryParams): Promise<{ items: CwHistoryItem[]; pagination: CwHistoryPagination }> {
    const client = this.buildClient(credencial);
    try {
      const { data } = await client.get<CwHistoryResponse>('/orders/history', {
        params: {
          start_date: params.start_date,
          end_date: params.end_date,
          ...(params.page !== undefined && { page: params.page }),
        },
      });
      return {
        items: Array.isArray(data?.orders) ? data.orders : [],
        pagination: data?.pagination ?? { current_page: 1, total_pages: 1, total_orders: 0 },
      };
    } catch (err) {
      this.logger.error(`Erro no history [${credencial.estabelecimento_externo_id}] ${params.start_date}→${params.end_date} p${params.page ?? 1}: ${err.message}`);
      throw err;
    }
  }

  async pollOrders(credencial: CwCredencial, params: CwOrdersParams = {}): Promise<CwOrdersResponse> {
    const client = this.buildClient(credencial);
    try {
      const { data } = await client.get<CwOrdersResponse>('/orders', {
        params: {
          ...(params.status && { status: params.status }),
          ...(params.created_at_gteq && { created_at_gteq: params.created_at_gteq }),
          ...(params.page !== undefined && { page: params.page }),
          ...(params.per_page !== undefined && { per_page: params.per_page }),
        },
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      this.logger.error(`Erro no poll [${credencial.estabelecimento_externo_id}]: ${err.message}`);
      throw err;
    }
  }

  async getOrder(credencial: CwCredencial, orderId: number | string): Promise<CwOrder> {
    const client = this.buildClient(credencial);
    try {
      const { data } = await client.get<CwOrder>(`/orders/${orderId}`);
      return data;
    } catch (err) {
      this.logger.error(`Erro ao buscar order ${orderId}: ${err.message}`);
      throw err;
    }
  }
}
