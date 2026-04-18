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
import TOOTH_SILHOUETTES from "./tooth-silhouettes.json";
import AutoPlaceSmileButton from "./AutoPlaceSmileButton";

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

// Map Universal tooth number → library filename.
// Library files 1..8 follow dental convention: 1=central incisor, 2=lateral,
// 3=canine, 4=1st premolar, 5=2nd premolar, 6=1st molar, 7=2nd molar, 8=3rd molar.
// For upper arch (#4-#13), distance from midline gives the file index.
function libraryFileForNumber(n) {
  const dist = n >= 9 ? n - 8 : 9 - n;  // 1..5 for #4-#13
  return `${dist}.stl`;
}

// Resolve the polygon silhouette for a tooth. Looks up the library pack for
// the given library id + tooth number. Falls back to a built-in generic
// outline if the library isn't available (e.g. still-loading or a hand-built
// shape pack without STL-derived silhouettes).
function resolveOutline(libraryId, toothNum, toothType) {
  const libSilhouettes = TOOTH_SILHOUETTES[libraryId];
  if (libSilhouettes) {
    const fileName = libraryFileForNumber(toothNum);
    if (libSilhouettes[fileName]) return libSilhouettes[fileName];
  }
  return TOOTH_OUTLINES[toothType];
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
  const [pulseTick, setPulseTick] = useState(0);
  const [placementBuffer, setPlacementBuffer] = useState([]);
  // Reference line overlays (DSD-style) — each stored as image-space coordinates
  // Midline = vertical line (x); horizontal lines = y position
  const [refLines, setRefLines] = useState({
    midline:        { enabled: false, x: null },    // vertical
    interpupillary: { enabled: false, y: null },    // horizontal (eyes)
    lipLine:        { enabled: false, y: null },    // horizontal (upper lip)
  });
  const [refLineDrag, setRefLineDrag] = useState(null);

  // Multi-photo design storage — each photo URL gets its own smile curve and
  // tooth placement, because landmarks shift between retracted / smiling /
  // labeled views. Switching photos preserves each design independently.
  // { [photoUrl]: { smileCurve, teeth } }
  const [designsByPhoto, setDesignsByPhoto] = useState({});

  // Helper to switch photos while preserving the current design under the
  // previous URL. If we've already designed something on the target photo,
  // restore it; otherwise start a fresh design.
  const switchPhoto = useCallback((newUrl) => {
    if (newUrl === photoUrl) return;
    setDesignsByPhoto(prev => {
      const snapshot = { ...prev };
      // Save current (only if meaningful to save — has curve or teeth)
      if (photoUrl && (smileCurve || teeth.length > 0)) {
        snapshot[photoUrl] = { smileCurve, teeth };
      }
      return snapshot;
    });
    // Load target's state if it exists, else reset
    const target = designsByPhoto[newUrl];
    if (target) {
      setSmileCurve(target.smileCurve || null);
      setTeeth(target.teeth || []);
      setStep(target.teeth?.length > 0 ? 3 : (target.smileCurve ? 3 : 2));
    } else {
      setSmileCurve(null);
      setTeeth([]);
      setStep(2);
    }
    setSelectedTooth(null);
    setPhotoUrl(newUrl);
  }, [photoUrl, smileCurve, teeth, designsByPhoto]);

  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);  // { kind, message }
  const [labEmail, setLabEmail] = useState(() => {
    try { return localStorage.getItem('restora-lab-email') || ''; } catch { return ''; }
  });
  const [labNotes, setLabNotes] = useState('');

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

    // Ghost guide: show where next click should land, based on typical smile photo framing.
    // Target is the INCISAL EDGES of the upper arch — same line the smile curve interpolates
    // through. For a standard retracted smile photo, canine tips sit ~38%/62% horizontally
    // and the incisal plane sits ~55% down (just above the lower lip). Matches the AI
    // auto-place landmarks (canine incisal edges, not commissures).
    if (!smileCurve && step === 2 && transform) {
      const imgW = transform.imgW;
      const imgH = transform.imgH;
      const imgOx = transform.offsetX;
      const imgOy = transform.offsetY;
      const ghostY = imgOy + imgH * 0.55;
      const ghosts = [
        { x: imgOx + imgW * 0.38, label: 'Pt R', caption: 'Patient right canine incisal edge (#6 tip)' },
        { x: imgOx + imgW * 0.50, label: 'M',    caption: 'Midline — between #8 and #9 incisal edges' },
        { x: imgOx + imgW * 0.62, label: 'Pt L', caption: 'Patient left canine incisal edge (#11 tip)' },
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

    // Draw reference lines (DSD-style overlays)
    if (transform) {
      const drawRefLine = (color, x1, y1, x2, y2, label) => {
        const a = imageToCanvas(x1, y1);
        const b = imageToCanvas(x2, y2);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = color;
        ctx.font = "bold 11px " + C.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, b.x + 6, b.y);
        // Drag handle dot at midpoint
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      };
      // Midline (vertical line through full image height)
      if (refLines.midline.enabled) {
        const mx = refLines.midline.x ?? photoDim.w / 2;
        drawRefLine('#f59e0b', mx, 0, mx, photoDim.h, 'Midline');
      }
      // Interpupillary (horizontal)
      if (refLines.interpupillary.enabled) {
        const ly = refLines.interpupillary.y ?? photoDim.h * 0.35;
        drawRefLine('#0abab5', 0, ly, photoDim.w, ly, 'Eyes');
      }
      // Lip line (horizontal)
      if (refLines.lipLine.enabled) {
        const ly = refLines.lipLine.y ?? photoDim.h * 0.55;
        drawRefLine('#ec4899', 0, ly, photoDim.w, ly, 'Lip line');
      }
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
          ctx.fillText(i === 1 ? 'M' : (i === 0 ? 'Pt R' : 'Pt L'), pt.x, pt.y);
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
        ctx.fillText(i === 1 ? 'M' : (i === 0 ? 'Pt R' : 'Pt L'), cp.x, cp.y);
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

        // Draw tooth outline (polygon) — library-specific when available
        let outline = resolveOutline(library, tooth.num, tooth.type);
        // Mirror horizontally for patient-LEFT teeth (#9-#13) so the mesial
        // surface (toward midline) sits on the correct side. Library files
        // are canonical for right-side; left-side needs X-flip.
        if (tooth.num >= 9) {
          outline = outline.map(([x, y]) => [-x, y]);
        }
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
  }, [canvasDim, transform, smileCurve, teeth, selectedTooth, shade, showPhoto, showBefore, step, placementBuffer, pulseTick, library, refLines]);

  // ── Mouse/touch handlers ──────────────────────────────────────
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;
    // Normalize into the canvasDim coordinate system used by the drawing code.
    // If the canvas's actual rendered size drifted from canvasDim (sub-pixel
    // rounding, flex layout settling, CSS zoom), this scale keeps click
    // coordinates and drawn coordinates in the same frame so dots land exactly
    // where the user tapped.
    const sx = rect.width  > 0 ? canvasDim.w / rect.width  : 1;
    const sy = rect.height > 0 ? canvasDim.h / rect.height : 1;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top)  * sy,
    };
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

    // Ref line drag (check before tooth handles — they're sparse and easy to hit)
    {
      const hitRefLine = (() => {
        // Vertical midline: click near the line's x
        if (refLines.midline.enabled) {
          const mx = refLines.midline.x ?? photoDim.w / 2;
          const cpos = imageToCanvas(mx, photoDim.h / 2);
          if (Math.abs(cx - cpos.x) < 10) return 'midline';
        }
        // Interpupillary horizontal
        if (refLines.interpupillary.enabled) {
          const ly = refLines.interpupillary.y ?? photoDim.h * 0.35;
          const cpos = imageToCanvas(photoDim.w / 2, ly);
          if (Math.abs(cy - cpos.y) < 10) return 'interpupillary';
        }
        // Lip line horizontal
        if (refLines.lipLine.enabled) {
          const ly = refLines.lipLine.y ?? photoDim.h * 0.55;
          const cpos = imageToCanvas(photoDim.w / 2, ly);
          if (Math.abs(cy - cpos.y) < 10) return 'lipLine';
        }
        return null;
      })();
      if (hitRefLine) {
        setRefLineDrag(hitRefLine);
        return;
      }
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

    // Drag a ref line
    if (refLineDrag) {
      const imgPt = canvasToImage(cx, cy);
      setRefLines(rl => {
        const next = { ...rl };
        if (refLineDrag === 'midline') {
          next.midline = { ...next.midline, x: Math.max(0, Math.min(photoDim.w, imgPt.x)) };
        } else if (refLineDrag === 'interpupillary') {
          next.interpupillary = { ...next.interpupillary, y: Math.max(0, Math.min(photoDim.h, imgPt.y)) };
        } else if (refLineDrag === 'lipLine') {
          next.lipLine = { ...next.lipLine, y: Math.max(0, Math.min(photoDim.h, imgPt.y)) };
        }
        return next;
      });
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
    setRefLineDrag(null);
  };

  // Pulse animation loop — keeps ghost dots pulsing while placing the smile curve
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

  // ── PNG export: side-by-side Before / After for patient consultation ──
  // Renders an offscreen 2400x1400 canvas at export time so we can control
  // the composition quality and add labels/metadata for the printed deliverable.
  const exportSideBySidePNG = useCallback(() => {
    if (!imageRef.current || !photoDim.w) return;

    // Output dimensions (fits standard letter landscape if printed)
    const OUT_W = 2400;
    const OUT_H = 1400;
    const HEADER_H = 150;
    const FOOTER_H = 80;
    const PAD = 40;
    const LABEL_H = 60;

    const panelW = (OUT_W - PAD * 3) / 2;
    const panelH = OUT_H - HEADER_H - FOOTER_H - LABEL_H - PAD * 2;

    const out = document.createElement('canvas');
    out.width = OUT_W;
    out.height = OUT_H;
    const ctx = out.getContext('2d');

    // Background
    ctx.fillStyle = '#0d1b2e';
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // Header strip
    ctx.fillStyle = '#132338';
    ctx.fillRect(0, 0, OUT_W, HEADER_H);
    ctx.strokeStyle = '#2a4060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H - 0.5);
    ctx.lineTo(OUT_W, HEADER_H - 0.5);
    ctx.stroke();

    // Patient name + case title (left side of header)
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(activePatient?.name || 'Patient', PAD, 36);

    ctx.fillStyle = '#e0ecf8';
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    const subtitle = [
      activePatient?.type,
      activePatient?.teeth,
    ].filter(Boolean).join(' · ');
    ctx.fillText(subtitle, PAD, 84);

    // Design parameters (right side of header)
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const libLabel = { dannydesigner5: 'Ovoid', dannydesigner4: 'Square', g01: 'Balanced', g02: 'Natural' }[library] || library;
    const propLabel = PROPORTIONS[proportion]?.label || proportion;
    ctx.fillStyle = '#c0d4ea';
    ctx.font = "15px 'DM Mono','JetBrains Mono',monospace";
    ctx.textAlign = 'right';
    ctx.fillText(`DESIGN · ${libLabel}`, OUT_W - PAD, 32);
    ctx.fillText(`SHADE · ${shade}`, OUT_W - PAD, 56);
    ctx.fillText(`PROPORTION · ${propLabel}`, OUT_W - PAD, 80);
    ctx.fillText(today.toUpperCase(), OUT_W - PAD, 108);

    // Restora brand (small, bottom-left corner of header)
    ctx.fillStyle = '#0abab5';
    ctx.font = "bold 15px 'DM Mono','JetBrains Mono',monospace";
    ctx.textAlign = 'left';
    ctx.fillText('RESTORA · SMILE DESIGN', PAD, 118);

    // Panel label strip
    const labelY = HEADER_H + PAD;
    // BEFORE label
    ctx.fillStyle = '#1a2f48';
    ctx.fillRect(PAD, labelY, panelW, LABEL_H);
    ctx.fillStyle = '#f59e0b';
    ctx.font = "bold 24px 'DM Mono','JetBrains Mono',monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BEFORE', PAD + panelW / 2, labelY + LABEL_H / 2);
    // AFTER label
    const afterX = PAD * 2 + panelW;
    ctx.fillStyle = '#0abab5';
    ctx.fillRect(afterX, labelY, panelW, LABEL_H);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('AFTER', afterX + panelW / 2, labelY + LABEL_H / 2);

    // Compute photo placement within each panel (fit preserving aspect)
    const photoY = labelY + LABEL_H + PAD / 2;
    const availableH = panelH - LABEL_H - PAD / 2;
    const imgAspect = photoDim.w / photoDim.h;
    const panelAspect = panelW / availableH;
    let drawW, drawH;
    if (imgAspect > panelAspect) {
      drawW = panelW;
      drawH = panelW / imgAspect;
    } else {
      drawH = availableH;
      drawW = availableH * imgAspect;
    }
    const beforeX = PAD + (panelW - drawW) / 2;
    const afterPhotoX = afterX + (panelW - drawW) / 2;
    const panelPhotoY = photoY + (availableH - drawH) / 2;

    // Draw BEFORE photo (just the photo)
    ctx.drawImage(imageRef.current, beforeX, panelPhotoY, drawW, drawH);

    // Draw AFTER: photo + teeth overlay
    ctx.drawImage(imageRef.current, afterPhotoX, panelPhotoY, drawW, drawH);

    // Paint teeth on the AFTER panel using the same relative coords as on screen
    // Image-space coords in `teeth` correspond to photoDim — scale to drawW/drawH
    const scale = drawW / photoDim.w;  // image pixels → panel pixels
    if (teeth.length > 0) {
      teeth.forEach(tooth => {
        ctx.save();
        const cx = afterPhotoX + tooth.cx * scale;
        const cy = panelPhotoY + tooth.cy * scale;
        const cW = tooth.width * scale;
        const cH = tooth.height * scale;
        ctx.translate(cx, cy);
        ctx.rotate(tooth.rotation);

        // Outline
        let outline = resolveOutline(library, tooth.num, tooth.type);
        if (tooth.num >= 9) outline = outline.map(([x, y]) => [-x, y]);
        const shadeColor = SHADE_HEX[shade] || "#f5ead0";
        ctx.beginPath();
        outline.forEach((pt, i) => {
          const x = pt[0] * cW;
          const y = pt[1] * cH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = shadeColor + 'e6';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });
    }

    // Footer disclaimer
    ctx.fillStyle = '#213858';
    ctx.fillRect(0, OUT_H - FOOTER_H, OUT_W, FOOTER_H);
    ctx.fillStyle = '#c0d4ea';
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Simulated smile visualization for consultation purposes. Final restoration shape and shade are determined by the dental laboratory.',
      OUT_W / 2, OUT_H - FOOTER_H / 2
    );

    // Build the composition and return blob + filename (caller chooses destination)
    return new Promise((resolve) => {
      out.toBlob((blob) => {
        const patientSlug = (activePatient?.name || 'patient').toLowerCase().replace(/\s+/g, '-');
        const dateSlug = new Date().toISOString().slice(0, 10);
        resolve({ blob, filename: `smile-design-${patientSlug}-${dateSlug}.png` });
      }, 'image/png');
    });
  }, [activePatient, library, proportion, shade, teeth, photoDim]);

  // Build lab handoff JSON — everything needed for the lab to reconstruct the
  // design in their CAD software (exocad / 3Shape / DentalWings).
  const buildLabPackage = useCallback(() => {
    return {
      format: "restora-smile-design",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      patient: {
        id: activePatient?.id || null,
        name: activePatient?.name || null,
        caseType: activePatient?.type || null,
        toothRange: activePatient?.teeth || null,
      },
      design: {
        library: library,
        libraryLabel: { dannydesigner5: 'Ovoid', dannydesigner4: 'Square', g01: 'Balanced', g02: 'Natural' }[library],
        shade: shade,
        proportion: proportion,
        proportionLabel: PROPORTIONS[proportion]?.label,
        proportionWidths: PROPORTIONS[proportion]?.widths,
        wlRatio: PROPORTIONS[proportion]?.wlRatio,
      },
      photoCalibration: {
        sourceUrl: photoUrl,
        photoDimensionsPx: { width: photoDim.w, height: photoDim.h },
        smileCurve: smileCurve ? {
          leftCommissure: { x: smileCurve.p0.x, y: smileCurve.p0.y },
          midline:        { x: smileCurve.p1.x, y: smileCurve.p1.y },
          rightCommissure:{ x: smileCurve.p2.x, y: smileCurve.p2.y },
          // Arc length in photo pixels — useful for lab to estimate real-world
          // scale if they know the patient's intercanine or intercommissural distance
          arcLengthPx: curveArcLength(smileCurve.p0, smileCurve.p1, smileCurve.p2),
        } : null,
      },
      teeth: teeth.map(t => ({
        number: t.num,                      // Universal numbering (#4-#13)
        type: t.type,                       // central | lateral | canine | premolar
        libraryFile: libraryFileForNumber(t.num),  // e.g. "1.stl"
        mirrored: t.num >= 9,               // left-side teeth are X-mirrored
        positionPx: { x: t.cx, y: t.cy },   // center in photo-pixel coords
        widthPx: t.width,
        heightPx: t.height,
        rotationRad: t.rotation,
      })),
      notes: labNotes || null,
    };
  }, [activePatient, library, shade, proportion, photoUrl, photoDim, smileCurve, teeth, labNotes]);

  // Helper: trigger a file download from a blob
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  // ── Destination handlers ──────────────────────────────────────────
  // Each returns a promise that resolves when the action completes.

  const destinationDownload = async () => {
    const { blob, filename } = await exportSideBySidePNG();
    if (!blob) throw new Error("PNG generation failed");
    downloadBlob(blob, filename);
    setExportStatus({ kind: 'success', message: `Downloaded ${filename}` });
  };

  const destinationPrinter = async () => {
    const { blob } = await exportSideBySidePNG();
    if (!blob) throw new Error("PNG generation failed");
    // Open PNG in a new window and invoke print dialog
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      setExportStatus({ kind: 'error', message: 'Popup blocked — allow popups to print' });
      return;
    }
    win.addEventListener('load', () => {
      try { win.print(); } catch {}
    }, { once: true });
    setExportStatus({ kind: 'success', message: 'Opened in new tab for printing' });
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const destinationLab = async () => {
    if (!labEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(labEmail)) {
      setExportStatus({ kind: 'error', message: 'Enter a valid lab email first' });
      return;
    }
    try { localStorage.setItem('restora-lab-email', labEmail); } catch {}

    // Build assets
    const { blob: pngBlob, filename: pngName } = await exportSideBySidePNG();
    if (!pngBlob) {
      setExportStatus({ kind: 'error', message: 'Failed to generate PNG' });
      return;
    }
    const patientSlug = (activePatient?.name || 'patient').toLowerCase().replace(/\s+/g, '-');
    const dateSlug = new Date().toISOString().slice(0, 10);
    const jsonName = `lab-handoff-${patientSlug}-${dateSlug}.json`;
    const labPackage = buildLabPackage();
    const jsonString = JSON.stringify(labPackage, null, 2);

    const subject = `Smile design — ${activePatient?.name || 'patient'} (${activePatient?.teeth || ''})`;
    const libLabel = { dannydesigner5: 'Ovoid', dannydesigner4: 'Square', g01: 'Balanced', g02: 'Natural' }[library] || library;
    const bodyText = [
      `Attached: smile design visualization (PNG) and lab handoff package (JSON).`,
      ``,
      `Patient: ${activePatient?.name || ''}`,
      `Case: ${activePatient?.type || ''} · ${activePatient?.teeth || ''}`,
      ``,
      `Design parameters:`,
      `  Library: ${libLabel}`,
      `  Shade: ${shade}`,
      `  Proportion: ${PROPORTIONS[proportion]?.label || proportion}`,
      ``,
      ...(labNotes ? [`Notes: ${labNotes}`, ``] : []),
      `Please confirm receipt and turnaround estimate.`,
      `—`,
      `Sent from Restora`,
    ].join('\n');

    // Primary path: call /api/send-to-lab to send via Resend
    setExportStatus({ kind: 'info', message: 'Sending to lab…' });
    try {
      // Convert PNG blob to base64
      const pngBase64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(',')[1]);
        r.onerror = () => reject(new Error('Failed to read PNG'));
        r.readAsDataURL(pngBlob);
      });

      const resp = await fetch('/api/send-to-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: labEmail,
          subject,
          bodyText,
          pngBase64,
          pngFilename: pngName,
          jsonPayload: labPackage,
          jsonFilename: jsonName,
        }),
      });
      const result = await resp.json();

      if (resp.ok && result.ok) {
        setExportStatus({
          kind: 'success',
          message: `Email sent to ${labEmail} with both files attached.`,
        });
        return;
      }

      // Fall through to mailto fallback on server error (no API key, quota, etc.)
      if (result.code === 'NO_API_KEY') {
        // Expected — backend isn't configured. Fall back silently.
      } else {
        console.warn('send-to-lab error:', result);
      }
    } catch (err) {
      console.warn('send-to-lab network error:', err);
      // fall through to mailto
    }

    // Fallback path: download both files + open mailto draft
    downloadBlob(pngBlob, pngName);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    setTimeout(() => downloadBlob(jsonBlob, jsonName), 200);

    const mailtoA = document.createElement('a');
    mailtoA.href = `mailto:${labEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    document.body.appendChild(mailtoA);
    mailtoA.click();
    document.body.removeChild(mailtoA);

    setExportStatus({
      kind: 'success',
      message: `Files downloaded · Email draft opened · Attach the 2 files and hit Send.`,
    });
  };

  const destinationClipboard = async () => {
    try {
      const { blob } = await exportSideBySidePNG();
      if (!blob) throw new Error("PNG generation failed");
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("Clipboard API not supported in this browser");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setExportStatus({ kind: 'success', message: 'PNG copied — paste anywhere (⌘V / Ctrl+V)' });
    } catch (err) {
      setExportStatus({ kind: 'error', message: err.message || 'Copy failed' });
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (exportOpen) { setExportOpen(false); return; }
      setSelectedTooth(null);
    }
    if (e.key === 'Delete' && selectedTooth !== null) {
      setTeeth(ts => ts.filter(t => t.num !== selectedTooth));
      setSelectedTooth(null);
    }
    // Cmd/Ctrl+E → open Export dialog (only when there's something to export)
    if ((e.metaKey || e.ctrlKey) && e.key === 'e' && teeth.length > 0) {
      e.preventDefault();
      setExportStatus(null);
      setExportOpen(true);
    }
  }, [selectedTooth, teeth.length, exportOpen]);

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
              {placementBuffer.length} of 3 points placed. Next: {['Patient RIGHT commissure (viewer left)','MIDLINE','Patient LEFT commissure (viewer right)'][placementBuffer.length]}
            </div>
          )}
          {/* Canvas overlay buttons (top right) */}
          {teeth.length > 0 && (
            <div style={{ position: "absolute", top: 18, right: 18, display: "flex", gap: 8 }}>
              <button onClick={() => { setExportStatus(null); setExportOpen(true); }}
                title="Export this design — download, send to lab, print, or copy"
                style={{
                  padding: "10px 18px",
                  borderRadius: 20,
                  background: C.teal,
                  color: "white",
                  border: "none",
                  fontSize: 12,
                  fontFamily: C.sans,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  boxShadow: `0 3px 14px ${C.teal}60`,
                }}>
                ⬆ Export
              </button>
              <button onClick={() => setShowBefore(!showBefore)}
                style={{
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
            </div>
          )}

          {/* Export dialog — modal overlay on canvas */}
          {exportOpen && (
            <div
              onClick={() => setExportOpen(false)}
              style={{
                position: "absolute", inset: 0, zIndex: 20,
                background: "rgba(5, 12, 24, 0.72)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeIn 0.15s ease-out",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 480, maxWidth: "calc(100% - 40px)",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  boxShadow: "0 24px 64px rgba(0,0,0,.5)",
                  overflow: "hidden",
                  fontFamily: C.sans,
                }}>
                {/* Header */}
                <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Export Design</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{activePatient?.name} · {teeth.length} teeth</div>
                  </div>
                  <button onClick={() => setExportOpen(false)}
                    style={{ background: "transparent", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
                </div>

                {/* Destination options */}
                <div style={{ padding: "14px 16px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    {
                      id: 'download',
                      icon: '⬇',
                      title: 'Download PNG',
                      desc: 'Save Before/After image to your device',
                      color: C.teal,
                      onClick: destinationDownload,
                    },
                    {
                      id: 'lab',
                      icon: '✉',
                      title: 'Send to Lab',
                      desc: 'Email with PNG + lab handoff JSON attached',
                      color: C.purple,
                      onClick: destinationLab,
                      requires: 'email',
                    },
                    {
                      id: 'print',
                      icon: '🖨',
                      title: 'Send to Printer',
                      desc: 'Open print dialog for patient hand-off copy',
                      color: C.amber,
                      onClick: destinationPrinter,
                    },
                    {
                      id: 'copy',
                      icon: '⎘',
                      title: 'Copy to Clipboard',
                      desc: 'Paste into Slack, email, or any app',
                      color: C.green,
                      onClick: destinationClipboard,
                    },
                  ].map(opt => (
                    <button key={opt.id}
                      onClick={async () => {
                        try {
                          await opt.onClick();
                        } catch (err) {
                          setExportStatus({ kind: 'error', message: err.message || 'Something went wrong' });
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 14px",
                        borderRadius: 10,
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        color: C.ink,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: C.sans,
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.background = C.surface3; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface2; }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: opt.color + '22', color: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {opt.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{opt.desc}</div>
                      </div>
                      <div style={{ color: C.muted, fontSize: 18 }}>›</div>
                    </button>
                  ))}
                </div>

                {/* Lab email + notes (only relevant for Send to Lab) */}
                <div style={{ padding: "8px 16px 14px" }}>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", margin: "6px 2px 8px" }}>Lab details (for ✉ Send to Lab)</div>
                  <input
                    type="email"
                    placeholder="lab@yourdentallab.com"
                    value={labEmail}
                    onChange={(e) => setLabEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 7,
                      border: `1px solid ${C.border}`, background: C.surface2, color: C.ink,
                      fontSize: 13, fontFamily: C.sans, outline: "none", marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  <textarea
                    placeholder="Notes for the lab (optional) — e.g. target insertion date, specific concerns, antagonist details"
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 7,
                      border: `1px solid ${C.border}`, background: C.surface2, color: C.ink,
                      fontSize: 13, fontFamily: C.sans, outline: "none", resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Status message */}
                {exportStatus && (
                  <div style={{
                    padding: "12px 18px",
                    borderTop: `1px solid ${C.borderSoft}`,
                    background: exportStatus.kind === 'error' ? C.red + "15" : exportStatus.kind === 'info' ? C.amber + "15" : C.teal + "12",
                    color: exportStatus.kind === 'error' ? C.red : exportStatus.kind === 'info' ? C.amber : C.teal,
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {exportStatus.kind === 'error' ? '⚠ ' : exportStatus.kind === 'info' ? '⋯ ' : '✓ '}{exportStatus.message}
                  </div>
                )}
              </div>
            </div>
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
                      onClick={() => switchPhoto(url)}
                      style={{
                        padding: 0,
                        borderRadius: 8,
                        background: isActive ? C.tealDim : C.surface2,
                        border: `2px solid ${isActive ? C.teal : C.border}`,
                        cursor: "pointer",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        transition: "all 0.12s",
                        fontFamily: C.sans,
                      }}>
                      {/* Show a small dot if this photo has a saved design */}
                      {designsByPhoto[url]?.teeth?.length > 0 && !isActive && (
                        <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, background: C.teal, boxShadow: `0 0 0 1.5px ${C.surface}` }}
                          title="Design saved on this photo" />
                      )}
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
                <>
                  <div style={{ marginBottom: 10 }}>
                    <AutoPlaceSmileButton
                      imageUrl={photoUrl}
                      imageWidth={photoDim.w}
                      imageHeight={photoDim.h}
                      disabled={!photoUrl}
                      onLandmarks={(curve, landmarks) => {
                        // Use the canine incisal edges as anchors. API indexing:
                        //   curve[0] = canine_R (patient's right = viewer's left)
                        //   curve[5] = canine_L (patient's left  = viewer's right)
                        // SmileCreator convention: p0 = viewer-left (t=0), p2 = viewer-right (t=1)
                        const p0 = (curve && curve[0]) || (landmarks && landmarks.right_commissure);
                        const p2 = (curve && curve[5]) || (landmarks && landmarks.left_commissure);
                        const cR = curve && curve[2];
                        const cL = curve && curve[3];
                        const p1 = (cR && cL)
                          ? { x: (cR.x + cL.x) / 2, y: (cR.y + cL.y) / 2 }
                          : { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
                        if (!p0 || !p2) return;
                        setSmileCurve({ p0, p1, p2 });
                        setPlacementBuffer([]);
                      }}
                    />
                  </div>
                  <div style={{ padding: "11px 13px", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8, fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
                    Or follow the pulsing dots on the photo. Click each in turn: left lip corner, midline, right lip corner.
                  </div>
                </>
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
                    { id: "dannydesigner5", name: "Ovoid", subtitle: "Feminine" },
                    { id: "dannydesigner4", name: "Square", subtitle: "Masculine" },
                    { id: "g01", name: "Balanced", subtitle: "Default" },
                    { id: "g02", name: "Natural", subtitle: "Varied" },
                  ].map(lib => {
                    const isActive = library === lib.id;
                    // Real extracted silhouette (central incisor = file 1.stl) previewed as SVG path
                    const silhouette = TOOTH_SILHOUETTES[lib.id]?.["1.stl"];
                    const svgPath = silhouette ? silhouette.map((p, i) => {
                      // Scale the [-0.5,0.5] silhouette to 40x44 SVG, Y flipped (SVG Y down = tooth incisal up)
                      const x = 20 + p[0] * 30;
                      const y = 22 + p[1] * 36;
                      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ') + ' Z' : null;
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
                          {svgPath ? (
                            <path d={svgPath}
                                  fill={isActive ? C.teal : 'rgba(192,212,234,0.45)'}
                                  stroke={isActive ? C.teal : 'rgba(192,212,234,0.3)'}
                                  strokeWidth="0.5"/>
                          ) : (
                            <ellipse cx="20" cy="22" rx="13" ry="18"
                                     fill={isActive ? C.teal : 'rgba(192,212,234,0.45)'} />
                          )}
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

              {/* Reference lines (DSD-style) */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>Reference Lines</div>
                {[
                  { key: 'midline',        label: 'Facial midline',     color: '#f59e0b' },
                  { key: 'interpupillary', label: 'Interpupillary line', color: '#0abab5' },
                  { key: 'lipLine',        label: 'Upper lip line',     color: '#ec4899' },
                ].map(opt => {
                  const isOn = refLines[opt.key].enabled;
                  return (
                    <button key={opt.key}
                      onClick={() => setRefLines(rl => ({ ...rl, [opt.key]: { ...rl[opt.key], enabled: !rl[opt.key].enabled } }))}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", marginBottom: 6, borderRadius: 8,
                        background: isOn ? C.tealDim : C.surface2,
                        border: `1px solid ${isOn ? opt.color + '60' : C.border}`,
                        color: isOn ? C.ink : C.muted,
                        fontSize: 12, fontFamily: C.sans, cursor: "pointer",
                        transition: "all 0.12s",
                      }}>
                      <span style={{ width: 14, height: 2, background: opt.color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: "left" }}>{opt.label}</span>
                      <span style={{ fontSize: 10, color: isOn ? opt.color : C.muted, fontFamily: C.font, letterSpacing: 0.5 }}>
                        {isOn ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
                  Drag the white dot on each line to fine-tune position.
                </div>
              </div>

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
