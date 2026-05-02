import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import { createServer } from "http";
import { initSocket } from "./socket.js";
import { startBookingReminderLoop } from "./utils/bookingNotifications.js";
import seedDefaultAdmin from "./utils/seedAdmin.js";

const start = async () => {
  await connectDB();
  await seedDefaultAdmin();
  startBookingReminderLoop();
  const server = createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`Schedulix API running on port ${env.port}`);
  });
};

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

start().catch((error) => {
  console.error("Failed to start Schedulix API:", error);
  process.exit(1);
});
