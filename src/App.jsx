import React, { useEffect, useState } from "react";
import CustomerApp from "./CustomerApp.jsx";
import Explainer from "./Explainer.jsx";
import KycLab from "./KycLab.jsx";
import SalesDesk from "./SalesDesk.jsx";
import { store } from "./data.js";

const VIEWS = [
  { id: "app", label: "Owner app" },
  { id: "kyc", label: "KYC check" },
  { id: "desk", label: "Sales & partner desk" },
];
const viewFromHash = () => {
  const h = (typeof location !== "undefined" ? location.hash : "").replace("#", "");
  return VIEWS.some((v) => v.id === h) ? h : "app";
};

export default function App() {
  const [view, setView] = useState(viewFromHash);
  const [info, setInfo] = useState(null);
  const [partner, setPartner] = useState(null);
  const [callbacks, setCallbacks] = useState(() => store.get("udyam-digital:callbacks", []));
  const [orders, setOrders] = useState(() => store.get("udyam-digital:orders", []));

  useEffect(() => {
    const on = () => setView(viewFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => store.set("udyam-digital:callbacks", callbacks), [callbacks]);
  useEffect(() => store.set("udyam-digital:orders", orders), [orders]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [view]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="logo"><span className="logo-mark">A</span>Accel Business <span className="muted small" style={{ fontFamily: "var(--body)", fontWeight: 400 }}>· Udyam Digital</span></div>
          <nav className="views" aria-label="Views">
            {VIEWS.map((v) => <a key={v.id} href={"#" + v.id} aria-current={view === v.id ? "page" : undefined}>{v.label}</a>)}
          </nav>
        </div>
      </header>
      <main className={"page" + (view === "app" ? " customer" : "")}>
        {view === "app" && (
          <div className="stage">
            <CustomerApp
              partner={partner}
              onStep={setInfo}
              onCallback={(c) => setCallbacks((x) => [...x, c])}
              onLeadEvent={(e) => e.kind === "order" ? setOrders((x) => [...x, e]) : e.kind === "orderUpdate" && setOrders((x) => x.map((o) => (o.id === e.id ? { ...o, monthly: e.monthly, branches: e.branches } : o)))}
            />
            <Explainer info={info} />
          </div>
        )}
        {view === "kyc" && <KycLab />}
        {view === "desk" && (
          <SalesDesk callbacks={callbacks} orders={orders}
            onStartAssisted={(p) => { setPartner({ ...p, at: Date.now() }); location.hash = "app"; }} />
        )}
      </main>
    </>
  );
}
