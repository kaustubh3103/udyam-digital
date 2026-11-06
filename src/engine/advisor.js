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
function primaryLink(ctx, level, byId) {
  const ok = (id) => checkEligibility(byId[id], ctx, null).ok;
  const fibreFirst = (ids) => ids.find((id) => ok(id));
  if (ctx.seg === "mfg") {
    if (level === "complete" && ok("P06")) return "P06";
    if (ok("P05")) return "P05";
    return ctx.fibreOk ? fibreFirst(["P03", "P02", "P01"]) : "P04";
  }
  if (!ctx.fibreOk) {
    if (ctx.seg === "multi" && ok("P05") && level !== "basic") return "P05";
    return "P04"; // 5G AirFiber: no cable needed, installs in about 2 days
  }
  if (ctx.seg === "micro") return level === "complete" ? "P02" : "P01";
  if (ctx.seg === "prof") return level === "complete" ? fibreFirst(["P03", "P02"]) : level === "basic" ? "P01" : "P02";
  /* multi */ return level === "complete" ? fibreFirst(["P03", "P02"]) : "P02";
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
    default: return [];
  }
}

// Things a "Complete" plan adds even if the owner did not ask, chosen from what
// similar businesses actually bought (see scripts/prepare_data.py, activated bundles).
const COMPLETE_EXTRAS = {
  micro: ["guestwifi", "cctv", "uptime"],
  prof: ["uptime", "backup", "security"],
  multi: ["uptime", "cctv", "branches"],
  mfg: ["security", "cctv", "staticip"],
};

// ---------------------------------------------------------------- main
/**
 * ctx = { seg, cityTier, employees, sites, gstinActive, fibreOk, needs: [ids] }
 * Returns { tiers: {basic, recommended, complete}, locked: [...] }
 */
export function recommend(ctx, catalogue) {
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const locked = new Map();

  const build = (level) => {
    const items = new Map();
    const add = (id, qty, why) => {
      const prev = items.get(id);
      if (prev) { prev.qty = Math.max(prev.qty, qty); return; }
      items.set(id, { id, qty, why });
    };
    const link = primaryLink(ctx, level, byId);
    add(link, ctx.sites, { key: ctx.fibreOk ? "link" : "linkNoFibre" });
    const lineProduct = level === "basic" || ctx.seg === "micro" ? "P07" : "P08";
    const lines = level === "basic" ? Math.min(2, ctx.lines) : ctx.lines;
    add(lineProduct, lines, { key: "lines" });

    let wanted = [...ctx.needs];
    if (level === "basic") wanted = wanted.slice(0, 1);
    if (level === "complete") wanted = [...new Set([...wanted, ...COMPLETE_EXTRAS[ctx.seg]])];

    for (const need of wanted) {
      if (need === "staticip") {
        if (["P01", "P02", "P03"].includes(link)) add("P11", 1, { key: "extra", need });
        continue;
      }
      for (const cand of needItems(need, ctx)) {
        const chosen = [cand, cand.alt].filter(Boolean).find((c) => {
          const ids = new Set([...items.keys(), c.id]);
          return checkEligibility(byId[c.id], ctx, ids).ok;
        });
        const asked = ctx.needs.includes(need);
        if (chosen) add(chosen.id, chosen.qty, { key: asked ? "need" : "extra", need });
        else if (asked) {
          const ids = new Set([...items.keys(), cand.id]);
          locked.set(cand.id, { id: cand.id, need, reasons: checkEligibility(byId[cand.id], ctx, ids).reasons });
        }
      }
    }
    return priceBundle([...items.values()], catalogue);
  };

  return {
    tiers: { basic: build("basic"), recommended: build("recommended"), complete: build("complete") },
    locked: [...locked.values()],
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
