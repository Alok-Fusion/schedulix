import { API_BASE_URL } from "@/lib/api";

const apiOrigin = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

export const resolveMediaUrl = (value) => {
  if (!value) return "";
  if (!apiOrigin) return value;

  try {
    const url = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(value, apiOrigin);

    if (url.pathname.startsWith("/uploads/")) {
      return `${apiOrigin}${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return value;
  }
};
