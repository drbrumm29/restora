import { useState, useEffect, useRef } from "react";
import { PATIENTS } from "./patient-cases.js";
import { loadImageFromFile } from "./image-loaders.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669", blue:"#0891b2", purple:"#7c3aed",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// AEP shade values from brightest to warmest
const SHADES = [
  { name:"BL1", rgb:[249,248,242], note:"Brightest bleach" },
  { name:"BL2", rgb:[244,240,228], note:"Natural bleach" },
  { name:"BL3", rgb:[238,232,215], note:"Warm bleach" },
  { name:"BL4", rgb:[232,224,203], note:"Deep bleach" },
  { name:"A1",  rgb:[231,220,198], note:"Natural warm" },
  { name:"A2",  rgb:[224,211,182], note:"Common natural" },
  { name:"A3",  rgb:[214,197,161], note:"Medium warm" },
  { name:"B1",  rgb:[237,226,199], note:"Yellow-neutral" },
];

const TOOTH_FORMS = {
  "square":         { ratio:0.92, label:"Square",         note:"Masculine, confident" },
  "square-tapering":{ ratio:0.85, label:"Square-tapering",note:"Classic natural" },
  "ovoid":          { ratio:0.80, label:"Ovoid",          note:"Feminine, youthful" },
  "triangular":     { ratio:0.72, label:"Triangular",     note:"Sharp, dramatic" },
};

export default function SmileSimulation({ navigate, activePatient }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [image, setImage]         = useState(null);  // dataURL
  const [imageName, setImageName] = useState("");
  const [loaded, setLoaded]       = useState(false);
  const [imgDims, setImgDims]     = useState({ w:0, h:0 });

  // Design parameters
  const [shadeIdx, setShadeIdx]   = useState(1);  // BL2
  const [form, setForm]           = useState("ovoid");
  const [lengthAdj, setLengthAdj] = useState(0);   // -2 to +3mm
  const [whiten, setWhiten]       = useState(60);  // 0-100 brightness adjustment strength
  const [opacity, setOpacity]     = useState(100); // Overlay opacity

  // Tooth region (drawn by user or auto-detected)
  const [region, setRegion]       = useState(null); // { x, y, w, h } in image coords
  const [drawing, setDrawing]     = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiNotes, setAiNotes]     = useState(null);

  // Auto-load Carrie's smile photo if available
  useEffect(() => {
    if (activePatient?.photos?.length > 0) {
      const photo = activePatient.photos.find(p => p.type === 'smile') || activePatient.photos[0];
      setImage(`/patient-cases/${photo.file}`);
      setImageName(photo.label);
    }
  }, [activePatient?.id]);

  // Load image + draw base
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
      // Auto-guess the teeth region: roughly center, mid-lower
      if (!region) {
        setRegion({
          x: img.naturalWidth * 0.32,
          y: img.naturalHeight * 0.52,
          w: img.naturalWidth * 0.36,
          h: img.naturalHeight * 0.14,
        });
      }
    };
    img.src = image;
  }, [image]);

  // Redraw canvas when anything changes
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    // Fit canvas to container but render at image resolution for quality
    canvas.width = imgDims.w;
    canvas.height = imgDims.h;
    ctx.drawImage(img, 0, 0);

    if (!region) return;
    const { x, y, w, h } = region;

    // Get pixel data from region
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;
    const shade = SHADES[shadeIdx];

    // Simple masked re-shade: blend toward target shade by whiten amount
    const blend = whiten / 100;
    const [tr, tg, tb] = shade.rgb;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // Approximate tooth-pixel detection: bright + low saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const brightness = max;
      // Very loose tooth mask: bright-ish + low-ish sat
      const isToothLike = brightness > 110 && sat < 0.55;
      if (isToothLike) {
        data[i]   = Math.round(r * (1 - blend) + tr * blend);
        data[i+1] = Math.round(g * (1 - blend) + tg * blend);
        data[i+2] = Math.round(b * (1 - blend) + tb * blend);
      }
    }
    ctx.putImageData(imgData, x, y);

    // Length adjustment: redraw a slightly extended rect at bottom of tooth area
    if (lengthAdj !== 0) {
      // Estimate pixels-per-mm: rough guess = region height is ~10mm of teeth
      const mmPerPx = 10 / h;
      const pxExtension = Math.abs(lengthAdj) / mmPerPx;
      if (lengthAdj > 0) {
        // Sample the color of the bottom edge and extend
        ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y + h, w, pxExtension);
        ctx.globalAlpha = 1;
      }
    }

    // Tooth form overlay indicator
    ctx.strokeStyle = `rgba(10,186,181,${opacity/100})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8,4]);
    ctx.strokeRect(x, y, w, h + (lengthAdj > 0 ? (Math.abs(lengthAdj) / (10/h)) : 0));
    ctx.setLineDash([]);

  }, [loaded, shadeIdx, whiten, lengthAdj, opacity, region, imgDims]);

  async function handleFile(f) {
    if (!f) return;
    try {
      const loaded = await loadImageFromFile(f);
      setImage(loaded.dataURL);
      setImageName(loaded.originalName);
      setLoaded(false);
      setRegion(null);
      setAiNotes(null);
    } catch (err) {
      console.error('Photo upload failed', err);
      alert(`Could not load ${f.name}: ${err.message}`);
    }
  }

  // Canvas mouse: click-drag to define tooth region
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
    setDragStart({ x, y });
    setDrawing(true);
  }
  function onMove(e) {
    if (!drawing || !dragStart) return;
    const { x, y } = canvasCoords(e);
    setRegion({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    });
  }
  function onUp() { setDrawing(false); setDragStart(null); }

  async function runAIAnalysis() {
    if (!image) return;
    setAnalyzing(true);
    try {
      // Get base64
      const canvas = canvasRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgDims.w; tempCanvas.height = imgDims.h;
      tempCanvas.getContext('2d').drawImage(imgRef.current, 0, 0);
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
      const b64 = dataUrl.split(',')[1];
      const shade = SHADES[shadeIdx];
      const formDef = TOOTH_FORMS[form];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: `You are a cosmetic dentistry AI analyzing a patient smile photo against proposed design parameters.

PROPOSED PARAMETERS:
- Target shade: ${shade.name} (${shade.note})
- Tooth form: ${formDef.label} (${formDef.note}) — W:L ratio ${formDef.ratio}
- Length adjustment: ${lengthAdj > 0 ? `+${lengthAdj}mm (longer)` : lengthAdj < 0 ? `${lengthAdj}mm (shorter)` : 'no change'}

Analyze the smile and provide:
1. Current smile assessment (2 sentences)
2. Will these parameters work? (honest, clinical)
3. AEP red flags if any (smile arc, incisal display, midline, phonetics risk)
4. Suggested adjustments

Return JSON only:
{
  "current_assessment": "string",
  "parameters_verdict": "ideal|acceptable|suboptimal|contraindicated",
  "verdict_reasoning": "string",
  "aep_flags": ["list of issues"],
  "suggested_adjustments": ["list"]
}` }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("\n") || "";
      const clean = text.replace(/```json\n?|```\n?/g, '').trim();
      setAiNotes(JSON.parse(clean));
    } catch (e) {
      setAiNotes({ parameters_verdict:"error", verdict_reasoning: e.message });
    }
    setAnalyzing(false);
  }

  function downloadResult() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smile-sim-${SHADES[shadeIdx].name}-${form}-${lengthAdj>=0?'+':''}${lengthAdj}mm.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.92);
  }

  const verdictColor = {
    'ideal': C.green, 'acceptable': C.teal, 'suboptimal': C.amber, 'contraindicated': C.red, 'error': C.red,
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:`1px solid ${C.border}`, gap:14, flexWrap:"wrap", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:28, fontWeight:700, letterSpacing:"-.02em" }}>Smile Simulation</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
            {imageName ? `${imageName} · ${imgDims.w}×${imgDims.h}` : "Load a patient photo to begin"}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <label style={{ padding:"10px 16px", borderRadius:8, background:C.surface2, color:C.muted, border:`1px solid ${C.border}`, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>
            📸 Upload Photo
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" style={{ display:"none" }} onChange={e=>handleFile(e.target.files?.[0])}/>
          </label>
          {image && <button onClick={downloadResult} style={{ padding:"10px 16px", borderRadius:8, background:C.teal, color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>⬇ Save Preview</button>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", minHeight:0, flexWrap:"wrap" }}>
        {/* Canvas */}
        <div style={{ flex:"1 1 500px", minWidth:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20, background:"#000", overflow:"auto" }}>
          {!image && (
            <div style={{ textAlign:"center", color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📸</div>
              <div style={{ fontSize:15 }}>Upload a patient smile photo</div>
              <div style={{ fontSize:12, marginTop:6 }}>or select a patient with attached photos</div>
            </div>
          )}
          {image && (
            <canvas ref={canvasRef}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:8, cursor:drawing?"crosshair":"crosshair", touchAction:"none" }}/>
          )}
        </div>

        {/* Controls */}
        <div style={{ width:340, minWidth:300, maxWidth:"100%", borderLeft:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>SHADE</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6, marginBottom:8 }}>
              {SHADES.map((s, i) => (
                <button key={s.name} onClick={()=>setShadeIdx(i)}
                  style={{ padding:"10px 6px", borderRadius:6, border:`2px solid ${shadeIdx===i?C.teal:C.border}`, background:`rgb(${s.rgb.join(',')})`, color:"#333", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:C.font }}>
                  {s.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.muted }}>{SHADES[shadeIdx].note}</div>
          </div>

          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>TOOTH FORM</div>
            {Object.entries(TOOTH_FORMS).map(([k, v]) => (
              <button key={k} onClick={()=>setForm(k)}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"11px 14px", borderRadius:7, background:form===k?C.tealDim:"transparent", border:`1px solid ${form===k?C.tealBorder:C.borderSoft}`, color:C.ink, cursor:"pointer", fontFamily:C.sans, marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:form===k?C.teal:C.ink }}>{v.label}</span>
                  <span style={{ fontSize:10, color:C.muted, fontFamily:C.font }}>W:L {v.ratio}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{v.note}</div>
              </button>
            ))}
          </div>

          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>LENGTH ADJUSTMENT</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <input type="range" min={-2} max={3} step={0.5} value={lengthAdj}
                onChange={e=>setLengthAdj(parseFloat(e.target.value))}
                style={{ flex:1, accentColor:C.teal }}/>
              <span style={{ fontSize:16, fontFamily:C.font, color:C.teal, fontWeight:700, minWidth:60, textAlign:"right" }}>{lengthAdj>0?'+':''}{lengthAdj}mm</span>
            </div>
            <div style={{ fontSize:10, color:C.muted }}>AEP: 1-3mm incisal display at repose</div>
          </div>

          <div style={{ padding:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>WHITEN BLEND</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="range" min={0} max={100} value={whiten}
                onChange={e=>setWhiten(parseInt(e.target.value))}
                style={{ flex:1, accentColor:C.teal }}/>
              <span style={{ fontSize:14, fontFamily:C.font, color:C.teal, fontWeight:700, minWidth:50, textAlign:"right" }}>{whiten}%</span>
            </div>
          </div>

          <div style={{ padding:18, borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.7 }}>
            <strong style={{ color:C.ink, fontSize:12 }}>Tooth region</strong><br/>
            Click and drag on the image to redefine the tooth region.
            {region && <div style={{ marginTop:6, fontFamily:C.font, fontSize:10 }}>
              {Math.round(region.w)}×{Math.round(region.h)}px @ ({Math.round(region.x)},{Math.round(region.y)})
            </div>}
          </div>

          <div style={{ padding:18, flex:1, overflow:"auto" }}>
            <button onClick={runAIAnalysis} disabled={!image || analyzing}
              style={{ width:"100%", padding:"14px", borderRadius:8, background:analyzing?C.surface2:C.purple, color:analyzing?C.muted:"white", border:"none", fontSize:14, fontWeight:700, cursor:analyzing||!image?"wait":"pointer", fontFamily:C.sans, marginBottom:14 }}>
              {analyzing ? "⚡ Analyzing smile..." : "✨ AI Analysis"}
            </button>

            {aiNotes && (
              <div style={{ padding:14, borderRadius:9, background:verdictColor[aiNotes.parameters_verdict]+"18", border:`1px solid ${verdictColor[aiNotes.parameters_verdict]}50`, fontSize:12, color:C.ink, lineHeight:1.6 }}>
                <div style={{ fontSize:10, fontFamily:C.font, letterSpacing:2, color:verdictColor[aiNotes.parameters_verdict], marginBottom:8, fontWeight:700, textTransform:"uppercase" }}>
                  VERDICT · {aiNotes.parameters_verdict}
                </div>
                {aiNotes.current_assessment && <div style={{ marginBottom:10 }}><strong>Current:</strong> {aiNotes.current_assessment}</div>}
                {aiNotes.verdict_reasoning && <div style={{ marginBottom:10 }}>{aiNotes.verdict_reasoning}</div>}
                {aiNotes.aep_flags?.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:C.amber, fontWeight:700, fontFamily:C.font, letterSpacing:1, marginBottom:4 }}>AEP FLAGS</div>
                    <ul style={{ margin:0, paddingLeft:18, fontSize:11 }}>{aiNotes.aep_flags.map((f,i)=><li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {aiNotes.suggested_adjustments?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, color:C.teal, fontWeight:700, fontFamily:C.font, letterSpacing:1, marginBottom:4 }}>ADJUSTMENTS</div>
                    <ul style={{ margin:0, paddingLeft:18, fontSize:11 }}>{aiNotes.suggested_adjustments.map((f,i)=><li key={i}>{f}</li>)}</ul>
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
