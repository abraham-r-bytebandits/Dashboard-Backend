import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendCreated, sendError, sendMessage } from "../utils/response";
import multer from "multer";
import path from "path";
import fsExtra from "fs";

// Setup upload directory for attachments
const uploadDir = path.join(process.cwd(), "uploads/work-items");
if (!fsExtra.existsSync(uploadDir)) {
  fsExtra.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "attachment-" + uniqueSuffix + ext);
  },
});

export const uploadAttachmentMiddleware = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

/**
 * Check if the authenticated user is an administrator
 */
export const isUserAdmin = (req: AuthRequest): boolean => {
  if (!req.roles || req.roles.length === 0) return true; // Unauthenticated dev/fallback
  return req.roles.some((r) => r.toUpperCase() === "SUPER_ADMIN" || r.toUpperCase() === "ADMIN");
};

/**
 * Check if the user is an assigned collaborator or creator of the work item
 */
export const isUserAssignedOrCreator = (item: any, req: AuthRequest): boolean => {
  if (isUserAdmin(req)) return true;
  if (req.publicId && item.createdByPublicId === req.publicId) return true;
  if (!Array.isArray(item.assignees)) return false;
  return item.assignees.some((a: any) => {
    if (req.email && a.email && a.email.toLowerCase() === req.email.toLowerCase()) return true;
    if (req.publicId && (a.id === req.publicId || a.accountPublicId === req.publicId)) return true;
    return false;
  });
};

/**
 * Helper to format a work item to match frontend interface
 * Supports data projection for external roles if needed
 */
export const formatWorkItem = (item: any, affiliation?: string) => {
  const isExternal = affiliation === "external";

  return {
    id: item.customId || item.publicId,
    publicId: isExternal ? undefined : item.publicId,
    title: item.title,
    description: item.description || "",
    priority: item.priority || "medium",
    status: item.status || "new",
    dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "",
    assignees: Array.isArray(item.assignees) ? item.assignees : [],
    milestone: {
      completed: item.milestoneCompleted ?? 0,
      total: item.milestoneTotal ?? 1,
    },
    attachmentsCount: item.attachmentsCount ?? (Array.isArray(item.attachments) ? item.attachments.length : 0),
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    commentsCount: item.commentsCount ?? 0,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
    createdByPublicId: isExternal ? undefined : item.createdByPublicId,
  };
};

/**
 * GET /api/work-items
 * Query params: status, priority, search, scope ('all' | 'assigned')
 * Enforces role-based visibility: regular users see assigned/created items by default unless scope=all
 */
export const getWorkItems = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, search, scope } = req.query;

    const where: any = {};
    if (status && typeof status === "string" && status !== "all") {
      where.status = status;
    }
    if (priority && typeof priority === "string" && priority !== "all") {
      where.priority = priority;
    }
    if (search && typeof search === "string" && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } },
      ];
    }

    const items = await prisma.workItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Check user role: if regular user and scope is not explicitly 'all', filter to assigned or created items
    const isAdmin = isUserAdmin(req);
    const shouldFilterToAssigned = !isAdmin && scope !== "all";

    const filteredItems = shouldFilterToAssigned
      ? items.filter((item) => isUserAssignedOrCreator(item, req))
      : items;

    const formatted = filteredItems.map((item) => formatWorkItem(item, req.affiliation));
    return sendSuccess(res, formatted);
  } catch (error) {
    console.error("GET WORK ITEMS ERROR:", error);
    return sendError(res, "Failed to fetch work items");
  }
};

/**
 * GET /api/work-items/:id
 */
export const getWorkItemById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!item) {
      return sendError(res, "Work item not found", 404);
    }

    return sendSuccess(res, formatWorkItem(item, req.affiliation));
  } catch (error) {
    console.error("GET WORK ITEM BY ID ERROR:", error);
    return sendError(res, "Failed to fetch work item");
  }
};

/**
 * POST /api/work-items
 * Accepts work assessment creation payload including attachments and assignees
 */
export const createWorkItem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      id,
      title,
      description,
      priority = "medium",
      status = "new",
      dueDate,
      milestone = { completed: 0, total: 1 },
      attachments = [],
      attachmentsCount,
      assignees = [],
      commentsCount = 0,
    } = req.body;

    const customId = id || ("work-" + Date.now());

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const count = attachmentsCount !== undefined ? attachmentsCount : (Array.isArray(attachments) ? attachments.length : 0);

    const item = await prisma.workItem.create({
      data: {
        customId,
        title,
        description: description || null,
        priority,
        status,
        dueDate: parsedDueDate,
        milestoneCompleted: Number(milestone?.completed) || 0,
        milestoneTotal: Number(milestone?.total) || 1,
        attachmentsCount: count,
        attachments: Array.isArray(attachments) ? attachments : [],
        assignees: Array.isArray(assignees) ? assignees : [],
        commentsCount: Number(commentsCount) || 0,
        createdByPublicId: req.publicId || null,
      },
    });

    if (req.publicId) {
      try {
        await prisma.activityAuditLog.create({
          data: {
            accountPublicId: req.publicId,
            action: "CREATE",
            entityType: "WORK_ITEM",
            entityId: item.publicId,
          },
        });
      } catch {
        // Non-blocking audit log
      }
    }

    return sendCreated(res, formatWorkItem(item, req.affiliation), "Work item created successfully");
  } catch (error) {
    console.error("CREATE WORK ITEM ERROR:", error);
    return sendError(res, "Failed to create work item");
  }
};

/**
 * PATCH /api/work-items/:id/milestone
 * Users can update milestone progress as completed in the view page
 * Enforces role-based access: allowed for assigned collaborators or admins
 */
export const updateWorkItemMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { completed, total } = req.body;

    const existing = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!existing) {
      return sendError(res, "Work item not found", 404);
    }

    if (!isUserAssignedOrCreator(existing, req)) {
      return sendError(res, "Only assigned team members or administrators can update milestone progress", 403);
    }

    const updateData: any = {
      milestoneCompleted: Math.max(0, Number(completed)),
    };
    if (total !== undefined && Number(total) >= 1) {
      updateData.milestoneTotal = Number(total);
    }

    const updated = await prisma.workItem.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (req.publicId) {
      try {
        await prisma.activityAuditLog.create({
          data: {
            accountPublicId: req.publicId,
            action: "UPDATE",
            entityType: "WORK_ITEM",
            entityId: existing.publicId,
            oldData: { milestoneCompleted: existing.milestoneCompleted, milestoneTotal: existing.milestoneTotal },
            newData: updateData,
          },
        });
      } catch {}
    }

    return sendSuccess(res, formatWorkItem(updated, req.affiliation), "Milestone progress updated successfully");
  } catch (error) {
    console.error("UPDATE MILESTONE ERROR:", error);
    return sendError(res, "Failed to update milestone progress");
  }
};

/**
 * PATCH /api/work-items/:id/status
 * Status Board drag-and-drop or status selector
 * Allowed for assigned team members or admins
 */
export const updateWorkItemStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!existing) {
      return sendError(res, "Work item not found", 404);
    }

    if (!isUserAssignedOrCreator(existing, req)) {
      return sendError(res, "Only assigned team members or administrators can move assessment status", 403);
    }

    const updated = await prisma.workItem.update({
      where: { id: existing.id },
      data: { status },
    });

    if (req.publicId) {
      try {
        await prisma.activityAuditLog.create({
          data: {
            accountPublicId: req.publicId,
            action: "UPDATE",
            entityType: "WORK_ITEM",
            entityId: existing.publicId,
            oldData: { status: existing.status },
            newData: { status },
          },
        });
      } catch {}
    }

    return sendSuccess(res, formatWorkItem(updated, req.affiliation), "Status updated successfully");
  } catch (error) {
    console.error("UPDATE WORK ITEM STATUS ERROR:", error);
    return sendError(res, "Failed to update work item status");
  }
};

/**
 * PATCH /api/work-items/:id/priority
 * Impact Board drag-and-drop or priority selector
 * RBAC: Restricted to SUPER_ADMIN and ADMIN
 */
export const updateWorkItemPriority = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!isUserAdmin(req)) {
      return sendError(res, "Only administrators can calibrate assessment priority", 403);
    }

    const existing = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!existing) {
      return sendError(res, "Work item not found", 404);
    }

    const updated = await prisma.workItem.update({
      where: { id: existing.id },
      data: { priority },
    });

    if (req.publicId) {
      try {
        await prisma.activityAuditLog.create({
          data: {
            accountPublicId: req.publicId,
            action: "UPDATE",
            entityType: "WORK_ITEM",
            entityId: existing.publicId,
            oldData: { priority: existing.priority },
            newData: { priority },
          },
        });
      } catch {}
    }

    return sendSuccess(res, formatWorkItem(updated, req.affiliation), "Priority updated successfully");
  } catch (error) {
    console.error("UPDATE WORK ITEM PRIORITY ERROR:", error);
    return sendError(res, "Failed to update work item priority");
  }
};

/**
 * PATCH /api/work-items/:id
 * Full/partial update of work item
 */
export const updateWorkItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      milestone,
      attachments,
      attachmentsCount,
      assignees,
      commentsCount,
    } = req.body;

    const existing = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!existing) {
      return sendError(res, "Work item not found", 404);
    }

    if (!isUserAssignedOrCreator(existing, req)) {
      return sendError(res, "Only assigned team members or administrators can edit this assessment", 403);
    }

    // If changing priority, ensure user is admin
    if (priority !== undefined && priority !== existing.priority && !isUserAdmin(req)) {
      return sendError(res, "Only administrators can calibrate assessment priority", 403);
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined && isUserAdmin(req)) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (milestone?.completed !== undefined) updateData.milestoneCompleted = Number(milestone.completed);
    if (milestone?.total !== undefined) updateData.milestoneTotal = Number(milestone.total);
    if (attachments !== undefined) {
      updateData.attachments = Array.isArray(attachments) ? attachments : [];
      updateData.attachmentsCount = attachmentsCount !== undefined ? attachmentsCount : attachments.length;
    } else if (attachmentsCount !== undefined) {
      updateData.attachmentsCount = attachmentsCount;
    }
    if (assignees !== undefined && isUserAdmin(req)) {
      updateData.assignees = Array.isArray(assignees) ? assignees : [];
    }
    if (commentsCount !== undefined) updateData.commentsCount = Number(commentsCount);

    const updated = await prisma.workItem.update({
      where: { id: existing.id },
      data: updateData,
    });

    return sendSuccess(res, formatWorkItem(updated, req.affiliation), "Work item updated successfully");
  } catch (error) {
    console.error("UPDATE WORK ITEM ERROR:", error);
    return sendError(res, "Failed to update work item");
  }
};

/**
 * DELETE /api/work-items/:id
 * RBAC: Strictly restricted to SUPER_ADMIN and ADMIN
 */
export const deleteWorkItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUserAdmin(req)) {
      return sendError(res, "Only administrators can delete work assessments", 403);
    }

    const existing = await prisma.workItem.findFirst({
      where: {
        OR: [{ customId: id }, { publicId: id }],
      },
    });

    if (!existing) {
      return sendError(res, "Work item not found", 404);
    }

    await prisma.workItem.delete({
      where: { id: existing.id },
    });

    if (req.publicId) {
      try {
        await prisma.activityAuditLog.create({
          data: {
            accountPublicId: req.publicId,
            action: "DELETE",
            entityType: "WORK_ITEM",
            entityId: existing.publicId,
          },
        });
      } catch {}
    }

    return sendMessage(res, "Work item deleted successfully");
  } catch (error) {
    console.error("DELETE WORK ITEM ERROR:", error);
    return sendError(res, "Failed to delete work item");
  }
};

/**
 * POST /api/work-items/upload
 * Multer file upload endpoint returning WorkAttachment metadata
 */
export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file;

    if (!file && (!files || files.length === 0)) {
      return sendError(res, "No file uploaded", 400);
    }

    if (file) {
      const attachment = {
        id: "att-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: "/uploads/work-items/" + file.filename,
        uploadedAt: new Date().toISOString(),
      };
      return sendCreated(res, attachment, "File uploaded successfully");
    }

    if (files && files.length > 0) {
      const attachments = files.map((f) => ({
        id: "att-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
        url: "/uploads/work-items/" + f.filename,
        uploadedAt: new Date().toISOString(),
      }));
      return sendCreated(res, attachments, "Files uploaded successfully");
    }
  } catch (error) {
    console.error("UPLOAD ATTACHMENT ERROR:", error);
    return sendError(res, "Failed to upload file");
  }
};
