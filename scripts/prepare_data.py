"""Builds the small JSON data pack the app ships with, from the hackathon CSVs.

Run:  python3 scripts/prepare_data.py
Needs: pandas, numpy, scikit-learn, pillow, tesseract CLI (for the specimen OCR pass).

Privacy: the raw 5,000-lead file is NOT shipped to the browser. Only aggregates,
model coefficients and a small, masked sample of stalled leads are written out.
"""
import json, re, subprocess, hashlib, os, sys
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image, ImageFilter
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data-raw"
OUT = ROOT / "src" / "data"
PUB = ROOT / "public" / "kyc"
OUT.mkdir(parents=True, exist_ok=True)
PUB.mkdir(parents=True, exist_ok=True)
TODAY = pd.Timestamp("2026-07-15")  # fixed "today" from the README


def dump(name, obj):
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"  wrote {p.relative_to(ROOT)}  {p.stat().st_size/1024:.0f} KB")


# ---------------------------------------------------------------- catalogue
cat = pd.read_csv(RAW / "product_catalogue.csv")
products = []
for _, r in cat.iterrows():
    products.append({
        "id": r.product_id, "category": r.category, "name": r.product_name,
        "desc": r.description, "unit": r.unit,
        "priceMin": int(r.price_min_inr_per_month), "priceMax": int(r.price_max_inr_per_month),
        "setup": int(r.one_time_setup_inr), "minContract": int(r.min_contract_months),
        "tiers": [int(t) for t in str(r.available_city_tiers).split(";")],
        "minEmployees": int(r.min_employees), "minSites": int(r.min_sites),
        "requiresGstin": r.requires_gstin == "Y",
        "requiresOneOf": [] if pd.isna(r.requires_one_of) else r.requires_one_of.split("|"),
        "installDays": int(r.typical_install_days),
        "segments": r.target_segments.split(";"),
    })
dump("catalogue.json", products)

# ---------------------------------------------------------------- registries
g = pd.read_csv(RAW / "mock_gstin_registry.csv")
dump("gstin_registry.json", {r.gstin: [r.legal_name, r.trade_name, r.constitution,
     r.principal_place_of_business, r.state, r.registration_date, r.status] for r in g.itertuples()})
u = pd.read_csv(RAW / "mock_udyam_registry.csv")
dump("udyam_registry.json", {r.udyam_number: [r.enterprise_name, r.enterprise_type, r.major_activity,
     r.nic_description, r.state, r.city, r.date_of_registration] for r in u.itertuples()})

# ---------------------------------------------------------------- leads
d = pd.read_csv(RAW / "smb_leads.csv")
d["act"] = (d.outcome == "Activated").astype(int)
seg_key = {"Micro retail & services": "micro", "Professional offices": "prof",
           "Small multi-site businesses": "multi", "Small manufacturers": "mfg"}
d["seg"] = d.segment.map(seg_key)

cities = d.groupby("city").agg(tier=("city_tier", "first"), state=("state", "first"),
                               n=("lead_id", "size")).sort_values("n", ascending=False)
types = d.groupby("business_type").agg(seg=("seg", "first"), n=("lead_id", "size")).sort_values("n", ascending=False)
dump("reference.json", {
    "cities": [{"city": c, "tier": int(r.tier), "state": r.state} for c, r in cities.iterrows()],
    "businessTypes": [{"type": t, "seg": r.seg} for t, r in types.iterrows()],
})

# ---------------------------------------------------------------- dashboard aggregates
stages = ["Lead", "Contacted", "Needs assessed", "Quote accepted", "KYC complete", "Activated"]
order = {s: i for i, s in enumerate(stages)}
d["stage_i"] = d.stage_reached.map(order)
funnel = [{"stage": s, "n": int((d.stage_i >= i).sum())} for i, s in enumerate(stages)]
drops = (d[d.outcome == "Dropped"].groupby(["stage_reached", "drop_reason"]).size()
         .reset_index(name="n").sort_values("n", ascending=False))
FIXABLE = {  # drop reasons the digital journey removes directly, and which module fixes it
    "Owner had no time for a visit": "Advisor (no visit needed)",
    "Visit not scheduled by sales": "Advisor (no visit needed)",
    "Quote too complex to understand": "Instant transparent quote",
    "Quote took too long to arrive": "Instant transparent quote",
    "Missing GST or Udyam document": "Smart KYC lookup",
    "Found paperwork too long": "Smart KYC lookup",
    "Authorised signatory not available": "Aadhaar e-sign",
    "Document details did not match": "Smart KYC validation",
    "Site not feasible for fibre": "Serviceability check + 5G fallback",
    "First payment failed": "UPI AutoPay",
    "Installation delayed beyond 21 days": "Self-booked install slot + tracker",
    "Only wanted a mobile plan": "Needs-based advisor",
}
a = d[d.act == 1].copy()
a["churn"] = (a.churned_within_6_months == "Y").astype(int)
seg_tab = []
for s, grp in d.groupby("seg"):
    acts = grp[grp.act == 1]
    seg_tab.append({"seg": s, "leads": int(len(grp)), "activations": int(len(acts)),
                    "conv": round(grp.act.mean(), 4),
                    "cacPerActivation": int(grp.acquisition_cost_inr.sum() / max(len(acts), 1)),
                    "avgMonthly": int(acts.monthly_bundle_value_inr.mean()),
                    "medianMonthly": int(acts.monthly_bundle_value_inr.median()),
                    "churn6m": round((acts.churned_within_6_months == "Y").mean(), 3),
                    "nps": round(acts.nps_score.mean(), 2),
                    "daysToActivate": round(acts.days_lead_to_activation.mean(), 1)})
src_tab = []
for s, grp in d.groupby("lead_source"):
    src_tab.append({"source": s, "leads": int(len(grp)), "conv": round(grp.act.mean(), 4),
                    "costPerActivation": int(grp.acquisition_cost_inr.sum() / max(grp.act.sum(), 1))})
calls = a.groupby("customer_follow_up_calls").agg(n=("churn", "size"), churn=("churn", "mean"),
                                                  nps=("nps_score", "mean")).reset_index()
gm = d.merge(g[["gstin", "status"]], on="gstin", how="left")
leak_bad_gst = int(((gm.act == 1) & gm.status.isin(["Cancelled", "Suspended"])).sum())

# eligibility breaches in bundles sold by the current process
cidx = cat.set_index("product_id")
breaches = {"tier": 0, "gstin": 0, "dependency": 0, "employees": 0, "sites": 0}
for r in a.itertuples():
    items = {p.split("x")[0] for p in r.bundle_products.split(";")}
    for p in items:
        pr = cidx.loc[p]
        if pr.requires_gstin == "Y" and r.has_gstin != "Y": breaches["gstin"] += 1
        if str(r.city_tier) not in str(pr.available_city_tiers).split(";"): breaches["tier"] += 1
        if r.employee_count < pr.min_employees: breaches["employees"] += 1
        if r.num_sites < pr.min_sites: breaches["sites"] += 1
        if isinstance(pr.requires_one_of, str) and not (set(pr.requires_one_of.split("|")) & items):
            breaches["dependency"] += 1

dump("dashboard.json", {
    "period": "Apr–Jun 2026 (synthetic)",
    "funnel": funnel,
    "drops": [{"stage": r.stage_reached, "reason": r.drop_reason, "n": int(r.n),
               "fix": FIXABLE.get(r.drop_reason)} for r in drops.itertuples()],
    "segments": seg_tab, "sources": src_tab,
    "followUps": [{"calls": int(r.customer_follow_up_calls), "n": int(r.n),
                   "churn": round(r.churn, 3), "nps": round(r.nps, 2)} for r in calls.itertuples()],
    "kpis": {"leads": int(len(d)), "activations": int(d.act.sum()),
             "conv": round(d.act.mean(), 4),
             "avgDays": round(a.days_lead_to_activation.mean(), 1),
             "avgChases": round(a.customer_follow_up_calls.mean(), 2),
             "cacPerActivation": int(d.acquisition_cost_inr.sum() / d.act.sum()),
             "medianMonthly": int(a.monthly_bundle_value_inr.median()),
             "churn6m": round(a.churn.mean(), 3),
             "convWithGstin": round(d[d.has_gstin == "Y"].act.mean(), 4),
             "convWithoutGstin": round(d[d.has_gstin == "N"].act.mean(), 4),
             "activatedOnBadGstin": leak_bad_gst,
             "eligibilityBreaches": breaches,
             "eligibilityBreachTotal": int(sum(breaches.values())),
             "existingAccelMobile": int((d.current_provider == "Accel (mobile only)").sum())},
})

# ---------------------------------------------------------------- lead score
emp_band = pd.cut(d.employee_count, [0, 1, 4, 9, 24, 10_000], labels=["1", "2-4", "5-9", "10-24", "25+"]).astype(str)
site_band = pd.cut(d.num_sites, [0, 1, 3, 10, 10_000], labels=["1", "2-3", "4-10", "10+"]).astype(str)
feat = pd.DataFrame({
    "seg": d.seg, "source": d.lead_source, "gstin": d.has_gstin, "udyam": d.has_udyam,
    "internet": d.current_internet, "tier": d.city_tier.astype(str), "emp": emp_band, "sites": site_band,
    "accel": np.where(d.current_provider.str.startswith("Accel"), "Y", "N"),
})
X = pd.get_dummies(feat, prefix_sep="=").astype(float)
model = LogisticRegression(max_iter=3000, C=0.5)
auc = cross_val_score(model, X, d.act, cv=5, scoring="roc_auc").mean()
model.fit(X, d.act)
coef = dict(zip(X.columns, model.coef_[0]))
print(f"  lead score AUC (5-fold): {auc:.3f}")
LABEL = {"gstin=Y": "Has GSTIN", "gstin=N": "No GSTIN", "udyam=Y": "Has Udyam",
         "source=Referral": "Came by referral", "source=Inbound call": "Called us",
         "source=WhatsApp campaign": "WhatsApp campaign lead", "source=Website form": "Website form lead",
         "internet=Leased line": "Already on leased line", "internet=Mixed per site": "Mixed ISPs per site",
         "internet=Mobile hotspot": "Runs on phone hotspot", "internet=Business broadband": "Has business broadband",
         "seg=micro": "Micro shop", "seg=prof": "Professional office", "seg=multi": "Multi-site", "seg=mfg": "Manufacturer",
         "tier=1": "Tier-1 city", "tier=2": "Tier-2 city", "accel=Y": "Already an Accel customer"}
dump("lead_score.json", {"intercept": float(model.intercept_[0]), "auc": round(float(auc), 3),
                         "coef": {k: round(float(v), 4) for k, v in coef.items()}, "labels": LABEL})

# stalled, recoverable leads for the partner/sales queue (masked, small sample)
probs = model.predict_proba(X)[:, 1]
d["score"] = (probs * 100).round().astype(int)
def reasons(i):
    row = X.iloc[i]
    contrib = {k: coef[k] for k in X.columns if row[k] == 1 and abs(coef[k]) > 0.15}
    top = sorted(contrib.items(), key=lambda kv: -kv[1])[:3]
    return [LABEL.get(k, k.split("=")[1]) for k, v in top if v > 0]
def mask_name(n):
    parts = str(n).split()
    return " ".join(p[0] + "•" * (len(p) - 1) if i else p for i, p in enumerate(parts))
stalled = d[(d.outcome == "Dropped") & d.drop_reason.isin(FIXABLE.keys())].sort_values("score", ascending=False)
sample = pd.concat([stalled.head(90), stalled.iloc[90::25].head(60)])
dump("stalled_leads.json", [{
    "id": r.lead_id, "business": r.business_name, "type": r.business_type, "seg": r.seg,
    "city": r.city, "lang": r.preferred_language, "contact": mask_name(r.contact_name),
    "stage": r.stage_reached, "reason": r.drop_reason, "fix": FIXABLE[r.drop_reason],
    "source": r.lead_source, "score": int(r.score), "why": reasons(d.index.get_loc(i)),
    "gstin": "Y" if r.has_gstin == "Y" else "N", "created": r.created_date,
} for i, r in sample.iterrows()])

# ---------------------------------------------------------------- KYC specimens
def ocr(img):
    tmp = ROOT / "data-raw" / ".ocr_tmp.png"
    img.save(tmp)
    out = subprocess.run(["tesseract", str(tmp), "-"], capture_output=True, text=True).stdout
    tmp.unlink()
    return out

def sharpness(img):
    gray = np.asarray(img.convert("L").resize((620, int(620 * img.height / img.width))), dtype=float)
    lap = (-4 * gray[1:-1, 1:-1] + gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:])
    return float(lap.var())

def lines_of(text):
    return [l.strip() for l in text.splitlines() if l.strip()]

def field(text, label):
    m = re.search(rf"{label}\s*[:\-]?\s*(.+)", text)
    return m.group(1).strip() if m else None

def joined_address(lines, start_label, cont_label=None):
    """Address values wrap onto a second line; rejoin mid-word breaks without a space."""
    for i, l in enumerate(lines):
        if l.startswith(start_label):
            first = l[len(start_label):].strip()
            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            if cont_label and nxt.startswith(cont_label):
                nxt = nxt[len(cont_label):].strip()
            elif not cont_label and (":" in nxt or re.match(r"^(Bill|Units|Amount)", nxt)):
                nxt = ""
            if not nxt:
                return first
            glue = "" if (first[-1:].isalpha() and nxt[:1].islower()) else " "
            return re.sub(r"\s+", " ", (first + glue + nxt).replace("--", "-")).strip()
    return None

def parse(kind, text):
    L = lines_of(text)
    if kind == "gst_certificate":
        return {"gstin": (field(text, "GSTIN") or "").replace(" ", "") or None,
                "legalName": field(text, "Legal name"), "tradeName": field(text, "Trade name"),
                "constitution": field(text, "Constitution"),
                "address": joined_address(L, "Address of principal", "place of business"),
                "liabilityDate": field(text, "Date of liability")}
    if kind == "udyam_certificate":
        num = field(text, "Udyam reg. number")
        if num and not num.upper().startswith("UDYAM"):
            num = None
        return {"udyamNumber": num.replace(" ", "") if num else None,
                "enterpriseName": field(text, "Enterprise name"), "majorActivity": field(text, "Major activity"),
                "city": field(text, "City"), "state": field(text, "State"),
                "registrationDate": field(text, "Date of registration")}
    if kind == "address_proof":
        return {"consumerNo": field(text, "Consumer no."), "billedTo": field(text, "Billed to"),
                "address": joined_address(L, "Supply address"), "billDate": field(text, "Bill date"),
                "amount": field(text, r"Amount due \(INR\)")}
    if kind == "signatory_id":
        def after(lbl):
            for i, l in enumerate(L):
                if l == lbl and i + 1 < len(L): return L[i + 1]
            return field(text, lbl)
        return {"name": after("Name"), "designation": after("Designation"),
                "business": after("For business"), "idNumber": after("ID no."), "validTill": after("Valid till")}

def skew_angle(img):
    """Projection-profile skew estimate: the rotation that makes text rows sharpest."""
    im = img.convert("L").resize((600, int(600 * img.height / img.width)))
    best = (0.0, -1.0)
    for a in np.arange(-10, 10.5, 0.5):
        r = np.asarray(im.rotate(a, fillcolor=255, resample=Image.BILINEAR), dtype=float)
        v = (255 - r).sum(1).var()
        if v > best[1]:
            best = (float(a), v)
    return best[0]

specimens = {}
files = sorted((RAW / "kyc_documents").glob("*.png"))
for f in files:
    app_id, kind = f.stem.split("_", 1)
    img = Image.open(f).convert("RGB")
    sharp = sharpness(img)
    rotation = skew_angle(img) if sharp > 40 else 0.0
    work = img.rotate(rotation, expand=True, fillcolor="white") if abs(rotation) >= 1.5 else img
    text = ocr(work)
    readable = len(re.findall(r"[A-Za-z0-9]", text)) > 120
    quality = "ok" if readable else ("blurry" if sharp <= 40 else "unreadable")
    fields = parse(kind, text) if readable else None
    # ship a lighter copy of the image for the app
    w = 900
    small = img.resize((w, int(w * img.height / img.width)))
    out_name = f"{f.stem}.jpg"
    small.save(PUB / out_name, quality=78, optimize=True)
    specimens.setdefault(app_id, {})[kind] = {
        "image": f"kyc/{out_name}", "sharpness": round(sharp, 1), "deskewedBy": rotation,
        "quality": quality, "fields": fields, "rawText": text.strip()[:1200],
    }
    print(f"  {f.stem:28s} sharp={sharp:7.1f} rot={rotation:+.1f} quality={quality}")
dump("kyc_specimens.json", specimens)
print("done")
