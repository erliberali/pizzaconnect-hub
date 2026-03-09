import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pizza, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('admin@gestao.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast({ title: 'Login realizado com sucesso!' });
      navigate('/dashboard');
    } else {
      setError('Email não encontrado. Use um dos emails mockados.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary">
            <Pizza className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold">PizzaGestão</h1>
            <p className="text-sm text-muted-foreground mt-1">Sistema multi-tenant de gestão para pizzarias</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>Use um dos emails demo para acessar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@gestao.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-5 p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-2">Contas demo:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-mono font-medium">admin@gestao.com</span> — SuperAdmin (todas)</p>
                <p><span className="font-mono font-medium">gestor@bellanapoli.com</span> — Gestor (Bella Napoli)</p>
                <p><span className="font-mono font-medium">ops@fornobrasa.com</span> — Operação (Forno&Brasa)</p>
                <p><span className="font-mono font-medium">fin@gestao.com</span> — Financeiro (todas)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
