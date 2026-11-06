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

/** A new branch; `from` copies another branch's choices. Keys are stable ("b1", "b2"...). */
export const newBranch = (name = "", from = null, list = []) => ({
  key: nextKey(list),
  name,
  qty: from ? { ...from.qty } : {},
  off: from ? [...from.off] : [],
});

/** Keep the owner's branch list the right length (adds blank branches, drops extra ones from the end). */
export function fitBranches(branches, count) {
  const list = Array.isArray(branches) ? branches.slice(0, count) : [];
  while (list.length < count) list.push(newBranch("", null, list));
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

/** What one branch gets: the defaults, minus what the owner switched off, with the owner's counts. */
export function branchItems(split, branch) {
  return split.perBranch
    .filter((d) => LINK_IDS.includes(d.id) || !branch.off?.includes(d.id))
    .map((d) => ({ id: d.id, why: d.why, qty: BRANCH_QTY.has(d.id) ? clampQty(branch.qty?.[d.id] ?? d.qty) : d.qty }));
}
const clampQty = (n) => Math.max(1, Math.min(50, Math.round(Number(n) || 1)));

/**
 * Price the whole plan branch by branch.
 * Returns the normal plan shape (items, monthly, setup, contractMonths, installDays, violations)
 * plus `branches` (each with its own items and monthly cost) and `shared`.
 */
export function priceBranches(split, branches, catalogue, ctx) {
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const line = (it) => ({ ...it, product: byId[it.id], monthly: byId[it.id].priceMin * it.qty, setup: byId[it.id].setup * it.qty });
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);

  const perBranch = branches.map((b, i) => {
    const items = branchItems(split, b).map(line);
    return { key: b.key, name: b.name, index: i, items, monthly: sum(items, "monthly"), setup: sum(items, "setup") };
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
  const ctxB = { ...ctx, sites: branches.length };
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
