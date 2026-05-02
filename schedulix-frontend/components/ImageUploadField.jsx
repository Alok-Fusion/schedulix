"use client";

import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { apiErrorMessage } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { uploadImageFile } from "@/lib/uploads";

export default function ImageUploadField({
  category,
  helperText,
  label,
  value,
  onChange
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => resolveMediaUrl(value), [value]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadImageFile(file, category);
      onChange(uploaded.url);
    } catch (uploadError) {
      setError(apiErrorMessage(uploadError));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImagePlus size={16} className="text-brand" />
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>

      <div className="rounded-[24px] border border-line bg-panel p-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="h-40 w-full rounded-[18px] object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-[18px] border border-dashed border-line bg-white text-sm text-muted">
            No image uploaded yet
          </div>
        )}

        <label className="btn btn-secondary mt-4 cursor-pointer">
          {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading" : "Choose image"}
          <input
            accept="image/*"
            className="hidden"
            type="file"
            onChange={handleFileChange}
          />
        </label>

        {helperText ? <p className="mt-3 text-xs text-muted">{helperText}</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
