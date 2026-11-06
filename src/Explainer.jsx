import React from "react";
import { dashboard, inr } from "./data.js";

const K = dashboard.kpis;

// "Behind the screen": what the system is doing at each step, and which drop-off it removes.
// Shown beside the phone on wide screens for demos.
export default function Explainer({ info }) {
  const step = info?.step || "welcome";
  const card = CARDS[step]?.(info) || CARDS.welcome(info);
  return (
    <aside className="explain" aria-label="Behind the screen">
      <span className="eyebrow">Behind the screen</span>
      <div className="explain-card">
        <h2>{card.title}</h2>
        <ul>{card.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        {card.fixes && <p className="small"><span className="pill brand">Fixes</span> {card.fixes}</p>}
      </div>
      <div className="explain-card">
        <h3>The rule</h3>
        <p className="sub">GenAI listens, reads and explains, in any language. Plain rules decide every product, price and KYC result, and code checks every rupee amount the AI writes, so the owner never sees a made-up price or an ineligible product.</p>
        <p className="small muted">Replay test: all 5,000 leads × 3 plans = 15,000 bundles, 0 eligibility violations. The current process sold {K.eligibilityBreachTotal} bundles that broke catalogue rules, and activated {K.activatedOnBadGstin} customers on cancelled or suspended GSTINs.</p>
      </div>
    </aside>
  );
}

const CARDS = {
  welcome: () => ({
    title: "One app, from interest to installation",
    points: [
      "Saathi, the GenAI assistant, answers in the owner's language and can fill in the whole form from one message. It proposes answers; code validates them against fixed lists; the rule engine prices the plan.",
      `Today: ${(K.conv * 100).toFixed(1)}% of leads activate, after ${K.avgDays} days and ${K.avgChases} status calls on average.`,
      `Blended acquisition cost is ${inr(K.cacPerActivation)} per activated business.`,
      "Language comes first. Hindi, English and Marathi work now; the rest of the 10 languages in the leads data are switched on as translations land.",
    ],
  }),
  phone: () => ({
    title: "Phone number first, so progress is never lost",
    points: [
      `${K.existingAccelMobile.toLocaleString("en-IN")} of 5,000 leads (30%) already have an Accel mobile number. Their ID is verified, so KYC reuses it.`,
      "Progress saves after every tap. An owner who gets busy can continue later from a WhatsApp link.",
    ],
    fixes: "“Owner had no time for a visit” (531 leads), the biggest single drop reason.",
  }),
  otp: () => ({ title: "One-time code", points: ["Demo code is 123456.", "Try 98100 00001 to see the existing-customer path."] }),
  biz: () => ({
    title: "Business type sets the segment",
    points: [
      "“Other”: the owner taps the closest of four broad groups and types what the business is. The plan depends only on the group, so a tap does this better than AI: instant, free, no permission prompt. The name is shown on the plan and passed to sales.",
      "35 business types map one-to-one to 4 segments in the data, so a single tap tells the rules what fits.",
      "Icons plus local-language labels work for owners who don't read English. The mic matches speech to a card; the owner confirms by seeing it highlighted.",
    ],
  }),
  gst: (i) => ({
    title: "One input replaces three questions",
    points: [
      "GSTIN format and check digit are validated as the owner types, so a mistyped character is caught before lookup.",
      "Lookup fills business name, owner, constitution, address and city, and starts KYC in the background.",
      i?.gst && i.gst !== "Active" && i.gst !== "none" ? "This GSTIN is not active, so GST-only products will be locked with a reason." : `Leads with a GSTIN activate at ${(K.convWithGstin * 100).toFixed(1)}% vs ${(K.convWithoutGstin * 100).toFixed(1)}% without.`,
      "No GST? The owner still gets a plan built from products that don't need one.",
    ].filter(Boolean),
    fixes: "“Missing GST or Udyam document” (94) and “Found paperwork too long” (79).",
  }),
  size: () => ({
    title: "Ranges, not exact numbers",
    points: [
      "Chip ranges line up with the catalogue's minimums (1, 5, 10, 25 staff; 1, 3 sites).",
      "The rules use the lower end of a range, so a range can never unlock a product the business doesn't qualify for.",
      "Two or more branches move a shop or office to the multi-site plans.",
    ],
  }),
  loc: (i) => ({
    title: "Check the area before the owner pays",
    points: [
      "Mock serviceability lookup by pincode. In production this calls the network inventory API.",
      i?.fibreOk === false ? "No fibre here, so the plan switches to 5G AirFiber, which needs no cable and installs in about 2 days." : "If fibre isn't available, the plan switches to 5G AirFiber instead of failing after KYC.",
      "City sets the tier, which decides product availability (1 Gbps fibre is Tier-1 only).",
    ],
    fixes: "“Site not feasible for fibre” (41), which today is only discovered after KYC.",
  }),
  now: () => ({
    title: "Today's setup, for the value comparison",
    points: ["Optional. Spend is used only to show “one bill instead of many” on the plan screen.", "Current internet type is a strong signal in the lead score (hotspot users convert least)."],
  }),
  needs: (i) => ({
    title: "Ask about jobs, not products",
    points: [
      "Owners pick what they want to do. They never see product codes like P15 or SD-WAN.",
      "Options are ordered for the segment, from what similar businesses bought in the data.",
      `${i?.needs ?? 0} need(s) selected.`,
    ],
    fixes: "“Only wanted a mobile plan” (280), by showing what else fits the business.",
  }),
  plan: (i) => ({
    title: "Rules build the plan; a guard re-checks it",
    points: [
      `Rule engine picked ${i?.items} products from the 25-product catalogue using city tier, staff, branches, GST status, fibre availability and dependencies.`,
      `Independent guard re-checked the bundle: ${i?.violations === 0 ? "0 violations" : i?.violations + " violations (blocked)"}.`,
      i?.locked ? `${i.locked} requested product(s) shown as locked with the reason and how to unlock, instead of being silently sold.` : "Nothing locked for this business.",
      "Every sentence on this screen is pre-written and translated. Answers to questions are built from the plan's own numbers.",
    ],
    fixes: "“Quote too complex” (206) and “Quote took too long” (179): one price, instantly.",
  }),
  consent: () => ({
    title: "DPDP Act: consent, purpose, minimum data",
    points: [
      "One required consent for verification, with the purpose spelled out. Marketing is a separate, optional box, unticked by default.",
      "Retention is stated up front: documents deleted 90 days after activation.",
      "Consent time and purposes are recorded with the order.",
    ],
  }),
  kyc: (i) => ({
    title: "Look up first, upload only as a fallback",
    points: [
      i?.gst === "Active" ? "GST registration verified from the registry. No certificate upload." : "No GST: one document upload with an instant blur check.",
      i?.udyam ? "Udyam found by business name and city. No upload." : "Udyam is optional; looked up automatically when GST is present.",
      i?.accel ? "Signatory ID reused from the Accel mobile account." : "Signatory ID via DigiLocker (mock), sharing only name and ID number.",
      "Address proof skipped when installing at the GST address: less data collected, and the most error-prone document avoided.",
      "Aadhaar e-sign (mock) replaces the signature visit.",
    ],
    fixes: "“Authorised signatory not available” (53) and “Document details did not match” (47).",
  }),
  slot: () => ({
    title: "Owner books the visit; UPI AutoPay pays",
    points: ["Earliest slot = longest install time in the plan, from the catalogue.", "AutoPay mandate removes the first-payment failure step."],
    fixes: "“First payment failed” (28) and “Installation delayed beyond 21 days” (98).",
  }),
  track: () => ({
    title: "Tell the owner before they call",
    points: [
      "Each status change is pushed on WhatsApp (if the owner agreed).",
      "In the data, customers who chased status once churned at 5.9%; five times, 27.9%.",
      "Use “Demo: next update” to step through the timeline.",
    ],
  }),
};
