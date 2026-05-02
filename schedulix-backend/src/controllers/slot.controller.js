import { ApiError, asyncHandler } from "../utils/helpers.js";
import {
  getAvailableSlots,
  recommendBestSlot,
  recommendFirstAvailableSlot
} from "../utils/slotEngine.js";

const requireAppointment = (appointmentTypeId) => {
  if (!appointmentTypeId) {
    throw new ApiError(400, "appointmentTypeId is required.");
  }
};

export const listAvailableSlots = asyncHandler(async (req, res) => {
  const { appointmentTypeId, providerId, from, to, capacity } = req.query;
  requireAppointment(appointmentTypeId);

  const slots = await getAvailableSlots({
    appointmentTypeId,
    providerId,
    from,
    to,
    capacity
  });

  res.json({ slots });
});

export const recommendSlot = asyncHandler(async (req, res) => {
  const { appointmentTypeId, providerId, from, capacity, strategy = "best" } = req.body;
  requireAppointment(appointmentTypeId);

  const resolver =
    strategy === "earliest" ? recommendFirstAvailableSlot : recommendBestSlot;
  const slot = await resolver({
    appointmentTypeId,
    providerId,
    from,
    capacity
  });

  if (!slot) {
    throw new ApiError(404, "No available slots found in the next 7 days.");
  }

  res.json({ slot, strategy });
});
