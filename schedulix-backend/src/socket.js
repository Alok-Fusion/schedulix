import { Server } from "socket.io";
import env from "./config/env.js";

const corsOrigin =
  env.corsOrigin === "*"
    ? "*"
    : env.corsOrigin.split(",").map((origin) => origin.trim());

let io = null;

export const initSocket = (server) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: corsOrigin
    }
  });

  io.on("connection", (socket) => {
    socket.emit("schedulix_ready", {
      connectedAt: new Date().toISOString()
    });
  });

  return io;
};

export const getIO = () => io;

const emit = (eventName, payload) => {
  io?.emit(eventName, payload);
};

export const emitSlotUpdate = (payload) => {
  emit("slot_update", payload);
};

export const emitBookingCreated = (payload) => {
  emit("booking_created", payload);
};

export const emitBookingCancelled = (payload) => {
  emit("booking_cancelled", payload);
};

export { io };
