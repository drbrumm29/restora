import { useState, useCallback, useReducer } from "react";

const T = {
  bg: "#0d1117", surface: "#161b22", surface2: "#21262d", surface3: "#2d333b",
  border: "#30363d", borderSoft: "#21262d", ink: "#e6edf3", muted: "#8b949e", light: "#484f58",
  teal: "#00b48a", tealDim: "rgba(0,180,138,.12)", tealBorder: "rgba(0,180,138,.25)",
  gold: "#d4a843", goldDim: "rgba(212,168,67,.1)",
  amber: "#f0883e", amberDim: "rgba(240,136,62,.1)",
  purple: "#bc8cff", purpleDim: "rgba(188,140,255,.1)",
  red: "#f85149", green: "#3fb950",
  font: "'DM Mono', monospace", fontSans: "system-ui, sans-serif",
  shadow: "0 0 0 1px rgba(255,255,255,.04), 0 4px 16px rgba(0,0,0,.4)",
};

const CASE_TYPES = {
  "cosmetic-anterior": { label: "Cosmetic Anterior", icon: "✦", subtitle: "Veneers · Crowns · Bonding", color: T.gold, colorDim: T.goldDim, systems: ["Smile Design","Mill Connect","Lab CAD"], description: "Esthetic zone cases where smile design parameters drive all decisions" },
  "smile-makeover": { label: "Smile Makeover", icon: "◈", subtitle: "Full arch esthetic redesign", color: T.teal, colorDim: T.tealDim, systems: ["Smile Design","Lab CAD","Mill Connect"], description: "Multi-unit comprehensive esthetic treatment — full protocol applied" },
  "restorative-posterior": { label: "Restorative Posterior", icon: "⬡", subtitle: "Crowns · Onlays · Inlays", color: T.purple, colorDim: T.purpleDim, systems: ["Mill Connect","Lab CAD"], description: "Function-first design with biologic shaping and occlusal protocol" },
  "implant-single": { label: "Single Implant", icon: "◆", subtitle: "Crown on implant — any zone", color: T.amber, colorDim: T.amberDim, systems: ["Lab CAD","Mill Connect"], description: "Implant crown design — emergence, platform matching, esthetic integration" },
  "implant-full-arch": { label: "Full Arch Implant", icon: "⬟", subtitle: "Hybrid · Zirconia · Bar", color: T.teal, colorDim: T.tealDim, systems: ["Lab CAD"], description: "Complete arch prosthetic design — Bar, monolithic, FP3, All-on-X" },
};

const PARAMS_ESTHETIC = [
  { id:"smile_arc", label:"Smile arc", type:"select", aacd:true, options:["Consonant (ideal)","Slightly flat","Reverse — must correct","Maintain existing"], default:"Consonant (ideal)", tip:"AACD: follows lower lip — never flat or reverse" },
  { id:"wl_ratio", label:"Central W:L ratio", type:"range", aacd:true, min:65, max:90, step:1, unit:"%", default:78, tip:"AACD standard: 75–80%" },
  { id:"incisal_display", label:"Incisal display at repose", type:"range", aacd:true, min:0, max:5, step:0.5, unit:"mm", default:2, tip:"AACD: 1–3mm typical" },
  { id:"midline", label:"Midline treatment", type:"select", aacd:true, options:["Align to facial midline","Maintain existing","Shift right","Shift left","Accept deviation <1mm"], default:"Align to facial midline", tip:"AACD: deviations >1mm are perceptible" },
  { id:"gingival_levels", label:"Gingival levels", type:"select", aacd:true, options:["Centrals = canines · laterals 0.5mm coronal (AACD)","All at same level","Custom"], default:"Centrals = canines · laterals 0.5mm coronal (AACD)", tip:"AACD: zenith at distal 1/3. Laterals slightly coronal." },
  { id:"tooth_form", label:"Tooth form", type:"select", options:["Square-tapering (balanced)","Ovoid (soft/feminine)","Triangular (bold/youthful)","Square (broad/masculine)","Match existing"], default:"Square-tapering (balanced)" },
  { id:"embrasure", label:"Embrasure form", type:"select", aacd:true, options:["Open (youthful)","Closed (mature)","Progressive — open anteriorly"], default:"Progressive — open anteriorly" },
  { id:"axial_incl", label:"Axial inclination", type:"select", aacd:true, options:["Mesial convergence (ideal)","Upright","Custom"], default:"Mesial convergence (ideal)" },
  { id:"surface_texture", label:"Surface texture", type:"select", options:["Smooth (high gloss)","Subtle perikymata","Moderate texture","Pronounced (natural)"], default:"Subtle perikymata" },
  { id:"shade", label:"Target shade", type:"select", options:["BL1","BL2","BL3","BL4","A1","A2","A3","A3.5","B1","B2","Match existing","Custom"], default:"A1" },
  { id:"characterisation", label:"Characterisation", type:"multiselect", options:["Mamelons","Incisal halo","Cervical chroma","Surface crazing","Stain lines","None"], default:["Incisal halo","Cervical chroma"] },
];

const PARAMS_PREP = [
  { id:"prep_type", label:"Preparation type", type:"select", options:["No-prep","Minimal prep <0.3mm","Conventional veneer 0.3–0.5mm","Crown full coverage","Onlay","Inlay","Post + core"], default:"Minimal prep <0.3mm" },
  { id:"margin_type", label:"Margin type", type:"select", options:["Feather/knife edge","Chamfer 0.3mm","Chamfer 0.5mm","Heavy chamfer","Shoulder","Rounded shoulder"], default:"Chamfer 0.3mm" },
  { id:"margin_location", label:"Margin location", type:"select", options:["Supragingival 0.5–1mm (ideal)","Equigingival","Subgingival 0.5mm","Subgingival 1mm"], default:"Supragingival 0.5–1mm (ideal)", tip:"Technique manual: supragingival preferred" },
  { id:"facial_reduction", label:"Facial reduction", type:"range", min:0, max:1.5, step:0.1, unit:"mm", default:0.3, tip:"Flag if >0.5mm" },
  { id:"material", label:"Material", type:"select", options:["Pressed lithium disilicate","Milled lithium disilicate","Feldspathic porcelain","Composite resin","Zirconia HT","Zirconia MT monolithic","Cast gold","PFM"], default:"Pressed lithium disilicate" },
  { id:"emergence", label:"Emergence profile", type:"select", options:["Zero tissue push (ideal)","Minimal push <0.5mm","Standard","Customise to shaped root"], default:"Zero tissue push (ideal)", tip:"Technique manual: concave/flat subgingival. Never convex." },
];

const PARAMS_OCCLUSAL = [
  { id:"occlusal_scheme", label:"Occlusal scheme", type:"select", options:["Canine-guided (default)","Mutually protected","Group function","Lingualized (full arch)"], default:"Canine-guided (default)" },
  { id:"anterior_guidance", label:"Anterior guidance", type:"select", options:["Establish · posterior disclusion required","Maintain existing","Shallow — parafunctional concern","Steep — not modifying"], default:"Establish · posterior disclusion required" },
  { id:"centric_contacts", label:"Centric contacts", type:"select", options:["Flat planes (ideal)","Cusp tip — must adjust","Tripod contacts","No contacts (implant)"], default:"Flat planes (ideal)" },
];

const PARAMS_IMPLANT = [
  { id:"implant_zone", label:"Zone", type:"select", options:["Anterior esthetic (1–3)","Posterior load-bearing","Replacing canine (guidance concern)"], default:"Posterior load-bearing" },
  { id:"restoration_type_impl", label:"Restoration type", type:"select", options:["Screw-retained crown (preferred)","Cement-retained crown","Custom abutment + crown","Bar overdenture"], default:"Screw-retained crown (preferred)" },
  { id:"platform", label:"Platform switching", type:"toggle", default:true, tip:"Preserves crestal bone" },
  { id:"prosthetic_space", label:"Prosthetic space", type:"range", min:5, max:20, step:0.5, unit:"mm", default:10 },
  { id:"immediate_load", label:"Immediate loading", type:"toggle", default:false, tip:"Requires ≥35 Ncm" },
];

function Badge({ label, color, dim }) {
  return <span style={{ padding:"2px 7px", borderRadius:3, fontSize:9, fontWeight:700, letterSpacing:.8, background:dim, color, border:`1px solid ${color}30`, fontFamily:T.font }}>{label}</span>;
}

function Flag({ level, message }) {
  const c = { pass:T.green, warning:T.gold, critical:T.red }[level] || T.muted;
  const ic = { pass:"✓", warning:"⚠", critical:"✕" }[level];
  return (
    <div style={{ display:"flex", gap:10, padding:"9px 14px", borderRadius:5, background:c+"12", border:`1px solid ${c}30`, marginBottom:6, alignItems:"flex-start" }}>
      <span style={{ fontSize:11, color:c, flexShrink:0, marginTop:1 }}>{ic}</span>
      <span style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>{message}</span>
    </div>
  );
}

function ParamCtrl({ param, value, onChange }) {
  if (param.type === "select") return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:5, border:`1px solid ${T.border}`, background:T.surface2, color:T.ink, fontSize:12, fontFamily:T.fontSans, outline:"none" }}>
      {param.options.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  if (param.type === "range") return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <input type="range" min={param.min} max={param.max} step={param.step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{ flex:1, accentColor:T.teal }} />
      <span style={{ fontSize:12, fontFamily:T.font, color:T.teal, minWidth:44, textAlign:"right" }}>{value}{param.unit}</span>
    </div>
  );
  if (param.type === "toggle") return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div onClick={()=>onChange(!value)} style={{ width:38, height:20, borderRadius:10, background:value?T.teal:T.surface3, cursor:"pointer", position:"relative", border:`1px solid ${value?T.teal:T.border}`, transition:"all .2s" }}>
        <div style={{ position:"absolute", top:2, left:value?19:2, width:14, height:14, borderRadius:7, background:"white", transition:"left .2s" }} />
      </div>
      <span style={{ fontSize:11, color:value?T.teal:T.muted }}>{value?"Yes":"No"}</span>
    </div>
  );
  if (param.type === "multiselect") {
    const sel = Array.isArray(value) ? value : [];
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {param.options.map(o=>{
          const on=sel.includes(o);
          return <button key={o} onClick={()=>onChange(on?sel.filter(s=>s!==o):[...sel,o])} style={{ padding:"4px 10px", borderRadius:4, fontSize:11, cursor:"pointer", fontFamily:T.fontSans, border:`1px solid ${on?T.teal:T.border}`, background:on?T.tealDim:"transparent", color:on?T.teal:T.muted }}>{o}</button>;
        })}
      </div>
    );
  }
  return null;
}

function SuitePanel({ title, icon, color, role, tasks, actions, brief }) {
  const [done, setDone] = useState([]);
  return (
    <div style={{ padding:28, maxWidth:620 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, paddingBottom:18, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:22, color }}>{icon}</span>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{title}</div>
          <div style={{ fontSize:11, color:T.muted }}>{role}</div>
        </div>
      </div>
      <div style={{ fontSize:9, fontFamily:T.font, color, letterSpacing:2, marginBottom:10 }}>TASKS FOR THIS CASE</div>
      {tasks.map((t,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<tasks.length-1?`1px solid ${T.borderSoft}`:"none" }}>
          <div style={{ width:18, height:18, borderRadius:4, border:`1px solid ${color}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:color+"10" }}>
            <span style={{ fontSize:9, color }}>{i+1}</span>
          </div>
          <span style={{ fontSize:12, color:T.ink }}>{t}</span>
        </div>
      ))}
      <div style={{ margin:"20px 0", padding:14, borderRadius:7, background:T.surface, border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:9, fontFamily:T.font, color:T.muted, letterSpacing:2, marginBottom:8 }}>BRIEF SUMMARY</div>
        <p style={{ fontSize:11, color:T.muted, lineHeight:1.7, margin:"0 0 10px" }}>{brief.summary}</p>
        <div style={{ fontSize:9, fontFamily:T.font, color:T.muted, letterSpacing:2, marginBottom:8 }}>LAB RX</div>
        <p style={{ fontSize:11, color:T.muted, lineHeight:1.7, margin:0 }}>{brief.lab_rx_summary}</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {actions.map((a,i)=>{
          const d=done.includes(a);
          return <button key={a} onClick={()=>setDone(p=>d?p.filter(x=>x!==a):[...p,a])} style={{ padding:"11px 18px", borderRadius:5, fontSize:12, fontWeight:600, border:`1px solid ${d?color:T.border}`, background:i===0?color:(d?color+"15":"transparent"), color:i===0?"white":(d?color:T.muted), cursor:"pointer", fontFamily:T.fontSans, textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s" }}>
            <span>{a}</span>{d&&<span style={{ fontSize:10 }}>✓</span>}
          </button>;
        })}
      </div>
    </div>
  );
}

const INITIAL = { step:"case-type", caseType:null, params:{}, brief:null, activeSystem:"smile", activeTab:"esthetic" };

function reducer(state, action) {
  switch(action.type) {
    case "SET_CASE": {
      const defs = {};
      [...PARAMS_ESTHETIC,...PARAMS_PREP,...PARAMS_OCCLUSAL,...PARAMS_IMPLANT].forEach(p=>{ defs[p.id]=p.default; });
      return { ...state, caseType:action.payload, params:defs, step:"parameters", activeTab:"esthetic" };
    }
    case "SET_PARAM": return { ...state, params:{ ...state.params, [action.id]:action.value } };
    case "SET_STEP": return { ...state, step:action.payload };
    case "SET_BRIEF": return { ...state, brief:action.payload, step:"brief" };
    case "SET_SYSTEM": return { ...state, activeSystem:action.payload };
    case "SET_TAB": return { ...state, activeTab:action.payload };
    case "RESET": return INITIAL;
    default: return state;
  }
}

async function generateBrief(caseType, params) {
  const paramLines = Object.entries(params).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join("\n");
  const prompt = `You are Restora, an AI dental design assistant applying AACD guidelines and a strict technique manual. Generate a comprehensive design brief.

CASE TYPE: ${CASE_TYPES[caseType].label} — ${CASE_TYPES[caseType].subtitle}

PARAMETERS:
${paramLines}

AACD BASELINES:
- Central W:L 75–80% (recurring esthetic dental proportion)
- Smile arc consonant with lower lip — never flat or reverse
- Incisal display 1–3mm at repose
- Midline deviations >1mm must be flagged
- Gingival levels: centrals = canines, laterals 0.5mm more coronal
- Emergence profile concave or flat subgingival — never convex
- Minimal prep priority: prefer no-prep or <0.5mm facial reduction
- Centric contacts on flat planes; posterior disclusion in all excursives

Output ONLY valid JSON, no markdown, no preamble:
{
  "summary": "2-sentence clinical summary",
  "esthetic_decisions": [{"parameter":"name","value":"value","rationale":"1-sentence","aacd":true}],
  "restorative_decisions": [{"parameter":"name","value":"value","rationale":"1-sentence"}],
  "protocol_flags": [{"level":"pass|warning|critical","message":"text"}],
  "suite_routing": {
    "smile_design": {"role":"description","tasks":["task"],"active":true},
    "mill_connect": {"role":"description","tasks":["task"],"active":true},
    "lab_cad": {"role":"description","tasks":["task"],"active":false}
  },
  "lab_rx_summary": "3–4 sentence prescription"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, messages:[{role:"user",content:prompt}] })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

export default function AIDesignGuide() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    if (!state.caseType) return;
    setError(null);
    dispatch({ type:"SET_STEP", payload:"generating" });
    try {
      const brief = await generateBrief(state.caseType, state.params);
      dispatch({ type:"SET_BRIEF", payload:brief });
    } catch(e) {
      setError(e.message||"Generation failed");
      dispatch({ type:"SET_STEP", payload:"parameters" });
    }
  }, [state.caseType, state.params]);

  const ct = state.caseType ? CASE_TYPES[state.caseType] : null;
  const isImpl = state.caseType?.includes("implant");
  const tabs = [
    { id:"esthetic", label:"Esthetic", params:PARAMS_ESTHETIC },
    { id:"prep", label:"Prep + Material", params:PARAMS_PREP },
    { id:"occlusion", label:"Occlusion", params:PARAMS_OCCLUSAL },
    ...(isImpl ? [{ id:"implant", label:"Implant", params:PARAMS_IMPLANT }] : []),
  ];
  const tabParams = tabs.find(t=>t.id===state.activeTab)?.params ?? [];

  const suiteMap = {
    smile: { title:"Smile Design", icon:"◉", color:T.amber, route:"smile_design", actions:["Upload patient photos","Generate smile preview","Import mockup overlay","Approve with patient"] },
    mill:  { title:"Mill Connect", icon:"◈", color:"#0a84ff", route:"mill_connect", actions:["Upload prep scans","Generate crown design","Check occlusion","Send to mill unit"] },
    lab:   { title:"Lab CAD",     icon:"⬡", color:T.purple, route:"lab_cad",      actions:["Upload full scan set","Generate design file","Export STL + design file","Send to lab"] },
  };

  const stepList = ["case-type","parameters","brief","suite"];
  const stepIdx = stepList.indexOf(state.step==="generating"?"parameters":state.step);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.ink, fontFamily:T.fontSans }}>
      {/* Header */}
      <div style={{ height:52, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 24px", justifyContent:"space-between", background:T.surface }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:T.teal, textTransform:"uppercase", fontFamily:T.font }}>Restora</span>
          <span style={{ width:1, height:14, background:T.border }} />
          <span style={{ fontSize:11, color:T.muted }}>AI Design Guide</span>
          {ct && <Badge label={ct.label.toUpperCase()} color={ct.color} dim={ct.colorDim} />}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {["Case","Parameters","AI Brief","Suite"].map((s,i)=>{
            const done=i<stepIdx; const active=i===stepIdx;
            return (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:9, fontFamily:T.font, letterSpacing:.5, padding:"2px 7px", borderRadius:3,
                  background:active?T.teal:done?T.tealDim:"transparent",
                  color:active?"white":done?T.teal:T.light,
                  border:`1px solid ${active?T.teal:done?T.tealBorder:T.border}` }}>
                  {done?"✓ ":""}{s}
                </span>
                {i<3&&<span style={{ fontSize:9,color:T.light }}>›</span>}
              </div>
            );
          })}
        </div>
        <button onClick={()=>dispatch({type:"RESET"})} style={{ fontSize:10,color:T.muted,background:"none",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 10px",cursor:"pointer",fontFamily:T.font }}>↺ Reset</button>
      </div>

      {/* STEP 1: Case type */}
      {state.step==="case-type" && (
        <div style={{ maxWidth:820, margin:"0 auto", padding:"48px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:"-.03em", marginBottom:8 }}>What type of case are you designing?</div>
            <div style={{ fontSize:13, color:T.muted }}>Select a case type to load the AACD + technique manual parameter set and route to the correct design suite.</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.keys(CASE_TYPES).map(k=>{
              const def=CASE_TYPES[k];
              return (
                <button key={k} onClick={()=>dispatch({type:"SET_CASE",payload:k})}
                  style={{ textAlign:"left", padding:22, borderRadius:10, cursor:"pointer", border:`1px solid ${T.border}`, background:T.surface, fontFamily:T.fontSans, transition:"all .15s", boxShadow:T.shadow }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=def.color; e.currentTarget.style.background=def.colorDim; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.surface; }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                    <span style={{ fontSize:20, color:def.color }}>{def.icon}</span>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {def.systems.map(s=><span key={s} style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:T.surface2, color:T.muted, fontFamily:T.font, letterSpacing:.5 }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:3, color:T.ink }}>{def.label}</div>
                  <div style={{ fontSize:11, color:def.color, marginBottom:8, fontStyle:"italic" }}>{def.subtitle}</div>
                  <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>{def.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Parameters */}
      {state.step==="parameters" && ct && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"36px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
            <button onClick={()=>dispatch({type:"SET_STEP",payload:"case-type"})} style={{ fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer",padding:0 }}>←</button>
            <span style={{ fontSize:18,color:ct.color }}>{ct.icon}</span>
            <div>
              <div style={{ fontSize:15,fontWeight:700 }}>{ct.label}</div>
              <div style={{ fontSize:11,color:T.muted }}>Configure AACD + technique manual parameters</div>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:2, marginBottom:24, borderBottom:`1px solid ${T.border}` }}>
            {tabs.map(tab=>(
              <button key={tab.id} onClick={()=>dispatch({type:"SET_TAB",payload:tab.id})} style={{ padding:"8px 16px", fontSize:10, fontWeight:600, letterSpacing:.5, cursor:"pointer", fontFamily:T.fontSans, border:"none", borderBottom:`2px solid ${state.activeTab===tab.id?T.teal:"transparent"}`, background:"transparent", color:state.activeTab===tab.id?T.teal:T.muted, transition:"all .15s" }}>
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Params */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            {tabParams.map((param,i)=>(
              <div key={param.id} style={{ padding:"14px 0", borderBottom:i<tabParams.length-1?`1px solid ${T.borderSoft}`:"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12,fontWeight:600,color:T.ink }}>{param.label}</span>
                  {param.aacd && <Badge label="AACD" color={T.teal} dim={T.tealDim} />}
                  {param.tip && <span style={{ fontSize:10,color:T.light,fontStyle:"italic" }}>{param.tip}</span>}
                </div>
                <ParamCtrl param={param} value={state.params[param.id]??param.default} onChange={v=>dispatch({type:"SET_PARAM",id:param.id,value:v})} />
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop:14, padding:"10px 14px", borderRadius:5, background:T.red+"15", border:`1px solid ${T.red}30`, color:T.red, fontSize:12 }}>{error}</div>}
          <button onClick={run} style={{ marginTop:28, width:"100%", padding:"14px 28px", borderRadius:7, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", background:T.teal, color:"white", fontFamily:T.fontSans, boxShadow:`0 4px 20px rgba(0,180,138,.3)`, letterSpacing:.5 }}>
            Generate AI Design Brief →
          </button>
        </div>
      )}

      {/* Generating */}
      {state.step==="generating" && (
        <div style={{ maxWidth:400, margin:"100px auto", textAlign:"center", padding:"0 24px" }}>
          <div style={{ fontSize:28, marginBottom:16 }}>◈</div>
          <div style={{ fontSize:14,fontWeight:600,marginBottom:6 }}>Generating design brief…</div>
          <div style={{ fontSize:12,color:T.muted,lineHeight:1.7 }}>Applying AACD guidelines · Technique manual<br/>Routing to design suite</div>
          <div style={{ marginTop:28, height:2, background:T.surface2, borderRadius:1, overflow:"hidden" }}>
            <div style={{ height:"100%", background:T.teal, width:"65%", borderRadius:1, animation:"sl 1.3s ease-in-out infinite alternate" }} />
          </div>
          <style>{`@keyframes sl{from{margin-left:0}to{margin-left:35%}}`}</style>
        </div>
      )}

      {/* STEP 3: Brief */}
      {state.step==="brief" && state.brief && ct && (
        <div style={{ maxWidth:860, margin:"0 auto", padding:"36px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>AI Design Brief</div>
              <div style={{ fontSize:12,color:T.muted }}>{ct.label} · Based on AACD guidelines + technique manual</div>
            </div>
            <button onClick={()=>dispatch({type:"SET_STEP",payload:"suite"})} style={{ padding:"10px 20px", borderRadius:6, fontSize:12,fontWeight:700,border:"none",background:T.teal,color:"white",cursor:"pointer",fontFamily:T.fontSans,boxShadow:`0 4px 12px rgba(0,180,138,.3)` }}>
              Open Design Suite →
            </button>
          </div>
          {/* Summary */}
          <div style={{ padding:18, borderRadius:7, background:T.surface, border:`1px solid ${T.border}`, marginBottom:16 }}>
            <div style={{ fontSize:9,fontFamily:T.font,color:T.teal,letterSpacing:2,marginBottom:10 }}>CLINICAL SUMMARY</div>
            <p style={{ fontSize:13,lineHeight:1.7,color:T.ink,margin:0 }}>{state.brief.summary}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {/* Esthetic */}
            <div style={{ background:T.surface, borderRadius:7, border:`1px solid ${T.border}`, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, fontSize:9,fontFamily:T.font,color:T.gold,letterSpacing:2 }}>ESTHETIC DECISIONS</div>
              {state.brief.esthetic_decisions?.map((d,i)=>(
                <div key={i} style={{ padding:"10px 14px", borderBottom:i<state.brief.esthetic_decisions.length-1?`1px solid ${T.borderSoft}`:"none" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                    <span style={{ fontSize:11,fontWeight:600,color:T.ink }}>{d.parameter}</span>
                    {d.aacd&&<Badge label="AACD" color={T.teal} dim={T.tealDim} />}
                  </div>
                  <div style={{ fontSize:11,color:T.gold,marginBottom:3,fontFamily:T.font }}>{d.value}</div>
                  <div style={{ fontSize:11,color:T.muted,lineHeight:1.5 }}>{d.rationale}</div>
                </div>
              ))}
            </div>
            {/* Restorative */}
            <div style={{ background:T.surface, borderRadius:7, border:`1px solid ${T.border}`, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, fontSize:9,fontFamily:T.font,color:T.purple,letterSpacing:2 }}>RESTORATIVE DECISIONS</div>
              {state.brief.restorative_decisions?.map((d,i)=>(
                <div key={i} style={{ padding:"10px 14px", borderBottom:i<state.brief.restorative_decisions.length-1?`1px solid ${T.borderSoft}`:"none" }}>
                  <div style={{ fontSize:11,fontWeight:600,color:T.ink,marginBottom:3 }}>{d.parameter}</div>
                  <div style={{ fontSize:11,color:T.purple,marginBottom:3,fontFamily:T.font }}>{d.value}</div>
                  <div style={{ fontSize:11,color:T.muted,lineHeight:1.5 }}>{d.rationale}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Flags */}
          <div style={{ background:T.surface, borderRadius:7, border:`1px solid ${T.border}`, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:9,fontFamily:T.font,color:T.muted,letterSpacing:2,marginBottom:10 }}>PROTOCOL COMPLIANCE</div>
            {state.brief.protocol_flags?.map((f,i)=><Flag key={i} level={f.level} message={f.message} />)}
          </div>
          {/* Suite routing */}
          <div style={{ background:T.surface, borderRadius:7, border:`1px solid ${T.border}`, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:9,fontFamily:T.font,color:T.muted,letterSpacing:2,marginBottom:12 }}>DESIGN SUITE ROUTING</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {Object.entries(suiteMap).map(([k,sys])=>{
                const route = state.brief.suite_routing?.[sys.route];
                if (!route) return null;
                return (
                  <div key={k} style={{ padding:12, borderRadius:6, border:`1px solid ${route.active?sys.color+"40":T.border}`, background:route.active?sys.color+"0d":T.surface2, opacity:route.active?1:0.5 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                      <span style={{ fontSize:10,fontWeight:700,color:route.active?sys.color:T.muted,fontFamily:T.font,letterSpacing:.5 }}>{sys.title}</span>
                      {route.active&&<span style={{ fontSize:8,padding:"1px 5px",borderRadius:3,background:sys.color+"20",color:sys.color }}>ON</span>}
                    </div>
                    <div style={{ fontSize:10,color:T.muted,marginBottom:6 }}>{route.role}</div>
                    {route.tasks?.map((t,i)=><div key={i} style={{ fontSize:10,color:T.light,marginBottom:2 }}>· {t}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Lab RX */}
          <div style={{ background:T.surface, borderRadius:7, border:`1px solid ${T.border}`, padding:14 }}>
            <div style={{ fontSize:9,fontFamily:T.font,color:T.muted,letterSpacing:2,marginBottom:8 }}>LAB PRESCRIPTION</div>
            <p style={{ fontSize:12,lineHeight:1.8,color:T.muted,margin:0 }}>{state.brief.lab_rx_summary}</p>
          </div>
        </div>
      )}

      {/* STEP 4: Design Suite */}
      {state.step==="suite" && state.brief && ct && (
        <div style={{ display:"flex", height:"calc(100vh - 52px)" }}>
          {/* Sidebar */}
          <div style={{ width:190, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"14px 0" }}>
            <div style={{ padding:"0 14px 10px", fontSize:9,color:T.light,letterSpacing:2,fontFamily:T.font }}>DESIGN SUITE</div>
            {Object.entries(suiteMap).map(([k,sys])=>{
              const route = state.brief.suite_routing?.[sys.route];
              const active = route?.active;
              const sel = state.activeSystem===k;
              return (
                <button key={k} onClick={()=>active&&dispatch({type:"SET_SYSTEM",payload:k})} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"none",cursor:active?"pointer":"not-allowed",background:sel?sys.color+"15":"transparent",borderLeft:`2px solid ${sel?sys.color:"transparent"}`,opacity:active?1:0.3,fontFamily:T.fontSans,transition:"all .15s" }}>
                  <span style={{ fontSize:14,color:sys.color }}>{sys.icon}</span>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:11,fontWeight:600,color:sel?sys.color:T.ink }}>{sys.title}</div>
                    {!active&&<div style={{ fontSize:9,color:T.light }}>Not active</div>}
                  </div>
                </button>
              );
            })}
            <div style={{ flex:1 }} />
            <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}` }}>
              <button onClick={()=>dispatch({type:"SET_STEP",payload:"brief"})} style={{ fontSize:10,color:T.muted,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:T.fontSans }}>← Brief</button>
            </div>
          </div>
          {/* Panel */}
          <div style={{ flex:1,overflow:"auto",background:T.bg }}>
            {(() => {
              const sys = suiteMap[state.activeSystem];
              if (!sys) return null;
              const route = state.brief.suite_routing?.[sys.route];
              return <SuitePanel title={sys.title} icon={sys.icon} color={sys.color} role={route?.role||""} tasks={route?.tasks||[]} actions={sys.actions} brief={state.brief} />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
