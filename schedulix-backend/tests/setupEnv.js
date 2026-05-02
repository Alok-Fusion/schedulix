process.env.NODE_ENV = "test";
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/schedulix_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "schedulix-test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
process.env.API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
process.env.CLIENT_BASE_URL =
  process.env.CLIENT_BASE_URL || "http://localhost:3000";
process.env.DEFAULT_ADMIN_ENABLED = "false";
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || "4";
