// src/smile-landmarks.js
// Client helper: calls /api/detect-smile-landmarks and parses the Claude response.
// Mirrors the pattern of analyzeRadiograph() in radiograph-analyzer.js.

export async function detectSmileLandmarks(imageBase64, mimeType) {
  const response = await fetch("/api/detect-smile-landmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return {
      ok: false,
      error: err.message || err.error || `Server returned ${response.status}`,
      raw: err.details || "",
    };
  }

  const data = await response.json();
  const text = data.content?.map((i) => i.text || "").join("\n") || "";
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    if (!parsed.smile_curve || !Array.isArray(parsed.smile_curve)) {
      return { ok: false, error: "Invalid response shape from model", raw: clean };
    }
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, error: "Parse error", raw: clean };
  }
}

// Convert a File/Blob to { imageBase64, mimeType } for API consumption.
export function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const [meta, data] = dataUrl.split(",");
      const match = /data:([^;]+);base64/.exec(meta);
      resolve({ imageBase64: data, mimeType: match?.[1] || file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

// Convert a same-origin image URL (blob: or /uploads/...) to base64 payload.
export async function urlToBase64Payload(url) {
  const r = await fetch(url);
  const blob = await r.blob();
  return fileToBase64Payload(blob);
}
