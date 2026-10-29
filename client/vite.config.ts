import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in development too, so session and CSRF cookies behave as in
    // production, where CloudFront serves /api/* from the API Lambda.
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
