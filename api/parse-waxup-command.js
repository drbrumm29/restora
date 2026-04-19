// /api/parse-waxup-command
// Voice-transcript → structured waxup edit commands.
//
// Takes the user's spoken sentence (e.g. "make number eight a millimeter
// longer and add a little labial fullness"), the list of tooth numbers
// they've already labeled on the scan, and asks Claude to emit an array
// of structured ops the browser can apply directly.
//
// The browser-side executor (src/waxup-ops.js applyOps) implements each
// op type below. Adding a new op means updating BOTH this prompt and
// applyOp's switch in waxup-ops.js.

const OPS_SCHEMA = `
Each op must be one of these types. Units are millimeters for "mm" and
degrees for "degrees". Unknown ops are ignored — only use these exact type
strings:

  { type: "extend_incisally",       tooth: N, mm: 0.1–3 }
  { type: "shorten",                tooth: N, mm: 0.1–3 }
  { type: "widen_mesially",         tooth: N, mm: 0.1–1 }
  { type: "narrow_mesially",        tooth: N, mm: 0.1–1 }
  { type: "widen_distally",         tooth: N, mm: 0.1–1 }
  { type: "narrow_distally",        tooth: N, mm: 0.1–1 }
  { type: "add_labial_convexity",   tooth: N, mm: 0.05–0.6 }
  { type: "reduce_labial_convexity",tooth: N, mm: 0.05–0.6 }
  { type: "smooth",                 tooth: N, strength: 0.1–1 }
  { type: "rotate_axis",            tooth: N, degrees: -10–10 }

tooth is the Universal numbering integer (#1–#32).
`

const SYSTEM_PROMPT = `You are the command parser for a dental CAD waxup tool. The dentist speaks a short instruction about modifying specific teeth; you convert it into a JSON array of primitive mesh-edit operations.

${OPS_SCHEMA}

Rules:
1. Only emit ops for teeth that appear in the provided availableTeeth list. If the user names a tooth not on that list, skip it silently.
2. If an instruction maps to multiple ops (e.g. "make it longer and wider" = extend + widen), return each as a separate op object in the array.
3. If a measurement is vague ("a little", "slightly", "noticeably"), pick a sensible default: little = 0.3mm / 2°, moderate = 0.8mm / 5°, large = 1.5mm / 8°. Clamp all values inside the ranges above.
4. "Longer" = extend_incisally. "Shorter" = shorten. "Add fullness / bulk / labial projection" = add_labial_convexity. "Flatten" or "reduce bulk" = reduce_labial_convexity. "Rotate mesially/distally" = rotate_axis (positive degrees = mesial).
5. Respond with ONLY the JSON array — no prose, no fences. If you cannot identify any valid op, respond with [].`

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY not configured",
      message: "Create .env.local with ANTHROPIC_API_KEY=sk-ant-... (dev) or set it in Vercel → Environment Variables (prod).",
    })
  }

  try {
    const { transcript, availableTeeth } = req.body || {}
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: "Missing transcript" })
    }
    const teethList = Array.isArray(availableTeeth) && availableTeeth.length
      ? `Available teeth (labeled on the scan): ${availableTeeth.map(n => `#${n}`).join(', ')}`
      : `Available teeth: none labeled yet — return [] and ask the user to label teeth first.`

    const userMsg = `${teethList}\n\nInstruction: "${transcript.trim()}"`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: "Anthropic API error", details: errText })
    }

    const data = await response.json()
    const text = data.content?.map(i => i.text || "").join("\n").trim() || "[]"
    const clean = text.replace(/```json\n?|```\n?/g, "").trim()
    let ops
    try {
      ops = JSON.parse(clean)
      if (!Array.isArray(ops)) throw new Error("Not an array")
    } catch (e) {
      return res.status(200).json({ ops: [], parseError: e.message, raw: clean })
    }
    return res.status(200).json({ ops, transcript: transcript.trim() })
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: e.message })
  }
}
