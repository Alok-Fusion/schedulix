import mongoose from "mongoose";

export const activeBookingStatuses = ["reserved", "pending", "confirmed"];

export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const parsePositiveInt = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, "Expected a positive integer.");
  }
  return parsed;
};

export const parseNonNegativeAmount = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ApiError(400, "Expected a non-negative amount.");
  }
  return Number(parsed.toFixed(2));
};

export const parseDate = (value, fallback = undefined) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date value.");
  }
  return date;
};

export const addMinutes = (date, minutes) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const dateKey = (date) => date.toISOString().slice(0, 10);

export const parseHHMM = (value) => {
  if (!/^\d{2}:\d{2}$/.test(String(value))) {
    throw new ApiError(400, "Time values must use HH:mm format.");
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    throw new ApiError(400, "Invalid HH:mm time value.");
  }

  return hours * 60 + minutes;
};

export const dateAtMinutes = (baseDate, minutes) => {
  const date = startOfDay(baseDate);
  date.setMinutes(minutes);
  return date;
};

export const overlaps = (startA, endA, startB, endB) =>
  startA < endB && endA > startB;

export const minutesBetween = (start, end) =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

export const isProfileCompleted = (user) => {
  if (user.role === "admin") return true;

  const commonFields = [user.phone, user.gender];
  const customerFields = [user.dateOfBirth, user.address];
  const organiserFields = [
    user.medicalRegistrationNo,
    user.doctorType,
    user.highestQualification
  ];

  const requiredFields =
    user.role === "organiser"
      ? [...commonFields, ...organiserFields]
      : [...commonFields, ...customerFields];

  return requiredFields.every((value) => Boolean(value));
};

export const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  profileImageUrl: user.profileImageUrl || "",
  gender: user.gender || "",
  dateOfBirth: user.dateOfBirth,
  address: user.address || "",
  emergencyContactName: user.emergencyContactName || "",
  emergencyContactPhone: user.emergencyContactPhone || "",
  medicalRegistrationNo: user.medicalRegistrationNo || "",
  doctorType: user.doctorType || "",
  highestQualification: user.highestQualification || "",
  profileCompleted: isProfileCompleted(user),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

let transactionsSupported;

const mongoSupportsTransactions = async () => {
  if (transactionsSupported !== undefined) {
    return transactionsSupported;
  }

  const db = mongoose.connection.db;
  if (!db) {
    transactionsSupported = true;
    return transactionsSupported;
  }

  const hello = await db.admin().command({ hello: 1 });
  transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  return transactionsSupported;
};

export const runTransaction = async (work, maxRetries = 3) => {
  if (!(await mongoSupportsTransactions())) {
    return work(undefined);
  }

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      let result;
      await session.withTransaction(
        async () => {
          result = await work(session);
        },
        {
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          readPreference: "primary"
        }
      );
      return result;
    } catch (error) {
      lastError = error;
      const retryable =
        error?.hasErrorLabel?.("TransientTransactionError") ||
        error?.hasErrorLabel?.("UnknownTransactionCommitResult") ||
        error?.code === 112;

      if (!retryable || attempt === maxRetries) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
};
