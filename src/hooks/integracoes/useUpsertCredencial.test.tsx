import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpsertCredencial } from './useUpsertCredencial';

const upsertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: (...args: any[]) => ({
        select: () => ({ single: () => upsertMock(...args) }),
      }),
    }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useUpsertCredencial', () => {
  it('chama upsert com payload e propaga erro 23505', async () => {
    upsertMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } });
    const { result } = renderHook(() => useUpsertCredencial(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await expect(
      result.current.mutateAsync({ pizzaria_id: 'p1', estabelecimento_externo_id: '123', api_key: 'k', ativo: true })
    ).rejects.toMatchObject({ code: '23505' });
  });
});
