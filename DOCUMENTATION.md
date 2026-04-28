# Node.js, TypeScript & MySQL Boilerplate API

## Activity Description

This project is a fully functional authentication API built from scratch using Node.js, TypeScript, Express, Sequelize (MySQL), and JWTs. The API handles user registration with email verification, JWT-based authentication with refresh tokens, role-based access control (RBAC), forgot/reset password functionality, and account CRUD operations. It also includes Swagger API documentation served at the `/api-docs` route.

**Tools Usage:**
- Postman - for testing HTTP endpoints
- Visual Studio Code - for development
- MySQL - database server
- Ethereal Email - for testing email functionality

**Tech Stack:**
- Backend: Node.js, TypeScript, Express
- Database: MySQL via Sequelize ORM
- Authentication: JWT (JSON Web Tokens) + Refresh Tokens
- Hashing: Bcryptjs
- Validation: Joi
- Email: Nodemailer
- API Docs: Swagger UI Express

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Dependencies](#dependencies)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [Development Section](#development-section)
7. [API Endpoint Reference](#api-endpoint-reference)
8. [Testing Guide](#testing-guide)

---

## Prerequisites

Before setting up this project, ensure you have the following installed on your system:

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | v18.x or higher | JavaScript runtime |
| MySQL | v8.x or higher | Database server |
| npm | v9.x or higher | Package manager (comes with Node.js) |
| Git | Latest | Version control (optional) |

### MySQL Setup

1. Install MySQL Server on your machine
2. Start the MySQL service
3. Note down your root password (or leave blank if no password is set)
4. The application will automatically create the database on first run

### SMTP Email Setup (for testing)

The API sends verification and password reset emails. For testing, you can use a free Ethereal Email account:

1. Visit [https://ethereal.email/](https://ethereal.email/)
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials (host, port, user, pass)
4. Paste them into your `config.json` file under the `smtp` section

---

## Installation & Setup

### Step 1: Extract the Project

Extract the provided zip file to your desired location:

```bash
# If using the zip file
unzip node-typescript-api.zip -d node-typescript-api
cd node-typescript-api
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all production and development dependencies listed in `package.json`.

### Step 3: Configure the Database

Open `config.json` in the project root and update the database credentials to match your MySQL setup:

```json
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your-mysql-password",
    "database": "node_boilerplate_api"
  }
}
```

### Step 4: Configure SMTP (Email)

For email functionality to work, update the SMTP section in `config.json`. Using Ethereal Email for testing:

```json
{
  "smtp": {
    "host": "smtp.ethereal.email",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-ethereal-username@ethereal.email",
      "pass": "your-ethereal-password"
    }
  },
  "emailFrom": "noreply@example.com"
}
```

### Step 5: Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This command runs `tsc` which compiles all `.ts` files in `src/` to `.js` files in `dist/`.

### Step 6: Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run start:dev
```

On first run, the application will:
1. Connect to MySQL
2. Create the database if it doesn't exist
3. Create the `accounts` and `refreshTokens` tables
4. Start the Express server on port 4000

You should see:
```
Server running on http://localhost:4000
Swagger docs available at http://localhost:4000/api-docs
```

---

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web application framework |
| sequelize | ^6.35.2 | ORM for MySQL |
| mysql2 | ^3.6.5 | MySQL client |
| bcryptjs | ^2.4.3 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT token generation/verification |
| joi | ^17.11.0 | Request validation |
| nodemailer | ^6.9.7 | Email sending |
| cors | ^2.8.5 | Cross-origin resource sharing |
| cookie-parser | ^1.4.6 | Cookie parsing middleware |
| swagger-ui-express | ^5.0.0 | Swagger API documentation UI |
| yamljs | ^0.3.0 | YAML parser for Swagger |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.3 | TypeScript compiler |
| ts-node | ^10.9.2 | Run TypeScript directly (dev) |
| nodemon | ^3.0.2 | Auto-restart server on changes |
| @types/* | Various | TypeScript type definitions |

---

## Project Structure

```
node-typescript-api/
|- config.json                    # Database credentials, JWT secret, SMTP settings
|- tsconfig.json                  # TypeScript configuration
|- package.json                   # Dependencies and scripts
|- swagger.yaml                   # OpenAPI specification
|
|- src/                           # Source code
|   |- server.ts                  # Entry point - Express app setup
|
|   |- _helpers/                  # Utility modules
|   |   |- db.ts                  # MySQL + Sequelize connection
|   |   |- role.ts               # Role enum (Admin | User)
|   |   |- send-email.ts         # Nodemailer wrapper
|   |   \- swagger.ts           # Swagger UI route handler
|
|   |- _middleware/               # Express middleware
|   |   |- authorize.ts          # JWT verification + role enforcement
|   |   |- error-handler.ts      # Global error handler
|   |   \- validate-request.ts  # Joi validation wrapper
|
|   \- accounts/                  # Accounts module
|       |- account.model.ts      # Sequelize Account model
|       |- refresh-token.model.ts# Sequelize RefreshToken model
|       |- account.service.ts    # Business logic (auth, CRUD)
|       \- accounts.controller.ts# Route definitions
|
\- dist/                          # Compiled JavaScript output
```

---

## Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": "./src",
    "paths": {
      "_helpers/*": ["_helpers/*"],
      "_middleware/*": ["_middleware/*"],
      "accounts/*": ["accounts/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings:**
- `target: ES2020` - Modern JavaScript output
- `module: commonjs` - Node.js module system
- `outDir: ./dist` - Compiled output directory
- `rootDir: ./src` - Source directory
- `strict: true` - Strict type checking enabled
- `resolveJsonModule: true` - Allow importing JSON files
- `paths` - Module path aliases for clean imports

### package.json scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "start:dev": "nodemon --exec ts-node src/server.ts"
  }
}
```

| Script | Description |
|--------|-------------|
| `npm run build` | Compiles TypeScript to JavaScript in `dist/` |
| `npm start` | Runs the compiled server from `dist/server.js` |
| `npm run start:dev` | Runs in development mode with auto-reload |

### config.json

```json
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "node_boilerplate_api"
  },
  "jwtSecret": "change-this-in-production-123!",
  "smtp": {
    "host": "smtp.ethereal.email",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "",
      "pass": ""
    }
  },
  "emailFrom": "noreply@example.com"
}
```

**Important:** Change the `jwtSecret` in production to a strong, random string. The JWT secret is used to sign and verify authentication tokens.

---

## Development Section

### _helpers SECTION

#### src/_helpers/db.ts

The database helper connects to MySQL using Sequelize and the MySQL2 client. It exports an object containing all database model objects in the application (Account and RefreshToken). It provides a single point of access to the entire database.

**The `initialize()` function performs the following actions on API startup:**
1. Connects to the MySQL server using mysql2 and creates the database if it doesn't exist
2. Connects to the database with the Sequelize ORM
3. Initializes the Account and RefreshToken models and attaches them to the exported db object
4. Defines the one-to-many relationship between accounts and refresh tokens (with CASCADE delete)
5. Automatically creates tables in MySQL if they don't exist via `sequelize.sync({ alter: true })`

The MySQL database wrapper uses dynamic imports to load models, which ensures proper initialization order.

#### src/_helpers/role.ts

The role object defines all the roles in the application. It is used like an enum to avoid passing roles around as strings. Instead of `'Admin'` and `'User'`, we use `Role.Admin` and `Role.User`.

```typescript
export enum Role {
  Admin = "Admin",
  User = "User"
}
```

#### src/_helpers/send-email.ts

The send email helper is a lightweight wrapper around the Nodemailer module to simplify sending emails from anywhere in the application. It is used by the account service to send account verification and password reset emails.

It reads SMTP configuration from `config.json` and sends emails using the configured transporter.

#### src/_helpers/swagger.ts

The Swagger docs route handler uses the Swagger UI Express module to serve auto-generated Swagger UI documentation based on the `swagger.yaml` file. The route handler is bound to the `/api-docs` path in the main `server.ts` file.

### _middleware SECTION

#### src/_middleware/authorize.ts

The authorize middleware can be added to any route to restrict access to authenticated users with specified roles. If the roles parameter is omitted (i.e., `authorize()`), the route will be accessible to all authenticated users regardless of role.

The authorize function returns an array containing two middleware functions:

1. **JWT Authentication:** Validates the JWT access token in the `Authorization` header. On successful authentication, a user object is attached to the `req` object containing the user id, role, and email.

2. **Role Authorization:** Checks that the authenticated account still exists and is authorized to access the requested route based on its role. It also attaches the `ownsToken` helper method to `req.user`.

If either authentication or authorization fails, a 401 Unauthorized or 403 Forbidden response is returned.

**Usage:**
```typescript
router.get("/", authorize([Role.Admin]), getAll);     // Admin only
router.get("/:id", authorize(), getById);              // Any authenticated user
```

#### src/_middleware/error-handler.ts

The global error handler catches all errors and removes the need for duplicated error handling code throughout the application. It is configured as middleware in the main `server.ts` file.

By convention:
- Errors of type `'string'` are treated as custom application-specific errors
- If a custom error ends with `'not found'`, a 404 response is returned
- Otherwise, a standard 400 response is returned
- JWT authentication errors return 401
- All other errors return 500

This simplifies throwing custom errors since only a string needs to be thrown (e.g., `throw "Invalid token"`).

#### src/_middleware/validate-request.ts

The validate request middleware function validates the body of a request against a Joi schema object. It is used by schema middleware functions in controllers to validate the request against the schema for a specific route.

If validation succeeds, the request continues to the next middleware function. Otherwise, an error is returned with details of why validation failed.

### accounts SECTION

#### src/accounts/account.model.ts

The account model uses Sequelize to define the schema for the accounts table in the MySQL database. The exported Sequelize model object gives full access to perform CRUD operations on accounts.

**Key features:**
- Fields with type `DataTypes.VIRTUAL` (like `isVerified`) are convenience properties not persisted in the database
- `defaultScope` excludes the password hash from query results by default
- `withHash` scope can be used to include the password hash when needed (e.g., during authentication)

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing primary key |
| email | STRING | Unique email address |
| passwordHash | STRING | Bcrypt hashed password |
| title | STRING | Title (Mr, Mrs, etc.) |
| firstName | STRING | First name |
| lastName | STRING | Last name |
| acceptTerms | BOOLEAN | Terms acceptance |
| role | STRING | Admin or User |
| verificationToken | STRING | Email verification token |
| verified | DATE | Verification timestamp |
| resetToken | STRING | Password reset token |
| resetTokenExpires | DATE | Reset token expiry |
| created | DATE | Creation timestamp |
| updated | DATE | Last update timestamp |

#### src/accounts/refresh-token.model.ts

The refresh token model defines the schema for the refreshTokens table. Each account can have multiple refresh tokens (one-to-many relationship).

**Key features:**
- `isExpired` virtual field checks if the current date is past the expiry
- `isActive` virtual field checks if the token is neither revoked nor expired
- The `replacedByToken` field creates an audit trail when tokens are rotated

#### src/accounts/account.service.ts

The account service contains the core business logic for the entire application. It encapsulates all interaction with the Sequelize models and exposes a simple set of methods used by the accounts controller.

**Service Methods:**

| Method | Description |
|--------|-------------|
| `authenticate` | Verifies credentials, returns JWT + refresh token |
| `refreshToken` | Generates new JWT using refresh token (with rotation) |
| `revokeToken` | Invalidates a refresh token |
| `register` | Creates new account, sends verification email |
| `verifyEmail` | Verifies account using token from email |
| `forgotPassword` | Sends password reset email |
| `validateResetToken` | Checks if reset token is valid |
| `resetPassword` | Resets password using valid token |
| `getAll` | Returns all accounts (admin) |
| `getById` | Returns single account by ID |
| `create` | Creates account directly (admin) |
| `update` | Updates account |
| `delete` | Deletes account |

**JWT Authentication Flow:**
1. On successful authentication, a short-lived JWT access token (15 minutes) and a long-lived refresh token (7 days in HTTP Only cookie) are returned
2. The JWT is used for accessing secure routes via the `Authorization: Bearer <token>` header
3. When the JWT expires, the refresh token is used to generate a new one via `/accounts/refresh-token`

**Refresh Token Rotation:**
Each time a refresh token is used to generate a new JWT, the old refresh token is revoked and replaced by a new one. This increases security by reducing the lifetime of refresh tokens. The new token is saved in the `replacedByToken` property of the revoked token to create an audit trail.

#### src/accounts/accounts.controller.ts

The accounts controller defines all `/accounts` routes for the API. Route definitions are grouped at the top of the file and implementation functions are below.

**Route Security:**
- Routes that require authorization include `authorize()` with optional role restriction
- Routes that require validation include a schema middleware function using Joi
- Regular users can only access/modify their own account
- Admin users have full CRUD access to all accounts

**Custom Authorization:**
The `getById`, `update`, and `_delete` routes include an extra check to prevent non-admin users from accessing accounts other than their own. Regular users (`Role.User`) have access to their own account only, while admin accounts (`Role.Admin`) have full access.

### server.ts

The main entry point that initializes the Express application and hooks up all routes and middleware.

**Setup flow:**
1. Create Express app
2. Add body parsing middleware (JSON, URL-encoded)
3. Add CORS and cookie parser middleware
4. Register the `/accounts` route
5. Register the `/api-docs` Swagger route
6. Add global error handler (must be last)
7. Initialize database connection
8. Start listening on port 4000

---

## API Endpoint Reference

### Authentication Routes (Public - no token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/authenticate` | Login - returns JWT token + refresh token cookie |
| POST | `/accounts/register` | Self-register a new account |
| POST | `/accounts/verify-email` | Verify email with token from email |
| POST | `/accounts/forgot-password` | Request password reset email |
| POST | `/accounts/validate-reset-token` | Check if reset token is valid |
| POST | `/accounts/reset-password` | Reset password with token |

### Token Management (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/refresh-token` | Get new JWT using refresh token |
| POST | `/accounts/revoke-token` | Revoke a refresh token |

### Account CRUD (Requires Bearer Token)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/accounts` | Admin only | Get all accounts |
| POST | `/accounts` | Admin only | Create new account |
| GET | `/accounts/:id` | Any auth user | Get account by ID (own or any for admin) |
| PUT | `/accounts/:id` | Any auth user | Update account (own or any for admin) |
| DELETE | `/accounts/:id` | Any auth user | Delete account (own or any for admin) |

### API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api-docs` | Swagger UI interactive documentation |

---

## Testing Guide

### 1. Register a New Account

**POST** `http://localhost:4000/accounts/register`

```json
{
  "title": "Mr",
  "firstName": "Jason",
  "lastName": "Watmore",
  "email": "jason@example.com",
  "password": "pass123",
  "confirmPassword": "pass123",
  "acceptTerms": true
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Registration successful, please check your email for verification instructions"
}
```

> **Note:** The first account registered is automatically assigned the **Admin** role. Subsequent accounts are assigned the **User** role.

### 2. Verify Email

Check your Ethereal Email inbox for the verification email, then send the token:

**POST** `http://localhost:4000/accounts/verify-email`

```json
{
  "token": "the-verification-token-from-email"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Verification successful, you can now login"
}
```

### 3. Authenticate (Login)

**POST** `http://localhost:4000/accounts/authenticate`

```json
{
  "email": "jason@example.com",
  "password": "pass123"
}
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "email": "jason@example.com",
  "title": "Mr",
  "firstName": "Jason",
  "lastName": "Watmore",
  "role": "Admin",
  "created": "2026-04-21T12:00:00.000Z",
  "isVerified": true,
  "jwtToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

A `refreshToken` cookie is also set in the response.

### 4. Get All Accounts (Admin Only)

**GET** `http://localhost:4000/accounts`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "jason@example.com",
    "title": "Mr",
    "firstName": "Jason",
    "lastName": "Watmore",
    "role": "Admin",
    "created": "2026-04-21T12:00:00.000Z",
    "isVerified": true
  }
]
```

### 5. Refresh Token

**POST** `http://localhost:4000/accounts/refresh-token`

Send with the `refreshToken` cookie from the authenticate step (Postman will handle this automatically if cookies are enabled).

**Expected Response (200 OK):** A new JWT token and a new refresh token cookie.

### 6. Forgot Password

**POST** `http://localhost:4000/accounts/forgot-password`

```json
{
  "email": "jason@example.com"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Please check your email for password reset instructions"
}
```

### 7. Reset Password

**POST** `http://localhost:4000/accounts/reset-password`

```json
{
  "token": "reset-token-from-email",
  "password": "newPass123",
  "confirmPassword": "newPass123"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Password reset successful, you can now login"
}
```

### 8. Revoke Token

**POST** `http://localhost:4000/accounts/revoke-token`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Expected Response (200 OK):**
```json
{
  "message": "Token revoked"
}
```

### Using Swagger UI

For interactive testing, open your browser and navigate to:

```
http://localhost:4000/api-docs
```

This provides a clickable interface to explore and test all API endpoints. You can paste your JWT token in the "Authorize" button at the top to test protected routes.

### Using cURL (Alternative to Postman)

**Register:**
```bash
curl -X POST http://localhost:4000/accounts/register \
  -H "Content-Type: application/json" \
  -d '{"title":"Mr","firstName":"Test","lastName":"User","email":"test@example.com","password":"password123","confirmPassword":"password123","acceptTerms":true}'
```

**Authenticate:**
```bash
curl -X POST http://localhost:4000/accounts/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get All Accounts (Admin):**
```bash
curl -X GET http://localhost:4000/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Authentication Architecture

### JWT Access Token
- **Expiry:** 15 minutes
- **Usage:** Sent in `Authorization: Bearer <token>` header
- **Contains:** User ID, role, and email

### Refresh Token
- **Expiry:** 7 days
- **Storage:** HTTP Only cookie (not accessible by JavaScript, prevents XSS)
- **Usage:** Sent automatically via cookie to `/accounts/refresh-token`
- **Rotation:** Old token is revoked and replaced with a new one on each use
- **Revocation:** Tokens can be explicitly revoked for logout

### Role-Based Access Control
- **Admin:** Full access to all routes and all accounts
- **User:** Can only access/modify their own account
- **First registered user:** Automatically becomes Admin
- **Subsequent users:** Assigned User role by default

### Security Features
- Passwords hashed with bcrypt (10 salt rounds)
- HTTP Only cookies for refresh tokens (XSS protection)
- Refresh token rotation (reduces token lifetime)
- JWT tokens expire after 15 minutes
- Email verification required before login
- Input validation on all routes using Joi
- Global error handling to prevent information leakage

---

## Troubleshooting

### Common Issues

**1. "Cannot connect to MySQL"**
- Ensure MySQL service is running
- Check database credentials in `config.json`
- Verify the port (default is 3306)

**2. "Email not sending"**
- Check SMTP credentials in `config.json`
- Use Ethereal Email for testing
- Check console for error messages

**3. "Unauthorized" errors**
- Ensure the JWT token is included in the `Authorization: Bearer <token>` header
- Check that the token hasn't expired (15 minutes)
- Verify the account is verified (check `isVerified` field)

**4. "Forbidden" errors**
- The route may require Admin role
- Regular users can only access their own account resources

**5. Build errors**
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is properly configured
- Ensure Node.js version is 18.x or higher

---

*This project was built following the tutorial "Building a Node.js, TypeScript & MySQL Boilerplate API" with documentation style referencing Khylle P. Villasurda's Lab Activity 5.*
