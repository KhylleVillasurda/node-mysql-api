import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request } from "express";
import { config } from "../_helpers/config";
import { db } from "../_helpers/db";
import { Role } from "../_helpers/role";
import { sendEmail } from "../_helpers/send-email";

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

async function authenticate({
  email,
  password,
  ipAddress,
}: AuthenticateParams): Promise<AuthResponse> {
  const account = await db.Account.scope("withHash").findOne({
    where: { email },
  });
  if (!account || !(await bcrypt.compare(password, account.passwordHash)))
    throw "Email or password is incorrect";
  if (!account.isVerified) throw "Email not verified";
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
  const account = await db.Account.findByPk(refreshToken.accountId);
  if (!account) throw "Invalid token";
  const newRefreshToken = await generateRefreshToken(account, ipAddress);
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
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
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params: RegisterParams, req: Request): Promise<void> {
  if (params.password !== params.confirmPassword)
    throw "Password and confirm password do not match";

  // FIX: Run the duplicate-email check and the count query in parallel.
  // The original code ran them sequentially (one then the other).
  // Promise.all fires both DB queries at the same time — saves ~1 round-trip.
  const [existingAccount, accountCount] = await Promise.all([
    db.Account.findOne({ where: { email: params.email } }),
    db.Account.count(),
  ]);

  if (existingAccount) throw `Email '${params.email}' is already registered`;

  const role = accountCount === 0 ? Role.Admin : Role.User;
  const passwordHash = await bcrypt.hash(params.password, 10);

  const account = await db.Account.create({
    ...params,
    passwordHash,
    role,
    verificationToken: randomTokenString(),
  });

  // FIX: Don't await the email — respond to the user immediately and let the
  // email send in the background. The original code awaited sendVerificationEmail,
  // which blocked the HTTP response for the entire Resend API round-trip
  // (~300-1500ms depending on Railway → Resend latency). Same problem existed
  // in forgotPassword below.
  const origin = resolveOrigin(req);
  sendVerificationEmail(account, origin).catch((err) =>
    console.error("[email] Failed to send verification email:", err),
  );
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

async function forgotPassword(
  { email }: { email: string },
  req: Request,
): Promise<void> {
  const account = await db.Account.findOne({ where: { email } });
  if (!account) return; // Always return ok — don't reveal if email exists

  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  // FIX: Fire-and-forget — same as register above
  const origin = resolveOrigin(req);
  sendPasswordResetEmail(account, origin).catch((err) =>
    console.error("[email] Failed to send reset email:", err),
  );
}

async function validateResetToken({ token }: { token: string }): Promise<void> {
  const account = await db.Account.findOne({
    where: { resetToken: token, resetTokenExpires: { [Op.gt]: new Date() } },
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
  if (password !== confirmPassword)
    throw "Password and confirm password do not match";
  const account = await db.Account.findOne({
    where: { resetToken: token, resetTokenExpires: { [Op.gt]: new Date() } },
  });
  if (!account) throw "Invalid token";
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
  return basicDetails(await getAccount(id));
}

async function create(params: CreateParams): Promise<any> {
  if (params.password !== params.confirmPassword)
    throw "Password and confirm password do not match";
  const existingAccount = await db.Account.findOne({
    where: { email: params.email },
  });
  if (existingAccount) throw `Email '${params.email}' is already registered`;
  const passwordHash = await bcrypt.hash(params.password, 10);
  const account = await db.Account.create({
    ...params,
    passwordHash,
    acceptTerms: true,
    verified: new Date(),
  });
  return basicDetails(account);
}

async function update(id: number, params: UpdateParams): Promise<any> {
  const account = await getAccount(id);
  if (
    params.email &&
    params.email !== account.email &&
    (await db.Account.findOne({ where: { email: params.email } }))
  ) {
    throw `Email '${params.email}' is already registered`;
  }
  if (params.password) {
    if (params.password !== params.confirmPassword)
      throw "Password and confirm password do not match";
    params = { ...params, password: await bcrypt.hash(params.password, 10) };
  }
  Object.assign(account, params);
  account.updated = new Date();
  await account.save();
  return basicDetails(account);
}

async function _delete(id: number): Promise<void> {
  await (await getAccount(id)).destroy();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  return jwt.sign(
    { id: account.id, role: account.role, email: account.email },
    config.jwtSecret,
    { expiresIn: "15m" },
  );
}

async function generateRefreshToken(
  account: any,
  ipAddress: string,
): Promise<any> {
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
  return {
    id,
    email,
    title,
    firstName,
    lastName,
    role,
    created,
    updated,
    isVerified,
  };
}

function resolveOrigin(req: Request): string {
  return (
    process.env.FRONTEND_URL || req.get("origin") || "http://localhost:4200"
  );
}

async function sendVerificationEmail(
  account: any,
  origin: string,
): Promise<void> {
  const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
  await sendEmail({
    to: account.email,
    subject: "Verify your email address",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Welcome, ${account.firstName}!</h2>
        <p>Thanks for registering. Please verify your email address to activate your account.</p>
        <p>
          <a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link: <code>${verifyUrl}</code></p>
        <p style="color:#888;font-size:12px;margin-top:32px">If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(
  account: any,
  origin: string,
): Promise<void> {
  const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
  await sendEmail({
    to: account.email,
    subject: "Reset your password",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset the password for your account.</p>
        <p>
          <a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy this link: <code>${resetUrl}</code></p>
        <p style="color:#888;font-size:12px;margin-top:32px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
