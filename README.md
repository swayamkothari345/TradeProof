# TradeProof

**Practice. Analyse. Improve.**

TradeProof is a trading discipline and learning platform for students, independent traders, mentors and trading institutes in India. It provides simulated trading, structured journalling, rule-based discipline analysis, assessments and AI-powered educational feedback — without any real-money execution.

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Set up the database

```bash
cd ../backend

# Push schema to PostgreSQL (creates tables)
DATABASE_URL="<your-connection-string>" npx prisma db push --schema=../prisma/schema.prisma

# Generate Prisma client
DATABASE_URL="<your-connection-string>" npx prisma generate --schema=../prisma/schema.prisma

# Seed demo data
node ../prisma/seed.js
```

### 4. Start the backend

```bash
cd backend
npm run dev
# API runs at http://localhost:5000
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
# App runs at http://localhost:5173
```

---

## Demo Accounts

After seeding, the following accounts are available:

| Role      | Email                   | Password   |
|-----------|-------------------------|------------|
| Student   | student@demo.com        | Password1  |
| Trader    | trader@demo.com         | Password1  |
| Mentor    | mentor@demo.com         | Password1  |
| Institute | institute@demo.com      | Password1  |

---

## Architecture

```
TradeProof/
├── backend/           Express API (Node.js, JWT, Prisma)
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── middleware/
│       ├── validators/
│       └── utils/
├── frontend/          React + Vite + Tailwind
│   └── src/
│       ├── pages/     (auth, student, trader, mentor, institute, shared)
│       ├── components/
│       ├── services/  (API client)
│       ├── context/   (Auth, Theme)
│       └── utils/
└── prisma/
    ├── schema.prisma
    └── seed.js
```

---

## API Endpoints

Base URL: `http://localhost:5000/api`

| Group          | Prefix              |
|----------------|---------------------|
| Auth           | /auth               |
| Portfolio      | /portfolios         |
| Journal        | /journal            |
| Risk Tools     | /risk               |
| Rule Engine    | /rules              |
| Tests          | /tests              |
| Connections    | /connections        |
| Analytics      | /analytics          |
| AI Coach       | /ai-coach           |
| Notifications  | /notifications      |
| Feedback       | /feedback           |
| Learning       | /learning           |

Health check: `GET /health`

---

## Completed Features

- User registration and login (all 4 roles)
- JWT access + refresh token authentication
- Role-based route protection
- Student / Trader / Mentor / Institute dashboards
- Demo Trading Lab (simulated orders, positions, P&L)
- Fictional Market Simulator (5 fictional companies, live price simulation, news)
- Historical Practice (3 educational scenarios)
- Trading Journal (full CRUD, filters, CSV export, strategy tracking)
- Risk Calculator (position sizing, risk:reward, pre-trade checklist)
- Rule Engine (missing stop-loss, max risk, journal completion checks)
- Dispute workflow (student submits → mentor resolves)
- AI Trading Coach (deterministic + optional OpenAI GPT-4o-mini)
- Tests & Assessments (create, publish, assign, take, backend scoring)
- Learning Hub (3 educational articles with reading view)
- Mentor–Student connection system (invitation codes, consent, revocation)
- Mentor feedback to students
- Analytics dashboard (P&L charts, strategy performance, mistake frequency)
- Light/dark theme toggle
- Notifications system

## Incomplete / Postponed Features

- Password reset via email (backend logic present, email sender not wired)
- CSV import for journal (validation framework ready, UI not built)
- Cohort management UI (models exist, full CRUD pages not built)
- Institute analytics beyond overview
- Broker integration (intentionally excluded — educational platform only)
- Live market data feeds (excluded by design)
- Payment/subscription system

## Known Limitations

- Demo Trading Lab uses manually entered prices (not live feed)
- Historical Practice uses synthetic illustrative data only
- AI Coach uses deterministic logic unless `OPENAI_API_KEY` is set in `.env`
- Email delivery for password reset requires SMTP configuration

---

## Legal Notice

TradeProof is an educational simulation platform. It does not execute real trades, connect to brokers, provide financial advice or recommend any securities. All portfolio balances and trade records are simulated for learning purposes only.
