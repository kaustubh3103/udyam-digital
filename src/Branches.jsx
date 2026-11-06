import React, { useState } from "react";
import { Store, Lock, Plus, Check, Layers, ChevronDown, Copy } from "lucide-react";
import { productName } from "./i18n.js";
import { Chip, Note, Sheet } from "./ui.jsx";
import { Tile } from "./icons.jsx";
import { catalogue, inr } from "./data.js";
import { BRANCH_QTY, SIZES, priceOrder, newBranch, branchItems, toggleAt, sameAs as copyFrom, fitBranches, BAND_RANGE } from "./engine/branches.js";
import { fibreAvailable } from "./data.js";

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
 * `raw` is the owner's choices for the branch, `priced` the same branch after the rules ran (with `rows`: every
 * item that could be there). Without handlers the card is read-only. With `onSize`/`onPin` it is the full editor
 * used on the "Your branches" step.
 */
export function BranchCard({ t, lang, raw, priced, index, status, open: openInit, onRename, onQty, onToggle,
  onSize, onPin, sameAs, onSameAs, lockReason }) {
  const [open, setOpen] = useState(!!openInit);
  const editable = !!onToggle;
  const rows = editable ? priced.rows : priced.rows.filter((r) => r.on);
  const pinDone = (raw.pin || "").length === 6;
  return (
    <div className={"branch" + (open ? " open" : "")} data-branch={raw.key}>
      <button className="branch-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Tile as={Store} size={18} />
        <span className="branch-name">
          <strong>{branchLabel(t, raw, index)}</strong>
          {status && <span className={"pill " + (status === "live" ? "ok" : "info")}>{t("branchStatus." + status)}</span>}
          {!status && onSize && <span className="small muted">{t("size." + (raw.size || "regular"))}</span>}
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
          {onSameAs && sameAs && (
            <button className="btn ghost small same-as" onClick={onSameAs}><Copy size={14} /> {t("brSame", sameAs)}</button>
          )}
          {onSize && (
            <div className="group" style={{ gap: 6 }}>
              <span className="group-label">{t("brSize")}</span>
              <div className="chips">
                {SIZES.map((z) => <Chip key={z} pressed={(raw.size || "regular") === z} onClick={() => onSize(z)}>{t("size." + z)}</Chip>)}
              </div>
            </div>
          )}
          {onPin && (
            <div className="group" style={{ gap: 6 }}>
              <span className="group-label">{t("brPin")}</span>
              <input className="input num pin-input" inputMode="numeric" maxLength={6} placeholder={t("brPinPh")} value={raw.pin || ""}
                onChange={(e) => onPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              {pinDone ? <span className={"small " + (raw.fibreOk ? "ok-text" : "warn-text")}>{raw.fibreOk ? t("brFibreYes") : t("brFibreNo")}</span>
                : <span className="small muted">{t("brPinLater")}</span>}
            </div>
          )}
          {onSize && <span className="group-label">{t("brServices")}</span>}
          <div className="items">
            {rows.map((r) => {
              const cur = priced.items.find((x) => x.id === r.id);
              const locked = editable && !r.ok;
              return (
                <div key={r.id} className={"item" + (editable && !r.on ? " off" : "")} data-item={r.id}>
                  <span className="nm">{productName(lang, r.id)}{r.qty > 1 && !(editable && r.on && BRANCH_QTY.has(r.id)) ? ` × ${r.qty}` : ""}</span>
                  <span className="amt">{r.on ? inr(cur?.monthly ?? 0) : locked ? <Lock size={14} aria-label="locked" /> : "—"}</span>
                  {r.fixed && r.why?.key && r.why.key !== "link" && <span className="why">{t("why." + r.why.key)}</span>}
                  {locked && <span className="why">{lockReason ? lockReason(r.reason) : ""}</span>}
                  {editable && !r.fixed && !locked && (
                    <div className="ctl">
                      {BRANCH_QTY.has(r.id) && r.on && <Stepper t={t} value={r.qty} onChange={(q) => onQty(r.id, Math.max(1, Math.min(50, q)))} />}
                      <button className={r.on ? "tiny-btn" : "btn ghost small"} onClick={() => onToggle(r.id)}>{r.on ? t("remove") : <><Plus size={14} /> {t("addBtn")}</>}</button>
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
export function MyBranches({ s, up, t, onChanged, lockReason }) {
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
        <BranchCard key={b.key} t={t} lang={s.lang} raw={order.branches[i]} priced={b} index={i}
          status={statusOf(order.branches[i])} open={!many} lockReason={lockReason}
          onRename={(v) => edit(b.key, (x) => ({ ...x, name: v }))}
          onQty={(id, q) => edit(b.key, (x) => ({ ...x, qty: { ...x.qty, [id]: q } }))}
          onToggle={(id) => edit(b.key, (x) => toggleAt(x, id, order.split))} />
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
  const byId = Object.fromEntries(catalogue.map((p) => [p.id, p]));
  const items = branchItems(order.split, from, { ...order.ctx, sites: trial.branches.length }, byId);
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

/**
 * The "Your branches" step: for each branch its name, size, pincode and services. Branch 1 starts from the owner's
 * answers; every other branch starts as a copy of branch 1, so the owner changes only what is different.
 */
export function BranchesStep({ s, up, t, ctx, split, branches, bundle, lockReason }) {
  const [lo, hi] = BAND_RANGE[s.siteBand] ?? [1, 1];
  const set = (fn) => up((p) => ({ branches: fn(fitBranches(p.branches, ctx.sites)) }));
  const edit = (key, fn) => set((list) => list.map((b) => (b.key === key ? fn(b) : b)));
  const setCount = (n) => up((p) => ({ branches: fitBranches(p.branches, Math.max(lo, Math.min(hi, n))) }));
  const first = branches[0];
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("brTitle")}</h1><p className="sub">{t("brSub")}</p></div>
      <div className="branch-count">
        <span>{t("branchCount")}</span>
        <span className="stepper" aria-label={t("branchCount")}>
          <button onClick={() => setCount(ctx.sites - 1)} disabled={ctx.sites <= lo} aria-label="−">−</button>
          <span className="num" id="branchcount">{ctx.sites}</span>
          <button onClick={() => setCount(ctx.sites + 1)} disabled={ctx.sites >= hi} aria-label="+">+</button>
        </span>
      </div>
      {bundle.branches.map((b, i) => (
        <BranchCard key={b.key} t={t} lang={s.lang} raw={branches[i]} priced={b} index={i} open={i === 0} lockReason={lockReason}
          onRename={(v) => edit(b.key, (x) => ({ ...x, name: v }))}
          onSize={(z) => edit(b.key, (x) => ({ ...x, size: z, qty: {} }))}
          onPin={(v) => edit(b.key, (x) => ({ ...x, pin: v, fibreOk: v.length === 6 ? fibreAvailable(v) : null }))}
          onQty={(id, q) => edit(b.key, (x) => ({ ...x, qty: { ...x.qty, [id]: q } }))}
          onToggle={(id) => edit(b.key, (x) => toggleAt(x, id, split))}
          sameAs={i > 0 ? branchLabel(t, first, 0) : null}
          onSameAs={i > 0 ? () => edit(b.key, (x) => copyFrom(x, first)) : null} />
      ))}
      <SharedCard t={t} lang={s.lang} shared={bundle.shared} />
      <Note kind="info">{t("brSharedSub")}</Note>
      <div className="panel" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{t("combinedBill")}</strong><strong className="num" id="brtotal">{inr(bundle.monthly)}{t("perMonthShort")}</strong>
      </div>
    </div>
  );
}
