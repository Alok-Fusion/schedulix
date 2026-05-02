import { asyncHandler, ApiError } from "../utils/helpers.js";
import { publicUploadUrl } from "../utils/uploads.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    throw new ApiError(400, "Image file is required.");
  }

  res.status(201).json({
    message: "Image uploaded.",
    file: {
      url: publicUploadUrl(req, req.file.path),
      name: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size
    }
  });
});
