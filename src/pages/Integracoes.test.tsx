import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Integracoes from './Integracoes';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({
    currentPizzaria: { id: 'p1', nome: 'Peché' },
    isConsolidated: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'e@test.com', nome: 'Test User', created_at: '' },
    getUserRole: () => 'leitura',
    memberships: [],
  }),
}));

vi.mock('@/hooks/integracoes', () => ({
  useCredenciais: () => ({ data: [] }),
  useSyncJobs: () => ({ data: [] }),
  useEventosIntegracao: () => ({ data: [] }),
  useIntegracoesStats: () => ({
    data: { credenciaisAtivas: 0, syncRodando: 0, pedidos7d: 0, falhas7d: 0 },
  }),
  useUpsertCredencial: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEnqueueSyncJob: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/usePizzarias', () => ({
  usePizzarias: () => ({ data: [] }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('Integracoes page', () => {
  it('papel leitura não vê botão "Nova credencial"', () => {
    render(<Integracoes />, { wrapper: makeWrapper() });
    expect(screen.queryByRole('button', { name: /nova credencial/i })).toBeNull();
  });

  it('renderiza as três tabs', () => {
    render(<Integracoes />, { wrapper: makeWrapper() });
    expect(screen.getByRole('tab', { name: /credenciais/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /sincronizações/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /eventos/i })).toBeTruthy();
  });
});
