import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globalSetup: path.resolve(__dirname, "./helpers/global-setup.ts"),
    testTimeout: 30000,
  }
});
