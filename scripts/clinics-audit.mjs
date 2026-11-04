import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "src", "data", "clinics", "registry.json");
const doctorsDir = path.join(root, "src", "data", "doctors");
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const verbose = args.has("--verbose");

const VERIFICATION = new Set(["unverified", "verified"]);
const PROVENANCE_KINDS = new Set(["doctor-workplace", "clinic-website", "official-registry", "manual"]);
const AUTHORITATIVE_KINDS = new Set(["clinic-website", "official-registry"]);
const GENERIC_TOKENS = new Set([
  "clinic",
  "clinics",
  "поликлиника",
  "клиника",
  "ordinacija",
  "ordinal",
  "dental",
  "dent",
  "center",
  "centar",
  "hospital",
  "bolnica",
  "medical",
  "medicinski",
]);

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}


function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenKey(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token && !GENERIC_TOKENS.has(token))
    .sort()
    .join("|");
}

function cityKey(value) {
  return normalize(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function authoritative(entries) {
  return entries.some(
    (entry) =>
      AUTHORITATIVE_KINDS.has(entry.kind) &&
      (isNonEmptyString(entry.ref) || isNonEmptyString(entry.url))
  );
}

function validateProvenance(entries, where) {
  if (!Array.isArray(entries)) {
    fail(`${where}: provenance must be an array`);
    return;
  }
  entries.forEach((entry, index) => {
    const at = `${where}.provenance[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`${at}: must be an object`);
      return;
    }
    if (!PROVENANCE_KINDS.has(entry.kind)) fail(`${at}.kind: invalid value "${entry.kind}"`);
    if (!isNonEmptyString(entry.ref) && !isNonEmptyString(entry.url)) {
      fail(`${at}: ref or url is required`);
    }
    if (!isIsoDate(entry.retrievedAt)) fail(`${at}.retrievedAt: expected YYYY-MM-DD`);
    if (entry.url !== undefined && !isNonEmptyString(entry.url)) fail(`${at}.url: must be non-empty when present`);
  });
}

function validateVerification(value, where) {
  if (!VERIFICATION.has(value?.verification)) {
    fail(`${where}.verification: expected "unverified" or "verified"`);
  }
  if (value?.verifiedAt !== null && !isIsoDate(value?.verifiedAt)) {
    fail(`${where}.verifiedAt: expected null or YYYY-MM-DD`);
  }
  if (value?.verifiedBy !== null && !isNonEmptyString(value?.verifiedBy)) {
    fail(`${where}.verifiedBy: expected null or non-empty string`);
  }
  if (value?.verification === "verified") {
    if (!isNonEmptyString(value?.verifiedAt)) fail(`${where}: verified entry requires verifiedAt`);
    if (!isNonEmptyString(value?.verifiedBy)) fail(`${where}: verified entry requires verifiedBy`);
    if (!authoritative(value?.provenance || [])) {
      fail(`${where}: verified entry requires clinic-website or official-registry provenance`);
    }
  }
}

function validateRegistry(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    fail("registry: root must be an object");
    return;
  }
  if (registry.schemaVersion !== 1) fail("registry.schemaVersion: expected 1");
  if (!isIsoDate(registry.updatedAt)) fail("registry.updatedAt: expected YYYY-MM-DD");
  if (!Array.isArray(registry.clinics)) {
    fail("registry.clinics: expected an array");
    return;
  }

  const clinicIds = new Set();
  const clinicKeys = new Set();
  const locationIds = new Set();
  const nameKeys = [];

  registry.clinics.forEach((clinic, clinicIndex) => {
    const at = `clinics[${clinicIndex}]`;
    if (!clinic || typeof clinic !== "object" || Array.isArray(clinic)) {
      fail(`${at}: must be an object`);
      return;
    }
    if (!isNonEmptyString(clinic.id) || !/^[a-z0-9-]+$/.test(clinic.id)) {
      fail(`${at}.id: expected lowercase ascii/hyphen id`);
    } else if (clinicIds.has(clinic.id)) {
      fail(`${at}.id: duplicate "${clinic.id}"`);
    } else {
      clinicIds.add(clinic.id);
    }
    if (!isNonEmptyString(clinic.name)) fail(`${at}.name: required`);
    if (!isNonEmptyString(clinic.city)) fail(`${at}.city: required`);
    if (!Array.isArray(clinic.aliases)) fail(`${at}.aliases: expected an array`);
    if (!Array.isArray(clinic.sources)) fail(`${at}.sources: expected an array`);
    if (isNonEmptyString(clinic.name) && isNonEmptyString(clinic.city)) {
      const key = `${normalize(clinic.name)}|${cityKey(clinic.city)}`;
      if (clinicKeys.has(key)) fail(`${at}: duplicate canonical name+city "${clinic.name}" / "${clinic.city}"`);
      clinicKeys.add(key);
      nameKeys.push({ at, name: clinic.name, city: clinic.city, key, tokenKey: tokenKey(clinic.name), id: clinic.id });
    }
    if (!Array.isArray(clinic.locations) || clinic.locations.length === 0) {
      fail(`${at}.locations: expected a non-empty array`);
      return;
    }
    const aliasKeys = new Set();
    for (const alias of clinic.aliases || []) {
      if (!isNonEmptyString(alias)) {
        fail(`${at}.aliases: entries must be non-empty strings`);
        continue;
      }
      const aliasKey = `${normalize(alias)}|${cityKey(clinic.city)}`;
      if (aliasKeys.has(aliasKey)) fail(`${at}.aliases: duplicate "${alias}"`);
      if (aliasKey === `${normalize(clinic.name)}|${cityKey(clinic.city)}`) {
        fail(`${at}.aliases: alias repeats canonical name "${alias}"`);
      }
      aliasKeys.add(aliasKey);
    }
    clinic.locations.forEach((location, locationIndex) => {
      const locAt = `${at}.locations[${locationIndex}]`;
      if (!location || typeof location !== "object" || Array.isArray(location)) {
        fail(`${locAt}: must be an object`);
        return;
      }
      if (!isNonEmptyString(location.id)) {
        fail(`${locAt}.id: required`);
      } else if (locationIds.has(location.id)) {
        fail(`${locAt}.id: duplicate "${location.id}"`);
      } else {
        locationIds.add(location.id);
      }
      if (!location.address || typeof location.address !== "object" || Array.isArray(location.address)) {
        fail(`${locAt}.address: expected an object`);
      } else {
        if (typeof location.address.value !== "string") fail(`${locAt}.address.value: expected a string`);
        validateVerification(location.address, `${locAt}.address`);
        validateProvenance(location.address.provenance, `${locAt}.address`);
      }
      if (!location.coordinates || typeof location.coordinates !== "object" || Array.isArray(location.coordinates)) {
        fail(`${locAt}.coordinates: expected an object`);
      } else {
        const coordinates = location.coordinates;
        if (coordinates.value !== null) {
          if (!coordinates.value || typeof coordinates.value !== "object") {
            fail(`${locAt}.coordinates.value: expected null or { lat, lng }`);
          } else {
            const lat = Number(coordinates.value.lat);
            const lng = Number(coordinates.value.lng);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90) fail(`${locAt}.coordinates.value.lat: out of range`);
            if (!Number.isFinite(lng) || lng < -180 || lng > 180) fail(`${locAt}.coordinates.value.lng: out of range`);
            if (coordinates.verification !== "verified") {
              fail(`${locAt}.coordinates: unverified coordinates must be null (no invented map points)`);
            }
          }
        }
        validateVerification(coordinates, `${locAt}.coordinates`);
        validateProvenance(coordinates.provenance, `${locAt}.coordinates`);
      }
    });
  });

  const aliasIndex = new Map();
  registry.clinics.forEach((clinic) => {
    for (const alias of clinic.aliases || []) {
      if (!isNonEmptyString(alias)) continue;
      const key = `${normalize(alias)}|${cityKey(clinic.city)}`;
      if (aliasIndex.has(key) && aliasIndex.get(key) !== clinic.id) {
        fail(`alias "${alias}" (${clinic.city}) is claimed by both ${aliasIndex.get(key)} and ${clinic.id}`);
      }
      aliasIndex.set(key, clinic.id);
      if (clinicKeys.has(key) && clinicIds.has(aliasIndex.get(key))) {
        const canonicalOwner = registry.clinics.find(
          (item) => `${normalize(item.name)}|${cityKey(item.city)}` === key
        );
        if (canonicalOwner && canonicalOwner.id !== clinic.id) {
          fail(`alias "${alias}" (${clinic.city}) collides with canonical clinic ${canonicalOwner.id}`);
        }
      }
    }
  });

  const duplicateGroups = new Map();
  for (const entry of nameKeys) {
    const groupKey = `${cityKey(entry.city)}|${entry.tokenKey}`;
    if (!duplicateGroups.has(groupKey)) duplicateGroups.set(groupKey, []);
    duplicateGroups.get(groupKey).push(entry);
  }
  const duplicateCandidates = [];
  for (const [key, entries] of duplicateGroups) {
    if (!key || entries.length < 2) continue;
    const uniqueNames = new Set(entries.map((entry) => `${normalize(entry.name)}|${cityKey(entry.city)}`));
    if (uniqueNames.size > 1) duplicateCandidates.push({ key, entries });
  }

  return { duplicateCandidates, clinicIds, clinicKeys, aliasIndex, locationIds };
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    fail("registry: file not found");
    return null;
  }
  try {
    return readJson(registryPath);
  } catch (error) {
    fail(`registry: invalid JSON (${error instanceof Error ? error.message : error})`);
    return null;
  }
}

function loadDoctors() {
  const files = fs.existsSync(doctorsDir)
    ? fs.readdirSync(doctorsDir).filter((file) => file.endsWith(".json"))
    : [];
  const doctors = [];
  for (const file of files) {
    try {
      doctors.push({ file, doctor: readJson(path.join(doctorsDir, file)) });
    } catch (error) {
      fail(`doctor ${file}: invalid JSON (${error instanceof Error ? error.message : error})`);
    }
  }
  return doctors;
}

function auditDoctors(registry) {
  const canonical = new Map();
  const aliases = new Map();
  for (const clinic of registry.clinics) {
    canonical.set(`${normalize(clinic.name)}|${cityKey(clinic.city)}`, clinic);
    for (const alias of clinic.aliases || []) {
      aliases.set(`${normalize(alias)}|${cityKey(clinic.city)}`, clinic);
    }
  }

  const workplaces = [];
  for (const { file, doctor } of loadDoctors()) {
    for (const [workplaceIndex, workplace] of (doctor.workplaces || []).entries()) {
      workplaces.push({
        file,
        doctorSlug: doctor.slug,
        doctorCity: doctor.city,
        index: workplaceIndex,
        clinic: workplace?.clinic,
        clinicId: workplace?.clinicId,
        city: workplace?.city || doctor.city,
        address: workplace?.address,
      });
    }
  }

  let linked = 0;
  let candidateLinks = 0;
  let unnamed = 0;
  const unregistered = new Map();

  for (const workplace of workplaces) {
    if (!isNonEmptyString(workplace.clinic) || normalize(workplace.clinic) === "") {
      unnamed += 1;
      continue;
    }
    if (workplace.clinicId !== undefined) {
      if (!isNonEmptyString(workplace.clinicId)) {
        fail(`${workplace.file}: workplaces[${workplace.index}].clinicId must be non-empty when present`);
        continue;
      }
      const clinic = registry.clinics.find((item) => item.id === workplace.clinicId);
      if (!clinic) {
        fail(`${workplace.file}: workplaces[${workplace.index}].clinicId "${workplace.clinicId}" not found in registry`);
        continue;
      }
      if (normalize(workplace.city) !== cityKey(clinic.city)) {
        fail(
          `${workplace.file}: workplaces[${workplace.index}] city "${workplace.city}" does not match ${clinic.id} city "${clinic.city}"`
        );
      }
      const allowed = [clinic.name, ...(clinic.aliases || [])].map(normalize);
      if (!allowed.includes(normalize(workplace.clinic))) {
        fail(
          `${workplace.file}: workplaces[${workplace.index}] clinic "${workplace.clinic}" does not match ${clinic.id} canonical name "${clinic.name}"`
        );
      }
      linked += 1;
      continue;
    }
    const key = `${normalize(workplace.clinic)}|${cityKey(workplace.city)}`;
    if (canonical.has(key) || aliases.has(key)) {
      candidateLinks += 1;
      continue;
    }
    if (!unregistered.has(key)) {
      unregistered.set(key, {
        clinic: workplace.clinic,
        city: workplace.city,
        workplaces: 0,
        doctors: new Set(),
        files: new Set(),
      });
    }
    const group = unregistered.get(key);
    group.workplaces += 1;
    group.doctors.add(workplace.doctorSlug);
    group.files.add(workplace.file);
  }

  for (const group of unregistered.values()) {
    group.doctorCount = group.doctors.size;
    group.fileCount = group.files.size;
    delete group.doctors;
    delete group.files;
  }

  return {
    workplaces,
    linked,
    candidateLinks,
    unnamed,
    unregistered: [...unregistered.values()].sort(
      (a, b) => b.doctorCount - a.doctorCount || a.clinic.localeCompare(b.clinic)
    ),
  };
}

function auditPublication(registry) {
  let locations = 0;
  let addresses = 0;
  let verifiedAddresses = 0;
  let coordinates = 0;
  let verifiedCoordinates = 0;
  let clinicEligible = 0;
  let mapEligible = 0;
  const byClinic = [];

  for (const clinic of registry.clinics) {
    let clinicOk = false;
    let mapOk = false;
    for (const location of clinic.locations) {
      locations += 1;
      const hasAddress = isNonEmptyString(location.address?.value);
      const addressVerified =
        hasAddress &&
        location.address.verification === "verified" &&
        isNonEmptyString(location.address.verifiedAt) &&
        isNonEmptyString(location.address.verifiedBy) &&
        authoritative(location.address.provenance || []);
      const hasCoordinates = location.coordinates?.value !== null && location.coordinates?.value !== undefined;
      const coordinatesVerified =
        hasCoordinates &&
        location.coordinates.verification === "verified" &&
        isNonEmptyString(location.coordinates.verifiedAt) &&
        isNonEmptyString(location.coordinates.verifiedBy) &&
        authoritative(location.coordinates.provenance || []);
      if (hasAddress) addresses += 1;
      if (addressVerified) verifiedAddresses += 1;
      if (hasCoordinates) coordinates += 1;
      if (coordinatesVerified) verifiedCoordinates += 1;
      if (addressVerified) clinicOk = true;
      if (addressVerified && coordinatesVerified) mapOk = true;
    }
    if (clinicOk) clinicEligible += 1;
    if (mapOk) mapEligible += 1;
    byClinic.push({ id: clinic.id, clinicEligible: clinicOk, mapEligible: mapOk });
  }

  return {
    locations,
    addresses,
    verifiedAddresses,
    coordinates,
    verifiedCoordinates,
    clinicEligible,
    mapEligible,
    byClinic,
  };
}

const registry = loadRegistry();
let index = null;
if (registry) index = validateRegistry(registry);
const doctorAudit = registry && index && errors.length === 0 ? auditDoctors(registry) : null;
const publication = registry && index && errors.length === 0 ? auditPublication(registry) : null;

const summary = {
  registry: {
    clinics: registry?.clinics?.length ?? 0,
    locations: publication?.locations ?? 0,
    addresses: publication?.addresses ?? 0,
    verifiedAddresses: publication?.verifiedAddresses ?? 0,
    coordinates: publication?.coordinates ?? 0,
    verifiedCoordinates: publication?.verifiedCoordinates ?? 0,
  },
  publication: {
    clinicPagesEligible: publication?.clinicEligible ?? 0,
    mapsEligible: publication?.mapEligible ?? 0,
  },
  doctorWorkplaces: {
    total: doctorAudit?.workplaces.length ?? 0,
    linkedByClinicId: doctorAudit?.linked ?? 0,
    candidateExactLinksNotWritten: doctorAudit?.candidateLinks ?? 0,
    unnamed: doctorAudit?.unnamed ?? 0,
    unregisteredGroups: doctorAudit?.unregistered.length ?? 0,
  },
  duplicateCandidateGroups: index?.duplicateCandidates.length ?? 0,
  errors: errors.length,
  warnings: warnings.length,
};

if (asJson) {
  console.log(
    JSON.stringify(
      {
        summary,
        errors,
        warnings,
        duplicateCandidates: (index?.duplicateCandidates || []).map((group) => ({
          key: group.key,
          entries: group.entries.map((entry) => ({ id: entry.id, name: entry.name, city: entry.city })),
        })),
        unregistered: doctorAudit?.unregistered || [],
        publicationByClinic: publication?.byClinic || [],
      },
      null,
      2
    )
  );
} else {
  console.log("Clinic registry audit (read-only)");
  console.log(
    `registry: ${summary.registry.clinics} clinics, ${summary.registry.locations} locations, ${summary.registry.addresses} addresses, ${summary.registry.coordinates} coordinates`
  );
  console.log(
    `verification: addresses ${summary.registry.verifiedAddresses}/${summary.registry.addresses} verified, coordinates ${summary.registry.verifiedCoordinates}/${summary.registry.coordinates} verified`
  );
  console.log(
    `publication gates: clinic pages ${summary.publication.clinicPagesEligible}/${summary.registry.clinics} eligible, maps ${summary.publication.mapsEligible}/${summary.registry.clinics} eligible`
  );
  console.log(
    `doctor workplaces: ${summary.doctorWorkplaces.total} total, ${summary.doctorWorkplaces.linkedByClinicId} linked via clinicId, ${summary.doctorWorkplaces.candidateExactLinksNotWritten} exact-link candidates (not written), ${summary.doctorWorkplaces.unnamed} unnamed, ${summary.doctorWorkplaces.unregisteredGroups} unregistered groups`
  );
  console.log(`duplicate name candidate groups (not merged): ${summary.duplicateCandidateGroups}`);

  const duplicateCandidates = index?.duplicateCandidates || [];
  if (duplicateCandidates.length) {
    console.log("");
    console.log("Duplicate name candidates (human review only):");
    for (const group of duplicateCandidates.slice(0, verbose ? undefined : 15)) {
      console.log(`  - ${group.entries.map((entry) => `${entry.id} "${entry.name}" (${entry.city})`).join(" <> ")}`);
    }
    if (!verbose && duplicateCandidates.length > 15) console.log(`  ... +${duplicateCandidates.length - 15} more (use --verbose)`);
  }

  if (doctorAudit?.unregistered.length) {
    console.log("");
    console.log("Unregistered clinic strings (exact name+city, no merge):");
    for (const group of doctorAudit.unregistered.slice(0, verbose ? undefined : 15)) {
      console.log(`  - ${group.clinic} (${group.city}): ${group.doctorCount} doctors, ${group.workplaces} workplaces`);
    }
    if (!verbose && doctorAudit.unregistered.length > 15) console.log(`  ... +${doctorAudit.unregistered.length - 15} more (use --verbose)`);
  }

  if (warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  if (errors.length) {
    console.log("");
    console.log("Errors:");
    for (const error of errors) console.log(`  - ${error}`);
  }

  console.log("");
  console.log(errors.length ? "FAIL" : "OK");
}

process.exitCode = errors.length ? 1 : 0;


