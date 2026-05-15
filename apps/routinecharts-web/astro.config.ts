import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://routinecharts.com",
  integrations: [react()],
  adapter: vercel({
    // ISR: server-rendered pages are cached at Vercel's edge as static
    // HTML (Googlebot-friendly), regenerated after `expiration` seconds.
    // The worker pings x-prerender-revalidate with bypassToken on publish
    // so new daily posts go live immediately, not after the 24h window.
    isr: {
      expiration: 60 * 60 * 24,
      bypassToken: process.env.ISR_BYPASS_TOKEN,
      exclude: [/^\/api\/.+/],
    },
  }),
  output: "server",
});
