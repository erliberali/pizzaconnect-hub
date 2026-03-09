import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Link2, Users, LogOut, Pizza, ChevronDown, Building2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { mockPizzarias } from '@/mocks/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/integracoes', label: 'Integrações', icon: Link2 },
  { to: '/usuarios', label: 'Usuários', icon: Users },
];

export function AppSidebar() {
  const { user, logout, memberships } = useAuth();
  const { currentPizzaria, setCurrentPizzaria, isConsolidated } = useTenant();
  const location = useLocation();

  const userPizzarias = memberships
    .map(m => mockPizzarias.find(p => p.id === m.pizzaria_id)!)
    .filter(Boolean);

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
          <Pizza className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-display font-bold text-sidebar-primary-foreground">PizzaGestão</h1>
          <p className="text-[11px] text-sidebar-foreground/60">Multi-tenant</p>
        </div>
      </div>

      {/* Tenant Selector */}
      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2.5 h-auto text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 shrink-0 text-sidebar-primary" />
                <span className="truncate text-sm font-medium">
                  {isConsolidated ? 'Todas as Pizzarias' : currentPizzaria?.nome}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setCurrentPizzaria(null)}>
              <Building2 className="w-4 h-4 mr-2" />
              Todas (Consolidado)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {userPizzarias.map(p => (
              <DropdownMenuItem key={p.id} onClick={() => setCurrentPizzaria(p)}>
                <Pizza className="w-4 h-4 mr-2" />
                {p.nome}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
            {user?.nome?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nome}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-sidebar-foreground/50 hover:text-destructive transition-colors" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
