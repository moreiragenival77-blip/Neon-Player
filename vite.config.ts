// @lovable.dev/vite-tanstack-config already includes the standard React, Tailwind,
// TanStack Start, and path-alias plugins. Keep this wrapper to avoid duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // Neon Player is packaged inside Capacitor, so ship a static client shell.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
        retryCount: 1,
      },
    },
  },
});
