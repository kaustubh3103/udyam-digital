// One door to a language model, three ways in:
//  1. Inside claude.ai (the published demo): the page's built-in "ask Claude" capability.
//     No API key; the viewer is asked once to allow it.
//  2. Self-hosted (GitHub / Vercel): set VITE_AI_ENDPOINT to the serverless function in api/chat.js,
//     which holds the API key on the server.
//  3. Neither: returns null and every AI feature falls back to taps, keywords and pre-written text.
// Tests can inject a fake model with window.__UDYAM_TEST_LLM__ = async (input, opts) => ({ text }).

let pending = null;
let disabled = false;

export function parseJsonLoose(text) {
  const t = String(text || "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* fall through */ } }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  const err = new Error("invalid_json"); err.code = "invalid_json"; err.text = t; throw err;
}

function fromAsk(kind, ask) {
  return {
    kind,
    ask: async (input, opts = {}) => (await ask(input, opts)).text,
    json: async (input, opts = {}) => parseJsonLoose((await ask(input, opts)).text),
  };
}

export function getLLM() {
  if (disabled) return Promise.resolve(null);
  if (pending) return pending;
  pending = (async () => {
    if (typeof window === "undefined") return null;
    if (typeof window.__UDYAM_TEST_LLM__ === "function") return fromAsk("test", window.__UDYAM_TEST_LLM__);
    try {
      const sample = window.claude?.use ? await window.claude.use("sample") : null;
      if (sample) {
        return {
          kind: "claude",
          ask: async (input, opts = {}) => (await sample(input, { modelTier: "quick", cache: false, ...opts })).text,
          json: async (input, opts = {}) => sample.json(input, { modelTier: "quick", cache: false, ...opts }),
        };
      }
    } catch { /* not in a Claude viewer */ }
    const endpoint = import.meta.env?.VITE_AI_ENDPOINT;
    if (endpoint) {
      return fromAsk("endpoint", async (input, opts) => {
        const res = await fetch(endpoint, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ input }), signal: opts.signal,
        });
        if (!res.ok) { const e = new Error("upstream_error"); e.code = res.status === 429 ? "rate_limited" : "upstream_error"; throw e; }
        return res.json();
      });
    }
    return null;
  })();
  return pending;
}

/** Call after a permanent refusal (viewer declined, AI switched off) so features hide for this visit. */
export function disableLLM() { disabled = true; pending = null; }
export const PERMANENT = new Set(["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"]);
