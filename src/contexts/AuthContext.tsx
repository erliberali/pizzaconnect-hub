import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserMembership, UserRole } from '@/types';
import { mockUsers, mockMemberships, mockPizzarias } from '@/mocks/data';

interface AuthState {
  user: User | null;
  memberships: UserMembership[];
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getUserRole: (pizzariaId: string) => UserRole | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    memberships: [],
    isAuthenticated: false,
  });

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Mock: any password works, match by email
    const user = mockUsers.find(u => u.email === email);
    if (!user) return false;
    const memberships = mockMemberships.filter(m => m.user_id === user.id).map(m => ({
      ...m,
      pizzaria: mockPizzarias.find(p => p.id === m.pizzaria_id),
    }));
    setState({ user, memberships, isAuthenticated: true });
    return true;
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, memberships: [], isAuthenticated: false });
  }, []);

  const getUserRole = useCallback((pizzariaId: string): UserRole | null => {
    const m = state.memberships.find(mb => mb.pizzaria_id === pizzariaId);
    return m?.role ?? null;
  }, [state.memberships]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
