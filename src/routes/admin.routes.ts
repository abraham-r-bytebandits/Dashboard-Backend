import { Router } from "express";
import {
  createUser,
  listUsers,
  getUserById,
  updateUserRole,
  deleteUser,
} from "../controllers/admin.controller";
import { authMiddleware, authorize } from "../middlewares/auth.middleware";
import { validate } from "../utils/validate.middleware";
import { createUserSchema, updateUserRoleSchema } from "../validators/admin.validator";

const router = Router();

// All admin routes require SUPER_ADMIN
router.use(authMiddleware, authorize(["SUPER_ADMIN"]));

router.post("/users", validate(createUserSchema), createUser);
router.get("/users", listUsers);
router.get("/users/:publicId", getUserById);
router.patch("/users/:publicId/role", validate(updateUserRoleSchema), updateUserRole);
router.delete("/users/:publicId", deleteUser);

export default router;
