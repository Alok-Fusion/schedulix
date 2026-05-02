import mongoose from "mongoose";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const WeeklySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6
    },
    startTime: {
      type: String,
      required: true,
      match: timeRegex
    },
    endTime: {
      type: String,
      required: true,
      match: timeRegex
    },
    capacityOverride: {
      type: Number,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const FlexSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: timeRegex
    },
    endTime: {
      type: String,
      required: true,
      match: timeRegex
    },
    capacityOverride: {
      type: Number,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
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
    scheduleType: {
      type: String,
      enum: ["weekly", "flexible"],
      required: true
    },
    weeklySlots: {
      type: [WeeklySlotSchema],
      default: []
    },
    flexSlots: {
      type: [FlexSlotSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const minutes = (value) => {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
};

ScheduleSchema.pre("validate", function validateSchedule(next) {
  const slots = this.scheduleType === "weekly" ? this.weeklySlots : this.flexSlots;
  if (!slots.length) {
    next(new Error("At least one schedule slot is required."));
    return;
  }

  const invalidSlot = slots.find(
    (slot) =>
      slot.startTime &&
      slot.endTime &&
      minutes(slot.startTime) >= minutes(slot.endTime)
  );

  if (invalidSlot) {
    next(new Error("Schedule slot startTime must be before endTime."));
    return;
  }

  next();
});

ScheduleSchema.index({ appointmentTypeId: 1, providerId: 1 }, { unique: true });

const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;
