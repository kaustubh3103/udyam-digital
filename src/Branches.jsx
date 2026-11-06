import React, { useState } from "react";
import { Store, Lock, Plus, Check, Layers, ChevronDown } from "lucide-react";
import { productName } from "./i18n.js";
import { Chip, Note, Sheet } from "./ui.jsx";
import { Tile } from "./icons.jsx";
import { catalogue, inr } from "./data.js";
import { LINK_IDS, BRANCH_QTY, priceOrder, newBranch, branchItems } from "./engine/branches.js";

export const branchLabel = (t, b, i) => (b?.name || "").trim() || t("branchN", (i ?? b?.index ?? 0) + 1);

function Stepper({ t, value, onChange }) {
  return (
    <span className="stepper" aria-label={t("qty")}>
      <button onClick={() => onChange(value - 1)} aria-label="−">−</button>
      <span className="num">{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label="+">+</button>
    </span>
  );
}

/**
 * One branch: its name, what is installed there and what it costs.
 * `raw` is the owner's choices for the branch ({ key, name, qty, off }), `priced` the same branch after the rules ran,
 * `defaults` the plan's per-branch items. Without handlers the card is read-only.
 */
export function BranchCard({ t, lang, raw, priced, defaults, index, status, open: openInit, onRename, onQty, onToggle }) {
  const [open, setOpen] = useState(!!openInit);
  const editable = !!onToggle;
  const off = new Set(raw.off || []);
  return (
    <div className={"branch" + (open ? " open" : "")} data-branch={raw.key}>
      <button className="branch-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Tile as={Store} size={18} />
        <span className="branch-name">
          <strong>{branchLabel(t, raw, index)}</strong>
          {status && <span className={"pill " + (status === "live" ? "ok" : "info")}>{t("branchStatus." + status)}</span>}
        </span>
        <span className="num branch-amt">{t("branchCost", inr(priced.monthly))}</span>
        <ChevronDown size={18} className="chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="branch-body">
          {onRename && (
            <input className="input" aria-label={t("branchNamePh")} placeholder={t("branchNamePh")} value={raw.name}
              onChange={(e) => onRename(e.target.value.slice(0, 40))} />
          )}
          <div className="items">
            {defaults.map((d) => {
              const isOff = off.has(d.id) && !LINK_IDS.includes(d.id);
              const cur = priced.items.find((x) => x.id === d.id);
              const qty = raw.qty?.[d.id] ?? d.qty;
              return (
                <div key={d.id} className={"item" + (isOff ? " off" : "")}>
                  <span className="nm">{productName(lang, d.id)}{qty > 1 && !(editable && BRANCH_QTY.has(d.id)) ? ` × ${qty}` : ""}</span>
                  <span className="amt">{isOff ? "—" : inr(cur?.monthly ?? 0)}</span>
                  {isOff && <span className="why">{t("branchOff")}</span>}
                  {editable && !LINK_IDS.includes(d.id) && (
                    <div className="ctl">
                      {BRANCH_QTY.has(d.id) && !isOff && <Stepper t={t} value={qty} onChange={(q) => onQty(d.id, Math.max(1, Math.min(50, q)))} />}
                      <button className="tiny-btn" onClick={() => onToggle(d.id)}>{isOff ? t("add") : t("remove")}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SharedCard({ t, lang, shared }) {
  return (
    <div className="branch open shared">
      <div className="branch-head static">
        <Tile as={Layers} size={18} tone="gold" />
        <span className="branch-name"><strong>{t("sharedTitle")}</strong></span>
        <span className="num branch-amt">{t("branchCost", inr(shared.monthly))}</span>
      </div>
      <div className="branch-body">
        {shared.items.length ? (
          <div className="items">
            {shared.items.map((i) => (
              <div key={i.id} className="item">
                <span className="nm">{productName(lang, i.id)}{i.qty > 1 ? ` × ${i.qty}` : ""}</span>
                <span className="amt">{inr(i.monthly)}</span>
              </div>
            ))}
          </div>
        ) : <span className="small muted">{t("sharedNone")}</span>}
      </div>
    </div>
  );
}

/** "Add a service": every product the owner can still add, with the rule that blocks the locked ones. */
export function AddServiceSheet({ t, lang, list, lockReason, onAdd, onClose }) {
  return (
    <Sheet title={t("addService")} onClose={onClose}>
      <p className="small sub">{t("addServiceSub")}</p>
      <div className="add-list">
        {list.map(({ product: p, ok, reasons, qty }) => (
          <div key={p.id} className={"add-row" + (ok ? "" : " locked")}>
            <div className="add-main">
              <strong>{productName(lang, p.id)}</strong>
              <span className="small sub num">
                {inr(p.priceMin)}{t("perMonthShort")} · {t("unit")[p.unit] || p.unit}{p.setup ? ` · ${t("setupShort", inr(p.setup))}` : ""}
              </span>
              {!ok && <span className="small muted"><Lock size={12} aria-hidden="true" /> {lockReason(reasons[0])}</span>}
            </div>
            {ok && <button className="btn small" onClick={() => onAdd(p.id, qty)}><Plus size={14} /> {t("addBtn")}</button>}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/** Bar showing how the monthly bill splits across branches and shared items. */
function SpendBar({ t, plan }) {
  const parts = [...plan.branches.map((b, i) => ({ k: b.key, label: branchLabel(t, b, i), v: b.monthly })), { k: "shared", label: t("billShared"), v: plan.shared.monthly }].filter((p) => p.v > 0);
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div className="spend">
      <div className="spend-bar" aria-hidden="true">
        {parts.map((p, i) => <span key={p.k} style={{ width: `${(p.v / total) * 100}%` }} className={"seg s" + (p.k === "shared" ? "x" : i % 6)} />)}
      </div>
      <div className="spend-legend">
        {parts.map((p, i) => (
          <span key={p.k}><i className={"seg s" + (p.k === "shared" ? "x" : i % 6)} />{p.label} <span className="num">{inr(p.v)}</span></span>
        ))}
      </div>
    </div>
  );
}

/**
 * After booking: every branch, its services, its cost and status, the combined bill, and "Add a branch".
 * Works from the order snapshot so the booked plan never shifts under the owner.
 */
export function MyBranches({ s, up, t, onChanged }) {
  const order = s.order;
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(null);
  if (!order?.split) return null;
  const plan = priceOrder(order, catalogue);
  const p = order.progress ?? 0;
  const statusOf = (b) => (b.added ? "booked" : p >= 4 ? "live" : "installing");
  const setBranches = (fn) => up((x) => {
    const branches = fn(x.order.branches);
    const next = { ...x.order, branches, ctx: { ...x.order.ctx, sites: branches.length } };
    onChanged?.(next);
    return { order: next };
  });
  const edit = (key, fn) => setBranches((list) => list.map((b) => (b.key === key ? fn(b) : b)));
  const many = plan.branches.length > 1;

  return (
    <div className="group my-branches" style={{ gap: 10 }}>
      <div>
        <h2>{many ? t("myBizTitle") : t("myBizTitleOne")}</h2>
        <p className="small sub">{t("myBizSub")}</p>
      </div>
      <div className="card-dark bill-card">
        <span className="small">{t("combinedBill")}</span>
        <div className="price">{inr(plan.monthly)}<small> {t("perMonth")}</small></div>
        <SpendBar t={t} plan={plan} />
        <span className="small muted">{t("billOne")}</span>
      </div>
      {done && <Note kind="ok">{done}</Note>}
      {plan.branches.map((b, i) => (
        <BranchCard key={b.key} t={t} lang={s.lang} raw={order.branches[i]} priced={b} defaults={order.split.perBranch} index={i}
          status={statusOf(order.branches[i])} open={!many}
          onRename={(v) => edit(b.key, (x) => ({ ...x, name: v }))}
          onQty={(id, q) => edit(b.key, (x) => ({ ...x, qty: { ...x.qty, [id]: q } }))}
          onToggle={(id) => edit(b.key, (x) => ({ ...x, off: x.off?.includes(id) ? x.off.filter((y) => y !== id) : [...(x.off || []), id] }))} />
      ))}
      <SharedCard t={t} lang={s.lang} shared={plan.shared} />
      <button className="btn ghost" onClick={() => { setAdding(true); setDone(null); }}><Plus size={16} /> {t("addBranch")}</button>
      <p className="small muted">{t("changeNote")}</p>
      {adding && (
        <AddBranchSheet t={t} lang={s.lang} order={order} onClose={() => setAdding(false)}
          onAdd={(name, from) => {
            setBranches((list) => [...list, { ...newBranch(name, from, list), added: true, at: new Date().toISOString() }]);
            setAdding(false);
            setDone(t("addBranchDone", name.trim() || t("branchN", order.branches.length + 1)));
          }} />
      )}
    </div>
  );
}

function AddBranchSheet({ t, lang, order, onAdd, onClose }) {
  const [name, setName] = useState("");
  const [fromKey, setFromKey] = useState(order.branches[0].key);
  const from = order.branches.find((b) => b.key === fromKey) || order.branches[0];
  const trial = { ...order, branches: [...order.branches, newBranch(name, from, order.branches)] };
  trial.ctx = { ...order.ctx, sites: trial.branches.length };
  const now = priceOrder(order, catalogue), after = priceOrder(trial, catalogue);
  const items = branchItems(order.split, from);
  return (
    <Sheet title={t("addBranch")} onClose={onClose}>
      <p className="small sub">{t("addBranchSub")}</p>
      <input id="newbranch" className="input" placeholder={t("branchNamePh")} value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} />
      {order.branches.length > 1 && (
        <div className="group" style={{ gap: 6 }}>
          <span className="group-label">{t("copyFrom")}</span>
          <div className="chips">
            {order.branches.map((b, i) => <Chip key={b.key} pressed={b.key === fromKey} onClick={() => setFromKey(b.key)}>{branchLabel(t, b, i)}</Chip>)}
          </div>
        </div>
      )}
      <div className="items">
        {items.map((i) => <div key={i.id} className="item"><span className="nm">{productName(lang, i.id)}{i.qty > 1 ? ` × ${i.qty}` : ""}</span></div>)}
      </div>
      <Note kind="info">{t("addBranchCost", inr(after.monthly - now.monthly))}</Note>
      <button className="btn" disabled={after.violations.length > 0} onClick={() => onAdd(name, from)}><Check size={16} /> {t("addBranchBtn")}</button>
    </Sheet>
  );
}
