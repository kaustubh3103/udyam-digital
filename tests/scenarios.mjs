// Advisor stress test: 15 realistic owners, the kind of scenario judges run live.
// For each one: build the three plans with the rule engine, then check that every plan is valid, that every need
// the owner asked for is either in the plan or shown as locked with a reason, and that prices only go up
// from Basic to Complete. Prints the Recommended plan so a person can sanity-check it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCtx, recommend, verifyBundle } from "../src/engine/advisor.js";
import { splitBase, priceBranches, fitBranches, LINK_IDS } from "../src/engine/branches.js";
import { keywordClassify } from "../src/ai/classify.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const J = (f) => JSON.parse(fs.readFileSync(path.join(here, "../src/data", f), "utf8"));
const catalogue = J("catalogue.json");
const ref = J("reference.json");
const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
const tierOf = (c) => ref.cities.find((x) => x.city === c).tier;
const segOf = (t) => ref.businessTypes.find((x) => x.type === t).seg;

// need id -> products that satisfy it
const NEED_PRODUCTS = { payments: ["P19"], billing: ["P19"], whatsapp: ["P15"], sms: ["P14"], cctv: ["P23"], guestwifi: ["P22"], email: ["P16"],
  website: ["P18"], backup: ["P17"], security: ["P20"], uptime: ["P09"], calls: ["P12", "P13"], branches: ["P10"], machines: ["P24"], vehicles: ["P25"] };

const S = [
  { who: "Kirana store, Jaipur, just me, no GST", type: "Kirana store", emp: "1", sites: "1", city: "Jaipur", gst: false, needs: ["payments", "whatsapp"], expectLocked: ["P15"] },
  { who: "Pharmacy, Pune, 3 staff, GST", type: "Pharmacy", emp: "2-4", sites: "1", city: "Pune", gst: true, needs: ["payments", "cctv"] },
  { who: "Dental clinic, Kochi, 6 staff, GST", type: "Dental clinic", emp: "5-9", sites: "1", city: "Kochi", gst: true, needs: ["uptime", "email", "backup", "security"] },
  { who: "CA firm, Delhi, 12 staff, GST", type: "CA firm", emp: "10-24", sites: "1", city: "Delhi", gst: true, needs: ["email", "backup", "security", "calls"], expectIn: ["P12"] },
  { who: "Coaching centre, Patna, 8 staff, no GST", type: "Coaching centre", emp: "5-9", sites: "1", city: "Patna", gst: false, needs: ["website", "sms", "guestwifi"], expectLocked: ["P14"] },
  { who: "Restaurant chain, Bengaluru, 4 outlets, 30 staff, GST", type: "Restaurant chain", emp: "25+", sites: "4-10", city: "Bengaluru", gst: true, needs: ["payments", "cctv", "guestwifi", "uptime", "branches"], expectIn: ["P10"] },
  { who: "Apparel chain, Indore, 2 shops, 6 staff, GST", type: "Apparel retail chain", emp: "5-9", sites: "2-3", city: "Indore", gst: true, needs: ["payments", "branches"], expectLocked: ["P10"] },
  { who: "Textile unit, Surat, 40 staff, GST", type: "Textile unit", emp: "25+", sites: "1", city: "Surat", gst: true, needs: ["machines", "security", "uptime"], expectIn: ["P24"] },
  { who: "Auto-parts unit, Nagpur, 15 staff, no GST", type: "Auto-parts unit", emp: "10-24", sites: "1", city: "Nagpur", gst: false, needs: ["machines"], expectLocked: ["P24"], expectNot: ["P05", "P06"] },
  { who: "Salon, Mumbai, just me, no fibre at pincode", type: "Salon", emp: "1", sites: "1", city: "Mumbai", gst: false, fibre: false, needs: ["payments", "guestwifi"], expectIn: ["P04", "P22"] },
  { who: "Bakery, Ludhiana (Tier 2), 3 staff, GST", type: "Bakery", emp: "2-4", sites: "1", city: "Ludhiana", gst: true, needs: ["payments", "cctv", "whatsapp"], expectNot: ["P03"] },
  { who: "Gym chain, Hyderabad, 3 branches, 12 staff, GST", type: "Gym chain", emp: "10-24", sites: "2-3", city: "Hyderabad", gst: true, exact: 3, needs: ["cctv", "guestwifi", "calls"] },
  { who: "Budget hotel group, Jaipur, 2 hotels, 20 staff, GST", type: "Budget hotel group", emp: "10-24", sites: "2-3", city: "Jaipur", gst: true, needs: ["guestwifi", "cctv", "uptime", "website"] },
  { who: "Law office, Lucknow, 2 staff, GST", type: "Law office", emp: "2-4", sites: "1", city: "Lucknow", gst: true, needs: ["email", "backup", "calls"], expectIn: ["P13"], expectNot: ["P12"] },
  { who: "Food processing unit, Coimbatore, 25 staff, GST, no fibre", type: "Food processing unit", emp: "25+", sites: "1", city: "Coimbatore", gst: true, fibre: false, needs: ["machines", "vehicles", "security"], expectIn: ["P24", "P25"] },
];

let failed = 0;
const bad = (who, msg) => { failed++; console.log(`  ✗ ${who}: ${msg}`); };
const names = (b) => b.items.map((i) => `${i.product.name}${i.qty > 1 ? " ×" + i.qty : ""}`).join(", ");

for (const sc of S) {
  const sitesN = sc.exact ?? { "1": 1, "2-3": 2, "4-10": 4, "10+": 10 }[sc.sites];
  const ctx = makeCtx({ seg: segOf(sc.type) === "micro" && sitesN >= 2 ? "multi" : segOf(sc.type), empBand: sc.emp, siteBand: sc.sites, cityTier: tierOf(sc.city),
    gstinActive: sc.gst, fibreOk: sc.fibre !== false, needs: sc.needs, sites: sitesN });
  const rec = recommend(ctx, catalogue);
  const { basic, recommended: r, complete } = rec.tiers;
  for (const [k, b] of Object.entries(rec.tiers)) {
    const v = verifyBundle(b, ctx);
    if (v.length) bad(sc.who, `${k} breaks rules: ${JSON.stringify(v)}`);
    const links = b.items.filter((i) => LINK_IDS.includes(i.id));
    if (links.length !== 1 || links[0].qty !== ctx.sites) bad(sc.who, `${k} should have one internet line per branch`);
    if (b.items.some((i) => !i.product.tiers.includes(ctx.cityTier))) bad(sc.who, `${k} has a product not sold in this city`);
  }
  if (!(basic.monthly <= r.monthly && r.monthly <= complete.monthly)) bad(sc.who, `prices not Basic ≤ Recommended ≤ Complete (${basic.monthly}, ${r.monthly}, ${complete.monthly})`);
  const have = new Set(r.items.map((i) => i.id));
  const lockedIds = new Set(rec.locked.map((l) => l.id));
  for (const n of sc.needs) {
    const ps = NEED_PRODUCTS[n];
    if (!ps.some((p) => have.has(p) || lockedIds.has(p))) bad(sc.who, `asked for ${n} but it's neither in the plan nor shown as locked`);
  }
  for (const id of sc.expectIn ?? []) if (!have.has(id)) bad(sc.who, `expected ${byId[id].name} in the plan`);
  for (const id of sc.expectNot ?? []) if ([basic, r, complete].some((b) => b.items.some((i) => i.id === id))) bad(sc.who, `${byId[id].name} should not be offered`);
  for (const id of sc.expectLocked ?? []) if (!lockedIds.has(id)) bad(sc.who, `expected ${byId[id].name} locked with a reason`);
  if (rec.locked.some((l) => !l.reasons.length)) bad(sc.who, "a locked item has no reason");
  // branch by branch: the split plan must cost the same and stay valid
  if (ctx.sites > 1) {
    const p = priceBranches(splitBase(r, ctx.sites), fitBranches(null, ctx.sites), catalogue, ctx);
    if (p.monthly !== r.monthly || p.violations.length) bad(sc.who, `branch split changes the price or breaks a rule (${p.monthly} vs ${r.monthly})`);
  }
  console.log(`• ${sc.who}\n    Recommended ₹${r.monthly}/month (Basic ₹${basic.monthly}, Complete ₹${complete.monthly}), setup ₹${r.setup}, ${r.contractMonths} months: ${names(r)}` +
    (rec.locked.length ? `\n    Locked: ${rec.locked.map((l) => `${byId[l.id].name} (${l.reasons.map((x) => x.code).join("/")})`).join(", ")}` : ""));
}
// everyday words owners type or say for their business (used for voice and when the AI isn't available)
const WORDS = { "medical store": "Pharmacy", "chemist shop": "Pharmacy", "किराना की दुकान": "Kirana store", "dentist": "Dental clinic", "CA office": "CA firm",
  "saree shop": "Boutique", "kapda dukan": "Boutique", "garment factory": "Textile unit", "mobile shop": "Mobile repair shop", "tuition classes": "Coaching centre",
  "मिठाई की दुकान": "Sweet shop", "beauty parlour": "Salon", "cosmetics shop": "Other shop or service", "doctor clinic": "Other office or clinic", "school": "Other office or clinic" };
let wordOk = 0;
for (const [w, type] of Object.entries(WORDS)) { const r = keywordClassify(w, ref.businessTypes); r?.type === type ? wordOk++ : bad(w, `matched ${r?.type} instead of ${type}`); }
console.log(`Business words: ${wordOk}/${Object.keys(WORDS).length} matched to the right type`);
console.log(failed ? `\n${failed} scenario check(s) failed` : `\nAll ${S.length} scenarios passed`);
process.exit(failed ? 1 : 0);
