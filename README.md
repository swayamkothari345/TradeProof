# TradeProof

### Practice. Analyse. Improve.

**A Trading Education, Simulation & Accountability Platform**

TradeProof is a FinTech and EdTech platform designed to help aspiring and active traders improve their trading knowledge, practise market decisions, understand their mistakes and develop disciplined trading habits.

Rather than focusing only on profits and losses, TradeProof focuses on the decision-making process behind trading — including risk management, consistency, preparation and trading psychology.

<p align="center">
  <img src="https://img.shields.io/badge/Project-TradeProof-083A4F?style=for-the-badge" alt="TradeProof"/>
  <img src="https://img.shields.io/badge/Category-FinTech-blue?style=for-the-badge" alt="FinTech"/>
  <img src="https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge" alt="Prototype"/>
</p>


## The Problem

Many individuals spend considerable time learning trading strategies, watching market analysis and studying technical concepts. However, understanding a strategy does not necessarily mean being able to follow it consistently.

Common challenges include:

- Poor risk management and position sizing.
- Emotional decisions driven by fear, greed and FOMO.
- Revenge trading and overtrading.
- Repeated mistakes without proper analysis.
- Lack of structured trading practice.
- Limited visibility for mentors into students' practical performance.
- Fragmented tools for learning, simulation, journaling and assessment.

**The fundamental problem is the gap between knowing how to trade and developing the discipline to follow a trading plan.**

## Our Solution

TradeProof brings trading education, simulated practice, performance analysis and mentor-led accountability together in one platform.

Our approach follows six stages:

**Learn → Prepare → Practise → Record → Analyse → Improve**

Users can learn trading concepts, practise in simulated environments, document decisions, evaluate performance and receive educational insights.

---

## Key Features

### 1. Demo Trading Lab

A simulated trading environment where users can practise trading without risking real money.

- Simulated buy and sell orders.
- Market charts and price history.
- Instrument watchlists.
- Multiple chart timeframes.
- Virtual portfolio and positions.
- Order history and simulated P&L.
- Technical analysis and indicators.

### 2. Fictional Market

An experimental environment featuring fictional companies and simulated price movements.

- Explore fictional companies.
- Observe simulated price fluctuations.
- Experiment with virtual trades.
- Practise different trading approaches.

### 3. Historical Practice

An interactive learning environment based on historical market events and educational scenarios.

- Analyse market situations and news.
- Study price charts and indicators.
- Make BUY, SELL or WAIT decisions.
- Reveal subsequent market movements.
- Evaluate reasoning and risk management.
- Learn from previous decisions.

### 4. Practical Trading Scenarios

A structured environment for practising trading decisions through interactive scenarios.

- Market context and chart analysis.
- Trading decisions.
- Entry, stop-loss and target planning.
- Position sizing and risk-to-reward calculations.
- Decision submission.
- Performance evaluation and feedback.

### 5. Smart Trading Journal

A structured space for recording and analysing trading activity.

- Record entry and exit details.
- Maintain strategy notes.
- Track stop-loss and targets.
- Record emotional check-ins.
- Categorise mistakes such as FOMO, revenge trading and overtrading.
- Review trading performance and patterns.

### 6. AI Trading Coach

An AI-powered educational assistant designed to help users understand trading concepts and improve their decision-making.

- Explain trading fundamentals.
- Answer educational trading questions.
- Explain technical analysis and risk management.
- Analyse available journal and practice data.
- Identify potential behavioural patterns.
- Suggest relevant learning exercises.

### 7. Assessments

A testing system for evaluating theoretical knowledge and practical trading skills.

- Multiple-choice assessments.
- Trading knowledge tests.
- Risk management assessments.
- Practical scenario-based tests.
- Mentor-assigned assessments.
- Performance tracking and results.

### 8. Learning Hub

A structured educational environment covering:

- Stock market fundamentals.
- Technical analysis.
- Candlestick patterns.
- Trading psychology.
- Risk management.
- Intraday and positional trading.
- Futures and Options.

### 9. Trading Dictionary

A searchable trading glossary containing definitions, explanations and practical examples of financial-market terminology.

### 10. Risk Calculator

Tools for planning simulated trades more responsibly.

- Position sizing.
- Stop-loss calculations.
- Risk-to-reward ratio.
- Potential loss and target calculations.
- Capital exposure.

### 11. Mentor and Institute Ecosystem

A role-based environment connecting learners, independent mentors and trading institutes.

**Mentors:**
- Connect with students.
- Assign assessments and exercises.
- Review submissions.
- Track student progress.
- Provide feedback.

**Institutes:**
- Manage teachers and students.
- Create cohorts.
- Assign mentors to cohorts.
- Conduct assessments.
- Monitor learning progress.

---

## User Roles

| Role | Description |
|---|---|
| Student | Learns, practises and completes assessments. |
| Independent Trader | Practises, journals and analyses trading decisions. |
| Independent Mentor | Guides students and reviews their progress. |
| Institute | Manages teachers, students and learning cohorts. |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, JavaScript |
| Styling | Tailwind CSS, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| AI Integration | Large Language Model API |
| Data Visualisation | Recharts |
| Version Control | Git and GitHub |

---

## Architecture

TradeProof follows a frontend–backend–database architecture.

```text
                    TRADEPROOF
                        |
                 React.js Frontend
                        |
                   REST APIs
                        |
               Node.js + Express
                        |
                   Prisma ORM
                        |
                  PostgreSQL
                        |
             Application Data Layer

                 AI Integration
                        |
                 AI Trading Coach
```

---

## Getting Started

Follow these steps to run TradeProof locally.

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/swayamkothari345/TradeProof.git
```

```bash
cd TradeProof
```

### 2. Install dependencies

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies in a separate terminal:

```bash
cd TradeProof/backend
npm install
```

### 3. Configure environment variables

Create the backend `.env` file using the environment variables required by the existing backend configuration.

Example:

```env
DATABASE_URL="your_postgresql_connection_string"
PORT=5001
```

Configure the AI provider key using the exact variable name expected by the backend AI service.

**Never upload `.env` files, API keys, database passwords or authentication secrets to GitHub.**

### 4. Generate Prisma Client

From the backend directory:

```bash
npx prisma generate
```

Synchronise the local development database only when required and after checking the existing schema:

```bash
npx prisma db push
```

Run the existing database seed script if one is configured.

### 5. Start the backend

```bash
npm run dev
```

The current local development configuration uses port `5001`.

### 6. Start the frontend

In another terminal:

```bash
cd TradeProof/frontend
npm run dev
```

Open the local address provided by Vite, typically:

```text
http://localhost:5173
```

> **Note:** Commands, scripts, environment variables and folder paths should be verified against the current project configuration before running them. Do not run database migrations or seeding commands against a shared production database without reviewing their effects.

---

## Project Structure

The project is organised into frontend and backend applications.

```text
TradeProof/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

*This is an illustrative structure. Refer to the repository for the exact directory layout.*

---

## Future Scope

Potential future enhancements include:

- Advanced historical market replay.
- Trading strategy testing and backtesting.
- Trading psychology and emotional pattern tracking.
- Personalised learning plans.
- Interactive flashcards and daily knowledge challenges.
- Mentor challenge rooms.
- Advanced institutional analytics.
- Expanded market instrument coverage.
- More detailed AI-powered performance reports.

---

## Responsible Use

TradeProof is intended for educational and simulated trading purposes.

- Simulated trading does not involve real-money order execution.
- Synthetic and fictional market data should be clearly labelled.
- AI insights are educational and should not be treated as financial advice.
- Market data integrations must comply with applicable licensing requirements.
- Users should understand the risks of financial markets before trading with real capital.

---

## Project Vision

TradeProof aims to make trading education more practical, measurable and accountable.

We believe becoming a better trader is not simply about identifying profitable opportunities. It is about developing the knowledge, discipline and consistency to make informed decisions.

**TradeProof — Practice. Analyse. Improve.**

