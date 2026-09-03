import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load local test environment variables explicitly
dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    globals: true, // Enables global 'describe', 'it', 'expect' without imports
    environment: "node",
    include: ["tests/**/*.test.js"],
    fileParallelism: false, // Disables running test files concurrently
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
});
