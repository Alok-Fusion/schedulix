import bcrypt from "bcrypt";
import env from "../config/env.js";
import User from "../models/User.js";

export const seedDefaultAdmin = async () => {
  if (!env.defaultAdmin.enabled) return;

  const passwordHash = await bcrypt.hash(
    env.defaultAdmin.password,
    env.bcryptSaltRounds
  );

  const existingAdmin = await User.findOne({
    email: env.defaultAdmin.email
  }).select("+passwordHash");

  if (existingAdmin) {
    existingAdmin.name = env.defaultAdmin.name;
    existingAdmin.role = "admin";
    existingAdmin.isActive = true;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.otp = undefined;
    existingAdmin.otpExpiry = undefined;
    existingAdmin.verificationToken = undefined;
    existingAdmin.verificationTokenExpiry = undefined;
    existingAdmin.resetOTP = undefined;
    existingAdmin.resetOTPExpiry = undefined;
    existingAdmin.resetToken = undefined;
    existingAdmin.resetTokenExpiry = undefined;
    await existingAdmin.save();

    console.log(`Default admin ready: ${env.defaultAdmin.email}`);
    return;
  }

  await User.create({
    name: env.defaultAdmin.name,
    email: env.defaultAdmin.email,
    passwordHash,
    role: "admin",
    isActive: true
  });

  console.log(`Default admin created: ${env.defaultAdmin.email}`);
};

export default seedDefaultAdmin;
