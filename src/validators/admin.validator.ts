import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "VIEWER", "USER"]),
}).refine(
  (data) => data.email || data.phone || data.username,
  { message: "At least one of email, phone, or username is required" }
);

export const updateUserRoleSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "VIEWER", "USER"]),
});
