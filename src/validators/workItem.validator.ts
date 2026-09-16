import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().optional().default(0),
  type: z.string().optional().default("application/octet-stream"),
  url: z.string(),
  uploadedAt: z.string().optional(),
});

export const assigneeSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  role: z.string().optional().default("Member"),
  affiliation: z.enum(["internal", "external"]).optional().default("internal"),
  email: z.string().optional().nullable(),
});

export const createWorkItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
  status: z.enum(["new", "todo", "clarifications", "under_analysis", "approval"]).optional().default("new"),
  dueDate: z.string().optional().nullable(),
  milestone: z.object({
    completed: z.number().optional().default(0),
    total: z.number().optional().default(1),
  }).optional(),
  attachmentsCount: z.number().optional(),
  attachments: z.array(attachmentSchema).optional(),
  assignees: z.array(assigneeSchema).optional(),
  commentsCount: z.number().optional(),
});

export const updateWorkItemStatusSchema = z.object({
  status: z.enum(["new", "todo", "clarifications", "under_analysis", "approval"]),
});

export const updateWorkItemPrioritySchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
});

export const updateWorkItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["new", "todo", "clarifications", "under_analysis", "approval"]).optional(),
  dueDate: z.string().optional().nullable(),
  milestone: z.object({
    completed: z.number().optional(),
    total: z.number().optional(),
  }).optional(),
  attachmentsCount: z.number().optional(),
  attachments: z.array(attachmentSchema).optional(),
  assignees: z.array(assigneeSchema).optional(),
  commentsCount: z.number().optional(),
});

export const updateWorkItemMilestoneSchema = z.object({
  completed: z.number().min(0, "Completed must be 0 or greater"),
  total: z.number().min(1, "Total must be at least 1").optional(),
});
