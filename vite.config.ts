
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Keep the existing SSR server entry.
    server: { entry: "server" },
  },

  nitro: {
    cloudflare: {
      // The `wrangler` key is supported by Nitro at runtime but not declared
      // in the @lovable.dev/vite-tanstack-config type definitions.
      // @ts-expect-error — pre-existing config, not introduced by tailoring work
      wrangler: {
        name: "jobyn-landing-page",
        previews: {},
      },
    },
  },
});
