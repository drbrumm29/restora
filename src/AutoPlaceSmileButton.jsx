// src/AutoPlaceSmileButton.jsx
// "✨ Auto-place with AI" button for Smile Creator step 2.
// Drop in anywhere near your manual point-placement UI and wire onLandmarks
// to whatever state holds your curve points.

import React, { useState } from 'react';
import { detectSmileLandmarks, urlToBase64Payload } from './smile-landmarks';

export default function AutoPlaceSmileButton({
  imageUrl,            // current smile photo URL (blob: or src)
  imageWidth,          // rendered image width in px
  imageHeight,         // rendered image height in px
  onLandmarks,         // (curvePoints[], landmarks{}) => void
  disabled,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const { imageBase64, mimeType } = await urlToBase64Payload(imageUrl);
      const resp = await detectSmileLandmarks(imageBase64, mimeType);

      if (!resp.ok) {
        setError(resp.error || 'Auto-placement failed');
        return;
      }

      const { result } = resp;

      if (typeof result.confidence === 'number' && result.confidence < 0.3) {
        setError(result.notes || 'Could not detect a clear smile. Place points manually.');
        return;
      }

      // Normalize → pixel coordinates.
      const curve = result.smile_curve.map((p) => ({
        x: p.x * imageWidth,
        y: p.y * imageHeight,
        tooth: p.tooth,
      }));

      const landmarks = {};
      for (const [key, p] of Object.entries(result.landmarks || {})) {
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          landmarks[key] = { x: p.x * imageWidth, y: p.y * imageHeight };
        }
      }

      onLandmarks?.(curve, landmarks);
    } catch (e) {
      setError(e.message || 'Auto-placement failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={run}
        disabled={disabled || loading || !imageUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 8,
          border: 'none',
          background: loading
            ? '#6b7280'
            : '#0abab5',
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || disabled || !imageUrl ? 'not-allowed' : 'pointer',
          opacity: disabled || !imageUrl ? 0.5 : 1,
          transition: 'transform 120ms, box-shadow 120ms',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'aps-spin 0.8s linear infinite',
              }}
            />
            Detecting…
          </>
        ) : (
          <>✨ Auto-place with AI</>
        )}
      </button>
      {error && (
        <span style={{ color: '#ef4444', fontSize: 12, maxWidth: 280 }}>{error}</span>
      )}
      <style>{`@keyframes aps-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
