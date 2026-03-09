import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Pizzaria } from '@/types';

interface TenantContextType {
  currentPizzaria: Pizzaria | null;
  setCurrentPizzaria: (p: Pizzaria | null) => void;
  /** null = consolidated view */
  isConsolidated: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentPizzaria, setCurrentPizzaria] = useState<Pizzaria | null>(null);

  return (
    <TenantContext.Provider value={{
      currentPizzaria,
      setCurrentPizzaria,
      isConsolidated: currentPizzaria === null,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
