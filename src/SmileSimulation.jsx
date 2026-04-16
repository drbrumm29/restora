import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.15)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669",
  purple:"#7c3aed", gold:"#b8860b",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// Tooth shade color map (rough approximation of VITA + bleach shades)
const SHADES = {
  "BL1": "#fdfcf7", "BL2": "#fbf9f0", "BL3": "#f9f5e8", "BL4": "#f7f1df",
  "A1":  "#f5ead0", "A2":  "#f0e0b8", "A3":  "#e8d4a0", "A3.5":"#e0c888", "A4":"#d4b870",
  "B1":  "#f8ecd0", "B2":  "#f2deb8", "B3":  "#eacfa0",
  "C1":  "#e8d8b8", "C2":  "#ddc8a0",
  "D2":  "#eedac0",
};

const FACE_REFS = {
  "pupillary":       { label: "Pupillary line",       desc: "Horizontal reference — eyes" },
  "commissure":      { label: "Commissure line",      desc: "Mouth corner reference" },
  "incisal-edge":    { label: "Incisal edge plane",   desc: "Target incisal position" },
  "midline":         { label: "Facial midline",       desc: "Vertical facial reference" },
};

export default function SmileSimulation({ activePatient }) {
  const [photo, setPhoto] = useState(null);   // { url, w, h }
  const [teethWidth, setTeethWidth] = useState(78);  // % W:L ratio
  const [lengthAdj, setLengthAdj] = useState(0);     // mm
  const [shade, setShade] = useState("BL2");
  const [toothForm, setToothForm] = useState("ovoid");
  const [smileArc, setSmileArc] = useState(true);
  const [showRefs, setShowRefs] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.95);
  const [overlay, setOverlay] = useState({
    x: 50, y: 55, width: 30, height: 7,
    rotation: 0,
  });
  const [draggingOverlay, setDraggingOverlay] = useState(false);
  const canvasRef = useRef(null);
  const photoInputRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-load Carrie's smile photo if available
  useEffect(() => {
    if (!activePatient?.photos) return;
    const smilePhoto = activePatient.photos.find(p => p.type === "smile") || activePatient.photos[0];
    if (smilePhoto) {
      const img = new Image();
      img.onload = () => setPhoto({ url: img.src, w: img.naturalWidth, h: img.naturalHeight });
      img.src = `/patient-cases/${smilePhoto.file}`;
    }
  }, [activePatient]);

  // Apply AEP parameters from patient
  useEffect(() => {
    if (!activePatient?.parameters) return;
    const p = activePatient.parameters;
    if (p.width_length_ratio) setTeethWidth(Math.round(p.width_length_ratio * 100));
    if (p.length_adjustment_mm != null) setLengthAdj(p.length_adjustment_mm);
    if (p.shade) {
      const s = p.shade.split(/[\s,]/)[0].replace(/[^A-Z0-9.]/gi,'');
      if (SHADES[s]) setShade(s);
    }
    if (p.tooth_form) setToothForm(p.tooth_form);
  }, [activePatient]);

  function handlePhotoUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => setPhoto({ url: e.target.result, w: img.naturalWidth, h: img.naturalHeight });
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Draw teeth overlay on canvas
  useEffect(() => {
    if (!photo || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { w, h } = { w: canvas.width, h: canvas.height };
    ctx.clearRect(0, 0, w, h);

    const cx = (overlay.x/100) * w;
    const cy = (overlay.y/100) * h;
    const width = (overlay.width/100) * w;
    // Height derived from width + W:L ratio (youthful ~80%, golden ~78%)
    const baseHeight = width / (teethWidth/100) / 6; // divided by ~6 teeth
    const height = baseHeight + lengthAdj * 3; // 3px per mm roughly

    ctx.save();
    ctx.globalAlpha = overlayOpacity;
    ctx.translate(cx, cy);
    ctx.rotate(overlay.rotation * Math.PI / 180);

    // Draw 6 anterior teeth as smile design
    const teethCount = 6;
    const toothWidth = width / teethCount;
    const shadeColor = SHADES[shade] || SHADES["BL2"];

    for (let i = 0; i < teethCount; i++) {
      const tx = -width/2 + i*toothWidth + toothWidth/2;
      const isCenter = i === 2 || i === 3;    // centrals
      const isLateral = i === 1 || i === 4;   // laterals
      // Laterals 0.5mm coronal (higher on canvas = shorter visible)
      const yOffset = isLateral ? 2 : 0;
      // Smile arc — incisal edges follow a curve
      const arcY = smileArc ? Math.pow((i - 2.5), 2) * 0.8 : 0;
      const y = -height/2 + yOffset + arcY;

      // Canine/lateral slightly narrower
      const w_adj = isCenter ? toothWidth : (isLateral ? toothWidth*0.85 : toothWidth*0.9);

      // Tooth shape based on form
      ctx.beginPath();
      if (toothForm === "square") {
        // Square — sharp corners, wider
        ctx.rect(tx - w_adj/2, y, w_adj, height);
      } else if (toothForm === "triangular") {
        ctx.moveTo(tx - w_adj/2, y);
        ctx.lineTo(tx + w_adj/2, y);
        ctx.lineTo(tx + w_adj/3, y + height);
        ctx.lineTo(tx - w_adj/3, y + height);
        ctx.closePath();
      } else if (toothForm === "ovoid") {
        // Ovoid — rounded, softer
        const r = w_adj * 0.18;
        ctx.moveTo(tx - w_adj/2 + r, y);
        ctx.lineTo(tx + w_adj/2 - r, y);
        ctx.quadraticCurveTo(tx + w_adj/2, y, tx + w_adj/2, y + r);
        ctx.lineTo(tx + w_adj/2, y + height - r*1.5);
        ctx.quadraticCurveTo(tx + w_adj/2.3, y + height, tx, y + height);
        ctx.quadraticCurveTo(tx - w_adj/2.3, y + height, tx - w_adj/2, y + height - r*1.5);
        ctx.lineTo(tx - w_adj/2, y + r);
        ctx.quadraticCurveTo(tx - w_adj/2, y, tx - w_adj/2 + r, y);
        ctx.closePath();
      } else {
        // square-tapering
        ctx.moveTo(tx - w_adj/2, y);
        ctx.lineTo(tx + w_adj/2, y);
        ctx.lineTo(tx + w_adj/2.4, y + height);
        ctx.lineTo(tx - w_adj/2.4, y + height);
        ctx.closePath();
      }

      // Gradient fill for realistic tooth shading
      const grad = ctx.createLinearGradient(tx, y, tx, y + height);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, shadeColor);
      grad.addColorStop(0.75, shadeColor);
      grad.addColorStop(1, shadeColor + "dd");
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle outline
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Incisal edge highlight
      ctx.beginPath();
      ctx.moveTo(tx - w_adj/2.4, y + height - 2);
      ctx.lineTo(tx + w_adj/2.4, y + height - 2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // Face reference lines
    if (showRefs) {
      ctx.strokeStyle = "rgba(10,186,181,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      // Midline
      ctx.beginPath();
      ctx.moveTo(w/2, 0);
      ctx.lineTo(w/2, h);
      ctx.stroke();
      // Incisal plane
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [photo, overlay, teethWidth, lengthAdj, shade, toothForm, smileArc, showRefs, overlayOpacity]);

  // Setup canvas
  useEffect(() => {
    if (!photo || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const setSize = () => {
      const cw = container.clientWidth, ch = container.clientHeight;
      const aspectImage = photo.w / photo.h;
      const aspectContainer = cw / ch;
      if (aspectImage > aspectContainer) {
        canvas.width = cw;
        canvas.height = cw / aspectImage;
      } else {
        canvas.height = ch;
        canvas.width = ch * aspectImage;
      }
      // force redraw
      setOverlay(o => ({...o}));
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [photo]);

  function onCanvasPointerDown(e) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const px = (t.clientX - rect.left) / rect.width * 100;
    const py = (t.clientY - rect.top) / rect.height * 100;
    const dx = px - overlay.x;
    const dy = py - overlay.y;
    if (Math.abs(dx) < overlay.width/2 + 5 && Math.abs(dy) < overlay.height/2 + 5) {
      setDraggingOverlay(true);
    }
    e.preventDefault();
  }
  function onCanvasPointerMove(e) {
    if (!draggingOverlay || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const px = (t.clientX - rect.left) / rect.width * 100;
    const py = (t.clientY - rect.top) / rect.height * 100;
    setOverlay(o => ({ ...o, x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) }));
    e.preventDefault();
  }
  function onCanvasPointerUp() {
    setDraggingOverlay(false);
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Toolbar */}
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", flexShrink:0, background:C.surface }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Smile Simulation</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
            {activePatient ? `${activePatient.name} · Photo-based smile preview` : "Upload a smile photo to begin"}
          </div>
        </div>
        <div style={{ flex:1 }} />
        <button onClick={()=>setShowRefs(r=>!r)}
          style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
            background: showRefs ? C.teal : C.surface2, color: showRefs ? "white" : C.muted, cursor:"pointer", fontFamily:C.sans }}>
          {showRefs?"✓ Refs":"Refs"}
        </button>
        <button onClick={()=>setSmileArc(s=>!s)}
          style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
            background: smileArc ? C.teal : C.surface2, color: smileArc ? "white" : C.muted, cursor:"pointer", fontFamily:C.sans }}>
          {smileArc?"✓ Arc":"Arc"}
        </button>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Photo viewport */}
        <div ref={containerRef} style={{ flex:1, position:"relative", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          {!photo && (
            <div style={{ textAlign:"center", color:C.muted, padding:30 }}>
              <div style={{ fontSize:64, marginBottom:16 }}>😊</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:C.ink }}>Upload a smile photo</div>
              <div style={{ fontSize:13, marginBottom:24 }}>Full smile or retracted view · JPG/PNG</div>
              <button onClick={()=>photoInputRef.current?.click()}
                style={{ padding:"14px 24px", borderRadius:8, fontSize:15, fontWeight:700, border:"none", background:C.teal, color:"white", cursor:"pointer", fontFamily:C.sans }}>
                Choose Photo
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e=>handlePhotoUpload(e.target.files?.[0])} />
            </div>
          )}
          {photo && (
            <div style={{ position:"relative", width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <img src={photo.url} alt="smile"
                style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }} />
              <canvas ref={canvasRef}
                onMouseDown={onCanvasPointerDown}
                onMouseMove={onCanvasPointerMove}
                onMouseUp={onCanvasPointerUp}
                onMouseLeave={onCanvasPointerUp}
                onTouchStart={onCanvasPointerDown}
                onTouchMove={onCanvasPointerMove}
                onTouchEnd={onCanvasPointerUp}
                style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", cursor: draggingOverlay?"grabbing":"grab", touchAction:"none" }} />
              {/* Helper */}
              <div style={{ position:"absolute", bottom:12, left:12, padding:"8px 12px", background:"rgba(19,35,56,.85)", borderRadius:6, fontSize:11, color:C.muted, fontFamily:C.font, pointerEvents:"none" }}>
                Drag the tooth overlay to position · Use sliders to adjust
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width:320, background:C.surface, borderLeft:`1px solid ${C.border}`, overflow:"auto", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:18 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>PARAMETERS</div>

            {/* W:L ratio */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>W:L ratio</span>
                <span style={{ color:C.teal, fontFamily:C.font, fontWeight:700 }}>{teethWidth}%</span>
              </div>
              <input type="range" min="65" max="90" value={teethWidth} onChange={e=>setTeethWidth(+e.target.value)}
                style={{ width:"100%", accentColor:C.teal, height:6 }} />
              <div style={{ fontSize:10, color:C.light, marginTop:4 }}>AEP youthful ~80%, golden ~78%, mature ~72%</div>
            </div>

            {/* Length */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>Length adjustment</span>
                <span style={{ color:C.teal, fontFamily:C.font, fontWeight:700 }}>{lengthAdj>0?"+":""}{lengthAdj}mm</span>
              </div>
              <input type="range" min="-2" max="3" step="0.5" value={lengthAdj} onChange={e=>setLengthAdj(+e.target.value)}
                style={{ width:"100%", accentColor:C.teal, height:6 }} />
            </div>

            {/* Shade */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Shade</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
                {Object.entries(SHADES).map(([s, color]) => (
                  <button key={s} onClick={()=>setShade(s)}
                    style={{ padding:"9px 4px", borderRadius:5, border:`2px solid ${shade===s?C.teal:C.border}`, background:color, color:"#222", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:C.font }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Tooth form */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Tooth form</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {["ovoid","square","triangular","square-tapering"].map(f => (
                  <button key={f} onClick={()=>setToothForm(f)}
                    style={{ padding:"10px 8px", borderRadius:6, border:`1px solid ${toothForm===f?C.teal:C.border}`, background:toothForm===f?C.tealDim:"transparent", color:toothForm===f?C.teal:C.muted, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:C.sans, textTransform:"capitalize" }}>
                    {f.replace('-',' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay width */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>Overlay width</span>
                <span style={{ color:C.teal, fontFamily:C.font, fontWeight:700 }}>{overlay.width}%</span>
              </div>
              <input type="range" min="15" max="60" value={overlay.width} onChange={e=>setOverlay(o=>({...o, width:+e.target.value}))}
                style={{ width:"100%", accentColor:C.teal, height:6 }} />
            </div>

            {/* Rotation */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>Cant correction</span>
                <span style={{ color:C.teal, fontFamily:C.font, fontWeight:700 }}>{overlay.rotation}°</span>
              </div>
              <input type="range" min="-10" max="10" step="0.5" value={overlay.rotation} onChange={e=>setOverlay(o=>({...o, rotation:+e.target.value}))}
                style={{ width:"100%", accentColor:C.teal, height:6 }} />
            </div>

            {/* Opacity */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:6 }}>
                <span>Blend opacity</span>
                <span style={{ color:C.teal, fontFamily:C.font, fontWeight:700 }}>{Math.round(overlayOpacity*100)}%</span>
              </div>
              <input type="range" min="0.3" max="1" step="0.05" value={overlayOpacity} onChange={e=>setOverlayOpacity(+e.target.value)}
                style={{ width:"100%", accentColor:C.teal, height:6 }} />
            </div>

            <button onClick={()=>photoInputRef.current?.click()}
              style={{ width:"100%", padding:10, borderRadius:7, border:`1px dashed ${C.border}`, background:"transparent", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>
              Change photo
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e=>handlePhotoUpload(e.target.files?.[0])} />
          </div>

          <div style={{ padding:"0 18px 18px", marginTop:"auto" }}>
            <button onClick={()=>{
              if (!canvasRef.current || !photo) return;
              // Composite photo + overlay, download
              const merged = document.createElement('canvas');
              const img = new Image();
              img.onload = () => {
                merged.width = img.naturalWidth;
                merged.height = img.naturalHeight;
                const ctx = merged.getContext('2d');
                ctx.drawImage(img, 0, 0);
                ctx.drawImage(canvasRef.current, 0, 0, merged.width, merged.height);
                const a = document.createElement('a');
                a.href = merged.toDataURL('image/jpeg', 0.92);
                a.download = `${activePatient?.id || 'smile'}-preview.jpg`;
                a.click();
              };
              img.src = photo.url;
            }}
              disabled={!photo}
              style={{ width:"100%", padding:"14px", borderRadius:8, border:"none",
                background:photo?C.teal:C.surface3, color:photo?"white":C.muted,
                fontSize:14, fontWeight:700, cursor:photo?"pointer":"not-allowed", fontFamily:C.sans }}>
              ⬇ Export Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
