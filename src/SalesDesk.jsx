import React, { useMemo, useState } from "react";
import { dashboard, stalledLeads, leadModel, inr } from "./data.js";
import { scoreLead } from "./engine/score.js";

const K = dashboard.kpis;
const SEG = { micro: "Micro retail", prof: "Professional", multi: "Multi-site", mfg: "Manufacturer" };
const INTERNET = { hotspot: "Mobile hotspot", home: "Home broadband", business: "Business broadband", leased: "Leased line", mixed: "Mixed per site" };
const PARTNERS = [
  { name: "Sharma Telecom", code: "PTR-1042" },
  { name: "Field sales · Priya N.", code: "FS-0318" },
];
const scoreClass = (n) => (n >= 15 ? "hi" : n >= 8 ? "md" : "lo");
const ACTION = {
  "Advisor (no visit needed)": "Send WhatsApp link to finish in the app",
  "Instant transparent quote": "Send the instant quote link",
  "Smart KYC lookup": "Send link: GSTIN lookup replaces documents",
  "Aadhaar e-sign": "Send Aadhaar e-sign link to the signatory",
  "Smart KYC validation": "Call: fix the mismatched detail together",
  "Serviceability check + 5G fallback": "Offer 5G AirFiber (2-day install)",
  "UPI AutoPay": "Send UPI AutoPay set-up link",
  "Self-booked install slot + tracker": "Send self-booking link for install slot",
  "Needs-based advisor": "Call: show bundle beyond the mobile plan",
};

export default function SalesDesk({ callbacks, orders, onStartAssisted }) {
  const [seg, setSeg] = useState("all");
  const [sent, setSent] = useState({});
  const live = callbacks.map((c, i) => {
    const sc = scoreLead({
      seg: c.seg, source: c.partner ? "Channel partner" : "Website form", gstin: c.gstin, internet: INTERNET[c.internet],
      emp: c.empBand, sites: c.siteBand, accel: c.accel ? "Y" : "N",
    }, leadModel);
    return { id: "APP-" + (i + 1), live: true, business: c.business, type: c.type, seg: c.seg, city: c.city || "—", lang: c.lang,
      stage: `In app: ${c.stage}`, reason: "Asked for a call", fix: null, score: sc.score, why: sc.why, at: c.at, monthly: c.monthly };
  });
  const queue = useMemo(() => [...stalledLeads].sort((a, b) => b.score - a.score), []);
  const shown = [...live.reverse(), ...queue.filter((l) => seg === "all" || l.seg === seg)].slice(0, 40);

  // drop-offs grouped by the module that removes them
  const byFix = {};
  let notFixable = 0;
  for (const d of dashboard.drops) { if (d.fix) byFix[d.fix] = (byFix[d.fix] || 0) + d.n; else notFixable += d.n; }
  const fixRows = Object.entries(byFix).sort((a, b) => b[1] - a[1]);
  const totalDrops = dashboard.drops.reduce((s, d) => s + d.n, 0);
  const fixable = totalDrops - notFixable;
  const afterContact = dashboard.drops.filter((d) => d.stage !== "Lead").reduce((x, d) => x + d.n, 0);
  const maxFix = fixRows[0]?.[1] || 1;
  const maxChurn = Math.max(...dashboard.followUps.map((f) => f.churn));

  return (
    <div className="desk">
      <div className="desk-head">
        <div>
          <h1>Sales &amp; partner desk</h1>
          <p className="sub">Leads the app couldn't close, ranked by who to call first. Baseline figures from {dashboard.period}.</p>
        </div>
        <div className="chips">
          {PARTNERS.map((p) => <button key={p.code} className="btn small" onClick={() => onStartAssisted(p)}>Start assisted sign-up · {p.name}</button>)}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span className="v num">{(K.conv * 100).toFixed(1)}%</span><span className="l">Lead to activation today</span><span className="t">Target 15%+</span></div>
        <div className="kpi"><span className="v num">{K.avgDays} days</span><span className="l">Lead to activation</span><span className="t">Target under 5 days</span></div>
        <div className="kpi"><span className="v num">{inr(K.cacPerActivation)}</span><span className="l">Cost per activated business</span><span className="t">Target ≤ ₹6,500</span></div>
        <div className="kpi"><span className="v num">{K.avgChases}</span><span className="l">Status calls per customer</span><span className="t">Target under 1</span></div>
      </div>

      {orders.length > 0 && (
        <div className="box">
          <h2>Orders from this demo session</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Order</th><th>Business</th><th>Segment</th><th>Channel</th><th className="r">Monthly</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}><td className="num">{o.id}</td><td>{o.business}</td><td>{SEG[o.seg]}</td><td>{o.partner ? `${o.partner.name} (${o.partner.code})` : "Self-serve"}</td><td className="r">{inr(o.monthly)}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <div className="two-col">
        <div className="box">
          <h2>Callback queue</h2>
          <div className="filter">
            {["all", "micro", "prof", "multi", "mfg"].map((k) => (
              <button key={k} className="chip" aria-pressed={seg === k} onClick={() => setSeg(k)}>{k === "all" ? "All" : SEG[k]}</button>
            ))}
          </div>
          <div className="queue">
            {shown.map((l) => (
              <div key={l.id} className="lead">
                <div className={"score " + scoreClass(l.score)}><span className="num">{l.score}<small>score</small></span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <strong>{l.business} {l.live && <span className="pill brand">New from app</span>}</strong>
                  <div className="meta"><span>{l.type}</span><span>{l.city}</span><span>{l.lang}</span><span>{l.stage}</span></div>
                  <div className="small">{l.reason}</div>
                  <div className="why">{l.why.map((w) => <span key={w} className="pill info">{w}</span>)}</div>
                </div>
                <div className="act">
                  <button className="btn small ghost" disabled={sent[l.id]} onClick={() => setSent({ ...sent, [l.id]: true })}>
                    {sent[l.id] ? "✓ Sent" : l.live ? "Call now" : ACTION[l.fix] || "Call"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="small muted">Score = chance of activation from a logistic model on the 5,000 leads (5-fold AUC {leadModel.auc}). The chips show which factors pushed it up. Names are masked.</p>
        </div>

        <div className="desk" style={{ gap: 16 }}>
          <div className="box">
            <h2>Where leads drop, and what removes it</h2>
            <p className="sub small">{Math.round((fixable / afterContact) * 100)}% of drops after first contact ({fixable.toLocaleString("en-IN")} of {afterContact.toLocaleString("en-IN")}) have a reason the digital journey removes directly. Counting never-reached leads too, it is {Math.round((fixable / totalDrops) * 100)}% of all {totalDrops.toLocaleString("en-IN")} drops.</p>
            <div className="bars">
              {fixRows.map(([fix, n]) => (
                <div key={fix} className="bar-row">
                  <span>{fix}</span>
                  <div className="track"><span style={{ width: `${(n / maxFix) * 100}%` }} /></div>
                  <span className="n">{n}</span>
                </div>
              ))}
              <div className="bar-row">
                <span className="muted">Not fixable by the app (price, unreachable, lock-in…)</span>
                <div className="track"><span className="muted" style={{ width: `${Math.min(100, (notFixable / maxFix) * 100)}%` }} /></div>
                <span className="n muted">{notFixable}</span>
              </div>
            </div>
          </div>

          <div className="box">
            <h2>Status chasing predicts churn</h2>
            <p className="sub small">6-month churn of activated customers, by how many times they called to chase their order.</p>
            <div className="bars">
              {dashboard.followUps.map((f) => (
                <div key={f.calls} className="bar-row">
                  <span>{f.calls} call{f.calls > 1 ? "s" : ""} <span className="muted small">({f.n})</span></span>
                  <div className="track"><span style={{ width: `${(f.churn / maxChurn) * 100}%` }} /></div>
                  <span className="n">{(f.churn * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="box">
            <h2>Rules the current process broke</h2>
            <div className="table-wrap"><table>
              <thead><tr><th>Check</th><th className="r">Today</th><th className="r">With app</th></tr></thead>
              <tbody>
                <tr><td>Products sold outside their city tier</td><td className="r">{K.eligibilityBreaches.tier}</td><td className="r">0</td></tr>
                <tr><td>GST-only products sold without GSTIN</td><td className="r">{K.eligibilityBreaches.gstin}</td><td className="r">0</td></tr>
                <tr><td>Add-ons sold without their base product</td><td className="r">{K.eligibilityBreaches.dependency}</td><td className="r">0</td></tr>
                <tr><td>Below minimum staff size</td><td className="r">{K.eligibilityBreaches.employees}</td><td className="r">0</td></tr>
                <tr><td>Activated on a cancelled or suspended GSTIN</td><td className="r">{K.activatedOnBadGstin}</td><td className="r">0</td></tr>
              </tbody>
            </table></div>
            <p className="small muted">“With app”: replay of all 5,000 leads through the rule engine (15,000 bundles) plus live registry status check. Run it with npm test.</p>
          </div>
        </div>
      </div>

      <div className="box">
        <h2>Segment economics today</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Segment</th><th className="r">Leads</th><th className="r">Conversion</th><th className="r">Cost per activation</th><th className="r">Avg monthly bill</th><th className="r">Payback</th><th className="r">6-month churn</th><th>Channel</th></tr></thead>
          <tbody>{dashboard.segments.map((s) => (
            <tr key={s.seg}>
              <td>{SEG[s.seg]}</td><td className="r">{s.leads.toLocaleString("en-IN")}</td><td className="r">{(s.conv * 100).toFixed(1)}%</td>
              <td className="r">{inr(s.cacPerActivation)}</td><td className="r">{inr(s.avgMonthly)}</td>
              <td className="r">{(s.cacPerActivation / s.avgMonthly).toFixed(1)} mo</td><td className="r">{(s.churn6m * 100).toFixed(0)}%</td>
              <td>{{ micro: "Self-serve only", prof: "Self-serve first", multi: "Assisted + app", mfg: "Field / partner + app" }[s.seg]}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
