import request from "supertest";
import app from "../../../src/app.js";
import transporter from "../../../src/config/email.js";
import pool from "../../../src/config/db.js";
import { jest } from "@jest/globals";
import redisClient from "../../../src/config/redis.js";

describe("POST /v1/auth/register", () => {
  let testmail;

  afterEach(async () => {
    if (testmail) {
      const result = await pool.query("DELETE FROM users WHERE email = $1", [
        testmail,
      ]);
    }
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }

    await pool.end();
  });

  it("should reject invalid registration data", async () => {
    const response = await request(app).post("/v1/auth/register").send({
      email: "invalid-email",
      password: "123",
    });

    console.log(response.status);
    console.log(response.body);

    expect(response.status).toBe(400);
  });

  it("should register the user ", async () => {
    // //arrange
    jest
      .spyOn(transporter, "sendMail")
      .mockResolvedValue({ message: "email-sent-id" });

    testmail = `test${Date.now()}@test.com`;

    const user = {
      name: "Aryan Test",
      email: testmail,
      password: "StrongPassword@123",
    };

    //act
    const response = await request(app).post("/v1/auth/register").send(user);

    //assert
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Success");
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: testmail,
        subject: "Verify Your Email",
      }),
    );
  });
});
