import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",                          // Giả lập browser DOM
    setupFiles: ["./tests/setup/vitest.setup.ts"], // Chạy trước mỗi test file
    include: ["tests/**/*.test.{ts,tsx}"],         // Quét cả unit + integration
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } }, // Alias @/ -> src/
});
