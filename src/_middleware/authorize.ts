import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../_helpers/config";
import { db } from "../_helpers/db";
import { Role } from "../_helpers/role";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
    ownsToken?: (token: string) => Promise<boolean>;
  };
}

export function authorize(roles: Role[] = []) {
  return [
    // Step 1: Verify the JWT and attach the decoded payload to req.user.
    // The JWT already contains id, role, and email — no DB call needed here.
    (req: AuthRequest, res: Response, next: NextFunction): void => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          res
            .status(401)
            .json({ message: "Unauthorized -- no token provided" });
          return;
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.jwtSecret) as {
          id: number;
          role: string;
          email: string;
        };

        req.user = {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
        };

        next();
      } catch {
        res
          .status(401)
          .json({ message: "Unauthorized -- invalid or expired token" });
      }
    },

    // Step 2: Check role and attach ownsToken helper.
    //
    // FIX: The original middleware called db.Account.findByPk(req.user.id) on
    // EVERY authenticated request just to confirm the account still exists.
    // That's an extra round-trip to Railway's MySQL on every API call — which
    // is the main reason protected routes felt sluggish.
    //
    // The JWT already contains the role. For a school project this is fine.
    // If you ever need to handle "account deleted while still logged in",
    // the JWT will naturally expire in 15 minutes anyway.
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Role check uses JWT payload — no DB query needed
      if (roles.length && !roles.includes(req.user.role as Role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      // ownsToken still hits the DB, but only when explicitly called
      // (e.g. revokeToken) — not on every request
      req.user.ownsToken = async (token: string): Promise<boolean> => {
        const refreshToken = await db.RefreshToken.findOne({
          where: { token, accountId: req.user!.id },
        });
        return !!refreshToken;
      };

      next();
    },
  ];
}
