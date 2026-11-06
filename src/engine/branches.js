// Branch-by-branch plans. A plan has two kinds of items:
//  - branch items, installed at each location (internet line, backup line, POS, guest Wi-Fi, CCTV, firewall, SD-WAN)
//  - shared items, bought once for the whole business (SIMs, email, WhatsApp, website, SMS, backup, antivirus...)
// The owner can name every branch and change what each branch gets. Prices still come only from the
// catalogue, and the finished plan is re-checked against every rule, per branch and as a whole.

import { checkEligibility, priceBundle, verifyBundle } from "./advisor.js";

export const LINK_IDS = ["P01", "P02", "P03", "P04", "P05", "P06"];
export const BRANCH_IDS = new Set([...LINK_IDS, "P09", "P10", "P19", "P21", "P22", "P23"]);
/** Branch items whose count can differ per branch (the rest are one per branch). */
export const BRANCH_QTY = new Set(["P19", "P23"]);
export const isBranchItem = (id) => BRANCH_IDS.has(id);

/** Limits for "how many branches" inside each band the owner tapped. */
export const BAND_RANGE = { "1": [1, 1], "2-3": [2, 3], "4-10": [4, 10], "10+": [10, 50] };
export const bandOfCount = (n) => (n <= 1 ? "1" : n <= 3 ? "2-3" : n <= 10 ? "4-10" : "10+");

/** Branch sizes the owner can tap. They set the internet speed and the default counts at that branch. */
export const SIZES = ["small", "regular", "large"];
/** Services the owner can switch on or off for each branch. */
export const BRANCH_SERVICES = ["P19", "P23", "P22", "P09"];

/**
 * A new branch; `from` copies another branch's choices (not its name or pincode). Keys are stable ("b1", "b2"...).
 * size: small | regular | large. pin/fibreOk: that branch's pincode and fibre check (null = same area as the main shop).
 * off: plan items switched off here. add: services switched on only here. qty: counts set here.
 */
export const newBranch = (name = "", from = null, list = []) => ({
  key: nextKey(list),
  name,
  size: from?.size || "regular",
  pin: "", fibreOk: null,
  qty: from ? { ...from.qty } : {},
  off: from ? [...(from.off || [])] : [],
  add: from ? [...(from.add || [])] : [],
});
/** Copy another branch's size and services onto this one, keeping its name and pincode. */
export const sameAs = (branch, from) => ({ ...branch, size: from.size || "regular", qty: { ...from.qty }, off: [...(from.off || [])], add: [...(from.add || [])] });

/** Keep the owner's branch list the right length (adds blank branches, drops extra ones from the end). */
export function fitBranches(branches, count) {
  const list = Array.isArray(branches) ? branches.slice(0, count) : [];
  while (list.length < count) list.push(newBranch("", list[0] || null, list));
  return list;
}
function nextKey(list) {
  const used = new Set(list.map((b) => b.key));
  let i = list.length + 1;
  while (used.has("b" + i)) i++;
  return "b" + i;
}

/** Split a priced plan into "per branch" defaults and shared items. */
export function splitBase(bundle, sites) {
  const perBranch = [], shared = [];
  for (const it of bundle.items) {
    const row = { id: it.id, why: it.why };
    if (isBranchItem(it.id)) perBranch.push({ ...row, qty: Math.max(1, Math.round(it.qty / Math.max(1, sites))) });
    else shared.push({ ...row, qty: it.qty });
  }
  return { perBranch, shared };
}

const clampQty = (n) => Math.max(1, Math.min(50, Math.round(Number(n) || 1)));
const LADDER = ["P01", "P02", "P03"];

/** The internet line for one branch: the plan's line, resized for the branch, or AirFiber where there's no fibre. */
export function branchLink(baseId, branch, ctx, byId) {
  const fibre = branch.fibreOk ?? ctx.fibreOk;
  const ok = (id) => checkEligibility(byId[id], ctx, null).ok;
  if (!fibre) return "P04";
  let base = baseId === "P04" ? (ctx.seg === "micro" ? "P01" : "P02") : baseId; // main shop had no fibre, this branch does
  const size = branch.size || "regular";
  if (LADDER.includes(base)) {
    const i = LADDER.indexOf(base);
    if (size === "small") return LADDER[Math.max(0, i - 1)];
    if (size === "large") { const up = LADDER[Math.min(2, i + 1)]; return ok(up) ? up : base; }
    return base;
  }
  return size === "small" ? "P02" : base; // leased line: a small counter gets fast fibre instead
}

/** Default count of a countable item at a branch of this size. */
function sizeQty(id, size, planQty, ctx) {
  if (id === "P19") return size === "large" ? Math.max(2, planQty || 1) : size === "small" ? 1 : planQty || 1;
  if (id === "P23") {
    const regular = planQty || (ctx.seg === "micro" ? 2 : 4);
    return size === "small" ? Math.min(2, regular) : size === "large" ? regular + 2 : regular;
  }
  return planQty || 1;
}

/**
 * Every item that could be at one branch, with whether it is on, its count, and the rule that blocks it if any.
 * The first row is always the branch's internet line.
 */
export function branchRows(split, branch, ctx, byId) {
  const defaults = new Map(split.perBranch.map((d) => [d.id, d]));
  const base = split.perBranch.find((d) => LINK_IDS.includes(d.id));
  const link = branchLink(base.id, branch, ctx, byId);
  const fibre = branch.fibreOk ?? ctx.fibreOk;
  const linkWhy = !fibre ? { key: "linkNoFibre" } : link !== base.id && base.id !== "P04" ? { key: "linkSize" } : base.why;
  const rows = [{ id: link, qty: 1, on: true, fixed: true, ok: true, why: linkWhy }];
  const ids = [...new Set([...split.perBranch.map((d) => d.id).filter((id) => !LINK_IDS.includes(id)), ...BRANCH_SERVICES])];
  for (const id of ids) {
    const d = defaults.get(id);
    const wanted = d ? !branch.off?.includes(id) : !!branch.add?.includes(id);
    const r = checkEligibility(byId[id], ctx, new Set([link, id]));
    const qty = BRANCH_QTY.has(id) ? clampQty(branch.qty?.[id] ?? sizeQty(id, branch.size, d?.qty, ctx)) : 1;
    // at a branch on AirFiber, say plainly that this service needs a fibre line there
    const reason = r.reasons[0]?.code === "dependency" && link === "P04" ? { code: "needsFibreHere" } : r.reasons[0];
    rows.push({ id, qty, on: wanted && r.ok, ok: r.ok, reason, why: d?.why ?? { key: "added" }, inPlan: !!d });
  }
  return rows;
}

/** What one branch gets. */
export function branchItems(split, branch, ctx, byId) {
  return branchRows(split, branch, ctx, byId).filter((r) => r.on).map((r) => ({ id: r.id, qty: r.qty, why: r.why }));
}

/** Switch a service on or off at one branch. */
export function toggleAt(branch, id, split) {
  const inPlan = split.perBranch.some((d) => d.id === id);
  const list = inPlan ? "off" : "add";
  const cur = branch[list] || [];
  const has = cur.includes(id);
  // in the plan: "off" holds what's switched off; extras: "add" holds what's switched on
  return { ...branch, [list]: has ? cur.filter((x) => x !== id) : [...cur, id] };
}

/**
 * Price the whole plan branch by branch.
 * Returns the normal plan shape (items, monthly, setup, contractMonths, installDays, violations)
 * plus `branches` (each with its own items and monthly cost) and `shared`.
 */
export function priceBranches(split, branches, catalogue, ctx) {
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const line = (it) => ({ ...it, product: byId[it.id], monthly: byId[it.id].priceMin * it.qty, setup: byId[it.id].setup * it.qty });
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);

  const ctxB = { ...ctx, sites: branches.length };
  const perBranch = branches.map((b, i) => {
    const rows = branchRows(split, b, ctxB, byId);
    const items = rows.filter((r) => r.on).map((r) => line({ id: r.id, qty: r.qty, why: r.why }));
    return { key: b.key, name: b.name, size: b.size || "regular", index: i, rows, items, monthly: sum(items, "monthly"), setup: sum(items, "setup") };
  });
  const sharedItems = split.shared.map(line);
  const shared = { items: sharedItems, monthly: sum(sharedItems, "monthly"), setup: sum(sharedItems, "setup") };

  // one line per product for the whole business
  const total = new Map();
  for (const it of [...perBranch.flatMap((b) => b.items), ...sharedItems]) {
    const prev = total.get(it.id);
    prev ? (prev.qty += it.qty) : total.set(it.id, { id: it.id, why: it.why, qty: it.qty });
  }
  const priced = priceBundle([...total.values()], catalogue);
  const violations = verifyBundle(priced, ctxB);
  // every branch needs its own internet line for the things installed there
  for (const b of perBranch) {
    const here = new Set(b.items.map((i) => i.id));
    for (const it of b.items) {
      const r = checkEligibility(it.product, ctxB, here);
      if (r.reasons.some((x) => x.code === "dependency")) violations.push({ id: it.id, branch: b.key, reasons: ["dependency"] });
    }
  }
  return { ...priced, violations, branches: perBranch, shared };
}

/** Price a placed order from its snapshot (branches can be added or changed after booking). */
export function priceOrder(order, catalogue) {
  return priceBranches(order.split, order.branches, catalogue, order.ctx);
}

/** Products the owner could still add to the plan, each with whether the rules allow it. */
export function addableProducts(bundle, ctx, catalogue) {
  const have = new Set(bundle.items.map((i) => i.id));
  return catalogue
    .filter((p) => !have.has(p.id) && !LINK_IDS.includes(p.id))
    .map((p) => {
      const r = checkEligibility(p, ctx, new Set([...have, p.id]));
      return { product: p, ok: r.ok, reasons: r.reasons, qty: isBranchItem(p.id) ? Math.max(1, ctx.sites) : 1 };
    })
    .sort((a, b) => Number(b.ok) - Number(a.ok));
}
