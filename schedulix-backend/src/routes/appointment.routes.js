import express from "express";
import {
  createAppointment,
  getAppointmentById,
  getSchedule,
  getSharedAppointment,
  listAppointments,
  publishAppointment,
  updateAppointment,
  upsertSchedule
} from "../controllers/appointment.controller.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/share/:token", getSharedAppointment);
router.get("/", optionalAuth, listAppointments);
router.post("/", protect, requireRoles("organiser", "admin"), createAppointment);
router.put("/:id", protect, requireRoles("organiser", "admin"), updateAppointment);
router.get("/:id", optionalAuth, getAppointmentById);
router.patch(
  "/:id/publish",
  protect,
  requireRoles("organiser", "admin"),
  publishAppointment
);
router.get("/:id/schedule", optionalAuth, getSchedule);
router.put(
  "/:id/schedule",
  protect,
  requireRoles("organiser", "admin"),
  upsertSchedule
);

export default router;
