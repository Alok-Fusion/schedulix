import bcrypt from "bcrypt";
import AppointmentType from "../src/models/AppointmentType.js";
import Schedule from "../src/models/Schedule.js";
import User from "../src/models/User.js";
import { createJWT, generateRandomToken } from "../src/utils/token.js";

export const authHeader = (token) => ({
  Authorization: `Bearer ${token}`
});

export const createActiveUser = async ({
  role = "customer",
  name,
  email,
  password = "password123",
  doctorType = ""
} = {}) => {
  const user = await User.create({
    name: name || `${role} user`,
    email:
      email ||
      `${role}-${Math.random().toString(36).slice(2, 10)}@schedulix.test`,
    passwordHash: await bcrypt.hash(password, 4),
    role,
    isActive: true,
    phone: "9999999999",
    gender: "other",
    doctorType,
    medicalRegistrationNo:
      role === "organiser" ? `REG-${Date.now()}-${Math.random()}` : undefined,
    highestQualification: role === "organiser" ? "MBBS" : undefined,
    dateOfBirth: role === "customer" ? new Date("1995-01-01") : undefined,
    address: role === "customer" ? "123 Test Street" : undefined
  });

  return {
    user,
    token: createJWT(user),
    password
  };
};

export const nextWeekdayAt = (dayOfWeek, hhmm) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date();
  const daysUntil = (dayOfWeek - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntil);
  date.setHours(hours, minutes, 0, 0);

  if (date <= new Date()) {
    date.setDate(date.getDate() + 7);
  }

  return date;
};

export const createPublishedAppointment = async ({
  organiser,
  providerId,
  title = "Dental Consultation",
  specialization = "Dentist",
  venue = "Online"
}) => {
  const appointment = await AppointmentType.create({
    title,
    description: "Routine consultation",
    venue,
    duration: 30,
    specialization,
    organiserId: organiser._id,
    manageCapacity: false,
    maxCapacity: 1,
    maxBookingsPerSlot: 1,
    manualConfirmation: false,
    advancePayment: false,
    feeAmount: 1200,
    currency: "INR",
    isPublished: true,
    shareToken: generateRandomToken(),
    questions: []
  });

  const schedule = await Schedule.create({
    appointmentTypeId: appointment._id,
    providerId: providerId || organiser._id,
    scheduleType: "weekly",
    weeklySlots: [
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true
      }
    ]
  });

  return {
    appointment,
    schedule,
    startTime: nextWeekdayAt(1, "09:00")
  };
};
