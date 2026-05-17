// Load environment variables FIRST — before any other imports that read process.env
import "dotenv/config";

import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./_helpers/config";
import { errorHandler } from "./_middleware/error-handler";
import { initialize } from "./_helpers/db";
import swagger from "./_helpers/swagger";
import accountsController from "./accounts/accounts.controller";

const app: Application = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: config.isProduction
      ? process.env.CORS_ORIGIN?.split(",") ?? true
      : true,
    credentials: true,
  })
);
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.env, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/accounts", accountsController);

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use("/api-docs", swagger);

// ─── Error Handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
initialize()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`\n🚀 Server running on http://localhost:${config.port}`);
      console.log(`📖 Swagger docs: http://localhost:${config.port}/api-docs`);
      console.log(`📧 Email provider: ${config.email.provider}`);
      console.log(`🌍 Environment: ${config.env}\n`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
