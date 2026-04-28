# Gemini Context: node-typescript-api

This project is a boilerplate API built with Node.js, TypeScript, and MySQL, featuring user registration, JWT-based authentication with refresh tokens, role-based access control (RBAC), and email verification.

## Project Overview

*   **Main Technologies:** Node.js, TypeScript, Express, Sequelize (ORM), MySQL, JWT, Joi (validation), Nodemailer, Swagger.
*   **Architecture:**
    *   **Entry Point:** `src/server.ts` - Initializes Express, middleware, routes, and database.
    *   **Database:** `src/_helpers/db.ts` - Uses Sequelize to connect to MySQL and manage models.
    *   **Models:** `src/accounts/account.model.ts` and `src/accounts/refresh-token.model.ts`.
    *   **Controllers:** `src/accounts/accounts.controller.ts` - Handles HTTP requests and routing.
    *   **Services:** `src/accounts/account.service.ts` - Contains core business logic (auth, CRUD, email).
    *   **Middleware:** `src/_middleware/` includes authorization, global error handling, and request validation.

## Building and Running

*   **Build:** `npm run build` (runs `tsc`)
*   **Start (Production):** `npm start` (runs `node dist/server.js`)
*   **Start (Development):** `npm run start:dev` (runs `nodemon --exec ts-node src/server.ts`)
*   **Configuration:** Update `config.json` for database, JWT, and SMTP settings.

## Development Conventions

*   **TypeScript:** Strictly typed with `strict: true` in `tsconfig.json`.
*   **Authentication:**
    *   Short-lived JWT access tokens (15 minutes).
    *   Long-lived refresh tokens (7 days) stored in HTTP-only cookies.
    *   **Refresh Token Rotation:** Every time a refresh token is used, it is revoked and replaced with a new one.
*   **Authorization:**
    *   First registered user is automatically assigned the `Admin` role.
    *   Subsequent users default to the `User` role.
    *   Use the `authorize()` middleware to protect routes (e.g., `authorize([Role.Admin])`).
*   **Error Handling:**
    *   Global error handler in `src/_middleware/error-handler.ts`.
    *   Throw string errors (e.g., `throw "Error message"`) for custom application errors (mapped to HTTP 400).
*   **Validation:**
    *   Request body validation using Joi schemas in controllers, applied via `validateRequest` middleware.
*   **Database Migrations:** Sequelize uses `sequelize.sync({ alter: true })` on startup to automatically update the schema.
