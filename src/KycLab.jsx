import React, { useMemo, useState } from "react";
import { specimens, gstReg, udyamReg } from "./data.js";
import { validateApplicant, sharpnessFromImageData, BLUR_THRESHOLD } from "./engine/kyc.js";

const DOC_LABEL = { gst_certificate: "GST certificate", udyam_certificate: "Udyam certificate", signatory_id: "Signatory ID", address_proof: "Electricity bill" };
const DOC_ORDER = ["gst_certificate", "udyam_certificate", "signatory_id", "address_proof"];
const DECISION = {
  verified: { cls: "ok", label: "Verified" },
  review: { cls: "warn", label: "Quick review" },
  action: { cls: "bad", label: "Needs action" },
};
const STATUS = { pass: ["ok", "Pass"], warn: ["warn", "Check"], fail: ["bad", "Fail"], info: ["info", "Note"] };

// Plain-language messages for each check. These are what an agent (or the owner) sees.
const MSG = {
  missing: () => "Document not provided.",
  blurry: () => "Photo is too blurry to read. Ask the owner to retake it; the app's camera check stops this before upload.",
  unreadable: () => "Text could not be read. Ask for a clearer photo.",
  deskewed: (d) => `Photo was tilted by about ${d.deg}°. Straightened automatically before reading.`,
  ocrFixed: (d) => `OCR misread ${d.fixes.map((f) => `“${f.to}” as “${f.from}”`).join(", ")} in the GSTIN. Corrected using the GSTIN's structure and check digit.`,
  gstinInvalid: (d) => `GSTIN on the certificate (${d.value}) fails the check digit.${d.near ? ` GST records have ${d.near} for a business one character away, so this certificate looks altered.` : ""}`,
  gstinFound: (d) => `GSTIN ${d.value} found in GST records.`,
  gstinActive: () => "GST registration is Active.",
  gstinStatus: (d) => `GST registration is ${d.status}. Products that need GST can't be sold, and the certificate can't be used as business proof.`,
  legalNameMatch: () => "Legal name matches GST records.",
  legalNameMismatch: (d) => `Legal name on the certificate is “${d.doc}”, but GST records say “${d.registry}”.`,
  addressMismatch: () => "Address on the certificate differs from GST records.",
  udyamFetched: (d) => `No Udyam certificate uploaded, but ${d.value} was found by business name and city. No upload needed.`,
  udyamBlankFetched: (d) => `Udyam number on the certificate is blank; ${d.value} was found by name and city.`,
  udyamNotFound: () => "No Udyam certificate and no Udyam record for this business. Udyam is optional for most products.",
  udyamBlankNotFound: () => "Udyam number on the certificate is blank, and no Udyam record exists for this business and city. Treat the certificate as unverified.",
  udyamNotInRegistry: (d) => `Udyam number ${d.value} is not in Udyam records.`,
  udyamFound: (d) => `Udyam ${d.value} found in Udyam records.`,
  udyamNameMismatch: (d) => `Enterprise name “${d.doc}” differs from Udyam records (“${d.registry}”).`,
  udyamCityMismatch: (d) => `City “${d.doc}” differs from Udyam records (“${d.registry}”).`,
  udyamActivityDiffers: (d) => `Major activity on the certificate is “${d.doc}”; Udyam records say “${d.registry}”. Minor; noted for review.`,
  billTooOld: (d) => `Bill dated ${d.date} is ${d.days} days old. Address proof must be from the last 90 days.`,
  billRecent: (d) => `Bill dated ${d.date} (${d.days} days old) is within 90 days.`,
  billNameMismatch: (d) => `Bill is in the name “${d.doc}”, not “${d.expected}”.`,
  billAddressDiffers: () => "Bill address differs from the GST address. Fine if installing elsewhere; confirm the install address.",
  billAddressMatch: () => "Bill address matches the GST address.",
  addressFromGst: () => "No bill needed: installing at the GST address.",
  idExpired: (d) => `Signatory ID expired on ${d.date}.`,
  signatoryIsProprietor: (d) => `${d.name} is the proprietor named in GST records.`,
  signatoryNotProprietor: (d) => `Signatory ${d.name} is not the proprietor (${d.expected}) named in GST records.`,
  confirmAuthority: (d) => `${d.constitution}: confirm ${d.name} can sign for the business. Done by Aadhaar e-sign plus partner or director check.`,
};

export default function KycLab() {
  const ids = Object.keys(specimens).sort();
  const results = useMemo(() => Object.fromEntries(ids.map((id) => [id, validateApplicant(specimens[id], gstReg, udyamReg)])), []);
  const [sel, setSel] = useState("K06");
  const [zoom, setZoom] = useState(null);
  const r = results[sel];
  const counts = ids.reduce((a, id) => ({ ...a, [results[id].decision]: (a[results[id].decision] || 0) + 1 }), {});
  const name = (id) => results[id].gst?.tradeName || specimens[id].signatory_id?.fields?.business || id;
  const order = { fail: 0, warn: 1, info: 2, pass: 3 };

  return (
    <div className="desk">
      <div className="desk-head">
        <div>
          <h1>Smart KYC check</h1>
          <p className="sub">The 12 specimen applicants from the case pack, read by OCR and checked against the mock GST and Udyam registries.</p>
        </div>
        <div className="chips">
          <span className="pill bad">{counts.action || 0} need action</span>
          <span className="pill warn">{counts.review || 0} quick review</span>
          <span className="pill ok">{counts.verified || 0} verified</span>
        </div>
      </div>

      <div className="apps">
        {ids.map((id) => {
          const d = DECISION[results[id].decision];
          return (
            <button key={id} className="app-card" aria-pressed={sel === id} onClick={() => setSel(id)}>
              <span className="small muted num">{id}</span>
              <strong>{name(id)}</strong>
              <span className={"pill " + d.cls} style={{ alignSelf: "flex-start" }}>{d.label}</span>
            </button>
          );
        })}
      </div>

      <div className="two-col">
        <div className="box">
          <h2>{sel} · {name(sel)}</h2>
          <div className="docs">
            {DOC_ORDER.map((k) => {
              const doc = specimens[sel][k];
              return doc ? (
                <button key={k} className="doc-thumb" onClick={() => setZoom(doc.image)}>
                  <img src={doc.image} alt={`${DOC_LABEL[k]} for ${sel}`} loading="lazy" />
                  <span>{DOC_LABEL[k]}</span>
                </button>
              ) : <div key={k} className="doc-thumb missing">{DOC_LABEL[k]}<br />not uploaded</div>;
            })}
          </div>
          <p className="small muted">Read with Tesseract OCR (scripts/prepare_data.py). Tilt and blur are measured on the image before reading.</p>
        </div>
        <div className="box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2>Checks</h2>
            <span className={"pill " + DECISION[r.decision].cls}>{DECISION[r.decision].label}</span>
          </div>
          <div className="checks">
            {[...r.checks].sort((a, b) => order[a.status] - order[b.status]).map((c, i) => (
              <div key={i} className="check">
                <span className={"pill " + STATUS[c.status][0]} style={{ justifySelf: "start" }}>{STATUS[c.status][1]}</span>
                <span>{MSG[c.key] ? MSG[c.key](c.detail) : c.key}</span>
              </div>
            ))}
          </div>
          <p className="small muted">OCR only reads. Every result above is a plain-code check: check digit, registry status, name and address match, document age.</p>
        </div>
      </div>

      <PhotoCheck />
      {zoom && <div className="zoom" onClick={() => setZoom(null)} role="dialog" aria-label="Document preview"><img src={zoom} alt="" /></div>}
    </div>
  );
}

function PhotoCheck() {
  const [res, setRes] = useState(null);
  const run = async (file) => {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; }).catch(() => null);
    if (!img) return setRes({ err: true });
    const w = 620, h = Math.max(1, Math.round((img.height / img.width) * w));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
    const sharp = sharpnessFromImageData(g.getImageData(0, 0, w, h).data, w, h);
    setRes({ sharp, ok: sharp > BLUR_THRESHOLD });
    URL.revokeObjectURL(url);
  };
  return (
    <div className="box">
      <h2>Try the photo check</h2>
      <p className="sub">Upload any photo of a document. The same blur check runs in the owner's app before upload, so a bad photo is retaken in seconds instead of rejected days later.</p>
      <span className="btn small ghost file-btn" style={{ alignSelf: "flex-start" }}>
        Choose a photo
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
      </span>
      {res?.err && <p className="small">Couldn't open that file.</p>}
      {res && !res.err && (
        <p><span className={"pill " + (res.ok ? "ok" : "bad")}>{res.ok ? "Clear" : "Blurry"}</span> <span className="small muted num">sharpness {res.sharp.toFixed(0)} (blurry below {BLUR_THRESHOLD})</span></p>
      )}
    </div>
  );
}
