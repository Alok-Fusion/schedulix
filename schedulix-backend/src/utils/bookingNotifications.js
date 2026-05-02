import Booking from "../models/Booking.js";
import { renderEmailTemplate, sendEmail } from "./email.js";

const uniqueRecipients = (items) =>
  [...new Set(items.filter(Boolean).map((value) => String(value).trim().toLowerCase()))];

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const formatMoney = (amount = 0, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2
    }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const bookingSummary = (booking) => ({
  title: booking.appointmentTypeId?.title || "Appointment",
  venue: booking.appointmentTypeId?.venue || "Venue shared by organiser",
  providerName:
    booking.providerId?.name ||
    booking.appointmentTypeId?.organiserId?.name ||
    "Provider",
  customerName: booking.customerId?.name || "Customer",
  start: formatDateTime(booking.startTime),
  amount: formatMoney(
    booking.priceAmount || 0,
    booking.currency || booking.appointmentTypeId?.currency || "INR"
  )
});

const lifecycleMessage = (booking, eventType, extra = {}) => {
  const summary = bookingSummary(booking);

  switch (eventType) {
    case "reserved":
      return {
        subject: `Slot reserved for ${summary.title}`,
        text: `${summary.customerName} has reserved ${summary.title} with ${summary.providerName} for ${summary.start} at ${summary.venue}. The current booking amount is ${summary.amount}.`
      };
    case "pending":
      return {
        subject: `Booking submitted for ${summary.title}`,
        text: `${summary.customerName} submitted ${summary.title} for ${summary.start} at ${summary.venue}. It is waiting for confirmation.`
      };
    case "confirmed":
      return {
        subject: `Booking confirmed for ${summary.title}`,
        text: `${summary.title} with ${summary.providerName} is confirmed for ${summary.start} at ${summary.venue}.`
      };
    case "cancelled":
      return {
        subject: `Booking cancelled for ${summary.title}`,
        text: `${summary.title} scheduled for ${summary.start} at ${summary.venue} has been cancelled.`
      };
    case "rescheduled":
      return {
        subject: `Booking rescheduled for ${summary.title}`,
        text: `${summary.title} has been moved from ${extra.previousStart || "the previous time"} to ${summary.start} at ${summary.venue}.`
      };
    case "payment":
      return {
        subject: `Payment recorded for ${summary.title}`,
        text: `Payment of ${summary.amount} has been recorded for ${summary.title} on ${summary.start} at ${summary.venue}.`
      };
    case "reminder":
      return {
        subject: `Reminder: ${summary.title} starts in 30 minutes`,
        text: `${summary.title} with ${summary.providerName} starts at ${summary.start} at ${summary.venue}. This is your 30-minute reminder.`
      };
    default:
      return {
        subject: `Booking update for ${summary.title}`,
        text: `${summary.title} is currently scheduled for ${summary.start} at ${summary.venue}.`
      };
  }
};

export const populateBookingNotificationContext = async (bookingId) =>
  Booking.findById(bookingId)
    .populate("customerId", "name email")
    .populate("providerId", "name email")
    .populate("appointmentTypeId", "title currency venue organiserId")
    .populate({
      path: "appointmentTypeId",
      populate: {
        path: "organiserId",
        select: "name email"
      }
    });

const sendToRecipients = async ({ recipients, subject, text, booking }) => {
  if (!recipients.length) return;

  const summary = bookingSummary(booking);

  await sendEmail({
    to: recipients.join(", "),
    subject,
    text,
    html: renderEmailTemplate({
      eyebrow: "Booking update",
      title: subject,
      intro: text,
      sections: [
        { label: "Service", value: summary.title },
        { label: "Provider", value: summary.providerName },
        { label: "Customer", value: summary.customerName },
        { label: "Date and time", value: summary.start },
        { label: "Venue", value: summary.venue },
        { label: "Amount", value: summary.amount }
      ]
    })
  });
};

export const sendBookingLifecycleEmails = async (bookingId, eventType, extra = {}) => {
  const booking = await populateBookingNotificationContext(bookingId);
  if (!booking) return;

  const message = lifecycleMessage(booking, eventType, extra);
  const recipients = uniqueRecipients([
    booking.customerId?.email,
    booking.providerId?.email,
    booking.appointmentTypeId?.organiserId?.email
  ]);

  await sendToRecipients({
    recipients,
    subject: message.subject,
    text: message.text,
    booking
  });
};

export const sendUpcomingReminderEmails = async (now = new Date()) => {
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

  const bookings = await Booking.find({
    status: "confirmed",
    startTime: { $gte: windowStart, $lte: windowEnd },
    reminderEmailSentAt: { $exists: false }
  }).select("_id");

  for (const booking of bookings) {
    await sendBookingLifecycleEmails(booking._id, "reminder");
    await Booking.updateOne(
      { _id: booking._id, reminderEmailSentAt: { $exists: false } },
      { $set: { reminderEmailSentAt: new Date() } }
    );
  }
};

let reminderLoopStarted = false;

export const startBookingReminderLoop = () => {
  if (process.env.NODE_ENV === "test") return;
  if (reminderLoopStarted) return;
  reminderLoopStarted = true;

  const run = async () => {
    try {
      await sendUpcomingReminderEmails();
    } catch (error) {
      console.error("Failed to send appointment reminders:", error);
    }
  };

  run();
  setInterval(run, 5 * 60 * 1000);
};

export const queueBookingLifecycleEmails = (bookingId, eventType, extra = {}) => {
  if (process.env.NODE_ENV === "test") return;
  sendBookingLifecycleEmails(bookingId, eventType, extra).catch((error) => {
    console.error(`Failed to send ${eventType} booking email:`, error);
  });
};
