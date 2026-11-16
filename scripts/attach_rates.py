"""Share of activated customers in each segment who bought each add-on (case data, smb_leads.csv).

The Recommended plan suggests an add-on when at least 25% (1 in 4) of similar businesses bought it.
Internet lines and SIMs are left out: every plan has those. Run from the repo root:
    python3 scripts/attach_rates.py
"""
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEG = {"Micro retail & services": "micro", "Professional offices": "prof",
       "Small multi-site businesses": "multi", "Small manufacturers": "mfg"}
BASE = {"P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"}

rows = [r for r in csv.DictReader(open(ROOT / "data-raw" / "smb_leads.csv", encoding="utf-8")) if r["activated_date"]]
bought, n = defaultdict(Counter), Counter()
for r in rows:
    seg = SEG[r["segment"]]
    n[seg] += 1
    for pid in {x.split("x")[0] for x in r["bundle_products"].split(";") if x}:
        if pid not in BASE:
            bought[seg][pid] += 1

out = {"source": "smb_leads.csv, activated customers", "threshold": 0.25, "customers": dict(n),
       "rates": {seg: {pid: round(c / n[seg], 3) for pid, c in bought[seg].most_common()} for seg in SEG.values()}}
(ROOT / "src" / "data" / "attach_rates.json").write_text(json.dumps(out, indent=1))
for seg, rates in out["rates"].items():
    print(seg, n[seg], ", ".join(f"{p} {v:.0%}" for p, v in rates.items() if v >= 0.25))
