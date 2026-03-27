import { Response } from "express";
import prisma from "../prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, sendCreated, sendMessage, sendPaginated } from "../utils/response";
import { sendCredentialsEmail } from "../utils/mailer";
import { parsePagination } from "../utils/pagination";

/**
 * Create a new user account (SUPER_ADMIN only)
 * Generates a random password and sends credentials via email
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, phone, username, role, password } = req.body;

    // Check for existing account by email or username
    if (email) {
      const existingEmail = await prisma.account.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return sendError(res, "Email already exists", 400);
      }
    }

    const accountUsername = username || email;
    if (!accountUsername) {
      return sendError(res, "Username or email is required", 400);
    }

    const existingUsername = await prisma.account.findUnique({
      where: { username: accountUsername },
    });
    if (existingUsername) {
      return sendError(res, "Username already exists", 400);
    }

    // Use provided password or generate random password
    const rawPassword = password || crypto.randomBytes(8).toString("hex"); // 16-char password fallback
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const account = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.account.create({
        data: {
          publicId: crypto.randomUUID(),
          email: email || `${accountUsername}@placeholder.local`,
          username: accountUsername,
          status: "ACTIVE",
          isEmailVerified: !!email,
          credential: {
            create: {
              passwordHash: hashedPassword,
            },
          },
          profile: {
            create: {
              firstName,
              lastName,
              phone: phone || null,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // Assign the specified role
      const targetRole = await tx.role.findUnique({
        where: { name: role },
      });

      if (!targetRole) {
        throw new Error(`Role ${role} not found`);
      }

      await tx.accountRole.create({
        data: {
          accountPublicId: newAccount.publicId,
          roleId: targetRole.id,
        },
      });

      // Audit log
      await tx.authAuditLog.create({
        data: {
          accountPublicId: newAccount.publicId,
          action: "SIGNUP",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] as string,
        },
      });

      return newAccount;
    });

    // Send credentials via email if email is provided
    if (email) {
      await sendCredentialsEmail(email, accountUsername, rawPassword);
    }

    return sendCreated(res, {
      publicId: account.publicId,
      email: account.email,
      username: account.username,
      role,
      firstName,
      lastName,
      ...(email ? {} : { temporaryPassword: rawPassword }),
    }, "User created successfully");
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return sendError(res, "Failed to create user");
  }
};

/**
 * List all users with their roles (SUPER_ADMIN only)
 */
export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);

    const [users, total] = await Promise.all([
      prisma.account.findMany({
        where: { status: { not: "DELETED" } },
        include: {
          profile: true,
          roles: {
            include: { role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.account.count({
        where: { status: { not: "DELETED" } },
      }),
    ]);

    const formatted = users.map((u) => ({
      publicId: u.publicId,
      email: u.email,
      username: u.username,
      status: u.status,
      isEmailVerified: u.isEmailVerified,
      createdAt: u.createdAt,
      profile: u.profile
        ? {
            firstName: u.profile.firstName,
            lastName: u.profile.lastName,
            phone: u.profile.phone,
            profileImage: u.profile.profileImage,
          }
        : null,
      roles: u.roles.map((r) => r.role.name),
    }));

    return sendPaginated(res, formatted, total, page, pageSize);
  } catch (error) {
    console.error("LIST USERS ERROR:", error);
    return sendError(res, "Failed to list users");
  }
};

/**
 * Get user by publicId (SUPER_ADMIN only)
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.params;

    const user = await prisma.account.findUnique({
      where: { publicId },
      include: {
        profile: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        providers: { select: { provider: true } },
      },
    });

    if (!user || user.status === "DELETED") {
      return sendError(res, "User not found", 404);
    }

    const formatted = {
      publicId: user.publicId,
      email: user.email,
      username: user.username,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            profileImage: user.profile.profileImage,
            dateOfBirth: user.profile.dateOfBirth,
            gender: user.profile.gender,
          }
        : null,
      roles: user.roles.map((r) => r.role.name),
      permissions: Array.from(
        new Set(
          user.roles.flatMap((r) =>
            r.role.permissions.map((p) => p.permission.code)
          )
        )
      ),
      providers: user.providers.map((p) => p.provider),
    };

    return sendSuccess(res, formatted, "User retrieved successfully");
  } catch (error) {
    console.error("GET USER BY ID ERROR:", error);
    return sendError(res, "Failed to get user");
  }
};

/**
 * Update a user's role (SUPER_ADMIN only)
 * Cannot change a SUPER_ADMIN's role
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.params;
    const { role: newRoleName } = req.body;

    const user = await prisma.account.findUnique({
      where: { publicId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || user.status === "DELETED") {
      return sendError(res, "User not found", 404);
    }

    // Prevent changing SUPER_ADMIN role
    const isSuperAdmin = user.roles.some((r) => r.role.name === "SUPER_ADMIN");
    if (isSuperAdmin) {
      return sendError(res, "Cannot change SUPER_ADMIN role", 403);
    }

    // Prevent changing own role
    if (publicId === req.publicId) {
      return sendError(res, "Cannot change your own role", 400);
    }

    const newRole = await prisma.role.findUnique({
      where: { name: newRoleName },
    });

    if (!newRole) {
      return sendError(res, "Role not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      // Remove all current roles
      await tx.accountRole.deleteMany({
        where: { accountPublicId: publicId },
      });

      // Assign the new role
      await tx.accountRole.create({
        data: {
          accountPublicId: publicId,
          roleId: newRole.id,
        },
      });

      // Audit log
      await tx.activityAuditLog.create({
        data: {
          accountPublicId: req.publicId,
          action: "UPDATE",
          entityType: "USER",
          entityId: publicId,
          oldData: { roles: user.roles.map((r) => r.role.name) },
          newData: { roles: [newRoleName] },
        },
      });
    });

    return sendSuccess(res, { publicId, role: newRoleName }, "Role updated successfully");
  } catch (error) {
    console.error("UPDATE USER ROLE ERROR:", error);
    return sendError(res, "Failed to update user role");
  }
};

/**
 * Soft-delete a user account (SUPER_ADMIN only)
 * Cannot delete SUPER_ADMIN accounts
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.params;

    const user = await prisma.account.findUnique({
      where: { publicId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || user.status === "DELETED") {
      return sendError(res, "User not found", 404);
    }

    // Prevent deleting SUPER_ADMIN
    const isSuperAdmin = user.roles.some((r) => r.role.name === "SUPER_ADMIN");
    if (isSuperAdmin) {
      return sendError(res, "Cannot delete SUPER_ADMIN account", 403);
    }

    // Prevent self-deletion via admin route
    if (publicId === req.publicId) {
      return sendError(res, "Cannot delete your own account", 400);
    }

    await prisma.account.update({
      where: { publicId },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    await prisma.authAuditLog.create({
      data: {
        accountPublicId: publicId,
        action: "ACCOUNT_DELETED",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string,
      },
    });

    return sendMessage(res, "User deleted successfully");
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return sendError(res, "Failed to delete user");
  }
};
