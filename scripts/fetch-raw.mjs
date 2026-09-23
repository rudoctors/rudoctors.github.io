import fs from "node:fs";

const res = await fetch("https://rusdoctors.net/api/doctors", {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
});
if (!res.ok) throw new Error(`doctors ${res.status}`);
const doctors = await res.json();
fs.writeFileSync("scripts/rudoctors-raw.json", JSON.stringify(doctors, null, 2), "utf8");
console.log("doctors", doctors.length);
console.log("sample", doctors[0]?.full_name);

const res2 = await fetch("https://rusdoctors.net/api/clinics", {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
});
if (res2.ok) {
  const clinics = await res2.json();
  fs.writeFileSync("scripts/clinics-raw.json", JSON.stringify(clinics, null, 2), "utf8");
  console.log("clinics", clinics.length);
}
