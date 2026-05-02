import request from "supertest";
import app from "../src/app.js";
import {
  authHeader,
  createActiveUser,
  createPublishedAppointment
} from "./helpers.js";

describe("Booking API", () => {
  it("should create and confirm a booking", async () => {
    const { user: organiser } = await createActiveUser({
      role: "organiser",
      email: "doctor@schedulix.test",
      doctorType: "Dentist"
    });
    const { token: customerToken } = await createActiveUser({
      role: "customer",
      email: "patient@schedulix.test"
    });
    const { appointment, schedule, startTime } = await createPublishedAppointment({
      organiser
    });

    const createResponse = await request(app)
      .post("/bookings")
      .set(authHeader(customerToken))
      .send({
        appointmentTypeId: appointment._id.toString(),
        providerId: schedule.providerId.toString(),
        startTime: startTime.toISOString(),
        capacity: 1
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.booking.status).toBe("reserved");

    const confirmResponse = await request(app)
      .post(`/bookings/${createResponse.body.booking._id}/confirm`)
      .set(authHeader(customerToken))
      .send({
        answers: []
      });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.booking.status).toBe("confirmed");

    const pdfResponse = await request(app)
      .get(`/bookings/${createResponse.body.booking._id}/pdf`)
      .set(authHeader(customerToken));

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers["content-type"]).toMatch(/application\/pdf/);
  });
});
