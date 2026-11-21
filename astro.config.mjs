// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://rudoctors.com",
  trailingSlash: "always",
  redirects: {
    "/doctors/konstantina-ivanovna-kovaleva": "/doctors/konstantin-kovalev/",
    "/doctors/datienko-elena": "/doctors/nonko-elena-viktorovna/",
    "/doctors/prahov-aleksey": "/doctors/aleksej-pravov/",
    "/doctors/yanik-elena": "/doctors/elena-ianik/",
    "/doctors/pozharickaya-elena": "/doctors/elena-pozharickaya/",
    "/doctors/shtuchnyy-igor": "/doctors/igor-shtuchnyy/",
    "/cities/belgrade/uzi": "/cities/belgrade/ultrasound_diagnostics/",
    "/cities/novi-sad/uzi": "/cities/novi-sad/ultrasound_diagnostics/",
    "/cities/belgrade/stomatolog": "/cities/belgrade/dentist/",
    "/cities/novi-sad/stomatolog": "/cities/novi-sad/dentist/",
    "/cities/belgrade/pediatr": "/cities/belgrade/pediatrician/",
    "/cities/novi-sad/pediatr": "/cities/novi-sad/pediatrician/",
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
