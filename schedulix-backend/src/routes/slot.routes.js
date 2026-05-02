import express from "express";
import {
  listAvailableSlots,
  recommendSlot
} from "../controllers/slot.controller.js";

const router = express.Router();

router.get("/", listAvailableSlots);
router.post("/recommend", recommendSlot);

export default router;
