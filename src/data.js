import catalogue from "./data/catalogue.json";
import gstReg from "./data/gstin_registry.json";
import udyamReg from "./data/udyam_registry.json";
import reference from "./data/reference.json";
import dashboard from "./data/dashboard.json";
import leadModel from "./data/lead_score.json";
import stalledLeads from "./data/stalled_leads.json";
import specimens from "./data/kyc_specimens.json";

export { catalogue, gstReg, udyamReg, reference, dashboard, leadModel, stalledLeads, specimens };

export const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
export const tierOfCity = (city) => reference.cities.find((c) => c.city === city)?.tier ?? 2;
export const segOfType = (type) => reference.businessTypes.find((b) => b.type === type)?.seg ?? "micro";

// Mock serviceability API: deterministic per pincode, tuned to the ~7% of sites in the
// data where fibre was not feasible. Try 400008 to see the AirFiber fallback.
export const fibreAvailable = (pin) => Number(pin) % 14 !== 0;

// Safe browser storage: never let a blocked or empty store break the app.
export const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const maskGstin = (g) => (g ? g.slice(0, 2) + "•••••" + g.slice(7, 11) + "•••" + g.slice(-1) : "");
export const maskPhone = (p) => (p ? p.slice(0, 2) + "••••••" + p.slice(-2) : "");
