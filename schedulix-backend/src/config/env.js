import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/schedulix",
  jwtSecret: process.env.JWT_SECRET || "replace_with_a_long_random_secret_for_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  clientBaseUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  emailFrom: process.env.EMAIL_FROM || "Schedulix <no-reply@schedulix.local>",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: toBoolean(process.env.SMTP_SECURE, false)
  },
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  defaultAdmin: {
    enabled: toBoolean(process.env.DEFAULT_ADMIN_ENABLED, true),
    name: process.env.DEFAULT_ADMIN_NAME || "Admin",
    email: (process.env.DEFAULT_ADMIN_EMAIL || "admin@schedulix.local")
      .trim()
      .toLowerCase(),
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin@123"
  }
};

if (
  env.nodeEnv === "production" &&
  env.jwtSecret === "replace_with_a_long_random_secret_for_production"
) {
  throw new Error("JWT_SECRET must be set to a strong secret in production.");
}

export default env;
