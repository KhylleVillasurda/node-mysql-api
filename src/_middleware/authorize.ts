import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config.json";
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
    // Authenticate JWT token
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          res.status(401).json({ message: "Unauthorized -- no token provided" });
          return;
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.jwtSecret) as {
          id: number;
          role: string;
          email: string;
        };

        // Attach user data to request
        req.user = {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
        };

        next();
      } catch {
        res.status(401).json({ message: "Unauthorized -- invalid or expired token" });
      }
    },

    // Authorize based on role
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Check if account still exists
      const account = await db.Account.findByPk(req.user.id);
      if (!account) {
        res.status(401).json({ message: "Unauthorized -- account no longer exists" });
        return;
      }

      // Check role authorization
      if (roles.length && !roles.includes(req.user.role as Role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      // Attach ownsToken helper
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
