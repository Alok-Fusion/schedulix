import api from "@/lib/api";

export const uploadImageFile = async (file, category = "general") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const { data } = await api.post("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return data.file;
};
