// Serverless endpoint for the self-hosted app (Vercel: drop this repo in, set ANTHROPIC_API_KEY).
// The browser never sees the key. Build the app with VITE_AI_ENDPOINT=/api/chat to switch AI on.
//
// Request:  POST { input: string | [{ role: "user" | "assistant", content: string }] }
// Response: { text: string }

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";
const MAX_INPUT = 200_000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "ai_not_configured" });

  const input = req.body?.input;
  const messages = typeof input === "string" ? [{ role: "user", content: input }] : Array.isArray(input) ? input : null;
  if (!messages?.length || JSON.stringify(messages).length > MAX_INPUT) return res.status(400).json({ error: "invalid_request" });

  // Merge consecutive turns with the same role, as the Messages API expects alternation.
  const merged = [];
  for (const m of messages) {
    if (!["user", "assistant"].includes(m?.role) || typeof m.content !== "string" || !m.content) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else merged.push({ role: m.role, content: m.content });
  }
  if (!merged.length || merged[0].role !== "user" || merged[merged.length - 1].role !== "user")
    return res.status(400).json({ error: "invalid_request" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: merged }),
    });
    if (r.status === 429) return res.status(429).json({ error: "rate_limited" });
    if (!r.ok) return res.status(502).json({ error: "upstream_error" });
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "upstream_error" });
  }
}
