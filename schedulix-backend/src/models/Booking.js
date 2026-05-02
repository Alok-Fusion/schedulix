import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    appointmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppointmentType",
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    startTime: {
      type: Date,
      required: true,
      index: true
    },
    endTime: {
      type: Date,
      required: true,
      index: true
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: ["reserved", "pending", "confirmed", "cancelled", "rescheduled"],
      default: "reserved",
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "failed"],
      default: "unpaid",
      index: true
    },
    priceAmount: {
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
    paymentMethod: {
      type: String,
      trim: true,
      maxlength: 80
    },
    problemImageUrl: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    reminderEmailSentAt: {
      type: Date
    },
    paidAt: {
      type: Date
    },
    answers: {
      type: [AnswerSchema],
      default: []
    },
    reservedAt: {
      type: Date
    },
    cancelledAt: Date,
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    }
  },
  {
    timestamps: true
  }
);

BookingSchema.pre("validate", function validateBooking(next) {
  if (this.startTime >= this.endTime) {
    next(new Error("Booking startTime must be before endTime."));
    return;
  }

  if (this.status === "reserved" && !this.reservedAt) {
    this.reservedAt = new Date();
  }

  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }

  next();
});

BookingSchema.index({
  appointmentTypeId: 1,
  providerId: 1,
  startTime: 1,
  endTime: 1,
  status: 1
});

BookingSchema.index({ customerId: 1, startTime: -1 });

BookingSchema.index(
  { reservedAt: 1 },
  {
    expireAfterSeconds: 300,
    partialFilterExpression: { status: "reserved" }
  }
);

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
