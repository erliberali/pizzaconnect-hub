import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCredenciais } from './useCredenciais';

const mockOrder = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ order: mockOrder }) }) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useCredenciais', () => {
  beforeEach(() => mockOrder.mockReset());

  it('retorna credenciais ordenadas', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'a', pizzaria_id: 'p1', estabelecimento_externo_id: '18583', ativo: true },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCredenciais(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
