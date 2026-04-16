import { useState, useEffect, useRef } from "react";
import { PATIENTS } from "./patient-cases.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", amberDim:"rgba(217,119,6,.12)",
  red:"#dc2626", redDim:"rgba(220,38,38,.12)",
  green:"#059669", greenDim:"rgba(5,150,105,.12)",
  blue:"#0891b2", purple:"#7c3aed",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// Common implant sizes (D x L in mm)
const IMPLANTS = [
  { brand:"Straumann BLT", sizes:[[3.3,8],[3.3,10],[3.3,12],[4.1,8],[4.1,10],[4.1,12],[4.8,8],[4.8,10]] },
  { brand:"Nobel Active",  sizes:[[3.5,8.5],[3.5,10],[3.5,11.5],[4.3,8.5],[4.3,10],[4.3,11.5],[5.0,8.5],[5.0,10]] },
  { brand:"BioHorizons",   sizes:[[3.4,9],[3.4,10.5],[3.8,9],[3.8,10.5],[3.8,12],[4.6,9],[4.6,10.5],[4.6,12]] },
  { brand:"Dentsply Astra",sizes:[[3.0,9],[3.5,9],[3.5,11],[4.0,9],[4.0,11],[4.5,9],[4.5,11],[5.0,9]] },
];

const CLEARANCES = {
  ian:       { label:"IAN canal",          min:2.0, critical:1.0, color:C.red,    info:"Inferior alveolar nerve — ≥2mm for safety" },
  sinus:     { label:"Sinus floor",        min:1.0, critical:0.5, color:C.amber,  info:"Apical clearance from maxillary sinus" },
  adjacent:  { label:"Adjacent root",      min:1.5, critical:1.0, color:C.purple, info:"Lateral clearance from neighboring teeth" },
  buccal:    { label:"Buccal plate",       min:1.5, critical:1.0, color:C.blue,   info:"Prevents dehiscence / buccal exposure" },
  mental:    { label:"Mental foramen",     min:2.0, critical:1.5, color:C.red,    info:"Anterior loop + foramen itself" },
};

export default function ImplantPlanning({ navigate, activePatient }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [image, setImage]         = useState(null);
  const [imageName, setImageName] = useState("");
  const [loaded, setLoaded]       = useState(false);
  const [imgDims, setImgDims]     = useState({ w:0, h:0 });

  const [toothSite, setTooth]     = useState(19);
  const [brand, setBrand]         = useState("Straumann BLT");
  const [size, setSize]           = useState([4.1, 10]);
  const [angle, setAngle]         = useState(0);     // degrees tilt
  const [pos, setPos]             = useState({ x: 0.5, y: 0.5 }); // normalized 0-1
  const [draggingImplant, setDI]  = useState(false);

  const [clearances, setClear]    = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport]       = useState(null);
  const [pxPerMm, setPxPerMm]     = useState(5);   // calibration (default guess)

  // Auto-load any radiograph photo from active patient
  useEffect(() => {
    if (activePatient?.photos?.length > 0) {
      const radiograph = activePatient.photos.find(p => p.type === 'xray' || p.type === 'radiograph');
      if (radiograph) {
        setImage(`/patient-cases/${radiograph.file}`);
        setImageName(radiograph.label);
      }
    }
  }, [activePatient?.id]);

  // Load image
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
    };
    img.src = image;
  }, [image]);

  // Draw
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    canvas.width = imgDims.w;
    canvas.height = imgDims.h;
    ctx.drawImage(img, 0, 0);

    // Draw implant at pos with angle
    const cx = pos.x * imgDims.w;
    const cy = pos.y * imgDims.h;
    const [d, l] = size;
    const dpx = d * pxPerMm;
    const lpx = l * pxPerMm;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * Math.PI / 180);

    // Implant body (tapered cylinder with threads)
    ctx.strokeStyle = "#e8e8e8";
    ctx.fillStyle = "rgba(232,232,232,.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(10,186,181,.6)";
    ctx.shadowBlur = 12;
    ctx.fillRect(-dpx/2, -lpx/2, dpx, lpx);
    ctx.strokeRect(-dpx/2, -lpx/2, dpx, lpx);
    ctx.shadowBlur = 0;

    // Threads
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 0.8;
    const threadPitch = 0.8 * pxPerMm;
    for (let y = -lpx/2 + threadPitch; y < lpx/2; y += threadPitch) {
      ctx.beginPath();
      ctx.moveTo(-dpx/2, y);
      ctx.lineTo(dpx/2, y);
      ctx.stroke();
    }

    // Apex taper
    ctx.beginPath();
    ctx.moveTo(-dpx/2, lpx/2);
    ctx.lineTo(0, lpx/2 + dpx/2);
    ctx.lineTo(dpx/2, lpx/2);
    ctx.fillStyle = "rgba(232,232,232,.85)";
    ctx.fill();
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Platform
    ctx.strokeStyle = "#0abab5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-dpx/2 - 2, -lpx/2);
    ctx.lineTo(dpx/2 + 2, -lpx/2);
    ctx.stroke();

    ctx.restore();

    // Draw safety halo around implant
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * Math.PI / 180);
    ctx.strokeStyle = "rgba(10,186,181,.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-dpx/2 - 2*pxPerMm, -lpx/2 - 2*pxPerMm, dpx + 4*pxPerMm, lpx + 4*pxPerMm);
    ctx.setLineDash([]);
    ctx.restore();

    // Label
    ctx.fillStyle = "#0abab5";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`#${toothSite} · ${brand}`, cx, cy - lpx/2 - 12);
    ctx.font = "14px 'DM Mono', monospace";
    ctx.fillText(`Ø${d} × L${l}mm`, cx, cy + lpx/2 + 24);

  }, [loaded, pos, angle, size, brand, toothSite, pxPerMm, imgDims]);

  function handleFile(f) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setImageName(f.name);
      setLoaded(false);
      setReport(null);
    };
    reader.readAsDataURL(f);
  }

  function canvasCoords(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = e.clientX || e.touches?.[0]?.clientX || 0;
    const cy = e.clientY || e.touches?.[0]?.clientY || 0;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  }
  function onDown(e) {
    e.preventDefault();
    const { x, y } = canvasCoords(e);
    setPos({ x: x / imgDims.w, y: y / imgDims.h });
    setDI(true);
  }
  function onMove(e) {
    if (!draggingImplant) return;
    const { x, y } = canvasCoords(e);
    setPos({ x: Math.max(0, Math.min(1, x / imgDims.w)), y: Math.max(0, Math.min(1, y / imgDims.h)) });
  }
  function onUp() { setDI(false); }

  async function runSafetyAnalysis() {
    if (!image) return;
    setAnalyzing(true);
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgDims.w; tempCanvas.height = imgDims.h;
      tempCanvas.getContext('2d').drawImage(imgRef.current, 0, 0);
      // Include the implant overlay in image sent to AI
      const canvas = canvasRef.current;
      const overlay = canvas.toDataURL('image/jpeg', 0.85);
      const b64 = overlay.split(',')[1];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: `You are a board-certified oral surgeon reviewing a proposed implant placement on a radiograph.

PROPOSED PLACEMENT:
- Tooth site: #${toothSite}
- Implant: ${brand} Ø${size[0]}mm × L${size[1]}mm
- Angulation: ${angle}°

CRITICAL: Only report safety concerns that are actually visible in the radiograph. Do not invent findings. If the implant appears inadequately placed or too close to anatomic structures, state it explicitly.

Evaluate these clearances if assessable from the radiograph:
- IAN canal (≥2mm safe, ≥1mm critical minimum)
- Maxillary sinus (≥1mm preferred)
- Adjacent roots (≥1.5mm)
- Buccal/lingual plates
- Mental foramen (for mandibular premolars)

Return JSON only:
{
  "verdict": "safe|caution|unsafe|cannot_assess",
  "verdict_reason": "1-2 sentence summary",
  "clearances": {
    "ian_mm": number or null,
    "sinus_mm": number or null,
    "adjacent_mesial_mm": number or null,
    "adjacent_distal_mm": number or null,
    "buccal_mm": number or null
  },
  "angulation_assessment": "string",
  "bone_quality_estimate": "D1|D2|D3|D4|cannot_assess",
  "red_flags": ["specific concerns"],
  "recommendations": ["actionable changes"],
  "alternative_sizes": ["suggest other sizes if current is suboptimal"]
}` }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("\n") || "";
      const clean = text.replace(/```json\n?|```\n?/g, '').trim();
      setReport(JSON.parse(clean));
    } catch (e) {
      setReport({ verdict:"error", verdict_reason: e.message });
    }
    setAnalyzing(false);
  }

  const verdictColor = {
    'safe': C.green, 'caution': C.amber, 'unsafe': C.red, 'cannot_assess': C.muted, 'error': C.red,
  };

  const currentBrand = IMPLANTS.find(b => b.brand === brand);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:`1px solid ${C.border}`, gap:14, flexWrap:"wrap", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Implant Planning</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
            {imageName ? `${imageName} · Tooth #${toothSite}` : "Load a radiograph to plan placement"}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <label style={{ padding:"10px 16px", borderRadius:8, background:C.surface2, color:C.muted, border:`1px solid ${C.border}`, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>
            📸 Upload Radiograph
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files?.[0])}/>
          </label>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", minHeight:0, flexWrap:"wrap" }}>
        {/* Canvas */}
        <div style={{ flex:"1 1 500px", minWidth:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20, background:"#000", overflow:"auto" }}>
          {!image && (
            <div style={{ textAlign:"center", color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🦷</div>
              <div style={{ fontSize:15 }}>Upload a panoramic or periapical radiograph</div>
              <div style={{ fontSize:12, marginTop:6 }}>Drag the implant to position · rotate to adjust angulation</div>
            </div>
          )}
          {image && (
            <canvas ref={canvasRef}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:8, cursor:draggingImplant?"grabbing":"crosshair", touchAction:"none" }}/>
          )}
        </div>

        {/* Controls */}
        <div style={{ width:340, minWidth:300, borderLeft:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", flexShrink:0, overflow:"auto" }}>
          {/* Site */}
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>TOOTH SITE</div>
            <input type="number" min={1} max={32} value={toothSite}
              onChange={e=>setTooth(parseInt(e.target.value) || 1)}
              style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:18, fontFamily:C.font, fontWeight:700, outline:"none", textAlign:"center" }}/>
          </div>

          {/* Brand */}
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>IMPLANT BRAND</div>
            <select value={brand} onChange={e=>{setBrand(e.target.value); setSize(IMPLANTS.find(i=>i.brand===e.target.value).sizes[0]);}}
              style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none" }}>
              {IMPLANTS.map(b => <option key={b.brand}>{b.brand}</option>)}
            </select>
          </div>

          {/* Size */}
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>DIAMETER × LENGTH</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
              {currentBrand?.sizes.map((s, i) => {
                const active = s[0]===size[0] && s[1]===size[1];
                return (
                  <button key={i} onClick={()=>setSize(s)}
                    style={{ padding:"9px 5px", borderRadius:6, border:`1.5px solid ${active?C.teal:C.border}`, background:active?C.tealDim:C.surface2, color:active?C.teal:C.muted, fontSize:11, fontFamily:C.font, fontWeight:700, cursor:"pointer" }}>
                    {s[0]}×{s[1]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Angle */}
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>ANGULATION</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="range" min={-30} max={30} step={1} value={angle}
                onChange={e=>setAngle(parseInt(e.target.value))}
                style={{ flex:1, accentColor:C.teal }}/>
              <span style={{ fontSize:15, fontFamily:C.font, color:C.teal, fontWeight:700, minWidth:50, textAlign:"right" }}>{angle}°</span>
            </div>
          </div>

          {/* Scale */}
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>SCALE (PX/MM)</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="range" min={2} max={30} step={0.5} value={pxPerMm}
                onChange={e=>setPxPerMm(parseFloat(e.target.value))}
                style={{ flex:1, accentColor:C.teal }}/>
              <span style={{ fontSize:14, fontFamily:C.font, color:C.teal, fontWeight:700, minWidth:50, textAlign:"right" }}>{pxPerMm}</span>
            </div>
            <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>Adjust until implant overlay matches known anatomy</div>
          </div>

          {/* AI analysis */}
          <div style={{ padding:18 }}>
            <button onClick={runSafetyAnalysis} disabled={!image || analyzing}
              style={{ width:"100%", padding:"14px", borderRadius:8, background:analyzing?C.surface2:C.red, color:analyzing?C.muted:"white", border:"none", fontSize:14, fontWeight:700, cursor:analyzing||!image?"wait":"pointer", fontFamily:C.sans, marginBottom:14 }}>
              {analyzing ? "⚡ Analyzing safety..." : "🛡 Run Safety Analysis"}
            </button>

            {report && (
              <div style={{ padding:14, borderRadius:9, background:verdictColor[report.verdict]+"18", border:`1px solid ${verdictColor[report.verdict]}55`, fontSize:12, color:C.ink, lineHeight:1.7 }}>
                <div style={{ fontSize:11, fontFamily:C.font, letterSpacing:2, color:verdictColor[report.verdict], marginBottom:10, fontWeight:700, textTransform:"uppercase" }}>
                  {report.verdict}
                </div>
                {report.verdict_reason && <div style={{ marginBottom:10 }}>{report.verdict_reason}</div>}

                {report.clearances && (
                  <div style={{ marginBottom:10, fontSize:11 }}>
                    <div style={{ color:C.teal, fontFamily:C.font, fontSize:10, marginBottom:4, fontWeight:700 }}>CLEARANCES</div>
                    {Object.entries(report.clearances).filter(([k,v]) => v !== null && v !== undefined).map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}>
                        <span style={{ color:C.muted, textTransform:"capitalize" }}>{k.replace(/_mm$/,'').replace(/_/g,' ')}</span>
                        <span style={{ fontFamily:C.font, color:v < 1.5 ? C.red : v < 2 ? C.amber : C.green }}>{v}mm</span>
                      </div>
                    ))}
                  </div>
                )}

                {report.angulation_assessment && <div style={{ marginBottom:10, fontSize:11 }}><strong>Angulation:</strong> {report.angulation_assessment}</div>}
                {report.bone_quality_estimate && report.bone_quality_estimate !== 'cannot_assess' && (
                  <div style={{ marginBottom:10, fontSize:11 }}><strong>Bone quality:</strong> {report.bone_quality_estimate}</div>
                )}

                {report.red_flags?.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:C.red, fontWeight:700, fontFamily:C.font, letterSpacing:1, marginBottom:4 }}>RED FLAGS</div>
                    <ul style={{ margin:0, paddingLeft:18, fontSize:11 }}>{report.red_flags.map((f,i)=><li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {report.recommendations?.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:C.teal, fontWeight:700, fontFamily:C.font, letterSpacing:1, marginBottom:4 }}>RECOMMENDATIONS</div>
                    <ul style={{ margin:0, paddingLeft:18, fontSize:11 }}>{report.recommendations.map((f,i)=><li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {report.alternative_sizes?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, color:C.purple, fontWeight:700, fontFamily:C.font, letterSpacing:1, marginBottom:4 }}>ALTERNATIVE SIZES</div>
                    <ul style={{ margin:0, paddingLeft:18, fontSize:11 }}>{report.alternative_sizes.map((f,i)=><li key={i}>{f}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
