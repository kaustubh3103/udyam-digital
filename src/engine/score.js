// "Call this first" score: a small logistic model trained on the 5,000 leads
// (scripts/prepare_data.py). Explainable: every score comes with the factors that pushed it up.

export function scoreLead(features, model) {
  let z = model.intercept;
  const contrib = [];
  for (const [k, v] of Object.entries(features)) {
    const key = `${k}=${v}`;
    const c = model.coef[key];
    if (c !== undefined) { z += c; contrib.push([key, c]); }
  }
  const p = 1 / (1 + Math.exp(-z));
  const why = contrib.filter(([, c]) => c > 0.15).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k]) => model.labels[k] ?? k.split("=")[1]);
  return { score: Math.round(p * 100), why };
}
