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

    // If no smile curve yet, show placement instructions
    if (!smileCurve && step === 2 && transform) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 186, 181, 0.92)';
      ctx.fillRect(transform.offsetX, transform.offsetY, transform.imgW, 44);
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 15px system-ui";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click 3 points to place the smile curve: LEFT commissure → MIDLINE (center) → RIGHT commissure', transform.offsetX + transform.imgW / 2, transform.offsetY + 22);
      ctx.restore();
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

        ctx.restore();
      });
    }
  }, [canvasDim, transform, smileCurve, teeth, selectedTooth, shade, showPhoto, showBefore, step, placementBuffer]);

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

    // Drag existing smile curve control point
    const curveIdx = hitTestCurvePoints(cx, cy);
    if (curveIdx >= 0) {
      setCurveDragIdx(curveIdx);
      return;
    }

    // Hit test teeth
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
  };

  // Placement buffer for 3-click smile curve placement
  const [placementBuffer, setPlacementBuffer] = useState([]);

  // Mouse cursor style
  const cursor = useMemo(() => {
    if (step === 2 && !smileCurve) return 'crosshair';
    if (curveDragIdx !== null || toothDragOffset) return 'grabbing';
    return 'default';
  }, [step, smileCurve, curveDragIdx, toothDragOffset]);

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
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: C.ink }}>
              Smile Creator <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 4, background: C.tealDim, color: C.teal, fontFamily: C.font, marginLeft: 8, letterSpacing: 1, fontWeight: 700, verticalAlign: "middle" }}>2D</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              {activePatient.name} · {activePatient.type || 'Case'}{activePatient.teeth ? ` · ${activePatient.teeth}` : ''}
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: C.font, letterSpacing: 1 }}>
            {[
              { n: 1, label: "PHOTO" },
              { n: 2, label: "SMILE CURVE" },
              { n: 3, label: "DESIGN" },
            ].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: step >= s.n ? C.teal : C.surface2,
                  border: `1px solid ${step >= s.n ? C.teal : C.border}`,
                  color: step >= s.n ? "#fff" : C.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 12,
                }}>{s.n}</div>
                <span style={{ color: step >= s.n ? C.teal : C.muted, fontWeight: step === s.n ? 700 : 500 }}>{s.label}</span>
                {i < 2 && <span style={{ color: C.border, margin: "0 4px" }}>→</span>}
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
                borderRadius: 8,
                background: showBefore ? C.amber : C.teal,
                color: "white",
                border: "none",
                fontSize: 13,
                fontFamily: C.font,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
                boxShadow: `0 4px 14px ${showBefore ? C.amber + "60" : C.teal + "60"}`,
              }}
            >{showBefore ? "● BEFORE" : "○ AFTER (design)"}</button>
          )}
        </div>

        {/* Right control panel */}
        <div style={{ width: 320, borderLeft: `1px solid ${C.border}`, background: C.surface, overflow: "auto", padding: "18px", flexShrink: 0 }}>
          {/* STEP 1: photo selection */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PATIENT PHOTO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { url: "retracted_full.jpg", label: "Retracted — full" },
                { url: "retracted_labeled.jpg", label: "Retracted — labeled" },
                { url: "smile_full.jpg", label: "Smile — full" },
                { url: "smile_with_ref_lines.jpg", label: "Smile + references" },
              ].map(p => {
                const url = `/patient-cases/carrie-photos/${p.url}`;
                const isActive = photoUrl === url;
                return (
                  <button key={p.url}
                    onClick={() => setPhotoUrl(url)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 7,
                      background: isActive ? C.tealDim : C.surface2,
                      border: `1px solid ${isActive ? C.tealBorder : C.border}`,
                      color: isActive ? C.teal : C.ink,
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: C.sans,
                    }}>
                    {isActive && "● "}{p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: smile curve */}
          {photoLoaded && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>SMILE CURVE</div>
              {!smileCurve ? (
                <div style={{ padding: "10px 12px", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 7, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                  Click 3 points on the photo:<br/>
                  1. Left commissure (corner of lips)<br/>
                  2. Midline (between central incisors)<br/>
                  3. Right commissure
                </div>
              ) : (
                <button onClick={resetSmileCurve}
                  style={{ width: "100%", padding: "10px", borderRadius: 7, background: C.surface2, border: `1px solid ${C.border}`, color: C.amber, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: C.sans }}>
                  ↺ Re-place smile curve
                </button>
              )}
            </div>
          )}

          {/* STEP 3: design */}
          {smileCurve && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>PROPORTION</div>
                <select value={proportion} onChange={e => setProportion(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, color: C.ink, fontSize: 14, fontFamily: C.sans, outline: "none" }}>
                  {Object.entries(PROPORTIONS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{PROPORTIONS[proportion].description}</div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>LIBRARY (tooth shapes)</div>
                <select value={library} onChange={e => setLibrary(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, color: C.ink, fontSize: 14, fontFamily: C.sans, outline: "none" }}>
                  <option value="dannydesigner5">Danny Designer 5 (ovoid)</option>
                  <option value="dannydesigner4">Danny Designer 4 (square)</option>
                  <option value="g01">G01 Aesthetic</option>
                  <option value="g02">G02 Aesthetic</option>
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.4 }}>Commit 2 will add library-specific 2D silhouettes. Currently uses generic anatomic outlines.</div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>SHADE</div>
                <select value={shade} onChange={e => setShade(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, color: C.ink, fontSize: 14, fontFamily: C.sans, outline: "none" }}>
                  {Object.keys(SHADE_HEX).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: SHADE_HEX[shade], border: `1px solid ${C.border}` }}/>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>{SHADE_HEX[shade].toUpperCase()}</span>
                </div>
              </div>

              {/* Selected tooth info */}
              {selectedToothData && (
                <div style={{ marginBottom: 22, padding: "12px", background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontFamily: C.font, color: C.teal, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>TOOTH #{selectedToothData.num}</div>
                  <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.7 }}>
                    <div>Type: <strong>{selectedToothData.type}</strong></div>
                    <div>Width: <strong>{(selectedToothData.width / transform?.scale).toFixed(1)}px</strong></div>
                    <div>Height: <strong>{(selectedToothData.height / transform?.scale).toFixed(1)}px</strong></div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                    Drag on canvas to move.<br/>Commit 2: resize + rotate handles.<br/>Press DEL to remove.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}` }}>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
                  ℹ️ This is Commit 1 — foundation. Click tooth to select/drag. Upcoming:<br/>
                  • Resize + rotate handles (Commit 2)<br/>
                  • Library-specific silhouettes (Commit 3)<br/>
                  • Export PNG + lab package (Commit 4)
                </div>
                <button onClick={() => setShowPhoto(p => !p)}
                  style={{ width: "100%", padding: "9px", borderRadius: 6, background: C.surface2, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: C.sans, marginBottom: 8 }}>
                  {showPhoto ? "Hide" : "Show"} patient photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
