import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Enables global 'describe', 'it', 'expect' without imports
    environment: "node",
    include: ["tests/**/*.test.js"],
    fileParallelism: false, // Disables running test files concurrently
  },
});
