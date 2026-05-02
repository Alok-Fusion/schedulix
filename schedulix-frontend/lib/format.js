export const formatCurrency = (amount = 0, currency = "INR") => {
  const numericAmount = Number(amount) || 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "INR").toUpperCase(),
      maximumFractionDigits: numericAmount % 1 === 0 ? 0 : 2
    }).format(numericAmount);
  } catch {
    return `${String(currency || "INR").toUpperCase()} ${numericAmount.toFixed(2)}`;
  }
};

export const formatCount = (value = 0) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

export const formatDateOnly = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(new Date(value));
