import api from "@/lib/api";

const triggerBrowserDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const downloadDocument = async (booking, documentType, filename) => {
  if (!booking?._id) return;

  try {
    const { data } = await api.get(`/bookings/${booking._id}/pdf`, {
      params: { document: documentType },
      responseType: "blob"
    });

    triggerBrowserDownload(data, filename);
  } catch (error) {
    console.error(`Failed to download ${documentType} PDF`, error);
    if (typeof window !== "undefined") {
      window.alert("Could not download the PDF right now.");
    }
  }
};

export const downloadAppointmentReceipt = async (booking) => {
  const filename = `schedulix-appointment-${booking?._id || "receipt"}.pdf`;
  await downloadDocument(booking, "appointment", filename);
};

export const downloadPaymentReceipt = async (booking) => {
  const filename = `schedulix-payment-${booking?._id || "receipt"}.pdf`;
  await downloadDocument(booking, "payment", filename);
};
