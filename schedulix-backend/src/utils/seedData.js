/**
 * Seed script — populates the DB with ~300+ realistic records per user.
 *
 * Usage:  node src/utils/seedData.js
 *
 * It looks up the existing organiser & customer by email, then creates:
 *   • 8  AppointmentTypes  (varied medical services)
 *   • 8  Schedules         (one per appointment type)
 *   • 12 Resources         (rooms, equipment, staff)
 *   • 320+ Bookings        (spread across past, present, future)
 */

import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

/* ------------------------------------------------------------------ */
/*  Connect to MongoDB                                                 */
/* ------------------------------------------------------------------ */
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/schedulix";
await mongoose.connect(mongoUri);
console.log("Connected to MongoDB");

/* ------------------------------------------------------------------ */
/*  Import models                                                      */
/* ------------------------------------------------------------------ */
import User from "../models/User.js";
import AppointmentType from "../models/AppointmentType.js";
import Schedule from "../models/Schedule.js";
import Resource from "../models/Resource.js";
import Booking from "../models/Booking.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const token = () => crypto.randomBytes(16).toString("hex");
const pad = (n) => String(n).padStart(2, "0");

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/* ------------------------------------------------------------------ */
/*  Look up existing users                                             */
/* ------------------------------------------------------------------ */
const organiser = await User.findOne({ email: "kushwahaalok025@gmail.com" });
const customer = await User.findOne({ email: "crazyminiac47@gmail.com" });

if (!organiser) { console.error("Organiser not found!"); process.exit(1); }
if (!customer) { console.error("Customer not found!"); process.exit(1); }

console.log(`Organiser: ${organiser.name} (${organiser._id})`);
console.log(`Customer:  ${customer.name} (${customer._id})`);

/* ------------------------------------------------------------------ */
/*  Appointment Types                                                  */
/* ------------------------------------------------------------------ */
const apptDefs = [
  {
    title: "General Health Checkup",
    description: "Comprehensive physical examination including blood pressure, heart rate, BMI assessment, and basic blood work review. Ideal for annual wellness visits.",
    venue: "Room 101, MedCare Clinic, Sector 18, Noida",
    duration: 30,
    specialization: "General Physician",
    feeAmount: 500,
    questions: [
      { key: "symptoms", label: "What symptoms are you experiencing?", type: "text", required: true },
      { key: "medications", label: "Are you on any current medications?", type: "text", required: false },
      { key: "allergies", label: "Do you have any known allergies?", type: "text", required: true }
    ]
  },
  {
    title: "Dental Cleaning & Polishing",
    description: "Professional dental cleaning, scaling, and polishing procedure. Includes oral health assessment and personalized hygiene tips.",
    venue: "SmileBright Dental Studio, Connaught Place, Delhi",
    duration: 45,
    specialization: "Dentist",
    feeAmount: 1200,
    questions: [
      { key: "last_visit", label: "When was your last dental visit?", type: "date", required: true },
      { key: "sensitivity", label: "Do you experience tooth sensitivity?", type: "boolean", required: true },
      { key: "concern", label: "Primary dental concern", type: "select", required: true, options: ["Cleaning", "Pain", "Cosmetic", "Braces Consultation", "Other"] }
    ]
  },
  {
    title: "Skin Consultation & Treatment",
    description: "Dermatology consultation for acne, eczema, psoriasis, pigmentation, and other skin conditions. Includes a treatment plan and prescription.",
    venue: "GlowSkin Dermatology, Rajouri Garden, Delhi",
    duration: 20,
    specialization: "Dermatologist",
    feeAmount: 800,
    questions: [
      { key: "skin_type", label: "What is your skin type?", type: "select", required: true, options: ["Oily", "Dry", "Combination", "Sensitive", "Normal"] },
      { key: "concern_area", label: "Primary area of concern", type: "text", required: true },
      { key: "duration_issue", label: "How long have you had this condition?", type: "text", required: false }
    ]
  },
  {
    title: "Cardiac Health Screening",
    description: "Complete cardiac evaluation with ECG, blood pressure monitoring, cholesterol panel review, and risk assessment for heart disease.",
    venue: "HeartCare Centre, Vasant Kunj, Delhi",
    duration: 60,
    specialization: "Cardiologist",
    feeAmount: 2500,
    manualConfirmation: true,
    advancePayment: true,
    questions: [
      { key: "chest_pain", label: "Do you experience chest pain or discomfort?", type: "boolean", required: true },
      { key: "family_history", label: "Family history of heart disease?", type: "boolean", required: true },
      { key: "exercise", label: "Exercise frequency per week", type: "select", required: false, options: ["None", "1-2 times", "3-4 times", "5+ times"] }
    ]
  },
  {
    title: "Orthopedic Consultation",
    description: "Assessment for bone, joint, and muscle conditions including back pain, sports injuries, arthritis, and post-operative follow-ups.",
    venue: "BoneFit Orthopedics, Dwarka Sector 12, Delhi",
    duration: 30,
    specialization: "Orthopedic",
    feeAmount: 700,
    questions: [
      { key: "injury_area", label: "Which body area is affected?", type: "select", required: true, options: ["Knee", "Back", "Shoulder", "Hip", "Wrist", "Ankle", "Other"] },
      { key: "pain_scale", label: "Pain level (1-10)", type: "number", required: true },
      { key: "injury_cause", label: "How did the injury occur?", type: "text", required: false }
    ]
  },
  {
    title: "Pediatric Wellness Visit",
    description: "Child health checkup including growth monitoring, vaccination review, developmental milestones assessment, and nutrition counselling.",
    venue: "TinyStar Pediatric Clinic, Indirapuram, Ghaziabad",
    duration: 25,
    specialization: "Pediatrician",
    feeAmount: 600,
    questions: [
      { key: "child_age", label: "Child's age (years)", type: "number", required: true },
      { key: "vaccination_status", label: "Are vaccinations up to date?", type: "boolean", required: true },
      { key: "concern", label: "Any specific health concerns?", type: "text", required: false }
    ]
  },
  {
    title: "Root Canal Treatment",
    description: "Advanced endodontic procedure for severely decayed or infected teeth. Includes X-ray, anaesthesia, cleaning, and temporary filling.",
    venue: "SmileBright Dental Studio, Connaught Place, Delhi",
    duration: 90,
    specialization: "Dentist",
    feeAmount: 5000,
    manualConfirmation: true,
    advancePayment: true,
    manageCapacity: true,
    maxCapacity: 2,
    maxBookingsPerSlot: 2,
    questions: [
      { key: "tooth_number", label: "Which tooth is affected?", type: "text", required: true },
      { key: "pain_duration", label: "How long have you had the pain?", type: "text", required: true },
      { key: "previous_treatment", label: "Any previous dental treatments on this tooth?", type: "boolean", required: false }
    ]
  },
  {
    title: "Physiotherapy Session",
    description: "Rehabilitation session including targeted exercises, electrotherapy, and manual therapy for injury recovery and chronic pain management.",
    venue: "FlexRecover Physiotherapy, Greater Kailash, Delhi",
    duration: 45,
    specialization: "Other",
    feeAmount: 900,
    questions: [
      { key: "condition", label: "Condition being treated", type: "select", required: true, options: ["Post-surgery rehab", "Sports injury", "Chronic back pain", "Frozen shoulder", "Knee rehabilitation", "Other"] },
      { key: "sessions_done", label: "Number of previous sessions", type: "number", required: false },
      { key: "improvement", label: "Any improvement noticed?", type: "boolean", required: false }
    ]
  }
];

console.log("Creating appointment types...");
const appointmentTypes = [];
for (const def of apptDefs) {
  const at = await AppointmentType.create({
    ...def,
    organiserId: organiser._id,
    isPublished: true,
    shareToken: token(),
    currency: "INR"
  });
  appointmentTypes.push(at);
}
console.log(`  ✓ ${appointmentTypes.length} appointment types created`);

/* ------------------------------------------------------------------ */
/*  Schedules (one per appointment type)                               */
/* ------------------------------------------------------------------ */
console.log("Creating schedules...");
const weekdaySchedules = [
  // Mon-Fri morning
  [
    { dayOfWeek: 1, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "13:00", isActive: true }
  ],
  // Mon-Sat full day
  [
    { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", isActive: true }
  ],
  // Afternoon slots
  [
    { dayOfWeek: 1, startTime: "14:00", endTime: "20:00", isActive: true },
    { dayOfWeek: 2, startTime: "14:00", endTime: "20:00", isActive: true },
    { dayOfWeek: 3, startTime: "14:00", endTime: "20:00", isActive: true },
    { dayOfWeek: 4, startTime: "14:00", endTime: "20:00", isActive: true },
    { dayOfWeek: 5, startTime: "14:00", endTime: "20:00", isActive: true }
  ],
  // Morning + Evening split
  [
    { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", isActive: true },
    { dayOfWeek: 1, startTime: "17:00", endTime: "21:00", isActive: true },
    { dayOfWeek: 3, startTime: "08:00", endTime: "12:00", isActive: true },
    { dayOfWeek: 3, startTime: "17:00", endTime: "21:00", isActive: true },
    { dayOfWeek: 5, startTime: "08:00", endTime: "12:00", isActive: true },
    { dayOfWeek: 5, startTime: "17:00", endTime: "21:00", isActive: true }
  ]
];

for (let i = 0; i < appointmentTypes.length; i++) {
  await Schedule.create({
    appointmentTypeId: appointmentTypes[i]._id,
    providerId: organiser._id,
    scheduleType: "weekly",
    weeklySlots: weekdaySchedules[i % weekdaySchedules.length]
  });
}
console.log(`  ✓ ${appointmentTypes.length} schedules created`);

/* ------------------------------------------------------------------ */
/*  Resources                                                          */
/* ------------------------------------------------------------------ */
console.log("Creating resources...");
const resourceDefs = [
  { name: "Consultation Room A", type: "room", capacity: 1 },
  { name: "Consultation Room B", type: "room", capacity: 1 },
  { name: "Dental Suite 1", type: "room", capacity: 2 },
  { name: "Dental Suite 2", type: "room", capacity: 1 },
  { name: "Cardiac Lab", type: "room", capacity: 1 },
  { name: "Physiotherapy Hall", type: "room", capacity: 4 },
  { name: "Digital X-Ray Machine", type: "equipment", capacity: 1 },
  { name: "ECG Machine", type: "equipment", capacity: 1 },
  { name: "Ultrasound Scanner", type: "equipment", capacity: 1 },
  { name: "Dr. Priya Sharma (Dental Hygienist)", type: "staff", capacity: 1 },
  { name: "Ravi Kumar (Physiotherapy Assistant)", type: "staff", capacity: 1 },
  { name: "Neha Singh (Nursing Staff)", type: "staff", capacity: 1 }
];

for (const rd of resourceDefs) {
  await Resource.create({ ...rd, organiserId: organiser._id, isActive: true });
}
console.log(`  ✓ ${resourceDefs.length} resources created`);

/* ------------------------------------------------------------------ */
/*  Bookings — 320+ realistic records                                  */
/* ------------------------------------------------------------------ */
console.log("Creating bookings...");

const statuses = ["confirmed", "cancelled", "pending", "rescheduled", "confirmed"];
const payStatuses = ["paid", "unpaid", "paid", "paid", "refunded", "paid"];
const payMethods = ["UPI", "Credit Card", "Debit Card", "Cash", "Net Banking", "Google Pay", "PhonePe"];

const patientNames = [
  "Aarav Mehta", "Diya Patel", "Rohan Verma", "Sneha Gupta", "Karan Singh",
  "Pooja Sharma", "Arjun Reddy", "Meera Joshi", "Vivek Malhotra", "Ananya Das",
  "Siddharth Nair", "Kavya Iyer", "Manish Tiwari", "Priyanka Roy", "Rahul Chauhan",
  "Nisha Agarwal", "Vikram Desai", "Simran Kaur", "Aditya Rao", "Tanvi Bhatt",
  "Kunal Saxena", "Ritu Pandey", "Harsh Jain", "Deepika Menon", "Amit Yadav",
  "Swati Kulkarni", "Nikhil Bose", "Ishita Srivastava", "Rajesh Pillai", "Aparna Nambiar"
];

const symptomsList = [
  "Persistent headache for 3 days", "Mild fever and body ache", "Recurring stomach pain",
  "Difficulty breathing during exercise", "Chronic fatigue and dizziness",
  "Back pain radiating to legs", "Skin rash on arms and neck", "Toothache and swollen gums",
  "Knee pain after morning jog", "Child has frequent cough and cold",
  "Numbness in left hand", "High blood pressure readings", "Acne breakout on forehead",
  "Joint stiffness in the morning", "Chest tightness after meals",
  "Weight loss despite normal appetite", "Frequent urination at night",
  "Blurred vision and eye strain", "Shoulder pain after lifting weights",
  "Ankle sprain from playing cricket"
];

const skinTypes = ["Oily", "Dry", "Combination", "Sensitive", "Normal"];
const injuryAreas = ["Knee", "Back", "Shoulder", "Hip", "Wrist", "Ankle", "Other"];
const conditions = ["Post-surgery rehab", "Sports injury", "Chronic back pain", "Frozen shoulder", "Knee rehabilitation", "Other"];
const exerciseFreq = ["None", "1-2 times", "3-4 times", "5+ times"];
const concerns = ["Cleaning", "Pain", "Cosmetic", "Braces Consultation", "Other"];

function generateAnswers(apptType) {
  const qs = apptType.questions;
  return qs.map((q) => {
    let value;
    switch (q.key) {
      case "symptoms": value = pick(symptomsList); break;
      case "medications": value = pick(["None", "Paracetamol", "Metformin", "Aspirin 75mg daily", "Atorvastatin 10mg", "No current medications"]); break;
      case "allergies": value = pick(["None", "Penicillin", "Dust and pollen", "Sulfa drugs", "No known allergies", "Latex"]); break;
      case "last_visit": value = addDays(new Date(), -rand(30, 730)).toISOString().split("T")[0]; break;
      case "sensitivity": case "chest_pain": case "family_history": case "vaccination_status": case "previous_treatment": case "improvement":
        value = pick([true, false]); break;
      case "skin_type": value = pick(skinTypes); break;
      case "concern_area": value = pick(["Forehead acne", "Dark circles", "Pigmentation on cheeks", "Eczema on hands", "Dry patches", "Rosacea"]); break;
      case "duration_issue": value = pick(["2 weeks", "1 month", "3 months", "6 months", "Over a year"]); break;
      case "injury_area": value = pick(injuryAreas); break;
      case "pain_scale": value = rand(2, 9); break;
      case "injury_cause": value = pick(["Sports injury", "Fell while walking", "Gym accident", "Road accident", "Repetitive strain", "Unknown"]); break;
      case "child_age": value = rand(1, 14); break;
      case "concern": value = pick(concerns); break;
      case "tooth_number": value = `#${rand(1, 32)}`; break;
      case "pain_duration": value = pick(["2 days", "1 week", "2 weeks", "1 month", "Intermittent for months"]); break;
      case "condition": value = pick(conditions); break;
      case "sessions_done": value = rand(0, 15); break;
      case "exercise": value = pick(exerciseFreq); break;
      default: value = "N/A";
    }
    return { key: q.key, value };
  });
}

const today = new Date();
today.setHours(0, 0, 0, 0);
let bookingCount = 0;
const TOTAL_TARGET = 330;

// Generate bookings spread over 6 months back and 2 months forward
for (let i = 0; i < TOTAL_TARGET; i++) {
  const apptType = appointmentTypes[i % appointmentTypes.length];
  const dayOffset = rand(-180, 60); // 6 months back to 2 months forward
  const bookingDate = addDays(today, dayOffset);
  const hour = rand(8, 18);
  const minute = pick([0, 15, 30, 45]);

  const startTime = setTime(bookingDate, hour, minute);
  const endTime = new Date(startTime.getTime() + apptType.duration * 60000);

  // Determine realistic status based on date
  let status, paymentStatus, paidAt, cancelledAt;

  if (dayOffset < -7) {
    // Past bookings — mostly completed
    const roll = Math.random();
    if (roll < 0.65) { status = "confirmed"; paymentStatus = "paid"; paidAt = new Date(startTime.getTime() - rand(1, 48) * 3600000); }
    else if (roll < 0.80) { status = "cancelled"; paymentStatus = pick(["refunded", "unpaid"]); cancelledAt = new Date(startTime.getTime() - rand(24, 72) * 3600000); }
    else if (roll < 0.90) { status = "rescheduled"; paymentStatus = "paid"; paidAt = new Date(startTime.getTime() - rand(1, 48) * 3600000); }
    else { status = "confirmed"; paymentStatus = "paid"; paidAt = startTime; }
  } else if (dayOffset <= 0) {
    // Recent/today
    status = pick(["confirmed", "pending", "confirmed"]);
    paymentStatus = status === "confirmed" ? "paid" : "unpaid";
    if (paymentStatus === "paid") paidAt = new Date(startTime.getTime() - rand(1, 24) * 3600000);
  } else {
    // Future bookings
    const roll = Math.random();
    if (roll < 0.5) { status = "confirmed"; paymentStatus = apptType.advancePayment ? "paid" : "unpaid"; }
    else if (roll < 0.8) { status = "pending"; paymentStatus = "unpaid"; }
    else { status = "reserved"; paymentStatus = "unpaid"; }
    if (paymentStatus === "paid") paidAt = new Date(Date.now() - rand(1, 72) * 3600000);
  }

  const answers = generateAnswers(apptType);

  await Booking.create({
    appointmentTypeId: apptType._id,
    providerId: organiser._id,
    customerId: customer._id,
    startTime,
    endTime,
    capacity: 1,
    status,
    paymentStatus,
    priceAmount: apptType.feeAmount,
    currency: "INR",
    paymentMethod: paymentStatus === "paid" ? pick(payMethods) : undefined,
    paidAt,
    cancelledAt,
    answers,
    reservedAt: status === "reserved" ? new Date() : undefined
  });
  bookingCount++;

  if (bookingCount % 50 === 0) console.log(`  … ${bookingCount} bookings created`);
}

console.log(`  ✓ ${bookingCount} bookings created`);

/* ------------------------------------------------------------------ */
/*  Summary                                                            */
/* ------------------------------------------------------------------ */
const totalRecords = appointmentTypes.length + appointmentTypes.length + resourceDefs.length + bookingCount;
console.log("\n=== Seed Complete ===");
console.log(`  Appointment Types : ${appointmentTypes.length}`);
console.log(`  Schedules         : ${appointmentTypes.length}`);
console.log(`  Resources         : ${resourceDefs.length}`);
console.log(`  Bookings          : ${bookingCount}`);
console.log(`  TOTAL RECORDS     : ${totalRecords}`);
console.log(`  Organiser records : ${appointmentTypes.length + appointmentTypes.length + resourceDefs.length + bookingCount}`);
console.log(`  Customer records  : ${bookingCount}`);

await mongoose.disconnect();
console.log("Disconnected from MongoDB. Done!");
process.exit(0);
