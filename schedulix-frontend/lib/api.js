import axios from "axios";

const resolveApiBaseUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;

  // In the browser, use hostname-based detection for deployed sites
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host !== "localhost" && host !== "127.0.0.1") {
      // On deployed sites, prefer a non-localhost env var, otherwise use the Render URL
      if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
        return configured;
      }
      return "https://schedulix-99ug.onrender.com";
    }
  }

  // Local development — use env var or default
  return configured || "http://localhost:5000";
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
