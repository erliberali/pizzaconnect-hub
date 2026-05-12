import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnqueueSyncJob } from './useEnqueueSyncJob';

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tbl: string) => fromMock(tbl),
    auth: { getUser: async () => ({ data: { user: null } }) },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useEnqueueSyncJob', () => {
  it('bloqueia quando já há job ativo pra mesma credencial', async () => {
    fromMock.mockImplementation((tbl: string) => {
      if (tbl === 'sync_job') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => Promise.resolve({ data: [{ id: 'existing' }], error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEnqueueSyncJob(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await expect(
      result.current.mutateAsync({
        credencial_id: 'c1',
        pizzaria_id: 'p1',
        periodo_inicio: '2026-04-01',
        periodo_fim: '2026-04-10',
      })
    ).rejects.toThrow(/já existe sync/i);
  });
});
