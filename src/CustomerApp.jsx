import React, { useEffect, useMemo, useState } from "react";
import { Phone, ArrowLeft, Volume2, Lock, Camera, Radio, Sparkles, Plus, IndianRupee, Star, Check } from "lucide-react";
import { LANGS, makeT, productName, bizLabel, VOICE_KEYWORDS, NEED_KEYWORDS } from "./i18n.js";
import { Opt, Chip, Note, Sheet, Mic, speak, matchKeywords } from "./ui.jsx";
import { BizIcon, NeedIcon, Tile } from "./icons.jsx";
import Chat from "./Chat.jsx";
import { GENERIC_TYPES } from "./ai/classify.js";
import { catalogue, gstReg, udyamReg, reference, inr, tierOfCity, segOfType, fibreAvailable, store, maskGstin } from "./data.js";
import { EMP_BANDS, SITE_BANDS, needsFor, makeCtx, recommend, editBundle } from "./engine/advisor.js";
import { validateGstinFormat, lookupGstin, findUdyamByBusiness, lookupUdyam, proprietorOf, sharpnessFromImageData, BLUR_THRESHOLD } from "./engine/kyc.js";

const FLOW = ["biz", "gst", "size", "loc", "now", "needs", "plan", "consent", "kyc", "slot"];
const SAVE_KEY = "udyam-digital:session";
const QTY_EDITABLE = new Set(["P07", "P08", "P12", "P16", "P20", "P23", "P24", "P25"]);
const SPEND_MID = { s1: 700, s2: 2000, s3: 6500, s4: 15000 };
const SAMPLE_GSTINS = [
  { label: "Active · Bakery, Ludhiana", g: "03PJNXS4821G1ZB" },
  { label: "Active · Dental clinic, Kochi", g: "32TTNXB7384T1ZW" },
  { label: "Cancelled GSTIN", g: "37IHKXV5167L1ZS" },
  { label: "One character altered", g: "08YKZXS8189L1ZO" },
];
const ACCEL_DEMO = { phone: "9810000001", name: "Sneha Rao" };

const initial = (partner) => ({
  step: "welcome", lang: "hi", phone: "", otpSent: false, otp: "", accel: null,
  verified: false, pendingStep: null,
  bizType: null, bizOther: null, gstInput: "", gst: null, noGst: false,
  empBand: null, siteBand: null, city: null, pincode: "", fibreOk: null,
  internet: null, spend: null, needs: [], showMoreNeeds: false,
  tier: "recommended", edits: { removed: [], qty: {} },
  consent: { req: false, wa: true, offers: false, at: null },
  kyc: { udyamInput: "", udyam: null, udyamTried: false, digi: false, addrDiff: false, bill: null, regDoc: null, signed: false },
  slot: { date: null, win: null }, upi: "",
  order: null, partner: partner || null,
});

// ---------------------------------------------------------------- shared logic (screens and Saathi use the same rules)
export function derive(s) {
  const baseSeg = s.bizType ? segOfType(s.bizType) : null;
  const sitesMin = SITE_BANDS.find((b) => b.id === s.siteBand)?.min ?? 1;
  const seg = baseSeg && sitesMin >= 2 && (baseSeg === "micro" || baseSeg === "prof") ? "multi" : baseSeg;
  const cityTier = s.city ? tierOfCity(s.city) : 1;
  const ctx = seg && s.empBand && s.siteBand
    ? makeCtx({ seg, empBand: s.empBand, siteBand: s.siteBand, cityTier, gstinActive: s.gst?.status === "Active", fibreOk: s.fibreOk !== false, needs: s.needs })
    : null;
  const rec = ctx ? recommend(ctx, catalogue) : null;
  const bundle = rec ? editBundle(rec.tiers[s.tier], s.edits, ctx, catalogue) : null;
  const businessName = s.gst?.tradeName || s.bizOther?.labelLocal || s.bizOther?.text || (s.bizType ? bizLabel(s.lang, s.bizType) : "");
  const MISSING_LABEL = { biz: "business type", gst: "GSTIN or 'no GST'", size: "staff and branches", loc: "city and pincode" };
  const missing = ["biz", "gst", "size", "loc"].filter((st) => !doneFor(st, s, bundle)).map((st) => MISSING_LABEL[st]);
  return { seg, sitesMin, ctx, rec, bundle, businessName, missing };
}

export function doneFor(step, s, bundle) {
  return {
    biz: !!s.bizType && (!GENERIC_TYPES.some((g) => g.type === s.bizType) || (s.bizOther?.text || "").trim().length >= 2),
    gst: !!s.gst || s.noGst,
    size: !!s.empBand && !!s.siteBand,
    loc: !!s.city && s.fibreOk !== null,
    now: true,
    needs: true,
    plan: !!bundle && bundle.violations.length === 0,
    consent: s.consent.req,
    kyc: kycReady(s),
    slot: !!s.slot.date && !!s.slot.win && /^[\w.\-]{2,}@[a-z]{2,}$/i.test(s.upi),
  }[step] ?? true;
}

/** First screen up to `target` that still needs an answer. */
export function resolveStep(target, s) {
  const { bundle } = derive(s);
  const idx = FLOW.indexOf(target);
  for (let i = 0; i < idx; i++) if (!doneFor(FLOW[i], s, bundle)) return FLOW[i];
  return target;
}

/** Apply Saathi's validated updates to the owner's answers. Lookups run here, in code. */
export function applyUpdates(s, c) {
  const patch = {}, notes = [];
  if (c.bizType) {
    patch.bizType = c.bizType;
    patch.bizOther = c.bizDescription ? { text: c.bizDescription, labelLocal: c.bizDescription, via: "ai" } : null;
  }
  for (const k of ["empBand", "siteBand", "city", "internet", "spend"]) if (c[k]) patch[k] = c[k];
  if (c.tier) { patch.tier = c.tier; patch.edits = { removed: [], qty: {} }; }
  if (c.pincode) {
    patch.pincode = c.pincode;
    patch.fibreOk = fibreAvailable(c.pincode);
    notes.push({ code: patch.fibreOk ? "fibreYes" : "fibreNo", value: c.pincode });
  }
  if (c.gstin) {
    const v = validateGstinFormat(c.gstin);
    if (!v.ok) notes.push({ code: "gstInvalid" });
    else {
      const g = lookupGstin(v.value, gstReg);
      if (!g) notes.push({ code: "gstNotFound" });
      else if (g.status !== "Active") { patch.gstInput = v.value; patch.gst = null; notes.push({ code: "gstInactive", value: g.status }); }
      else {
        Object.assign(patch, { gst: g, gstInput: v.value, noGst: false });
        if (reference.cities.some((x) => x.city === g.city)) patch.city = g.city;
        notes.push({ code: "gstFound", value: g.tradeName });
      }
    }
  }
  if (c.noGst && !patch.gst) Object.assign(patch, { noGst: true, gst: null, gstInput: "" });
  if (c.needsAdd || c.needsRemove) {
    const set = new Set(s.needs);
    (c.needsAdd || []).forEach((n) => set.add(n));
    (c.needsRemove || []).forEach((n) => set.delete(n));
    patch.needs = [...set];
    patch.edits = { removed: [], qty: {} };
  }
  return { patch, notes };
}

export default function CustomerApp({ partner, onCallback, onLeadEvent, onStep }) {
  const [s, setS] = useState(() => {
    const saved = store.get(SAVE_KEY, null);
    return saved && !partner ? { ...initial(), ...saved, resumeOffer: saved.step !== "welcome" && saved.step !== "track" } : initial(partner);
  });
  const [sheet, setSheet] = useState(null);
  const t = useMemo(() => makeT(s.lang), [s.lang]);
  const up = (patch) => setS((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));
  const go = (step) => up({ step });

  useEffect(() => { if (!s.partner) store.set(SAVE_KEY, { ...s, resumeOffer: false }); }, [s]);
  useEffect(() => { if (partner) setS(initial(partner)); }, [partner]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [s.step]);

  // ------------------------------------------------------------ derived
  const { seg, sitesMin, ctx, rec, bundle, businessName } = derive(s);
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = (target) => {
    if (!s.verified) return up({ step: "phone", pendingStep: target });
    up((p) => ({ step: resolveStep(target, p) }));
  };

  const info = { step: s.step, seg, gst: s.gst?.status ?? (s.noGst ? "none" : null), accel: !!s.accel, fibreOk: s.fibreOk,
    needs: s.needs.length, items: bundle?.items.length ?? 0, violations: bundle?.violations.length ?? 0,
    locked: rec?.locked.length ?? 0, monthly: bundle?.monthly ?? 0, udyam: !!s.kyc.udyam };
  useEffect(() => { onStep?.(info); }, [JSON.stringify(info)]);

  const stepIdx = FLOW.indexOf(s.step);
  const canNext = doneFor(s.step, s, bundle);

  const next = () => {
    if (s.step === "slot") return placeOrder();
    const i = FLOW.indexOf(s.step);
    if (s.step === "gst" && s.gst) {
      const city = s.gst.city && reference.cities.find((c) => c.city === s.gst.city) ? s.gst.city : s.city;
      up({ city });
    }
    if (s.step === "consent") up((p) => ({ consent: { ...p.consent, at: new Date().toISOString() } }));
    if (s.step === "kyc" && !s.kyc.udyam && s.gst) {
      const u = findUdyamByBusiness(s.gst.tradeName, s.gst.city, udyamReg);
      if (u) up((p) => ({ kyc: { ...p.kyc, udyam: u } }));
    }
    go(FLOW[i + 1]);
  };
  const back = () => {
    const i = FLOW.indexOf(s.step);
    if (s.step === "otp") return go("phone");
    if (i <= 0) return go(s.step === "biz" ? "otp" : "welcome");
    go(FLOW[i - 1]);
  };

  function placeOrder() {
    const id = "AB" + String(Math.floor(100000 + Math.random() * 899999));
    up({ order: { id, progress: 2, at: new Date().toISOString() }, step: "track" });
    onLeadEvent?.({ kind: "order", id, business: businessName, seg, monthly: bundle.monthly, partner: s.partner });
  }

  const requestCallback = (quiet) => {
    onCallback?.({
      at: new Date().toISOString(), business: businessName || "New enquiry", type: s.bizType, seg: seg || "micro",
      lang: LANGS.find((l) => l.id === s.lang)?.label, stage: s.step, city: s.city, gstin: s.gst ? "Y" : "N",
      empBand: s.empBand, siteBand: s.siteBand, internet: s.internet, accel: !!s.accel, partner: s.partner,
      needs: s.needs, monthly: bundle?.monthly,
    });
    if (quiet !== true) setSheet("callbackDone");
  };

  // ------------------------------------------------------------ screens
  const screens = {
    welcome: (
      <div className="screen">
        <div className="hero">
          <span className="hero-eyebrow">{t("brand")}</span>
          <h1>{t("tagline")}</h1>
          <p>{t("startSub")}</p>
          <button className="hero-ask" onClick={() => setChatOpen(true)}><Sparkles size={16} /> {t("askSaathi")}</button>
        </div>
        {s.resumeOffer && (
          <div className="panel">
            <strong>{t("resume")}</strong>
            <div className="footer-row">
              <button className="btn small" onClick={() => up({ resumeOffer: false, step: s.step === "welcome" ? "biz" : s.step })}>{t("continue")}</button>
              <button className="btn ghost small" onClick={() => { store.del(SAVE_KEY); setS(initial()); }}>{t("startOver")}</button>
            </div>
          </div>
        )}
        <div className="group">
          <span className="group-label">{t("chooseLang")}</span>
          <div className="grid-cards two">
            {LANGS.map((l) => (
              <Opt key={l.id} pressed={s.lang === l.id} onClick={() => l.ready && up({ lang: l.id })}>
                <span style={{ fontSize: "1.1rem" }}>{l.label}</span>
                {!l.ready && <span className="small muted"> · {t("soon")}</span>}
              </Opt>
            ))}
          </div>
        </div>
      </div>
    ),

    phone: (
      <div className="screen">
        <div className="screen-head"><h1>{t("phoneTitle")}</h1><p className="sub">{t("phoneSub")}</p></div>
        <div className="input-row">
          <span className="input" style={{ flex: "0 0 auto", width: "auto", color: "var(--ink-2)" }}>+91</span>
          <input id="phone" className="input num" inputMode="numeric" autoComplete="tel-national" maxLength={10}
            placeholder={t("phonePh")} value={s.phone} onChange={(e) => up({ phone: e.target.value.replace(/\D/g, "") })} />
        </div>
        {s.phone.length === 10 && !/^[6-9]/.test(s.phone) && <Note kind="warn">{t("phoneInvalid")}</Note>}
        <div className="chips">
          <Chip demo onClick={() => up({ phone: ACCEL_DEMO.phone })}>{t("demoAccel")}</Chip>
          <Chip demo onClick={() => up({ phone: "9876543210" })}>{t("demoNew")}</Chip>
        </div>
      </div>
    ),

    otp: (
      <div className="screen">
        <div className="screen-head"><h1>{t("otpTitle")}</h1><p className="sub">{t("otpSent", s.phone)}</p></div>
        <input id="otp" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={s.otp} onChange={(e) => up({ otp: e.target.value.replace(/\D/g, "") })} style={{ letterSpacing: ".4em", fontSize: "1.4rem", textAlign: "center" }} />
        <p className="small muted">{t("otpDemo")}</p>
        {s.otp.length === 6 && s.otp !== "123456" && <Note kind="warn">{t("otpWrong")}</Note>}
      </div>
    ),

    biz: <BizScreen s={s} up={up} t={t} />,
    gst: <GstScreen s={s} up={up} t={t} />,

    size: (
      <div className="screen">
        <div className="screen-head"><h1>{t("sizeTitle")}</h1></div>
        <div className="group">
          <span className="group-label">{t("staff")}</span>
          <div className="chips">{EMP_BANDS.map((b) => <Chip key={b.id} pressed={s.empBand === b.id} onClick={() => up({ empBand: b.id })}>{t("emp." + b.id)}</Chip>)}</div>
        </div>
        <div className="group">
          <span className="group-label">{t("sites")}</span>
          <div className="chips">{SITE_BANDS.map((b) => <Chip key={b.id} pressed={s.siteBand === b.id} onClick={() => up({ siteBand: b.id })}>{t("siteB." + b.id)}</Chip>)}</div>
        </div>
      </div>
    ),

    loc: <LocScreen s={s} up={up} t={t} />,

    now: (
      <div className="screen">
        <div className="screen-head"><h1>{t("nowTitle")}</h1></div>
        <div className="group">
          <span className="group-label">{t("nowInternet")}</span>
          <div className="chips">{["hotspot", "home", "business", "leased", "mixed"].map((k) => <Chip key={k} pressed={s.internet === k} onClick={() => up({ internet: k })}>{t("internet." + k)}</Chip>)}</div>
        </div>
        <div className="group">
          <span className="group-label">{t("nowSpend")}</span>
          <div className="chips">{["s1", "s2", "s3", "s4", "ns"].map((k) => <Chip key={k} pressed={s.spend === k} onClick={() => up({ spend: k })}>{t("spend." + k)}</Chip>)}</div>
        </div>
      </div>
    ),

    needs: <NeedsScreen s={s} up={up} t={t} seg={seg} sitesMin={sitesMin} />,
    plan: bundle && <PlanScreen s={s} up={up} t={t} rec={rec} bundle={bundle} ctx={ctx} businessName={businessName} />,
    consent: <ConsentScreen s={s} up={up} t={t} />,
    kyc: <KycScreen s={s} up={up} t={t} setSheet={setSheet} />,
    slot: bundle && <SlotScreen s={s} up={up} t={t} bundle={bundle} />,
    track: <TrackScreen s={s} up={up} t={t} bundle={bundle} onNew={() => { store.del(SAVE_KEY); setS(initial(s.partner)); }} />,
  };

  // ------------------------------------------------------------ footer
  let footer = null;
  if (s.step === "welcome")
    footer = <button className="btn" onClick={() => go("phone")}>{t("start")}</button>;
  else if (s.step === "phone")
    footer = <button className="btn" disabled={!/^[6-9]\d{9}$/.test(s.phone)} onClick={() => up({ step: "otp", otp: "" })}>{t("sendOtp")}</button>;
  else if (s.step === "otp")
    footer = (
      <button className="btn" disabled={s.otp !== "123456"} onClick={() => {
        const accel = s.phone === ACCEL_DEMO.phone ? { name: ACCEL_DEMO.name } : null;
        up((p) => ({ accel, verified: true, pendingStep: null, step: resolveStep(p.pendingStep || "biz", { ...p, accel }) }));
        if (accel) setSheet("accel");
      }}>{t("verify")}</button>
    );
  else if (s.step !== "track")
    footer = (
      <div className="footer-row">
        <button className="btn ghost" onClick={back} aria-label={t("back")}><ArrowLeft size={20} /></button>
        <button className="btn" disabled={!canNext} onClick={next}>
          {s.step === "plan" ? t("bookPlan") : s.step === "consent" ? t("agree") : s.step === "slot" ? t("placeOrder") : s.step === "now" && !s.internet && !s.spend ? t("skip") : t("next")}
        </button>
      </div>
    );

  return (
    <div className="phone">
      {s.partner && <div className="partner-band">{t("partnerBanner", s.partner.name, s.partner.code)}</div>}
      {stepIdx >= 0 && (
        <div className="progress">
          <span className="small muted num">{t("stepOf", stepIdx + 1, FLOW.length)}</span>
          <div className="progress-bar" aria-hidden="true"><span style={{ width: `${((stepIdx + 1) / FLOW.length) * 100}%` }} /></div>
          <button className="icon-btn" onClick={() => setSheet("callback")}><Phone size={15} /> <span className="small">{t("talkToPerson")}</span></button>
        </div>
      )}
      {screens[s.step]}
      {(footer || s.step === "track") && (
        <div className={footer ? "footer" : "fab-dock"}>
          {!chatOpen && !["phone", "otp"].includes(s.step) && (
            <button className="fab" onClick={() => setChatOpen(true)} aria-label={t("askSaathi")}>
              <Sparkles size={18} strokeWidth={2} /><span>{t("askSaathi")}</span>
            </button>
          )}
          {footer}
        </div>
      )}
      {chatOpen && (
        <Chat s={s} t={t} derive={derive} apply={applyUpdates}
          commit={(patch) => up(patch)} navigate={navigate}
          onCallback={() => requestCallback(true)} onClose={() => setChatOpen(false)} />
      )}

      {sheet === "accel" && (
        <Sheet title={t("accelFound", s.accel?.name)} onClose={() => setSheet(null)}>
          <Note kind="ok">{t("accelFoundSub")}</Note>
          <button className="btn" onClick={() => setSheet(null)}>{t("continue")}</button>
        </Sheet>
      )}
      {sheet === "callback" && (
        <Sheet title={t("callbackTitle")} onClose={() => setSheet(null)}>
          <p className="sub">{t("callbackSub")}</p>
          <button className="btn" onClick={requestCallback}>{t("callbackBtn")}</button>
          <button className="link-btn" onClick={() => setSheet(null)}>{t("close")}</button>
        </Sheet>
      )}
      {sheet === "callbackDone" && (
        <Sheet title={t("callbackDone")} onClose={() => setSheet(null)}>
          <button className="btn" onClick={() => setSheet(null)}>{t("close")}</button>
        </Sheet>
      )}
      {sheet === "digi" && (
        <Sheet title={t("digiTitle")} onClose={() => setSheet(null)}>
          <p className="sub">{t("digiSub")}</p>
          <button className="btn" onClick={() => { up((p) => ({ kyc: { ...p.kyc, digi: true } })); setSheet(null); }}>{t("digiAllow")}</button>
        </Sheet>
      )}
      {sheet === "esign" && <EsignSheet t={t} onDone={() => { up((p) => ({ kyc: { ...p.kyc, signed: true } })); setSheet(null); }} onClose={() => setSheet(null)} />}
    </div>
  );
}

function kycReady(s) {
  const k = s.kyc;
  const reg = s.gst?.status === "Active" || k.regDoc === "ok";
  const id = !!s.accel || k.digi;
  const addr = (s.gst && !k.addrDiff) || k.bill === "ok";
  return reg && id && addr && k.signed;
}

// ---------------------------------------------------------------- business type
function BizScreen({ s, up, t }) {
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const [other, setOther] = useState(!!s.bizOther);
  const all = reference.businessTypes.map((b) => b.type);
  const top = ["Kirana store", "Pharmacy", "Salon", "Bakery", "Mobile repair shop", "Boutique", "Dental clinic", "Coaching centre", "CA firm", "Restaurant chain", "Textile unit"];
  const list = more ? all.filter((x) => (x + " " + bizLabel("hi", x)).toLowerCase().includes(q.toLowerCase())) : top;
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("bizTitle")}</h1></div>
      <Mic lang={s.lang} t={t} onText={(text) => { const m = matchKeywords(text, VOICE_KEYWORDS)[0]; if (m) up({ bizType: m, bizOther: null }); return !!m; }} />
      <Opt row icon={<Tile as={Plus} />} pressed={other || !!s.bizOther} onClick={() => setOther(true)}>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong>{t("bizOtherCard")}</strong>
          <span className="small sub" style={{ fontWeight: 400 }}>{t("bizOtherCardSub")}</span>
        </span>
      </Opt>
      {other && <OtherBiz s={s} up={up} t={t} />}
      {more && <input id="bizq" className="input" placeholder={t("bizSearch")} value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="grid-cards">
        {list.map((type) => (
          <Opt key={type} icon={<BizIcon type={type} />} pressed={s.bizType === type && !s.bizOther} onClick={() => { up({ bizType: type, bizOther: null }); setOther(false); }}>{bizLabel(s.lang, type)}</Opt>
        ))}
        <Opt icon={<Tile as={Plus} />} pressed={other || !!s.bizOther} onClick={() => { setOther(true); window.scrollTo?.({ top: 0, behavior: "smooth" }); }}>{t("bizOther")}</Opt>
      </div>
      {!more && <button className="link-btn" onClick={() => setMore(true)}>{t("bizMore")} ({all.length})</button>}
    </div>
  );
}

// "Other": no AI needed. The plan depends only on the broad group, so the owner taps the closest
// group and types what the business is (shown on the plan and passed to the sales team).
function OtherBiz({ s, up, t }) {
  const chosen = GENERIC_TYPES.find((g) => g.type === s.bizType);
  const name = s.bizOther?.text || "";
  const pick = (g) => up({ bizType: g.type, bizOther: { text: name, labelLocal: name, via: "choice" } });
  const setName = (v) => up((p) => ({ bizOther: { text: v.slice(0, 60), labelLocal: v.slice(0, 60), via: "choice" } }));
  return (
    <div className="panel other-panel">
      <strong>{t("bizOtherPickSeg")}</strong>
      <div className="grid-cards two">
        {GENERIC_TYPES.map((g) => (
          <Opt key={g.type} icon={<BizIcon type={g.type} />} pressed={s.bizType === g.type} onClick={() => pick(g)}>{t("segName")[g.seg]}</Opt>
        ))}
      </div>
      {chosen && (
        <div className="field">
          <label htmlFor="bizother">{t("bizOtherNameLabel")}</label>
          <div className="input-row" style={{ alignItems: "center" }}>
            <input id="bizother" className="input" placeholder={t("bizOtherPh")} value={name} autoComplete="off"
              onChange={(e) => setName(e.target.value)} />
            <Mic lang={s.lang} t={t} compact onText={(heard) => { setName(heard); return true; }} />
          </div>
          {name.trim().length < 2 && <span className="small muted">{t("bizOtherNameHint")}</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- GST
function GstScreen({ s, up, t }) {
  const v = validateGstinFormat(s.gstInput);
  const found = v.ok ? lookupGstin(v.value, gstReg) : null;
  const setInput = (val) => up({ gstInput: val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15), gst: null, noGst: false });
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("gstTitle")}</h1><p className="sub">{t("gstSub")}</p></div>
      <div className="field">
        <input id="gstin" className="input mono" placeholder={t("gstPh")} value={s.gstInput} autoCapitalize="characters" spellCheck={false}
          onChange={(e) => setInput(e.target.value)} aria-describedby="gst-help" />
        <span id="gst-help" className="small muted num">{t("gstLen", s.gstInput.length)}</span>
      </div>
      {s.gstInput.length === 15 && !v.ok && <Note kind="warn">{v.code === "checksum" ? t("gstBadChecksum") : t("gstBadPattern")}</Note>}
      {v.ok && !found && <Note kind="warn">{t("gstNotFound")}</Note>}
      {found && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{t("gstFound")}</strong>
            <span className={"pill " + (found.status === "Active" ? "ok" : "bad")}>{t("gstStatus")[found.status] || found.status}</span>
          </div>
          <dl className="kv">
            <dt>Name</dt><dd>{found.tradeName}</dd>
            <dt>Owner</dt><dd>{found.legalName}</dd>
            <dt>Type</dt><dd>{found.constitution}</dd>
            <dt>Address</dt><dd>{found.address}</dd>
          </dl>
          {found.status !== "Active" && <Note kind="bad">{t("gstInactive", t("gstStatus")[found.status] || found.status)}</Note>}
          {found.status === "Active" && (
            <button className={"btn small" + (s.gst ? "" : "")} onClick={() => up({ gst: found })} aria-pressed={!!s.gst}>
              {s.gst && <Check size={16} />} {t("useThis")}
            </button>
          )}
        </div>
      )}
      <button className="btn ghost" aria-pressed={s.noGst} onClick={() => up({ noGst: true, gst: null, gstInput: "" })}>
        {s.noGst && <Check size={16} />} {t("gstNone")}
      </button>
      {s.noGst && <Note kind="info">{t("noGstNote")}</Note>}
      <div className="group" style={{ gap: 6 }}>
        <span className="small muted">{t("demoGst")}</span>
        <div className="chips">{SAMPLE_GSTINS.map((x) => <Chip key={x.g} demo onClick={() => setInput(x.g)}>{x.label}</Chip>)}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- location
function LocScreen({ s, up, t }) {
  const [q, setQ] = useState("");
  const fromGst = s.gst?.city && s.city === s.gst.city;
  const cities = reference.cities.filter((c) => c.city.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("locTitle")}</h1></div>
      <div className="group">
        <span className="group-label">{t("city")} {fromGst && <span className="pill info">{t("fromGst")}</span>}</span>
        {!fromGst && <input id="cityq" className="input" placeholder={t("citySearch")} value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="chips">
          {(fromGst ? reference.cities.filter((c) => c.city === s.city) : cities.slice(0, 12)).map((c) => (
            <Chip key={c.city} pressed={s.city === c.city} onClick={() => up({ city: c.city, fibreOk: null })}>{c.city}</Chip>
          ))}
        </div>
        {fromGst && <button className="tiny-btn" style={{ alignSelf: "flex-start" }} onClick={() => up({ city: null, fibreOk: null })}>{t("changeCity")}</button>}
        {!fromGst && <span className="small muted">{t("cityNotListed")}</span>}
      </div>
      <div className="field">
        <label htmlFor="pin">{t("pincode")}</label>
        <div className="input-row">
          <input id="pin" className="input num" inputMode="numeric" maxLength={6} placeholder={t("pincodePh")} value={s.pincode}
            onChange={(e) => up({ pincode: e.target.value.replace(/\D/g, ""), fibreOk: null })} />
          <button className="btn small" style={{ flex: "0 0 auto" }} disabled={s.pincode.length !== 6 || !s.city}
            onClick={() => up({ fibreOk: fibreAvailable(s.pincode) })}>{t("checkArea")}</button>
        </div>
      </div>
      {s.fibreOk === true && <Note kind="ok">{t("fibreYes", s.pincode)}</Note>}
      {s.fibreOk === false && <Note kind="info" icon={<Radio size={16} />}>{t("fibreNo", s.pincode)}</Note>}
      <div className="chips"><Chip demo onClick={() => up({ pincode: "400008", fibreOk: null })}>Demo: area without fibre · 400008</Chip></div>
    </div>
  );
}

// ---------------------------------------------------------------- needs
function NeedsScreen({ s, up, t, seg, sitesMin }) {
  const { primary, rest } = needsFor(seg || "micro", sitesMin);
  const list = s.showMoreNeeds ? [...primary, ...rest] : primary;
  const toggle = (id) => up((p) => ({ needs: p.needs.includes(id) ? p.needs.filter((x) => x !== id) : [...p.needs, id], edits: { removed: [], qty: {} } }));
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("needsTitle")}</h1><p className="sub">{t("needsSub")}</p></div>
      <Mic lang={s.lang} t={t} onText={(text) => {
        const m = matchKeywords(text, NEED_KEYWORDS);
        if (m.length) up((p) => ({ needs: [...new Set([...p.needs, ...m])], showMoreNeeds: p.showMoreNeeds || m.some((x) => rest.find((r) => r.id === x)) }));
        return m.length > 0;
      }} />
      <div className="group" style={{ gap: 8 }}>
        {list.map((n) => (
          <Opt key={n.id} row multi icon={<NeedIcon id={n.id} />} pressed={s.needs.includes(n.id)} onClick={() => toggle(n.id)}>{t("needs." + n.id)}</Opt>
        ))}
      </div>
      {!s.showMoreNeeds && rest.length > 0 && <button className="link-btn" onClick={() => up({ showMoreNeeds: true })}>{t("needsMore")}</button>}
      {s.needs.length === 0 && <p className="small muted">{t("needsNone")}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- plan
function PlanScreen({ s, up, t, rec, bundle, ctx, businessName }) {
  const [faq, setFaq] = useState(null);
  const base = rec.tiers[s.tier];
  const removed = new Set(s.edits.removed);
  const linkId = base.items[0].id;
  const setTier = (tier) => up({ tier, edits: { removed: [], qty: {} } });
  const setQty = (id, q) => up((p) => ({ edits: { ...p.edits, qty: { ...p.edits.qty, [id]: Math.max(1, Math.min(50, q)) } } }));
  const toggle = (id) => up((p) => {
    // removing an item that others depend on is not allowed, so the bundle always stays valid
    const r = new Set(p.edits.removed);
    r.has(id) ? r.delete(id) : r.add(id);
    return { edits: { ...p.edits, removed: [...r] } };
  });
  const whyText = (w) => w.key === "need" ? t("why.need", t("needs." + w.need)) : t("why." + w.key);
  const hasBackup = bundle.items.some((i) => i.id === "P09");
  const lockReason = (r) => r.code === "employees" || r.code === "sites" ? t("lockReason." + r.code, r.min) : t("lockReason." + r.code);
  const summary = `${t("tiers")[s.tier]}. ${inr(bundle.monthly)} ${t("perMonth")}. ` + bundle.items.map((i) => productName(s.lang, i.id) + (i.qty > 1 ? ` × ${i.qty}` : "")).join(", ");
  const spendMid = SPEND_MID[s.spend];

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>{t("planTitle")}</h1>
        {businessName && <p className="sub">{t("planFor", businessName)}</p>}
      </div>
      <div className="tier-switch" role="group">
        {["basic", "recommended", "complete"].map((k) => (
          <button key={k} aria-pressed={s.tier === k} onClick={() => setTier(k)}>
            {k === "recommended" && <Star size={12} className="best" aria-hidden="true" />}
            {t("tiers")[k]}<span className="num">{inr(rec.tiers[k].monthly)}</span>
          </button>
        ))}
      </div>
      <div className="price-block card-dark">
        <div className="price">{inr(bundle.monthly)}<small> {t("perMonth")}</small></div>
        <div className="facts">
          <span>{bundle.setup ? `${t("setupFee")}: ${inr(bundle.setup)}` : t("noSetup")}</span>
          <span>{t("contract", bundle.contractMonths)}</span>
          <span>{t("installIn", bundle.installDays)}</span>
        </div>
        <span className="small muted">{t("gstExtra")} {t("priceLocked")}</span>
      </div>
      {spendMid && <Note kind="info" icon={<IndianRupee size={16} />}>{t("vsToday", inr(spendMid), inr(bundle.monthly))}</Note>}
      <button className="mic" onClick={() => speak(summary, s.lang)}><Volume2 size={16} /> {t("listen")}</button>

      <div className="group" style={{ gap: 8 }}>
        <span className="group-label">{t("whatsIncluded")}</span>
        <div className="items">
          {base.items.map((it) => {
            const off = removed.has(it.id);
            const cur = bundle.items.find((b) => b.id === it.id);
            const qty = s.edits.qty[it.id] ?? it.qty;
            return (
              <div key={it.id} className={"item" + (off ? " off" : "")}>
                <span className="nm">{productName(s.lang, it.id)}{qty > 1 && !QTY_EDITABLE.has(it.id) ? ` × ${qty}` : ""}</span>
                <span className="amt">{off ? "—" : inr(cur?.monthly ?? 0)}</span>
                <span className="why">{whyText(it.why)}</span>
                {(QTY_EDITABLE.has(it.id) || it.id !== linkId) && (
                  <div className="ctl">
                    {QTY_EDITABLE.has(it.id) && !off && (
                      <span className="stepper" aria-label={t("qty")}>
                        <button onClick={() => setQty(it.id, qty - 1)} aria-label="−">−</button>
                        <span className="num">{qty}</span>
                        <button onClick={() => setQty(it.id, qty + 1)} aria-label="+">+</button>
                      </span>
                    )}
                    {it.id !== linkId && (
                      <button className="tiny-btn" onClick={() => toggle(it.id)}>{off ? t("add") : t("remove")}</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rec.locked.length > 0 && (
        <div className="panel locked">
          <strong>{t("lockedTitle")}</strong>
          {rec.locked.map((l) => (
            <div key={l.id} className="locked-row">
              <Lock size={16} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 3 }} />
              <span><strong>{productName(s.lang, l.id)}</strong> · {lockReason(l.reasons[0])}</span>
            </div>
          ))}
        </div>
      )}

      <div className="group" style={{ gap: 8 }}>
        <span className="group-label">{t("askTitle")}</span>
        <div className="chips">
          {["lockin", "down", "when", "hidden"].map((k) => <Chip key={k} pressed={faq === k} onClick={() => setFaq(faq === k ? null : k)}>{t("faq." + k)}</Chip>)}
        </div>
        {faq && (
          <div className="faq-a" aria-live="polite">
            {faq === "lockin" && t("faqA.lockin", bundle.contractMonths)}
            {faq === "down" && t("faqA.down", hasBackup)}
            {faq === "when" && t("faqA.when", bundle.installDays)}
            {faq === "hidden" && t("faqA.hidden", bundle.setup ? inr(bundle.setup) : "")}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- consent
function ConsentScreen({ s, up, t }) {
  const set = (k) => up((p) => ({ consent: { ...p.consent, [k]: !p.consent[k] } }));
  const Box = ({ k, children, required }) => (
    <label className="card-opt row" style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={s.consent[k]} onChange={() => set(k)} style={{ width: 22, height: 22, accentColor: "var(--brand)" }} />
      <span>{children}{required && <span style={{ color: "var(--brand)" }}> *</span>}</span>
    </label>
  );
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("consentTitle")}</h1><p className="sub">{t("consentSub")}</p></div>
      <div className="panel">
        <strong>{t("consentWhat")}</strong>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {t("consentList").map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="small muted">{t("consentKeep")}</p>
      </div>
      <div className="group" style={{ gap: 8 }}>
        <Box k="req" required>{t("consentRequired")}</Box>
        <Box k="wa">{t("consentWhatsapp")}</Box>
        <Box k="offers">{t("consentOffers")}</Box>
      </div>
      <p className="small muted">{t("consentRights")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- KYC
function useQualityCheck() {
  return async (file) => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const w = 620, h = Math.max(1, Math.round((img.height / img.width) * w));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
      const sharp = sharpnessFromImageData(g.getImageData(0, 0, w, h).data, w, h);
      return sharp > BLUR_THRESHOLD ? "ok" : "blurry";
    } catch { return "blurry"; } finally { URL.revokeObjectURL(url); }
  };
}

function Upload({ t, value, onResult }) {
  const check = useQualityCheck();
  const [busy, setBusy] = useState(false);
  return (
    <div className="group" style={{ gap: 6 }}>
      <span className="btn small ghost file-btn" style={{ alignSelf: "flex-start" }}>
        <Camera size={16} /> {t("upload")}
        <input type="file" accept="image/*" capture="environment" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setBusy(true); onResult(await check(f)); setBusy(false); e.target.value = "";
        }} />
      </span>
      {busy && <span className="small muted">{t("uploadChecking")}</span>}
      {!busy && value === "blurry" && <Note kind="warn">{t("uploadBlurry")}</Note>}
      {!busy && value === "ok" && <Note kind="ok">{t("uploadOk")}</Note>}
    </div>
  );
}

function KycScreen({ s, up, t, setSheet }) {
  const k = s.kyc;
  const setK = (patch) => up((p) => ({ kyc: { ...p.kyc, ...patch } }));
  const udyamAuto = useMemo(() => (s.gst ? findUdyamByBusiness(s.gst.tradeName, s.gst.city, udyamReg) : null), [s.gst]);
  const udyam = k.udyam || udyamAuto;
  const prop = s.gst && proprietorOf(s.gst.legalName);
  const signer = s.accel?.name || prop?.person || "";
  const Row = ({ done, title, children }) => (
    <div className="doc-row">
      <span className={"st " + (done ? "ok" : "todo")} aria-hidden="true">{done ? <Check size={15} strokeWidth={3} /> : ""}</span>
      <div className="body"><strong>{title}</strong>{children}</div>
    </div>
  );
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("kycTitle")}</h1><p className="sub">{t("kycSub")}</p></div>

      <Row done={s.gst?.status === "Active" || k.regDoc === "ok"} title={t("kycGst")}>
        {s.gst ? <span className="small sub">{t("kycGstDone")} <span className="num muted">{maskGstin(s.gst.gstin)}</span></span>
          : <><span className="small sub">{t("kycNoGst")}</span><Upload t={t} value={k.regDoc} onResult={(r) => setK({ regDoc: r })} /></>}
      </Row>

      <Row done={!!udyam} title={t("kycUdyam")}>
        {udyam ? <span className="small sub">{t("kycUdyamFound", udyam.udyamNumber.replace(/\d{5}$/, "•••••"))}</span> : (
          <>
            <span className="small muted">{t("kycUdyamOptional")}</span>
            <div className="input-row">
              <input id="udyam" className="input mono" style={{ fontSize: ".95rem" }} placeholder={t("kycUdyamPh")} value={k.udyamInput}
                onChange={(e) => setK({ udyamInput: e.target.value.toUpperCase(), udyamTried: false })} />
              <button className="btn small" style={{ flex: "0 0 auto" }} onClick={() => setK({ udyam: lookupUdyam(k.udyamInput.trim(), udyamReg), udyamTried: true })}>{t("kycUdyamCheck")}</button>
            </div>
            {k.udyamTried && !k.udyam && <span className="small muted">{t("kycUdyamBad")}</span>}
          </>
        )}
      </Row>

      <Row done={!!s.accel || k.digi} title={t("kycId")}>
        {s.accel ? <span className="small sub">{t("kycIdAccel")}</span>
          : k.digi ? <span className="small sub">{t("kycIdDone", signer || "✓")}</span>
          : <button className="btn small" style={{ alignSelf: "flex-start" }} onClick={() => setSheet("digi")}>{t("kycIdDigi")}</button>}
      </Row>

      <Row done={(s.gst && !k.addrDiff) || k.bill === "ok"} title={t("kycAddr")}>
        {s.gst && !k.addrDiff && <span className="small sub">{t("kycAddrSame")}</span>}
        {s.gst && <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={k.addrDiff} onChange={() => setK({ addrDiff: !k.addrDiff, bill: null })} /> {t("kycAddrDiff")}
        </label>}
        {(!s.gst || k.addrDiff) && <><span className="small sub">{t("kycAddrUpload")}</span><Upload t={t} value={k.bill} onResult={(r) => setK({ bill: r })} /></>}
      </Row>

      <Row done={k.signed} title={t("kycSign")}>
        {k.signed ? <span className="small sub">{t("kycSigned")}</span>
          : <button className="btn small" style={{ alignSelf: "flex-start" }} onClick={() => setSheet("esign")}>{t("kycSignBtn")}</button>}
      </Row>
    </div>
  );
}

function EsignSheet({ t, onDone, onClose }) {
  const [otp, setOtp] = useState("");
  return (
    <Sheet title={t("esignTitle")} onClose={onClose}>
      <p className="sub">{t("esignSub")}</p>
      <input id="esign" className="input num" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        style={{ letterSpacing: ".4em", textAlign: "center", fontSize: "1.3rem" }} />
      <button className="btn" disabled={otp !== "123456"} onClick={onDone}>{t("verify")}</button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- slot + pay
function slotDates(installDays) {
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() + installDays);
  while (out.length < 5) {
    if (d.getDay() !== 0) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
const fmtDate = (d, lang) => new Date(d).toLocaleDateString(lang === "en" ? "en-IN" : "hi-IN", { weekday: "short", day: "numeric", month: "short" });

function SlotScreen({ s, up, t, bundle }) {
  const dates = slotDates(bundle.installDays);
  return (
    <div className="screen">
      <div className="screen-head"><h1>{t("slotTitle")}</h1><p className="sub">{t("slotSub")}</p></div>
      <div className="chips">
        {dates.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          return <Chip key={iso} pressed={s.slot.date === iso} onClick={() => up((p) => ({ slot: { ...p.slot, date: iso } }))}>{fmtDate(d, s.lang)}</Chip>;
        })}
      </div>
      <div className="chips">
        {["am", "mid", "pm"].map((w) => <Chip key={w} pressed={s.slot.win === w} onClick={() => up((p) => ({ slot: { ...p.slot, win: w } }))}>{t("windows." + w)}</Chip>)}
      </div>
      <div className="group">
        <h2>{t("payTitle")}</h2>
        <p className="small sub">{t("paySub")}</p>
        <input id="upi" className="input" placeholder={t("upiPh")} value={s.upi} onChange={(e) => up({ upi: e.target.value.trim() })} autoCapitalize="none" spellCheck={false} />
        {s.upi.length > 3 && !/^[\w.\-]{2,}@[a-z]{2,}$/i.test(s.upi) && <span className="small muted">{t("upiBad")}</span>}
        <div className="chips">
          {["ybl", "okaxis", "paytm", "upi"].map((h) => <Chip key={h} demo onClick={() => up({ upi: `${(s.accel?.name || "owner").split(" ")[0].toLowerCase()}@${h}` })}>@{h}</Chip>)}
        </div>
      </div>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{t("payToday")}</strong><strong className="num">{inr(bundle.setup)}</strong></div>
        <span className="small muted">{bundle.setup ? t("payTodayNote") : t("nothingToday")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tracker
function TrackScreen({ s, up, t, bundle, onNew }) {
  const keys = ["placed", "verified", "booked", "tech", "live"];
  const p = s.order?.progress ?? 0;
  const when = s.slot.date ? `${fmtDate(s.slot.date, s.lang)}, ${t("windows." + s.slot.win)}` : "";
  const tech = t("techName");
  const msgs = keys.slice(0, p + 1).map((k) => ({ k, text: k === "placed" ? t("wa.placed", s.order.id) : k === "booked" ? t("wa.booked", when) : k === "tech" ? t("wa.tech", tech) : t("wa." + k) }));
  return (
    <div className="screen">
      <div className="screen-head">
        <h1>{t("trackTitle")}</h1>
        <p className="sub num">{t("orderId", s.order?.id)}{bundle ? ` · ${inr(bundle.monthly)} ${t("perMonth")}` : ""}</p>
      </div>
      <div className="timeline">
        {keys.map((k, i) => (
          <div key={k} className={"tl" + (i <= p ? " done" : i === p + 1 ? " now" : "")}>
            <span className="dot">{i <= p ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <div>
              <div className="t">{t("steps." + k)}</div>
              {k === "booked" && <div className="small sub">{when}</div>}
              {k === "tech" && i <= p && <div className="small sub">{t("techLine", tech, when)}</div>}
            </div>
          </div>
        ))}
      </div>
      {s.consent.wa && (
        <div className="group" style={{ gap: 8 }}>
          <span className="group-label">{t("waTitle")}</span>
          <div className="wa">{msgs.map((m) => <div key={m.k} className="wa-msg">{m.text}</div>)}</div>
        </div>
      )}
      <div className="footer-row">
        {p < 4 ? <button className="btn ghost" style={{ flex: 1 }} onClick={() => up((x) => ({ order: { ...x.order, progress: x.order.progress + 1 } }))}>{t("simulate")}</button>
          : <Note kind="ok">{t("done")}</Note>}
      </div>
      <button className="link-btn" onClick={onNew}>{t("newOrder")}</button>
    </div>
  );
}

export { FLOW };
