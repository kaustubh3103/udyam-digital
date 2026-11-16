import caseCatalogue from "./data/catalogue.json";
import proposedProducts from "./data/proposed_products.json";
import attachRates from "./data/attach_rates.json";
import gstReg from "./data/gstin_registry.json";
import udyamReg from "./data/udyam_registry.json";
import reference from "./data/reference.json";
import dashboard from "./data/dashboard.json";
import leadModel from "./data/lead_score.json";
import stalledLeads from "./data/stalled_leads.json";
import specimens from "./data/kyc_specimens.json";
import { withGenerics } from "./ai/classify.js";

// The 35 specific types from the data, plus four broad "Other …" groups so every business fits somewhere.
reference.businessTypes = withGenerics(reference.businessTypes);

// The 25 products from the case, plus two proposed by us (Premium Care, Business Protection Cover), marked proposed: true.
const catalogue = [...caseCatalogue, ...proposedProducts];

export { catalogue, attachRates, gstReg, udyamReg, reference, dashboard, leadModel, stalledLeads, specimens };

export const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
export const tierOfCity = (city) => reference.cities.find((c) => c.city === city)?.tier ?? 2;
export const segOfType = (type) => reference.businessTypes.find((b) => b.type === type)?.seg ?? "micro";

export { fibreAvailable, CITY_PIN_PREFIXES, pinInCity, noFibrePinFor } from "./pincodes.js";

// Safe browser storage: never let a blocked or empty store break the app.
export const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const maskGstin = (g) => (g ? g.slice(0, 2) + "•••••" + g.slice(7, 11) + "•••" + g.slice(-1) : "");
export const maskPhone = (p) => (p ? p.slice(0, 2) + "••••••" + p.slice(-2) : "");
