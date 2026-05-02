import dotenv from "dotenv";

dotenv.config();

const cleanEnv = (value) => {
  if (value === undefined || value === null) return "";

  const trimmed = String(value).trim();
  return trimmed.replace(/^['"]|['"]$/g, "");
};

const readFirst = (...keys) => {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);
    if (value) return value;
  }

  return "";
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

const normalizeUrlCandidate = (value) => {
  const normalized = cleanEnv(value);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `https://${normalized}`;
};

const normalizeBaseUrl = (value, fallback) => {
  const normalized = normalizeUrlCandidate(value || fallback);
  return normalized ? normalized.replace(/\/+$/, "") : "";
};

const corsOrigin = readFirst("CORS_ORIGIN") || "*";
const firstCorsOrigin =
  corsOrigin === "*"
    ? ""
    : corsOrigin
        .split(",")
        .map((origin) => cleanEnv(origin))
        .find(Boolean) || "";

const smtpHost = readFirst("SMTP_HOST", "EMAIL_HOST", "MAIL_HOST");
const smtpPort = readFirst("SMTP_PORT", "EMAIL_PORT", "MAIL_PORT");
const smtpUser = readFirst("SMTP_USER", "EMAIL_USER", "MAIL_USER");
const smtpPass = readFirst("SMTP_PASS", "EMAIL_PASS", "MAIL_PASS");
const smtpSecure = readFirst("SMTP_SECURE", "EMAIL_SECURE", "MAIL_SECURE");
const nodeEnv = readFirst("NODE_ENV") || "development";
const inferredClientBaseUrl =
  readFirst(
    "CLIENT_BASE_URL",
    "APP_BASE_URL",
    "WEB_BASE_URL",
    "FRONTEND_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
    "RAILWAY_PUBLIC_DOMAIN"
  ) ||
  firstCorsOrigin;
const defaultEmailFrom = smtpUser
  ? `Schedulix <${smtpUser}>`
  : "Schedulix <no-reply@schedulix.local>";
const resolvedEmailFrom = readFirst("EMAIL_FROM", "SMTP_FROM", "MAIL_FROM");
const resendApiKey = readFirst("RESEND_API_KEY");
const emailProvider = (
  readFirst("EMAIL_PROVIDER") || (resendApiKey ? "resend" : "smtp")
).toLowerCase();
const emailFrom =
  nodeEnv === "production" &&
  (!resolvedEmailFrom || /\.local>?$/i.test(resolvedEmailFrom))
    ? defaultEmailFrom
    : resolvedEmailFrom || defaultEmailFrom;

export const env = {
  nodeEnv,
  port: toNumber(readFirst("PORT"), 5000),
  mongoUri:
    readFirst("MONGO_URI", "DATABASE_URL") || "mongodb://127.0.0.1:27017/schedulix",
  jwtSecret:
    readFirst("JWT_SECRET") || "replace_with_a_long_random_secret_for_production",
  jwtExpiresIn: readFirst("JWT_EXPIRES_IN") || "7d",
  apiBaseUrl: normalizeBaseUrl(
    readFirst(
      "API_BASE_URL",
      "BACKEND_URL",
      "PUBLIC_API_URL",
      "RENDER_EXTERNAL_URL",
      "RAILWAY_PUBLIC_DOMAIN",
      "VERCEL_URL"
    ),
    "http://localhost:5000"
  ),
  clientBaseUrl: normalizeBaseUrl(inferredClientBaseUrl, "http://localhost:3000"),
  corsOrigin,
  emailFrom,
  emailProvider,
  emailTimeoutMs: toNumber(readFirst("EMAIL_TIMEOUT_MS"), 15000),
  smtp: {
    host: smtpHost,
    port: toNumber(smtpPort, 587),
    user: smtpUser,
    pass: smtpPass,
    secure:
      smtpSecure === ""
        ? toNumber(smtpPort, 587) === 465
        : toBoolean(smtpSecure, false)
  },
  resend: {
    apiKey: resendApiKey,
    apiUrl: normalizeBaseUrl(readFirst("RESEND_API_URL"), "https://api.resend.com")
  },
  bcryptSaltRounds: toNumber(readFirst("BCRYPT_SALT_ROUNDS"), 12),
  defaultAdmin: {
    enabled: toBoolean(readFirst("DEFAULT_ADMIN_ENABLED"), true),
    name: readFirst("DEFAULT_ADMIN_NAME") || "Admin",
    email: (readFirst("DEFAULT_ADMIN_EMAIL") || "admin@schedulix.local")
      .trim()
      .toLowerCase(),
    password: readFirst("DEFAULT_ADMIN_PASSWORD") || "admin@123"
  }
};

if (
  env.nodeEnv === "production" &&
  env.jwtSecret === "replace_with_a_long_random_secret_for_production"
) {
  throw new Error("JWT_SECRET must be set to a strong secret in production.");
}

export default env;
