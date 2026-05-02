import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";

describe("Auth API", () => {
  it("should sign up a new user", async () => {
    const response = await request(app).post("/auth/signup").send({
      name: "Test Customer",
      email: "customer@schedulix.test",
      password: "password123",
      role: "customer"
    });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBeTruthy();
  });

  it("should verify and login an organiser", async () => {
    const signup = await request(app).post("/auth/signup").send({
      name: "Dr Test",
      email: "organiser@schedulix.test",
      password: "password123",
      role: "organiser"
    });

    expect(signup.status).toBe(201);

    const user = await User.findOne({ email: "organiser@schedulix.test" }).select(
      "+otp"
    );

    const verify = await request(app).post("/auth/verify-otp").send({
      userId: signup.body.userId,
      otp: user.otp
    });

    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTruthy();
    expect(verify.body.user.role).toBe("organiser");

    const login = await request(app).post("/auth/login").send({
      email: "organiser@schedulix.test",
      password: "password123"
    });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.user.email).toBe("organiser@schedulix.test");
  });
});
