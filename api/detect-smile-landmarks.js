// Vercel serverless function — detects smile landmarks via Claude Vision
// Matches the pattern of api/analyze-radiograph.js (server-side key, CORS, sonnet-4-5)

const SMILE_LANDMARKS_PROMPT = `You are a dental smile analysis assistant. Identify anatomical landmarks on the smile photograph for smile design planning.

Return NORMALIZED coordinates (0.0–1.0) where (0,0) is top-left and (1,1) is bottom-right of the image.

Return ONLY valid JSON matching this schema — no prose, no markdown fences:

{
  "landmarks": {
    "upper_lip_midline":     { "x": 0.0, "y": 0.0 },
    "lower_lip_midline":     { "x": 0.0, "y": 0.0 },
    "left_commissure":       { "x": 0.0, "y": 0.0 },
    "right_commissure":      { "x": 0.0, "y": 0.0 },
    "facial_midline_top":    { "x": 0.0, "y": 0.0 },
    "facial_midline_bottom": { "x": 0.0, "y": 0.0 }
  },
  "smile_curve": [
    { "x": 0.0, "y": 0.0, "tooth": "canine_R" },
    { "x": 0.0, "y": 0.0, "tooth": "lateral_R" },
    { "x": 0.0, "y": 0.0, "tooth": "central_R" },
    { "x": 0.0, "y": 0.0, "tooth": "central_L" },
    { "x": 0.0, "y": 0.0, "tooth": "lateral_L" },
    { "x": 0.0, "y": 0.0, "tooth": "canine_L" }
  ],
  "confidence": 0.0,
  "notes": ""
}

The smile_curve points must trace the incisal edges of the six anterior upper teeth, from the patient's RIGHT canine to the patient's LEFT canine (viewer's left to right). "R" and "L" refer to the PATIENT'S anatomical side, not the viewer's.

If the image does not show a clear smile with visible upper anterior teeth, return confidence < 0.3 and best-effort coordinates. Do not hallucinate tooth edges that are obscured by lips.`;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server not configured",
      message: "ANTHROPIC_API_KEY environment variable is not set in Vercel. Add it under Project Settings → Environment Variables.",
    });
  }

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: imageBase64, mimeType" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: SMILE_LANDMARKS_PROMPT },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: "Anthropic API error",
        status: response.status,
        details: errText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: e.message });
  }
}
