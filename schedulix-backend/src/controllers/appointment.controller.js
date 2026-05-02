import AppointmentType, {
  appointmentSpecializations
} from "../models/AppointmentType.js";
import Schedule from "../models/Schedule.js";
import {
  ApiError,
  asyncHandler,
  isValidObjectId,
  parseNonNegativeAmount
} from "../utils/helpers.js";
import { emitSlotUpdate } from "../socket.js";
import { generateRandomToken } from "../utils/token.js";

const ensureAppointmentAccess = (req, appointment) => {
  const isAdmin = req.user.role === "admin";
  const organiserId = appointment.organiserId?._id || appointment.organiserId;
  const isOwner = organiserId.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "You do not have access to this appointment type.");
  }
};

const schedulePayload = (body, fallbackProviderId) => ({
  providerId: body.providerId || fallbackProviderId,
  scheduleType: body.scheduleType,
  weeklySlots: body.weeklySlots || [],
  flexSlots: body.flexSlots || []
});

const normalizeSpecialization = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    appointmentSpecializations.find(
      (item) => item.toLowerCase() === normalized
    ) || ""
  );
};

const normalizeQuestions = (questions = []) =>
  Array.isArray(questions) ? questions : [];

const emitAppointmentSlotUpdate = (appointmentId, providerId, reason) => {
  emitSlotUpdate({
    appointmentTypeId: appointmentId?.toString(),
    providerId: providerId?.toString(),
    reason
  });
};

export const createAppointment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    venue,
    coverImageUrl,
    duration,
    specialization,
    category,
    assignmentType = "user",
    assignmentMode = "auto",
    manageCapacity = false,
    maxCapacity = 1,
    maxBookingsPerSlot = 1,
    manualConfirmation = false,
    advancePayment = false,
    feeAmount = 0,
    currency = "INR",
    questions = [],
    schedule
  } = req.body;

  const requestedSpecialization = specialization || category;

  if (!title || !duration || !requestedSpecialization) {
    throw new ApiError(
      400,
      "title, duration, and specialization are required."
    );
  }

  const normalizedVenue = String(venue || "").trim() || "Online";

  const organiserId =
    req.user.role === "admin" && req.body.organiserId
      ? req.body.organiserId
      : req.user._id;

  const normalizedAmount = parseNonNegativeAmount(feeAmount, 0);
  const normalizedCurrency = String(currency || "INR").trim().toUpperCase();
  const normalizedSpecialization = normalizeSpecialization(requestedSpecialization);

  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new ApiError(400, "currency must be a 3-letter code such as INR.");
  }

  if (!normalizedSpecialization) {
    throw new ApiError(400, "specialization is invalid.");
  }

  if (req.user.role === "organiser") {
    const organiserSpecialization = normalizeSpecialization(req.user.doctorType);

    if (organiserSpecialization && normalizedSpecialization !== organiserSpecialization) {
      throw new ApiError(
        400,
        `Organisers can only create services for their own doctor type: ${organiserSpecialization}.`
      );
    }
  }

  if (advancePayment && normalizedAmount <= 0) {
    throw new ApiError(400, "Set a positive appointment amount for advance payment.");
  }

  const appointment = await AppointmentType.create({
    title,
    description,
    venue: normalizedVenue,
    coverImageUrl: coverImageUrl ? String(coverImageUrl).trim() : "",
    duration,
    specialization: normalizedSpecialization,
    organiserId,
    assignmentType,
    assignmentMode,
    manageCapacity,
    maxCapacity,
    maxBookingsPerSlot,
    manualConfirmation,
    advancePayment,
    feeAmount: normalizedAmount,
    currency: normalizedCurrency,
    isPublished: false,
    shareToken: generateRandomToken(),
    questions: normalizeQuestions(questions)
  });

  let createdSchedule = null;
  if (schedule) {
    createdSchedule = await Schedule.create({
      appointmentTypeId: appointment._id,
      ...schedulePayload(schedule, organiserId)
    });
  }

  emitAppointmentSlotUpdate(
    appointment._id,
    createdSchedule?.providerId || organiserId,
    "appointment_created"
  );

  res.status(201).json({
    message: "Appointment type created.",
    appointment,
    schedule: createdSchedule
  });
});

export const publishAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid appointment id.");
  }

  const appointment = await AppointmentType.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment type not found.");
  }

  ensureAppointmentAccess(req, appointment);

  const nextPublishedState =
    req.body.isPublished ?? req.body.published ?? !appointment.isPublished;

  if (nextPublishedState) {
    const schedule = await Schedule.findOne({ appointmentTypeId: appointment._id });
    if (!schedule) {
      throw new ApiError(400, "Create a schedule before publishing.");
    }
  }

  appointment.isPublished = Boolean(nextPublishedState);
  await appointment.save();

  emitAppointmentSlotUpdate(
    appointment._id,
    appointment.organiserId,
    appointment.isPublished ? "appointment_published" : "appointment_unpublished"
  );

  res.json({
    message: appointment.isPublished
      ? "Appointment type published."
      : "Appointment type unpublished.",
    appointment
  });
});

export const listAppointments = asyncHandler(async (req, res) => {
  const query = {};

  if (req.user?.role === "admin" && req.query.all === "true") {
    if (req.query.organiserId) {
      query.organiserId = req.query.organiserId;
    }
  } else if (req.query.mine === "true") {
    if (!req.user) {
      throw new ApiError(401, "Authentication required for mine=true.");
    }

    if (req.user.role === "admin" && req.query.organiserId) {
      query.organiserId = req.query.organiserId;
    } else {
      query.organiserId = req.user._id;
    }
  } else {
    query.isPublished = true;
  }

  if (req.query.specialization) {
    query.specialization = req.query.specialization;
  }

  const appointments = await AppointmentType.find(query)
    .populate("organiserId", "name email role profileImageUrl")
    .sort({ createdAt: -1 });

  res.json({ appointments });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid appointment id.");
  }

  const appointment = await AppointmentType.findById(id).populate(
    "organiserId",
    "name email role profileImageUrl"
  );

  if (!appointment) {
    throw new ApiError(404, "Appointment type not found.");
  }

  if (!appointment.isPublished) {
    if (!req.user) {
      throw new ApiError(404, "Appointment type not found.");
    }
    ensureAppointmentAccess(req, appointment);
  }

  const schedule = await Schedule.findOne({ appointmentTypeId: appointment._id });

  res.json({ appointment, schedule });
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid appointment id.");
  }

  const appointment = await AppointmentType.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment type not found.");
  }

  ensureAppointmentAccess(req, appointment);

  const payload = req.body || {};
  const nextTitle =
    payload.title === undefined ? appointment.title : String(payload.title || "").trim();
  const nextDuration =
    payload.duration === undefined ? appointment.duration : Number(payload.duration);
  const nextVenue =
    payload.venue === undefined
      ? appointment.venue
      : String(payload.venue || "").trim() || "Online";
  const nextCoverImageUrl =
    payload.coverImageUrl === undefined
      ? appointment.coverImageUrl
      : String(payload.coverImageUrl || "").trim();
  const nextDescription =
    payload.description === undefined
      ? appointment.description
      : String(payload.description || "").trim();
  const requestedSpecialization =
    payload.specialization ?? payload.category ?? appointment.specialization;
  const normalizedSpecialization = normalizeSpecialization(requestedSpecialization);

  if (!nextTitle || !nextDuration || !normalizedSpecialization) {
    throw new ApiError(
      400,
      "title, duration, and specialization are required."
    );
  }

  if (req.user.role === "organiser") {
    const organiserSpecialization = normalizeSpecialization(req.user.doctorType);

    if (organiserSpecialization && normalizedSpecialization !== organiserSpecialization) {
      throw new ApiError(
        400,
        `Organisers can only manage services for their own doctor type: ${organiserSpecialization}.`
      );
    }
  }

  const nextManageCapacity =
    payload.manageCapacity === undefined
      ? appointment.manageCapacity
      : Boolean(payload.manageCapacity);
  const nextMaxCapacity =
    payload.maxCapacity === undefined
      ? appointment.maxCapacity
      : Number(payload.maxCapacity);
  const nextMaxBookingsPerSlot =
    payload.maxBookingsPerSlot === undefined
      ? appointment.maxBookingsPerSlot
      : Number(payload.maxBookingsPerSlot);
  const nextFeeAmount =
    payload.feeAmount === undefined
      ? appointment.feeAmount
      : parseNonNegativeAmount(payload.feeAmount, 0);
  const nextCurrency =
    payload.currency === undefined
      ? appointment.currency
      : String(payload.currency || "INR").trim().toUpperCase();
  const nextAdvancePayment =
    payload.advancePayment === undefined
      ? appointment.advancePayment
      : Boolean(payload.advancePayment);

  if (!/^[A-Z]{3}$/.test(nextCurrency)) {
    throw new ApiError(400, "currency must be a 3-letter code such as INR.");
  }

  if (nextAdvancePayment && nextFeeAmount <= 0) {
    throw new ApiError(400, "Set a positive appointment amount for advance payment.");
  }

  appointment.title = nextTitle;
  appointment.description = nextDescription;
  appointment.venue = nextVenue;
  appointment.coverImageUrl = nextCoverImageUrl;
  appointment.duration = nextDuration;
  appointment.specialization = normalizedSpecialization;
  appointment.assignmentType = payload.assignmentType || appointment.assignmentType;
  appointment.assignmentMode = payload.assignmentMode || appointment.assignmentMode;
  appointment.manageCapacity = nextManageCapacity;
  appointment.maxCapacity = nextManageCapacity ? nextMaxCapacity : 1;
  appointment.maxBookingsPerSlot = nextManageCapacity ? nextMaxBookingsPerSlot : 1;
  appointment.manualConfirmation =
    payload.manualConfirmation === undefined
      ? appointment.manualConfirmation
      : Boolean(payload.manualConfirmation);
  appointment.advancePayment = nextAdvancePayment;
  appointment.feeAmount = nextFeeAmount;
  appointment.currency = nextCurrency;
  if (payload.questions !== undefined) {
    appointment.questions = normalizeQuestions(payload.questions);
  }

  await appointment.save();

  let schedule = null;
  if (payload.schedule) {
    const nextSchedule = schedulePayload(payload.schedule, appointment.organiserId);
    if (!nextSchedule.scheduleType) {
      throw new ApiError(400, "scheduleType is required.");
    }

    schedule = await Schedule.findOneAndUpdate(
      {
        appointmentTypeId: appointment._id,
        providerId: nextSchedule.providerId
      },
      {
        $set: nextSchedule,
        $setOnInsert: {
          appointmentTypeId: appointment._id
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
  } else {
    schedule = await Schedule.findOne({ appointmentTypeId: appointment._id });
  }

  emitAppointmentSlotUpdate(
    appointment._id,
    schedule?.providerId || appointment.organiserId,
    "appointment_updated"
  );

  res.json({
    message: "Appointment type updated.",
    appointment,
    schedule
  });
});

export const getSharedAppointment = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const appointment = await AppointmentType.findOne({
    shareToken: token,
    isPublished: true
  }).populate("organiserId", "name email role profileImageUrl");

  if (!appointment) {
    throw new ApiError(404, "Shared appointment not found.");
  }

  const schedule = await Schedule.findOne({ appointmentTypeId: appointment._id });

  res.json({ appointment, schedule });
});

export const upsertSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid appointment id.");
  }

  const appointment = await AppointmentType.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment type not found.");
  }

  ensureAppointmentAccess(req, appointment);

  const payload = schedulePayload(req.body, appointment.organiserId);
  if (!payload.scheduleType) {
    throw new ApiError(400, "scheduleType is required.");
  }

  const schedule = await Schedule.findOneAndUpdate(
    {
      appointmentTypeId: appointment._id,
      providerId: payload.providerId
    },
    {
      $set: payload,
      $setOnInsert: {
        appointmentTypeId: appointment._id
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  emitAppointmentSlotUpdate(appointment._id, schedule.providerId, "schedule_updated");

  res.json({
    message: "Schedule saved.",
    schedule
  });
});

export const getSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid appointment id.");
  }

  const appointment = await AppointmentType.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment type not found.");
  }

  if (!appointment.isPublished) {
    if (!req.user) {
      throw new ApiError(404, "Appointment type not found.");
    }
    ensureAppointmentAccess(req, appointment);
  }

  const query = { appointmentTypeId: appointment._id };
  if (req.query.providerId) query.providerId = req.query.providerId;

  const schedules = await Schedule.find(query).sort({ createdAt: 1 });

  res.json({ schedules });
});
