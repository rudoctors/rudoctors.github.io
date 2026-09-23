const urls = [
  "https://rudoctors.github.io/specialties/therapist/",
  "https://rudoctors.github.io/cities/Belgrade/",
  "https://rudoctors.github.io/doctors/aleksandra-yudina/",
];
for (const u of urls) {
  const r = await fetch(u);
  const t = await r.text();
  const links = (t.match(/href="\/doctors\//g) || []).length;
  const moj = (t.match(/Ð./g) || []).length;
  const cyr = (t.match(/[А-Яа-я]/g) || []).length;
  console.log(r.status, new URL(u).pathname, { links, moj, cyr });
}
