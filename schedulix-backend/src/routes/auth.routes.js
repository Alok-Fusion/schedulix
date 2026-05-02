import express from "express";
import {
  forgotPassword,
  login,
  resendVerification,
  resetPasswordLink,
  resetPasswordOtp,
  signup,
  verifyLink,
  verifyOtp
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-verification", resendVerification);
router.get("/verify-link", verifyLink);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-otp", resetPasswordOtp);
router.post("/reset-password-link", resetPasswordLink);

export default router;
