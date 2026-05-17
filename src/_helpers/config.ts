/**
 * Centralised runtime configuration.
 *
 * Database resolution order (first match wins):
 *   1. MYSQL_URL  — Railway MySQL addon (e.g. mysql://user:pass@host:port/db)
 *   2. MYSQLHOST / MYSQLUSER / … — Railway individual vars (same addon)
 *   3. DB_HOST / DB_USER / …    — your own custom vars / local dev
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ─── MySQL URL parser ─────────────────────────────────────────────────────────
// Supports Railway's MYSQL_URL: mysql://user:pass@host:port/dbname
interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  /** When true, db.ts must NOT attempt CREATE DATABASE (no root access). */
  managedExternally: boolean;
}

function resolveDatabase(): DbConfig {
  // Priority 1: connection URL (Railway addon)
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || "3306", 10),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        name: parsed.pathname.replace(/^\//, ""),
        managedExternally: true,
      };
    } catch {
      throw new Error(`Could not parse MYSQL_URL / DATABASE_URL: "${url}"`);
    }
  }

  // Priority 2: Railway individual env vars
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: parseInt(optional("MYSQLPORT", "3306"), 10),
      user: required("MYSQLUSER"),
      password: required("MYSQLPASSWORD"),
      name: required("MYSQLDATABASE"),
      managedExternally: true, // Railway manages the DB
    };
  }

  // Priority 3: custom / local dev vars
  return {
    host: optional("DB_HOST", "localhost"),
    port: parseInt(optional("DB_PORT", "3306"), 10),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    name: required("DB_NAME"),
    managedExternally: false,
  };
}

// ─── Email ────────────────────────────────────────────────────────────────────
type EmailProvider = "gmail" | "resend";

function emailProvider(): EmailProvider {
  const val = optional("EMAIL_PROVIDER", "gmail").toLowerCase();
  if (val !== "gmail" && val !== "resend") {
    throw new Error(`Invalid EMAIL_PROVIDER "${val}". Must be: gmail | resend`);
  }
  return val as EmailProvider;
}

// ─── Exported config ──────────────────────────────────────────────────────────
export const config = {
  env: optional("NODE_ENV", "development"),
  port: parseInt(optional("PORT", "4000"), 10),
  isProduction: optional("NODE_ENV", "development") === "production",

  database: resolveDatabase(),

  jwtSecret: required("JWT_SECRET"),

  email: {
    provider: emailProvider(),
    from: optional("EMAIL_FROM", "noreply@example.com"),
    gmail: {
      user: optional("GMAIL_USER", ""),
      appPassword: optional("GMAIL_APP_PASSWORD", ""),
    },
    resend: {
      apiKey: optional("RESEND_API_KEY", ""),
    },
  },
} as const;

export type Config = typeof config;
