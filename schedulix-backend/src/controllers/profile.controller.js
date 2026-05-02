import bcrypt from "bcrypt";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/email.js";
import { buildVerificationLink } from "../utils/publicUrls.js";
import { ApiError, asyncHandler, parseDate, toPublicUser } from "../utils/helpers.js";
import { verificationPayload } from "../utils/token.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const LINK_TTL_MS = 15 * 60 * 1000;

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    profileImageUrl,
    gender,
    dateOfBirth,
    address,
    emergencyContactName,
    emergencyContactPhone,
    medicalRegistrationNo,
    doctorType,
    highestQualification,
    currentPassword,
    newPassword
  } = req.body;
  const user = await User.findById(req.user._id).select(
    "+passwordHash +otp +otpExpiry +verificationToken +verificationTokenExpiry"
  );

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (name !== undefined) {
    if (!String(name).trim()) {
      throw new ApiError(400, "name cannot be empty.");
    }
    user.name = name;
  }

  const assignString = (field, value) => {
    if (value !== undefined) {
      user[field] = String(value).trim();
    }
  };

  assignString("phone", phone);
  assignString("profileImageUrl", profileImageUrl);
  assignString("address", address);
  assignString("emergencyContactName", emergencyContactName);
  assignString("emergencyContactPhone", emergencyContactPhone);

  if (gender !== undefined) {
    user.gender = gender;
  }

  if (dateOfBirth !== undefined) {
    user.dateOfBirth = dateOfBirth ? parseDate(dateOfBirth) : undefined;
  }

  if (user.role === "organiser" || user.role === "admin") {
    assignString("medicalRegistrationNo", medicalRegistrationNo);
    assignString("doctorType", doctorType);
    assignString("highestQualification", highestQualification);
  }

  let verificationRequired = false;

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail }).select("_id");
      if (existing) {
        throw new ApiError(409, "Email is already in use.");
      }

      const { rawToken, hashedToken, otp } = verificationPayload();
      user.email = normalizedEmail;
      user.isActive = false;
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
      user.verificationToken = hashedToken;
      user.verificationTokenExpiry = new Date(Date.now() + LINK_TTL_MS);
      verificationRequired = true;

      const link = buildVerificationLink(rawToken);

      await sendVerificationEmail({
        to: normalizedEmail,
        otp,
        link
      });
    }
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      throw new ApiError(400, "currentPassword is required.");
    }

    if (String(newPassword).length < 8) {
      throw new ApiError(400, "newPassword must be at least 8 characters long.");
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new ApiError(401, "Current password is incorrect.");
    }

    user.passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  }

  await user.save();

  res.json({
    message: verificationRequired
      ? "Profile updated. Verify the new email address to reactivate the account."
      : "Profile updated.",
    user: toPublicUser(user)
  });
});
