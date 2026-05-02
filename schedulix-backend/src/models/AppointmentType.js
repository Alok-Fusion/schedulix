import mongoose from "mongoose";

export const appointmentSpecializations = [
  "Dentist",
  "Dermatologist",
  "General Physician",
  "Cardiologist",
  "Orthopedic",
  "Pediatrician",
  "Other"
];

const QuestionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["text", "number", "boolean", "date", "select", "multi-select"],
      default: "text"
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { _id: false }
);

const AppointmentTypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240
    },
    coverImageUrl: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    duration: {
      type: Number,
      required: true,
      min: 5,
      max: 480
    },
    specialization: {
      type: String,
      enum: appointmentSpecializations,
      required: true,
      index: true
    },
    organiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    assignmentType: {
      type: String,
      enum: ["user", "resource"],
      default: "user"
    },
    assignmentMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto"
    },
    manageCapacity: {
      type: Boolean,
      default: false
    },
    maxCapacity: {
      type: Number,
      default: 1,
      min: 1
    },
    maxBookingsPerSlot: {
      type: Number,
      default: 1,
      min: 1
    },
    manualConfirmation: {
      type: Boolean,
      default: false
    },
    advancePayment: {
      type: Boolean,
      default: false
    },
    feeAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    questions: {
      type: [QuestionSchema],
      default: []
    },
    reservationGuard: {
      type: Number,
      default: 0,
      select: false
    }
  },
  {
    timestamps: true
  }
);

AppointmentTypeSchema.pre("validate", function normalizeCapacity(next) {
  if (!this.manageCapacity) {
    this.maxCapacity = 1;
    this.maxBookingsPerSlot = 1;
  } else if (this.maxBookingsPerSlot > this.maxCapacity) {
    this.maxBookingsPerSlot = this.maxCapacity;
  }

  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }
  next();
});

const AppointmentType = mongoose.model(
  "AppointmentType",
  AppointmentTypeSchema
);

export default AppointmentType;
