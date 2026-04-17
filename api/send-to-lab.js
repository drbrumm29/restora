// /api/send-to-lab.js
// ─────────────────────────────────────────────────────────────────────
// Send smile design package to lab via email with PNG + JSON attached.
// Uses Resend (https://resend.com) — free tier: 100 emails/day, 3k/month.
//
// REQUIRED ENV VAR in Vercel: RESEND_API_KEY
//   Sign up at resend.com, create API key, paste into Vercel project settings.
// OPTIONAL ENV VAR: RESEND_FROM_ADDRESS (e.g., "Restora <smile@yourdomain.com>")
//   Must be from a domain you've verified with Resend.
//   Falls back to "onboarding@resend.dev" — works immediately, deliverability
//   will be better once user verifies their own domain.
//
// REQUEST (POST) — JSON body:
//   {
//     to:       "lab@example.com",
//     subject:  "Smile design — Carrie Pappas",
//     bodyText: "...",
//     pngBase64:  "data-url-or-raw-base64",   (the visualization)
//     pngFilename: "smile-design-carrie-pappas-2026-04-17.png",
//     jsonPayload: {...},                     (the lab handoff — stringified below)
//     jsonFilename: "lab-handoff-carrie-pappas-2026-04-17.json",
//   }
//
// RESPONSE:
//   { ok: true,  messageId: "..." }             — sent OK
//   { ok: false, error: "...", code: "..." }    — failure (with reason)
// ─────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed', code: 'METHOD' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: 'Email service not configured. Set RESEND_API_KEY in Vercel env vars.',
      code: 'NO_API_KEY',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body', code: 'BAD_JSON' });
  }

  const { to, subject, bodyText, pngBase64, pngFilename, jsonPayload, jsonFilename } = body || {};

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return res.status(400).json({ ok: false, error: 'Recipient email is invalid', code: 'BAD_TO' });
  }
  if (!subject || !bodyText) {
    return res.status(400).json({ ok: false, error: 'Missing subject or body', code: 'BAD_CONTENT' });
  }
  if (!pngBase64 || !pngFilename) {
    return res.status(400).json({ ok: false, error: 'Missing PNG attachment', code: 'BAD_PNG' });
  }

  // Strip data URL prefix if present (lets client send either format)
  const pngClean = pngBase64.startsWith('data:') ? pngBase64.split(',')[1] : pngBase64;

  const attachments = [
    { filename: pngFilename, content: pngClean },
  ];
  if (jsonPayload) {
    const jsonString = typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload, null, 2);
    attachments.push({
      filename: jsonFilename || 'lab-handoff.json',
      content: Buffer.from(jsonString, 'utf8').toString('base64'),
    });
  }

  const from = process.env.RESEND_FROM_ADDRESS || 'Restora <onboarding@resend.dev>';

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: bodyText,
        attachments,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({
        ok: false,
        error: result?.message || 'Resend API error',
        code: 'RESEND_ERROR',
        details: result,
      });
    }

    return res.status(200).json({ ok: true, messageId: result?.id || null });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
      code: 'NETWORK_ERROR',
    });
  }
}
