import { Router } from "express";
import {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
} from "../controllers/report.controller";
import { authMiddleware, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, authorize(["ADMIN"]), createReport);
router.get("/", authMiddleware, getReports);
router.get("/:publicId", authMiddleware, getReportById);
// Only ADMIN can update report status/file link via workers
router.patch("/:publicId/status", authMiddleware, authorize(["ADMIN"]), updateReportStatus);
router.delete("/:publicId", authMiddleware, authorize(["ADMIN"]), deleteReport);

export default router;
