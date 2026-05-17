# Node.js TypeScript MySQL API

A production-ready REST API boilerplate with JWT auth, MySQL, Sequelize, and email verification.

## Stack

- **Runtime**: Node.js 20 + TypeScript
- **Package manager**: pnpm
- **Framework**: Express 4
- **Database**: MySQL 8 via Sequelize
- **Auth**: JWT (15 min) + Refresh Tokens (7 days)
- **Email**: Gmail (App Password) or Resend (free tier)
- **Docs**: Swagger UI at `/api-docs`

---

## Quick Start (local dev)

### 1. Install pnpm (if you don't have it)

```bash
npm install -g pnpm
# or
corepack enable && corepack prepare pnpm@latest --activate
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. See [Email Setup](#email-setup) below.

### 4. Start dev server

```bash
pnpm dev
```

Server starts at `http://localhost:4000`  
Swagger docs at `http://localhost:4000/api-docs`

---

## Email Setup

Set `EMAIL_PROVIDER` to either `gmail` or `resend` in your `.env`.

### Option A: Gmail (App Password)

Best for personal projects / low volume. Free.

1. Enable **2-Step Verification** on your Google account.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Generate an App Password (select "Mail" + your device).
4. Add to `.env`:

```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=your.email@gmail.com
```

> ⚠️ Gmail has a daily send limit (~500/day for regular accounts). For higher volume use Resend.

### Option B: Resend (recommended for production)

Free tier: **3,000 emails/month**, **100/day**. No credit card needed.

1. Sign up at [resend.com](https://resend.com).
2. Verify your sending domain (or use the `onboarding@resend.dev` sandbox for testing).
3. Create an API key.
4. Add to `.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

---

## Docker Deployment

### 1. Build production image

```bash
# Generate lockfile first if you haven't
pnpm install
```

### 2. Create production `.env`

```bash
cp .env.example .env
# Fill in all required values
```

### 3. Run with Docker Compose

```bash
docker compose up -d
```

This starts:
- **api** on port `4000`
- **db** (MySQL 8) with a persistent volume

Check logs:

```bash
docker compose logs -f api
```

Health check:

```bash
curl http://localhost:4000/health
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `4000` | Server port |
| `DB_HOST` | No | `localhost` | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USER` | **Yes** | — | MySQL user |
| `DB_PASSWORD` | **Yes** | — | MySQL password |
| `DB_NAME` | **Yes** | — | MySQL database name |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 32 chars) |
| `EMAIL_PROVIDER` | No | `gmail` | `gmail` or `resend` |
| `EMAIL_FROM` | No | `noreply@example.com` | Sender address |
| `GMAIL_USER` | If gmail | — | Gmail address |
| `GMAIL_APP_PASSWORD` | If gmail | — | Gmail App Password |
| `RESEND_API_KEY` | If resend | — | Resend API key |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins (production) |

---

## Scripts

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Compile TypeScript to dist/
pnpm start        # Run compiled output (production)
pnpm type-check   # TypeScript type checking without emit
pnpm clean        # Remove dist/
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/accounts/register` | Public | Register (sends verification email) |
| POST | `/accounts/authenticate` | Public | Login |
| POST | `/accounts/verify-email` | Public | Verify email with token |
| POST | `/accounts/forgot-password` | Public | Send password reset email |
| POST | `/accounts/validate-reset-token` | Public | Validate reset token |
| POST | `/accounts/reset-password` | Public | Reset password |
| POST | `/accounts/refresh-token` | Public | Refresh JWT |
| POST | `/accounts/revoke-token` | JWT | Revoke refresh token |
| GET | `/accounts` | Admin | List all accounts |
| POST | `/accounts` | Admin | Create account |
| GET | `/accounts/:id` | JWT | Get account |
| PUT | `/accounts/:id` | JWT | Update account |
| DELETE | `/accounts/:id` | JWT | Delete account |
| GET | `/health` | Public | Health check |
| GET | `/api-docs` | Public | Swagger UI |

---

## Railway Deployment

### 1. Push your repo to GitHub

Make sure `pnpm-lock.yaml` is committed (run `pnpm install` locally first):

```bash
pnpm install          # generates pnpm-lock.yaml
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
git push
```

### 2. Create a new Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository — Railway auto-detects the `Dockerfile` via `railway.json`

### 3. Add the MySQL addon

In your Railway project dashboard:
- Click **+ New** → **Database** → **Add MySQL**
- Railway will provision a MySQL 8 instance and **automatically inject** these variables into your service:
  - `MYSQL_URL` (connection string — the app reads this first)
  - `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

You do **not** need to set `DB_HOST` or `DB_USER` — those are local-only fallbacks.

### 4. Set environment variables

In your service's **Variables** tab, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(run `openssl rand -hex 64`)* |
| `EMAIL_PROVIDER` | `gmail` or `resend` |
| `EMAIL_FROM` | your sender address |
| `GMAIL_USER` | your Gmail address *(if gmail)* |
| `GMAIL_APP_PASSWORD` | your App Password *(if gmail)* |
| `RESEND_API_KEY` | your Resend key *(if resend)* |
| `CORS_ORIGIN` | your frontend URL(s), comma-separated |

> `PORT` is injected automatically by Railway — do not set it manually.

### 5. Deploy

Railway triggers a build on every push to your default branch. Check the build logs in the **Deployments** tab.

The health check endpoint (`/health`) is configured in `railway.json` — Railway will mark the deployment healthy once it responds with 200.
