import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { ApiError } from "./helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRootDir = path.resolve(__dirname, "../../uploads");

const ensureDirectory = (directory) => {
  fs.mkdirSync(directory, { recursive: true });
};

ensureDirectory(uploadRootDir);

const safeCategory = (value) => {
  const normalized = String(value || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");

  return normalized || "general";
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const category = safeCategory(req.body.category || req.query.category);
    const destinationDir = path.join(uploadRootDir, category);
    ensureDirectory(destinationDir);
    callback(null, destinationDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const fileFilter = (_req, file, callback) => {
  if (!file.mimetype?.startsWith("image/")) {
    callback(new ApiError(400, "Only image uploads are allowed."));
    return;
  }

  callback(null, true);
};

export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single("file");

const requestOrigin = (req) => {
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const protocol = (forwardedProto || req.protocol || "http").split(",")[0].trim();
  const host = (forwardedHost || req.get("host") || "").split(",")[0].trim();

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
};

export const publicUploadUrl = (req, filePath) => {
  const relativePath = path.relative(uploadRootDir, filePath).split(path.sep).join("/");
  const origin = requestOrigin(req);

  return origin
    ? `${origin}/uploads/${relativePath}`
    : `/uploads/${relativePath}`;
};
