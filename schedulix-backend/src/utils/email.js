import nodemailer from "nodemailer";
import env from "../config/env.js";
import { ApiError } from "./helpers.js";

let cachedTransporter;
let transportVerified = false;

const isResendProvider = () => env.emailProvider === "resend";
const hasSmtpHost = () => Boolean(env.smtp.host);
const hasSmtpAuth = () => Boolean(env.smtp.user && env.smtp.pass);

const previewModeMessage = () =>
  "[email] SMTP is not configured. Emails will be generated locally only.";

const splitRecipients = (value) =>
  Array.isArray(value)
    ? value.filter(Boolean)
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const abortableDelay = (ms, controller) =>
  setTimeout(() => controller.abort(`Email request exceeded ${ms}ms`), ms);

const sendWithResend = async ({ to, subject, text, html }) => {
  if (!env.resend.apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing. Add it to the backend deployment environment."
    );
  }

  const controller = new AbortController();
  const timeout = abortableDelay(env.emailTimeoutMs, controller);

  try {
    const response = await fetch(`${env.resend.apiUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: splitRecipients(to),
        subject,
        text,
        html
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          `Resend API request failed with status ${response.status}`
      );
    }

    if (env.nodeEnv !== "test") {
      console.log(
        `[email] Sent "${subject}" through Resend to ${splitRecipients(to).join(", ")}`
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  if (env.nodeEnv === "test") {
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return cachedTransporter;
  }

  if (hasSmtpHost()) {
    cachedTransporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      requireTLS: !env.smtp.secure && env.smtp.port === 587,
      auth:
        hasSmtpAuth()
          ? {
              user: env.smtp.user,
              pass: env.smtp.pass
            }
          : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
    return cachedTransporter;
  }

  if (env.nodeEnv === "production") {
    throw new Error(
      "SMTP is not configured for production. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, and CLIENT_BASE_URL in your deployment environment."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true
  });
  return cachedTransporter;
};

export const verifyEmailTransport = async () => {
  if (transportVerified) return;

  if (
    env.nodeEnv === "production" &&
    /localhost/i.test(env.clientBaseUrl || "")
  ) {
    console.warn(
      "[email] WARNING: CLIENT_BASE_URL still points to localhost. " +
        "Set it to your deployed frontend URL so verification and reset links work in production."
    );
  }

  if (isResendProvider()) {
    if (!env.resend.apiKey) {
      throw new Error(
        "EMAIL_PROVIDER is set to resend but RESEND_API_KEY is missing."
      );
    }

    transportVerified = true;

    if (env.nodeEnv !== "test") {
      console.log(`[email] Resend API ready as ${env.emailFrom}`);
    }

    return;
  }

  const transporter = getTransporter();

  if (!hasSmtpHost()) {
    if (env.nodeEnv !== "test") {
      console.log(previewModeMessage());
    }
    transportVerified = true;
    return;
  }

  try {
    await transporter.verify();
    if (env.nodeEnv !== "test") {
      console.log(
        `[email] SMTP ready on ${env.smtp.host}:${env.smtp.port} as ${env.emailFrom}`
      );
    }
  } catch (err) {
    console.warn(
      `[email] WARNING: SMTP verification failed (${err.code || err.message}). ` +
        "The server will start anyway and attempt to send emails on demand."
    );
  }

  transportVerified = true;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (isResendProvider()) {
      return await sendWithResend({ to, subject, text, html });
    }

    const info = await getTransporter().sendMail({
      from: env.emailFrom,
      to,
      subject,
      text,
      html
    });

    if (!hasSmtpHost() && env.nodeEnv !== "test") {
      console.log("Email generated:", info.message);
    }

    if (hasSmtpHost() && env.nodeEnv !== "test") {
      const accepted = (info.accepted || []).join(", ");
      const rejected = (info.rejected || []).join(", ");

      console.log(
        `[email] Sent "${subject}" to ${accepted || String(to)}`
      );

      if (rejected) {
        console.warn(`[email] Rejected recipients: ${rejected}`);
      }
    }

    return info;
  } catch (error) {
    console.error("[email] Delivery failed", {
      subject,
      to,
      host: env.smtp.host || "preview",
      code: error.code,
      command: error.command,
      response: error.response
    });

    throw new ApiError(
      503,
      "Email delivery is unavailable right now. Check SMTP settings in the deployed backend."
    );
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderEmailButton = (href, label) => `
  <a
    href="${escapeHtml(href)}"
    style="display:inline-block;padding:12px 20px;border-radius:14px;background:#d7415d;color:#ffffff;text-decoration:none;font-weight:700;"
  >
    ${escapeHtml(label)}
  </a>
`;

export const renderEmailTemplate = ({
  eyebrow = "Schedulix",
  title,
  intro,
  sections = [],
  cta = null,
  footnote = ""
}) => `
  <div style="margin:0;padding:32px 16px;background:#f6f3ee;font-family:Arial,sans-serif;color:#231b24;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd4;border-radius:24px;overflow:hidden;">
      <div style="padding:28px 32px;background:#fff7f7;border-bottom:1px solid #f0e3e4;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9a6f76;">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:12px 0 0;font-size:28px;line-height:1.25;color:#231b24;">${escapeHtml(title)}</h1>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#5e5860;">${escapeHtml(intro)}</p>
      </div>
      <div style="padding:28px 32px;">
        ${sections
          .map(
            ({ label, value }) => `
              <div style="padding:14px 16px;border:1px solid #eee5de;border-radius:18px;background:#fcfaf8;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8b7f74;margin-bottom:6px;">${escapeHtml(label)}</div>
                <div style="font-size:16px;line-height:1.6;color:#231b24;font-weight:600;">${escapeHtml(value)}</div>
              </div>
            `
          )
          .join("")}
        ${cta ? `<div style="margin-top:20px;">${renderEmailButton(cta.href, cta.label)}</div>` : ""}
        ${
          footnote
            ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#7a7076;">${escapeHtml(footnote)}</p>`
            : ""
        }
      </div>
    </div>
  </div>
`;

export const sendVerificationEmail = async ({ to, otp, link }) => {
  await sendEmail({
    to,
    subject: "Verify your Schedulix account",
    text: `Your verification OTP is ${otp}. It expires in 10 minutes.\n\nVerify by link: ${link}`,
    html: renderEmailTemplate({
      eyebrow: "Account verification",
      title: "Verify your Schedulix account",
      intro: "Use the OTP below to activate your account and continue setting up your care workspace.",
      sections: [
        { label: "Verification OTP", value: otp },
        { label: "Expires in", value: "10 minutes" }
      ],
      cta: { href: link, label: "Verify account" },
      footnote: "If you did not start this signup, you can safely ignore this email."
    })
  });
};

export const sendPasswordResetEmail = async ({ to, otp, link }) => {
  await sendEmail({
    to,
    subject: "Reset your Schedulix password",
    text: `Your password reset OTP is ${otp}. It expires in 10 minutes.\n\nReset by link: ${link}`,
    html: renderEmailTemplate({
      eyebrow: "Password reset",
      title: "Reset your Schedulix password",
      intro: "Use the OTP below to securely reset your password and get back into your account.",
      sections: [
        { label: "Reset OTP", value: otp },
        { label: "Expires in", value: "10 minutes" }
      ],
      cta: { href: link, label: "Reset password" },
      footnote: "If you did not request a password reset, no changes will be made unless this OTP is used."
    })
  });
};
