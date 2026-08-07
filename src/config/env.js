import dotenv from "dotenv";

dotenv.config(
  process.env.NODE_ENV === "dev"
    ? { path: "src/env/.env.local" }
    : { path: "src/env/.env.prod" }
);