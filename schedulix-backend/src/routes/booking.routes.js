import express from "express";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  downloadBookingPdf,
  getCalendarBookings,
  getBookingInsights,
  markPaymentPaid,
  rescheduleBooking
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/calendar", getCalendarBookings);
router.get("/insights", getBookingInsights);
router.get("/:id/pdf", downloadBookingPdf);
router.post("/", requireRoles("customer", "organiser", "admin"), createBooking);
router.post("/:id/confirm", confirmBooking);
router.post("/:id/cancel", cancelBooking);
router.post("/:id/reschedule", rescheduleBooking);
router.post("/:id/payment", markPaymentPaid);

export default router;
