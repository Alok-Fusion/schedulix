import AppointmentType from "../models/AppointmentType.js";
import Booking from "../models/Booking.js";
import Schedule from "../models/Schedule.js";
import {
  activeBookingStatuses,
  addDays,
  addMinutes,
  ApiError,
  dateAtMinutes,
  endOfDay,
  minutesBetween,
  overlaps,
  parseDate,
  parseHHMM,
  parsePositiveInt,
  runTransaction,
  startOfDay
} from "./helpers.js";

const DEFAULT_LOOKAHEAD_DAYS = 7;

const getMaxCapacity = (appointmentType, scheduleWindow = undefined) => {
  const appointmentCapacity = appointmentType.manageCapacity
    ? appointmentType.maxCapacity
    : 1;
  const override = scheduleWindow?.capacityOverride;

  if (!override) return appointmentCapacity;
  return Math.max(1, Math.min(override, appointmentCapacity));
};

const getMaxBookingsPerSlot = (appointmentType) =>
  appointmentType.manageCapacity
    ? Math.min(appointmentType.maxBookingsPerSlot, appointmentType.maxCapacity)
    : 1;

const resolveSchedule = async ({
  appointmentTypeId,
  providerId,
  session = undefined
}) => {
  const query = { appointmentTypeId };
  if (providerId) query.providerId = providerId;

  const schedule = await Schedule.findOne(query)
    .sort({ createdAt: 1 })
    .session(session);

  return schedule;
};

const validateRange = (from, to) => {
  const rangeStart = parseDate(from, new Date());
  const rangeEnd = parseDate(to, endOfDay(addDays(rangeStart, DEFAULT_LOOKAHEAD_DAYS)));

  if (rangeEnd <= rangeStart) {
    throw new ApiError(400, "The end date must be after the start date.");
  }

  return { rangeStart, rangeEnd };
};

const buildWindowSlots = ({
  appointmentType,
  providerId,
  rangeStart,
  rangeEnd,
  day,
  window
}) => {
  const duration = appointmentType.duration;
  const windowStart = dateAtMinutes(day, parseHHMM(window.startTime));
  const windowEnd = dateAtMinutes(day, parseHHMM(window.endTime));
  const maxCapacity = getMaxCapacity(appointmentType, window);
  const slots = [];

  let cursor = new Date(windowStart);

  while (addMinutes(cursor, duration) <= windowEnd) {
    const slotEnd = addMinutes(cursor, duration);

    if (cursor >= rangeStart && slotEnd <= rangeEnd) {
      slots.push({
        appointmentTypeId: appointmentType._id,
        providerId,
        startTime: new Date(cursor),
        endTime: slotEnd,
        duration,
        maxCapacity,
        maxBookingsPerSlot: getMaxBookingsPerSlot(appointmentType)
      });
    }

    cursor = slotEnd;
  }

  return slots;
};

export const generateSlotsFromSchedule = ({
  appointmentType,
  schedule,
  from,
  to
}) => {
  const { rangeStart, rangeEnd } = validateRange(from, to);
  const slots = [];
  let day = startOfDay(rangeStart);

  while (day <= rangeEnd) {
    if (schedule.scheduleType === "weekly") {
      const windows = schedule.weeklySlots.filter(
        (slot) => slot.isActive && slot.dayOfWeek === day.getDay()
      );

      for (const window of windows) {
        slots.push(
          ...buildWindowSlots({
            appointmentType,
            providerId: schedule.providerId,
            rangeStart,
            rangeEnd,
            day,
            window
          })
        );
      }
    }

    if (schedule.scheduleType === "flexible") {
      const windows = schedule.flexSlots.filter(
        (slot) =>
          slot.isActive &&
          startOfDay(slot.date).getTime() === startOfDay(day).getTime()
      );

      for (const window of windows) {
        slots.push(
          ...buildWindowSlots({
            appointmentType,
            providerId: schedule.providerId,
            rangeStart,
            rangeEnd,
            day,
            window
          })
        );
      }
    }

    day = addDays(day, 1);
  }

  const unique = new Map();
  for (const slot of slots) {
    unique.set(`${slot.startTime.toISOString()}-${slot.endTime.toISOString()}`, slot);
  }

  return [...unique.values()].sort((a, b) => a.startTime - b.startTime);
};

const addBookingStats = (slots, bookings, requestedCapacity) =>
  slots
    .map((slot) => {
      const overlappingBookings = bookings.filter((booking) =>
        overlaps(slot.startTime, slot.endTime, booking.startTime, booking.endTime)
      );
      const bookedCapacity = overlappingBookings.reduce(
        (sum, booking) => sum + booking.capacity,
        0
      );
      const bookedCount = overlappingBookings.length;
      const remainingCapacity = Math.max(0, slot.maxCapacity - bookedCapacity);
      const isAvailable =
        remainingCapacity >= requestedCapacity &&
        bookedCount < slot.maxBookingsPerSlot;

      return {
        ...slot,
        bookedCount,
        bookedCapacity,
        remainingCapacity,
        isAvailable
      };
    })
    .filter((slot) => slot.isAvailable);

export const getAvailableSlots = async ({
  appointmentTypeId,
  providerId = undefined,
  from = undefined,
  to = undefined,
  capacity = 1,
  requirePublished = true,
  session = undefined
}) => {
  const requestedCapacity = parsePositiveInt(capacity, 1);
  const { rangeStart, rangeEnd } = validateRange(from, to);
  const now = new Date();

  if (rangeEnd <= now) {
    return [];
  }

  const effectiveRangeStart = rangeStart < now ? now : rangeStart;
  const appointmentQuery = { _id: appointmentTypeId };
  if (requirePublished) appointmentQuery.isPublished = true;

  const appointmentType = await AppointmentType.findOne(appointmentQuery).session(
    session
  );

  if (!appointmentType) {
    throw new ApiError(404, "Appointment type not found.");
  }

  if (!appointmentType.manageCapacity && requestedCapacity > 1) {
    throw new ApiError(400, "This appointment type accepts one booking per slot.");
  }

  const schedule = await resolveSchedule({
    appointmentTypeId,
    providerId,
    session
  });

  if (!schedule) return [];

  const generatedSlots = generateSlotsFromSchedule({
    appointmentType,
    schedule,
    from: effectiveRangeStart,
    to: rangeEnd
  });

  if (!generatedSlots.length) return [];

  const firstSlot = generatedSlots[0];
  const lastSlot = generatedSlots[generatedSlots.length - 1];

  const bookings = await Booking.find({
    appointmentTypeId,
    providerId: schedule.providerId,
    status: { $in: activeBookingStatuses },
    startTime: { $lt: lastSlot.endTime },
    endTime: { $gt: firstSlot.startTime }
  }).session(session);

  return addBookingStats(generatedSlots, bookings, requestedCapacity);
};

export const reserveSlot = async ({
  appointmentTypeId,
  providerId = undefined,
  customerId,
  startTime,
  capacity = 1
}) => {
  const requestedCapacity = parsePositiveInt(capacity, 1);
  const requestedStart = parseDate(startTime);

  if (!requestedStart) {
    throw new ApiError(400, "startTime is required.");
  }

  if (requestedStart < new Date()) {
    throw new ApiError(400, "Cannot reserve a past slot.");
  }

  return runTransaction(async (session) => {
    const appointmentType = await AppointmentType.findOne({
      _id: appointmentTypeId,
      isPublished: true
    }).session(session);

    if (!appointmentType) {
      throw new ApiError(404, "Appointment type not found or unpublished.");
    }

    if (!appointmentType.manageCapacity && requestedCapacity > 1) {
      throw new ApiError(400, "This appointment type accepts one booking per slot.");
    }

    await AppointmentType.updateOne(
      { _id: appointmentType._id },
      { $inc: { reservationGuard: 1 } },
      { session }
    );

    const schedule = await resolveSchedule({
      appointmentTypeId,
      providerId,
      session
    });

    if (!schedule) {
      throw new ApiError(404, "No schedule found for this appointment type.");
    }

    const requestedEnd = addMinutes(requestedStart, appointmentType.duration);
    const slots = generateSlotsFromSchedule({
      appointmentType,
      schedule,
      from: requestedStart,
      to: requestedEnd
    });

    const exactSlot = slots.find(
      (slot) =>
        slot.startTime.getTime() === requestedStart.getTime() &&
        slot.endTime.getTime() === requestedEnd.getTime()
    );

    if (!exactSlot) {
      throw new ApiError(400, "Requested slot is outside provider availability.");
    }

    const bookings = await Booking.find({
      appointmentTypeId,
      providerId: schedule.providerId,
      status: { $in: activeBookingStatuses },
      startTime: { $lt: requestedEnd },
      endTime: { $gt: requestedStart }
    }).session(session);

    const bookedCapacity = bookings.reduce(
      (sum, booking) => sum + booking.capacity,
      0
    );
    const bookedCount = bookings.length;

    if (bookedCount >= exactSlot.maxBookingsPerSlot) {
      throw new ApiError(409, "Maximum bookings for this slot reached.");
    }

    if (bookedCapacity + requestedCapacity > exactSlot.maxCapacity) {
      throw new ApiError(409, "Slot capacity exceeded.");
    }

    const [booking] = await Booking.create(
      [
        {
          appointmentTypeId,
          providerId: schedule.providerId,
          customerId,
          startTime: requestedStart,
          endTime: requestedEnd,
          capacity: requestedCapacity,
          status: "reserved",
          paymentStatus: "unpaid",
          priceAmount: Number(
            ((appointmentType.feeAmount || 0) * requestedCapacity).toFixed(2)
          ),
          currency: appointmentType.currency || "INR",
          reservedAt: new Date()
        }
      ],
      { session }
    );

    return booking;
  });
};

export const recommendBestSlot = async ({
  appointmentTypeId,
  providerId = undefined,
  from = undefined,
  capacity = 1
}) => {
  const now = parseDate(from, new Date());
  const slots = await getAvailableSlots({
    appointmentTypeId,
    providerId,
    from: now,
    to: addDays(now, DEFAULT_LOOKAHEAD_DAYS),
    capacity
  });

  if (!slots.length) return null;

  const scoredSlots = slots.map((slot) => {
    const minutesUntil = minutesBetween(now, slot.startTime);
    const hour = slot.startTime.getHours();
    const earlierScore = Math.max(0, 10080 - minutesUntil);
    const capacityScore = slot.remainingCapacity * 25;
    const workingHoursBonus = hour >= 9 && hour < 18 ? 100 : 0;
    const bookedPenalty = slot.bookedCount * 30;
    const score =
      earlierScore + capacityScore + workingHoursBonus - bookedPenalty;

    return {
      ...slot,
      score,
      scoreBreakdown: {
        earlierScore,
        capacityScore,
        workingHoursBonus,
        bookedPenalty
      }
    };
  });

  scoredSlots.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.startTime - b.startTime;
  });

  return scoredSlots[0];
};

export const recommendFirstAvailableSlot = async ({
  appointmentTypeId,
  providerId = undefined,
  from = undefined,
  capacity = 1
}) => {
  const now = parseDate(from, new Date());
  const slots = await getAvailableSlots({
    appointmentTypeId,
    providerId,
    from: now,
    to: addDays(now, DEFAULT_LOOKAHEAD_DAYS),
    capacity
  });

  return slots[0] || null;
};

export const calculateAvailableCapacityMinutes = ({
  appointmentType,
  schedule,
  from,
  to
}) => {
  const slots = generateSlotsFromSchedule({
    appointmentType,
    schedule,
    from,
    to
  });

  return slots.reduce(
    (sum, slot) => sum + slot.duration * slot.maxCapacity,
    0
  );
};
