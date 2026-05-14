import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://routinecharts.com",
  integrations: [react()],
  adapter: vercel(),
  output: "static",
});
