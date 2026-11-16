// Advisor rule engine.
// The owner answers tap-only questions; this file turns the answers into a bundle.
// Every product, price and quantity comes from the catalogue. Nothing here is generated
// by an AI model, so a recommendation can never contain an ineligible product or a made-up price.

export const EMP_BANDS = [
  { id: "1", min: 1, lines: 1 },
  { id: "2-4", min: 2, lines: 2 },
  { id: "5-9", min: 5, lines: 3 },
  { id: "10-24", min: 10, lines: 5 },
  { id: "25+", min: 25, lines: 8 },
];
export const SITE_BANDS = [
  { id: "1", min: 1 },
  { id: "2-3", min: 2 },
  { id: "4-10", min: 4 },
  { id: "10+", min: 10 },
];
export const empFromBand = (id) => EMP_BANDS.find((b) => b.id === id) ?? EMP_BANDS[0];
export const sitesFromBand = (id) => SITE_BANDS.find((b) => b.id === id) ?? SITE_BANDS[0];
export const empBandOf = (n) => [...EMP_BANDS].reverse().find((b) => n >= b.min).id;
export const siteBandOf = (n) => [...SITE_BANDS].reverse().find((b) => n >= b.min).id;

// Needs the owner can pick. Each maps to products; the engine checks eligibility.
export const NEEDS = [
  { id: "payments", icon: "💳", segs: ["micro", "prof", "multi"] },
  { id: "whatsapp", icon: "💬", segs: ["micro", "prof", "multi"] },
  { id: "cctv", icon: "📹", segs: ["micro", "multi", "mfg"] },
  { id: "guestwifi", icon: "📶", segs: ["micro", "prof", "multi"] },
  { id: "billing", icon: "🧾", segs: ["micro", "multi"] },
  { id: "email", icon: "📧", segs: ["prof", "multi", "mfg"] },
  { id: "backup", icon: "🗄️", segs: ["prof", "mfg"] },
  { id: "security", icon: "🛡️", segs: ["prof", "mfg", "multi"] },
  { id: "uptime", icon: "🔁", segs: ["prof", "multi", "mfg"] },
  { id: "calls", icon: "☎️", segs: ["prof", "multi"] },
  { id: "website", icon: "🌐", segs: ["micro", "prof"] },
  { id: "sms", icon: "✉️", segs: ["micro", "prof", "multi"] },
  { id: "branches", icon: "🏬", segs: ["multi"], minSites: 2 },
  { id: "machines", icon: "⚙️", segs: ["mfg"] },
  { id: "vehicles", icon: "🚚", segs: ["multi", "mfg"] },
];

export function needsFor(seg, sitesMin) {
  const primary = NEEDS.filter((n) => n.segs.includes(seg) && (!n.minSites || sitesMin >= n.minSites));
  const rest = NEEDS.filter((n) => !primary.includes(n) && (!n.minSites || sitesMin >= n.minSites));
  return { primary, rest };
}

/** Turn tap answers into the context the rules need. Ranges use their lower bound, so a
 *  range can never unlock a product the business is not eligible for. */
export function makeCtx({ seg, empBand, siteBand, cityTier, gstinActive, fibreOk = true, needs = [], sites: exact }) {
  // `sites` is the exact branch count when the owner has listed their branches (always inside the band they tapped)
  const e = empFromBand(empBand), b = sitesFromBand(siteBand);
  const sites = exact && exact >= b.min ? exact : b.min;
  return { seg, cityTier, employees: e.min, sites, lines: Math.max(e.lines, seg === "multi" ? sites : 1),
           gstinActive: !!gstinActive, fibreOk, needs };
}

// ---------------------------------------------------------------- eligibility
export function checkEligibility(product, ctx, bundleIds) {
  const reasons = [];
  if (!product.tiers.includes(ctx.cityTier)) reasons.push({ code: "tier" });
  if (ctx.employees < product.minEmployees) reasons.push({ code: "employees", min: product.minEmployees });
  if (ctx.sites < product.minSites) reasons.push({ code: "sites", min: product.minSites });
  if (product.requiresGstin && !ctx.gstinActive) reasons.push({ code: "gstin" });
  if (product.requiresOneOf.length && bundleIds && !product.requiresOneOf.some((id) => bundleIds.has(id)))
    reasons.push({ code: "dependency", oneOf: product.requiresOneOf });
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------- building blocks
/** The internet line. "standard" for Basic and Recommended; "premium" = the fastest line the business qualifies for. */
function primaryLink(ctx, grade, byId) {
  const ok = (id) => checkEligibility(byId[id], ctx, null).ok;
  const first = (ids) => ids.find((id) => ok(id));
  if (grade === "premium") {
    if (ctx.seg === "mfg") return first(["P06", "P05"]) || (ctx.fibreOk ? first(["P03", "P02", "P01"]) : "P04");
    if (!ctx.fibreOk) return (ctx.seg === "multi" && ok("P05")) ? "P05" : "P04";
    return first(["P03", "P02"]);
  }
  if (ctx.seg === "mfg") return ok("P05") ? "P05" : ctx.fibreOk ? first(["P03", "P02", "P01"]) : "P04";
  if (!ctx.fibreOk) return (ctx.seg === "multi" && ok("P05")) ? "P05" : "P04"; // 5G AirFiber: no cable, about 2 days
  return ctx.seg === "micro" ? "P01" : "P02";
}

function needItems(need, ctx) {
  const s = ctx.sites;
  const users = Math.max(1, ctx.employees);
  switch (need) {
    case "payments": return [{ id: "P19", qty: s }];
    case "billing": return [{ id: "P19", qty: s }];
    case "whatsapp": return [{ id: "P15", qty: 1 }];
    case "sms": return [{ id: "P14", qty: 1 }];
    case "cctv": return [{ id: "P23", qty: (ctx.seg === "micro" ? 2 : 4) * s }];
    case "guestwifi": return [{ id: "P22", qty: s }];
    case "email": return [{ id: "P16", qty: users }];
    case "website": return [{ id: "P18", qty: 1 }];
    case "backup": return [{ id: "P17", qty: 1 }];
    case "security": return [{ id: "P20", qty: Math.max(2, users) }];
    case "uptime": return [{ id: "P09", qty: s }];
    case "calls": return [{ id: "P12", qty: 2, alt: { id: "P13", qty: 1 } }];
    case "branches": return [{ id: "P10", qty: s }];
    case "machines": return [{ id: "P24", qty: 5 }];
    case "vehicles": return [{ id: "P25", qty: 3 }];
    case "staticip": return [{ id: "P11", qty: 1 }];
    case "firewall": return [{ id: "P21", qty: s }];
    case "support": return [{ id: "P26", qty: 1 }];
    case "insurance": return [{ id: "P27", qty: 1 }];
    default: return [];
  }
}

// ---------------------------------------------------------------- the three plans
// Basic       = everything the owner asked for, standard grade, sized for their staff and branches.
// Recommended = Basic + add-ons that at least 1 in 4 similar businesses bought (case data, attach_rates.json)
//               + "Accel suggests": basics the business hasn't covered (device protection, backup line, email, file backup, cover).
// Premium     = Recommended at the top grade the business qualifies for, plus Premium Care and Business Protection Cover.
export const POPULAR_SHARE = 0.25;
/** Which goal each add-on serves, so take-up rates can be read as goals. */
export const PRODUCT_NEED = { P19: "payments", P22: "guestwifi", P23: "cctv", P15: "whatsapp", P18: "website", P20: "security",
  P17: "backup", P12: "calls", P13: "calls", P14: "sms", P09: "uptime", P10: "branches", P16: "email", P11: "staticip",
  P21: "firewall", P24: "machines", P25: "vehicles", P26: "support", P27: "insurance" };
const PER_SITE = new Set(["P01", "P02", "P03", "P04", "P05", "P06", "P09", "P10", "P19", "P21", "P22", "P23"]);

/**
 * ctx = { seg, cityTier, employees, sites, gstinActive, fibreOk, needs: [ids] }
 * attach = attach_rates.json (optional): share of similar businesses that bought each add-on.
 * Returns { tiers: {basic, recommended, premium}, locked: [...] }
 */
export function recommend(ctx, catalogue, attach = null) {
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const locked = new Map();
  const items = new Map();
  const has = (id) => items.has(id);
  const ids = (extra) => new Set([...items.keys(), ...(extra ? [extra] : [])]);
  const allowed = (id) => !!byId[id] && checkEligibility(byId[id], ctx, ids(id)).ok;
  const add = (id, qty, why) => {
    const prev = items.get(id);
    if (prev) { prev.qty = Math.max(prev.qty, qty); return; }
    items.set(id, { id, qty, why });
  };
  // internet line first, then SIMs, then everything else in the order it was added
  const rank = (id) => (/^P0[1-6]$/.test(id) ? 0 : /^P0[78]$/.test(id) ? 1 : 2);
  const snapshot = () => priceBundle([...items.values()].map((i) => ({ ...i })).sort((a, b) => rank(a.id) - rank(b.id)), catalogue);
  const qtyFor = (pid, need) => {
    const c = needItems(need, ctx).flatMap((x) => [x, x.alt]).find((x) => x && x.id === pid);
    return c ? c.qty : PER_SITE.has(pid) ? ctx.sites : 1;
  };

  // ---- Basic: what the owner asked for
  const link = primaryLink(ctx, "standard", byId);
  add(link, ctx.sites, { key: ctx.fibreOk ? "link" : "linkNoFibre" });
  add(ctx.seg === "micro" ? "P07" : "P08", ctx.lines, { key: "lines" });
  for (const need of ctx.needs) {
    for (const cand of needItems(need, ctx)) {
      const chosen = [cand, cand.alt].filter(Boolean).find((c) => allowed(c.id));
      if (chosen) add(chosen.id, chosen.qty, { key: "need", need });
      else locked.set(cand.id, { id: cand.id, need, reasons: checkEligibility(byId[cand.id], ctx, ids(cand.id)).reasons });
    }
  }
  const basic = snapshot();

  // ---- Recommended: what similar businesses add, then what Accel suggests
  const rates = attach?.rates?.[ctx.seg] ?? {};
  for (const [pid, share] of Object.entries(rates).sort((a, b) => b[1] - a[1])) {
    const need = PRODUCT_NEED[pid];
    if (share < POPULAR_SHARE || !need || has(pid) || ctx.needs.includes(need) || !allowed(pid)) continue;
    add(pid, qtyFor(pid, need), { key: "popular", need, share });
  }
  const digitalPay = has("P19") || has("P15") || ctx.needs.some((n) => ["payments", "billing", "whatsapp"].includes(n));
  const suggest = [
    ["P20", ctx.employees >= 2 || has("P19"), "security"],
    ["P09", has("P19") || has("P23") || ctx.needs.includes("uptime"), "uptime"],
    ["P16", ["prof", "multi", "mfg"].includes(ctx.seg), "email"],
    ["P17", ["prof", "mfg"].includes(ctx.seg), "backup"],
    ["P27", digitalPay, "insurance"],
  ];
  for (const [pid, when, need] of suggest) {
    if (when && !has(pid) && allowed(pid)) add(pid, qtyFor(pid, need), { key: "suggest", need });
  }
  const recommended = snapshot();

  // ---- Premium: the top grade they qualify for, plus Premium Care and cover
  const top = primaryLink(ctx, "premium", byId);
  if (top && top !== link) {
    const old = items.get(link);
    items.delete(link);
    items.set(top, { id: top, qty: old.qty, why: { key: "premium", kind: "speed" } });
  }
  if (has("P07")) { const q = items.get("P07").qty; items.delete("P07"); add("P08", q, { key: "premium", kind: "sims" }); }
  const premiumAdds = [["P09", ctx.sites, "uptime"], ["P11", 1, "staticip"], ["P21", ctx.sites, "firewall"], ["P26", 1, "care"], ["P27", 1, "insurance"]];
  for (const [pid, qty, kind] of premiumAdds) if (!has(pid) && allowed(pid)) add(pid, qty, { key: "premium", kind });
  const premium = snapshot();

  return {
    tiers: { basic, recommended, premium },
    locked: [...locked.values()].filter((l) => !basic.items.some((i) => i.id === l.id)),
  };
}

export function priceBundle(items, catalogue) {
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const lines = items.map((it) => {
    const p = byId[it.id];
    return { ...it, product: p, monthly: p.priceMin * it.qty, setup: p.setup * it.qty };
  });
  return {
    items: lines,
    monthly: lines.reduce((s, l) => s + l.monthly, 0),
    setup: lines.reduce((s, l) => s + l.setup, 0),
    contractMonths: Math.max(...lines.map((l) => l.product.minContract)),
    installDays: Math.max(...lines.map((l) => l.product.installDays)),
  };
}

/** Independent guard: re-checks a finished bundle against every rule before it is shown. */
export function verifyBundle(bundle, ctx) {
  const ids = new Set(bundle.items.map((i) => i.id));
  const violations = [];
  for (const it of bundle.items) {
    const r = checkEligibility(it.product, ctx, ids);
    if (!r.ok) violations.push({ id: it.id, reasons: r.reasons.map((x) => x.code) });
    if (!(it.qty >= 1)) violations.push({ id: it.id, reasons: ["qty"] });
  }
  return violations;
}

/** Re-price after the owner toggles add-ons or changes a quantity, then re-verify. */
export function editBundle(bundle, edits, ctx, catalogue) {
  const base = bundle.items.map((i) => ({ id: i.id, why: i.why, qty: i.qty }));
  for (const add of edits.added ?? []) if (!base.find((i) => i.id === add.id)) base.push({ id: add.id, why: add.why ?? { key: "added" }, qty: add.qty });
  const items = base
    .map((i) => ({ ...i, qty: edits.qty?.[i.id] ?? i.qty }))
    .filter((i) => !edits.removed?.includes(i.id) && i.qty > 0);
  const priced = priceBundle(items, catalogue);
  return { ...priced, violations: verifyBundle(priced, ctx) };
}
