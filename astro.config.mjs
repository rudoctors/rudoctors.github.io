// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://rudoctors.github.io",
  trailingSlash: "always",
  redirects: {
    "/doctors/prahov-aleksey": "/doctors/aleksej-pravov",
    "/doctors/yanik-elena": "/doctors/elena-ianik",
    "/doctors/pozharickaya-elena": "/doctors/elena-pozharickaya",
    "/doctors/shtuchnyy-igor": "/doctors/igor-shtuchnyy",
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/admin/") &&
        !page.includes("/leave-review") &&
        !page.includes("/add-doctor") &&
        !page.includes("/packages"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
