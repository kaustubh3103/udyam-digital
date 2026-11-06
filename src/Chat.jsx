import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, ArrowRight, PhoneCall, CircleCheck } from "lucide-react";
import { getLLM, disableLLM, PERMANENT } from "./ai/llm.js";
import { RULES, buildContext, validateUpdates, validateReply, allowedAmounts, checkPrices } from "./ai/assistant.js";
import { catalogue, reference, inr } from "./data.js";
import { PRODUCT_NAMES, productName } from "./i18n.js";
import { Mic } from "./ui.jsx";

/**
 * Saathi chat. Props:
 *  s, t           app state and translator
 *  derive(state)  -> { rec, bundle, missing, businessName } using the same rules as the screens
 *  apply(state, updates) -> { patch, notes }  validated changes to the owner's answers
 *  commit(patch)  writes the patch into app state
 *  navigate(step) moves the app to a screen (respects what is still missing)
 *  onCallback()   asks a person to call
 */
export default function Chat({ s, t, derive, apply, commit, navigate, onCallback, onClose, msgs: keptMsgs, setMsgs: keepMsgs }) {
  // The conversation lives in the parent, so closing and reopening Saathi keeps it.
  const [localMsgs, setLocalMsgs] = useState([]);
  const msgs = keptMsgs ?? localMsgs;
  const setMsgs = keepMsgs ?? setLocalMsgs;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiState, setAiState] = useState("checking"); // checking | on | off
  const ctlRef = useRef(null);
  const listRef = useRef(null);
  const stateRef = useRef(s);
  stateRef.current = s;

  useEffect(() => { getLLM().then((l) => setAiState(l ? "on" : "off")); }, []);

  // On open: show what Saathi already knows about this owner, so nothing has to be repeated.
  // A fresh note is added only if the owner has moved on since the last one.
  useEffect(() => {
    const d = derive(s);
    const key = [s.step, s.bizType, s.empBand, s.siteBand, s.city, s.gst?.gstin || s.noGst, s.needs.join(","), s.tier, d.bundle?.monthly].join("|");
    setMsgs((m) => {
      const lastIntro = [...m].reverse().find((x) => x.intro);
      if (lastIntro?.key === key) return m;
      return [...m, { role: "assistant", intro: true, key, step: s.step, facts: knownFacts(s, d, t), plan: planCard(s), first: !m.length }];
    });
  }, []);
  useEffect(() => { listRef.current?.scrollTo?.({ top: 1e6, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => ctlRef.current?.abort(), []);

  const planCard = (st) => {
    const d = derive(st);
    if (!d.bundle) return null;
    return {
      tier: st.tier, monthly: d.bundle.monthly, setup: d.bundle.setup, contract: d.bundle.contractMonths,
      items: d.bundle.items.map((i) => ({ id: i.id, qty: i.qty })),
    };
  };

  async function send(raw) {
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    setText("");
    const history = msgs.filter((m) => !m.intro && m.text).slice(-8);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    const llm = await getLLM();
    if (!llm) {
      setAiState("off");
      setMsgs((m) => [...m, offlineAnswer(q, stateRef.current)]);
      setBusy(false);
      return;
    }
    const st = stateRef.current;
    const before = derive(st);
    const plan = before.bundle ? describePlan(st, before) : null;
    const context = buildContext({ s: st, catalogue, names: PRODUCT_NAMES.en, reference, plan, missing: before.missing });
    const input = [
      { role: "user", content: RULES },
      ...history.map((h) => ({ role: h.role, content: h.text })),
      { role: "user", content: `${context}\n\nOWNER'S LATEST MESSAGE:\n${q}` },
    ];
    ctlRef.current = new AbortController();
    try {
      const raw = await llm.json(input, { signal: ctlRef.current.signal });
      const v = validateReply(raw);
      const { clean } = validateUpdates(v.updates, reference);
      const { patch, notes } = apply(st, clean);
      const after = { ...st, ...patch };
      const d = derive(after);
      if (Object.keys(patch).length) commit(patch);
      let reply = v.reply || t("chatFallbackReply");
      let showPlan = v.showPlan && !!d.bundle;
      const guard = checkPrices(reply, allowedAmounts(catalogue, [before.rec, d.rec]));
      if (!guard.ok) { reply = t("chatPriceGuard"); showPlan = !!d.bundle; }
      if (v.callback) onCallback();
      setMsgs((m) => [...m, {
        role: "assistant", text: reply, notes, changed: Object.keys(clean),
        plan: showPlan ? planCard(after) : null, goTo: v.goTo, callback: v.callback, guarded: !guard.ok,
      }]);
    } catch (e) {
      if (e?.code === "cancelled") { /* closed */ }
      else if (PERMANENT.has(e?.code)) { disableLLM(); setAiState("off"); setMsgs((m) => [...m, offlineAnswer(q, stateRef.current)]); }
      else setMsgs((m) => [...m, { role: "assistant", text: e?.code === "rate_limited" ? t("chatBusy") : t("chatError"), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  function offlineAnswer(q, st) {
    const d = derive(st);
    const b = d.bundle;
    const lower = q.toLowerCase();
    const pick = (words) => words.some((w) => lower.includes(w));
    let key = null;
    if (pick(["lock", "contract", "cancel", "लॉक", "बंद कर", "कॉन्ट्रैक्ट"])) key = "lockin";
    else if (pick(["down", "fail", "बंद हो", "रुक", "outage"])) key = "down";
    else if (pick(["install", "when", "कब", "इंस्टॉल"])) key = "when";
    else if (pick(["hidden", "charge", "छुपा", "चार्ज", "extra"])) key = "hidden";
    const text = key && !b && key !== "down" ? t("chatNeedPlan")
      : key
      ? key === "lockin" ? t("faqA.lockin", b?.contractMonths ?? 12)
        : key === "down" ? t("faqA.down", !!b?.items.some((i) => i.id === "P09"))
        : key === "when" ? t("faqA.when", b?.installDays ?? 5)
        : t("faqA.hidden", b?.setup ? inr(b.setup) : "")
      : t("chatOffline");
    return { role: "assistant", text, offline: true, plan: b && pick(["price", "plan", "कितना", "क़ीमत", "प्लान", "kitna"]) ? planCard(st) : null };
  }

  const stepSuggest = t("chatSuggestFor." + s.step);
  const suggestions = Array.isArray(stepSuggest) ? stepSuggest : [t("chatSuggest1"), t("chatSuggest2"), t("chatSuggest3")];

  return (
    <div className="chat" role="dialog" aria-modal="true" aria-label={t("chatTitle")}>
      <div className="chat-head">
        <span className="chat-avatar" aria-hidden="true"><Sparkles size={18} strokeWidth={2} /></span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <strong>{t("chatTitle")}</strong>
          <span className="small chat-status">
            {aiState === "on" ? t("chatStatusOn") : aiState === "off" ? t("chatStatusOff") : "…"}
          </span>
        </div>
        <button className="icon-btn chat-close" onClick={onClose} aria-label={t("close")}><X size={20} /></button>
      </div>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={"bubble " + m.role + (m.error ? " err" : "") + (m.intro ? " intro" : "")}>
            {m.intro ? (
              <>
                {m.first && <p>{t("chatHello")}</p>}
                {m.facts.length > 0 ? (
                  <>
                    <strong className="chat-resume">{t("chatResumeTitle")}</strong>
                    <p className="small sub">{t("chatResume", t("chatScreen." + m.step))}</p>
                    <div className="chat-facts">{m.facts.map((f) => <span key={f} className="pill info">{f}</span>)}</div>
                  </>
                ) : !m.first && <p>{t("chatHello")}</p>}
              </>
            ) : <p>{m.text}</p>}
            {m.changed?.length > 0 && (
              <div className="chat-changes">
                <CircleCheck size={14} /> {t("chatFilled")}: {m.changed.map((k) => t("chatField." + k)).join(", ")}
              </div>
            )}
            {m.notes?.map((n, j) => <div key={j} className="chat-note">{t("chatNote." + n.code, n.value)}</div>)}
            {m.plan && (
              <div className="chat-plan">
                <div className="chat-plan-top">
                  <span className="small">{t("tiers")[m.plan.tier]}</span>
                  <span className="chat-plan-price num">{inr(m.plan.monthly)}<small>{t("perMonth")}</small></span>
                </div>
                <ul>{m.plan.items.map((it) => <li key={it.id}>{productName(s.lang, it.id)}{it.qty > 1 ? ` × ${it.qty}` : ""}</li>)}</ul>
                <span className="small muted">{m.plan.setup ? `${t("setupFee")}: ${inr(m.plan.setup)} · ` : ""}{t("contract", m.plan.contract)}</span>
                <span className="small muted">{t("chatPlanFromRules")}</span>
              </div>
            )}
            {(m.plan || m.goTo) && (
              <button className="chat-action" onClick={() => { navigate(m.goTo || "plan"); onClose(); }}>
                {m.goTo && m.goTo !== "plan" ? t("chatContinue") : t("chatOpenPlan")} <ArrowRight size={16} />
              </button>
            )}
            {m.callback && <div className="chat-note"><PhoneCall size={14} /> {t("callbackDone")}</div>}
          </div>
        ))}
        {busy && <div className="bubble assistant typing"><span /><span /><span /></div>}
        {msgs.length > 0 && msgs[msgs.length - 1].intro && !busy && (
          <div className="chips chat-suggest">
            {suggestions.map((q) => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Mic lang={s.lang} t={t} compact onText={(heard) => { setText(heard); return true; }} />
        <input id="chat-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("chatPh")} autoComplete="off" />
        <button className="send" type="submit" disabled={!text.trim() || busy} aria-label={t("chatSend")}><Send size={18} /></button>
      </form>
      <p className="chat-foot small muted">{t("chatDisclaimer")}</p>
    </div>
  );
}

/** Short, owner-facing list of what Saathi already knows. Built by code, not by the model. */
function knownFacts(s, d, t) {
  const f = [];
  if (d.businessName) f.push(d.businessName);
  if (s.empBand) f.push(t("chatFact.staff", t("emp." + s.empBand)));
  if (s.siteBand && s.siteBand !== "1") f.push(t("chatFact.sites", t("siteB." + s.siteBand)));
  if (s.city) f.push(s.city);
  if (s.gst) f.push(t("chatFact.gst"));
  else if (s.noGst) f.push(t("chatFact.noGst"));
  if (s.needs.length) {
    const names = s.needs.slice(0, 2).map((n) => t("chatNeedShort." + n));
    f.push(names.join(", ") + (s.needs.length > 2 ? ` +${s.needs.length - 2}` : ""));
  }
  if (d.bundle) f.push(`${t("tiers")[s.tier]} · ${inr(d.bundle.monthly)}${t("perMonth")}`);
  return f;
}

function describePlan(st, d) {
  const names = PRODUCT_NAMES.en;
  const tierName = { basic: "Basic", recommended: "Recommended", complete: "Complete" }[st.tier];
  const others = Object.entries(d.rec.tiers).map(([k, v]) =>
    `${k}: ₹${v.monthly}/month, setup ₹${v.setup} (${v.items.map((i) => `${names[i.id]} × ${i.qty}`).join("; ")})`).join(" | ");
  return {
    tierName, monthly: d.bundle.monthly, setup: d.bundle.setup, contractMonths: d.bundle.contractMonths, installDays: d.bundle.installDays,
    items: d.bundle.items, others, locked: d.rec.locked.map((l) => names[l.id]).join(", "),
  };
}
