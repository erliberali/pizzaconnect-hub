import { Test } from '@nestjs/testing';
import { CardapioWebImporterService } from './cardapioweb.importer.service';
import { CardapioWebClient } from './cardapioweb.client';
import { SupabaseService } from '../../common/supabase/supabase.service';
import type { CwOrder } from './cardapioweb.types';

const mockOrder: CwOrder = {
  id: 1,
  display_id: 1,
  external_display_id: null,
  external_order_id: null,
  merchant_id: 18583,
  status: 'closed',
  order_type: 'delivery',
  order_timing: 'immediate',
  sales_channel: 'app',
  delivered_by: 'merchant',
  table_number: null,
  estimated_time: null,
  cancellation_reason: null,
  observation: null,
  delivery_fee: 0,
  service_fee: 0,
  additional_fee: 0,
  total: 50,
  created_at: '2026-04-10T12:00:00Z',
  updated_at: '2026-04-10T12:30:00Z',
  customer: { id: 1, name: 'Cliente Teste', phone: '11999999999', ddi: '+55' },
  delivery_address: null,
  items: [],
  discounts: [],
  payments: [],
};

describe('CardapioWebImporterService.importarPeriodo', () => {
  let service: CardapioWebImporterService;
  let client: jest.Mocked<CardapioWebClient>;

  beforeEach(async () => {
    client = {
      pollHistory: jest.fn(),
      getOrder: jest.fn(),
    } as any;

    const credData = {
      id: 'cred-1',
      pizzaria_id: 'piz-1',
      estabelecimento_externo_id: '18583',
      api_key_encrypted: 'key',
    };

    const supabase = {
      db: {
        from: jest.fn((tbl: string) => {
          if (tbl === 'integracao_credencial') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: credData, error: null }),
                }),
              }),
            };
          }
          if (tbl === 'pedido') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
              upsert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'p-1' }, error: null }),
                }),
              }),
            };
          }
          if (tbl === 'pedido_item') {
            return {
              delete: () => ({ eq: async () => ({}) }),
              insert: async () => ({}),
            };
          }
          return {};
        }),
      },
    };

    const mod = await Test.createTestingModule({
      providers: [
        CardapioWebImporterService,
        { provide: CardapioWebClient, useValue: client },
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    service = mod.get(CardapioWebImporterService);
    // Desabilita sleeps para acelerar o teste
    (service as any).sleep = () => Promise.resolve();
  });

  it('chama onProgress após cada página com contadores acumulados', async () => {
    client.pollHistory.mockResolvedValueOnce({
      items: [{ id: 1 } as any, { id: 2 } as any],
      pagination: { current_page: 1, total_pages: 2, total_orders: 3 } as any,
    });
    client.pollHistory.mockResolvedValueOnce({
      items: [{ id: 3 } as any],
      pagination: { current_page: 2, total_pages: 2, total_orders: 3 } as any,
    });
    client.getOrder.mockResolvedValue(mockOrder);

    const progressCalls: any[] = [];
    // Usar construtor local (ano, mês-0based, dia) para evitar deslocamento de fuso UTC→BRT
    const res = await service.importarPeriodo(
      'cred-1',
      new Date(2026, 3, 1),   // 01/04/2026 local
      new Date(2026, 3, 30),  // 30/04/2026 local
      (p) => { progressCalls.push(p); },
    );

    expect(progressCalls.length).toBe(2);
    expect(progressCalls[0]).toMatchObject({
      current_page: 1,
      total_pages: 2,
      processed_count: 2,
      total_count: 3,
    });
    expect(progressCalls[1]).toMatchObject({
      current_page: 2,
      total_pages: 2,
      processed_count: 3,
      total_count: 3,
    });
    expect(res.importados + res.atualizados + res.erros).toBe(3);
  });
});
