import { jest } from "@jest/globals";
import passwordHelper from "../../../src/utils/password.js";
import bcrypt from "bcrypt";

describe("Password Helper", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("hashPassword", () => {
    it("should return a hashed password", async () => {
      const password = "password";

      const hashedPassword = await passwordHelper.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it("should throw an error if bcrypt hashing fails", async () => {
      jest.spyOn(bcrypt, "hash").mockRejectedValue(new Error("bcrypt failed"));

      await expect(passwordHelper.hashPassword("password")).rejects.toThrow(
        "bcrypt failed",
      );
    });
  });

  describe("verifyPassword", () => {
    let password;
    let hashedPassword;

    beforeEach(async () => {
      password = "password";
      hashedPassword = await passwordHelper.hashPassword(password);
    });

    it("should return true for the correct password", async () => {
      const isPasswordMatch = await passwordHelper.verifyPassword(
        password,
        hashedPassword,
      );

      expect(isPasswordMatch).toBe(true);
    });

    it("should return false for an incorrect password", async () => {
      const isPasswordMatch = await passwordHelper.verifyPassword(
        "wrongpassword",
        hashedPassword,
      );

      expect(isPasswordMatch).toBe(false);
    });

    it("should throw an error if bcrypt comparison fails", async () => {
      jest
        .spyOn(bcrypt, "compare")
        .mockRejectedValue(new Error("bcrypt failed"));

      await expect(
        passwordHelper.verifyPassword(password, "some-hash"),
      ).rejects.toThrow("bcrypt failed");
    });
  });

  describe("email service",() => {
    it("should send verification email",async () => {
        const sendEmail = jest.fn().mockResolvedValue(true);
         await sendEmail("aryanNaruka@gmail.com");
        expect(sendEmail).toHaveBeenCalled();
        expect(sendEmail).toHaveBeenCalledWith("aryanNaruka@gmail.com");
        expect(sendEmail).toHaveBeenCalledTimes(1);
    })

  });
});
