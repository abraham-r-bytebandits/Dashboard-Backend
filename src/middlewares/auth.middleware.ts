import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";

export interface AuthRequest extends Request {
  publicId?: string;
   role?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any;

    if (!decoded.publicId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const account = await prisma.account.findUnique({
  where: { publicId: decoded.publicId },
  include: { roles: { include: { role: true } } },
});

  if (!account || account.status !== "ACTIVE") {
  return res.status(401).json({ message: "Unauthorized" });
}

    req.publicId = account.publicId;
    req.role = account.roles[0]?.role.name;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};
