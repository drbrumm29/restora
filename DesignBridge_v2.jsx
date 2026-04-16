import { useState, useRef, useEffect } from "react";
import { DENTAL_CASES } from "./src/dental-cases.js";

const C = {
  bg:"#f0fbfa", surface:"#ffffff", surface2:"#e8f8f7", surface3:"#d4f0ee",
  border:"#b2e0dd", soft:"#ccecea",
  ink:"#0d2b2a", muted:"#4a7674", light:"#7aaeac",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.1)", tealBorder:"rgba(10,186,181,.3)",
  gold:"#b8860b", goldDim:"rgba(184,134,11,.08)",
  amber:"#d97706", amberDim:"rgba(217,119,6,.08)",
  purple:"#7c3aed", purpleDim:"rgba(124,58,237,.08)",
  blue:"#0891b2", blueDim:"rgba(8,145,178,.08)",
  red:"#dc2626", green:"#059669", warn:"#d97706",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,sans-serif",
};

const SYSTEMS = {
  mill:  { name:"Mill Connect", icon:"◈", color:C.blue,   dim:C.blueDim,   tag:"In-Office CAD/CAM",  desc:"Arch scans → AI crown design → mill unit. Same-day delivery." },
  smile: { name:"Smile Design", icon:"◉", color:C.amber,  dim:C.amberDim,  tag:"Photo-Based DSD",    desc:"Photos → cloud smile design → overlay + dimensions to Restora." },
  lab:   { name:"Lab CAD",      icon:"⬡", color:C.purple, dim:C.purpleDim, tag:"Full Lab Design",     desc:"Full package to lab — bridges, implant bars, full arch prosthetics." },
};

const SLOT_SETS = {
  prep: [
    { id:"upper", label:"Upper arch scan",   req:true,  accept:".stl,.obj", hint:"STL from any IOS" },
    { id:"lower", label:"Lower arch scan",   req:true,  accept:".stl,.obj", hint:"STL from any IOS" },
    { id:"bite",  label:"Bite registration", req:false, accept:".stl,.obj", hint:"Improves occlusal accuracy" },
    { id:"prep",  label:"Prep scan",         req:false, accept:".stl,.obj", hint:"Post-prep retracted scan" },
    { id:"prep2", label:"Prep scan 2",       req:false, accept:".stl,.obj", hint:"Additional prep (optional)" },
  ],
  mockup: [
    { id:"face-r",  label:"Face — repose",     req:true,  accept:".jpg,.png,.heic", hint:"Lips relaxed, natural light" },
    { id:"face-s",  label:"Face — smile",      req:true,  accept:".jpg,.png,.heic", hint:"Full smile" },
    { id:"retract", label:"Retracted frontal", req:true,  accept:".jpg,.png,.heic", hint:"Cheek retractors in" },
    { id:"lat-r",   label:"Lateral right",     req:false, accept:".jpg,.png,.heic", hint:"Optional" },
  ],
  implant: [
    { id:"upper", label:"Upper arch scan",       req:true,  accept:".stl,.obj", hint:"Full maxillary arch" },
    { id:"lower", label:"Lower arch + scan body",req:true,  accept:".stl,.obj", hint:"Scan body must be in place" },
    { id:"crown", label:"Implant crown STL",     req:false, accept:".stl,.obj", hint:"Crown design file" },
    { id:"cbct",  label:"CBCT / DICOM",          req:false, accept:".dcm,.zip",  hint:"Required for guided surgery" },
    { id:"bite",  label:"Bite registration",     req:false, accept:".stl,.obj",  hint:"Optional" },
  ],
};

function detect(files) {
  const exts = files.map(f => f.name.split(".").pop()?.toLowerCase() || "");
  const names = files.map(f => f.name.toLowerCase());
  if (exts.some(e=>e==="dcm") || names.some(n=>n.includes("cbct")||n.includes("implant")||n.includes("scanbody")||n.includes("implant_crown")))
    return { mode:"implant", sys:"lab",   conf:92, reason:"Implant crown / scan body detected → Lab CAD" };
  if (exts.every(e=>["jpg","jpeg","png","heic"].includes(e)))
    return { mode:"mockup",  sys:"smile", conf:90, reason:"Photo set detected → Smile Design" };
  if (exts.some(e=>["stl","obj"].includes(e)))
    return { mode:"prep",    sys:"mill",  conf:85, reason:"Arch scans detected → Mill Connect" };
  return       { mode:"prep",    sys:"mill",  conf:50, reason:"Unknown — defaulting to Prep / Mill Connect" };
}

function autoAssign(files, slots) {
  const used = new Set(), out = {};
  slots.forEach(slot => {
    const f = files.find(f => {
      if (used.has(f.name)) return false;
      const n = f.name.toLowerCase(), ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (!slot.accept.includes(ext)) return false;
      if (slot.id==="upper" && (n.includes("upper")||n.includes("max"))) return true;
      if (slot.id==="lower" && (n.includes("lower")||n.includes("mand")||n.includes("scanbody"))) return true;
      if (slot.id==="bite"  && (n.includes("bite")||n.includes("reg"))) return true;
      if ((slot.id==="prep"||slot.id==="prep2") && (n.includes("prep"))) return true;
      if (slot.id==="crown" && (n.includes("crown")||n.includes("implant_crown"))) return true;
      if (slot.id.startsWith("face") && n.match(/face|facial/)) return true;
      if (slot.id==="retract" && n.includes("retract")) return true;
      if (!out[slot.id]) return true;
      return false;
    });
    if (f) { out[slot.id] = f; used.add(f.name); }
  });
  files.forEach(f => {
    if (!used.has(f.name)) {
      const empty = slots.find(s => !out[s.id]);
      if (empty) { out[empty.id] = f; used.add(f.name); }
    }
  });
  return out;
}

function b64ToFile(name, b64, size) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type:"model/stl", lastModified: Date.now() });
}

const fmt = b => b > 1048576 ? (b/1048576).toFixed(1)+"MB" : (b/1024).toFixed(0)+"KB";

function Tag({ label, color=C.teal, dim="rgba(10,186,181,.1)" }) {
  return <span style={{ padding:"2px 7px", borderRadius:3, fontSize:9, fontWeight:700, letterSpacing:.8, background:dim, color, border:`1px solid ${color}30`, fontFamily:C.font }}>{label}</span>;
}

export default function DesignBridge() {
  const [phase, setPhase]   = useState("drop");
  const [mode, setMode]     = useState("prep");
  const [sysKey, setSysKey] = useState("mill");
  const [slots, setSlots]   = useState({});
  const [det, setDet]       = useState(null);
  const [drag, setDrag]     = useState(false);
  const [tooth, setTooth]   = useState("");
  const [restType, setRest] = useState("Crown");
  const [note, setNote]     = useState("");
  const [progress, setProg] = useState(0);
  const [countdown, setCt]  = useState(null);
  const [loadingCase, setLoading] = useState(null);
  const ctRef = useRef(null);

  const sys      = SYSTEMS[sysKey];
  const slotDefs = SLOT_SETS[mode] || [];
  const reqTotal = slotDefs.filter(s=>s.req).length;
  const reqDone  = slotDefs.filter(s=>s.req&&slots[s.id]).length;
  const uploaded = Object.keys(slots).length;
  const canSend  = reqDone >= reqTotal && reqTotal > 0;

  const restOpts = mode==="implant" ? ["Implant Crown","Implant Bridge","Bar","Full Arch Zirconia"]
                 : mode==="mockup"  ? ["Smile Mockup","Digital Wax-Up"]
                 :                    ["Crown","Veneer","Onlay","Inlay","Bridge"];

  useEffect(() => {
    if (phase!=="review"||!canSend) { clearInterval(ctRef.current); setCt(null); return; }
    let t=5; setCt(t);
    ctRef.current = setInterval(()=>{ t-=1; if(t<=0){clearInterval(ctRef.current);setCt(null);doSend();}else setCt(t); },1000);
    return ()=>clearInterval(ctRef.current);
  }, [canSend, phase]);

  function ingest(files) {
    const arr = Array.from(files);
    const d = detect(arr);
    setMode(d.mode); setSysKey(d.sys); setDet(d);
    setSlots(autoAssign(arr, SLOT_SETS[d.mode]||[]));
    setPhase("review");
  }

  function loadCase(dc) {
    setLoading(dc.id);
    setTimeout(() => {
      const files = dc.files.map(f => b64ToFile(f.name, f.b64, f.size));
      const d = detect(files);
      // Override with case type
      const m = dc.type || d.mode;
      const s = m==="implant" ? "lab" : d.sys;
      setMode(m); setSysKey(s);
      setDet({ ...d, mode:m, sys:s, reason:`${dc.label} loaded` });
      setSlots(autoAssign(files, SLOT_SETS[m]||[]));
      setTooth(dc.id==="case1"?"8, 9":dc.id==="case2"?"30":"19");
      setRest(dc.id==="case3"?"Implant Crown":dc.id==="case1"?"Veneer":"Crown");
      setNote(dc.description);
      setLoading(null);
      setPhase("review");
    }, 400);
  }

  function doSend() {
    clearInterval(ctRef.current); setCt(null);
    setPhase("sending"); setProg(0);
    let p=0;
    const iv=setInterval(()=>{ p+=Math.random()*14+5; if(p>=100){clearInterval(iv);setProg(100);setTimeout(()=>setPhase("done"),500);}else setProg(Math.round(p)); },280);
  }

  function reset() {
    clearInterval(ctRef.current);
    setPhase("drop"); setSlots({}); setDet(null); setProg(0); setCt(null);
    setMode("prep"); setSysKey("mill"); setNote(""); setTooth(""); setRest("Crown");
  }

  // ── CASE PICKER ROW ──────────────────────────────────────────────
  const CasePicker = () => (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, marginBottom:12, textTransform:"uppercase" }}>Load a sample case</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {DENTAL_CASES.map(dc => (
          <button key={dc.id} onClick={()=>loadCase(dc)} disabled={!!loadingCase}
            style={{ padding:16, borderRadius:10, border:`1.5px solid ${C.tealBorder}`, background:C.surface,
              cursor:loadingCase?"wait":"pointer", fontFamily:C.sans, textAlign:"left", transition:"all .15s",
              boxShadow:`0 2px 8px rgba(10,186,181,.08)` }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.tealDim; e.currentTarget.style.borderColor=C.teal;}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surface; e.currentTarget.style.borderColor=C.tealBorder;}}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <Tag label={dc.type==="implant"?"IMPLANT":dc.type==="mockup"?"MOCKUP":"PREP RESTORATION"} color={dc.type==="implant"?C.purple:dc.type==="mockup"?C.amber:C.teal} dim={dc.type==="implant"?C.purpleDim:dc.type==="mockup"?C.amberDim:C.tealDim} />
              <span style={{ fontSize:9, color:C.muted, fontFamily:C.font }}>{dc.files.length} files</span>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:3 }}>
              {loadingCase===dc.id ? "Loading…" : dc.label}
            </div>
            <div style={{ fontSize:10, color:C.muted, lineHeight:1.5 }}>{dc.description}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── DROP SCREEN ──────────────────────────────────────────────────
  if (phase==="drop") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, padding:"28px 32px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <span style={{ fontSize:10, fontFamily:C.font, color:C.teal, letterSpacing:3 }}>DESIGN SYSTEMS BRIDGE</span>
        <div style={{ flex:1 }}/>
        {Object.entries(SYSTEMS).map(([k,s])=>(
          <div key={k} style={{ display:"flex", gap:5, alignItems:"center", padding:"3px 10px", borderRadius:4, border:`1px solid ${s.color}30`, background:s.color+"0a" }}>
            <span style={{ fontSize:11, color:s.color }}>{s.icon}</span>
            <span style={{ fontSize:10, color:s.color, fontFamily:C.font }}>{s.name}</span>
          </div>
        ))}
      </div>

      <CasePicker />

      <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginBottom:14, letterSpacing:.3 }}>— or drop your own files —</div>

      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files;if(f.length)ingest(f);}}
        style={{ border:`2px dashed ${drag?C.teal:C.tealBorder}`, borderRadius:12, padding:"36px 32px",
          textAlign:"center", background:drag?C.tealDim:"transparent", transition:"all .2s", marginBottom:20 }}>
        <div style={{ fontSize:28, marginBottom:10 }}>⚡</div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Drop files here</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>STL arch scans · DICOM · Photos — auto-detected</div>
        <label style={{ padding:"9px 20px", borderRadius:6, fontSize:12, fontWeight:700, background:C.teal, color:"white", cursor:"pointer" }}>
          Browse files
          <input type="file" multiple accept=".stl,.obj,.dcm,.jpg,.jpeg,.png,.heic" style={{ display:"none" }}
            onChange={e=>{const f=e.target.files;if(f?.length)ingest(f);}}/>
        </label>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[["prep","Prep Restoration","🦷","Arch scans · STL"],["mockup","Smile Mockup","😊","Patient photos"],["implant","Implant","🔩","Arch + CBCT"]].map(([m,label,icon,hint])=>(
          <button key={m} onClick={()=>{setMode(m);setSysKey(m==="mockup"?"smile":m==="implant"?"lab":"mill");setSlots({});setDet(null);setPhase("review");}}
            style={{ padding:"14px 12px", borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontFamily:C.sans, textAlign:"left", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealDim;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
            <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:2 }}>{label}</div>
            <div style={{ fontSize:10, color:C.muted }}>{hint}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── REVIEW SCREEN ────────────────────────────────────────────────
  if (phase==="review") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      <div style={{ height:50, display:"flex", alignItems:"center", padding:"0 24px", gap:14, borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
        <button onClick={reset} style={{ fontSize:12, color:C.muted, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:C.sans }}>← New case</button>
        <span style={{ width:1, height:16, background:C.border }}/>
        {det&&<div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, fontFamily:C.font, color:C.teal, letterSpacing:2 }}>⚡ AUTO</span>
          <span style={{ fontSize:11, color:C.muted }}>{det.reason}</span>
          <Tag label={det.conf+"%"} color={C.teal} dim={C.tealDim}/>
        </div>}
        <div style={{ flex:1 }}/>
        {countdown!==null&&(
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 12px", borderRadius:5, background:"rgba(217,119,6,.08)", border:"1px solid rgba(217,119,6,.2)" }}>
            <span style={{ fontSize:11, color:C.warn }}>Auto-sending in <strong>{countdown}s</strong></span>
            <button onClick={()=>{clearInterval(ctRef.current);setCt(null);}} style={{ fontSize:10, color:C.warn, background:"none", border:"1px solid rgba(217,119,6,.3)", borderRadius:3, padding:"2px 8px", cursor:"pointer", fontFamily:C.sans }}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", height:"calc(100vh - 50px)" }}>
        <div style={{ padding:24, overflow:"auto" }}>
          {/* Quick info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>TOOTH #</div>
              <input value={tooth} onChange={e=>setTooth(e.target.value)} style={{ width:"100%", padding:"9px 12px", borderRadius:6, border:`1px solid ${C.border}`, background:C.surface, color:C.ink, fontSize:13, fontFamily:C.font, outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>RESTORATION</div>
              <select value={restType} onChange={e=>setRest(e.target.value)} style={{ width:"100%", padding:"9px 12px", borderRadius:6, border:`1px solid ${C.border}`, background:C.surface, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none" }}>
                {restOpts.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:6 }}>SEND TO</div>
              <div style={{ display:"flex", gap:4 }}>
                {Object.entries(SYSTEMS).map(([k,s])=>(
                  <button key={k} onClick={()=>setSysKey(k)} style={{ flex:1, padding:"7px 4px", borderRadius:6, border:`1px solid ${sysKey===k?s.color:C.border}`, background:sysKey===k?s.color+"15":"transparent", cursor:"pointer", fontFamily:C.sans, fontSize:9, color:sysKey===k?s.color:C.muted, fontWeight:sysKey===k?700:400, transition:"all .15s", lineHeight:1.4 }}>
                    {s.icon}<br/>{s.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:3, background:C.border, borderRadius:2 }}>
              <div style={{ height:"100%", borderRadius:2, background:C.teal, width:slotDefs.length?`${(uploaded/slotDefs.length)*100}%`:"0%", transition:"width .3s" }}/>
            </div>
            <span style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{uploaded}/{slotDefs.length} files · {reqDone}/{reqTotal} required</span>
          </div>

          {/* Slots */}
          {slotDefs.map(slot=>{
            const f=slots[slot.id];
            return (
              <div key={slot.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:8, border:`1px solid ${f?C.teal+"60":slot.req?C.border:C.soft}`, background:f?C.tealDim:C.surface, marginBottom:8, transition:"all .2s" }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:f?14:18, background:f?C.teal:C.surface2, color:f?"white":C.light }}>
                  {f?"✓":"↑"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:f?C.ink:C.muted }}>{slot.label}</span>
                    {slot.req&&!f&&<Tag label="REQUIRED" color={C.warn} dim="rgba(217,119,6,.08)"/>}
                    {slot.req&&f &&<Tag label="✓" color={C.green} dim="rgba(5,150,105,.08)"/>}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {f?`${f.name}  ·  ${fmt(f.size)}`:slot.hint}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {f&&<button onClick={()=>setSlots(p=>{const n={...p};delete n[slot.id];return n;})} style={{ padding:"4px 8px", borderRadius:4, fontSize:10, border:"1px solid rgba(220,38,38,.2)", background:"rgba(220,38,38,.05)", color:C.red, cursor:"pointer", fontFamily:C.sans }}>✕</button>}
                  <label style={{ padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:600, border:`1px solid ${f?C.tealBorder:C.border}`, color:f?C.teal:C.muted, background:"transparent", cursor:"pointer", whiteSpace:"nowrap" }}>
                    {f?"Replace":"Upload"}
                    <input type="file" accept={slot.accept} style={{ display:"none" }} onChange={e=>{const fl=e.target.files?.[0];if(fl)setSlots(p=>({...p,[slot.id]:fl}));}}/>
                  </label>
                </div>
              </div>
            );
          })}

          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Lab notes, shade, special instructions…"
            style={{ width:"100%", marginTop:8, padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface, color:C.ink, fontSize:12, fontFamily:C.sans, outline:"none", resize:"none", boxSizing:"border-box" }}/>
        </div>

        {/* Right panel */}
        <div style={{ background:C.surface, borderLeft:`1px solid ${C.border}`, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
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

          <div style={{ padding:14, borderRadius:8, background:C.surface2, border:`1px solid ${C.border}` }}>
            {[["Tooth",tooth||"—"],["Restoration",restType],["Files loaded",`${uploaded}`],["Required",`${reqDone}/${reqTotal}`]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.soft}`, fontSize:11 }}>
                <span style={{ color:C.muted }}>{l}</span>
                <span style={{ color:C.ink, fontFamily:C.font }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ height:4, borderRadius:2, background:C.surface2, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:2, background:C.teal, width:`${reqTotal?Math.round((reqDone/reqTotal)*100):0}%`, transition:"width .3s" }}/>
          </div>

          <button onClick={doSend} disabled={!canSend} style={{ padding:"14px", borderRadius:8, fontSize:13, fontWeight:700, border:"none", fontFamily:C.sans, background:canSend?sys.color:"#d4efee", color:canSend?"white":C.light, cursor:canSend?"pointer":"not-allowed", boxShadow:canSend?`0 4px 16px ${sys.color}40`:"none", transition:"all .2s" }}>
            Send to {sys.name} →
          </button>
          {!canSend&&<div style={{ fontSize:11, color:C.muted, textAlign:"center" }}>Upload {reqTotal-reqDone} more required file{reqTotal-reqDone!==1?"s":""}</div>}

          <div style={{ marginTop:"auto", padding:"10px 0", borderTop:`1px solid ${C.border}`, fontSize:10, color:C.light, lineHeight:1.6 }}>
            HIPAA · AES-256 · BAA<br/>All transfers encrypted
          </div>
        </div>
      </div>
    </div>
  );

  // ── SENDING ──────────────────────────────────────────────────────
  if (phase==="sending") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:400, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:16, color:sys.color }}>{sys.icon}</div>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Sending to {sys.name}…</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:28 }}>{uploaded} files · Tooth {tooth||"—"} · {restType}</div>
        <div style={{ height:6, borderRadius:3, background:C.surface2, overflow:"hidden", marginBottom:10 }}>
          <div style={{ height:"100%", borderRadius:3, background:sys.color, width:`${progress}%`, transition:"width .3s ease" }}/>
        </div>
        <div style={{ fontSize:12, fontFamily:C.font, color:sys.color }}>{progress}%</div>
      </div>
    </div>
  );

  // ── DONE ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:480 }}>
        <div style={{ padding:28, borderRadius:12, border:`1px solid ${sys.color}40`, background:sys.dim, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>✓</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Sent to {sys.name}</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Tooth {tooth||"—"} · {restType} · {uploaded} files</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>alert(`Opening in ${sys.name}…`)} style={{ padding:"12px", borderRadius:7, fontSize:12, fontWeight:700, border:"none", background:sys.color, color:"white", cursor:"pointer", fontFamily:C.sans }}>Open in {sys.name} ↗</button>
            <button onClick={()=>alert("Importing into Restora 3D viewer…")} style={{ padding:"12px", borderRadius:7, fontSize:12, fontWeight:600, border:`1px solid ${sys.color}50`, background:"transparent", color:sys.color, cursor:"pointer", fontFamily:C.sans }}>Import → Restora</button>
          </div>
        </div>
        <div style={{ padding:16, borderRadius:10, background:C.surface, border:`1px solid ${C.border}`, marginBottom:12 }}>
          <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:10 }}>FILES SENT</div>
          {Object.entries(slots).map(([id,f])=>(
            <div key={id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.soft}`, fontSize:11 }}>
              <span style={{ color:C.muted }}>{f.name}</span>
              <span style={{ color:C.ink, fontFamily:C.font }}>{fmt(f.size)}</span>
            </div>
          ))}
          {note&&<div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:"italic" }}>Note: {note}</div>}
        </div>
        <button onClick={reset} style={{ width:"100%", padding:"12px", borderRadius:7, fontSize:12, fontWeight:600, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontFamily:C.sans }}>↺ New case</button>
      </div>
    </div>
  );
}
