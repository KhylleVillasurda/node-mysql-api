import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./_middleware/error-handler";
import { initialize } from "./_helpers/db";
import swagger from "./_helpers/swagger";
import accountsController from "./accounts/accounts.controller";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// API Routes
app.use("/accounts", accountsController);

// Swagger API Docs
app.use("/api-docs", swagger);

// Global Error Handler (must be last)
app.use(errorHandler);

// ─── Server Startup ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
