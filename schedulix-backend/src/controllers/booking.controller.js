import AppointmentType from "../models/AppointmentType.js";
import Booking from "../models/Booking.js";
import {
  activeBookingStatuses,
  addDays,
  ApiError,
  asyncHandler,
  dateKey,
  endOfDay,
  isValidObjectId,
  minutesBetween,
  parseDate,
  startOfDay
} from "../utils/helpers.js";
import { generateBookingPDF } from "../utils/pdfGenerator.js";
import { queueBookingLifecycleEmails } from "../utils/bookingNotifications.js";
import { reserveSlot } from "../utils/slotEngine.js";
import {
  emitBookingCancelled,
  emitBookingCreated,
  emitSlotUpdate
} from "../socket.js";

const RESERVATION_TTL_MS = 5 * 60 * 1000;
const refId = (value) => value?._id?.toString() || value?.toString();

const getBooking = async (id) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid booking id.");
  }

  const booking = await Booking.findById(id).populate("appointmentTypeId");
  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  return booking;
};

const getBookingWithParties = async (id) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid booking id.");
  }

  const booking = await Booking.findById(id)
    .populate("providerId", "name email doctorType")
    .populate("customerId", "name email")
    .populate("appointmentTypeId", "title venue currency organiserId")
    .populate({
      path: "appointmentTypeId",
      populate: {
        path: "organiserId",
        select: "name email"
      }
    });

  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  return booking;
};

const realtimePayload = (booking, overrides = {}) => ({
  bookingId: refId(booking._id),
  appointmentTypeId: refId(booking.appointmentTypeId),
  providerId: refId(booking.providerId),
  customerId: refId(booking.customerId),
  startTime: booking.startTime,
  endTime: booking.endTime,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  ...overrides
});

const userCanAccessBooking = (req, booking) => {
  if (req.user.role === "admin") return true;

  const userId = req.user._id.toString();
  const customerId = refId(booking.customerId);
  const providerId = refId(booking.providerId);
  const organiserId = refId(booking.appointmentTypeId?.organiserId);

  return [customerId, providerId, organiserId].includes(userId);
};

const ensureBookingAccess = (req, booking) => {
  if (!userCanAccessBooking(req, booking)) {
    throw new ApiError(403, "You do not have access to this booking.");
  }
};

const ensureReservationNotExpired = (booking) => {
  if (
    booking.status === "reserved" &&
    booking.reservedAt &&
    booking.reservedAt.getTime() + RESERVATION_TTL_MS < Date.now()
  ) {
    throw new ApiError(410, "Reservation expired. Please reserve the slot again.");
  }
};

const validateAnswers = (appointmentType, answers = []) => {
  const byKey = new Map(answers.map((answer) => [answer.key, answer.value]));

  for (const question of appointmentType.questions || []) {
    if (!question.required) continue;

    const value = byKey.get(question.key);
    if (value === undefined || value === null || value === "") {
      throw new ApiError(400, `Answer is required for question: ${question.key}`);
    }
  }
};

const organiserCanConfirm = (req, booking) => {
  const userId = req.user._id.toString();
  return (
    req.user.role === "admin" ||
    booking.providerId.toString() === userId ||
    booking.appointmentTypeId.organiserId.toString() === userId
  );
};

const insightsRange = (query) => {
  const from = startOfDay(parseDate(query.from, addDays(new Date(), -29)));
  const to = endOfDay(parseDate(query.to, new Date()));

  if (to < from) {
    throw new ApiError(400, "The end date must be after the start date.");
  }

  return { from, to };
};

const summarizeCounts = (items, labelFor) => {
  const counts = new Map();

  for (const item of items) {
    const label = labelFor(item);
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const buildTrend = (bookings) =>
  summarizeCounts(bookings, (booking) => dateKey(booking.startTime))
    .map((item) => ({
      date: item.label,
      label: item.label,
      count: item.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

const totalBookedHours = (bookings) =>
  Number(
    (
      bookings.reduce(
        (sum, booking) =>
          sum + minutesBetween(booking.startTime, booking.endTime) * booking.capacity,
        0
      ) / 60
    ).toFixed(2)
  );

const totalAmount = (bookings, predicate = () => true) =>
  Number(
    bookings
      .filter(predicate)
      .reduce((sum, booking) => sum + (booking.priceAmount || 0), 0)
      .toFixed(2)
  );

const serializeUpcomingBooking = (booking, role) => ({
  id: booking._id,
  title: booking.appointmentTypeId?.title || "Appointment",
  coverImageUrl: booking.appointmentTypeId?.coverImageUrl || "",
  specialization: booking.appointmentTypeId?.specialization || "",
  venue: booking.appointmentTypeId?.venue || "",
  startTime: booking.startTime,
  endTime: booking.endTime,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  priceAmount: booking.priceAmount || 0,
  currency: booking.currency || booking.appointmentTypeId?.currency || "INR",
  problemImageUrl: booking.problemImageUrl || "",
  counterpartName:
    role === "customer"
      ? booking.providerId?.name || "Provider"
      : booking.customerId?.name || "Customer"
});

const bookingPopulates = (query) =>
  query
    .populate(
      "appointmentTypeId",
      "title specialization duration organiserId advancePayment feeAmount currency coverImageUrl venue"
    )
    .populate("customerId", "name email profileImageUrl")
    .populate("providerId", "name email doctorType profileImageUrl");

export const createBooking = asyncHandler(async (req, res) => {
  const { appointmentTypeId, providerId, startTime, capacity = 1 } = req.body;

  if (!appointmentTypeId || !startTime) {
    throw new ApiError(400, "appointmentTypeId and startTime are required.");
  }

  const customerId =
    req.user.role === "customer" || !req.body.customerId
      ? req.user._id
      : req.body.customerId;

  const booking = await reserveSlot({
    appointmentTypeId,
    providerId,
    customerId,
    startTime,
    capacity
  });

  queueBookingLifecycleEmails(booking._id, "reserved");
  emitBookingCreated(realtimePayload(booking));
  emitSlotUpdate(realtimePayload(booking, { reason: "booking_created" }));

  res.status(201).json({
    message: "Slot reserved for 5 minutes.",
    booking
  });
});

export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.id);
  ensureBookingAccess(req, booking);
  ensureReservationNotExpired(booking);

  if (!["reserved", "pending"].includes(booking.status)) {
    throw new ApiError(409, "Only reserved or pending bookings can be confirmed.");
  }

  if (booking.status === "pending" && organiserCanConfirm(req, booking)) {
    booking.status = "confirmed";
  } else {
    validateAnswers(booking.appointmentTypeId, req.body.answers || []);
    booking.answers = req.body.answers || [];
    booking.problemImageUrl = req.body.problemImageUrl
      ? String(req.body.problemImageUrl).trim()
      : booking.problemImageUrl;
    booking.status = booking.appointmentTypeId.manualConfirmation
      ? "pending"
      : "confirmed";
  }

  booking.reservedAt = undefined;
  await booking.save();

  queueBookingLifecycleEmails(
    booking._id,
    booking.status === "pending" ? "pending" : "confirmed"
  );
  emitSlotUpdate(realtimePayload(booking, { reason: "booking_confirmed" }));

  res.json({
    message:
      booking.status === "pending"
        ? "Booking submitted for manual confirmation."
        : "Booking confirmed.",
    booking
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.id);
  ensureBookingAccess(req, booking);

  if (["cancelled", "rescheduled"].includes(booking.status)) {
    res.json({ message: "Booking is already closed.", booking });
    return;
  }

  booking.status = "cancelled";
  booking.reservedAt = undefined;
  booking.cancelledAt = new Date();
  await booking.save();

  queueBookingLifecycleEmails(booking._id, "cancelled");
  emitBookingCancelled(realtimePayload(booking));
  emitSlotUpdate(realtimePayload(booking, { reason: "booking_cancelled" }));

  res.json({
    message: "Booking cancelled.",
    booking
  });
});

export const rescheduleBooking = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.id);
  ensureBookingAccess(req, booking);

  if (["cancelled", "rescheduled"].includes(booking.status)) {
    throw new ApiError(409, "Closed bookings cannot be rescheduled.");
  }

  const { startTime, providerId, capacity } = req.body;
  if (!startTime) {
    throw new ApiError(400, "startTime is required.");
  }

  const newBooking = await reserveSlot({
    appointmentTypeId: booking.appointmentTypeId._id,
    providerId: providerId || booking.providerId,
    customerId: booking.customerId,
    startTime,
    capacity: capacity || booking.capacity
  });

  newBooking.rescheduledFrom = booking._id;
  await newBooking.save();

  booking.status = "rescheduled";
  booking.reservedAt = undefined;
  booking.cancelledAt = new Date();
  await booking.save();

  queueBookingLifecycleEmails(newBooking._id, "rescheduled", {
    previousStart: booking.startTime ? booking.startTime.toLocaleString() : undefined
  });
  emitBookingCancelled(realtimePayload(booking, { reason: "booking_rescheduled" }));
  emitSlotUpdate(realtimePayload(booking, { reason: "booking_rescheduled" }));
  emitBookingCreated(realtimePayload(newBooking, { reason: "booking_rescheduled" }));
  emitSlotUpdate(realtimePayload(newBooking, { reason: "booking_created" }));

  res.status(201).json({
    message: "Booking rescheduled. New slot is reserved for 5 minutes.",
    oldBooking: booking,
    newBooking
  });
});

export const markPaymentPaid = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.id);
  ensureBookingAccess(req, booking);

  if (["cancelled", "rescheduled"].includes(booking.status)) {
    throw new ApiError(409, "Payment cannot be applied to a closed booking.");
  }

  booking.paymentStatus = "paid";
  booking.paymentMethod = req.body.method || "manual";
  booking.paidAt = new Date();
  await booking.save();

  queueBookingLifecycleEmails(booking._id, "payment");

  res.json({
    message: "Payment marked as paid.",
    booking
  });
});

export const downloadBookingPdf = asyncHandler(async (req, res) => {
  const booking = await getBookingWithParties(req.params.id);
  ensureBookingAccess(req, booking);

  const documentType = req.query.document === "payment" ? "payment" : "appointment";
  const pdfBuffer = await generateBookingPDF(booking, documentType);
  const filename = `schedulix-${documentType}-${booking._id}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

export const getCalendarBookings = asyncHandler(async (req, res) => {
  const from = parseDate(req.query.from, undefined);
  const to = parseDate(req.query.to, undefined);
  const query = {};

  if (from || to) {
    query.startTime = {};
    if (from) query.startTime.$gte = from;
    if (to) query.startTime.$lte = to;
  }

  if (req.user.role === "customer") {
    query.customerId = req.user._id;
  }

  if (req.user.role === "organiser") {
    const appointmentIds = await AppointmentType.find({
      organiserId: req.user._id
    }).distinct("_id");

    query.$or = [
      { providerId: req.user._id },
      { appointmentTypeId: { $in: appointmentIds } }
    ];
  }

  const bookings = await Booking.find(query)
    .populate(
      "appointmentTypeId",
      "title specialization duration feeAmount currency advancePayment coverImageUrl venue"
    )
    .populate("customerId", "name email profileImageUrl")
    .populate("providerId", "name email profileImageUrl")
    .sort({ startTime: 1 });

  const grouped = new Map();

  for (const booking of bookings) {
    const day = dateKey(booking.startTime);
    const time = booking.startTime.toISOString().slice(11, 16);
    const key = `${day}-${time}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        date: day,
        time,
        startTime: booking.startTime,
        endTime: booking.endTime,
        bookings: []
      });
    }

    grouped.get(key).bookings.push(booking);
  }

  res.json({
    calendar: [...grouped.values()]
  });
});

export const getBookingInsights = asyncHandler(async (req, res) => {
  const { from, to } = insightsRange(req.query);
  const now = new Date();
  const role = req.user.role;
  const scopeQuery = {};
  let ownedAppointments = [];

  if (role === "customer") {
    scopeQuery.customerId = req.user._id;
  }

  if (role === "organiser") {
    ownedAppointments = await AppointmentType.find({
      organiserId: req.user._id
    }).select("title isPublished feeAmount currency specialization");

    scopeQuery.$or = [
      { providerId: req.user._id },
      { appointmentTypeId: { $in: ownedAppointments.map((item) => item._id) } }
    ];
  }

  const rangedQuery = {
    ...scopeQuery,
    startTime: { $gte: from, $lte: to }
  };

  const bookings = await bookingPopulates(Booking.find(rangedQuery).sort({ startTime: 1 }));

  const upcoming = await bookingPopulates(
    Booking.find({
      ...scopeQuery,
      status: { $in: activeBookingStatuses },
      endTime: { $gte: now }
    })
      .sort({ startTime: 1 })
      .limit(5)
  );

  const bookingTrend = buildTrend(bookings);
  const statusBreakdown = summarizeCounts(bookings, (booking) => booking.status);
  const paymentBreakdown = summarizeCounts(
    bookings,
    (booking) => booking.paymentStatus
  );

  const careMix =
    role === "customer"
      ? summarizeCounts(
          bookings,
          (booking) => booking.appointmentTypeId?.specialization
        )
      : summarizeCounts(bookings, (booking) => booking.appointmentTypeId?.title);

  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");
  const activeBookings = bookings.filter((booking) =>
    activeBookingStatuses.includes(booking.status)
  );
  const upcomingBookings = activeBookings.filter(
    (booking) => booking.endTime >= now
  );
  const summaryCurrency =
    bookings.find((booking) => booking.currency)?.currency ||
    ownedAppointments.find((appointment) => appointment.currency)?.currency ||
    "INR";

  let summary;

  if (role === "organiser") {
    summary = {
      totalBookings: bookings.length,
      upcomingBookings: upcomingBookings.length,
      pendingApproval: bookings.filter((booking) => booking.status === "pending").length,
      paidBookings: paidBookings.length,
      bookedHours: totalBookedHours(activeBookings),
      totalRevenue: totalAmount(paidBookings),
      pendingRevenue: totalAmount(
        bookings,
        (booking) =>
          booking.paymentStatus !== "paid" &&
          !["cancelled", "rescheduled"].includes(booking.status)
      ),
      currency: summaryCurrency,
      liveServices: ownedAppointments.filter((item) => item.isPublished).length,
      totalServices: ownedAppointments.length
    };
  } else if (role === "admin") {
    summary = {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      paidBookings: paidBookings.length,
      bookedHours: totalBookedHours(activeBookings),
      totalRevenue: totalAmount(paidBookings),
      currency: summaryCurrency,
      pendingRevenue: totalAmount(
        bookings,
        (booking) =>
          booking.paymentStatus !== "paid" &&
          !["cancelled", "rescheduled"].includes(booking.status)
      )
    };
  } else {
    summary = {
      totalBookings: bookings.length,
      upcomingBookings: upcomingBookings.length,
      awaitingConfirmation: bookings.filter((booking) =>
        ["reserved", "pending"].includes(booking.status)
      ).length,
      paidBookings: paidBookings.length,
      currency: summaryCurrency,
      totalSpent: totalAmount(paidBookings),
      upcomingValue: totalAmount(upcomingBookings),
      confirmedBookings: bookings.filter((booking) => booking.status === "confirmed").length
    };
  }

  res.json({
    role,
    range: { from, to },
    summary,
    bookingTrend,
    statusBreakdown,
    paymentBreakdown,
    careMix,
    upcoming: upcoming.map((booking) => serializeUpcomingBooking(booking, role))
  });
});
