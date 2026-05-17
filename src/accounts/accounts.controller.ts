import express, { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { validateRequest } from "../_middleware/validate-request";
import { authorize, AuthRequest } from "../_middleware/authorize";
import { Role } from "../_helpers/role";
import { accountService } from "./account.service";

const router = express.Router();

// ─── Public Routes ───────────────────────────────────────────────────────────
router.post("/authenticate", authenticateSchema, authenticate);
router.post("/register", registerSchema, register);
router.post("/verify-email", verifyEmailSchema, verifyEmail);
router.post("/forgot-password", forgotPasswordSchema, forgotPassword);
router.post("/validate-reset-token", validateResetTokenSchema, validateResetToken);
router.post("/reset-password", resetPasswordSchema, resetPassword);

// ─── Secure Routes ───────────────────────────────────────────────────────────
router.post("/refresh-token", refreshToken);
router.post("/revoke-token", authorize(), revokeTokenSchema, revokeToken);

// Admin-only: Get all accounts
router.get("/", authorize([Role.Admin]), getAll);

// Admin-only: Create account
router.post("/", authorize([Role.Admin]), createSchema, create);

// Get account by id (Admin can access any, User can access own)
router.get("/:id", authorize(), getById);

// Update account (Admin can update any, User can update own)
router.put("/:id", authorize(), updateSchema, update);

// Delete account (Admin can delete any, User can delete own)
router.delete("/:id", authorize(), _delete);

export default router;

// ─── Route Functions ─────────────────────────────────────────────────────────

function authenticateSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;
  const ipAddress = req.ip || "0.0.0.0";

  accountService
    .authenticate({ email, password, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function registerSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    acceptTerms: Joi.boolean().valid(true).required(),
  });
  validateRequest(req, next, schema);
}

function register(req: Request, res: Response, next: NextFunction): void {
  accountService
    .register(req.body, req)
    .then(() =>
      res.json({
        message:
          "Registration successful, please check your email for verification instructions",
      })
    )
    .catch(next);
}

function verifyEmailSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    token: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function verifyEmail(req: Request, res: Response, next: NextFunction): void {
  accountService
    .verifyEmail(req.body)
    .then(() =>
      res.json({
        message: "Verification successful, you can now login",
      })
    )
    .catch(next);
}

function forgotPasswordSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  validateRequest(req, next, schema);
}

function forgotPassword(req: Request, res: Response, next: NextFunction): void {
  accountService
    .forgotPassword(req.body, req)
    .then(() =>
      res.json({
        message: "Please check your email for password reset instructions",
      })
    )
    .catch(next);
}

function validateResetTokenSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    token: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function validateResetToken(req: Request, res: Response, next: NextFunction): void {
  accountService
    .validateResetToken(req.body)
    .then(() => res.json({ message: "Token is valid" }))
    .catch(next);
}

function resetPasswordSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  });
  validateRequest(req, next, schema);
}

function resetPassword(req: Request, res: Response, next: NextFunction): void {
  accountService
    .resetPassword(req.body)
    .then(() =>
      res.json({
        message: "Password reset successful, you can now login",
      })
    )
    .catch(next);
}

function refreshToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.refreshToken || req.body?.token;
  const ipAddress = req.ip || "0.0.0.0";

  if (!token) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  accountService
    .refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function revokeTokenSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    token: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}

function revokeToken(req: AuthRequest, res: Response, next: NextFunction): void {
  // Accept token from request body or cookie
  const token = req.body.token || req.cookies?.refreshToken;
  const ipAddress = req.ip || "0.0.0.0";

  if (!token) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  // Users can only revoke their own tokens, admins can revoke any
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  accountService
    .revokeToken({ token, ipAddress })
    .then(() => {
      // Also clear cookie if token came from cookie
      if (req.cookies?.refreshToken) {
        res.clearCookie("refreshToken");
      }
      res.json({ message: "Token revoked" });
    })
    .catch(next);
}

function getAll(_req: Request, res: Response, next: NextFunction): void {
  accountService
    .getAll()
    .then((accounts) => res.json(accounts))
    .catch(next);
}

function getById(req: AuthRequest, res: Response, next: NextFunction): void {
  // Users can get their own account, admins can get any
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.params.id !== req.user.id.toString() && req.user.role !== Role.Admin) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  accountService
    .getById(parseInt(req.params.id))
    .then((account) => res.json(account))
    .catch(next);
}

function createSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    role: Joi.string().valid(Role.Admin, Role.User).required(),
  });
  validateRequest(req, next, schema);
}

function create(req: Request, res: Response, next: NextFunction): void {
  accountService
    .create(req.body)
    .then((account) => res.json(account))
    .catch(next);
}

function updateSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    title: Joi.string().empty(""),
    firstName: Joi.string().empty(""),
    lastName: Joi.string().empty(""),
    email: Joi.string().email().empty(""),
    password: Joi.string().min(6).empty(""),
    confirmPassword: Joi.string().valid(Joi.ref("password")).empty(""),
    role: Joi.string().valid(Role.Admin, Role.User).empty(""),
  }).with("password", "confirmPassword");
  validateRequest(req, next, schema);
}

function update(req: AuthRequest, res: Response, next: NextFunction): void {
  // Users can update their own account (except role), admins can update any
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.params.id !== req.user.id.toString() && req.user.role !== Role.Admin) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  // Regular users cannot update role
  if (req.user.role !== Role.Admin && req.body.role) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  accountService
    .update(parseInt(req.params.id), req.body)
    .then((account) => res.json(account))
    .catch(next);
}

function _delete(req: AuthRequest, res: Response, next: NextFunction): void {
  // Users can delete their own account, admins can delete any
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.params.id !== req.user.id.toString() && req.user.role !== Role.Admin) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  accountService
    .delete(parseInt(req.params.id))
    .then(() => res.json({ message: "Account deleted successfully" }))
    .catch(next);
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function setTokenCookie(res: Response, token: string): void {
  // Create cookie with refresh token that expires in 7 days
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  res.cookie("refreshToken", token, cookieOptions);
}
