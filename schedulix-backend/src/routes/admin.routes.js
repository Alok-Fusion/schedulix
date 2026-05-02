import express from "express";
import {
  getAnalytics,
  getAnalyticsGraphs,
  getStats,
  listUsers,
  toggleUser
} from "../controllers/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect, requireRoles("admin"));

router.get("/stats", getStats);
router.get("/analytics", getAnalytics);
router.get("/analytics/graphs", getAnalyticsGraphs);
router.get("/users", listUsers);
router.patch("/users/:id/toggle", toggleUser);

export default router;
