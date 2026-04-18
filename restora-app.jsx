import { useState, useReducer, useCallback, useEffect, useRef } from "react";
import { PATIENTS, loadPatientFiles } from "./src/patient-cases.js";
import RadiographScreen from "./src/RadiographScreen.jsx";
import AIAssistant from "./src/AIAssistant.jsx";
import RestorationCADNew from "./src/RestorationCAD.jsx";
import SmileSimulationNew from "./src/SmileSimulation.jsx";
import ImplantPlanningNew from "./src/ImplantPlanning.jsx";
import ExportHubNew from "./src/ExportHub.jsx";
import FullArchNew from "./src/FullArchScreen.jsx";
import ToothLibraryBrowserNew from "./src/ToothLibraryBrowser.jsx";
import SmileCreatorNew from "./src/SmileCreator.jsx";

// ═══════════════════════════════════════════════════════════════════
// RESTORA — Complete Integrated App
// AI Design Guide · Design Systems Bridge · All Clinical Screens
// ═══════════════════════════════════════════════════════════════════

// ── Design tokens — Tiffany Blue light theme ───────────────────────
const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.1)", tealBorder:"rgba(10,186,181,.3)",
  gold:"#b8860b", goldDim:"rgba(184,134,11,.08)",
  amber:"#d97706", amberDim:"rgba(217,119,6,.08)",
  purple:"#7c3aed", purpleDim:"rgba(124,58,237,.08)",
  blue:"#0891b2", blueDim:"rgba(8,145,178,.08)",
  red:"#dc2626", green:"#059669", warn:"#d97706",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
  shadow:"0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.3)",
};

// ── Navigation screens ─────────────────────────────────────────────
// 7 screens, 4 sections. Tools accessed as route-only (not in sidebar):
//   ai-design-guide, design-bridge — invoked from Dashboard buttons
const SCREENS = {
  "dashboard":        { label:"Dashboard",        icon:"◇", section:"Start" },
  "smile-creator":    { label:"Smile Creator",    icon:"○", section:"Design" },
  "restoration-cad":  { label:"Scan Viewer",      icon:"◐", section:"Design" },
  "tooth-library":    { label:"Tooth Library",    icon:"▣", section:"Design" },
  "implant-plan":     { label:"Implant Planning", icon:"◆", section:"Planning" },
  "radiograph":       { label:"X-ray Analysis",   icon:"△", section:"Planning" },
  "full-arch":        { label:"Full Arch",         icon:"◇", section:"Planning" },
  "export":           { label:"Export",            icon:"↗", section:"Delivery" },
  // hidden routes (still navigable):
  "smile-sim":        { label:"Photo Overlay",    icon:"◑", hidden:true },
  "design-bridge":    { label:"Design Systems",   icon:"◫", hidden:true },
  "ai-design-guide":  { label:"AI Guide",         icon:"✦", hidden:true },
};

// ── Shared atoms ───────────────────────────────────────────────────
const Btn = ({ children, onClick, variant="primary", disabled=false, style={} }) => {
  const base = { padding:"14px 24px", borderRadius:8, fontSize:15, fontWeight:700,
    cursor:disabled?"not-allowed":"pointer", fontFamily:C.sans, border:"none",
    transition:"all .15s", letterSpacing:.3, minHeight:46, ...style };
  const v = {
    primary:{ background:disabled?C.border:C.teal, color:disabled?C.muted:"white",
      boxShadow:disabled?"none":"0 4px 12px rgba(0,180,138,.25)" },
    secondary:{ background:C.surface2, color:C.muted, border:`1px solid ${C.border}` },
    ghost:{ background:"transparent", color:C.muted, border:`1px solid ${C.border}` },
    danger:{ background:"rgba(239,68,68,.1)", color:C.red, border:`1px solid rgba(239,68,68,.2)` },
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}}>{children}</button>;
};

const Tag = ({ label, color=C.teal, dim=C.tealDim }) => (
  <span style={{ padding:"6px 12px", borderRadius:5, fontSize:13, fontWeight:700,
    letterSpacing:.5, background:dim, color, border:`1px solid ${color}40`,
    fontFamily:C.font }}>
    {label}
  </span>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`,
    boxShadow:C.shadow, ...style }}>
    {children}
  </div>
);

const SectionHead = ({ label, color=C.teal }) => (
  <div style={{ fontSize:9, fontFamily:C.font, color, letterSpacing:2,
    textTransform:"uppercase", marginBottom:10 }}>{label}</div>
);

const FlagRow = ({ level, msg }) => {
  const map = { pass:[C.green,"✓"], warning:[C.warn,"⚠"], critical:[C.red,"✕"] };
  const [col, ic] = map[level] || [C.muted,"·"];
  return (
    <div style={{ display:"flex", gap:8, padding:"8px 12px", borderRadius:5,
      background:col+"12", border:`1px solid ${col}25`, marginBottom:5, alignItems:"flex-start" }}>
      <span style={{ color:col, fontSize:11, flexShrink:0 }}>{ic}</span>
      <span style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{msg}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// AI DESIGN GUIDE  (full implementation)
// ══════════════════════════════════════════════════════════════════
const CASE_TYPES = {
  "cosmetic-anterior":   { label:"Cosmetic Anterior",   icon:"✦", sub:"Veneers · Crowns · Bonding", color:C.gold, dim:C.goldDim, systems:["Smile Design","Mill Connect","Lab CAD"] },
  "smile-makeover":      { label:"Smile Makeover",      icon:"◈", sub:"Full arch esthetic redesign", color:C.teal, dim:C.tealDim, systems:["Smile Design","Lab CAD"] },
  "restorative-post":    { label:"Restorative Posterior",icon:"⬡", sub:"Crowns · Onlays · Inlays",  color:C.purple, dim:C.purpleDim, systems:["Mill Connect","Lab CAD"] },
  "implant-single":      { label:"Single Implant",      icon:"◆", sub:"Crown on implant",           color:C.amber, dim:C.amberDim, systems:["Lab CAD","Mill Connect"] },
  "implant-full-arch":   { label:"Full Arch Implant",   icon:"⬟", sub:"Bar · Zirconia · FP3",       color:C.teal, dim:C.tealDim, systems:["Lab CAD"] },
};
const ESTHETIC_P = [
  { id:"smile_arc",       label:"Smile arc",                 type:"select", aep:true,  tip:"AEP: consonant with lower lip — never flat", options:["Consonant (ideal)","Slightly flat","Reverse — correct","Maintain existing"], def:"Consonant (ideal)" },
  { id:"wl_ratio",        label:"Central W:L ratio",         type:"range",  aep:true,  tip:"AEP: 75–80%", min:65, max:90, step:1, unit:"%", def:78 },
  { id:"incisal_display", label:"Incisal display at repose", type:"range",  aep:true,  tip:"AEP: 1–3mm typical", min:0, max:5, step:.5, unit:"mm", def:2 },
  { id:"midline",         label:"Midline treatment",         type:"select", aep:true,  tip:"AEP: >1mm deviation perceptible", options:["Align to facial midline","Maintain existing","Shift right","Shift left","Accept <1mm deviation"], def:"Align to facial midline" },
  { id:"gingival_levels", label:"Gingival levels",           type:"select", aep:true,  tip:"Centrals=canines, laterals 0.5mm coronal", options:["Centrals = canines · laterals 0.5mm coronal (AEP)","All level","Custom"], def:"Centrals = canines · laterals 0.5mm coronal (AEP)" },
  { id:"tooth_form",      label:"Tooth form",                type:"select", aep:false, options:["Square-tapering","Ovoid","Triangular","Square","Match existing"], def:"Square-tapering" },
  { id:"embrasure",       label:"Embrasure form",            type:"select", aep:true,  tip:"AEP: progressive, open anteriorly", options:["Open (youthful)","Closed (mature)","Progressive"], def:"Progressive" },
  { id:"surface_texture", label:"Surface texture",           type:"select", aep:false, options:["Smooth / high gloss","Subtle perikymata","Moderate texture","Pronounced / natural"], def:"Subtle perikymata" },
  { id:"shade",           label:"Target shade",              type:"select", aep:false, options:["BL1","BL2","BL3","BL4","A1","A2","A3","B1","Match existing"], def:"A1" },
  { id:"characterisation",label:"Characterisation",         type:"multi",  aep:false, options:["Mamelons","Incisal halo","Cervical chroma","Surface crazing","None"], def:["Incisal halo","Cervical chroma"] },
];
const PREP_P = [
  { id:"prep_type",       label:"Preparation type",  type:"select", tip:"Minimal prep protocol priority", options:["No-prep","Minimal <0.3mm","Veneer 0.3–0.5mm","Crown full coverage","Onlay","Inlay"], def:"Minimal <0.3mm" },
  { id:"margin_type",     label:"Margin type",        type:"select", options:["Feather/knife","Chamfer 0.3mm","Chamfer 0.5mm","Heavy chamfer","Rounded shoulder"], def:"Chamfer 0.3mm" },
  { id:"margin_location", label:"Margin location",    type:"select", tip:"Supragingival preferred — technique manual", options:["Supragingival 0.5–1mm (ideal)","Equigingival","Subgingival 0.5mm","Subgingival 1mm"], def:"Supragingival 0.5–1mm (ideal)" },
  { id:"facial_reduction",label:"Facial reduction",   type:"range",  tip:"Flag if >0.5mm", min:0, max:1.5, step:.1, unit:"mm", def:.3 },
  { id:"material",        label:"Material",           type:"select", options:["Pressed lithium disilicate","Milled lithium disilicate","Feldspathic porcelain","Zirconia HT","Zirconia MT monolithic","Cast gold","PFM","Composite resin"], def:"Pressed lithium disilicate" },
  { id:"emergence",       label:"Emergence profile",  type:"select", tip:"Concave/flat subgingival — never convex", options:["Zero tissue push (ideal)","Minimal push <0.5mm","Standard","Follow shaped root"], def:"Zero tissue push (ideal)" },
];
const OCC_P = [
  { id:"occlusal_scheme", label:"Occlusal scheme",    type:"select", options:["Canine-guided (default)","Mutually protected","Group function","Lingualized"], def:"Canine-guided (default)" },
  { id:"ant_guidance",    label:"Anterior guidance",  type:"select", options:["Establish + posterior disclusion","Maintain existing","Shallow — bruxism concern","Steep — not modifying"], def:"Establish + posterior disclusion" },
  { id:"centric",         label:"Centric contacts",   type:"select", options:["Flat planes (ideal)","Cusp tip — must adjust","Tripod contacts","No contacts (implant)"], def:"Flat planes (ideal)" },
];
const IMPL_P = [
  { id:"impl_zone",   label:"Zone",              type:"select", options:["Anterior esthetic","Posterior load-bearing","Canine (guidance concern)"], def:"Posterior load-bearing" },
  { id:"rest_type",   label:"Restoration type",  type:"select", options:["Screw-retained (preferred)","Cement-retained","Custom abutment + crown","Bar overdenture"], def:"Screw-retained (preferred)" },
  { id:"platform_sw", label:"Platform switching", type:"toggle", tip:"Preserves crestal bone", def:true },
  { id:"pros_space",  label:"Prosthetic space",   type:"range", min:5, max:20, step:.5, unit:"mm", def:10 },
  { id:"imm_load",    label:"Immediate loading",  type:"toggle", tip:"Requires ≥35 Ncm", def:false },
];

function ParamCtrl({ p, val, set }) {
  const s = { width:"100%", padding:"12px 14px", borderRadius:8, border:`1px solid ${C.border}`,
    background:C.surface2, color:C.ink, fontSize:15, fontFamily:C.sans, outline:"none", minHeight:46 };
  if (p.type==="select") return (
    <select value={val} onChange={e=>set(e.target.value)} style={s}>
      {p.options.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  if (p.type==="range") return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <input type="range" min={p.min} max={p.max} step={p.step} value={val}
        onChange={e=>set(parseFloat(e.target.value))} style={{ flex:1, accentColor:C.teal, height:6 }} />
      <span style={{ fontSize:15, fontFamily:C.font, color:C.teal, minWidth:60, textAlign:"right", fontWeight:700 }}>{val}{p.unit}</span>
    </div>
  );
  if (p.type==="toggle") return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div onClick={()=>set(!val)} style={{ width:48, height:26, borderRadius:13, cursor:"pointer", position:"relative",
        background:val?C.teal:C.surface3, border:`1px solid ${val?C.teal:C.border}`, transition:"all .2s" }}>
        <div style={{ position:"absolute", top:2, left:val?24:2, width:20, height:20, borderRadius:10, background:"white", transition:"left .2s" }} />
      </div>
      <span style={{ fontSize:14, color:val?C.teal:C.muted, fontWeight:600 }}>{val?"Yes":"No"}</span>
    </div>
  );
  if (p.type==="multi") {
    const sel = Array.isArray(val) ? val : [];
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {p.options.map(o=>{
          const on=sel.includes(o);
          return <button key={o} onClick={()=>set(on?sel.filter(s=>s!==o):[...sel,o])}
            style={{ padding:"8px 14px", borderRadius:6, fontSize:14, cursor:"pointer", fontFamily:C.sans, fontWeight:600,
              border:`1px solid ${on?C.teal:C.border}`, background:on?C.tealDim:"transparent", color:on?C.teal:C.muted }}>{o}</button>;
        })}
      </div>
    );
  }
  return null;
}

function AIDesignGuide({ navigate }) {
  const [step, setStep] = useState("case"); // case | params | generating | brief | suite
  const [caseType, setCaseType] = useState(null);
  const [tab, setTab] = useState("esthetic");
  const [params, setParams] = useState({});
  const [brief, setBrief] = useState(null);
  const [activeSys, setActiveSys] = useState("smile");
  const [err, setErr] = useState(null);

  const setP = (id, v) => setParams(p=>({...p,[id]:v}));

  const tabs = [
    { id:"esthetic", label:"Esthetic", ps:ESTHETIC_P },
    { id:"prep",     label:"Prep + Material", ps:PREP_P },
    { id:"occlusion",label:"Occlusion", ps:OCC_P },
    ...(caseType?.includes("implant")?[{ id:"implant", label:"Implant", ps:IMPL_P }]:[]),
  ];
  const tabPs = tabs.find(t=>t.id===tab)?.ps || [];

  const selectCase = (k) => {
    const defs = {};
    [...ESTHETIC_P,...PREP_P,...OCC_P,...IMPL_P].forEach(p=>{ defs[p.id]=p.def; });
    setCaseType(k); setParams(defs); setStep("params"); setTab("esthetic");
  };

  const generate = async () => {
    setErr(null); setStep("generating");
    const lines = Object.entries(params).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join("\n");
    const ct = CASE_TYPES[caseType];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{ "Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1600,
          messages:[{role:"user",content:`You are Restora AI. Generate a dental design brief for a ${ct.label} case.

PARAMETERS:\n${lines}

AEP BASELINES: Central W:L 75-80%. Smile arc consonant with lower lip. Incisal display 1-3mm repose. Midline >1mm = flag. Centrals=canines gingival level, laterals 0.5mm coronal. Emergence: concave/flat subgingival. Minimal prep: prefer <0.5mm facial reduction. Centric contacts on flat planes. Posterior disclusion in all excursives.

Respond ONLY valid JSON no preamble:
{"summary":"2-sentence clinical summary","esthetic_decisions":[{"parameter":"name","value":"val","rationale":"1 sentence","aep":true}],"restorative_decisions":[{"parameter":"name","value":"val","rationale":"1 sentence"}],"protocol_flags":[{"level":"pass|warning|critical","message":"text"}],"suite_routing":{"smile_design":{"role":"desc","tasks":["t1","t2"],"active":true},"mill_connect":{"role":"desc","tasks":["t1","t2"],"active":true},"lab_cad":{"role":"desc","tasks":["t1"],"active":false}},"lab_rx":"3-sentence prescription"}`}] })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "{}";
      setBrief(JSON.parse(raw.replace(/```json|```/g,"").trim()));
      setStep("brief");
    } catch(e) { setErr(e.message||"Failed"); setStep("params"); }
  };

  const ct = caseType ? CASE_TYPES[caseType] : null;
  const SUITE = {
    smile:{ title:"Smile Design",icon:"◉",color:C.amber,rk:"smile_design",actions:["Upload patient photos","Generate smile preview","Import mockup overlay","Send to Restora 3D"] },
    mill: { title:"Mill Connect",icon:"◈",color:C.blue,  rk:"mill_connect",actions:["Upload prep scans","Generate crown design","Run occlusion check","Send to mill unit"] },
    lab:  { title:"Lab CAD",    icon:"⬡",color:C.purple, rk:"lab_cad",     actions:["Upload full scan package","Generate lab design","Export STL + design file","Send to lab"] },
  };

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      {/* Header strip */}
      <div style={{ padding:"18px 24px 0", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${C.border}`, paddingBottom:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontFamily:C.font, color:C.teal, letterSpacing:3, fontWeight:700 }}>AI DESIGN GUIDE</span>
        {ct&&<Tag label={ct.label.toUpperCase()} color={ct.color} dim={ct.dim} />}
        <div style={{ flex:1, minWidth:20 }} />
        {/* Breadcrumb */}
        {["Case","Parameters","AI Brief","Suite"].map((s,i)=>{
          const si=["case","params","brief","suite"].indexOf(step==="generating"?"params":step);
          const done=i<si, active=i===si;
          return <div key={s} style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:12,fontFamily:C.font,padding:"5px 11px",borderRadius:5,fontWeight:700,
              background:active?C.teal:done?C.tealDim:"transparent",
              color:active?"white":done?C.teal:C.light,
              border:`1px solid ${active?C.teal:done?C.tealBorder:C.border}` }}>
              {done?"✓ ":""}{s}
            </span>
            {i<3&&<span style={{ fontSize:12,color:C.light }}>›</span>}
          </div>;
        })}
        {step!=="case"&&<Btn onClick={()=>{setStep("case");setCaseType(null);setBrief(null);}} variant="ghost" style={{ marginLeft:8, padding:"7px 14px",fontSize:13 }}>↺ Reset</Btn>}
      </div>

      <div style={{ padding:"36px 24px 100px", maxWidth:920, margin:"0 auto" }}>

        {/* ── CASE TYPE ── */}
        {step==="case"&&(
          <div>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ fontSize:30,fontWeight:800,letterSpacing:"-.03em",marginBottom:12, lineHeight:1.2 }}>What type of case are you designing?</div>
              <div style={{ fontSize:16,color:C.muted, lineHeight:1.5 }}>Select a case type to load the Restora AEP + technique manual parameter set.</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:16 }}>
              {Object.entries(CASE_TYPES).map(([k,def])=>(
                <button key={k} onClick={()=>selectCase(k)}
                  style={{ textAlign:"left",padding:26,borderRadius:12,cursor:"pointer",border:`1.5px solid ${C.border}`,
                    background:C.surface,fontFamily:C.sans,transition:"all .15s",boxShadow:C.shadow }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=def.color;e.currentTarget.style.background=def.dim;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16, alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontSize:28,color:def.color }}>{def.icon}</span>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end" }}>
                      {def.systems.map(s=><span key={s} style={{ fontSize:11,padding:"4px 9px",borderRadius:5,background:C.surface2,color:C.muted,fontFamily:C.font,fontWeight:600,letterSpacing:.3 }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ fontSize:19,fontWeight:700,marginBottom:6,color:C.ink, lineHeight:1.3 }}>{def.label}</div>
                  <div style={{ fontSize:14,color:def.color,fontStyle:"italic", lineHeight:1.5 }}>{def.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PARAMETERS ── */}
        {step==="params"&&ct&&(
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
              <button onClick={()=>setStep("case")} style={{ fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0 }}>←</button>
              <span style={{ fontSize:18,color:ct.color }}>{ct.icon}</span>
              <div>
                <div style={{ fontSize:15,fontWeight:700 }}>{ct.label}</div>
                <div style={{ fontSize:11,color:C.muted }}>AEP · Advanced Esthetic Protocol parameters</div>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display:"flex",gap:2,marginBottom:24,borderBottom:`1px solid ${C.border}` }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 16px",fontSize:10,fontWeight:600,letterSpacing:.5,
                  cursor:"pointer",fontFamily:C.sans,border:"none",
                  borderBottom:`2px solid ${tab===t.id?C.teal:"transparent"}`,
                  background:"transparent",color:tab===t.id?C.teal:C.muted,transition:"all .15s" }}>
                  {t.label.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Param list */}
            {tabPs.map((p,i)=>(
              <div key={p.id} style={{ padding:"14px 0",borderBottom:i<tabPs.length-1?`1px solid ${C.borderSoft}`:"none" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                  <span style={{ fontSize:12,fontWeight:600,color:C.ink }}>{p.label}</span>
                  {p.aep&&<Tag label="AEP" color={C.teal} dim={C.tealDim} />}
                  {p.tip&&<span style={{ fontSize:10,color:C.light,fontStyle:"italic" }}>{p.tip}</span>}
                </div>
                <ParamCtrl p={p} val={params[p.id]??p.def} set={v=>setP(p.id,v)} />
              </div>
            ))}
            {err&&<div style={{ marginTop:14,padding:"10px 14px",borderRadius:5,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",color:C.red,fontSize:12 }}>{err}</div>}
            <Btn onClick={generate} style={{ marginTop:28,width:"100%",padding:"14px 28px",fontSize:13,borderRadius:8 }}>
              Generate AI Design Brief →
            </Btn>
          </div>
        )}

        {/* ── GENERATING ── */}
        {step==="generating"&&(
          <div style={{ textAlign:"center",marginTop:80 }}>
            <div style={{ fontSize:28,marginBottom:16 }}>◈</div>
            <div style={{ fontSize:14,fontWeight:600,marginBottom:6 }}>Generating design brief…</div>
            <div style={{ fontSize:12,color:C.muted,lineHeight:1.7 }}>Applying AEP guidelines · Technique manual protocol · Routing to design suite</div>
            <div style={{ marginTop:28,height:2,background:C.surface2,borderRadius:1,overflow:"hidden" }}>
              <div style={{ height:"100%",background:C.teal,borderRadius:1,width:"65%",animation:"sl 1.3s ease-in-out infinite alternate" }} />
            </div>
            <style>{`@keyframes sl{from{margin-left:0}to{margin-left:35%}}`}</style>
          </div>
        )}

        {/* ── BRIEF ── */}
        {step==="brief"&&brief&&ct&&(
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22 }}>
              <div>
                <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>AI Design Brief</div>
                <div style={{ fontSize:11,color:C.muted }}>{ct.label} · AEP guidelines + technique manual</div>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <Btn onClick={()=>setStep("params")} variant="ghost" style={{ padding:"8px 14px",fontSize:11 }}>← Edit params</Btn>
                <Btn onClick={()=>setStep("suite")} style={{ padding:"10px 18px",fontSize:12 }}>Open Design Suite →</Btn>
              </div>
            </div>
            <Card style={{ padding:18,marginBottom:14 }}>
              <SectionHead label="Clinical Summary" />
              <p style={{ fontSize:13,lineHeight:1.7,color:C.ink,margin:0 }}>{brief.summary}</p>
            </Card>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
              <Card style={{ overflow:"hidden" }}>
                <div style={{ padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:9,fontFamily:C.font,color:C.gold,letterSpacing:2 }}>ESTHETIC DECISIONS</div>
                {brief.esthetic_decisions?.map((d,i)=>(
                  <div key={i} style={{ padding:"10px 14px",borderBottom:i<brief.esthetic_decisions.length-1?`1px solid ${C.borderSoft}`:"none" }}>
                    <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:3 }}>
                      <span style={{ fontSize:11,fontWeight:600,color:C.ink }}>{d.parameter}</span>
                      {d.aep&&<Tag label="AEP" color={C.teal} dim={C.tealDim} />}
                    </div>
                    <div style={{ fontSize:11,color:C.gold,marginBottom:3,fontFamily:C.font }}>{d.value}</div>
                    <div style={{ fontSize:10,color:C.muted,lineHeight:1.5 }}>{d.rationale}</div>
                  </div>
                ))}
              </Card>
              <Card style={{ overflow:"hidden" }}>
                <div style={{ padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:9,fontFamily:C.font,color:C.purple,letterSpacing:2 }}>RESTORATIVE DECISIONS</div>
                {brief.restorative_decisions?.map((d,i)=>(
                  <div key={i} style={{ padding:"10px 14px",borderBottom:i<brief.restorative_decisions.length-1?`1px solid ${C.borderSoft}`:"none" }}>
                    <div style={{ fontSize:11,fontWeight:600,color:C.ink,marginBottom:3 }}>{d.parameter}</div>
                    <div style={{ fontSize:11,color:C.purple,marginBottom:3,fontFamily:C.font }}>{d.value}</div>
                    <div style={{ fontSize:10,color:C.muted,lineHeight:1.5 }}>{d.rationale}</div>
                  </div>
                ))}
              </Card>
            </div>
            <Card style={{ padding:14,marginBottom:12 }}>
              <SectionHead label="Protocol Compliance" />
              {brief.protocol_flags?.map((f,i)=><FlagRow key={i} level={f.level} msg={f.message} />)}
            </Card>
            <Card style={{ padding:14,marginBottom:12 }}>
              <SectionHead label="Design Suite Routing" />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
                {Object.entries(SUITE).map(([k,sys])=>{
                  const r=brief.suite_routing?.[sys.rk];
                  if(!r)return null;
                  return (
                    <div key={k} style={{ padding:12,borderRadius:6,border:`1px solid ${r.active?sys.color+"40":C.border}`,background:r.active?sys.color+"0d":C.surface2,opacity:r.active?1:.4 }}>
                      <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:6 }}>
                        <span style={{ fontSize:10,fontWeight:700,color:r.active?sys.color:C.muted,fontFamily:C.font,letterSpacing:.5 }}>{sys.title}</span>
                        {r.active&&<span style={{ fontSize:8,padding:"1px 5px",borderRadius:3,background:sys.color+"20",color:sys.color }}>ON</span>}
                      </div>
                      <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>{r.role}</div>
                      {r.tasks?.map((t,i)=><div key={i} style={{ fontSize:10,color:C.light,marginBottom:2 }}>· {t}</div>)}
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card style={{ padding:14 }}>
              <SectionHead label="Lab Prescription" />
              <p style={{ fontSize:12,lineHeight:1.8,color:C.muted,margin:0 }}>{brief.lab_rx}</p>
            </Card>
          </div>
        )}

        {/* ── SUITE ── */}
        {step==="suite"&&brief&&ct&&(
          <div style={{ display:"flex",gap:0,height:"calc(100vh - 200px)",margin:"0 -28px" }}>
            {/* System sidebar */}
            <div style={{ width:180,background:C.surface,borderRight:`1px solid ${C.border}`,flexShrink:0,padding:"14px 0",display:"flex",flexDirection:"column" }}>
              <div style={{ padding:"0 14px 10px",fontSize:9,color:C.light,letterSpacing:2,fontFamily:C.font }}>DESIGN SUITE</div>
              {Object.entries(SUITE).map(([k,sys])=>{
                const r=brief.suite_routing?.[sys.rk];
                const on=r?.active; const sel=activeSys===k;
                return (
                  <button key={k} onClick={()=>on&&setActiveSys(k)} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"none",cursor:on?"pointer":"not-allowed",background:sel?sys.color+"15":"transparent",borderLeft:`2px solid ${sel?sys.color:"transparent"}`,opacity:on?1:.3,fontFamily:C.sans,transition:"all .15s" }}>
                    <span style={{ fontSize:14,color:sys.color }}>{sys.icon}</span>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:11,fontWeight:600,color:sel?sys.color:C.ink }}>{sys.title}</div>
                      {!on&&<div style={{ fontSize:9,color:C.light }}>Not active</div>}
                    </div>
                  </button>
                );
              })}
              <div style={{ flex:1 }} />
              <div style={{ padding:"12px 14px",borderTop:`1px solid ${C.border}` }}>
                <button onClick={()=>setStep("brief")} style={{ fontSize:10,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:C.sans }}>← Back to brief</button>
              </div>
            </div>
            {/* Active system panel */}
            <div style={{ flex:1,overflow:"auto",padding:"28px 32px" }}>
              {(()=>{
                const sys=SUITE[activeSys];
                const r=brief.suite_routing?.[sys.rk];
                return <SuiteWorkspace sys={sys} route={r} brief={brief} />;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuiteWorkspace({ sys, route, brief }) {
  const [done, setDone] = useState([]);
  const toggle = (a) => setDone(p=>p.includes(a)?p.filter(x=>x!==a):[...p,a]);
  return (
    <div style={{ maxWidth:600 }}>
      <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:24,paddingBottom:18,borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:22,color:sys.color }}>{sys.icon}</span>
        <div>
          <div style={{ fontSize:15,fontWeight:700,color:C.ink }}>{sys.title}</div>
          <div style={{ fontSize:11,color:C.muted }}>{route?.role}</div>
        </div>
      </div>
      <SectionHead label="Tasks for this case" color={sys.color} />
      {route?.tasks?.map((t,i)=>(
        <div key={i} style={{ display:"flex",gap:10,padding:"9px 0",borderBottom:i<route.tasks.length-1?`1px solid ${C.borderSoft}`:"none",alignItems:"center" }}>
          <div style={{ width:18,height:18,borderRadius:4,border:`1px solid ${sys.color}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:sys.color+"10" }}>
            <span style={{ fontSize:9,color:sys.color }}>{i+1}</span>
          </div>
          <span style={{ fontSize:12,color:C.ink }}>{t}</span>
        </div>
      ))}
      <Card style={{ padding:14,margin:"20px 0" }}>
        <SectionHead label="Design Brief" />
        <p style={{ fontSize:11,color:C.muted,lineHeight:1.7,margin:"0 0 12px" }}>{brief.summary}</p>
        <SectionHead label="Lab Rx" />
        <p style={{ fontSize:11,color:C.muted,lineHeight:1.7,margin:0 }}>{brief.lab_rx}</p>
      </Card>
      <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
        {sys.actions.map((a,i)=>{
          const d=done.includes(a);
          return <button key={a} onClick={()=>toggle(a)} style={{ padding:"11px 18px",borderRadius:5,fontSize:12,fontWeight:600,border:`1px solid ${d?sys.color:C.border}`,background:i===0?sys.color:(d?sys.color+"15":"transparent"),color:i===0?"white":(d?sys.color:C.muted),cursor:"pointer",fontFamily:C.sans,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s" }}>
            <span>{a}</span>{d&&i!==0&&<span style={{ fontSize:10 }}>✓</span>}
          </button>;
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DESIGN SYSTEMS BRIDGE  (full auto mode implementation)
// ══════════════════════════════════════════════════════════════════
const SYSTEMS = {
  mill:  { name:"Mill Connect",icon:"◈",color:C.blue,  dim:C.blueDim,  tag:"In-Office CAD/CAM", modes:["prep","implant"], desc:"In-office mill workflow. Upload prep scan → Restora AI designs → route to mill unit. Same-day delivery.", formats:["STL","DXD"] },
  smile: { name:"Smile Design",icon:"◉",color:C.amber, dim:C.amberDim, tag:"Photo-Based DSD",    modes:["mockup","prep"],  desc:"Upload patient photos → cloud DSD designs the smile → import mockup overlay and tooth dimensions back for restoration correlation.", formats:["PNG overlay","Dimensions"] },
  lab:   { name:"Lab CAD",    icon:"⬡",color:C.purple, dim:C.purpleDim,tag:"Full Lab Design",    modes:["prep","mockup","implant"], desc:"Export full design package to your lab CAD platform. Bridge, implant bar, full arch, abutment. Round-trip STL import.", formats:["STL","Design file","DCM","Lab RX"] },
};
const MODES = {
  prep:    { label:"Prep Restoration",icon:"🦷",desc:"Crown, veneer, onlay — on a prepared tooth",
    slots:[{id:"upper",label:"Upper arch scan",req:true,accept:".stl,.obj,.beb",hint:"STL or .beb from any IOS"},{id:"lower",label:"Lower arch scan",req:true,accept:".stl,.obj,.beb",hint:"STL or .beb from any IOS"},{id:"bite",label:"Bite registration",req:false,accept:".stl,.obj",hint:"Optional — improves occlusion"},{id:"prep-photo",label:"Prep photo",req:false,accept:".jpg,.png",hint:"Retracted view post-prep"},{id:"xray",label:"X-ray / radiograph",req:false,accept:".jpg,.png,.jpeg",hint:"PA, BW, or FMX"}] },
  mockup:  { label:"Smile Mockup",icon:"😊",desc:"Digital smile design before any prep",
    slots:[{id:"face-repose",label:"Full face — repose",req:true,accept:".jpg,.png,.heic",hint:"Lips relaxed, natural light"},{id:"face-smile",label:"Full face — smile",req:true,accept:".jpg,.png,.heic",hint:"Full smile"},{id:"retracted",label:"Retracted frontal",req:true,accept:".jpg,.png,.heic",hint:"Cheek retractors in"},{id:"lateral-r",label:"Lateral right",req:false,accept:".jpg,.png,.heic",hint:"Right buccal"},{id:"lateral-l",label:"Lateral left",req:false,accept:".jpg,.png,.heic",hint:"Left buccal"}] },
  implant: { label:"Implant Restoration",icon:"🔩",desc:"Crown on implant, bridge, bar, or abutment design",
    slots:[{id:"upper",label:"Upper arch scan",req:true,accept:".stl,.obj,.beb",hint:"STL or .beb from any IOS"},{id:"lower",label:"Lower arch scan",req:true,accept:".stl,.obj,.beb",hint:"With scan body if applicable"},{id:"xray",label:"X-ray / radiograph",req:false,accept:".jpg,.png,.jpeg",hint:"PA, BW, FMX — verifies implant"},{id:"cbct",label:"CBCT / DICOM",req:false,accept:".dcm,.zip",hint:"Required for guided surgery"},{id:"scan-body",label:"Scan body report",req:false,accept:".pdf,.csv",hint:"Manufacturer position data"}] },
};

// Auto-detect if a file is an X-ray based on filename patterns
function isXray(filename) {
  const n = filename.toLowerCase();
  return /x[-_ ]?ray|fmx|radiograph|pano|bitewing|periapical/.test(n);
}

function inferMode(files) {
  const names=files.map(f=>f.name.toLowerCase()), exts=files.map(f=>f.name.split(".").pop()||"");
  if(exts.some(e=>e==="dcm")||names.some(n=>n.includes("cbct")||n.includes("scanbody")||n.includes("implant"))) return {mode:"implant",confidence:.92,reason:"CBCT/scan body detected"};
  if(names.some(n=>isXray(n))) return {mode:"implant",confidence:.88,reason:"X-ray detected — assuming diagnostic case"};
  if(exts.every(e=>["jpg","jpeg","png","heic"].includes(e))&&names.some(n=>n.includes("face")||n.includes("smile")||n.includes("retract"))) return {mode:"mockup",confidence:.9,reason:"Facial photos detected"};
  if(exts.some(e=>["stl","obj","ply","beb"].includes(e))) return {mode:"prep",confidence:.85,reason:"Arch scan files detected"};
  return null;
}
function pickSystem(mode, files) {
  const names=files.map(f=>f.name.toLowerCase()),exts=files.map(f=>f.name.split(".").pop()||"");
  if(mode==="implant"||exts.includes("dcm")) return {system:"lab",reason:"Lab CAD has full implant library + DICOM"};
  if(mode==="mockup"&&exts.every(e=>["jpg","jpeg","png","heic"].includes(e))) return {system:"smile",reason:"Smile Design is photo-native"};
  return {system:"mill",reason:"Mill Connect — fastest in-office workflow"};
}

function DesignBridge({ navigate, activePatient, clearPatient }) {
  const [step, setStep] = useState("mode"); // mode | system | files | status
  const [mode, setMode] = useState(null);
  const [system, setSystem] = useState(null);
  const [slots, setSlots] = useState([]);
  const [autoMode, setAutoMode] = useState(true);
  const [detection, setDetection] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [restType, setRestType] = useState("crown");
  const [teeth, setTeeth] = useState("8, 9");
  const [note, setNote] = useState("");
  const [job, setJob] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const timerRef = useRef(null);

  // Auto-load patient files when coming from Dashboard
  useEffect(() => {
    if (!activePatient) return;
    setLoadingPatient(true);
    (async () => {
      try {
        const files = await loadPatientFiles(activePatient);
        const pmode = activePatient.route;
        const psystem = activePatient.system;
        const modeSlots = MODES[pmode].slots.map(s=>({...s,uploaded:false,file:null}));
        // Assign files to slots by matching slot id from patient file definition
        activePatient.files.forEach((pf, i) => {
          const file = files[i];
          const slotIdx = modeSlots.findIndex(s => s.id === pf.slot && !s.uploaded);
          if (slotIdx !== -1) {
            modeSlots[slotIdx] = { ...modeSlots[slotIdx], uploaded:true, file };
          } else {
            // Find any empty slot that accepts this file type
            const ext = pf.name.split('.').pop().toLowerCase();
            const altIdx = modeSlots.findIndex(s => !s.uploaded && s.accept.includes(ext));
            if (altIdx !== -1) modeSlots[altIdx] = { ...modeSlots[altIdx], uploaded:true, file };
          }
        });
        setMode(pmode); setSystem(psystem); setSlots(modeSlots);
        setTeeth(activePatient.teeth.replace(/#/g, ''));
        setRestType(activePatient.subtype.toLowerCase().includes('veneer') ? 'veneer' :
                    activePatient.subtype.toLowerCase().includes('implant') ? 'implant-crown' : 'crown');
        setNote(activePatient.notes);
        setDetection({ mode:pmode, system:psystem, modeReason:`Loaded from ${activePatient.name}`, sysReason:'Auto-routed', confidence:1.0 });
        setStep("files");
      } catch (e) {
        console.error('Failed to load patient files:', e);
      }
      setLoadingPatient(false);
    })();
  }, [activePatient]);

  const restOpts = mode==="implant"?["implant-crown","implant-bridge","implant-bar","full-arch-zirconia"]:mode==="mockup"?["smile-mockup","digital-wax-up"]:["crown","veneer","onlay","inlay","bridge"];

  const selectMode = (m) => {
    setMode(m); setSystem(null);
    setSlots(MODES[m].slots.map(s=>({...s,uploaded:false,file:null})));
    setStep("system");
  };

  const autoDetect = (files) => {
    const mr=inferMode(files); if(!mr)return;
    const sr=pickSystem(mr.mode,files);
    setDetection({mode:mr.mode,system:sr.system,modeReason:mr.reason,sysReason:sr.reason,confidence:mr.confidence});
    setMode(mr.mode); setSystem(sr.system);
    const sl=MODES[mr.mode].slots.map(s=>({...s,uploaded:false,file:null}));
    const assigned=new Set();
    files.forEach(f=>{
      const ext=f.name.split(".").pop()||"",name=f.name.toLowerCase();
      const slot=sl.find(s=>{
        if(assigned.has(s.id)||!s.accept.includes(ext))return false;
        if(s.id==="upper"&&(name.includes("upper")||name.includes("max")))return true;
        if(s.id==="lower"&&(name.includes("lower")||name.includes("mand")))return true;
        if(s.id==="cbct"&&(ext==="dcm"||name.includes("cbct")))return true;
        if(!s.uploaded)return true; return false;
      });
      if(slot){slot.file=f;slot.uploaded=true;assigned.add(slot.id);}
    });
    setSlots(sl); setStep("files");
  };

  const uploadFile = (slotId, file) => {
    setSlots(prev=>prev.map(s=>s.id===slotId?{...s,file,uploaded:true}:s));
  };

  // Auto-send countdown — only when user manually drops files (not when loading from patient)
  useEffect(()=>{
    if(!autoMode||step!=="files"||!mode||!system)return;
    if(activePatient)return;  // Never auto-send when a patient was loaded — user must review + send manually
    const req=slots.filter(s=>s.req), done=slots.filter(s=>s.req&&s.uploaded);
    if(req.length>0&&done.length>=req.length){
      setCountdown(5); let t=5;
      timerRef.current=setInterval(()=>{
        t-=1; if(t<=0){clearInterval(timerRef.current);setCountdown(null);send();}
        else setCountdown(t);
      },1000);
    } else { if(timerRef.current)clearInterval(timerRef.current); setCountdown(null); }
    return ()=>{if(timerRef.current)clearInterval(timerRef.current);};
  },[slots,autoMode,step,mode,system,activePatient]);

  const send = () => {
    const j={id:`RES-${Date.now()}`,system,mode,status:"uploading",progress:0,startedAt:new Date()};
    setJob(j); setStep("status");
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*18; if(p>=100){p=100;clearInterval(iv);setJob(prev=>({...prev,progress:100,status:"ready"}));}
      else setJob(prev=>({...prev,progress:Math.round(p),status:p>40?"processing":"uploading"}));
    },400);
  };

  const reset = ()=>{setStep("mode");setMode(null);setSystem(null);setSlots([]);setDetection(null);setJob(null);setCountdown(null);};
  const reqDone=slots.filter(s=>s.req&&s.uploaded).length, reqTotal=slots.filter(s=>s.req).length;
  const canSend=reqDone>=reqTotal&&reqTotal>0&&system;
  const uploaded=slots.filter(s=>s.uploaded).length;
  const sys=system?SYSTEMS[system]:null;

  return (
    <div style={{ flex:1,overflow:"auto",background:C.bg,color:C.ink,fontFamily:C.sans }}>
      {/* Header */}
      <div style={{ padding:"14px 28px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:10,fontFamily:C.font,color:C.teal,letterSpacing:3 }}>DESIGN SYSTEMS BRIDGE</span>
        {sys&&<Tag label={sys.name.toUpperCase()} color={sys.color} dim={sys.dim} />}
        <div style={{ flex:1 }} />
        {/* Auto toggle */}
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:11,color:autoMode?C.teal:C.muted,fontWeight:600 }}>AUTO</span>
          <div onClick={()=>setAutoMode(a=>!a)} style={{ width:36,height:20,borderRadius:10,cursor:"pointer",background:autoMode?C.teal:C.border,position:"relative",transition:"background .2s" }}>
            <div style={{ position:"absolute",top:2,left:autoMode?18:2,width:14,height:14,borderRadius:7,background:"white",transition:"left .2s" }} />
          </div>
        </div>
        <Btn onClick={reset} variant="ghost" style={{ padding:"4px 12px",fontSize:10 }}>↺ Reset</Btn>
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:"32px 28px" }}>

        {/* ── MODE ── */}
        {step==="mode"&&(
          <div>
            <div style={{ marginBottom:28,textAlign:"center" }}>
              <div style={{ fontSize:20,fontWeight:700,marginBottom:8 }}>What are you designing?</div>
              <div style={{ fontSize:13,color:C.muted }}>{autoMode?"Drop files here — auto mode detects and routes automatically.":"Choose a case type."}</div>
            </div>
            {autoMode&&(
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=Array.from(e.dataTransfer.files);if(f.length)autoDetect(f);}}
                style={{ border:`2px dashed ${dragOver?C.teal:C.tealBorder}`,borderRadius:12,padding:"36px 24px",textAlign:"center",
                  background:dragOver?C.tealDim:"transparent",marginBottom:28,transition:"all .2s",cursor:"pointer" }}>
                <div style={{ fontSize:28,marginBottom:10 }}>⚡</div>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:6 }}>Drop case files here</div>
                <div style={{ fontSize:12,color:C.muted,marginBottom:16 }}>STL, DICOM, photos — auto detects case type + best system</div>
                <label style={{ padding:"8px 20px",borderRadius:6,fontSize:12,fontWeight:600,background:C.teal,color:"white",cursor:"pointer" }}>
                  Browse files
                  <input type="file" multiple accept=".stl,.obj,.dcm,.jpg,.jpeg,.png,.heic,.pdf" style={{ display:"none" }}
                    onChange={e=>{const f=Array.from(e.target.files||[]);if(f.length)autoDetect(f);}} />
                </label>
              </div>
            )}
            <div style={{ fontSize:11,color:C.muted,marginBottom:14,letterSpacing:1 }}>{autoMode?"OR SELECT MANUALLY:":"SELECT CASE TYPE:"}</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
              {Object.entries(MODES).map(([k,m])=>(
                <button key={k} onClick={()=>selectMode(k)}
                  style={{ textAlign:"left",padding:20,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:C.sans,transition:"all .15s",boxShadow:C.shadow }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";}}>
                  <div style={{ fontSize:24,marginBottom:10 }}>{m.icon}</div>
                  <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontSize:11,color:C.muted,lineHeight:1.5 }}>{m.desc}</div>
                  <div style={{ marginTop:12,fontSize:10,color:C.light,fontFamily:C.font }}>{m.slots.length} slots · {m.slots.filter(s=>s.req).length} required</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {step==="system"&&mode&&(
          <div>
            <button onClick={()=>setStep("mode")} style={{ fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"0 0 20px",fontFamily:C.sans }}>← Back</button>
            <div style={{ fontSize:18,fontWeight:700,marginBottom:6 }}>{MODES[mode].icon} {MODES[mode].label} — Choose a system</div>
            <div style={{ fontSize:12,color:C.muted,marginBottom:24 }}>Systems highlighted support this case type.</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14 }}>
              {Object.entries(SYSTEMS).map(([k,s])=>{
                const ok=s.modes.includes(mode);
                return (
                  <button key={k} onClick={()=>ok&&(setSystem(k),setStep("files"))} disabled={!ok}
                    style={{ textAlign:"left",padding:22,borderRadius:10,border:`1px solid ${ok?s.color+"40":C.border}`,background:ok?s.dim:C.surface2,cursor:ok?"pointer":"not-allowed",opacity:ok?1:.4,fontFamily:C.sans,transition:"all .15s",boxShadow:C.shadow }}>
                    <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:14 }}>
                      <span style={{ fontSize:20,color:s.color }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize:14,fontWeight:700 }}>{s.name}</div>
                        <div style={{ fontSize:10,color:C.muted,letterSpacing:.5 }}>{s.tag}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:12 }}>{s.desc}</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                      {s.formats.map(f=><span key={f} style={{ padding:"2px 8px",borderRadius:3,fontSize:9,fontFamily:C.font,fontWeight:600,background:s.color+"15",color:s.color }}>{f}</span>)}
                      <span style={{ padding:"2px 8px",borderRadius:3,fontSize:9,fontFamily:C.font,fontWeight:600,background:C.tealDim,color:C.teal }}>↔ Round-trip</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILES ── */}
        {step==="files"&&mode&&sys&&(
          <div>
            <button onClick={()=>{if(activePatient&&clearPatient)clearPatient();setStep("system");}} style={{ fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"0 0 20px",fontFamily:C.sans }}>← Back</button>
            {/* Active patient banner */}
            {activePatient && (
              <div style={{ marginBottom:14, padding:"14px 18px", borderRadius:9, background:C.teal+"18", border:`1.5px solid ${C.teal}60`, display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${C.teal},#0080cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"white", flexShrink:0 }}>{activePatient.initials}</div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:2 }}>{activePatient.name} {activePatient.age && <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>· Age {activePatient.age} · {activePatient.gender}</span>}</div>
                  <div style={{ fontSize:12, color:C.teal }}>{activePatient.type} — {activePatient.subtype} · Teeth {activePatient.teeth} · {activePatient.files.length} files loaded</div>
                </div>
                <button onClick={()=>{clearPatient&&clearPatient();setMode(null);setSystem(null);setSlots([]);setDetection(null);setStep("mode");}} style={{ fontSize:10, color:C.muted, background:"none", border:`1px solid ${C.border}`, borderRadius:5, padding:"5px 10px", cursor:"pointer", fontFamily:C.sans }}>Close patient</button>
              </div>
            )}

            {/* Photo gallery */}
            {activePatient?.photos?.length > 0 && (
              <div style={{ marginBottom:18, padding:"18px 20px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700 }}>📸 CLINICAL PHOTOS</span>
                  <span style={{ fontSize:12, color:C.muted }}>{activePatient.photos.length} images · {activePatient.photos[0].date}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
                  {activePatient.photos.map((photo, idx) => (
                    <a key={idx} href={`/patient-cases/${photo.file}`} target="_blank" rel="noopener"
                      style={{ textDecoration:"none", display:"block" }}>
                      <div style={{ borderRadius:8, overflow:"hidden", background:"#000", border:`1px solid ${C.border}`, cursor:"zoom-in", transition:"all .15s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                        <img src={`/patient-cases/${photo.file}`} alt={photo.label}
                          style={{ width:"100%", height:150, objectFit:"cover", display:"block" }} />
                        <div style={{ padding:"10px 12px", background:C.surface2 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:3 }}>{photo.label}</div>
                          <div style={{ fontSize:10, color:C.muted, lineHeight:1.5 }}>{photo.note}</div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI X-ray analysis with tooth chart */}
            {activePatient?.toothChart && (
              <div style={{ marginBottom:18, padding:"18px 20px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <span style={{ fontSize:10, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700 }}>⚡ AI X-RAY ANALYSIS</span>
                  {activePatient.xrayAnalysis && <span style={{ fontSize:11, color:C.muted }}>{activePatient.xrayAnalysis.type} · {activePatient.xrayAnalysis.date}</span>}
                </div>

                {/* Tooth chart — palmer notation style */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontFamily:C.font, color:C.muted, letterSpacing:1.5, marginBottom:8 }}>CHART</div>
                  {/* Maxillary row (1-16) */}
                  <div style={{ display:"flex", gap:2, marginBottom:3 }}>
                    {Array.from({length:16},(_,i)=>i+1).map(n => {
                      const tc = activePatient.toothChart;
                      const isImplant = tc.implants?.includes(n);
                      const isMissing = tc.missing?.includes(n);
                      const isRestored = tc.restored?.includes(n);
                      const isEndo = tc.endodontic?.includes(n);
                      const bg = isImplant ? C.purple+"40" : isMissing ? C.red+"30" : isEndo ? C.amber+"30" : isRestored ? C.blue+"25" : C.surface2;
                      const fg = isImplant ? C.purple : isMissing ? C.red : isEndo ? C.amber : isRestored ? C.blue : C.muted;
                      const border = isImplant||isMissing||isEndo||isRestored ? fg+"80" : C.border;
                      return (
                        <div key={n} title={`#${n}${isImplant?' IMPLANT':''}${isMissing?' MISSING':''}${isRestored?' RESTORED':''}`}
                          style={{ flex:1, minWidth:24, padding:"6px 2px", borderRadius:4, border:`1px solid ${border}`, background:bg, textAlign:"center", fontSize:10, fontWeight:700, color:fg, fontFamily:C.font }}>
                          {n}
                        </div>
                      );
                    })}
                  </div>
                  {/* Mandibular row (32-17 reversed to match anatomical mirror) */}
                  <div style={{ display:"flex", gap:2 }}>
                    {Array.from({length:16},(_,i)=>32-i).map(n => {
                      const tc = activePatient.toothChart;
                      const isImplant = tc.implants?.includes(n);
                      const isMissing = tc.missing?.includes(n);
                      const isRestored = tc.restored?.includes(n);
                      const isEndo = tc.endodontic?.includes(n);
                      const bg = isImplant ? C.purple+"40" : isMissing ? C.red+"30" : isEndo ? C.amber+"30" : isRestored ? C.blue+"25" : C.surface2;
                      const fg = isImplant ? C.purple : isMissing ? C.red : isEndo ? C.amber : isRestored ? C.blue : C.muted;
                      const border = isImplant||isMissing||isEndo||isRestored ? fg+"80" : C.border;
                      return (
                        <div key={n} title={`#${n}${isImplant?' IMPLANT':''}${isMissing?' MISSING':''}${isRestored?' RESTORED':''}`}
                          style={{ flex:1, minWidth:24, padding:"6px 2px", borderRadius:4, border:`1px solid ${border}`, background:bg, textAlign:"center", fontSize:10, fontWeight:700, color:fg, fontFamily:C.font }}>
                          {n}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div style={{ display:"flex", gap:14, marginTop:10, fontSize:10, color:C.muted, flexWrap:"wrap" }}>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:9,height:9,borderRadius:2,background:C.purple+"60",border:`1px solid ${C.purple}` }}/>Implant</span>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:9,height:9,borderRadius:2,background:C.red+"40",border:`1px solid ${C.red}` }}/>Missing</span>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:9,height:9,borderRadius:2,background:C.blue+"30",border:`1px solid ${C.blue}` }}/>Restored</span>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:9,height:9,borderRadius:2,background:C.amber+"40",border:`1px solid ${C.amber}` }}/>Endo</span>
                    <span style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ width:9,height:9,borderRadius:2,background:C.surface2,border:`1px solid ${C.border}` }}/>Natural</span>
                  </div>
                </div>

                {/* Findings */}
                {activePatient.xrayAnalysis?.findings?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontFamily:C.font, color:C.muted, letterSpacing:1.5, marginBottom:8 }}>FINDINGS</div>
                    {activePatient.xrayAnalysis.findings.map((f,i) => (
                      <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", fontSize:11, color:C.ink, alignItems:"flex-start" }}>
                        {f.tooth && <span style={{ fontSize:10, fontFamily:C.font, fontWeight:700, color:C.purple, minWidth:30, padding:"2px 6px", background:C.purple+"15", borderRadius:3, textAlign:"center" }}>#{f.tooth}</span>}
                        {!f.tooth && <span style={{ minWidth:30 }}/>}
                        <span style={{ flex:1, lineHeight:1.5, color:C.muted }}>{f.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Auto detection banner */}
            {autoMode&&detection&&!activePatient&&(
              <div style={{ marginBottom:16,padding:"12px 16px",borderRadius:8,background:C.tealDim,border:`1px solid ${C.tealBorder}`,display:"flex",gap:12,alignItems:"flex-start" }}>
                <span style={{ fontSize:16,flexShrink:0 }}>⚡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:C.teal,marginBottom:4 }}>Auto detected · {Math.round(detection.confidence*100)}% confidence</div>
                  <div style={{ fontSize:11,color:C.muted,lineHeight:1.5 }}>
                    <span style={{ fontWeight:600,color:C.ink }}>Case:</span> {MODES[detection.mode].label} — {detection.modeReason}<br/>
                    <span style={{ fontWeight:600,color:C.ink }}>System:</span> {SYSTEMS[detection.system].name} — {detection.sysReason}
                  </div>
                </div>
                <button onClick={()=>{setDetection(null);setStep("mode");}} style={{ fontSize:10,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"2px 6px",fontFamily:C.sans }}>Change</button>
              </div>
            )}
            {/* Countdown */}
            {countdown!==null&&(
              <div style={{ marginBottom:14,padding:"10px 16px",borderRadius:7,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ fontSize:12,color:C.warn }}>⚡ Auto-sending in <strong>{countdown}s</strong> — all required files ready</div>
                <button onClick={()=>{clearInterval(timerRef.current);setCountdown(null);}} style={{ fontSize:11,color:C.warn,background:"none",border:"1px solid rgba(245,158,11,.3)",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontFamily:C.sans }}>Cancel</button>
              </div>
            )}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:22 }}>
              {/* File slots */}
              <div>
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>Upload case files</div>
                  <div style={{ fontSize:12,color:C.muted,marginBottom:8 }}>{uploaded}/{slots.length} uploaded · {reqDone}/{reqTotal} required</div>
                  <div style={{ height:3,background:C.border,borderRadius:2 }}>
                    <div style={{ height:"100%",borderRadius:2,background:C.teal,width:slots.length?`${(uploaded/slots.length)*100}%`:"0%",transition:"width .3s" }} />
                  </div>
                </div>
                {slots.map(slot=>(
                  <div key={slot.id} style={{ padding:"12px 14px",borderRadius:8,border:`1px solid ${slot.uploaded?C.teal+"60":C.border}`,background:slot.uploaded?C.tealDim:C.surface,display:"flex",alignItems:"center",gap:12,marginBottom:8,transition:"all .2s" }}>
                    <div style={{ width:30,height:30,borderRadius:7,flexShrink:0,background:slot.uploaded?C.teal:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"white" }}>
                      {slot.uploaded?"✓":"↑"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:2 }}>
                        <span style={{ fontSize:12,fontWeight:600 }}>{slot.label}</span>
                        {slot.req&&<Tag label="REQUIRED" color={C.warn} dim="rgba(245,158,11,.08)" />}
                      </div>
                      <div style={{ fontSize:11,color:C.muted }}>{slot.uploaded&&slot.file?slot.file.name:slot.hint}</div>
                    </div>
                    <label style={{ padding:"6px 12px",borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${slot.uploaded?C.teal:C.border}`,color:slot.uploaded?C.teal:C.muted,background:"transparent",cursor:"pointer",whiteSpace:"nowrap" }}>
                      {slot.uploaded?"Replace":"Upload"}
                      <input type="file" accept={slot.accept} style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(slot.id,f);}} />
                    </label>
                  </div>
                ))}
              </div>
              {/* Right panel */}
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                <div style={{ padding:14,borderRadius:8,border:`1px solid ${sys.color+"40"}`,background:sys.dim }}>
                  <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                    <span style={{ fontSize:18,color:sys.color }}>{sys.icon}</span>
                    <div><div style={{ fontSize:13,fontWeight:700 }}>{sys.name}</div><div style={{ fontSize:10,color:C.muted }}>{sys.tag}</div></div>
                  </div>
                </div>
                <Card style={{ padding:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:C.muted,letterSpacing:.8,marginBottom:10 }}>RESTORATION TYPE</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {restOpts.map(r=>(
                      <button key={r} onClick={()=>setRestType(r)} style={{ padding:"5px 10px",borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${restType===r?C.teal:C.border}`,background:restType===r?C.tealDim:"transparent",color:restType===r?C.teal:C.muted,cursor:"pointer",fontFamily:C.sans }}>{r}</button>
                    ))}
                  </div>
                </Card>
                <Card style={{ padding:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:C.muted,letterSpacing:.8,marginBottom:8 }}>TOOTH NUMBERS</div>
                  <input value={teeth} onChange={e=>setTeeth(e.target.value)} placeholder="e.g. 8, 9 or 30"
                    style={{ width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.border}`,background:C.surface2,color:C.ink,fontSize:12,fontFamily:C.font,outline:"none",boxSizing:"border-box" }} />
                </Card>
                <Card style={{ padding:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:C.muted,letterSpacing:.8,marginBottom:8 }}>NOTES</div>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Shade, design notes, special instructions…"
                    style={{ width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.border}`,background:C.surface2,color:C.ink,fontSize:12,fontFamily:C.sans,outline:"none",resize:"none",boxSizing:"border-box" }} />
                </Card>
                <Btn onClick={send} disabled={!canSend} style={{ padding:"18px 24px",fontSize:16,borderRadius:10 }}>
                  Send to {sys.name} →
                </Btn>
                {!canSend&&<div style={{ fontSize:13,color:C.muted,textAlign:"center" }}>{reqTotal-reqDone} required file{reqTotal-reqDone!==1?"s":""} remaining</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── STATUS ── */}
        {step==="status"&&job&&sys&&(
          <div style={{ maxWidth:520,margin:"0 auto" }}>
            <Card style={{ padding:28 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
                <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                  <span style={{ fontSize:22,color:sys.color }}>{sys.icon}</span>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700 }}>Sent to {sys.name}</div>
                    <div style={{ fontSize:10,fontFamily:C.font,color:C.muted }}>{job.id}</div>
                  </div>
                </div>
                <Tag label={job.status.toUpperCase()} color={job.status==="ready"?C.green:C.warn} dim={job.status==="ready"?"rgba(34,197,94,.1)":"rgba(245,158,11,.1)"} />
              </div>
              {/* Progress bar */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:12,color:C.muted }}>{job.status==="uploading"?"Uploading files…":job.status==="processing"?`Processing in ${sys.name}…`:"Design ready for review"}</span>
                  <span style={{ fontSize:12,fontFamily:C.font,fontWeight:700 }}>{job.progress}%</span>
                </div>
                <div style={{ height:6,background:C.surface2,borderRadius:3,overflow:"hidden" }}>
                  <div style={{ height:"100%",borderRadius:3,background:job.status==="ready"?C.teal:sys.color,width:`${job.progress}%`,transition:"width .4s ease" }} />
                </div>
              </div>
              {/* Case summary */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:14,borderRadius:7,background:C.surface2,marginBottom:20 }}>
                {[["System",sys.name],["Mode",MODES[mode].label],["Restoration",restType],["Teeth",teeth||"—"],["Files sent",`${uploaded} files`],["Started",job.startedAt.toLocaleTimeString()]].map(([k,v])=>(
                  <div key={k}><div style={{ fontSize:9,color:C.light,letterSpacing:1,marginBottom:2 }}>{k.toUpperCase()}</div><div style={{ fontSize:12,fontWeight:600 }}>{v}</div></div>
                ))}
              </div>
              {job.status==="ready"?(
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <Btn onClick={()=>navigate("restoration-cad")} style={{ padding:"12px 18px",fontSize:13 }}>Import design → Restora</Btn>
                  <Btn onClick={()=>navigate("export")} variant="secondary" style={{ padding:"11px 18px" }}>Open in partner system ↗</Btn>
                  <Btn onClick={reset} variant="ghost" style={{ padding:"11px 18px" }}>↺ New case</Btn>
                </div>
              ):(
                <div style={{ textAlign:"center",fontSize:12,color:C.muted }}>Waiting for {sys.name} to process…</div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OTHER SCREENS  (functional stubs with real interactions)
// ══════════════════════════════════════════════════════════════════
function Dashboard({ navigate, setActivePatient, customPatients=[] }) {
  const colorMap = { teal:C.teal, warn:C.warn, blue:C.blue, purple:C.purple, amber:C.amber };
  const allPatients = [...customPatients, ...PATIENTS];
  const cases = allPatients.map(p => ({ ...p, statusColor: colorMap[p.statusColor] || C.teal }));
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 780;

  async function openPatient(p, target = "smile-creator") {
    setActivePatient(p);
    navigate(target);
  }
  // Clinical stats derived from patient case data — replaces opaque
  // "Active / Ready / In-progress / Needed" labels with information a
  // clinician actually wants at-a-glance: photos uploaded, scans loaded,
  // cases with lab, and files still needed.
  const photosCount = cases.reduce((n,c) => n + (c.photos?.length || 0), 0);
  const scansCount  = cases.reduce((n,c) => n + (c.files?.filter(f => /\.stl$/i.test(f.name)).length || 0), 0);
  const withLabCount = cases.filter(c => c.status === "In progress").length;
  const filesNeededCount = cases.filter(c => c.status === "Files needed").length;
  const stats=[
    {label:"Active cases", value:String(cases.length), sub:"April 2026", color:C.teal},
    {label:"Photos on file", value:String(photosCount), sub:`across ${cases.length} patient${cases.length===1?'':'s'}`, color:C.green},
    {label:"STL scans loaded", value:String(scansCount), sub:"ready to design", color:C.blue},
    {label:"With lab", value:String(withLabCount), sub:filesNeededCount > 0 ? `${filesNeededCount} need files` : "on track", color:filesNeededCount > 0 ? C.warn : C.muted},
  ];

  // Pick a "current patient" for the hero CTA — the first active case if any
  const heroPatient = cases[0] || null;

  return (
    <div style={{ flex:1,overflow:"auto",padding:isNarrow?"24px 18px 100px":"40px 48px",background:C.bg,color:C.ink,fontFamily:C.sans }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:isNarrow?28:36,fontWeight:700,letterSpacing:"-.02em",marginBottom:10 }}>Dashboard</div>
          <div style={{ fontSize:isNarrow?15:18,color:C.muted,marginBottom:0 }}>Active cases · April 2026</div>
        </div>
        <button onClick={()=>window.dispatchEvent(new CustomEvent('restora:open-new-patient'))}
          style={{ padding:isNarrow?"14px 20px":"16px 24px", borderRadius:12, fontSize:isNarrow?15:17, fontWeight:700,
            background:`linear-gradient(135deg, ${C.teal}, #0080cc)`, color:"white", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10, fontFamily:C.sans,
            boxShadow:`0 6px 24px ${C.teal}50` }}>
          <span style={{ fontSize:22, lineHeight:1, fontWeight:400 }}>+</span>
          New Patient
        </button>
      </div>
      <div style={{ marginBottom:isNarrow?24:36 }} />

      {/* ── Hero CTA: Start New Smile Design ── */}
      {heroPatient && (
        <button onClick={()=>openPatient(heroPatient, "smile-creator")}
          style={{
            width:"100%", marginBottom:isNarrow?20:28,
            padding:isNarrow?"20px 22px":"26px 30px",
            borderRadius:16,
            background:`linear-gradient(135deg, ${C.teal}1f 0%, ${C.teal}0a 100%)`,
            border:`1px solid ${C.teal}55`,
            cursor:"pointer", fontFamily:C.sans, textAlign:"left",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:20,
            transition:"all .18s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${C.teal}30`; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor = C.teal+"60"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div style={{ display:"flex", alignItems:"center", gap:isNarrow?14:22, minWidth:0, flex:1 }}>
            <div style={{ width:isNarrow?56:72, height:isNarrow?56:72, borderRadius:16, background:C.teal+"22", color:C.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isNarrow?28:36, flexShrink:0, fontFamily:C.font, fontWeight:300 }}>○</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:isNarrow?11:13, fontFamily:C.font, letterSpacing:2, color:C.teal, fontWeight:700, marginBottom:4 }}>START NEW SMILE DESIGN</div>
              <div style={{ fontSize:isNarrow?20:26, fontWeight:800, color:C.ink, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{heroPatient.name}</div>
              <div style={{ fontSize:isNarrow?13:15, color:C.muted }}>{heroPatient.type} · Teeth {heroPatient.teeth}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, color:C.teal, fontSize:isNarrow?14:16, fontWeight:700, flexShrink:0 }}>
            {!isNarrow && <span>Design →</span>}
            {isNarrow && <span style={{ fontSize:24 }}>→</span>}
          </div>
        </button>
      )}

      {/* Stats row */}
      <div style={{ display:"grid",gridTemplateColumns:isNarrow?"repeat(2, 1fr)":"repeat(4, 1fr)",gap:isNarrow?12:18,marginBottom:isNarrow?20:28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ padding:isNarrow?18:26, borderRadius:12, border:`1px solid ${C.border}`, background:C.surface }}>
            <div style={{ fontSize:isNarrow?11:12, fontFamily:C.font, letterSpacing:2, color:C.muted, marginBottom:isNarrow?10:14, textTransform:"uppercase", fontWeight:700 }}>{s.label}</div>
            <div style={{ fontSize:isNarrow?32:40, fontWeight:700, color:C.ink, lineHeight:1, marginBottom:8, fontFamily:C.font, letterSpacing:"-.02em" }}>{s.value}</div>
            <div style={{ fontSize:isNarrow?12:14, color:s.color, fontWeight:500 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions — now focused on primary clinical tools */}
      <div style={{ display:"grid",gridTemplateColumns:isNarrow?"1fr":"1fr 1fr 1fr",gap:isNarrow?12:18,marginBottom:isNarrow?24:32 }}>
        {[
          {label:"Smile Creator",   desc:"2D smile design on patient photo",   icon:"○", action:"smile-creator", color:C.teal},
          {label:"Scan Viewer",     desc:"3D scan review + lab export",         icon:"◉",  action:"restoration-cad", color:C.purple},
          {label:"X-ray Analysis",  desc:"AI-assisted radiograph review",       icon:"△",  action:"xray-analysis", color:C.amber},
        ].map(a=>(
          <button key={a.label} onClick={()=>navigate(a.action)} style={{ padding:isNarrow?22:30,borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:C.sans,textAlign:"left",transition:"all .18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color+"80"; e.currentTarget.style.background=C.surface2;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.surface;}}>
            <span style={{ fontSize:isNarrow?26:30,color:a.color,display:"block",marginBottom:14, fontFamily:C.font, fontWeight:300 }}>{a.icon}</span>
            <div style={{ fontSize:isNarrow?17:19,fontWeight:700,color:C.ink,marginBottom:6 }}>{a.label}</div>
            <div style={{ fontSize:isNarrow?13:15,color:C.muted,lineHeight:1.5 }}>{a.desc}</div>
          </button>
        ))}
      </div>

      {/* Cases */}
      <Card>
        <div style={{ padding:"20px 26px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontFamily:C.font,color:C.teal,letterSpacing:2.5,fontWeight:700 }}>ACTIVE CASES</div>
        {cases.map((c,i)=>(
          <div key={c.id} style={{ padding:"24px 26px",borderBottom:i<cases.length-1?`1px solid ${C.borderSoft}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .15s" }}
            onClick={()=>openPatient(c, "smile-creator")}
            onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ display:"flex",gap:20,alignItems:"center" }}>
              <div style={{ width:52,height:52,borderRadius:12,background:`${C.teal}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:C.teal }}>
                {c.name.split(" ").map(n=>n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize:19,fontWeight:700,color:C.ink,marginBottom:5 }}>{c.name}</div>
                <div style={{ fontSize:15,color:C.muted }}>{c.type} · Teeth {c.teeth}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={(e)=>{ e.stopPropagation(); openPatient(c, "smile-creator"); }}
                style={{ padding:"7px 14px", borderRadius:7, border:`1px solid ${C.teal}60`, background:C.teal+"15", color:C.teal, fontSize:12, fontWeight:700, fontFamily:C.sans, cursor:"pointer", letterSpacing:0.3 }}>
                DESIGN
              </button>
              <button onClick={(e)=>{ e.stopPropagation(); openPatient(c, "restoration-cad"); }}
                style={{ padding:"7px 14px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.muted, fontSize:12, fontWeight:700, fontFamily:C.sans, cursor:"pointer", letterSpacing:0.3 }}>
                SCAN
              </button>
              <Tag label={c.status} color={c.statusColor} dim={c.statusColor+"22"} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}


function ToothLibScreen() {
  const [view, setView]     = useState("packs");  // packs | anatomy
  const [selPack, setSelPack] = useState(null);
  const [selTooth, setSelTooth] = useState(null);
  const [downloading, setDl] = useState(null);
  const [sel, setSel] = useState(TEETH_DB.find(t=>t.n===8));
  const [archView, setArchView] = useState("max");
  const [filter, setFilter] = useState("all"); // all | anterior | premolar | molar

  const displayed = TEETH_DB.filter(t =>
    t.arch === archView && (filter==="all" || t.region===filter)
  );

  const ant6 = archView==="max"
    ? TEETH_DB.filter(t=>ANT6_MAX.includes(t.n))
    : TEETH_DB.filter(t=>ANT6_MAND.includes(t.n));

  const regionCol = sel ? REGION_COLOR[sel.region] : C.teal;

  function downloadFile(packId, tooth) {
    setDl(tooth.file);
    const url = `/libraries/${packId}/${tooth.file}`;
    const a = document.createElement('a');
    a.href = url; a.download = tooth.file; a.click();
    setTimeout(() => setDl(null), 1500);
  }

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      {/* Header */}
      <div style={{ padding:"20px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:20, fontWeight:700 }}>Tooth Library</div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={()=>setView("packs")} style={{ padding:"6px 14px", borderRadius:6, fontSize:11, fontWeight:700, border:`1px solid ${view==="packs"?C.teal:C.border}`, background:view==="packs"?C.tealDim:"transparent", color:view==="packs"?C.teal:C.muted, cursor:"pointer", fontFamily:C.sans }}>Library Packs</button>
          <button onClick={()=>setView("anatomy")} style={{ padding:"6px 14px", borderRadius:6, fontSize:11, fontWeight:700, border:`1px solid ${view==="anatomy"?C.teal:C.border}`, background:view==="anatomy"?C.tealDim:"transparent", color:view==="anatomy"?C.teal:C.muted, cursor:"pointer", fontFamily:C.sans }}>Anatomy Guide</button>
          {view==="anatomy" && ["max","mand"].map(a=>(
            <button key={a} onClick={()=>{setArchView(a);setFilter("all");}} style={{ padding:"6px 14px", borderRadius:6, fontSize:11, fontWeight:700, border:`1px solid ${archView===a?C.blue:C.border}`, background:archView===a?C.blueDim:"transparent", color:archView===a?C.blue:C.muted, cursor:"pointer", fontFamily:C.sans }}>
              {a==="max"?"Maxillary":"Mandibular"}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIBRARY PACKS VIEW ────────────────────────────────── */}
      {view==="packs" && (
        <div style={{ padding:"20px 28px 28px" }}>
          {!selPack ? (
            <>
              <div style={{ fontSize:11, color:C.muted, marginBottom:16 }}>Select a library pack to browse and download individual tooth STL files</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:24 }}>
                {LIBRARY_PACKS.map(pack => (
                  <button key={pack.id} onClick={()=>setSelPack(pack)}
                    style={{ padding:20, borderRadius:12, border:`1.5px solid ${pack.color}40`, background:pack.color+"0a", cursor:"pointer", fontFamily:C.sans, textAlign:"left", transition:"all .15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=pack.color+"18"; e.currentTarget.style.borderColor=pack.color+"80";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=pack.color+"0a"; e.currentTarget.style.borderColor=pack.color+"40";}}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:pack.color }}>{pack.name}</div>
                      <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, background:pack.color+"20", color:pack.color, fontFamily:C.font, fontWeight:700 }}>{pack.teeth.length} TEETH</span>
                    </div>
                    <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:6 }}>{pack.style}</div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{pack.description}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={()=>setSelPack(null)} style={{ fontSize:12, color:C.muted, background:"none", border:"none", cursor:"pointer", padding:"0 0 16px", fontFamily:C.sans }}>← Back to packs</button>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:16, borderRadius:10, border:`1px solid ${selPack.color}40`, background:selPack.color+"0a" }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:selPack.color }}>{selPack.name}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{selPack.style} · {selPack.description}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {selPack.teeth.map(tooth => (
                  <div key={tooth.file} style={{ padding:14, borderRadius:9, border:`1px solid ${selPack.color}30`, background:C.surface }}>
                    <div style={{ fontSize:13, fontWeight:800, color:selPack.color, fontFamily:C.font, marginBottom:4 }}>
                      {tooth.num < 90 ? `#${tooth.num}` : "Full"}
                    </div>
                    <div style={{ fontSize:11, fontWeight:600, color:C.ink, marginBottom:4 }}>{tooth.label}</div>
                    <div style={{ fontSize:10, color:C.muted, marginBottom:12, fontFamily:C.font }}>{tooth.tris.toLocaleString()} tris</div>
                    {tooth.file ? (
                      <a href={`/libraries/${selPack.id}/${tooth.file}`} download={tooth.file}
                        style={{ display:"block", padding:"7px 10px", borderRadius:5, fontSize:10, fontWeight:700, textAlign:"center",
                          background:downloading===tooth.file?C.surface2:selPack.color, color:downloading===tooth.file?C.muted:"white",
                          textDecoration:"none", transition:"all .15s" }}
                        onClick={()=>setDl(tooth.file)}>
                        {downloading===tooth.file ? "Downloading…" : "⬇ Download STL"}
                      </a>
                    ) : (
                      <div style={{ padding:"7px 10px", borderRadius:5, fontSize:9, fontWeight:700, textAlign:"center", background:C.surface2, color:C.muted }}>
                        Exocad .eoff format
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ANATOMY GUIDE VIEW (existing) ─────────────────────── */}
      {view==="anatomy" && <>

      {/* Anterior 6 spotlight */}
      <div style={{ padding:"16px 28px 0" }}>
        <div style={{ fontSize:9, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10 }}>ANTERIOR 6 — {archView==="max"?"MAXILLARY":"MANDIBULAR"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:20 }}>
          {ant6.map(t=>(
            <button key={t.n} onClick={()=>setSel(t)}
              style={{ padding:"14px 8px", borderRadius:10, border:`2px solid ${sel?.n===t.n?C.teal:C.tealBorder}`, background:sel?.n===t.n?C.tealDim:C.surface, cursor:"pointer", fontFamily:C.sans, textAlign:"center", transition:"all .15s", boxShadow:sel?.n===t.n?`0 4px 12px rgba(10,186,181,.2)`:"none" }}
              onMouseEnter={e=>{if(sel?.n!==t.n){e.currentTarget.style.background=C.tealDim;}}}
              onMouseLeave={e=>{if(sel?.n!==t.n){e.currentTarget.style.background=C.surface;}}}>
              {/* Tooth shape SVG */}
              <svg width="32" height="44" viewBox="0 0 32 44" style={{ display:"block", margin:"0 auto 6px" }}>
                {t.region==="anterior"?(
                  <g>
                    <ellipse cx="16" cy="16" rx="10" ry="14" fill={sel?.n===t.n?"#0abab5":"#d4f0ee"} stroke={sel?.n===t.n?C.teal:C.tealBorder} strokeWidth="1.5"/>
                    <rect x="13" y="28" width="6" height="14" rx="3" fill={sel?.n===t.n?"#7cd8d5":"#b2e0dd"}/>
                  </g>
                ):(
                  <g>
                    <rect x="6" y="6" width="20" height="18" rx="4" fill={sel?.n===t.n?"#0abab5":"#d4f0ee"} stroke={sel?.n===t.n?C.teal:C.tealBorder} strokeWidth="1.5"/>
                    <rect x="10" y="22" width="5" height="14" rx="2.5" fill={sel?.n===t.n?"#7cd8d5":"#b2e0dd"}/>
                    <rect x="17" y="22" width="5" height="14" rx="2.5" fill={sel?.n===t.n?"#7cd8d5":"#b2e0dd"}/>
                  </g>
                )}
              </svg>
              <div style={{ fontSize:13, fontWeight:800, color:sel?.n===t.n?C.teal:C.ink, fontFamily:C.font }}>#{t.n}</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2, lineHeight:1.3 }}>{t.short}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:0, minHeight:0 }}>
        {/* Left: full arch list */}
        <div style={{ padding:"0 28px 28px", overflow:"auto" }}>
          {/* Filter */}
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {["all","anterior","premolar","molar"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:"4px 12px", borderRadius:5, fontSize:10, fontWeight:600, border:`1px solid ${filter===f?C.teal:C.border}`, background:filter===f?C.tealDim:"transparent", color:filter===f?C.teal:C.muted, cursor:"pointer", fontFamily:C.sans, textTransform:"capitalize" }}>
                {f==="all"?"All regions":f}
              </button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:10, color:C.muted, alignSelf:"center" }}>{displayed.length} teeth</span>
          </div>

          {/* Tooth grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {displayed.map(t=>{
              const col = REGION_COLOR[t.region];
              return (
                <button key={t.n} onClick={()=>setSel(t)}
                  style={{ padding:"12px 10px", borderRadius:8, border:`1.5px solid ${sel?.n===t.n?col:C.border}`, background:sel?.n===t.n?col+"15":C.surface, cursor:"pointer", fontFamily:C.sans, textAlign:"left", transition:"all .15s" }}
                  onMouseEnter={e=>{if(sel?.n!==t.n){e.currentTarget.style.background=col+"0d"; e.currentTarget.style.borderColor=col+"60";}}}
                  onMouseLeave={e=>{if(sel?.n!==t.n){e.currentTarget.style.background=C.surface; e.currentTarget.style.borderColor=C.border;}}}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:sel?.n===t.n?col:C.ink, fontFamily:C.font }}>#{t.n}</span>
                    {t.aep && <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, background:C.tealDim, color:C.teal, fontFamily:C.font, fontWeight:700 }}>AEP</span>}
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color:C.ink, marginBottom:2, lineHeight:1.3 }}>{t.name}</div>
                  <div style={{ fontSize:9, color:col, fontWeight:600, textTransform:"capitalize" }}>{t.region}</div>
                  <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{t.L} · {t.W}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: detail panel */}
        <div style={{ borderLeft:`1px solid ${C.border}`, background:C.surface, overflow:"auto", position:"sticky", top:0 }}>
          {sel ? (
            <div style={{ padding:20 }}>
              {/* Tooth visual */}
              <div style={{ textAlign:"center", padding:"20px 0 16px", borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
                <svg width="60" height="80" viewBox="0 0 60 80" style={{ display:"block", margin:"0 auto 10px" }}>
                  {sel.region==="anterior"?(
                    <g>
                      <ellipse cx="30" cy="28" rx="20" ry="26" fill={regionCol+"25"} stroke={regionCol} strokeWidth="2"/>
                      <ellipse cx="30" cy="28" rx="13" ry="18" fill={regionCol+"15"}/>
                      <rect x="24" y="52" width="12" height="26" rx="6" fill={regionCol+"20"} stroke={regionCol+"60"} strokeWidth="1.5"/>
                    </g>
                  ):sel.region==="premolar"?(
                    <g>
                      <rect x="10" y="8" width="40" height="34" rx="8" fill={regionCol+"25"} stroke={regionCol} strokeWidth="2"/>
                      <circle cx="22" cy="24" r="5" fill={regionCol+"40"}/>
                      <circle cx="38" cy="24" r="5" fill={regionCol+"40"}/>
                      <rect x="20" y="40" width="10" height="30" rx="5" fill={regionCol+"20"} stroke={regionCol+"60"} strokeWidth="1.5"/>
                      <rect x="32" y="40" width="10" height="30" rx="5" fill={regionCol+"20"} stroke={regionCol+"60"} strokeWidth="1.5"/>
                    </g>
                  ):(
                    <g>
                      <rect x="6" y="8" width="48" height="36" rx="9" fill={regionCol+"25"} stroke={regionCol} strokeWidth="2"/>
                      <circle cx="18" cy="24" r="5" fill={regionCol+"40"}/>
                      <circle cx="30" cy="18" r="4" fill={regionCol+"40"}/>
                      <circle cx="42" cy="24" r="5" fill={regionCol+"40"}/>
                      <rect x="14" y="42" width="10" height="28" rx="5" fill={regionCol+"20"} stroke={regionCol+"60"} strokeWidth="1.5"/>
                      <rect x="36" y="42" width="10" height="28" rx="5" fill={regionCol+"20"} stroke={regionCol+"60"} strokeWidth="1.5"/>
                    </g>
                  )}
                </svg>
                <div style={{ fontSize:18, fontWeight:800, color:regionCol, fontFamily:C.font }}>#{sel.n}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginTop:2 }}>{sel.name}</div>
                <div style={{ fontSize:10, color:regionCol, marginTop:4, textTransform:"capitalize", fontWeight:600 }}>{sel.arch==="max"?"Maxillary":"Mandibular"} {sel.region}</div>
                {sel.aep && <div style={{ display:"inline-block", marginTop:6, padding:"2px 8px", borderRadius:4, background:C.tealDim, color:C.teal, fontSize:9, fontFamily:C.font, fontWeight:700 }}>AEP GUIDELINES APPLY</div>}
              </div>

              {/* Anatomy */}
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, marginBottom:8 }}>ANATOMY</div>
              {[
                ["Crown length", sel.L],
                ["Crown width", sel.W],
                ["Root length", sel.root],
                ["Roots", sel.roots+" root"+(sel.roots>1?"s":"")],
                ["Cusps", sel.cusp>0?sel.cusp+" cusp"+(sel.cusp>1?"s":""):"Incisal edge"],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}`, fontSize:11 }}>
                  <span style={{ color:C.muted }}>{l}</span>
                  <span style={{ color:C.ink, fontFamily:C.font, fontWeight:600 }}>{v}</span>
                </div>
              ))}

              {/* Design protocol */}
              <div style={{ fontSize:9, fontFamily:C.font, color:C.muted, letterSpacing:2, margin:"14px 0 8px" }}>DESIGN PROTOCOL</div>
              {[
                ["Tissue biotype", sel.biotype],
                ["Prep type", sel.prep],
                ["Material", sel.mat],
                ["Margin", sel.margin],
                ["Emergence", sel.emergence],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}`, fontSize:11 }}>
                  <span style={{ color:C.muted }}>{l}</span>
                  <span style={{ color:C.ink, fontFamily:C.font, fontWeight:600, textAlign:"right", maxWidth:160 }}>{v}</span>
                </div>
              ))}

              {/* Clinical note */}
              <div style={{ marginTop:14, padding:12, borderRadius:7, background:regionCol+"0d", border:`1px solid ${regionCol}30` }}>
                <div style={{ fontSize:9, fontFamily:C.font, color:regionCol, letterSpacing:1, marginBottom:6 }}>CLINICAL NOTE</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{sel.note}</div>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:10, color:C.muted }}>
              <div style={{ fontSize:28 }}>⊡</div>
              <div style={{ fontSize:13 }}>Select a tooth</div>
            </div>
          )}
        </div>
      </div>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR + TITLEBAR
// ══════════════════════════════════════════════════════════════════
const SECTIONS = ["Start","Design","Planning","Delivery","Library"];

function Sidebar({ screen, navigate, activePatient }) {
  const grouped = {};
  Object.entries(SCREENS).forEach(([k,v])=>{
    if (v.hidden || !v.section) return;
    grouped[v.section]=[...(grouped[v.section]||[]),{k,...v}];
  });
  const p = activePatient;
  const displayName = p?.name || "No active patient";
  const displayInitials = p?.initials || "—";
  const displaySub = p ? `${p.type} · ${p.teeth}` : "Tap a patient on the dashboard";
  return (
    <div style={{ width:270,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden" }}>
      {/* Patient card */}
      <div style={{ padding:"16px 16px 12px" }}>
        <div style={{ padding:"16px",background:C.surface2,borderRadius:10,border:`1px solid ${p?C.teal+"60":C.border}`,cursor:"pointer" }} onClick={()=>navigate("dashboard")}>
          <div style={{ display:"flex",gap:13,alignItems:"center" }}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:p?`linear-gradient(135deg,${C.teal},#0080cc)`:C.surface3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"white",flexShrink:0 }}>{displayInitials}</div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:16,fontWeight:700,color:C.ink,marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayName}</div>
              <div style={{ fontSize:12,color:p?C.teal:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displaySub}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Nav */}
      <div style={{ flex:1,overflow:"auto",padding:"0 12px 12px" }}>
        {SECTIONS.map(section=>{
          const items=grouped[section]||[];
          return (
            <div key={section} style={{ marginBottom:8 }}>
              <div style={{ fontSize:11,fontFamily:C.font,color:C.muted,letterSpacing:2.5,padding:"12px 12px 8px",fontWeight:700 }}>{section.toUpperCase()}</div>
              {items.map(item=>{
                const active=screen===item.k;
                return (
                  <button key={item.k} onClick={()=>navigate(item.k)}
                    style={{ display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:C.sans,transition:"all .15s",background:active?C.tealDim:"transparent",marginBottom:3 }}
                    onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.surface2;}}
                    onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                    <span style={{ fontSize:17,color:active?C.teal:C.muted,flexShrink:0 }}>{item.icon}</span>
                    <span style={{ fontSize:16,fontWeight:active?700:500,color:active?C.teal:C.ink,flex:1,textAlign:"left" }}>{item.label}</span>
                    {item.badge&&<Tag label={item.badge} color={active?C.teal:C.muted} dim={active?C.tealDim:C.surface3} />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TitleBar({ screen, navigate, onMenuClick, isMobile }) {
  const def=SCREENS[screen]||{};
  return (
    <div style={{ height:50,display:"flex",alignItems:"center",padding:"0 14px",gap:12,background:C.surface,borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
      {isMobile ? (
        <button onClick={onMenuClick} aria-label="Menu"
          style={{ width:40, height:40, borderRadius:8, border:"none", background:C.surface2, color:C.ink, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      ) : (
        // Quiet macOS-style traffic-light dots: all grey until hovered.
        <div style={{ display:"flex",gap:6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width:12,height:12,borderRadius:"50%",background:C.borderSoft }} />)}
        </div>
      )}
      <div style={{ display:"flex",alignItems:"center",gap:8,marginLeft:isMobile?0:8 }}>
        <div style={{ width:26,height:26,borderRadius:7,background:C.teal,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M1.5 10.5C1.5 7 4 2 6 2C8 2 10.5 7 10.5 10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="10.5" r="1.2" fill="white"/></svg>
        </div>
        <span style={{ fontSize:15,color:C.ink,fontWeight:600,letterSpacing:"-.01em" }}>Re<span style={{ color:C.teal }}>stora</span></span>
      </div>
      {!isMobile && (
        <>
          <span style={{ fontSize:13,color:C.light }}>›</span>
          <span style={{ fontSize:13,fontWeight:500,color:C.muted }}>{def.label||screen}</span>
        </>
      )}
      <div style={{ flex:1 }} />
      {!isMobile && (
        // Single quiet action: ⌘K AI. "Share" moved out of top bar; export
        // actions live on the Export screen, not in the global header.
        <button onClick={()=>navigate("ai-design-guide")}
          style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,fontSize:12,fontFamily:C.font,color:C.muted,cursor:"pointer",letterSpacing:.5 }}
          onMouseEnter={e=>{ e.currentTarget.style.color=C.teal; e.currentTarget.style.borderColor=C.teal+"60"; }}
          onMouseLeave={e=>{ e.currentTarget.style.color=C.muted; e.currentTarget.style.borderColor=C.border; }}>
          ⌘K AI
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [activePatient, setActivePatient] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 780);
  const [customPatients, setCustomPatients] = useState([]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 780);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const navigate = (s) => { setScreen(s); if (isMobile) setSidebarOpen(false); };

  // AI assistant handlers
  const onCreateCase = (caseData) => {
    const newPatient = {
      id: `ai-${Date.now()}`,
      name: caseData.patient_name,
      initials: caseData.patient_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),
      teeth: (caseData.teeth || []).map(t=>`#${t}`).join(", "),
      type: caseData.case_type || "Custom case",
      subtype: caseData.subtype || "AI-generated",
      status: "Files needed",
      statusColor: "warn",
      route: caseData.case_type?.includes("implant") ? "implant" : "prep",
      system: caseData.case_type?.includes("implant") ? "lab" : (caseData.teeth?.length > 4 ? "lab" : "mill"),
      age: caseData.age || null,
      gender: caseData.gender || null,
      notes: caseData.notes || "",
      parameters: caseData.parameters || {},
      files: [],
      aiGenerated: true,
    };
    setCustomPatients(prev => [newPatient, ...prev]);
    setActivePatient(newPatient);
    setTimeout(() => navigate("ai-design-guide"), 600);
  };

  const onModifyCase = (caseData) => {
    if (!activePatient) return;
    const updated = { ...activePatient };
    if (caseData.parameters) {
      updated.parameters = { ...(activePatient.parameters || {}), ...caseData.parameters };
    }
    if (caseData.notes) updated.notes = `${activePatient.notes || ''}\n\n[AI modification] ${caseData.notes}`.trim();
    setActivePatient(updated);
  };

  const renderScreen = () => {
    switch(screen) {
      case "dashboard":       return <Dashboard navigate={navigate} setActivePatient={setActivePatient} customPatients={customPatients} />;
      case "ai-design-guide": return <AIDesignGuide navigate={navigate} activePatient={activePatient} />;
      case "design-bridge":   return <DesignBridge navigate={navigate} activePatient={activePatient} clearPatient={()=>setActivePatient(null)} />;
      case "restoration-cad": return <RestorationCADNew navigate={navigate} activePatient={activePatient} />;
      case "smile-creator":   return <SmileCreatorNew navigate={navigate} activePatient={activePatient} />;
      case "smile-sim":       return <SmileSimulationNew navigate={navigate} activePatient={activePatient} />;
      case "implant-plan":    return <ImplantPlanningNew navigate={navigate} activePatient={activePatient} />;
      case "radiograph":      return <RadiographScreen />;
      case "full-arch":       return <FullArchNew navigate={navigate} activePatient={activePatient} />;
      case "export":          return <ExportHubNew navigate={navigate} activePatient={activePatient} />;
      case "tooth-library":   return <ToothLibraryBrowserNew navigate={navigate} activePatient={activePatient} />;
      default: return (
        <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:C.muted }}>
          <div style={{ fontSize:28 }}>◈</div>
          <div style={{ fontSize:14 }}>{SCREENS[screen]?.label || screen}</div>
          <div style={{ fontSize:12 }}>Coming soon</div>
        </div>
      );
    }
  };

  return (
    <div style={{ width:"100vw",height:"100vh",display:"flex",flexDirection:"column",background:C.bg,color:C.ink,fontFamily:C.sans,overflow:"hidden" }}>
      <TitleBar screen={screen} navigate={navigate} onMenuClick={()=>setSidebarOpen(o=>!o)} isMobile={isMobile} />
      <div style={{ flex:1,display:"flex",overflow:"hidden",position:"relative" }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={()=>setSidebarOpen(false)}
            style={{ position:"fixed", inset:0, top:0, background:"rgba(0,0,0,.6)", zIndex:100, backdropFilter:"blur(4px)" }}/>
        )}
        {/* Sidebar */}
        <div style={{
          position: isMobile ? "fixed" : "relative",
          top: isMobile ? 0 : "auto",
          left: 0, bottom: 0, zIndex: 101,
          height: isMobile ? "100vh" : "auto",
          transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
          transition: "transform .25s ease",
        }}>
          <Sidebar screen={screen} navigate={navigate} activePatient={activePatient} />
        </div>
        <main style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",width:isMobile?"100vw":"auto" }}>
          {renderScreen()}
        </main>
      </div>
      <AIAssistant onCreateCase={onCreateCase} onModifyCase={onModifyCase} navigate={navigate} />
    </div>
  );
}
