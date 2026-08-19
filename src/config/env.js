import dotenv from "dotenv";
const envPaths = {
  dev: "src/env/.env.local",
  test: "src/env/.env.test",
  prod: "src/env/.env.prod"
};

dotenv.config({ path: envPaths[process.env.NODE_ENV] || envPaths.prod });
