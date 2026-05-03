import mongoose from "mongoose";
import env from "./env.js";

mongoose.set("strictQuery", true);

export const connectDB = async () => {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  const isCloudUri = /^mongodb\+srv:\/\//i.test(env.mongoUri) ||
    !/localhost|127\.0\.0\.1/i.test(env.mongoUri);

  const opts = {
    autoIndex: env.nodeEnv !== "production",
  };

  if (isCloudUri) {
    opts.tls = true;
    opts.tlsAllowInvalidCertificates = env.nodeEnv === "production";
  }

  await mongoose.connect(env.mongoUri, opts);
};

export default connectDB;
