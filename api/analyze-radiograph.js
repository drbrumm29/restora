// Vercel serverless function — proxies radiograph analysis to Anthropic API
// Keeps API key server-side, handles CORS

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
    const { imageBase64, mimeType, prompt } = req.body || {};
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: "Missing required fields: imageBase64, mimeType, prompt" });
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
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: prompt },
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
