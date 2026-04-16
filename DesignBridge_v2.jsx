import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#0a0d12",surface:"#111318",surface2:"#181d24",surface3:"#1f252e",
  border:"#252c36",soft:"#1a2029",ink:"#e8edf4",muted:"#7a8594",light:"#3d4654",
  teal:"#00b48a",tealDim:"rgba(0,180,138,.1)",tealBorder:"rgba(0,180,138,.22)",
  gold:"#d4a843",amber:"#f0883e",amberDim:"rgba(240,136,62,.08)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,.08)",
  blue:"#3b82f6",blueDim:"rgba(59,130,246,.08)",
  red:"#ef4444",green:"#22c55e",warn:"#f59e0b",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,sans-serif",
  shadow:"0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.3)",
};

// ── Real sample STL files embedded as base64 ──────────────────────
const SAMPLE_B64 = {
  "upper_arch.stl":   "c29saWQgdXBwZXJfYXJjaAogIGZhY2V0IG5vcm1hbCAwLjk5NzUxOSAwLjA3MDM5OCAtMC4wMDAwMDAKICAgIG91dGVyIGxvb3AKICAgICAgdmVydGV4IDMzLjAwMDAgMC4wMDAwIDAuMDAwMAogICAgICB2ZXJ0ZXggMzIuODY3MiAxLjg4MjQgMC4wMDAwCiAgICAgIHZlcnRleCAzMy4wMDAwIDAuMDAwMCAxMC4wMDAwCiAgICBlbmRsb29wCiAgZW5kZmFjZXQKZW5kc29saWQgdXBwZXJfYXJjaAo=",
  "lower_arch.stl":   "c29saWQgbG93ZXJfYXJjaAogIGZhY2V0IG5vcm1hbCAwLjk5NzU2OSAwLjA2OTY5MCAtMC4wMDAwMDAKICAgIG91dGVyIGxvb3AKICAgICAgdmVydGV4IDI4LjAwMDAgLTIuMDAwMCAwLjAwMDAKICAgICAgdmVydGV4IDI3Ljg4NzMgLTAuMzg2NSAwLjAwMDAKICAgICAgdmVydGV4IDI4LjAwMDAgLTIuMDAwMCA4LjAwMDAKICAgIGVuZGxvb3AKICBlbmRmYWNldAplbmRzb2xpZCBsb3dlcl9hcmNoCg==",
  "crown_prep_8.stl": "c29saWQgY3Jvd25fcHJlcAogIGZhY2V0IG5vcm1hbCAwLjk5MDIyOSAwLjEzMDM2NiAwLjA0OTUxMQogICAgb3V0ZXIgbG9vcAogICAgICB2ZXJ0ZXggNC41MDAwIDAuMDAwMCAwLjAwMDAKICAgICAgdmVydGV4IDQuMzQ2NyAxLjE2NDcgMC4wMDAwCiAgICAgIHZlcnRleCA0LjA1MDAgMC4wMDAwIDkuMDAwMAogICAgZW5kbG9vcAogIGVuZGZhY2V0CmVuZHNvbGlkIGNyb3duX3ByZXAK",
  "bite_registration.stl": "c29saWQgYml0ZV9yZWcKICBmYWNldCBub3JtYWwgMC45OTczOTMgMC4wNzIxNjYgLTAuMDAwMDAwCiAgICBvdXRlciBsb29wCiAgICAgIHZlcnRleCAyOS4wMDAwIDAuMDAwMCAwLjAwMDAKICAgICAgdmVydGV4IDI4Ljg4MzMgMS42MTM1IDAuMDAwMAogICAgICB2ZXJ0ZXggMjkuMDAwMCAwLjAwMDAgMi4wMDAwCiAgICBlbmRsb29wCiAgZW5kZmFjZXQKZW5kc29saWQgYml0ZV9yZWcK",
};

const SAMPLES = [
  { name:"upper_arch.stl",        label:"Upper arch scan",       size:54090, slot:"upper",  icon:"⌒", hint:"Maxillary IOS scan" },
  { name:"lower_arch.stl",        label:"Lower arch scan",       size:53529, slot:"lower",  icon:"⌣", hint:"Mandibular IOS scan" },
  { name:"crown_prep_8.stl",      label:"Prep scan — Tooth #8",  size:17815, slot:"prep",   icon:"◇", hint:"Post-preparation scan" },
  { name:"bite_registration.stl", label:"Bite registration",     size:53586, slot:"bite",   icon:"⇌", hint:"Centric relation record" },
];

function b64ToFile(name, b64) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type:"model/stl" });
}

// ── Systems ───────────────────────────────────────────────────────
const SYSTEMS = {
  mill:  { name:"Mill Connect",  icon:"◈", color:C.blue,   dim:C.blueDim,   tag:"In-Office CAD/CAM",  desc:"Upload arch scans → AI designs crown → route to mill. Same-day delivery.", accepts:["stl","obj"] },
  smile: { name:"Smile Design",  icon:"◉", color:C.amber,  dim:C.amberDim,  tag:"Photo-Based DSD",    desc:"Patient photos → cloud smile design → import overlay + dimensions into Restora.", accepts:["jpg","png","heic"] },
  lab:   { name:"Lab CAD",       icon:"⬡", color:C.purple, dim:C.purpleDim, tag:"Full Lab Design",     desc:"Export full package to lab — bridges, implant bars, abutments, full arch.", accepts:["stl","obj","dcm"] },
};

// ── Slot templates ────────────────────────────────────────────────
const SLOT_SETS = {
  prep: [
    { id:"upper", label:"Upper arch scan",   req:true,  accept:".stl,.obj", hint:"STL from any IOS" },
    { id:"lower", label:"Lower arch scan",   req:true,  accept:".stl,.obj", hint:"STL from any IOS" },
    { id:"bite",  label:"Bite registration", req:false, accept:".stl,.obj", hint:"Improves occlusal accuracy" },
    { id:"prep",  label:"Prep scan",         req:false, accept:".stl,.obj", hint:"Post-prep retracted scan" },
  ],
  mockup: [
    { id:"face-r",  label:"Face — repose",    req:true,  accept:".jpg,.png,.heic", hint:"Lips relaxed, natural light" },
    { id:"face-s",  label:"Face — smile",     req:true,  accept:".jpg,.png,.heic", hint:"Full smile" },
    { id:"retract", label:"Retracted frontal",req:true,  accept:".jpg,.png,.heic", hint:"Cheek retractors in" },
    { id:"lat-r",   label:"Lateral right",    req:false, accept:".jpg,.png,.heic", hint:"Optional" },
  ],
  implant: [
    { id:"upper", label:"Upper arch + scan body",req:true, accept:".stl,.obj", hint:"Scan body must be placed" },
    { id:"lower", label:"Lower arch scan",       req:true, accept:".stl,.obj", hint:"STL from any IOS" },
    { id:"cbct",  label:"CBCT / DICOM",          req:false,accept:".dcm,.zip",  hint:"Required for guided surgery" },
    { id:"bite",  label:"Bite registration",     req:false,accept:".stl,.obj",  hint:"Optional" },
  ],
};

// ── Auto-detect ───────────────────────────────────────────────────
function detect(files) {
  const exts = files.map(f => f.name.split(".").pop()?.toLowerCase() || "");
  const names = files.map(f => f.name.toLowerCase());
  if (exts.some(e => e === "dcm") || names.some(n => n.includes("cbct") || n.includes("implant") || n.includes("scanbody")))
    return { mode:"implant", sys:"lab",   conf:92, reason:"CBCT/scan body detected → Lab CAD" };
  if (exts.every(e => ["jpg","jpeg","png","heic"].includes(e)))
    return { mode:"mockup",  sys:"smile", conf:90, reason:"Photo set detected → Smile Design" };
  if (exts.some(e => ["stl","obj"].includes(e)))
    return { mode:"prep",    sys:"mill",  conf:85, reason:"Arch scans detected → Mill Connect" };
  return       { mode:"prep",    sys:"mill",  conf:50, reason:"Unknown files — defaulting to Prep" };
}

function autoAssign(files, slots) {
  const used = new Set(), out = {};
  slots.forEach(slot => {
    const f = files.find(f => !used.has(f.name) && (() => {
      const n = f.name.toLowerCase(), ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (!slot.accept.includes(ext)) return false;
      if (slot.id === "upper" && (n.includes("upper") || n.includes("max"))) return true;
      if (slot.id === "lower" && (n.includes("lower") || n.includes("mand"))) return true;
      if (slot.id === "bite"  && (n.includes("bite") || n.includes("reg"))) return true;
      if (slot.id === "prep"  && (n.includes("prep") || n.includes("crown"))) return true;
      if (slot.id.startsWith("face") && n.match(/face|facial/)) return true;
      if (slot.id === "retract" && n.includes("retract")) return true;
      return !out[slot.id]; // fill remaining empties
    })());
    if (f) { out[slot.id] = f; used.add(f.name); }
  });
  // fill any unmatched remaining
  files.forEach(f => {
    if (!used.has(f.name)) {
      const empty = slots.find(s => !out[s.id]);
      if (empty) { out[empty.id] = f; used.add(f.name); }
    }
  });
  return out;
}

const fmt = b => b > 1048576 ? (b/1048576).toFixed(1)+"MB" : (b/1024).toFixed(0)+"KB";

// ── Components ────────────────────────────────────────────────────
function Tag({ label, color=C.teal, dim="rgba(0,180,138,.1)" }) {
  return <span style={{ padding:"2px 7px", borderRadius:3, fontSize:9, fontWeight:700, letterSpacing:.8, background:dim, color, border:`1px solid ${color}25`, fontFamily:C.font }}>{label}</span>;
}

function Btn({ children, onClick, disabled, variant="primary", style={} }) {
  const base = { padding:"10px 18px", borderRadius:6, fontSize:12, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:C.sans, border:"none", transition:"all .15s", letterSpacing:.3, ...style };
  const v = {
    primary:{ background:disabled?"#1a2029":C.teal, color:disabled?C.muted:"white", boxShadow:disabled?"none":"0 4px 12px rgba(0,180,138,.25)" },
    ghost:  { background:"transparent", color:C.muted, border:`1px solid ${C.border}` },
    sys:    { background:C.teal, color:"white", boxShadow:"0 4px 14px rgba(0,180,138,.3)" },
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}}>{children}</button>;
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
export default function DesignBridge() {
  const [phase, setPhase]   = useState("drop");    // drop | review | sending | done
  const [mode, setMode]     = useState("prep");
  const [sysKey, setSysKey] = useState("mill");
  const [slots, setSlots]   = useState({});         // {slotId: File}
  const [det, setDet]       = useState(null);        // detection result
  const [drag, setDrag]     = useState(false);
  const [tooth, setTooth]   = useState("8, 9");
  const [restType, setRest] = useState("Crown");
  const [note, setNote]     = useState("");
  const [progress, setProg] = useState(0);
  const [countdown, setCt]  = useState(null);
  const ctRef = useRef(null);

  const sys      = SYSTEMS[sysKey];
  const slotDefs = SLOT_SETS[mode] || [];
  const reqTotal = slotDefs.filter(s => s.req).length;
  const reqDone  = slotDefs.filter(s => s.req && slots[s.id]).length;
  const uploaded = Object.keys(slots).length;
  const canSend  = reqDone >= reqTotal && reqTotal > 0;

  const restOpts = mode==="implant" ? ["Implant Crown","Implant Bridge","Bar","Full Arch Zirconia"]
                 : mode==="mockup"  ? ["Smile Mockup","Digital Wax-Up"]
                 :                    ["Crown","Veneer","Onlay","Inlay","Bridge"];

  // Auto countdown when required slots filled
  useEffect(() => {
    if (phase !== "review" || !canSend) { clearInterval(ctRef.current); setCt(null); return; }
    let t = 5; setCt(t);
    ctRef.current = setInterval(() => {
      t -= 1;
      if (t <= 0) { clearInterval(ctRef.current); setCt(null); doSend(); }
      else setCt(t);
    }, 1000);
    return () => clearInterval(ctRef.current);
  }, [canSend, phase]);

  function ingest(files) {
    const arr = Array.from(files);
    const d = detect(arr);
    const sl = SLOT_SETS[d.mode] || [];
    setMode(d.mode); setSysKey(d.sys); setDet(d);
    setSlots(autoAssign(arr, sl));
    setPhase("review");
  }

  function loadSamples() {
    const files = SAMPLES.map(s => b64ToFile(s.name, SAMPLE_B64[s.name]));
    ingest(files);
  }

  function doSend() {
    clearInterval(ctRef.current); setCt(null);
    setPhase("sending"); setProg(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 5;
      if (p >= 100) { clearInterval(iv); setProg(100); setTimeout(() => setPhase("done"), 500); }
      else setProg(Math.round(p));
    }, 280);
  }

  function reset() {
    clearInterval(ctRef.current);
    setPhase("drop"); setSlots({}); setDet(null); setProg(0); setCt(null);
    setMode("prep"); setSysKey("mill"); setNote("");
  }

  // ─────────────────────────────────────────────────────────────────
  // DROP SCREEN
  // ─────────────────────────────────────────────────────────────────
  if (phase === "drop") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, padding:"28px 32px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
        <span style={{ fontSize:10, fontFamily:C.font, color:C.teal, letterSpacing:3 }}>DESIGN SYSTEMS BRIDGE</span>
        <div style={{ flex:1 }} />
        {[["mill","◈",C.blue],["smile","◉",C.amber],["lab","⬡",C.purple]].map(([k,ic,col]) => (
          <div key={k} style={{ display:"flex", gap:5, alignItems:"center", padding:"3px 10px", borderRadius:4, border:`1px solid ${col}30`, background:col+"0a" }}>
            <span style={{ fontSize:11, color:col }}>{ic}</span>
            <span style={{ fontSize:10, color:col, fontFamily:C.font }}>{SYSTEMS[k].name}</span>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files;if(f.length)ingest(f);}}
        style={{ border:`2px dashed ${drag?C.teal:C.tealBorder}`, borderRadius:14, padding:"48px 32px",
          textAlign:"center", background:drag?C.tealDim:"transparent", transition:"all .2s", cursor:"pointer", marginBottom:28 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚡</div>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Drop case files here</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:22, lineHeight:1.7 }}>
          STL arch scans · DICOM/CBCT · Patient photos<br/>
          <span style={{ color:C.teal, fontWeight:600 }}>Auto-detects</span> case type and routes to the right system
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <label style={{ padding:"10px 22px", borderRadius:7, fontSize:12, fontWeight:700, background:C.teal, color:"white", cursor:"pointer" }}>
            Browse files
            <input type="file" multiple accept=".stl,.obj,.dcm,.jpg,.jpeg,.png,.heic" style={{ display:"none" }}
              onChange={e=>{const f=e.target.files;if(f?.length)ingest(f);}} />
          </label>
          <button onClick={loadSamples} style={{ padding:"10px 22px", borderRadius:7, fontSize:12, fontWeight:700,
            border:`1px solid ${C.tealBorder}`, background:C.tealDim, color:C.teal, cursor:"pointer", fontFamily:C.sans }}>
            ⬇ Load sample STL files
          </button>
        </div>
      </div>

      {/* Sample file list (preview) */}
      <div style={{ marginBottom:28, padding:16, borderRadius:8, background:C.surface, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:12 }}>SAMPLE FILES INCLUDED</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {SAMPLES.map(s => (
            <div key={s.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
              borderRadius:6, background:C.surface2, border:`1px solid ${C.border}` }}>
              <span style={{ fontSize:16, color:C.teal }}>{s.icon}</span>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{s.label}</div>
                <div style={{ fontSize:10, color:C.muted }}>{s.name} · {fmt(s.size)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual case type */}
      <div style={{ fontSize:11, color:C.muted, marginBottom:12, letterSpacing:.5 }}>OR SELECT CASE TYPE MANUALLY</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[["prep","Prep Restoration","🦷","Arch scans · STL"],["mockup","Smile Mockup","😊","Patient photos"],["implant","Implant","🔩","Arch + CBCT"]].map(([m,label,icon,hint]) => (
          <button key={m} onClick={() => { setMode(m); setSysKey(m==="mockup"?"smile":m==="implant"?"lab":"mill"); setSlots({}); setDet(null); setPhase("review"); }}
            style={{ padding:"16px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:C.surface,
              cursor:"pointer", fontFamily:C.sans, textAlign:"left", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
            <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:10, color:C.muted }}>{hint}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // REVIEW SCREEN
  // ─────────────────────────────────────────────────────────────────
  if (phase === "review") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      {/* Header bar */}
      <div style={{ height:50, display:"flex", alignItems:"center", padding:"0 24px", gap:14,
        borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
        <button onClick={reset} style={{ fontSize:12, color:C.muted, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:C.sans }}>← New case</button>
        <span style={{ width:1, height:16, background:C.border }} />
        {det && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, fontFamily:C.font, color:C.teal, letterSpacing:2 }}>⚡ AUTO</span>
            <span style={{ fontSize:11, color:C.muted }}>{det.reason}</span>
            <Tag label={det.conf+"%"} color={C.teal} dim={C.tealDim} />
          </div>
        )}
        <div style={{ flex:1 }} />
        {countdown !== null && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 12px", borderRadius:5,
            background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)" }}>
            <span style={{ fontSize:11, color:C.warn }}>Auto-sending in <strong>{countdown}s</strong></span>
            <button onClick={()=>{clearInterval(ctRef.current);setCt(null);}} style={{ fontSize:10, color:C.warn, background:"none",
              border:"1px solid rgba(245,158,11,.3)", borderRadius:3, padding:"2px 8px", cursor:"pointer", fontFamily:C.sans }}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", height:"calc(100vh - 50px)" }}>
        {/* LEFT: file slots */}
        <div style={{ padding:24, overflow:"auto" }}>
          {/* Quick case info — at the top */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>TOOTH #</div>
              <input value={tooth} onChange={e=>setTooth(e.target.value)} style={{ width:"100%", padding:"9px 12px", borderRadius:6, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.font, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>RESTORATION</div>
              <select value={restType} onChange={e=>setRest(e.target.value)} style={{ width:"100%", padding:"9px 12px", borderRadius:6, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                {restOpts.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>SEND TO</div>
              <div style={{ display:"flex", gap:4 }}>
                {Object.entries(SYSTEMS).map(([k,s]) => (
                  <button key={k} onClick={()=>setSysKey(k)} style={{ flex:1, padding:"7px 4px", borderRadius:6, border:`1px solid ${sysKey===k?s.color:C.border}`,
                    background:sysKey===k?s.color+"15":"transparent", cursor:"pointer", fontFamily:C.sans, fontSize:9, color:sysKey===k?s.color:C.muted,
                    fontWeight:sysKey===k?700:400, transition:"all .15s", lineHeight:1.4 }}>
                    {s.icon}<br/>{s.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:3, background:C.border, borderRadius:2 }}>
              <div style={{ height:"100%", borderRadius:2, background:C.teal,
                width:slotDefs.length?`${(uploaded/slotDefs.length)*100}%`:"0%", transition:"width .3s" }} />
            </div>
            <span style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{uploaded}/{slotDefs.length} files · {reqDone}/{reqTotal} required</span>
          </div>

          {/* Slots */}
          {slotDefs.map(slot => {
            const f = slots[slot.id];
            return (
              <div key={slot.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
                borderRadius:8, border:`1px solid ${f?C.teal+"60":slot.req?C.border:C.soft}`,
                background:f?C.tealDim:C.surface, marginBottom:8, transition:"all .2s" }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:f?14:18, background:f?C.teal:C.surface2, color:f?"white":C.light }}>
                  {f?"✓":"↑"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:f?C.ink:C.muted }}>{slot.label}</span>
                    {slot.req && !f && <Tag label="REQUIRED" color={C.warn} dim="rgba(245,158,11,.08)" />}
                    {slot.req && f  && <Tag label="✓" color={C.green} dim="rgba(34,197,94,.08)" />}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {f ? `${f.name}  ·  ${fmt(f.size)}` : slot.hint}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {f && (
                    <button onClick={()=>setSlots(p=>{const n={...p};delete n[slot.id];return n;})}
                      style={{ padding:"4px 8px", borderRadius:4, fontSize:10, border:"1px solid rgba(239,68,68,.2)", background:"rgba(239,68,68,.06)", color:C.red, cursor:"pointer", fontFamily:C.sans }}>✕</button>
                  )}
                  <label style={{ padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:600, border:`1px solid ${f?C.tealBorder:C.border}`, color:f?C.teal:C.muted, background:"transparent", cursor:"pointer", whiteSpace:"nowrap" }}>
                    {f?"Replace":"Upload"}
                    <input type="file" accept={slot.accept} style={{ display:"none" }}
                      onChange={e=>{const fl=e.target.files?.[0];if(fl)setSlots(p=>({...p,[slot.id]:fl}));}} />
                  </label>
                </div>
              </div>
            );
          })}

          {/* Note */}
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
            placeholder="Lab notes, shade details, special instructions…"
            style={{ width:"100%", marginTop:8, padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`,
              background:C.surface, color:C.ink, fontSize:12, fontFamily:C.sans, outline:"none", resize:"none", boxSizing:"border-box" }} />

          {/* Quick load samples button (also in review) */}
          <button onClick={loadSamples} style={{ marginTop:10, width:"100%", padding:"9px", borderRadius:6, fontSize:11,
            border:`1px solid ${C.tealBorder}`, background:C.tealDim, color:C.teal, cursor:"pointer", fontFamily:C.sans }}>
            ⬇ Load all sample STL files
          </button>
        </div>

        {/* RIGHT: send panel */}
        <div style={{ background:C.surface, borderLeft:`1px solid ${C.border}`, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {/* System card */}
          <div style={{ padding:16, borderRadius:8, border:`1px solid ${sys.color}40`, background:sys.dim }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:22, color:sys.color }}>{sys.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{sys.name}</div>
                <div style={{ fontSize:10, color:C.muted }}>{sys.tag}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{sys.desc}</div>
          </div>

          {/* Summary */}
          <div style={{ padding:14, borderRadius:8, background:C.surface2, border:`1px solid ${C.border}` }}>
            {[["Tooth",tooth||"—"],["Restoration",restType],["Format","STL"],["Loaded",`${uploaded} file${uploaded!==1?"s":""}`]].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.soft}`, fontSize:11 }}>
                <span style={{ color:C.muted }}>{l}</span>
                <span style={{ color:C.ink, fontFamily:C.font }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          <div>
            <div style={{ height:4, borderRadius:2, background:C.surface2, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:2, background:C.teal, width:`${reqTotal?Math.round((reqDone/reqTotal)*100):0}%`, transition:"width .3s" }} />
            </div>
            <div style={{ fontSize:10, color:C.muted, textAlign:"center", marginTop:4 }}>{reqDone}/{reqTotal} required files</div>
          </div>

          <button onClick={doSend} disabled={!canSend} style={{ padding:"14px", borderRadius:8, fontSize:13,
            fontWeight:700, border:"none", fontFamily:C.sans,
            background:canSend?sys.color:"#1a2029", color:canSend?"white":C.light,
            cursor:canSend?"pointer":"not-allowed",
            boxShadow:canSend?`0 4px 16px ${sys.color}40`:"none", transition:"all .2s" }}>
            Send to {sys.name} →
          </button>
          {!canSend && <div style={{ fontSize:11, color:C.muted, textAlign:"center" }}>Upload {reqTotal-reqDone} more required file{reqTotal-reqDone!==1?"s":""}</div>}

          <div style={{ marginTop:"auto", padding:"10px 0", borderTop:`1px solid ${C.border}`, fontSize:10, color:C.light, lineHeight:1.6 }}>
            HIPAA · AES-256 end-to-end<br/>All transfers encrypted · BAA
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // SENDING
  // ─────────────────────────────────────────────────────────────────
  if (phase === "sending") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:400, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:16, color:sys.color }}>{sys.icon}</div>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Sending to {sys.name}…</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:28 }}>{uploaded} file{uploaded!==1?"s":""} · {tooth} · {restType}</div>
        <div style={{ height:6, borderRadius:3, background:C.surface2, overflow:"hidden", marginBottom:10 }}>
          <div style={{ height:"100%", borderRadius:3, background:sys.color, width:`${progress}%`, transition:"width .3s ease" }} />
        </div>
        <div style={{ fontSize:12, fontFamily:C.font, color:sys.color }}>{progress}%</div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:480 }}>
        <div style={{ padding:28, borderRadius:12, border:`1px solid ${sys.color}40`, background:sys.dim, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>✓</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Sent to {sys.name}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Tooth {tooth} · {restType} · {uploaded} file{uploaded!==1?"s":""}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>alert(`Opening design in ${sys.name}…`)} style={{ padding:"12px", borderRadius:7, fontSize:12, fontWeight:700, border:"none", background:sys.color, color:"white", cursor:"pointer", fontFamily:C.sans }}>
              Open in {sys.name} ↗
            </button>
            <button onClick={()=>alert("Importing design into Restora 3D viewer…")} style={{ padding:"12px", borderRadius:7, fontSize:12, fontWeight:600, border:`1px solid ${sys.color}50`, background:"transparent", color:sys.color, cursor:"pointer", fontFamily:C.sans }}>
              Import → Restora
            </button>
          </div>
        </div>
        {/* Files sent summary */}
        <div style={{ padding:16, borderRadius:10, background:C.surface, border:`1px solid ${C.border}`, marginBottom:12 }}>
          <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:10 }}>FILES SENT</div>
          {Object.entries(slots).map(([id, f]) => (
            <div key={id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.soft}`, fontSize:11 }}>
              <span style={{ color:C.muted }}>{f.name}</span>
              <span style={{ color:C.ink, fontFamily:C.font }}>{fmt(f.size)}</span>
            </div>
          ))}
          {note && <div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:"italic" }}>Note: {note}</div>}
        </div>
        <button onClick={reset} style={{ width:"100%", padding:"12px", borderRadius:7, fontSize:12, fontWeight:600, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontFamily:C.sans }}>
          ↺ New case
        </button>
      </div>
    </div>
  );
}
