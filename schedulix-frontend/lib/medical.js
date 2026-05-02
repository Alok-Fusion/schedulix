export const doctorTypes = [
  "Dentist",
  "Dermatologist",
  "General Physician",
  "Cardiologist",
  "Orthopedic",
  "Pediatrician",
  "Other"
];

export const fallbackDoctorType = "General Physician";

export const normalizeDoctorType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    doctorTypes.find((type) => type.toLowerCase() === normalized) || ""
  );
};

export const specializationOptionsForDoctorType = (doctorType) => {
  const normalized = normalizeDoctorType(doctorType);
  return [normalized || fallbackDoctorType];
};
