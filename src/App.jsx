import React, { useEffect, useState } from "react";
import CustomerApp from "./CustomerApp.jsx";
import Explainer from "./Explainer.jsx";
import KycLab from "./KycLab.jsx";
import SalesDesk from "./SalesDesk.jsx";
import { store } from "./data.js";
import { Eye, EyeOff } from "lucide-react";

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
  // "Behind the screen" notes beside the phone: hide them for a clean demo (remembered in this browser)
  const [notes, setNotes] = useState(() => store.get("udyam-digital:notes", true));
  useEffect(() => store.set("udyam-digital:notes", notes), [notes]);
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
          {view === "app" && (
            <button type="button" className="notes-toggle" aria-pressed={notes} onClick={() => setNotes((x) => !x)}
              title={notes ? "Hide the Behind the screen notes" : "Show the Behind the screen notes"}>
              {notes ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {notes ? "Hide notes" : "Show notes"}
            </button>
          )}
        </div>
      </header>
      <main className={"page" + (view === "app" ? " customer" : "")}>
        {view === "app" && (
          <div className={"stage" + (notes ? "" : " solo")}>
            <CustomerApp
              partner={partner}
              onStep={setInfo}
              onCallback={(c) => setCallbacks((x) => [...x, c])}
              onLeadEvent={(e) => e.kind === "order" ? setOrders((x) => [...x, e]) : e.kind === "orderUpdate" && setOrders((x) => x.map((o) => (o.id === e.id ? { ...o, monthly: e.monthly, branches: e.branches } : o)))}
            />
            {notes && <Explainer info={info} />}
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
