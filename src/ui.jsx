import React, { useRef, useState } from "react";
import { Mic as MicIcon, Check, AlertTriangle, X, Info } from "lucide-react";
import { SPEECH_LANG } from "./i18n.js";

export function Opt({ pressed, onClick, icon, children, row, multi }) {
  return (
    <button type="button" className={"card-opt" + (row ? " row" : "")} aria-pressed={!!pressed} onClick={onClick}>
      {icon && <span className="ic" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
      {pressed && multi && <span className="tick" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
    </button>
  );
}

export function Chip({ pressed, onClick, children, demo }) {
  return (
    <button type="button" className={"chip" + (demo ? " demo" : "")} aria-pressed={demo ? undefined : !!pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function Note({ kind = "info", icon, children }) {
  const Ic = { ok: Check, warn: AlertTriangle, bad: X, info: Info }[kind];
  const ic = icon ?? <Ic size={16} strokeWidth={2.25} />;
  return (
    <div className={"note " + kind} role={kind === "bad" ? "alert" : "status"}>
      <span className="note-ic" aria-hidden="true">{ic}</span>
      <div className="nt">{children}</div>
    </div>
  );
}

export function Sheet({ title, children, onClose }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Voice input: listens once and hands back the transcript. The screen decides which card it
 *  matches and highlights it, so the owner can see and correct the pick. */
export function Mic({ lang, t, onText, compact }) {
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  const recRef = useRef(null);
  const start = () => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setMsg(t("voiceUnavailable")); return; }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = SPEECH_LANG[lang] || "hi-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        const matched = onText(text);
        setMsg(matched ? t("voiceHeard", text) : t("voiceNoMatch"));
      };
      rec.onerror = () => { setMsg(t("voiceUnavailable")); setState("idle"); };
      rec.onend = () => setState("idle");
      rec.start();
      setState("on");
      setMsg(t("listening"));
    } catch {
      setMsg(t("voiceUnavailable"));
    }
  };
  return (
    <div className="group" style={{ gap: 4 }}>
      <button type="button" className={"mic" + (state === "on" ? " on" : "") + (compact ? " compact" : "")} onClick={start} aria-label={t("speak")}>
        <MicIcon size={16} />{!compact && <> {t("speak")}</>}
      </button>
      {msg && !compact && <span className="small muted" aria-live="polite">{msg}</span>}
    </div>
  );
}

export function speak(text, lang) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || "hi-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

export const matchKeywords = (text, table) => {
  const s = " " + text.toLowerCase() + " ";
  return Object.entries(table).filter(([, words]) => words.some((w) => s.includes(w.toLowerCase()))).map(([k]) => k);
};
