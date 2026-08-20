import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../../src/app";

describe("/v1/auth/password-reset", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
  });
  it("should reset password", async () => {
    const response = await request(app).post("/v1/auth/password-reset").send({
      oldPassword: "Aryan@2005",
      newPassword: "12345678",
    });
    expect(response.status).toBe(200);
  });
  it("should not give oldPassword not match", async () => {
    const response = await request(app).post("/v1/auth/password-reset").send({
      oldPassword: "Aryan@2005.",
      newPassword: "12345678",
    });
    expect(response.status).toBe(400);
  });
});
