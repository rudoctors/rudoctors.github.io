// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://rudoctors.com",
  trailingSlash: "always",
  redirects: {
    "/doctors/dr-marko-sente": "/doctors/marko-sente/",
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
    "/cities/belgrade/ginekolog": "/cities/belgrade/gynecologist/",
    "/cities/novi-sad/ginekolog": "/cities/novi-sad/gynecologist/",
    "/cities/belgrade/psihiatr": "/cities/belgrade/psychiatrist/",
    "/cities/novi-sad/psihiatr": "/cities/novi-sad/psychiatrist/",
    "/cities/belgrade/terapevt": "/cities/belgrade/therapist/",
    "/cities/novi-sad/terapevt": "/cities/novi-sad/therapist/",
    "/cities/belgrade/kardiolog": "/cities/belgrade/cardiologist/",
    "/cities/novi-sad/kardiolog": "/cities/novi-sad/cardiologist/",
    "/cities/belgrade/dermatolog": "/cities/belgrade/dermatologist/",
    "/cities/novi-sad/dermatolog": "/cities/novi-sad/dermatologist/",
    "/cities/belgrade/nevrolog": "/cities/belgrade/neurologist/",
    "/cities/novi-sad/nevrolog": "/cities/novi-sad/neurologist/",
    "/cities/belgrade/hirurg": "/cities/belgrade/surgeon/",
    "/cities/novi-sad/hirurg": "/cities/novi-sad/surgeon/",
    "/cities/belgrade/lor": "/cities/belgrade/otorhinolaryngologist/",
    "/cities/novi-sad/lor": "/cities/novi-sad/otorhinolaryngologist/",
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
