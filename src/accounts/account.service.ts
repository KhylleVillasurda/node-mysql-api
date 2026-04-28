import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request } from "express";
import config from "../../config.json";
import { db } from "../_helpers/db";
import { Role } from "../_helpers/role";
import sendEmail from "../_helpers/send-email";

// ─── Exported Service ────────────────────────────────────────────────────────

export const accountService = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

// ─── DTOs ────────────────────────────────────────────────────────────────────

interface AuthenticateParams {
  email: string;
  password: string;
  ipAddress: string;
}

interface RegisterParams {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface CreateParams {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

interface UpdateParams {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: Role;
}

interface AuthResponse {
  id: number;
  email: string;
  title: string;
  firstName: string;
  lastName: string;
  role: string;
  created: Date | null;
  isVerified: boolean;
  jwtToken: string;
  refreshToken: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

async function authenticate({
  email,
  password,
  ipAddress,
}: AuthenticateParams): Promise<AuthResponse> {
  const account = await db.Account.scope("withHash").findOne({ where: { email } });

  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    throw "Email or password is incorrect";
  }

  if (!account.isVerified) {
    throw "Email not verified";
  }

  // Authentication successful - generate tokens
  const jwtToken = generateJwtToken(account);
  const refreshToken = await generateRefreshToken(account, ipAddress);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({
  token,
  ipAddress,
}: {
  token: string;
  ipAddress: string;
}): Promise<AuthResponse> {
  const refreshToken = await getRefreshToken(token);

  // Replace old refresh token with a new one (refresh token rotation)
  const account = await db.Account.findByPk(refreshToken.accountId);
  if (!account) throw "Invalid token";

  const newRefreshToken = await generateRefreshToken(account, ipAddress);
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();

  // Generate new jwt
  const jwtToken = generateJwtToken(account);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({
  token,
  ipAddress,
}: {
  token: string;
  ipAddress: string;
}): Promise<void> {
  const refreshToken = await getRefreshToken(token);

  // Revoke token and save
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params: RegisterParams, req: Request): Promise<void> {
  // Validate
  if (params.password !== params.confirmPassword) {
    throw "Password and confirm password do not match";
  }

  // Check if email is already registered
  const existingAccount = await db.Account.findOne({
    where: { email: params.email },
  });

  if (existingAccount) {
    throw `Email '${params.email}' is already registered`;
  }

  // Determine role: first account is Admin, rest are User
  const accountCount = await db.Account.count();
  const role = accountCount === 0 ? Role.Admin : Role.User;

  // Hash password
  const passwordHash = await bcrypt.hash(params.password, 10);

  // Create account
  const account = await db.Account.create({
    ...params,
    passwordHash,
    role,
    verificationToken: randomTokenString(),
  });

  // Send verification email
  await sendVerificationEmail(account, req.get("origin"));
}

async function verifyEmail({ token }: { token: string }): Promise<void> {
  const account = await db.Account.findOne({
    where: { verificationToken: token },
  });

  if (!account) throw "Verification failed";

  account.verified = new Date();
  account.verificationToken = null;
  await account.save();
}

async function forgotPassword({ email }: { email: string }, req: Request): Promise<void> {
  const account = await db.Account.findOne({ where: { email } });

  // Always return ok response whether email exists or not
  if (!account) return;

  // Create reset token that expires after 24 hours
  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  // Send email
  await sendPasswordResetEmail(account, req.get("origin"));
}

async function validateResetToken({ token }: { token: string }): Promise<void> {
  const account = await db.Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
  });

  if (!account) throw "Invalid token";
}

async function resetPassword({
  token,
  password,
  confirmPassword,
}: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  if (password !== confirmPassword) {
    throw "Password and confirm password do not match";
  }

  const account = await db.Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
  });

  if (!account) throw "Invalid token";

  // Update password and clear reset token
  account.passwordHash = await bcrypt.hash(password, 10);
  account.passwordReset = new Date();
  account.resetToken = null;
  account.resetTokenExpires = null;
  await account.save();
}

async function getAll(): Promise<any[]> {
  const accounts = await db.Account.findAll();
  return (accounts || []).map((x) => basicDetails(x));
}

async function getById(id: number): Promise<any> {
  const account = await getAccount(id);
  return basicDetails(account);
}

async function create(params: CreateParams): Promise<any> {
  // Validate
  if (params.password !== params.confirmPassword) {
    throw "Password and confirm password do not match";
  }

  const existingAccount = await db.Account.findOne({
    where: { email: params.email },
  });

  if (existingAccount) {
    throw `Email '${params.email}' is already registered`;
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  const account = await db.Account.create({
    ...params,
    passwordHash,
    acceptTerms: true,
    verified: new Date(), // Auto-verify accounts created by admin
  });

  return basicDetails(account);
}

async function update(id: number, params: UpdateParams): Promise<any> {
  const account = await getAccount(id);

  // Validate
  if (
    params.email &&
    params.email !== account.email &&
    (await db.Account.findOne({ where: { email: params.email } }))
  ) {
    throw `Email '${params.email}' is already registered`;
  }

  if (params.password) {
    if (params.password !== params.confirmPassword) {
      throw "Password and confirm password do not match";
    }
    params = { ...params, password: await bcrypt.hash(params.password, 10) };
  }

  // Copy params to account and save
  Object.assign(account, params);
  account.updated = new Date();
  await account.save();

  return basicDetails(account);
}

async function _delete(id: number): Promise<void> {
  const account = await getAccount(id);
  await account.destroy();
}

// ─── Helper Functions ────────────────────────────────────────────────────────

async function getAccount(id: number): Promise<any> {
  const account = await db.Account.findByPk(id);
  if (!account) throw "Account not found";
  return account;
}

async function getRefreshToken(token: string): Promise<any> {
  const refreshToken = await db.RefreshToken.findOne({
    where: { token },
    include: db.Account,
  });

  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

function generateJwtToken(account: any): string {
  // Create a JWT token containing the account id, role, and email
  return jwt.sign(
    { id: account.id, role: account.role, email: account.email },
    config.jwtSecret,
    { expiresIn: "15m" }
  );
}

async function generateRefreshToken(account: any, ipAddress: string): Promise<any> {
  // Create a refresh token that expires in 7 days
  return await db.RefreshToken.create({
    accountId: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created: new Date(),
    createdByIp: ipAddress,
  });
}

function randomTokenString(): string {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(account: any): any {
  if (!account) return null;
  const {
    id,
    email,
    title,
    firstName,
    lastName,
    role,
    created,
    updated,
    isVerified,
  } = account;
  return { id, email, title, firstName, lastName, role, created, updated, isVerified };
}

async function sendVerificationEmail(account: any, origin: string | undefined): Promise<void> {
  let message: string;

  if (origin) {
    const verifyUrl = `${origin}/accounts/verify-email?token=${account.verificationToken}`;
    message = `<p>Please click the below link to verify your email address:</p>
               <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to verify your email address with the <code>/accounts/verify-email</code> api route:</p>
               <p><code>${account.verificationToken}</code></p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Sign-up Verification API - Verify Email",
    html: `<h4>Verify Email</h4>
           <p>Thanks for registering!</p>
           ${message}`,
  });
}

async function sendPasswordResetEmail(account: any, origin: string | undefined): Promise<void> {
  let message: string;

  if (origin) {
    const resetUrl = `${origin}/accounts/reset-password?token=${account.resetToken}`;
    message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to reset your password with the <code>/accounts/reset-password</code> api route:</p>
               <p><code>${account.resetToken}</code></p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Sign-up Verification API - Reset Password",
    html: `<h4>Reset Password Email</h4>
           ${message}`,
  });
}
