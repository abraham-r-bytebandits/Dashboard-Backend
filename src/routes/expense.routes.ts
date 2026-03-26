import { Router } from "express";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  markExpenseAsPaid,
} from "../controllers/expense.controller";
import { authMiddleware, authorize } from "../middlewares/auth.middleware";
import { validate } from "../utils/validate.middleware";
import { createExpenseSchema, updateExpenseSchema } from "../validators/expense.validator";

const router = Router();

router.post("/", authMiddleware, authorize(["ADMIN"]), validate(createExpenseSchema), createExpense);
router.get("/", authMiddleware, getExpenses);
router.get("/:publicId", authMiddleware, getExpenseById);
router.put("/:publicId", authMiddleware, authorize(["ADMIN"]), validate(updateExpenseSchema), updateExpense);
router.patch("/:publicId/pay", authMiddleware, authorize(["ADMIN"]), markExpenseAsPaid);
router.delete("/:publicId", authMiddleware, authorize(["ADMIN"]), deleteExpense);

export default router;
