import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorize =
  (allowedRoles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
