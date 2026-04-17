// ┌─────────────────────────────────────────────────────────────────┐
// │ SmileCreator — 2D photo-based smile design (exocad-style)       │
// │ Workflow:                                                        │
// │   1. Load retracted smile photo                                  │
// │   2. Place smile curve (3 clicks: L-commissure, midline, R)     │
// │   3. Pick proportion preset                                      │
// │   4. Pick library → 10 tooth outlines auto-generated on curve   │
// │   5. Click tooth to select → drag body to move (Commit 2 adds    │
// │      full resize/rotate handles)                                 │
// └─────────────────────────────────────────────────────────────────┘

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#ffffff", muted:"#e0ecf8", light:"#c0d4ea",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.18)", tealBorder:"rgba(10,186,181,.45)",
  amber:"#f59e0b", amberDim:"rgba(245,158,11,.15)",
  red:"#ef4444", green:"#10b981",
  purple:"#7c3aed", gold:"#b8860b",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// ── Proportion presets ─────────────────────────────────────────────
// Widths expressed as ratio to central incisor (tooth #8 or #9, width = 1.0)
// From most anterior to most posterior. Order: central, lateral, canine, PM1, PM2.
const PROPORTIONS = {
  "golden": {
    label: "Golden Ratio",
    description: "1.618 ratio — classic esthetic proportion (Lombardi)",
    widths: [1.000, 0.618, 0.382, 0.236, 0.146],
    wlRatio: 0.80,  // width:length ratio for centrals
  },
  "red": {
    label: "RED Proportion",
    description: "Recurring Esthetic Dental — each tooth is 70% width of the one in front",
    widths: [1.000, 0.700, 0.490, 0.343, 0.240],
    wlRatio: 0.80,
  },
  "mirror": {
    label: "1:1 Mirror",
    description: "Symmetric — left side mirrors right side exactly",
    widths: [1.000, 0.750, 0.600, 0.450, 0.350],
    wlRatio: 0.82,
  },
  "natural": {
    label: "Natural Variation",
    description: "Typical human proportions — less geometric, more natural",
    widths: [1.000, 0.720, 0.560, 0.420, 0.330],
    wlRatio: 0.78,
  },
};

// ── Library outline shapes ──────────────────────────────────────────
// 2D silhouettes (facial view). Normalized [-0.5, 0.5] on both axes.
// Origin at incisal edge midpoint, incisal edge is at y=-0.5, cervical at y=+0.5.
// x=0 is mesiodistal midline of the tooth. x negative = mesial, x positive = distal.
// Each path is an array of [x, y] points forming a closed polygon.
// 4 tooth types: central, lateral, canine, premolar.

const TOOTH_OUTLINES = {
  // CENTRAL INCISOR — boxy, slight incisal curve, corners rounded
  central: [
    [-0.47, -0.45], [-0.48, -0.15], [-0.45, +0.15], [-0.35, +0.42], [-0.15, +0.48],
    [+0.15, +0.48], [+0.35, +0.42], [+0.45, +0.15], [+0.48, -0.15], [+0.47, -0.45],
    [+0.38, -0.48], [+0.20, -0.50], [0, -0.50], [-0.20, -0.50], [-0.38, -0.48],
  ],
  // LATERAL INCISOR — more rounded, smaller, ovoid
  lateral: [
    [-0.42, -0.35], [-0.46, -0.05], [-0.42, +0.22], [-0.30, +0.42], [-0.12, +0.48],
    [+0.12, +0.48], [+0.30, +0.42], [+0.42, +0.22], [+0.46, -0.05], [+0.42, -0.35],
    [+0.30, -0.45], [+0.10, -0.48], [-0.10, -0.48], [-0.30, -0.45],
  ],
  // CANINE — pointed incisal tip, robust, slightly asymmetric (mesial longer than distal)
  canine: [
    [-0.40, -0.15], [-0.46, +0.10], [-0.42, +0.35], [-0.28, +0.46], [-0.08, +0.48],
    [+0.10, +0.48], [+0.32, +0.42], [+0.45, +0.22], [+0.48, -0.05], [+0.42, -0.28],
    [+0.25, -0.45], [+0.05, -0.50], [-0.15, -0.48], [-0.32, -0.38],
  ],
  // PREMOLAR — buccal cusp + smaller lingual cusp silhouette when viewed facially
  // From facial view it looks like a wider canine with more rounded cusp tip
  premolar: [
    [-0.40, -0.10], [-0.45, +0.15], [-0.40, +0.38], [-0.25, +0.48], [-0.08, +0.50],
    [+0.10, +0.50], [+0.28, +0.46], [+0.42, +0.30], [+0.46, +0.05], [+0.42, -0.22],
    [+0.25, -0.42], [+0.05, -0.48], [-0.18, -0.45], [-0.35, -0.32],
  ],
};

// Map Universal tooth number → outline type
// For upper arch (#4-#13): 4,5=PM  6=canine  7=lateral  8,9=central  10=lateral  11=canine  12,13=PM
function toothTypeForNumber(n) {
  const dist = n >= 9 ? n - 8 : 9 - n;  // distance from midline: 1=central, 2=lateral, 3=canine, 4=PM1, 5=PM2
  if (dist === 1) return 'central';
  if (dist === 2) return 'lateral';
  if (dist === 3) return 'canine';
  return 'premolar';
}

// Shade hex values (same as RestorationCAD)
const SHADE_HEX = {
  "BL1":  "#fdfcf7", "BL2":  "#fbf9f0", "BL3":  "#f9f5e8", "BL4":  "#f7f1df",
  "A1":   "#f5ead0", "A2":   "#f0e0b8", "A3":   "#e8d4a0", "A3.5": "#e0c888", "A4": "#d4b870",
  "B1":   "#f8ecd0", "B2":   "#f2deb8", "B3":   "#eacfa0",
  "C1":   "#e8d8b8", "C2":   "#ddc8a0",
};

// ── Geometry helpers ───────────────────────────────────────────────
// Parabolic smile curve through 3 control points (L-commissure, midline, R-commissure)
function evalSmileCurve(t, p0, p1, p2) {
  // Quadratic Bezier: (1-t)² P0 + 2(1-t)t P1 + t² P2
  const u = 1 - t;
  return {
    x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
    y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y,
  };
}

// Derivative of quadratic Bezier → tangent direction at t
function curveTangent(t, p0, p1, p2) {
  // 2(1-t)(P1-P0) + 2t(P2-P1)
  const u = 1 - t;
  return {
    x: 2*u*(p1.x - p0.x) + 2*t*(p2.x - p1.x),
    y: 2*u*(p1.y - p0.y) + 2*t*(p2.y - p1.y),
  };
}

// Approximate arc length via sampling
function curveArcLength(p0, p1, p2, samples = 100) {
  let length = 0;
  let prev = evalSmileCurve(0, p0, p1, p2);
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const pt = evalSmileCurve(t, p0, p1, p2);
    length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return length;
}

// Find parameter t such that arc length from start = target
function tForArcLength(target, p0, p1, p2, samples = 200) {
  let length = 0;
  let prev = evalSmileCurve(0, p0, p1, p2);
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const pt = evalSmileCurve(t, p0, p1, p2);
    const step = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    if (length + step >= target) {
      // Linearly interpolate within this segment
      const frac = (target - length) / step;
      return (i - 1 + frac) / samples;
    }
    length += step;
    prev = pt;
  }
  return 1;
}

// ── Main component ─────────────────────────────────────────────────
export default function SmileCreator({ navigate, activePatient }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoDim, setPhotoDim] = useState({ w: 0, h: 0 });
  const [canvasDim, setCanvasDim] = useState({ w: 0, h: 0 });

  // Workflow step: 1=load photo, 2=place smile curve, 3=design
  const [step, setStep] = useState(1);

  // Smile curve control points in image-space pixels
  // p0 = left commissure, p1 = incisal midline, p2 = right commissure
  const [smileCurve, setSmileCurve] = useState(null);
  const [curveDragIdx, setCurveDragIdx] = useState(null);

  // Design state
  const [proportion, setProportion] = useState("golden");
  const [library, setLibrary] = useState("dannydesigner5");
  const [shade, setShade] = useState("BL2");
  const [teeth, setTeeth] = useState([]);  // generated tooth data
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [toothDragOffset, setToothDragOffset] = useState(null);
  const [activeHandle, setActiveHandle] = useState(null);
  const [showPhoto, setShowPhoto] = useState(true);
  const [showBefore, setShowBefore] = useState(false);

  // Auto-load first photo for active patient
  useEffect(() => {
    if (!activePatient) return;
    // Use retracted_full.jpg from Carrie's photo folder as default
    if (activePatient.id === 'carrie-pappas') {
      setPhotoUrl('/patient-cases/carrie-photos/retracted_full.jpg');
    }
  }, [activePatient]);

  // Load image when URL changes
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setPhotoDim({ w: img.naturalWidth, h: img.naturalHeight });
      setPhotoLoaded(true);
      if (step === 1) setStep(2);  // advance to smile curve placement
    };
    img.onerror = () => {
      setPhotoLoaded(false);
      console.warn('Photo failed to load:', photoUrl);
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Resize canvas to fit container
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasDim({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute image-to-canvas transform (fit image into canvas, preserving aspect)
  const transform = useMemo(() => {
    if (!photoDim.w || !canvasDim.w) return null;
    const scaleX = canvasDim.w / photoDim.w;
    const scaleY = canvasDim.h / photoDim.h;
    const scale = Math.min(scaleX, scaleY) * 0.96;
    const imgW = photoDim.w * scale;
    const imgH = photoDim.h * scale;
    const offsetX = (canvasDim.w - imgW) / 2;
    const offsetY = (canvasDim.h - imgH) / 2;
    return { scale, offsetX, offsetY, imgW, imgH };
  }, [photoDim, canvasDim]);

  // Convert canvas coord → image coord
  const canvasToImage = (x, y) => {
    if (!transform) return { x, y };
    return { x: (x - transform.offsetX) / transform.scale, y: (y - transform.offsetY) / transform.scale };
  };
  // Convert image coord → canvas coord
  const imageToCanvas = (x, y) => {
    if (!transform) return { x, y };
    return { x: x * transform.scale + transform.offsetX, y: y * transform.scale + transform.offsetY };
  };

  // ── Generate tooth outlines from smile curve + proportion ─────
  const generateTeeth = useCallback(() => {
    if (!smileCurve) return;
    const { p0, p1, p2 } = smileCurve;

    const preset = PROPORTIONS[proportion];
    const widths = preset.widths;  // [central, lateral, canine, PM1, PM2]

    // Tooth numbers to place (upper arch #4-#13)
    // Ordered left-to-right along the smile curve (patient's right first, then left)
    // In image: patient's right = viewer's left = t=0
    const toothNums = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    // Compute relative widths for each tooth
    // toothNum → distance from midline → preset index
    const relWidths = toothNums.map(n => {
      const dist = n >= 9 ? n - 8 : 9 - n;  // 1..5
      return widths[dist - 1] || 0.5;
    });
    const totalRelWidth = relWidths.reduce((a, b) => a + b, 0);

    // Arc length of smile curve
    const arcLen = curveArcLength(p0, p1, p2);
    // Each tooth gets a portion proportional to its relative width
    // Add small gaps (3% of total) between teeth
    const gapFraction = 0.02;
    const usableArc = arcLen * (1 - gapFraction * (toothNums.length - 1));
    const toothArcLens = relWidths.map(w => usableArc * w / totalRelWidth);
    const gapArcLen = arcLen * gapFraction;

    // For central tooth reference size — use the chord |p2-p0| to estimate scale
    const chordLen = Math.hypot(p2.x - p0.x, p2.y - p0.y);
    // Central tooth width in image pixels — typical 9mm tooth, ~1/10 of the mouth opening
    const centralWidthImagePx = chordLen * 0.12;  // slight tuning
    const centralHeightImagePx = centralWidthImagePx / preset.wlRatio;

    // Place each tooth centered on the appropriate arc-length position
    let cumulative = 0;
    const newTeeth = toothNums.map((n, idx) => {
      const halfLen = toothArcLens[idx] / 2;
      const centerArcPos = cumulative + halfLen;
      cumulative += toothArcLens[idx] + gapArcLen;

      const t = tForArcLength(centerArcPos, p0, p1, p2);
      const pos = evalSmileCurve(t, p0, p1, p2);
      const tan = curveTangent(t, p0, p1, p2);
      const tanAngle = Math.atan2(tan.y, tan.x);
      // Normal (perpendicular, pointing UP in image — toward cervical)
      // Actually: we want the tooth to sit ABOVE the smile curve (incisal edge on curve, cervical above)
      // In image space: y axis points DOWN, so "above" means smaller y → perpendicular points up-ish

      const type = toothTypeForNumber(n);
      const relWidth = relWidths[idx];
      const width = centralWidthImagePx * relWidth;
      const height = centralHeightImagePx * (0.95 + relWidth * 0.05);  // lateral teeth a tad shorter

      return {
        num: n,
        type,
        cx: pos.x,
        cy: pos.y - height / 2,  // center of tooth is HALF HEIGHT above curve point
        width,
        height,
        rotation: tanAngle,  // tangent-aligned; 0 = horizontal
        // outline data loaded from preset
      };
    });

    setTeeth(newTeeth);
    if (step === 2) setStep(3);
  }, [smileCurve, proportion, step]);

  // Regenerate teeth when smile curve, proportion, or library changes
  useEffect(() => {
    if (smileCurve && step >= 2) generateTeeth();
  }, [smileCurve, proportion, generateTeeth]);

  // ── Canvas rendering ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasDim.w || !canvasDim.h) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvasDim.w * dpr;
    canvas.height = canvasDim.h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);

    // Draw photo
    if (imageRef.current && transform && showPhoto) {
      ctx.drawImage(
        imageRef.current,
        transform.offsetX, transform.offsetY,
        transform.imgW, transform.imgH
      );
    }

    // Ghost guide: show where next click should land, based on typical smile photo framing
    // Approximate positions — left commissure ~25% from left, midline ~50%, right ~75%
    // at ~60% down from top (typical photo framing of a retracted smile)
    if (!smileCurve && step === 2 && transform) {
      const imgW = transform.imgW;
      const imgH = transform.imgH;
      const imgOx = transform.offsetX;
      const imgOy = transform.offsetY;
      const ghostY = imgOy + imgH * 0.58;
      const ghosts = [
        { x: imgOx + imgW * 0.32, label: 'L', caption: 'Left corner of lips' },
        { x: imgOx + imgW * 0.50, label: 'M', caption: 'Between front teeth' },
        { x: imgOx + imgW * 0.68, label: 'R', caption: 'Right corner of lips' },
      ];
      const nextIdx = placementBuffer.length;  // which ghost is "active"

      // Pulse animation tied to time
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500);

      ghosts.forEach((g, i) => {
        const isActive = i === nextIdx;
        const isDone = i < nextIdx;
        if (isDone) return;  // already placed

        ctx.save();
        // Pulsing outer ring on the active ghost
        if (isActive) {
          const ringR = 24 + pulse * 10;
          ctx.strokeStyle = `rgba(10, 186, 181, ${0.35 + pulse * 0.35})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(g.x, ghostY, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Inner dot
        ctx.fillStyle = isActive ? 'rgba(10, 186, 181, 0.85)' : 'rgba(10, 186, 181, 0.25)';
        ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.beginPath();
        ctx.arc(g.x, ghostY, isActive ? 14 : 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Label inside
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.5)';
        ctx.font = `bold ${isActive ? 13 : 11}px ${C.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.label, g.x, ghostY);
        // Caption below the active one
        if (isActive) {
          ctx.font = "600 14px system-ui";
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.textAlign = 'center';
          // Shadow behind text for readability
          ctx.shadowColor = 'rgba(0,0,0,0.7)';
          ctx.shadowBlur = 8;
          ctx.fillText(`Tap here: ${g.caption}`, g.x, ghostY + 40);
        }
        ctx.restore();
      });
    }

    // Draw smile curve
    if (smileCurve && transform) {
      const { p0, p1, p2 } = smileCurve;
      const c0 = imageToCanvas(p0.x, p0.y);
      const c1 = imageToCanvas(p1.x, p1.y);
      const c2 = imageToCanvas(p2.x, p2.y);

      // Curve line
      if (!showBefore) {
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(c0.x, c0.y);
        // Approximate Bezier with many segments
        for (let i = 1; i <= 40; i++) {
          const t = i / 40;
          const pt = evalSmileCurve(t, p0, p1, p2);
          const cp = imageToCanvas(pt.x, pt.y);
          ctx.lineTo(cp.x, cp.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Control points
        [c0, c1, c2].forEach((pt, i) => {
          ctx.fillStyle = i === 1 ? C.amber : C.teal;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = "bold 11px " + C.font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(i === 1 ? 'M' : (i === 0 ? 'L' : 'R'), pt.x, pt.y);
        });
      }
    }

    // Draw in-progress placement dots (clicks 1 and 2 of 3, while placing smile curve)
    if (step === 2 && !smileCurve && placementBuffer.length > 0 && transform) {
      placementBuffer.forEach((pt, i) => {
        const cp = imageToCanvas(pt.x, pt.y);
        ctx.fillStyle = i === 1 ? C.amber : C.teal;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 11px " + C.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i === 1 ? 'M' : (i === 0 ? 'L' : 'R'), cp.x, cp.y);
      });
    }

    // Draw teeth
    if (teeth.length > 0 && !showBefore) {
      teeth.forEach(tooth => {
        ctx.save();
        const cPos = imageToCanvas(tooth.cx, tooth.cy);
        const cW = tooth.width * transform.scale;
        const cH = tooth.height * transform.scale;
        ctx.translate(cPos.x, cPos.y);
        ctx.rotate(tooth.rotation);

        // Draw tooth outline (polygon)
        const outline = TOOTH_OUTLINES[tooth.type];
        const isSelected = selectedTooth === tooth.num;
        const shadeColor = SHADE_HEX[shade] || "#f5ead0";

        ctx.beginPath();
        outline.forEach((pt, i) => {
          const x = pt[0] * cW;
          const y = pt[1] * cH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        // Fill with shade color (semi-opaque for overlay effect)
        ctx.fillStyle = shadeColor + "e6";  // ~90% alpha
        ctx.fill();

        // Stroke
        ctx.strokeStyle = isSelected ? C.teal : "rgba(255,255,255,0.4)";
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.stroke();

        // Tooth number label
        ctx.fillStyle = isSelected ? C.teal : "rgba(0,0,0,0.55)";
        ctx.font = `bold ${Math.max(10, cH * 0.15)}px ` + C.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${tooth.num}`, 0, 0);

        // Selection handles (drawn in tooth local coord frame — already rotated)
        if (isSelected) {
          // Bounding frame (thin dashed to show the handle grid)
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = C.teal;
          ctx.lineWidth = 1;
          ctx.strokeRect(-cW/2, -cH/2, cW, cH);
          ctx.restore();

          // Rotation handle arm — line from top edge up to handle
          ctx.strokeStyle = C.teal;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -cH/2);
          ctx.lineTo(0, -cH * 0.75);
          ctx.stroke();

          // Draw 4 corner handles + rotate handle
          const handles = [
            { x: -cW/2, y: -cH/2, label: 'NW' },
            { x: +cW/2, y: -cH/2, label: 'NE' },
            { x: -cW/2, y: +cH/2, label: 'SW' },
            { x: +cW/2, y: +cH/2, label: 'SE' },
          ];
          handles.forEach(h => {
            // White ring + teal center (visible on any background)
            ctx.beginPath();
            ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(h.x, h.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = C.teal;
            ctx.fill();
          });
          // Rotate handle — circular arrow icon
          ctx.beginPath();
          ctx.arc(0, -cH * 0.75, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, -cH * 0.75, 5, 0, Math.PI * 2);
          ctx.fillStyle = C.amber;
          ctx.fill();
          // Small arc inside to suggest rotation
          ctx.beginPath();
          ctx.arc(0, -cH * 0.75, 2.5, -Math.PI * 0.3, Math.PI * 1.3);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore();
      });
    }
  }, [canvasDim, transform, smileCurve, teeth, selectedTooth, shade, showPhoto, showBefore, step, placementBuffer, pulseTick]);

  // ── Mouse/touch handlers ──────────────────────────────────────
  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    return { x: cx, y: cy };
  };

  const hitTestCurvePoints = (cx, cy) => {
    if (!smileCurve) return -1;
    const points = [smileCurve.p0, smileCurve.p1, smileCurve.p2];
    for (let i = 0; i < 3; i++) {
      const cpos = imageToCanvas(points[i].x, points[i].y);
      if (Math.hypot(cpos.x - cx, cpos.y - cy) < 14) return i;
    }
    return -1;
  };

  const hitTestTooth = (cx, cy) => {
    // Check each tooth in reverse (last drawn = topmost)
    for (let i = teeth.length - 1; i >= 0; i--) {
      const tooth = teeth[i];
      const cPos = imageToCanvas(tooth.cx, tooth.cy);
      const cW = tooth.width * transform.scale;
      const cH = tooth.height * transform.scale;

      // Transform point into tooth local space
      const dx = cx - cPos.x;
      const dy = cy - cPos.y;
      const cosR = Math.cos(-tooth.rotation);
      const sinR = Math.sin(-tooth.rotation);
      const lx = (dx * cosR - dy * sinR) / cW;
      const ly = (dx * sinR + dy * cosR) / cH;

      // Rough bbox test first
      if (lx >= -0.5 && lx <= 0.5 && ly >= -0.5 && ly <= 0.5) {
        return tooth.num;
      }
    }
    return null;
  };

  // Hit-test the handles on the currently-selected tooth.
  // Returns 'nw' | 'ne' | 'sw' | 'se' | 'rotate' | null
  // Handles are positioned in tooth local space (same frame as outline), then
  // transformed to canvas coords via tooth rotation + cx/cy.
  const hitTestHandle = (cx, cy) => {
    if (selectedTooth === null) return null;
    const tooth = teeth.find(t => t.num === selectedTooth);
    if (!tooth) return null;
    const cPos = imageToCanvas(tooth.cx, tooth.cy);
    const cW = tooth.width * transform.scale;
    const cH = tooth.height * transform.scale;

    // Handle positions in tooth local space (normalized corners at ±0.5, rotate handle above)
    const handleSpecs = [
      { id: 'nw',     lx: -0.5, ly: -0.5 },
      { id: 'ne',     lx: +0.5, ly: -0.5 },
      { id: 'sw',     lx: -0.5, ly: +0.5 },
      { id: 'se',     lx: +0.5, ly: +0.5 },
      { id: 'rotate', lx:  0.0, ly: -0.75 },   // positioned above incisal edge
    ];

    for (const h of handleSpecs) {
      // Convert local → canvas
      const hx = h.lx * cW;
      const hy = h.ly * cH;
      const cosR = Math.cos(tooth.rotation);
      const sinR = Math.sin(tooth.rotation);
      const wx = cPos.x + hx * cosR - hy * sinR;
      const wy = cPos.y + hx * sinR + hy * cosR;
      if (Math.hypot(cx - wx, cy - wy) < 11) return h.id;
    }
    return null;
  };

  const handleMouseDown = (e) => {
    if (!transform) return;
    const { x: cx, y: cy } = getCanvasPoint(e);

    // Step 2: placing smile curve
    if (step === 2 && !smileCurve) {
      const imgPt = canvasToImage(cx, cy);
      const newBuffer = [...placementBuffer, imgPt];
      if (newBuffer.length === 3) {
        const [a, b, c] = newBuffer;
        setSmileCurve({ p0: a, p1: b, p2: c });
        setPlacementBuffer([]);
      } else {
        setPlacementBuffer(newBuffer);
      }
      return;
    }

    // PRIORITY 1 — handles on selected tooth (they sit on top of everything)
    const handle = hitTestHandle(cx, cy);
    if (handle !== null) {
      const tooth = teeth.find(t => t.num === selectedTooth);
      if (tooth) {
        // Save starting state for the drag — needed for delta calculations
        setActiveHandle({
          type: handle,
          startCanvasX: cx,
          startCanvasY: cy,
          startWidth: tooth.width,
          startHeight: tooth.height,
          startRotation: tooth.rotation,
          startCx: tooth.cx,
          startCy: tooth.cy,
        });
      }
      return;
    }

    // PRIORITY 2 — drag smile curve control point
    const curveIdx = hitTestCurvePoints(cx, cy);
    if (curveIdx >= 0) {
      setCurveDragIdx(curveIdx);
      return;
    }

    // PRIORITY 3 — click a tooth (select + start dragging body)
    const toothNum = hitTestTooth(cx, cy);
    if (toothNum !== null) {
      setSelectedTooth(toothNum);
      const tooth = teeth.find(t => t.num === toothNum);
      if (tooth) {
        const cPos = imageToCanvas(tooth.cx, tooth.cy);
        setToothDragOffset({ dx: cx - cPos.x, dy: cy - cPos.y });
      }
      return;
    }

    // Click empty = deselect
    setSelectedTooth(null);
  };

  const handleMouseMove = (e) => {
    if (!transform) return;
    const { x: cx, y: cy } = getCanvasPoint(e);

    // Handle drag takes priority — it determines resize/rotate behavior
    if (activeHandle && selectedTooth !== null) {
      const a = activeHandle;
      const tooth = teeth.find(t => t.num === selectedTooth);
      if (!tooth) return;

      if (a.type === 'rotate') {
        // Angle from tooth center to current pointer, minus angle at drag start
        const cPos = imageToCanvas(a.startCx, a.startCy);
        const startAngle = Math.atan2(a.startCanvasY - cPos.y, a.startCanvasX - cPos.x);
        const currentAngle = Math.atan2(cy - cPos.y, cx - cPos.x);
        const deltaAngle = currentAngle - startAngle;
        setTeeth(ts => ts.map(t => t.num === selectedTooth ?
          { ...t, rotation: a.startRotation + deltaAngle } : t));
        return;
      }

      // Corner resize — scale based on projection onto the tooth's local axes
      // Transform canvas delta into tooth-local delta
      const cPos = imageToCanvas(a.startCx, a.startCy);
      const dxStart = a.startCanvasX - cPos.x;
      const dyStart = a.startCanvasY - cPos.y;
      const dxNow = cx - cPos.x;
      const dyNow = cy - cPos.y;
      const cosR = Math.cos(-a.startRotation);
      const sinR = Math.sin(-a.startRotation);
      // Local coords (in canvas pixels, rotated to tooth frame)
      const lxStart = dxStart * cosR - dyStart * sinR;
      const lyStart = dxStart * sinR + dyStart * cosR;
      const lxNow = dxNow * cosR - dyNow * sinR;
      const lyNow = dxNow * sinR + dyNow * cosR;

      // Starting handle position in canvas pixels (tooth-local)
      const startLocalX = a.type.endsWith('e') ? +a.startWidth * transform.scale / 2
                                               : -a.startWidth * transform.scale / 2;
      const startLocalY = a.type.startsWith('n') ? -a.startHeight * transform.scale / 2
                                                 : +a.startHeight * transform.scale / 2;
      // New half-widths/heights based on where the pointer is in tooth local
      let newHalfW = Math.abs(lxNow);
      let newHalfH = Math.abs(lyNow);
      // Enforce minimums (don't collapse tooth to zero)
      newHalfW = Math.max(newHalfW, 4);
      newHalfH = Math.max(newHalfH, 4);
      const newWidth  = (newHalfW * 2) / transform.scale;
      const newHeight = (newHalfH * 2) / transform.scale;

      // Holding Shift locks aspect ratio (proportional scale from the tooth's original aspect)
      let finalW = newWidth, finalH = newHeight;
      if (e.shiftKey) {
        const startAspect = a.startWidth / a.startHeight;
        // Use the larger change as the driver
        const widthChange = Math.abs(newWidth - a.startWidth);
        const heightChange = Math.abs(newHeight - a.startHeight);
        if (widthChange > heightChange) {
          finalH = newWidth / startAspect;
        } else {
          finalW = newHeight * startAspect;
        }
      }

      setTeeth(ts => ts.map(t => t.num === selectedTooth ?
        { ...t, width: finalW, height: finalH } : t));
      return;
    }

    if (curveDragIdx !== null && smileCurve) {
      const imgPt = canvasToImage(cx, cy);
      const keys = ['p0', 'p1', 'p2'];
      setSmileCurve(sc => ({ ...sc, [keys[curveDragIdx]]: imgPt }));
      return;
    }

    if (selectedTooth !== null && toothDragOffset) {
      const canvasTargetX = cx - toothDragOffset.dx;
      const canvasTargetY = cy - toothDragOffset.dy;
      const imgPt = canvasToImage(canvasTargetX, canvasTargetY);
      setTeeth(ts => ts.map(t => t.num === selectedTooth ? { ...t, cx: imgPt.x, cy: imgPt.y } : t));
      return;
    }
  };

  const handleMouseUp = () => {
    setCurveDragIdx(null);
    setToothDragOffset(null);
    setActiveHandle(null);
  };

  // Pulse animation loop — keeps ghost dots pulsing while placing the smile curve
  const [pulseTick, setPulseTick] = useState(0);
  const [placementBuffer, setPlacementBuffer] = useState([]);
  useEffect(() => {
    if (smileCurve || step !== 2) return;
    let raf;
    const loop = () => {
      setPulseTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [smileCurve, step]);

  // Mouse cursor style
  const cursor = useMemo(() => {
    if (step === 2 && !smileCurve) return 'crosshair';
    if (activeHandle) {
      if (activeHandle.type === 'rotate') return 'grabbing';
      // NW/SE diagonal vs NE/SW diagonal
      if (activeHandle.type === 'nw' || activeHandle.type === 'se') return 'nwse-resize';
      if (activeHandle.type === 'ne' || activeHandle.type === 'sw') return 'nesw-resize';
    }
    if (curveDragIdx !== null || toothDragOffset) return 'grabbing';
    return 'default';
  }, [step, smileCurve, curveDragIdx, toothDragOffset, activeHandle]);

  // ── Actions ───────────────────────────────────────────────────
  const resetSmileCurve = () => {
    setSmileCurve(null);
    setTeeth([]);
    setSelectedTooth(null);
    setStep(2);
    setPlacementBuffer([]);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setSelectedTooth(null);
    if (e.key === 'Delete' && selectedTooth !== null) {
      setTeeth(ts => ts.filter(t => t.num !== selectedTooth));
      setSelectedTooth(null);
    }
  }, [selectedTooth]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectedToothData = selectedTooth !== null ? teeth.find(t => t.num === selectedTooth) : null;

  // ── Render ────────────────────────────────────────────────────
  if (!activePatient) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.muted, flexDirection: "column", gap: 14, fontFamily: C.sans }}>
        <div style={{ fontSize: 64 }}>😊</div>
        <div style={{ fontSize: 20, color: C.ink, fontWeight: 700 }}>Select a patient to start Smile Creator</div>
        <div style={{ fontSize: 14 }}>Choose a patient on the Dashboard, then return here to design their new smile.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: C.sans, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: C.ink }}>
              Smile Creator
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
              {activePatient.name}{activePatient.teeth ? ` · ${activePatient.teeth}` : ''}
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: C.sans }}>
            {[
              { n: 1, label: "Photo" },
              { n: 2, label: "Smile Curve" },
              { n: 3, label: "Design" },
            ].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: step >= s.n ? C.teal : "transparent",
                  border: `1.5px solid ${step >= s.n ? C.teal : C.border}`,
                  color: step >= s.n ? "#fff" : C.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 11,
                  fontFamily: C.sans,
                }}>{step > s.n ? "✓" : s.n}</div>
                <span style={{ color: step === s.n ? C.ink : (step > s.n ? C.teal : C.muted), fontWeight: step === s.n ? 600 : 500 }}>{s.label}</span>
                {i < 2 && <span style={{ color: C.border, margin: "0 4px", fontSize: 10 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body: canvas + right panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas area */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", background: C.bg, overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            style={{ width: canvasDim.w, height: canvasDim.h, display: "block", cursor, touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
          {/* Placement progress dots (while clicking the 3 curve points) */}
          {step === 2 && placementBuffer.length > 0 && transform && (
            <div style={{ position: "absolute", top: 64, left: 20, padding: "10px 14px", background: C.surface, border: `1px solid ${C.tealBorder}`, borderRadius: 8, fontSize: 13, color: C.teal, fontFamily: C.font }}>
              {placementBuffer.length} of 3 points placed. Next: {['LEFT commissure','MIDLINE','RIGHT commissure'][placementBuffer.length]}
            </div>
          )}
          {/* Before/After toggle */}
          {teeth.length > 0 && (
            <button onClick={() => setShowBefore(!showBefore)}
              style={{
                position: "absolute", top: 18, right: 18,
                padding: "10px 18px",
                borderRadius: 20,
                background: "rgba(13, 27, 46, 0.82)",
                backdropFilter: "blur(10px)",
                color: "white",
                border: `1px solid ${showBefore ? C.amber : C.teal}`,
                fontSize: 12,
                fontFamily: C.sans,
                fontWeight: 600,
                letterSpacing: 0.3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 4, background: showBefore ? C.amber : C.teal, display: "inline-block" }}/>
              {showBefore ? "Before" : "After"}
            </button>
          )}
        </div>

        {/* Right control panel */}
        <div style={{ width: 320, borderLeft: `1px solid ${C.border}`, background: C.surface, overflow: "auto", padding: "18px", flexShrink: 0 }}>
          {/* STEP 1: photo selection */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Photo</div>
            {activePatient.id === 'carrie-pappas' ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { url: "retracted_full.jpg", label: "Retracted" },
                  { url: "retracted_labeled.jpg", label: "Retracted+" },
                  { url: "smile_full.jpg", label: "Smile" },
                  { url: "smile_with_ref_lines.jpg", label: "Smile+" },
                ].map(p => {
                  const url = `/patient-cases/carrie-photos/${p.url}`;
                  const isActive = photoUrl === url;
                  return (
                    <button key={p.url}
                      onClick={() => setPhotoUrl(url)}
                      style={{
                        padding: 0,
                        borderRadius: 8,
                        background: isActive ? C.tealDim : C.surface2,
                        border: `2px solid ${isActive ? C.teal : C.border}`,
                        cursor: "pointer",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.12s",
                        fontFamily: C.sans,
                      }}>
                      <div style={{ width: "100%", height: 58, backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}/>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? C.teal : C.ink, padding: "5px 2px" }}>{p.label}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <label style={{
                  display: "block",
                  padding: "12px",
                  borderRadius: 7,
                  background: C.surface2,
                  border: `1px dashed ${C.border}`,
                  color: C.ink,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "center",
                  fontFamily: C.sans,
                }}>
                  📷 Upload retracted smile photo
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => setPhotoUrl(reader.result);
                      reader.readAsDataURL(f);
                    }}/>
                </label>
              </div>
            )}
          </div>

          {/* STEP 2: smile curve */}
          {photoLoaded && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Smile Curve</div>
              {!smileCurve ? (
                <div style={{ padding: "11px 13px", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8, fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
                  Follow the pulsing dots on the photo. Click each in turn: left lip corner, midline, right lip corner.
                </div>
              ) : (
                <button onClick={resetSmileCurve}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, color: C.amber, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: C.sans }}>
                  ↺ Re-place smile curve
                </button>
              )}
            </div>
          )}

          {/* STEP 3: design */}
          {smileCurve && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Proportion</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(PROPORTIONS).map(([key, p]) => {
                    const isActive = proportion === key;
                    return (
                      <button key={key}
                        onClick={() => setProportion(key)}
                        style={{
                          padding: "10px 10px 8px",
                          borderRadius: 10,
                          background: isActive ? C.tealDim : C.surface2,
                          border: `1.5px solid ${isActive ? C.teal : C.border}`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.12s",
                          fontFamily: C.sans,
                        }}>
                        {/* Mini SVG preview of this proportion */}
                        <svg width="76" height="30" viewBox="0 0 76 30" style={{ display: "block" }}>
                          {p.widths.slice().reverse().concat(p.widths.slice(1)).map((w, i, arr) => {
                            const totalW = arr.reduce((a,b) => a+b, 0);
                            let cumOffset = 0;
                            for (let j = 0; j < i; j++) cumOffset += arr[j];
                            const xScale = 70 / totalW;
                            const xStart = 3 + cumOffset * xScale;
                            const width = w * xScale - 1;
                            const height = 22 * (0.8 + w * 0.2);
                            const y = 28 - height;
                            return (
                              <rect key={i} x={xStart} y={y} width={Math.max(width, 1)} height={height}
                                fill={isActive ? C.teal : 'rgba(192,212,234,0.5)'}
                                rx="1.5"/>
                            );
                          })}
                        </svg>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? C.teal : C.ink, textAlign: "center", lineHeight: 1.2 }}>
                          {p.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{PROPORTIONS[proportion].description}</div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Tooth Shape</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { id: "dannydesigner5", name: "Ovoid", subtitle: "Feminine", key: "ovoid" },
                    { id: "dannydesigner4", name: "Square", subtitle: "Masculine", key: "square" },
                    { id: "g01", name: "Balanced", subtitle: "Default", key: "balanced" },
                    { id: "g02", name: "Natural", subtitle: "Varied", key: "natural" },
                  ].map(lib => {
                    const isActive = library === lib.id;
                    // Line-drawing preview of the tooth shape
                    const shape = lib.key === 'ovoid' ? 'ovoid' : lib.key === 'square' ? 'square' : 'balanced';
                    return (
                      <button key={lib.id}
                        onClick={() => setLibrary(lib.id)}
                        style={{
                          padding: "10px 10px 8px",
                          borderRadius: 10,
                          background: isActive ? C.tealDim : C.surface2,
                          border: `1.5px solid ${isActive ? C.teal : C.border}`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.12s",
                          fontFamily: C.sans,
                        }}>
                        <svg width="40" height="44" viewBox="0 0 40 44">
                          {shape === 'ovoid' && <ellipse cx="20" cy="22" rx="13" ry="18" fill={isActive ? C.teal : 'rgba(192,212,234,0.45)'} />}
                          {shape === 'square' && <rect x="6" y="4" width="28" height="36" rx="4" fill={isActive ? C.teal : 'rgba(192,212,234,0.45)'} />}
                          {shape === 'balanced' && <path d="M 20 4 Q 32 4 33 18 Q 33 38 20 40 Q 7 38 7 18 Q 8 4 20 4 Z" fill={isActive ? C.teal : 'rgba(192,212,234,0.45)'} />}
                        </svg>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? C.teal : C.ink }}>{lib.name}</div>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5 }}>{lib.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Shade</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {["BL1","BL2","BL3","BL4","A1","A2","A3","A3.5"].map(s => {
                    const isActive = shade === s;
                    return (
                      <button key={s}
                        onClick={() => setShade(s)}
                        style={{
                          padding: "6px 4px",
                          borderRadius: 8,
                          background: isActive ? C.tealDim : C.surface2,
                          border: `1.5px solid ${isActive ? C.teal : C.border}`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.12s",
                          fontFamily: C.sans,
                        }}>
                        <div style={{ width: 24, height: 24, borderRadius: 12, background: SHADE_HEX[s], border: "1px solid rgba(0,0,0,0.15)", boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.1)" }}/>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.teal : C.ink }}>{s}</div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { /* expand to show more shades */ }}
                  style={{ marginTop: 6, width: "100%", padding: "6px", borderRadius: 6, background: "transparent", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: C.sans }}>
                  All shades ▾
                </button>
              </div>

              {/* Selected tooth info */}
              {selectedToothData && (
                <div style={{ marginBottom: 22, padding: "14px 14px 12px", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" }}>Selected</div>
                    <div style={{ fontSize: 18, color: C.teal, fontWeight: 700, fontFamily: C.font }}>#{selectedToothData.num}</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.ink, textTransform: "capitalize", marginBottom: 6 }}>{selectedToothData.type} incisor</div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.muted }}>
                    <span>W <span style={{ color: C.ink, fontFamily: C.font }}>{(selectedToothData.width / (transform?.scale || 1)).toFixed(0)}</span></span>
                    <span>H <span style={{ color: C.ink, fontFamily: C.font }}>{(selectedToothData.height / (transform?.scale || 1)).toFixed(0)}</span></span>
                    <span>∠ <span style={{ color: C.ink, fontFamily: C.font }}>{(selectedToothData.rotation * 180 / Math.PI).toFixed(0)}°</span></span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                    <div>• Drag body to <strong style={{color:C.ink}}>move</strong></div>
                    <div>• Drag <span style={{ color: C.teal, fontWeight: 700 }}>●</span> corner to <strong style={{color:C.ink}}>resize</strong> (hold <kbd style={{ padding: "1px 5px", background: C.surface2, borderRadius: 3, fontFamily: C.font, fontSize: 10, border: `1px solid ${C.border}`, color: C.ink }}>⇧</kbd> to keep ratio)</div>
                    <div>• Drag <span style={{ color: C.amber, fontWeight: 700 }}>●</span> top handle to <strong style={{color:C.ink}}>rotate</strong></div>
                    <div>• <kbd style={{ padding: "1px 5px", background: C.surface2, borderRadius: 3, fontFamily: C.font, fontSize: 10, border: `1px solid ${C.border}`, color: C.ink }}>DEL</kbd> removes tooth · <kbd style={{ padding: "1px 5px", background: C.surface2, borderRadius: 3, fontFamily: C.font, fontSize: 10, border: `1px solid ${C.border}`, color: C.ink }}>ESC</kbd> deselects</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}` }}>
                <button onClick={() => setShowPhoto(p => !p)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: C.sans }}>
                  {showPhoto ? "Hide photo" : "Show photo"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
