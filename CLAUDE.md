# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev        # inicia servidor de desenvolvimento na porta 8080
npm run build      # build de produção
npm run build:dev  # build de desenvolvimento
npm run lint       # ESLint
npm run test       # Vitest (execução única)
npm run test:watch # Vitest em modo watch
npm run preview    # preview do build de produção
```

Para rodar um único arquivo de teste:
```bash
npx vitest run src/test/arquivo.test.tsx
```

## Arquitetura

**Plataforma:** Sistema multi-tenant de gestão de pizzarias (PizzaGestão).

**Stack:**
- React 18 + TypeScript 5.8 com Vite/SWC
- React Router v6 para roteamento
- TanStack React Query v5 para cache e fetch de dados
- React Context API para auth (`AuthContext`) e tenant (`TenantContext`)
- shadcn/ui + Radix UI + Tailwind CSS para UI
- React Hook Form + Zod para formulários e validação
- Supabase como backend (integração em `src/integrations/supabase/`)
- Vitest + React Testing Library para testes

**Fluxo de dados:**
- `AuthContext` controla autenticação e papel do usuário (ainda mockado, pronto para Supabase)
- `TenantContext` controla qual pizzaria está ativa ou se é uma visão consolidada (super_admin)
- Componentes consomem dados via React Query ou diretamente dos contextos
- Dados mock ficam em `src/mocks/` para desenvolvimento/demo

**Roteamento (`src/App.tsx`):**
- Rotas públicas: `/login`
- Rotas protegidas: envolvidas por guard de autenticação
- Layout principal: `AppLayout` com `AppSidebar`

**Multi-tenancy:**
- Usuários com papel `super_admin` veem todas as pizzarias consolidadas
- Outros papéis veem apenas a pizzaria associada ao seu perfil

**Roles disponíveis:** `super_admin`, `admin_pizzaria`, `gestor`, `operacao`, `financeiro`, `leitura`

**Aliases de path:** `@/*` aponta para `./src/*`

**Temas:** Tailwind usa variáveis CSS (`--background`, `--foreground`, etc.) com suporte a dark mode via classe `.dark`
