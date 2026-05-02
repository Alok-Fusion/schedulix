import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

export const generateOTP = () =>
  crypto.randomInt(100000, 1000000).toString();

export const generateRandomToken = () => crypto.randomBytes(32).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createJWT = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );

export const verificationPayload = () => {
  const rawToken = generateRandomToken();
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    otp: generateOTP()
  };
};
