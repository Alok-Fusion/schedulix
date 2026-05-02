import request from "supertest";
import app from "../src/app.js";
import {
  authHeader,
  createActiveUser,
  createPublishedAppointment
} from "./helpers.js";

describe("Booking conflict protection", () => {
  it("should prevent double booking for the same slot", async () => {
    const { user: organiser } = await createActiveUser({
      role: "organiser",
      email: "doctor-conflict@schedulix.test",
      doctorType: "Dentist"
    });
    const { token: customerOneToken } = await createActiveUser({
      role: "customer",
      email: "customer-one@schedulix.test"
    });
    const { token: customerTwoToken } = await createActiveUser({
      role: "customer",
      email: "customer-two@schedulix.test"
    });
    const { appointment, schedule, startTime } = await createPublishedAppointment({
      organiser
    });

    const first = await request(app)
      .post("/bookings")
      .set(authHeader(customerOneToken))
      .send({
        appointmentTypeId: appointment._id.toString(),
        providerId: schedule.providerId.toString(),
        startTime: startTime.toISOString(),
        capacity: 1
      });

    const second = await request(app)
      .post("/bookings")
      .set(authHeader(customerTwoToken))
      .send({
        appointmentTypeId: appointment._id.toString(),
        providerId: schedule.providerId.toString(),
        startTime: startTime.toISOString(),
        capacity: 1
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/Maximum bookings|capacity exceeded/i);
  });
});
