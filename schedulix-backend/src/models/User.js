import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["customer", "organiser", "admin"],
      default: "customer",
      index: true
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30
    },
    profileImageUrl: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say", ""],
      default: ""
    },
    dateOfBirth: {
      type: Date
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: 30
    },
    medicalRegistrationNo: {
      type: String,
      trim: true,
      maxlength: 80,
      index: true
    },
    doctorType: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true
    },
    highestQualification: {
      type: String,
      trim: true,
      maxlength: 180
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true
    },
    otp: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    },
    verificationToken: {
      type: String,
      select: false,
      index: true
    },
    verificationTokenExpiry: {
      type: Date,
      select: false
    },
    resetOTP: {
      type: String,
      select: false
    },
    resetOTPExpiry: {
      type: Date,
      select: false
    },
    resetToken: {
      type: String,
      select: false,
      index: true
    },
    resetTokenExpiry: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", UserSchema);

export default User;
