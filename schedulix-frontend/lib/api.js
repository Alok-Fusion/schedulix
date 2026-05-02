import axios from "axios";

const resolveApiBaseUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host === "schedulix-sage.vercel.app") {
      return "https://schedulix-99ug.onrender.com";
    }

    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://schedulix-99ug.onrender.com";
    }
  }

  return "http://localhost:5000";
};

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const persisted = window.localStorage.getItem("schedulix-auth");

  if (persisted) {
    try {
      const parsed = JSON.parse(persisted);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      window.localStorage.removeItem("schedulix-auth");
    }
  }

  return config;
});

export const apiErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

export default api;
