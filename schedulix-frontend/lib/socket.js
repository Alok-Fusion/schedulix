import { io } from "socket.io-client";
import { API_BASE_URL } from "@/lib/api";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ["websocket"]
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};
