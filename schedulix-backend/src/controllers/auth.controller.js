import bcrypt from "bcrypt";
import env from "../config/env.js";
import User from "../models/User.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../utils/email.js";
import { ApiError, asyncHandler, toPublicUser } from "../utils/helpers.js";
import {
  createJWT,
  generateOTP,
  generateRandomToken,
  hashToken,
  verificationPayload
} from "../utils/token.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const LINK_TTL_MS = 15 * 60 * 1000;
const validSignupRoles = ["customer", "organiser"];
const sensitiveUserFields =
  "+passwordHash +otp +otpExpiry +verificationToken +verificationTokenExpiry +resetOTP +resetOTPExpiry +resetToken +resetTokenExpiry";

const assertPassword = (password) => {
  if (!password || String(password).length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }
};

const authResponse = (user) => ({
  token: createJWT(user),
  user: toPublicUser(user)
});

const issueVerificationChallenge = (user) => {
  const { rawToken, hashedToken, otp } = verificationPayload();

  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  user.verificationToken = hashedToken;
  user.verificationTokenExpiry = new Date(Date.now() + LINK_TTL_MS);

  const link = `${env.apiBaseUrl}/auth/verify-link?token=${encodeURIComponent(
    rawToken
  )}`;

  return { otp, link };
};

const clearVerificationFields = (user) => {
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
};

const clearResetFields = (user) => {
  user.resetOTP = undefined;
  user.resetOTPExpiry = undefined;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role = "customer" } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "name, email, and password are required.");
  }

  if (!validSignupRoles.includes(role)) {
    throw new ApiError(400, "Invalid role.");
  }

  assertPassword(password);

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

  if (existingUser) {
    throw new ApiError(409, "Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    isActive: false
  });

  const verification = issueVerificationChallenge(user);
  await user.save();
  await sendVerificationEmail({
    to: user.email,
    otp: verification.otp,
    link: verification.link
  });

  res.status(201).json({
    message: "Signup successful. Verify your account using OTP or email link.",
    userId: user._id
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { userId, email, otp } = req.body;

  if ((!userId && !email) || !otp) {
    throw new ApiError(400, "userId or email, and otp are required.");
  }

  const query = userId
    ? { _id: userId }
    : { email: String(email).trim().toLowerCase() };
  const user = await User.findOne(query).select(sensitiveUserFields);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!user.otp || user.otp !== String(otp) || user.otpExpiry < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  user.isActive = true;
  clearVerificationFields(user);
  await user.save();

  res.json(authResponse(user));
});

export const verifyLink = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Verification token is required.");
  }

  const user = await User.findOne({
    verificationToken: hashToken(String(token)),
    verificationTokenExpiry: { $gt: new Date() }
  }).select(sensitiveUserFields);

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token.");
  }

  user.isActive = true;
  clearVerificationFields(user);
  await user.save();

  res.json(authResponse(user));
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { userId, email } = req.body;

  if (!userId && !email) {
    throw new ApiError(400, "userId or email is required.");
  }

  const query = userId
    ? { _id: userId }
    : { email: String(email).trim().toLowerCase() };
  const user = await User.findOne(query).select(sensitiveUserFields);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.isActive) {
    res.json({ message: "Account is already verified." });
    return;
  }

  const verification = issueVerificationChallenge(user);
  await user.save();
  await sendVerificationEmail({
    to: user.email,
    otp: verification.otp,
    link: verification.link
  });

  res.json({
    message: "A fresh OTP and verification link have been sent."
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "email and password are required.");
  }

  const user = await User.findOne({
    email: String(email).trim().toLowerCase()
  }).select(sensitiveUserFields);

  if (!user) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid credentials.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is not active. Please verify your email.");
  }

  res.json(authResponse(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "email is required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    sensitiveUserFields
  );

  if (user) {
    const resetOTP = generateOTP();
    const rawToken = generateRandomToken();

    user.resetOTP = resetOTP;
    user.resetOTPExpiry = new Date(Date.now() + OTP_TTL_MS);
    user.resetToken = hashToken(rawToken);
    user.resetTokenExpiry = new Date(Date.now() + LINK_TTL_MS);
    await user.save();

    const link = `${env.apiBaseUrl}/auth/reset-password-link?token=${encodeURIComponent(
      rawToken
    )}`;

    await sendPasswordResetEmail({
      to: normalizedEmail,
      otp: resetOTP,
      link
    });
  }

  res.json({
    message: "If the email exists, password reset instructions have been sent."
  });
});

export const resetPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "email, otp, and newPassword are required.");
  }

  assertPassword(newPassword);

  const user = await User.findOne({
    email: String(email).trim().toLowerCase()
  }).select(sensitiveUserFields);

  if (
    !user ||
    !user.resetOTP ||
    user.resetOTP !== String(otp) ||
    user.resetOTPExpiry < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired reset OTP.");
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  clearResetFields(user);
  await user.save();

  res.json({ message: "Password reset successful." });
});

export const resetPasswordLink = asyncHandler(async (req, res) => {
  const token = req.body.token || req.query.token;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, "token and newPassword are required.");
  }

  assertPassword(newPassword);

  const user = await User.findOne({
    resetToken: hashToken(String(token)),
    resetTokenExpiry: { $gt: new Date() }
  }).select(sensitiveUserFields);

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token.");
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  clearResetFields(user);
  await user.save();

  res.json({ message: "Password reset successful." });
});
