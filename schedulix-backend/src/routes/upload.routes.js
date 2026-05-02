import express from "express";
import { uploadImage } from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/helpers.js";
import { imageUpload } from "../utils/uploads.js";

const router = express.Router();

router.use(protect);

router.post(
  "/image",
  asyncHandler(async (req, res, next) => {
    await new Promise((resolve, reject) => {
      imageUpload(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    next();
  }),
  uploadImage
);

export default router;
