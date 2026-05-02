import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";
import { ApiError, asyncHandler } from "../utils/helpers.js";

const readToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return undefined;
  return header.slice(7);
};

export const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required.");
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, "Invalid or expired token.");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is inactive or no longer exists.");
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user?.isActive) req.user = user;
  } catch {
    req.user = undefined;
  }

  next();
});
