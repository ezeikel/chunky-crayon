import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sanity from "@sanity/astro";

export default defineConfig({
  site: "https://routinecharts.com",
  integrations: [
    sanity({
      projectId: "zeezp95x",
      dataset: "routinecharts",
      apiVersion: "2026-01-01",
      useCdn: true,
      studioBasePath: "/studio",
    }),
    react(),
  ],
  adapter: vercel(),
  output: "server",
});
