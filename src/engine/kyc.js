// Smart KYC: lookups first, documents only as a fallback.
// OCR (or a vision model) only *reads* a document; every pass/fail decision below is plain code.

export const KYC_TODAY = "2026-07-15"; // fixed "today" from the dataset README
const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ---------------------------------------------------------------- GSTIN
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function gstinChecksumOk(g) {
  if (!g || g.length !== 15) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CH.indexOf(g[i]);
    if (v < 0) return false;
    const p = v * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return CH[(36 - (sum % 36)) % 36] === g[14];
}

export function validateGstinFormat(raw) {
  const g = (raw || "").toUpperCase().replace(/\s/g, "");
  if (g.length !== 15) return { ok: false, code: "length", value: g };
  if (!GSTIN_RE.test(g)) return { ok: false, code: "pattern", value: g };
  if (!gstinChecksumOk(g)) return { ok: false, code: "checksum", value: g };
  return { ok: true, value: g };
}

// Position-aware repair of the usual OCR mix-ups. A GSTIN has digits in some places and
// letters in others, so an "O" in a digit slot can only be a "0", and so on.
const TO_DIGIT = { O: "0", D: "0", Q: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };
const TO_LETTER = { 0: "O", 1: "I", 2: "Z", 5: "S", 8: "B", 6: "G" };
const KIND = "DDLLLLLDDDDLAZA"; // D digit, L letter, A either, Z literal Z
const LOOKALIKE = [["I", "J"], ["O", "Q"], ["O", "D"], ["U", "V"], ["M", "N"], ["E", "F"], ["C", "G"]];

export function repairOcrGstin(raw, registry) {
  let g = (raw || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const fixes = [];
  if (g.length !== 15) return { value: g, fixes, ok: false };
  const chars = g.split("");
  chars.forEach((c, i) => {
    const k = KIND[i];
    const to = k === "D" ? TO_DIGIT[c] : k === "L" ? TO_LETTER[c] : k === "Z" && c !== "Z" ? "Z" : undefined;
    if (to && to !== c) { fixes.push({ pos: i + 1, from: c, to }); chars[i] = to; }
  });
  g = chars.join("");
  const valid = (x) => gstinChecksumOk(x) && (!registry || registry[x]);
  if (valid(g)) return { value: g, fixes, ok: true };
  // ambiguous slots (13th and 15th) and look-alike letters: try one swap at a time
  for (let i = 0; i < 15; i++) {
    const c = g[i];
    const alts = [];
    if (KIND[i] === "A") { if (TO_DIGIT[c]) alts.push(TO_DIGIT[c]); if (TO_LETTER[c]) alts.push(TO_LETTER[c]); }
    for (const [a, b] of LOOKALIKE) { if (c === a) alts.push(b); if (c === b) alts.push(a); }
    for (const alt of alts) {
      const cand = g.slice(0, i) + alt + g.slice(i + 1);
      if (valid(cand)) return { value: cand, fixes: [...fixes, { pos: i + 1, from: c, to: alt }], ok: true };
    }
  }
  return { value: g, fixes, ok: false };
}

/** Registry entries one character away: used to explain a failed GSTIN (typo vs. altered). */
export function nearGstins(g, registry) {
  const out = [];
  for (const k of Object.keys(registry)) {
    if (k.slice(0, 2) !== g.slice(0, 2)) continue;
    let diff = 0;
    for (let i = 0; i < 15 && diff < 2; i++) if (k[i] !== g[i]) diff++;
    if (diff === 1) out.push(k);
  }
  return out;
}

export function lookupGstin(g, registry) {
  const r = registry[g];
  if (!r) return null;
  const [legalName, tradeName, constitution, address, state, registrationDate, status] = r;
  return { gstin: g, legalName, tradeName, constitution, address, state, registrationDate, status, city: cityFromAddress(address) };
}

export function cityFromAddress(addr) {
  const parts = (addr || "").split(",").map((s) => s.trim());
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}

export function proprietorOf(legalName) {
  const m = /^(.*?)\s*\(Prop\.\s*(.*)\)\s*$/.exec(legalName || "");
  return m ? { person: m[1].trim(), business: m[2].trim() } : null;
}

// ---------------------------------------------------------------- Udyam
export function lookupUdyam(num, registry) {
  const r = registry[num];
  if (!r) return null;
  const [enterpriseName, enterpriseType, majorActivity, nic, state, city, registrationDate] = r;
  return { udyamNumber: num, enterpriseName, enterpriseType, majorActivity, nic, state, city, registrationDate };
}

export function findUdyamByBusiness(name, city, registry) {
  const n = normName(name);
  for (const [num, r] of Object.entries(registry)) {
    if (normName(r[0]) === n && (!city || r[5] === city)) return lookupUdyam(num, registry);
  }
  return null;
}

// ---------------------------------------------------------------- matching helpers
export function normName(s) {
  return (s || "").toLowerCase().replace(/\(prop\.[^)]*\)/g, "").replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(pvt|private|ltd|limited|llp)\b/g, " ").replace(/\s+/g, " ").trim();
}
export function similarity(a, b) {
  const A = new Set(normName(a).split(" ").filter(Boolean));
  const B = new Set(normName(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / new Set([...A, ...B]).size;
}
// character-level closeness (1 = identical); tolerant of a stray OCR character, not of a changed word
const squash = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function closeness(a, b) {
  const x = squash(a), y = squash(b);
  if (!x || !y) return 0;
  const prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}
const normAddr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const sameAddress = (a, b) => !!a && !!b && closeness(normAddr(a), normAddr(b)) >= 0.95;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// ---------------------------------------------------------------- full applicant check
/**
 * docs: { gst_certificate?, udyam_certificate?, address_proof?, signatory_id? }
 * each doc: { quality: "ok"|"blurry"|"unreadable", deskewedBy, fields }
 * Returns { checks: [{doc, status: pass|warn|fail|info, key, detail}], decision, gst, udyam }
 */
export function validateApplicant(docs, gstReg, udyamReg, today = KYC_TODAY) {
  const checks = [];
  const add = (doc, status, key, detail = {}) => checks.push({ doc, status, key, detail });
  let gst = null, udyam = null, business = null;

  // GST certificate
  const g = docs.gst_certificate;
  if (!g) add("gst", "fail", "missing");
  else if (g.quality === "blurry") add("gst", "fail", "blurry");
  else if (g.quality !== "ok" || !g.fields) add("gst", "fail", "unreadable");
  else {
    if (Math.abs(g.deskewedBy || 0) >= 1.5) add("gst", "info", "deskewed", { deg: Math.abs(g.deskewedBy) });
    const f = g.fields;
    const rep = repairOcrGstin(f.gstin, gstReg);
    if (rep.ok && rep.fixes.length) add("gst", "info", "ocrFixed", { fixes: rep.fixes, value: rep.value });
    if (!rep.ok) {
      const near = nearGstins(rep.value, gstReg);
      add("gst", "fail", "gstinInvalid", { value: rep.value, near: near[0] });
    } else {
      gst = lookupGstin(rep.value, gstReg);
      add("gst", "pass", "gstinFound", { value: rep.value });
      if (gst.status !== "Active") add("gst", "fail", "gstinStatus", { status: gst.status });
      else add("gst", "pass", "gstinActive");
      if (closeness(f.legalName, gst.legalName) < 0.92)
        add("gst", "fail", "legalNameMismatch", { doc: f.legalName, registry: gst.legalName });
      else add("gst", "pass", "legalNameMatch");
      if (!sameAddress(f.address, gst.address)) add("gst", "warn", "addressMismatch", { doc: f.address, registry: gst.address });
      business = gst.tradeName;
    }
  }

  // Udyam
  const u = docs.udyam_certificate;
  const bizName = business || u?.fields?.enterpriseName || docs.signatory_id?.fields?.business;
  const city = gst?.city || u?.fields?.city;
  if (!u || !u.fields?.udyamNumber) {
    const found = findUdyamByBusiness(bizName, city, udyamReg);
    if (found) { udyam = found; add("udyam", "pass", u ? "udyamBlankFetched" : "udyamFetched", { value: found.udyamNumber }); }
    else add("udyam", "warn", u ? "udyamBlankNotFound" : "udyamNotFound");
  } else {
    const num = u.fields.udyamNumber.replace(/\s/g, "");
    udyam = lookupUdyam(num, udyamReg);
    if (!udyam) add("udyam", "fail", "udyamNotInRegistry", { value: num });
    else {
      add("udyam", "pass", "udyamFound", { value: num });
      if (closeness(u.fields.enterpriseName, udyam.enterpriseName) < 0.92) add("udyam", "fail", "udyamNameMismatch", { doc: u.fields.enterpriseName, registry: udyam.enterpriseName });
      if (u.fields.city !== udyam.city) add("udyam", "warn", "udyamCityMismatch", { doc: u.fields.city, registry: udyam.city });
      if (u.fields.majorActivity && u.fields.majorActivity !== udyam.majorActivity)
        add("udyam", "info", "udyamActivityDiffers", { doc: u.fields.majorActivity, registry: udyam.majorActivity });
    }
  }

  // Address proof (skipped entirely in the live flow when the install address is the GST address)
  const a = docs.address_proof;
  if (a?.fields) {
    const age = daysBetween(a.fields.billDate, today);
    if (age > 90) add("address", "fail", "billTooOld", { date: a.fields.billDate, days: age });
    else add("address", "pass", "billRecent", { date: a.fields.billDate, days: age });
    if (bizName && closeness(a.fields.billedTo, bizName) < 0.92) add("address", "warn", "billNameMismatch", { doc: a.fields.billedTo, expected: bizName });
    if (gst && !sameAddress(a.fields.address, gst.address)) add("address", "warn", "billAddressDiffers");
    else if (gst) add("address", "pass", "billAddressMatch");
  } else if (!a) add("address", "info", "addressFromGst");

  // Signatory
  const s = docs.signatory_id;
  if (!s?.fields) add("signatory", "fail", "missing");
  else {
    if (daysBetween(today, s.fields.validTill) < 0) add("signatory", "fail", "idExpired", { date: s.fields.validTill });
    const prop = gst && proprietorOf(gst.legalName);
    if (prop) {
      if (normName(prop.person) === normName(s.fields.name)) add("signatory", "pass", "signatoryIsProprietor", { name: s.fields.name });
      else add("signatory", "fail", "signatoryNotProprietor", { name: s.fields.name, expected: prop.person });
    } else if (gst) add("signatory", "warn", "confirmAuthority", { name: s.fields.name, constitution: gst.constitution });
  }

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const decision = fails ? "action" : warns ? "review" : "verified";
  return { checks, decision, gst, udyam };
}

// ---------------------------------------------------------------- image quality in the browser
/** Laplacian variance on a downscaled grey copy: low = blurry. Same measure as the data script. */
export function sharpnessFromImageData(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
      sum += v; sum2 += v * v; n++;
    }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}
export const BLUR_THRESHOLD = 40;
