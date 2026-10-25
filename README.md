# 🚀 ReachInbox — Full-stack Email Job Scheduler & Dashboard

A production-grade, distributed email scheduling service and real-time dashboard built for **ReachInbox (Outbox Labs)**. Designed to reliably schedule, pace, throttle, and send cold outreach email sequences at scale with zero cron jobs, robust persistence across server restarts, and atomic rate-limiting safeguards.

---

## 🌟 Key Highlights & Architecture

- **True Event-Driven Scheduling (No Cron Jobs)**: Powered entirely by **BullMQ** delayed jobs backed by **Redis** and **PostgreSQL**.
- **Persistence Across Server Restarts**: Zero job loss and zero re-sends. BullMQ retains delayed jobs in Redis, and an automated startup reconciliation engine cross-checks PostgreSQL with Redis queues on boot.
- **Atomic Sender Rate-Limiting**: Enforces configurable hourly quotas per sender using atomic Redis Lua scripts (`ratelimit:{sender}:{hourWindow}`).
- **Intelligent Limit Deferral (No Dropped Jobs)**: When an hourly quota is reached, excess emails are safely rescheduled into the next hour window while preserving FIFO order.
- **Live Slack Alerting**: Directly notifies Slack in real-time the moment a sender reaches their hourly rate limit.
- **Provider Throttling Pacing**: Configurable minimum delay (e.g. 2s) enforced between consecutive emails from the same sender.
- **Multi-Sender SMTP Support**: Sends via Ethereal fake SMTP with multi-tenant sender switching, returning clickable Ethereal preview URLs for every sent email.
- **Searchable Indexing (Elasticsearch + Resilient Fallback)**: Scheduled and sent emails are indexed with fuzzy full-text search across recipient, subject, sender, and body.
- **Live Queue Monitoring**: Embedded **Bull-Board** UI (`/admin/queues`) for real-time visibility into waiting, active, delayed, and completed jobs.
- **Modern React + Tailwind Frontend**: Google OAuth login, lead upload CSV parser, scheduled/sent tabs, countdown timers, and live polling.

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart TD
    User([Frontend Dashboard / API Client]) -->|POST /api/emails/schedule| API[Express API Server]
    API -->|1. Store records status: SCHEDULED| Postgres[(PostgreSQL)]
    API -->|2. Add delayed job delay: target - now| BullMQ[BullMQ Delayed Queue]
    API -->|3. Index doc| ES[(Elasticsearch)]
    BullMQ -->|Stores queue & timer metadata| Redis[(Redis)]
    
    subgraph BullMQ Workers [Concurrent Workers Concurrency: 5]
        Worker[Worker Engine] -->|1. Check idempotency| Postgres
        Worker -->|2. Check hourly limit Lua script| Redis
        Worker -->|If limit exceeded| Slack[Slack Alert & Defer to Next Hour]
        Worker -->|3. Enforce pacing delay| Redis
        Worker -->|4. Send SMTP| Ethereal[Ethereal Fake SMTP]
        Worker -->|5. Update status: SENT + previewUrl| Postgres
        Worker -->|6. Update doc| ES
    end

    subgraph Server Reboot Reconciliation
        Boot[Server Startup] -->|Query SCHEDULED jobs| Postgres
        Boot -->|Check if job active in Redis| BullMQ
        Boot -->|Re-enqueue missing jobs on exact time| BullMQ
    end
```

---

## 🧪 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend** | TypeScript, Express.js | Structured modular REST architecture |
| **Queue** | BullMQ | Redis-backed delayed jobs, no cron jobs |
| **Database** | PostgreSQL | Prisma ORM with connection pooling |
| **Cache & Counters** | Redis (ioredis) | Delayed timers, atomic Lua counters, pacing timestamps |
| **Search** | Elasticsearch (`@elastic/elasticsearch`) | Full-text fuzzy indexing with resilient DB fallback |
| **SMTP Provider** | Ethereal Email + Nodemailer | Fake test SMTP with browser preview URLs |
| **Queue Dashboard** | `@bull-board/express` | Real-time queue visualizer at `/admin/queues` |
| **Alerts** | Slack Incoming Webhook & OAuth API | Live Block Kit notifications on rate limit hits |
| **Frontend** | React 18, Vite, TypeScript | Modern responsive SPA |
| **Styling** | Tailwind CSS | Dark mode, glassmorphism, micro-animations |
| **Auth** | Google OAuth (`@react-oauth/google` + JWT) | Real Google Sign-In with demo profile fallback |

---

## 📦 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/            # Redis, Prisma, and environment constants
│   │   ├── controllers/       # Email, Slack, Sender controllers
│   │   ├── services/          # Queue, RateLimit, Slack, SMTP, Elasticsearch services
│   │   ├── workers/           # BullMQ worker processor and event listeners
│   │   ├── routes/            # Express API route declarations
│   │   ├── prisma/            # Prisma schema, migrations, and seeds
│   │   └── server.ts          # Server entrypoint and graceful shutdown
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, Tables, Modals, Stats, Login, Toast
│   │   ├── lib/               # Axios API client
│   │   ├── types/             # TypeScript definitions
│   │   ├── App.tsx            # Main application layout & polling
│   │   └── index.css          # Tailwind CSS design system
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── sample-leads.csv           # 10 realistic sample leads for batch testing
├── docker-compose.yml         # Full containerized stack
├── package.json               # Root scripts
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js** >= 18
- **PostgreSQL** (running on port 5432)
- **Redis** (running on port 6379)
- *(Optional)* Docker / Docker Compose

---

### Option A: Running with Docker Compose (Single Command)

```bash
docker compose up --build
```
This spins up PostgreSQL, Redis, Elasticsearch, the Express backend, and the React frontend.
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001`
- BullMQ Live Dashboard: `http://localhost:5001/admin/queues`

---

### Option B: Running Locally (Native)

#### 1. Start Redis & PostgreSQL Services
```bash
# On macOS via Homebrew:
brew services start redis
brew services start postgresql@16

# Verify connections:
redis-cli ping           # Returns PONG
psql -U postgres -c "SELECT 1;"
```

#### 2. Backend Setup
```bash
cd backend

# Create .env from example (default settings work out of the box)
cp .env.example .env

# Install backend dependencies
npm install

# Push database schema & seed initial senders
npx prisma db push
npm run db:seed

# Start backend dev server
npm run dev
```
*Backend will be running on `http://localhost:5001`.*

#### 3. Frontend Setup
In a new terminal:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start frontend dev server
npm run dev
```
*Frontend will be running on `http://localhost:3000`.*

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5001
CLIENT_URL=http://localhost:3000

# PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public

# Redis Connection
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# BullMQ Worker Tuning
WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_SECONDS=2
DEFAULT_HOURLY_LIMIT=100

# Elasticsearch Endpoint
ELASTICSEARCH_URL=http://localhost:9200

# Slack Integration (Can also be connected via UI)
SLACK_WEBHOOK_URL=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5001/api/slack/oauth/callback

# Ethereal Email Credentials (Leave empty to auto-generate ephemeral credentials)
ETHEREAL_USER=
ETHEREAL_PASS=

# Google OAuth (Optional on backend)
GOOGLE_CLIENT_ID=
```

---

## 🔍 Deep-Dive: Core Engineering Requirements

### 1. Core Scheduling & Persistence (No Cron Jobs)
- **Zero Cron Jobs**: Traditional cron solutions (`node-cron`, `agenda`) poll every minute and suffer from drift, concurrency bugs, and lost timers upon crash.
- **BullMQ Delayed Jobs**: Each email is registered with `emailQueue.add('send-email', data, { delay, jobId: 'email_job_' + id })`. BullMQ stores delayed jobs in a Redis sorted set scored by timestamp.
- **Server Restart Resilience (`reconcileScheduledJobs`)**:
  1. On server boot, the system executes an automated reconciliation routine.
  2. It queries PostgreSQL for all jobs with `status = SCHEDULED`.
  3. For every scheduled email, it verifies whether the job exists in Redis.
  4. If missing (e.g. from a network disconnect or Redis restart), it computes `delay = Math.max(0, scheduledAt - Date.now())` and enqueues it.
  5. If the scheduled time elapsed while the server was down, `delay` is set to `0` so the email sends immediately upon recovery.
  6. Idempotency is preserved by deterministic BullMQ `jobId`, preventing duplicate sends.

### 2. Throughput, Concurrency & Provider Pacing
- **Worker Concurrency**: Worker concurrency is configurable via `WORKER_CONCURRENCY` (default: 5). Jobs are processed in parallel across worker threads.
- **Pacing Delay Between Sends**: To prevent SMTP server throttling, the worker enforces a configurable minimum delay (e.g. 2s) between emails from the same sender using `last_sent:{senderEmail}` timestamps in Redis.

### 3. Hourly Rate Limiting & Order-Preserving Deferral
- **Atomic Lua Counter**: Rate limits are keyed by `ratelimit:{senderEmail}:{YYYY-MM-DD-HH}` with an auto-expiring TTL of 2 hours.
- When evaluating a send request, an atomic Lua script checks if `currentCount >= hourlyLimit`. If exceeded, the counter is NOT incremented, eliminating race conditions across concurrent workers.
- **Order Preservation**: When the hourly limit is hit, jobs are **never dropped or failed**. Instead:
  1. The start time of the next UTC hour window is computed: `nextHour = currentHour + 1:00:00`.
  2. The job is rescheduled in BullMQ with `delay = nextHour - now + jitter`.
  3. The PostgreSQL record is updated with the new `scheduledAt` timestamp, maintaining the `SCHEDULED` status.
  4. Order is preserved as deferred jobs queue up for the next available window.

### 4. Live Slack Notification on Rate Limit Hit
- The user connects Slack via Incoming Webhook or OAuth in the frontend dashboard.
- The connection is saved in PostgreSQL and cached in Redis.
- The instant a sender reaches their hourly quota, `rateLimitService` triggers `slackService.notifyRateLimitHit()`.
- An alert is sent to Slack with:
  - Sender email
  - Configured hourly limit
  - Recipient email
  - Rescheduled window time
- **Zero-Crash Disconnect Resilience**: If Slack is not connected or disconnected, the scheduler continues uninterrupted and suppresses Slack notifications without throwing errors.

### 5. Multi-Sender Support & Fake SMTP (Ethereal Email)
- Supports sending from multiple senders (e.g., `alex@reachinbox.ai`, `sarah@growthoutbox.io`, `automation@outboxlabs.com`).
- Creates or reuses Ethereal test accounts via `nodemailer`.
- Every sent email generates a real, clickable Ethereal preview URL (`https://ethereal.email/message/...`), rendered in the frontend **Sent Emails** table.

### 6. Elasticsearch Full-Text Search + Resilient Fallback
- Indexes email documents (`recipient`, `senderEmail`, `subject`, `body`, `status`, `scheduledAt`, `sentAt`, `previewUrl`) into Elasticsearch index `emails`.
- Implements fuzzy `multi_match` search across fields.
- **Fault-Tolerant Engine**: If Elasticsearch is offline in the local environment, the backend automatically switches to PostgreSQL `ILIKE` search with identical API response structure, guaranteeing 100% uptime.

---

## 🖥️ Frontend Walkthrough

1. **Google OAuth Login**:
   - Secure Google Sign-In with `@react-oauth/google`.
   - Decodes user token with `jwt-decode` to extract Name, Email, and Avatar.
   - Includes a **"Sign In with Demo Google Profile"** button for immediate testing.
2. **Main Dashboard**:
   - Top Header displaying user avatar, name, email, and Logout.
   - **BullMQ Live Monitor Link** opening `/admin/queues` in a new tab.
   - **Slack Connection Pill** showing connection state and channel name.
   - Metric summary cards (Total Scheduled, Total Sent, Active BullMQ Workers, Senders Quotas).
3. **Compose Campaign Modal**:
   - Multi-sender dropdown selection.
   - Subject line and body editor with variable tags (`{{name}}`, `{{company}}`).
   - **CSV / TXT Lead Uploader**: parses email addresses client-side, displays count badge, and renders removable email chips.
   - Start Time picker with quick presets (*"In 10s"*, *"In 1m"*, *"In 5m"*, *"Tomorrow 9 AM"*).
   - Delay pacing selector & Hourly limit control.
4. **Scheduled Emails Table**:
   - Live countdown timer for each upcoming email (*"In 45 seconds"*).
   - Real-time search filter.
   - **Send Now** action: instantly dispatches email to worker, bypassing remaining delay.
   - **Cancel** action: deletes job from BullMQ queue and updates database.
5. **Sent Emails Table**:
   - Timestamped sent records.
   - Status badge (`SENT` / `FAILED`).
   - Clickable **"View Email ↗"** button that opens the real rendered email in Ethereal's web viewer.

---

## 🎬 Step-by-Step Demo Verification Script

Follow these steps to demonstrate all key assignment requirements:

### Step 1: Scheduling a Batch with CSV Upload
1. Log in to the dashboard at `http://localhost:3000`.
2. Click **"Compose Email"**.
3. Click **"Upload CSV / TXT Leads"** and select `sample-leads.csv`.
4. Notice that 10 email leads are parsed and displayed as chips.
5. Click **"In 10s"** preset for start time, leave delay at 2s, and click **"Schedule Campaign"**.
6. Switch to the **Scheduled Emails** tab to watch the countdown timers.
7. Within 10-30 seconds, watch the items move automatically to the **Sent Emails** tab.
8. Click **"View Email"** on any sent row to inspect the rendered email on Ethereal Email!

### Step 2: Testing Server Restart Persistence
1. Click **"Compose Email"** and schedule an email for **2 minutes** in the future.
2. Verify the email appears in the **Scheduled Emails** tab.
3. In your backend terminal, stop the server with `Ctrl+C`.
4. Notice the email remains safely stored in PostgreSQL and Redis.
5. Start the backend server again: `npm run dev`.
6. Notice the console output:
   ```
   🔄 [Queue] Running server restart persistence reconciliation...
   [Queue] Found 1 pending scheduled emails in database.
   ✅ [Queue] Persistence reconciliation complete. 1 jobs reconciled and ready.
   ```
7. When the 2 minutes elapse, the worker sends the email right on schedule. No emails lost!

### Step 3: Demonstrating Rate Limiting & Slack Alert
1. In the dashboard, click **"Senders & Quotas"**.
2. Click the edit icon next to `automation@outboxlabs.com` and set the hourly limit to **2**.
3. Click **"Connect Slack"** in the top navigation, paste an incoming webhook URL (or use the test button), and save.
4. Click **"Compose Email"**, select `automation@outboxlabs.com`, set start time to **"In 10s"**, and add 3 recipients.
5. Watch the backend console:
   - Recipient 1: Allowed -> Sent.
   - Recipient 2: Allowed -> Sent (limit reached!).
   - Recipient 3: Exceeds hourly limit -> Rescheduled into the next hour window!
   - Slack alert: A live Block Kit message is dispatched to your Slack channel!
6. In the **Scheduled Emails** tab, verify Recipient 3 is deferred to the next hour with `SCHEDULED` status and was NOT dropped!

### Step 4: Live Queue Visibility
1. Click **"BullMQ Live Monitor"** in the header or navigate to `http://localhost:5001/admin/queues`.
2. View active queues, delayed jobs, completed jobs, throughput metrics, and job payloads in real time.

---

## ⚖️ Trade-offs & Architecture Decisions

1. **BullMQ Delayed Queue vs Custom Timer Polling**:
   - *Decision*: Used BullMQ delayed jobs backed by Redis sorted sets.
   - *Trade-off*: Requires Redis, but delivers sub-millisecond precision, distributed locking, and horizontal scalability without polling lag or cron dependencies.
2. **Hybrid DB + Redis Persistence**:
   - *Decision*: State of truth is in PostgreSQL; BullMQ manages transient execution.
   - *Rationale*: If Redis were to restart with empty memory, the startup reconciliation reconstructs all BullMQ delayed jobs from PostgreSQL effortlessly.
3. **Elasticsearch + PostgreSQL Resilient Search**:
   - *Decision*: Full-text Elasticsearch indexing with automatic fallback to PostgreSQL `ILIKE`.
   - *Rationale*: Eliminates fragile external dependencies during local grading while providing true Elasticsearch integration when running in Docker or production.
4. **Slack Incoming Webhook + OAuth**:
   - *Decision*: Supported both direct incoming webhooks and OAuth redirects.
   - *Rationale*: Webhooks allow immediate, frictionless testing in 10 seconds without needing to create and approve a Slack Marketplace App.

---

## 👥 Submission Information

- **Repository**: ReachInbox Full-stack Email Job Scheduler
- **Collaborator Access Granted**: `Mitrajit` & `Yadav036`
- **Candidate**: Software Development Intern Applicant

*Built with passion for high-scale, resilient systems at ReachInbox.*
