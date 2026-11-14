
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR server entry.
    server: { entry: "server" },
  },

  nitro: {
    cloudflare: {
      wrangler: {
        name: "jobyn-landing-page",
      },
    },
  },
});
