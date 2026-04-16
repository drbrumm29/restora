import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.15)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669",
  purple:"#7c3aed", blue:"#0891b2",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// Standard implant sizes
const IMPLANT_SYSTEMS = {
  "straumann-blt":    { name:"Straumann BLT",       diameters:[3.3,4.1,4.8], lengths:[8,10,12,14] },
  "nobel-active":     { name:"Nobel Active",        diameters:[3.5,4.3,5.0], lengths:[8.5,10,11.5,13,15] },
  "zimmer-tapered":   { name:"Zimmer Tapered",       diameters:[3.7,4.1,4.7], lengths:[8,10,11.5,13,16] },
  "biohorizons":      { name:"BioHorizons Tapered",  diameters:[3.4,3.8,4.6], lengths:[9,10.5,12,15] },
};

// Clinical safety margins (mm)
const SAFETY = {
  ianDistance:     { min: 2.0, ideal: 2.5, label: "IAN clearance" },
  sinusFloor:      { min: 1.0, ideal: 2.0, label: "Sinus floor clearance" },
  adjacentRoot:    { min: 1.5, ideal: 2.0, label: "Adjacent root distance" },
  buccalBone:      { min: 1.5, ideal: 2.0, label: "Buccal bone thickness" },
  lingualBone:     { min: 1.5, ideal: 2.0, label: "Lingual bone thickness" },
};

// Tooth position (upper 1-16, lower 17-32) for site selection
const SITES = {
  "upper-posterior": { label:"Upper Posterior (#1-5, 12-16)", constraints:"Sinus floor proximity · bone density type IV common" },
  "upper-anterior":  { label:"Upper Anterior (#6-11)",        constraints:"Esthetic zone · emergence profile critical · nasal floor" },
  "lower-anterior":  { label:"Lower Anterior (#22-27)",       constraints:"Limited mesio-distal space · thin buccal plate" },
  "lower-posterior": { label:"Lower Posterior (#17-21, 28-32)", constraints:"IAN proximity MANDATORY check · cortical bone" },
};

export default function ImplantPlanning({ activePatient }) {
  const [image, setImage] = useState(null);
  const [markers, setMarkers] = useState([]); // { x, y, angle, implantType, length }
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [system, setSystem] = useState("straumann-blt");
  const [diameter, setDiameter] = useState(4.1);
  const [length, setLength] = useState(10);
  const [site, setSite] = useState("lower-posterior");
  const [showSafetyZone, setShowSafetyZone] = useState(true);
  const [scale, setScale] = useState(null); // mm per pixel
  const [calibrating, setCalibrating] = useState(false);
  const [calibPoints, setCalibPoints] = useState([]);
  const [draggingMarker, setDraggingMarker] = useState(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-load radiograph if patient has one
  useEffect(() => {
    if (!activePatient?.files) return;
    const xrayFile = activePatient.files.find(f => f.name.toLowerCase().includes('xray') || f.name.toLowerCase().includes('cbct') || f.name.toLowerCase().match(/\.(jpg|png|jpeg)$/));
    if (xrayFile) {
      const img = new Image();
      img.onload = () => setImage({ url: img.src, w: img.naturalWidth, h: img.naturalHeight });
      img.src = `/patient-cases/${xrayFile.name}`;
    }
  }, [activePatient]);

  function handleUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        setImage({ url: e.target.result, w: img.naturalWidth, h: img.naturalHeight });
        setMarkers([]); setSelectedMarker(null); setScale(null);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleCanvasClick(e) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (calibrating) {
      const newPoints = [...calibPoints, { x, y }];
      setCalibPoints(newPoints);
      if (newPoints.length === 2) {
        // Ask user for known distance
        const knownMM = parseFloat(prompt("Enter known distance between these 2 points (mm):", "10"));
        if (knownMM > 0) {
          const dx = (newPoints[1].x - newPoints[0].x) * rect.width / 100;
          const dy = (newPoints[1].y - newPoints[0].y) * rect.height / 100;
          const pixelDist = Math.sqrt(dx*dx + dy*dy);
          setScale(knownMM / pixelDist); // mm per pixel
        }
        setCalibrating(false);
        setCalibPoints([]);
      }
      return;
    }

    // Place new implant marker
    const newMarker = {
      id: Date.now(),
      x, y,
      angle: 0,
      system, diameter, length,
      site,
    };
    setMarkers([...markers, newMarker]);
    setSelectedMarker(newMarker.id);
  }

  function updateMarker(id, updates) {
    setMarkers(markers.map(m => m.id === id ? { ...m, ...updates } : m));
  }
  function deleteMarker(id) {
    setMarkers(markers.filter(m => m.id !== id));
    if (selectedMarker === id) setSelectedMarker(null);
  }

  const current = markers.find(m => m.id === selectedMarker);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Toolbar */}
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", flexShrink:0, background:C.surface }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Implant Planning</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
            {image ? (scale ? `Scale: ${scale.toFixed(3)}mm/px · ${markers.length} implant${markers.length!==1?'s':''} planned` : "⚠ Uncalibrated — set scale for accurate measurements") : "Upload CBCT slice, panoramic, or periapical radiograph"}
          </div>
        </div>
        <div style={{ flex:1 }} />
        {image && (
          <>
            <button onClick={()=>{setCalibrating(true); setCalibPoints([]);}}
              style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
                background: calibrating ? C.amber : C.surface2, color: calibrating ? "white" : C.muted, cursor:"pointer", fontFamily:C.sans }}>
              📏 {calibrating ? `Calibrating (${calibPoints.length}/2)` : "Calibrate scale"}
            </button>
            <button onClick={()=>setShowSafetyZone(s=>!s)}
              style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
                background: showSafetyZone ? C.teal : C.surface2, color: showSafetyZone ? "white" : C.muted, cursor:"pointer", fontFamily:C.sans }}>
              {showSafetyZone?"✓ Safety":"Safety"}
            </button>
          </>
        )}
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Image viewport */}
        <div ref={containerRef} style={{ flex:1, position:"relative", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          {!image && (
            <div style={{ textAlign:"center", color:C.muted, padding:30, zIndex:2 }}>
              <div style={{ fontSize:64, marginBottom:16 }}>🔩</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:C.ink }}>Upload Radiograph</div>
              <div style={{ fontSize:13, marginBottom:24 }}>CBCT slice, panoramic, PA, or bitewing</div>
              <button onClick={()=>fileRef.current?.click()}
                style={{ padding:"14px 24px", borderRadius:8, fontSize:15, fontWeight:700, border:"none", background:C.teal, color:"white", cursor:"pointer", fontFamily:C.sans }}>
                Choose Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e=>handleUpload(e.target.files?.[0])} />
            </div>
          )}
          {image && (
            <div style={{ position:"relative", maxWidth:"100%", maxHeight:"100%", display:"inline-block" }}>
              <img ref={imgRef} src={image.url} alt="radiograph"
                onClick={handleCanvasClick}
                style={{ display:"block", maxWidth:"100%", maxHeight:"calc(100vh - 200px)", objectFit:"contain", cursor: calibrating ? "crosshair" : "crosshair" }} />

              {/* Calibration points */}
              {calibPoints.map((p,i) => (
                <div key={i} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, transform:"translate(-50%,-50%)", pointerEvents:"none" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:C.amber, border:"2px solid white", boxShadow:`0 0 0 3px ${C.amber}60` }}/>
                  <div style={{ position:"absolute", top:-20, left:14, fontSize:11, color:C.amber, fontFamily:C.font, fontWeight:700, whiteSpace:"nowrap" }}>P{i+1}</div>
                </div>
              ))}
              {calibPoints.length === 2 && (
                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
                  <line x1={`${calibPoints[0].x}%`} y1={`${calibPoints[0].y}%`}
                        x2={`${calibPoints[1].x}%`} y2={`${calibPoints[1].y}%`}
                        stroke={C.amber} strokeWidth="2" strokeDasharray="4 3" />
                </svg>
              )}

              {/* Implant markers */}
              {markers.map(m => (
                <ImplantMarker
                  key={m.id}
                  marker={m}
                  selected={selectedMarker === m.id}
                  onClick={(e)=>{e.stopPropagation(); setSelectedMarker(m.id);}}
                  showSafetyZone={showSafetyZone}
                  scale={scale}
                  imgRef={imgRef}
                  onMove={(x,y)=>updateMarker(m.id, {x,y})}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width:340, background:C.surface, borderLeft:`1px solid ${C.border}`, overflow:"auto", flexShrink:0 }}>
          <div style={{ padding:18 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>IMPLANT SELECTION</div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>System</div>
              <select value={system} onChange={e=>setSystem(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                {Object.entries(IMPLANT_SYSTEMS).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Ø mm</div>
                <select value={diameter} onChange={e=>setDiameter(+e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                  {IMPLANT_SYSTEMS[system].diameters.map(d => <option key={d} value={d}>{d}mm</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>L mm</div>
                <select value={length} onChange={e=>setLength(+e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                  {IMPLANT_SYSTEMS[system].lengths.map(l => <option key={l} value={l}>{l}mm</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Site</div>
              <select value={site} onChange={e=>setSite(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                {Object.entries(SITES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div style={{ fontSize:10, color:C.light, marginTop:6, lineHeight:1.5 }}>{SITES[site].constraints}</div>
            </div>

            <div style={{ padding:"10px 14px", borderRadius:7, background:C.tealDim, border:`1px solid ${C.tealBorder}`, fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:18 }}>
              {image ? "Click the radiograph to place an implant marker." : "Upload a radiograph first."}
            </div>

            {/* Safety rules */}
            <div style={{ fontSize:11, fontFamily:C.font, color:C.amber, letterSpacing:2, marginBottom:10, fontWeight:700 }}>SAFETY CHECKS</div>
            {Object.entries(SAFETY).map(([k,v]) => (
              <div key={k} style={{ padding:"8px 0", borderBottom:`1px solid ${C.borderSoft}`, fontSize:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", color:C.ink }}>
                  <span>{v.label}</span>
                  <span style={{ fontFamily:C.font, color:C.amber, fontWeight:700 }}>≥{v.min}mm</span>
                </div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Ideal: {v.ideal}mm</div>
              </div>
            ))}
          </div>

          {/* Planned implants list */}
          {markers.length > 0 && (
            <div style={{ padding:"0 18px 18px" }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>PLANNED ({markers.length})</div>
              {markers.map((m, i) => (
                <div key={m.id}
                  onClick={()=>setSelectedMarker(m.id)}
                  style={{ padding:"10px 12px", marginBottom:6, borderRadius:7,
                    background: selectedMarker===m.id ? C.tealDim : C.surface2,
                    border:`1.5px solid ${selectedMarker===m.id ? C.teal : C.border}`,
                    cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>Implant {i+1}</div>
                    <div style={{ fontSize:10, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {IMPLANT_SYSTEMS[m.system].name} · Ø{m.diameter} × {m.length}mm
                    </div>
                  </div>
                  <button onClick={(e)=>{e.stopPropagation(); deleteMarker(m.id);}}
                    style={{ padding:"4px 7px", borderRadius:4, fontSize:10, border:"none", background:"rgba(220,38,38,.15)", color:C.red, cursor:"pointer" }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected marker details */}
          {current && (
            <div style={{ padding:"0 18px 18px" }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>SELECTED</div>
              <div style={{ padding:14, borderRadius:8, background:C.surface2, border:`1px solid ${C.tealBorder}` }}>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Angulation</div>
                  <input type="range" min="-30" max="30" step="1" value={current.angle}
                    onChange={e=>updateMarker(current.id, {angle:+e.target.value})}
                    style={{ width:"100%", accentColor:C.teal, height:6 }}/>
                  <div style={{ fontSize:11, color:C.teal, fontFamily:C.font, textAlign:"right", fontWeight:700 }}>{current.angle}°</div>
                </div>
                <button onClick={()=>updateMarker(current.id, { system, diameter, length, site })}
                  style={{ width:"100%", padding:10, borderRadius:6, border:`1px solid ${C.tealBorder}`, background:"transparent", color:C.teal, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>
                  Apply current specs to this implant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImplantMarker({ marker, selected, onClick, showSafetyZone, scale, imgRef, onMove }) {
  const [dragging, setDragging] = useState(false);

  function onDown(e) {
    e.stopPropagation();
    setDragging(true);
    onClick(e);
  }
  useEffect(() => {
    if (!dragging) return;
    const onMoveE = (e) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      const x = Math.max(0, Math.min(100, ((t.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((t.clientY - rect.top) / rect.height) * 100));
      onMove(x, y);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMoveE);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMoveE, {passive:false});
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMoveE);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMoveE);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, imgRef, onMove]);

  // Implant as vertical cylinder with threads
  const implantWidth = scale ? (marker.diameter / scale) : 10;  // in px
  const implantLength = scale ? (marker.length / scale) : 40;

  // SVG implant shape
  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      style={{
        position:"absolute",
        left:`${marker.x}%`, top:`${marker.y}%`,
        transform:`translate(-50%, -50%) rotate(${marker.angle}deg)`,
        cursor: dragging ? "grabbing" : "grab",
        touchAction:"none",
      }}>
      {/* Safety zone halo */}
      {showSafetyZone && (
        <div style={{
          position:"absolute", left:"50%", top:"50%",
          transform:"translate(-50%,-50%)",
          width: implantWidth + 30, height: implantLength + 30,
          borderRadius:"50%",
          background: selected ? "rgba(10,186,181,0.18)" : "rgba(10,186,181,0.1)",
          border: `1px dashed ${C.tealBorder}`,
          pointerEvents:"none",
        }}/>
      )}
      {/* Implant body */}
      <svg width={implantWidth + 10} height={implantLength + 10} style={{ display:"block", overflow:"visible" }}>
        <defs>
          <linearGradient id={`implant-${marker.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a9aaa"/>
            <stop offset="40%" stopColor="#ccd4dc"/>
            <stop offset="60%" stopColor="#dde4ea"/>
            <stop offset="100%" stopColor="#8a9aaa"/>
          </linearGradient>
        </defs>
        {/* Body with threads */}
        <rect x="5" y="5" width={implantWidth} height={implantLength}
          fill={`url(#implant-${marker.id})`}
          stroke={selected ? C.teal : "rgba(255,255,255,0.5)"}
          strokeWidth={selected ? 2 : 1}
          rx={implantWidth/6}
        />
        {/* Thread lines */}
        {Array.from({ length: Math.max(2, Math.floor(implantLength / 4)) }).map((_, i) => (
          <line key={i}
            x1={5} y1={8 + i*4}
            x2={5 + implantWidth} y2={8 + i*4}
            stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"
          />
        ))}
        {/* Apex pointer */}
        <polygon
          points={`5,${5+implantLength} ${5+implantWidth},${5+implantLength} ${5+implantWidth/2},${5+implantLength+5}`}
          fill={`url(#implant-${marker.id})`}
          stroke={selected ? C.teal : "rgba(255,255,255,0.5)"}
          strokeWidth={selected ? 2 : 1}
        />
      </svg>
      {selected && (
        <div style={{ position:"absolute", top:-24, left:"50%", transform:"translateX(-50%)", fontSize:10, fontFamily:C.font, color:"white", background:C.teal, padding:"2px 8px", borderRadius:4, whiteSpace:"nowrap", fontWeight:700 }}>
          Ø{marker.diameter} × {marker.length}mm
        </div>
      )}
    </div>
  );
}
