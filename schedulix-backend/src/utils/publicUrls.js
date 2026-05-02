import env from "../config/env.js";

const appendPath = (baseUrl, path) => {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
};

export const buildVerificationLink = (token) =>
  `${appendPath(env.clientBaseUrl, "/verify-link")}?token=${encodeURIComponent(
    token
  )}`;

export const buildPasswordResetLink = (token) =>
  `${appendPath(env.clientBaseUrl, "/reset-password")}?token=${encodeURIComponent(
    token
  )}`;
