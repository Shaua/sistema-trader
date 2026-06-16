# TraderDesk — Sistema de Gestão de Banca Deriv

Sistema profissional de gestão de banca para opções binárias na corretora **Deriv**.

## 🚀 Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| State | Zustand |
| Gráficos | Recharts |
| Animações | Framer Motion |
| Backend | Node.js + Express |
| Banco | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google + Email) |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |

## 📦 Estrutura do Projeto

```
Sistema Trader/
├── frontend/          # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/     # Todas as páginas (módulos)
│       ├── components/ # Componentes reutilizáveis
│       ├── store/     # Zustand global state
│       ├── lib/       # Supabase + Axios
│       └── utils/     # Formatadores e helpers
│
├── backend/           # Node.js + Express
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Engines de cálculo
│       ├── middleware/ # Auth JWT
│       └── config/    # Supabase client
│
└── supabase/
    └── migrations/    # Schema SQL completo
```

## ⚙️ Setup Inicial

### 1. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase/migrations/001_initial_schema.sql`
3. Em **Settings > API**, copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

### 2. Configurar variáveis de ambiente

**Backend** — edite `backend/.env`:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-key
PORT=3001
```

**Frontend** — edite `frontend/.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_API_URL=http://localhost:3001/api
```

### 3. Configurar Google OAuth (opcional)

1. No Supabase: **Authentication > Providers > Google**
2. Ative o Google e configure as credenciais OAuth

### 4. Instalar e rodar

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

O app estará disponível em: **http://localhost:5173**

## 🧩 Módulos Implementados

| # | Módulo | Status |
|---|---|---|
| 1 | Dashboard Principal (KPIs + Gráficos) | ✅ |
| 2 | Configuração da Banca | ✅ |
| 3 | Gestão de Risco | ✅ |
| 4 | Diário Operacional | ✅ |
| 5 | Calendário Operacional | ✅ |
| 6 | Controle de Saques | ✅ |
| 7 | Controle de Depósitos | ✅ |
| 8 | Estatísticas Avançadas | ✅ |
| 9 | Projeção de Crescimento | ✅ |
| 10 | Relatórios PDF/Excel | ✅ |
| 11 | Multiusuário | 🔄 Fase 2 |
| 12 | Banco de Dados | ✅ |
| 13 | Inteligência Operacional | ✅ |
| 14 | Design Premium Dark | ✅ |
| 15 | Estrutura API Deriv | ✅ (mock) |

## 🚢 Deploy

### Vercel (Frontend)
```bash
cd frontend
npm run build
# Conecte ao Vercel via GitHub
```

### Railway (Backend)
```bash
# Conecte ao Railway via GitHub
# Configure as env vars no painel
```

## 📊 Banco de Dados

Tabelas criadas automaticamente pelo migration SQL:
- `user_profiles` — Perfis dos traders
- `bank_configs` — Configuração da banca
- `risk_configs` — Parâmetros de risco
- `operations` — Diário operacional
- `withdrawals` — Controle de saques
- `deposits` — Controle de depósitos
- `risk_events` — Histórico de alertas
- `daily_summaries` — Cache de estatísticas
