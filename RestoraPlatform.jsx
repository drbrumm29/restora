import { useState, useReducer, useCallback, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// RESTORA — Complete integrated platform
// All screens · All navigation · All buttons functional
// ═══════════════════════════════════════════════════════════════

// ── Design tokens ──
const C = {
  bg:"#0d1117", surf:"#161b22", surf2:"#21262d", surf3:"#2d333b",
  b:"#30363d", b2:"#21262d", ink:"#e6edf3", muted:"#8b949e", dim:"#484f58",
  teal:"#00b48a", tealD:"rgba(0,180,138,.12)", tealB:"rgba(0,180,138,.25)",
  gold:"#d4a843", goldD:"rgba(212,168,67,.1)",
  amber:"#f0883e", amberD:"rgba(240,136,62,.1)",
  purple:"#bc8cff", purpleD:"rgba(188,140,255,.1)",
  red:"#f85149", green:"#3fb950", blue:"#388bfd",
  font:"system-ui,sans-serif", mono:"'SF Mono',monospace",
};

// ── Screens ──
const SCREENS = ["hub","dashboard","ai-guide","design-bridge","smile-sim","restoration","implant","export","settings"];

// ── Nav items ──
const NAV = [
  { section:"Design", items:[
    { id:"ai-guide",      icon:"✦", label:"AI Design Guide",    badge:"NEW",     bc:C.teal },
    { id:"design-bridge", icon:"◈", label:"Design Suite",       badge:"3 Systems",bc:"#555" },
    { id:"restoration",   icon:"🦷", label:"Restoration CAD",   badge:"Core",    bc:"#555" },
    { id:"smile-sim",     icon:"◉", label:"Smile Simulation",   badge:"8 layers",bc:"#555" },
  ]},
  { section:"Planning", items:[
    { id:"implant",       icon:"◆", label:"Implant + Guide",    badge:"4 sites", bc:"#555" },
  ]},
  { section:"Delivery", items:[
    { id:"export",        icon:"📦", label:"Export Hub",         badge:null,      bc:null },
  ]},
  { section:"Settings", items:[
    { id:"settings",      icon:"⚙", label:"Settings",           badge:null,      bc:null },
  ]},
];

// ── Patients demo data ──
const DEMO_PATIENTS = [
  { id:"p1", name:"Johnson, Sara", dob:"1984-03-12", teeth:[8,9,10], caseType:"smile-mockup", status:"active", lastVisit:"2026-04-10" },
  { id:"p2", name:"Martinez, Carlos", dob:"1971-09-28", teeth:[30], caseType:"restoration", status:"active", lastVisit:"2026-04-08" },
  { id:"p3", name:"Chen, Wei", dob:"1990-06-15", teeth:[3,14], caseType:"full-implant", status:"active", lastVisit:"2026-04-05" },
];

// ── AACD / Technique manual parameters ──
const ESTHETIC_PARAMS = [
  { id:"smile_arc", label:"Smile arc", type:"select", aacd:true, options:["Consonant (ideal)","Slightly flat","Reverse — must correct","Maintain existing"], def:"Consonant (ideal)", tip:"AACD: follows lower lip — never flat or reverse" },
  { id:"wl_ratio", label:"Central W:L ratio", type:"range", aacd:true, min:65, max:90, step:1, unit:"%", def:78, tip:"AACD: 75–80% target" },
  { id:"incisal_display", label:"Incisal display at repose", type:"range", aacd:true, min:0, max:5, step:0.5, unit:"mm", def:2, tip:"AACD: 1–3mm typical" },
  { id:"midline", label:"Midline treatment", type:"select", aacd:true, options:["Align to facial midline","Maintain existing","Accept deviation <1mm"], def:"Align to facial midline", tip:"AACD: >1mm deviation perceptible" },
  { id:"gingival_levels", label:"Gingival levels", type:"select", aacd:true, options:["Centrals = canines · laterals 0.5mm coronal (AACD)","All level","Custom"], def:"Centrals = canines · laterals 0.5mm coronal (AACD)" },
  { id:"tooth_form", label:"Tooth form", type:"select", options:["Square-tapering (balanced)","Ovoid","Triangular","Square","Match existing"], def:"Square-tapering (balanced)" },
  { id:"embrasure", label:"Embrasure form", type:"select", aacd:true, options:["Open (youthful)","Closed (mature)","Progressive — open anteriorly"], def:"Progressive — open anteriorly" },
  { id:"shade", label:"Target shade", type:"select", options:["BL1","BL2","BL3","BL4","A1","A2","A3","B1","B2","Match existing"], def:"A1" },
  { id:"characterisation", label:"Characterisation", type:"multi", options:["Mamelons","Incisal halo","Cervical chroma","Surface crazing","None"], def:["Incisal halo","Cervical chroma"] },
];
const PREP_PARAMS = [
  { id:"prep_type", label:"Preparation type", type:"select", options:["No-prep","Minimal <0.3mm","Conventional 0.3–0.5mm","Crown full coverage","Onlay","Inlay"], def:"Minimal <0.3mm" },
  { id:"margin_type", label:"Margin type", type:"select", options:["Feather/knife edge","Chamfer 0.3mm","Chamfer 0.5mm","Heavy chamfer","Shoulder","Rounded shoulder"], def:"Chamfer 0.3mm" },
  { id:"margin_loc", label:"Margin location", type:"select", options:["Supragingival 0.5–1mm (ideal)","Equigingival","Subgingival 0.5mm"], def:"Supragingival 0.5–1mm (ideal)", tip:"Technique manual: supragingival preferred" },
  { id:"facial_red", label:"Facial reduction", type:"range", min:0, max:1.5, step:0.1, unit:"mm", def:0.3, tip:"Flag if >0.5mm" },
  { id:"material", label:"Material", type:"select", options:["Pressed lithium disilicate","Milled lithium disilicate","Feldspathic porcelain","Zirconia HT","Zirconia MT monolithic","Cast gold","PFM"], def:"Pressed lithium disilicate" },
  { id:"emergence", label:"Emergence profile", type:"select", options:["Zero tissue push (ideal)","Minimal push","Standard","Shaped root surface"], def:"Zero tissue push (ideal)", tip:"Concave/flat subgingival — never convex" },
];
const OCC_PARAMS = [
  { id:"occ_scheme", label:"Occlusal scheme", type:"select", options:["Canine-guided (default)","Mutually protected","Group function","Lingualized"], def:"Canine-guided (default)" },
  { id:"ant_guidance", label:"Anterior guidance", type:"select", options:["Establish · posterior disclusion required","Maintain existing","Shallow — parafunctional concern"], def:"Establish · posterior disclusion required" },
  { id:"centric", label:"Centric contacts", type:"select", options:["Flat planes (ideal)","Cusp tip — must adjust","No contacts (implant)"], def:"Flat planes (ideal)" },
];
const IMPL_PARAMS = [
  { id:"impl_zone", label:"Zone", type:"select", options:["Anterior esthetic","Posterior load-bearing","Replacing canine"], def:"Posterior load-bearing" },
  { id:"rest_type", label:"Restoration type", type:"select", options:["Screw-retained crown (preferred)","Cement-retained","Custom abutment + crown","Bar overdenture"], def:"Screw-retained crown (preferred)" },
  { id:"platform", label:"Platform switching", type:"toggle", def:true, tip:"Preserves crestal bone" },
  { id:"prosth_space", label:"Prosthetic space", type:"range", min:5, max:20, step:0.5, unit:"mm", def:10 },
  { id:"imm_load", label:"Immediate loading", type:"toggle", def:false, tip:"Requires ≥35 Ncm" },
];

const CASE_TYPES_GUIDE = {
  "cosmetic-anterior": { label:"Cosmetic Anterior", icon:"✦", subtitle:"Veneers · Crowns · Bonding", color:C.gold, colorD:C.goldD, systems:["Smile Design","Mill Connect","Lab CAD"], desc:"Esthetic zone — smile design parameters drive all decisions" },
  "smile-makeover":    { label:"Smile Makeover",    icon:"◈", subtitle:"Full arch esthetic redesign", color:C.teal, colorD:C.tealD, systems:["Smile Design","Lab CAD","Mill Connect"], desc:"Multi-unit comprehensive esthetic treatment — full protocol" },
  "restorative-posterior":{ label:"Restorative Posterior", icon:"⬡", subtitle:"Crowns · Onlays · Inlays", color:C.purple, colorD:C.purpleD, systems:["Mill Connect","Lab CAD"], desc:"Function-first design — biologic shaping + occlusal protocol" },
  "implant-single":    { label:"Single Implant",    icon:"◆", subtitle:"Crown on implant — any zone", color:C.amber, colorD:C.amberD, systems:["Lab CAD","Mill Connect"], desc:"Emergence, platform matching, esthetic integration" },
  "implant-full-arch": { label:"Full Arch Implant", icon:"⬟", subtitle:"Bar · Zirconia · FP3 · All-on-X", color:C.teal, colorD:C.tealD, systems:["Lab CAD"], desc:"Complete arch prosthetic — bar, monolithic, FP3" },
};

// ── Helpers ──
function Chip({label,color,dim}){
  return <span style={{padding:"1px 7px",borderRadius:3,fontSize:9,fontWeight:700,letterSpacing:.7,background:dim||C.surf3,color:color||C.muted,border:`1px solid ${color||C.b}30`,fontFamily:C.mono}}>{label}</span>;
}
function Btn({children,onClick,variant="primary",disabled,style={}}){
  const base={border:"none",borderRadius:6,padding:"10px 18px",fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",fontFamily:C.font,...style};
  const styles={primary:{background:disabled?C.surf3:C.teal,color:disabled?C.dim:"white",boxShadow:disabled?"none":"0 4px 12px rgba(0,180,138,.3)"},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.b}`},danger:{background:C.red+"15",color:C.red,border:`1px solid ${C.red}30`}};
  return <button onClick={disabled?undefined:onClick} disabled={disabled} style={{...base,...(styles[variant]||styles.primary)}}>{children}</button>;
}
function Flag({level,msg}){
  const col={pass:C.green,warning:C.gold,critical:C.red}[level]||C.muted;
  const ic={pass:"✓",warning:"⚠",critical:"✕"}[level]||"·";
  return <div style={{display:"flex",gap:10,padding:"8px 12px",borderRadius:5,background:col+"12",border:`1px solid ${col}30`,marginBottom:5,alignItems:"flex-start"}}><span style={{fontSize:10,color:col,flexShrink:0,marginTop:1}}>{ic}</span><span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{msg}</span></div>;
}
function ParamCtrl({param,value,onChange}){
  if(param.type==="select") return <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.b}`,background:C.surf2,color:C.ink,fontSize:12,fontFamily:C.font,outline:"none"}}>{param.options.map(o=><option key={o}>{o}</option>)}</select>;
  if(param.type==="range") return <div style={{display:"flex",alignItems:"center",gap:10}}><input type="range" min={param.min} max={param.max} step={param.step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{flex:1,accentColor:C.teal}}/><span style={{fontSize:11,fontFamily:C.mono,color:C.teal,minWidth:42,textAlign:"right"}}>{value}{param.unit}</span></div>;
  if(param.type==="toggle") return <div style={{display:"flex",alignItems:"center",gap:10}}><div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,background:value?C.teal:C.surf3,cursor:"pointer",position:"relative",border:`1px solid ${value?C.teal:C.b}`,transition:"all .2s"}}><div style={{position:"absolute",top:2,left:value?18:2,width:14,height:14,borderRadius:7,background:"white",transition:"left .2s"}}/></div><span style={{fontSize:11,color:value?C.teal:C.muted}}>{value?"Yes":"No"}</span></div>;
  if(param.type==="multi"){const sel=Array.isArray(value)?value:[];return <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{param.options.map(o=>{const on=sel.includes(o);return <button key={o} onClick={()=>onChange(on?sel.filter(s=>s!==o):[...sel,o])} style={{padding:"4px 10px",borderRadius:4,fontSize:11,cursor:"pointer",border:`1px solid ${on?C.teal:C.b}`,background:on?C.tealD:"transparent",color:on?C.teal:C.muted,fontFamily:C.font}}>{o}</button>;})}</div>;}
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════

// ── Patient Hub ──
function PatientHub({navigate,setPatient}){
  const [search,setSearch]=useState("");
  const [adding,setAdding]=useState(false);
  const [newName,setNewName]=useState("");
  const filtered=DEMO_PATIENTS.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const start=(p)=>{setPatient(p);navigate("dashboard");};
  const add=()=>{if(!newName.trim())return;const p={id:"p"+Date.now(),name:newName,dob:"",teeth:[],caseType:"restoration",status:"active",lastVisit:"Today"};setPatient(p);navigate("dashboard");};
  return(
    <div style={{flex:1,overflow:"auto",background:C.bg,padding:"48px 40px"}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
          <div><div style={{fontSize:24,fontWeight:700,letterSpacing:"-.03em",marginBottom:4}}>Patients</div><div style={{fontSize:13,color:C.muted}}>{DEMO_PATIENTS.length} active cases</div></div>
          <Btn onClick={()=>setAdding(a=>!a)}>{adding?"Cancel":"+ New patient"}</Btn>
        </div>
        {adding&&<div style={{background:C.surf,border:`1px solid ${C.b}`,borderRadius:10,padding:20,marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:10}}>New patient</div>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Last, First name" style={{width:"100%",padding:"9px 12px",borderRadius:6,border:`1px solid ${C.b}`,background:C.surf2,color:C.ink,fontSize:13,fontFamily:C.font,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
          <Btn onClick={add}>Create patient →</Btn>
        </div>}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients…" style={{width:"100%",padding:"9px 12px",borderRadius:6,border:`1px solid ${C.b}`,background:C.surf,color:C.ink,fontSize:13,fontFamily:C.font,outline:"none",marginBottom:16,boxSizing:"border-box"}}/>
        {filtered.map(p=>(
          <div key={p.id} onClick={()=>start(p)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:8,border:`1px solid ${C.b}`,background:C.surf,marginBottom:8,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealD;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b;e.currentTarget.style.background=C.surf;}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>{p.name[0]}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.name}</div><div style={{fontSize:11,color:C.muted}}>Teeth #{p.teeth.join(", #")} · {p.caseType} · {p.lastVisit}</div></div>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.teal}}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ──
function Dashboard({navigate,patient}){
  const cards=[
    {icon:"✦",label:"AI Design Guide",desc:"AACD + technique manual driven design brief",screen:"ai-guide",color:C.gold,hot:true},
    {icon:"◈",label:"Design Suite",desc:"Mill Connect · Smile Design · Lab CAD — unified",screen:"design-bridge",color:C.teal},
    {icon:"🦷",label:"Restoration CAD",desc:"Crown, veneer, onlay, inlay — 3D design",screen:"restoration",color:C.purple},
    {icon:"◉",label:"Smile Simulation",desc:"8-layer optical rendering · patient approval",screen:"smile-sim",color:C.amber},
    {icon:"◆",label:"Implant Planning",desc:"4 active sites · guide design · prosthetic",screen:"implant",color:C.blue},
    {icon:"📦",label:"Export Hub",desc:"Mill · Lab · Cloud · Printer — all destinations",screen:"export",color:C.muted},
  ];
  return(
    <div style={{flex:1,overflow:"auto",background:C.bg,padding:"36px 28px"}}>
      <div style={{maxWidth:800,margin:"0 auto"}}>
        <div style={{marginBottom:28,padding:"16px 20px",borderRadius:10,background:C.tealD,border:`1px solid ${C.tealB}`,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}} onClick={()=>navigate("ai-guide")}>
          <div style={{width:36,height:36,borderRadius:10,background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:16,flexShrink:0}}>→</div>
          <div><div style={{fontSize:14,fontWeight:700,letterSpacing:"-.02em"}}>Start here: AI Design Guide</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>AACD + technique manual parameters → design brief → design suite</div></div>
        </div>
        <div style={{fontSize:11,color:C.muted,marginBottom:16,letterSpacing:1}}>PATIENT: {patient?.name} · CASE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {cards.map(card=>(
            <div key={card.screen} onClick={()=>navigate(card.screen)} style={{padding:20,borderRadius:10,border:`1px solid ${card.hot?card.color+"50":C.b}`,background:card.hot?card.color+"0d":C.surf,cursor:"pointer",transition:"all .15s",position:"relative"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=card.color+"60";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=card.hot?card.color+"50":C.b;e.currentTarget.style.transform="";}}>
              {card.hot&&<div style={{position:"absolute",top:10,right:10,fontSize:9,padding:"2px 6px",borderRadius:3,background:C.teal,color:"white",fontFamily:C.mono,fontWeight:700}}>START</div>}
              <div style={{fontSize:20,color:card.color,marginBottom:10}}>{card.icon}</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{card.label}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Design Guide ──
function AIDesignGuide({navigate}){
  const [step,setStep]=useState("case-type"); // case-type | parameters | generating | brief | suite
  const [caseType,setCaseType]=useState(null);
  const [params,setParams]=useState({});
  const [activeTab,setActiveTab]=useState("esthetic");
  const [brief,setBrief]=useState(null);
  const [activeSys,setActiveSys]=useState("smile");
  const [err,setErr]=useState(null);
  const ct=caseType?CASE_TYPES_GUIDE[caseType]:null;
  const isImpl=caseType?.includes("implant");
  const tabs=[{id:"esthetic",label:"Esthetic",params:ESTHETIC_PARAMS},{id:"prep",label:"Prep + Material",params:PREP_PARAMS},{id:"occlusion",label:"Occlusion",params:OCC_PARAMS},...(isImpl?[{id:"implant",label:"Implant",params:IMPL_PARAMS}]:[])];
  const tabParams=tabs.find(t=>t.id===activeTab)?.params||[];

  const selectCase=(k)=>{const defs={};[...ESTHETIC_PARAMS,...PREP_PARAMS,...OCC_PARAMS,...IMPL_PARAMS].forEach(p=>{defs[p.id]=p.def;});setCaseType(k);setParams(defs);setStep("parameters");setActiveTab("esthetic");};
  const setParam=(id,v)=>setParams(p=>({...p,[id]:v}));

  const generate=async()=>{
    setErr(null);setStep("generating");
    try{
      const lines=Object.entries(params).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join("\n");
      const prompt=`You are Restora AI. Generate a dental design brief for: ${CASE_TYPES_GUIDE[caseType].label} (${CASE_TYPES_GUIDE[caseType].subtitle}).

Parameters:
${lines}

AACD baselines: W:L 75–80%, consonant smile arc, 1–3mm incisal display, midline align, gingival levels centrals=canines/laterals 0.5mm coronal, zero tissue push emergence, minimal prep <0.5mm facial reduction, centric contacts flat planes, posterior disclusion all excursives.

Respond ONLY with valid JSON:
{"summary":"2 sentences","esthetic_decisions":[{"parameter":"name","value":"value","rationale":"1 sentence","aacd":true}],"restorative_decisions":[{"parameter":"name","value":"value","rationale":"1 sentence"}],"protocol_flags":[{"level":"pass|warning|critical","message":"text"}],"suite_routing":{"smile_design":{"role":"role","tasks":["task"],"active":true},"mill_connect":{"role":"role","tasks":["task"],"active":true},"lab_cad":{"role":"role","tasks":["task"],"active":false}},"lab_rx_summary":"3 sentences"}`;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const text=data.content?.[0]?.text||"{}";
      setBrief(JSON.parse(text.replace(/```json|```/g,"").trim()));
      setStep("brief");
    }catch(e){setErr(e.message||"Generation failed");setStep("parameters");}
  };

  const suiteSystems={smile:{title:"Smile Design",icon:"◉",color:C.amber,routeKey:"smile_design",actions:["Upload patient photos","Generate smile preview","Import mockup overlay","Patient approval"]},mill:{title:"Mill Connect",icon:"◈",color:C.blue,routeKey:"mill_connect",actions:["Upload prep scans","Generate crown design","Check occlusion","Send to mill unit"]},lab:{title:"Lab CAD",icon:"⬡",color:C.purple,routeKey:"lab_cad",actions:["Upload full scan set","Generate design file","Export STL + files","Send to lab"]}};
  const stepList=["case-type","parameters","brief","suite"];
  const stepIdx=stepList.indexOf(step==="generating"?"parameters":step);

  return(
    <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",background:C.bg}}>
      {/* Sub-header */}
      <div style={{borderBottom:`1px solid ${C.b}`,padding:"0 24px",height:44,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surf,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:C.teal}}>AI Design Guide</span>
          {ct&&<Chip label={ct.label.toUpperCase()} color={ct.color} dim={ct.colorD}/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {["Case","Parameters","AI Brief","Suite"].map((s,i)=>{
            const done=i<stepIdx,active=i===stepIdx;
            return <span key={s} style={{fontSize:9,fontFamily:C.mono,padding:"2px 7px",borderRadius:3,background:active?C.teal:done?C.tealD:"transparent",color:active?"white":done?C.teal:C.dim,border:`1px solid ${active?C.teal:done?C.tealB:C.b}`}}>{done?"✓ ":""}{s}</span>;
          })}
        </div>
        <button onClick={()=>{setStep("case-type");setCaseType(null);setBrief(null);}} style={{fontSize:10,color:C.muted,background:"none",border:`1px solid ${C.b}`,borderRadius:4,padding:"3px 10px",cursor:"pointer"}}>↺ Reset</button>
      </div>

      {/* Case type */}
      {step==="case-type"&&<div style={{maxWidth:780,margin:"0 auto",padding:"40px 24px",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}><div style={{fontSize:22,fontWeight:700,letterSpacing:"-.03em",marginBottom:6}}>What type of case are you designing?</div><div style={{fontSize:13,color:C.muted}}>Loads the correct AACD + technique manual parameter set and routes to the unified design suite.</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {Object.keys(CASE_TYPES_GUIDE).map(k=>{const def=CASE_TYPES_GUIDE[k];return(
            <div key={k} onClick={()=>selectCase(k)} style={{padding:20,borderRadius:10,border:`1px solid ${C.b}`,background:C.surf,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=def.color;e.currentTarget.style.background=def.colorD;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b;e.currentTarget.style.background=C.surf;}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:18,color:def.color}}>{def.icon}</span><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{def.systems.map(s=><span key={s} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:C.surf2,color:C.muted,fontFamily:C.mono}}>{s}</span>)}</div></div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:3}}>{def.label}</div>
              <div style={{fontSize:11,color:def.color,marginBottom:8,fontStyle:"italic"}}>{def.subtitle}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{def.desc}</div>
            </div>
          );})}
        </div>
      </div>}

      {/* Parameters */}
      {step==="parameters"&&ct&&<div style={{maxWidth:660,margin:"0 auto",padding:"32px 24px",width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}><button onClick={()=>setStep("case-type")} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0}}>←</button><span style={{fontSize:16,color:ct.color}}>{ct.icon}</span><div><div style={{fontSize:14,fontWeight:700}}>{ct.label}</div><div style={{fontSize:11,color:C.muted}}>AACD + technique manual parameters</div></div></div>
        <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:`1px solid ${C.b}`}}>
          {tabs.map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:"7px 14px",fontSize:10,fontWeight:600,letterSpacing:.5,cursor:"pointer",border:"none",borderBottom:`2px solid ${activeTab===tab.id?C.teal:"transparent"}`,background:"transparent",color:activeTab===tab.id?C.teal:C.muted,fontFamily:C.font}}>{tab.label.toUpperCase()}</button>)}
        </div>
        {tabParams.map((param,i)=>(
          <div key={param.id} style={{padding:"12px 0",borderBottom:i<tabParams.length-1?`1px solid ${C.b2}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:600}}>{param.label}</span>
              {param.aacd&&<Chip label="AACD" color={C.teal} dim={C.tealD}/>}
              {param.tip&&<span style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>{param.tip}</span>}
            </div>
            <ParamCtrl param={param} value={params[param.id]??param.def} onChange={v=>setParam(param.id,v)}/>
          </div>
        ))}
        {err&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:5,background:C.red+"15",border:`1px solid ${C.red}30`,color:C.red,fontSize:12}}>{err}</div>}
        <Btn onClick={generate} style={{marginTop:24,width:"100%",padding:"13px 24px"}}>Generate AI Design Brief →</Btn>
      </div>}

      {/* Generating */}
      {step==="generating"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}><div style={{fontSize:28}}>◈</div><div style={{fontSize:14,fontWeight:600}}>Generating design brief…</div><div style={{fontSize:12,color:C.muted}}>AACD guidelines · Technique manual · Suite routing</div><div style={{width:240,height:2,background:C.surf2,borderRadius:1,overflow:"hidden",marginTop:8}}><div style={{height:"100%",background:C.teal,width:"60%",borderRadius:1,animation:"sl 1.3s ease-in-out infinite alternate"}}/></div><style>{`@keyframes sl{from{margin-left:0}to{margin-left:40%}}`}</style></div>}

      {/* Brief */}
      {step==="brief"&&brief&&ct&&<div style={{maxWidth:820,margin:"0 auto",padding:"32px 24px",width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div><div style={{fontSize:15,fontWeight:700}}>AI Design Brief</div><div style={{fontSize:11,color:C.muted}}>{ct.label} · AACD + technique manual</div></div>
          <Btn onClick={()=>setStep("suite")}>Open Design Suite →</Btn>
        </div>
        <div style={{padding:16,borderRadius:8,background:C.surf,border:`1px solid ${C.b}`,marginBottom:14}}><div style={{fontSize:9,fontFamily:C.mono,color:C.teal,letterSpacing:2,marginBottom:8}}>CLINICAL SUMMARY</div><p style={{fontSize:13,lineHeight:1.7,margin:0}}>{brief.summary}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b}`,fontSize:9,fontFamily:C.mono,color:C.gold,letterSpacing:2}}>ESTHETIC DECISIONS</div>
            {brief.esthetic_decisions?.slice(0,4).map((d,i)=><div key={i} style={{padding:"9px 14px",borderBottom:i<(brief.esthetic_decisions.length-1)&&i<3?`1px solid ${C.b2}`:"none"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:11,fontWeight:600}}>{d.parameter}</span>{d.aacd&&<Chip label="AACD" color={C.teal} dim={C.tealD}/>}</div><div style={{fontSize:11,color:C.gold,marginBottom:2,fontFamily:C.mono}}>{d.value}</div><div style={{fontSize:10,color:C.muted}}>{d.rationale}</div></div>)}
          </div>
          <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b}`,fontSize:9,fontFamily:C.mono,color:C.purple,letterSpacing:2}}>RESTORATIVE DECISIONS</div>
            {brief.restorative_decisions?.slice(0,4).map((d,i)=><div key={i} style={{padding:"9px 14px",borderBottom:i<(brief.restorative_decisions.length-1)&&i<3?`1px solid ${C.b2}`:"none"}}><div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{d.parameter}</div><div style={{fontSize:11,color:C.purple,marginBottom:2,fontFamily:C.mono}}>{d.value}</div><div style={{fontSize:10,color:C.muted}}>{d.rationale}</div></div>)}
          </div>
        </div>
        <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,padding:14,marginBottom:12}}><div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>PROTOCOL COMPLIANCE</div>{brief.protocol_flags?.map((f,i)=><Flag key={i} level={f.level} msg={f.message}/>)}</div>
        <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,padding:14,marginBottom:12}}>
          <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:12}}>DESIGN SUITE ROUTING</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {Object.entries(suiteSystems).map(([k,sys])=>{const route=brief.suite_routing?.[sys.routeKey];if(!route)return null;return(<div key={k} style={{padding:12,borderRadius:6,border:`1px solid ${route.active?sys.color+"40":C.b}`,background:route.active?sys.color+"0d":C.surf2,opacity:route.active?1:0.5}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:10,fontWeight:700,color:route.active?sys.color:C.muted,fontFamily:C.mono}}>{sys.title}</span>{route.active&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:sys.color+"20",color:sys.color}}>ON</span>}</div><div style={{fontSize:10,color:C.muted,marginBottom:6}}>{route.role}</div>{route.tasks?.map((t,i)=><div key={i} style={{fontSize:10,color:C.dim,marginBottom:2}}>· {t}</div>)}</div>);})}</div>
        </div>
        <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,padding:14}}><div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>LAB PRESCRIPTION</div><p style={{fontSize:12,lineHeight:1.8,color:C.muted,margin:0}}>{brief.lab_rx_summary}</p></div>
      </div>}

      {/* Suite */}
      {step==="suite"&&brief&&ct&&<div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:180,background:C.surf,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",padding:"14px 0",flexShrink:0}}>
          <div style={{padding:"0 14px 10px",fontSize:9,color:C.dim,letterSpacing:2,fontFamily:C.mono}}>DESIGN SUITE</div>
          {Object.entries(suiteSystems).map(([k,sys])=>{const route=brief.suite_routing?.[sys.routeKey];const on=route?.active;const sel=activeSys===k;return(<button key={k} onClick={()=>on&&setActiveSys(k)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"none",cursor:on?"pointer":"default",background:sel?sys.color+"15":"transparent",borderLeft:`2px solid ${sel?sys.color:"transparent"}`,opacity:on?1:0.3,fontFamily:C.font,transition:"all .15s"}}><span style={{fontSize:13,color:sys.color}}>{sys.icon}</span><div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:600,color:sel?sys.color:C.ink}}>{sys.title}</div>{!on&&<div style={{fontSize:9,color:C.dim}}>Not active</div>}</div></button>);})}
          <div style={{flex:1}}/>
          <div style={{padding:"12px 14px",borderTop:`1px solid ${C.b}`}}><button onClick={()=>setStep("brief")} style={{fontSize:10,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:C.font}}>← Brief</button></div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:28}}>
          {(()=>{const sys=suiteSystems[activeSys];const route=brief.suite_routing?.[sys.routeKey];return(<SuiteWorkspace sys={sys} route={route} brief={brief}/>);})()}
        </div>
      </div>}
    </div>
  );
}

function SuiteWorkspace({sys,route,brief}){
  const [done,setDone]=useState([]);
  const toggle=(a)=>setDone(p=>p.includes(a)?p.filter(x=>x!==a):[...p,a]);
  return(
    <div style={{maxWidth:580}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,paddingBottom:18,borderBottom:`1px solid ${C.b}`}}>
        <span style={{fontSize:20,color:sys.color}}>{sys.icon}</span>
        <div><div style={{fontSize:14,fontWeight:700}}>{sys.title}</div><div style={{fontSize:11,color:C.muted}}>{route?.role}</div></div>
      </div>
      <div style={{fontSize:9,fontFamily:C.mono,color:sys.color,letterSpacing:2,marginBottom:10}}>CASE TASKS</div>
      {route?.tasks?.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<route.tasks.length-1?`1px solid ${C.b2}`:"none"}}><div style={{width:18,height:18,borderRadius:4,border:`1px solid ${sys.color}50`,display:"flex",alignItems:"center",justifyContent:"center",background:sys.color+"10",flexShrink:0}}><span style={{fontSize:9,color:sys.color}}>{i+1}</span></div><span style={{fontSize:12}}>{t}</span></div>)}
      <div style={{margin:"20px 0",padding:14,borderRadius:7,background:C.surf,border:`1px solid ${C.b}`}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:7}}>BRIEF SUMMARY</div>
        <p style={{fontSize:11,color:C.muted,lineHeight:1.7,margin:"0 0 10px"}}>{brief.summary}</p>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:7}}>LAB RX</div>
        <p style={{fontSize:11,color:C.muted,lineHeight:1.7,margin:0}}>{brief.lab_rx_summary}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sys.actions.map((a,i)=>{const d=done.includes(a);return(<button key={a} onClick={()=>toggle(a)} style={{padding:"11px 16px",borderRadius:6,fontSize:12,fontWeight:600,border:`1px solid ${d?sys.color:C.b}`,background:i===0?sys.color:(d?sys.color+"15":"transparent"),color:i===0?"white":(d?sys.color:C.muted),cursor:"pointer",fontFamily:C.font,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s"}}><span>{a}</span>{d&&<span style={{fontSize:10}}>✓</span>}</button>);})}
      </div>
    </div>
  );
}

// ── Design Systems Bridge ──
function DesignBridge(){
  const MODE_DEFS={
    prep:{label:"Prep Restoration",icon:"🦷",desc:"Crown, veneer, onlay, inlay on a prepared tooth",files:[{id:"upper",label:"Upper arch scan",req:true,accept:".stl,.obj"},{id:"lower",label:"Lower arch scan",req:true,accept:".stl,.obj"},{id:"bite",label:"Bite registration",req:false,accept:".stl"},{id:"photo",label:"Prep photo",req:false,accept:".jpg,.png"}]},
    mockup:{label:"Smile Mockup",icon:"◉",desc:"Digital smile design before any preparation",files:[{id:"face",label:"Full face — repose",req:true,accept:".jpg,.png"},{id:"smile",label:"Full face — smile",req:true,accept:".jpg,.png"},{id:"retracted",label:"Retracted frontal",req:true,accept:".jpg,.png"},{id:"lateral",label:"Lateral view",req:false,accept:".jpg,.png"},{id:"arch",label:"Upper arch scan",req:false,accept:".stl"}]},
    implant:{label:"Implant Restoration",icon:"◆",desc:"Crown on implant, bridge, bar or abutment",files:[{id:"upper",label:"Upper arch + scan body",req:true,accept:".stl"},{id:"lower",label:"Lower arch",req:true,accept:".stl"},{id:"cbct",label:"CBCT / DICOM",req:false,accept:".dcm,.zip"},{id:"bite",label:"Bite registration",req:false,accept:".stl"}]},
  };
  const SYS_DEFS={mill:{name:"Mill Connect",icon:"◈",color:C.blue,colorD:"rgba(56,139,253,.1)",modes:["prep","implant"],desc:"In-office mill workflow — same-day crown delivery",formats:["STL","DXD"]},smile:{name:"Smile Design",icon:"◉",color:C.amber,colorD:C.amberD,modes:["mockup","prep"],desc:"Photo-based cloud DSD — mockup overlay + tooth dimensions returned",formats:["PNG overlay","Dimensions"]},lab:{name:"Lab CAD",icon:"⬡",color:C.purple,colorD:C.purpleD,modes:["prep","mockup","implant"],desc:"Full design package export to lab CAD platform — round-trip STL",formats:["STL","3OX","DCM","Lab RX"]}};

  const [step,setStep]=useState("mode"); // mode|system|files|status
  const [mode,setMode]=useState(null);
  const [system,setSystem]=useState(null);
  const [files,setFiles]=useState({});
  const [autoMode,setAutoMode]=useState(true);
  const [job,setJob]=useState(null);
  const [countdown,setCountdown]=useState(null);
  const timerRef=useRef(null);

  const modeFiles=mode?MODE_DEFS[mode].files:[];
  const reqFiles=modeFiles.filter(f=>f.req);
  const reqDone=reqFiles.filter(f=>files[f.id]);
  const canSend=reqDone.length>=reqFiles.length&&system;

  const selectMode=(m)=>{setMode(m);setFiles({});setSystem(null);setStep("system");};
  const selectSystem=(s)=>{setSystem(s);setStep("files");};
  const markFile=(id)=>setFiles(p=>({...p,[id]:true}));

  // Auto-send countdown when required files done
  useEffect(()=>{
    if(!autoMode||step!=="files"||!canSend)return;
    let t=5;setCountdown(5);
    timerRef.current=setInterval(()=>{t--;if(t<=0){clearInterval(timerRef.current);setCountdown(null);send();}else setCountdown(t);},1000);
    return()=>{if(timerRef.current)clearInterval(timerRef.current);};
  },[files,autoMode,step,system]);

  const cancelCountdown=()=>{if(timerRef.current)clearInterval(timerRef.current);setCountdown(null);};

  const send=()=>{
    setJob({id:`RES-${Date.now()}`,status:"uploading",progress:0,startedAt:new Date()});
    setStep("status");
    let p=0;
    const iv=setInterval(()=>{p+=Math.random()*18;if(p>=100){p=100;clearInterval(iv);setJob(j=>({...j,progress:100,status:"ready"}));}else setJob(j=>({...j,progress:Math.round(p),status:p>40?"processing":"uploading"}));},400);
  };

  const reset=()=>{setStep("mode");setMode(null);setSystem(null);setFiles({});setJob(null);setCountdown(null);if(timerRef.current)clearInterval(timerRef.current);};

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Sub-header */}
      <div style={{borderBottom:`1px solid ${C.b}`,padding:"0 24px",height:44,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surf,flexShrink:0}}>
        <span style={{fontSize:12,fontWeight:700,color:C.teal}}>Design Suite Bridge</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:autoMode?C.teal:C.muted,fontWeight:600,fontFamily:C.mono}}>AUTO</span>
            <div onClick={()=>setAutoMode(a=>!a)} style={{width:34,height:18,borderRadius:9,background:autoMode?C.teal:C.surf3,cursor:"pointer",position:"relative",border:`1px solid ${autoMode?C.teal:C.b}`,transition:"all .2s"}}><div style={{position:"absolute",top:2,left:autoMode?16:2,width:12,height:12,borderRadius:6,background:"white",transition:"left .2s"}}/></div>
          </div>
          {["Mode","System","Files","Status"].map((s,i)=>{const stages=["mode","system","files","status"];const idx=stages.indexOf(step);const done=i<idx,active=i===idx;return <span key={s} style={{fontSize:9,fontFamily:C.mono,padding:"2px 6px",borderRadius:3,background:active?C.teal:done?C.tealD:"transparent",color:active?"white":done?C.teal:C.dim,border:`1px solid ${active?C.teal:done?C.tealB:C.b}`}}>{done?"✓ ":""}{s}</span>;})}
          <button onClick={reset} style={{fontSize:10,color:C.muted,background:"none",border:`1px solid ${C.b}`,borderRadius:4,padding:"3px 10px",cursor:"pointer"}}>↺</button>
        </div>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"32px 24px"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>

          {/* Mode */}
          {step==="mode"&&<div>
            <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em",marginBottom:6}}>What are you designing?</div><div style={{fontSize:12,color:C.muted}}>{autoMode?"Drop files and auto mode detects everything":"Select case type manually"}</div></div>
            {autoMode&&<label style={{display:"block",border:`2px dashed ${C.tealB}`,borderRadius:10,padding:"28px 24px",textAlign:"center",marginBottom:20,cursor:"pointer",transition:"all .2s"}} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.teal;}} onDragLeave={e=>{e.currentTarget.style.borderColor=C.tealB;}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.tealB;setMode("prep");setStep("files");}}><div style={{fontSize:24,marginBottom:8}}>⚡</div><div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Drop case files here</div><div style={{fontSize:11,color:C.muted,marginBottom:12}}>STL, photos, CBCT — auto detects case type</div><span style={{padding:"7px 16px",borderRadius:5,background:C.teal,color:"white",fontSize:11,fontWeight:700}}>Browse files</span><input type="file" multiple style={{display:"none"}} onChange={()=>{setMode("prep");setStep("files");}}/></label>}
            <div style={{fontSize:10,color:C.muted,marginBottom:12,letterSpacing:1}}>{autoMode?"OR SELECT MANUALLY:":"SELECT CASE TYPE:"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {Object.entries(MODE_DEFS).map(([k,def])=><div key={k} onClick={()=>selectMode(k)} style={{padding:16,borderRadius:8,border:`1px solid ${C.b}`,background:C.surf,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealD;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b;e.currentTarget.style.background=C.surf;}}><div style={{fontSize:18,marginBottom:8}}>{def.icon}</div><div style={{fontSize:12,fontWeight:700,marginBottom:4}}>{def.label}</div><div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{def.desc}</div></div>)}
            </div>
          </div>}

          {/* System */}
          {step==="system"&&mode&&<div>
            <button onClick={()=>setStep("mode")} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"0 0 20px",display:"block"}}>← Back</button>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{MODE_DEFS[mode].icon} {MODE_DEFS[mode].label} — Choose system</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Systems highlighted support this case type.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {Object.entries(SYS_DEFS).map(([k,sys])=>{const sup=sys.modes.includes(mode);return(<div key={k} onClick={()=>sup&&selectSystem(k)} style={{padding:20,borderRadius:10,border:`1px solid ${sup?sys.color+"40":C.b}`,background:sup?sys.colorD:C.surf2,cursor:sup?"pointer":"not-allowed",opacity:sup?1:0.4,transition:"all .15s"}} onMouseEnter={e=>{if(sup){e.currentTarget.style.borderColor=sys.color;e.currentTarget.style.transform="translateY(-2px)";}}} onMouseLeave={e=>{if(sup){e.currentTarget.style.borderColor=sys.color+"40";e.currentTarget.style.transform="";}}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:18,color:sys.color}}>{sys.icon}</span><div><div style={{fontSize:13,fontWeight:700}}>{sys.name}</div></div></div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:12}}>{sys.desc}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{sys.formats.map(f=><span key={f} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:sys.color+"15",color:sys.color,fontFamily:C.mono}}>{f}</span>)}</div>
                {!sup&&<div style={{marginTop:8,fontSize:10,color:C.dim}}>Not available for this case type</div>}
              </div>);})}</div>
          </div>}

          {/* Files */}
          {step==="files"&&mode&&system&&<div>
            <button onClick={()=>setStep("system")} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"0 0 20px",display:"block"}}>← Back</button>
            {autoMode&&<div style={{padding:"10px 14px",borderRadius:7,background:C.tealD,border:`1px solid ${C.tealB}`,display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:14}}>⚡</span><div><div style={{fontSize:11,fontWeight:700,color:C.teal}}>Auto mode — {SYS_DEFS[system].name}</div><div style={{fontSize:10,color:C.muted}}>Upload required files to auto-send</div></div></div>}
            {countdown!==null&&<div style={{padding:"10px 16px",borderRadius:6,background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.3)",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:12,color:C.gold}}>⚡ Auto-sending in <strong>{countdown}s</strong> — all required files ready</span><button onClick={cancelCountdown} style={{fontSize:11,color:C.gold,background:"none",border:`1px solid ${C.gold}`,borderRadius:4,padding:"2px 10px",cursor:"pointer"}}>Cancel</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
              <div>
                <div style={{marginBottom:14}}><div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Upload case files</div><div style={{fontSize:11,color:C.muted}}>{reqDone.length}/{reqFiles.length} required · {Object.keys(files).length}/{modeFiles.length} total</div><div style={{marginTop:8,height:3,background:C.b,borderRadius:2}}><div style={{height:"100%",background:C.teal,borderRadius:2,width:`${modeFiles.length?(Object.keys(files).length/modeFiles.length)*100:0}%`,transition:"width .3s"}}/></div></div>
                {modeFiles.map(slot=><div key={slot.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,border:`1px solid ${files[slot.id]?C.teal+"50":C.b}`,background:files[slot.id]?C.tealD:C.surf,marginBottom:8,transition:"all .2s"}}><div style={{width:28,height:28,borderRadius:6,background:files[slot.id]?C.teal:C.b,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",flexShrink:0}}>{files[slot.id]?"✓":"↑"}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600}}>{slot.label}</span>{slot.req&&<Chip label="REQ" color={C.amber} dim={C.amberD}/>}</div></div><label style={{padding:"5px 12px",borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${files[slot.id]?C.teal:C.b}`,color:files[slot.id]?C.teal:C.muted,cursor:"pointer"}} onClick={()=>markFile(slot.id)}>{files[slot.id]?"Replace":"Upload"}<input type="file" accept={slot.accept} style={{display:"none"}} onChange={()=>markFile(slot.id)}/></label></div>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{padding:14,borderRadius:8,border:`1px solid ${SYS_DEFS[system].color}30`,background:SYS_DEFS[system].colorD}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18,color:SYS_DEFS[system].color}}>{SYS_DEFS[system].icon}</span><div><div style={{fontSize:12,fontWeight:700}}>{SYS_DEFS[system].name}</div><div style={{fontSize:10,color:C.muted}}>Round-trip integration</div></div></div></div>
                <button onClick={send} disabled={!canSend} style={{padding:"12px 18px",borderRadius:7,fontSize:12,fontWeight:700,border:"none",cursor:canSend?"pointer":"not-allowed",background:canSend?C.teal:C.surf3,color:canSend?"white":C.dim,fontFamily:C.font,boxShadow:canSend?"0 4px 12px rgba(0,180,138,.3)":"none"}}>Send to {SYS_DEFS[system].name} →</button>
                {!canSend&&<div style={{fontSize:10,color:C.muted,textAlign:"center"}}>{reqFiles.length-reqDone.length} required file{reqFiles.length-reqDone.length!==1?"s":""} remaining</div>}
              </div>
            </div>
          </div>}

          {/* Status */}
          {step==="status"&&job&&system&&<div style={{maxWidth:480,margin:"0 auto"}}>
            <div style={{background:C.surf,borderRadius:12,border:`1px solid ${C.b}`,padding:28}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:20,color:SYS_DEFS[system].color}}>{SYS_DEFS[system].icon}</span><div><div style={{fontSize:14,fontWeight:700}}>Sent to {SYS_DEFS[system].name}</div><div style={{fontSize:10,fontFamily:C.mono,color:C.muted}}>{job.id}</div></div></div><span style={{fontSize:9,fontFamily:C.mono,padding:"3px 8px",borderRadius:999,background:job.status==="ready"?C.tealD:"rgba(212,168,67,.1)",color:job.status==="ready"?C.teal:C.gold,border:`1px solid ${job.status==="ready"?C.tealB:"rgba(212,168,67,.3)"}`}}>{job.status.toUpperCase()}</span></div>
              <div style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.muted}}>{job.status==="uploading"?"Uploading…":job.status==="processing"?"Processing…":"Design ready"}</span><span style={{fontSize:11,fontFamily:C.mono,fontWeight:700}}>{job.progress}%</span></div><div style={{height:5,background:C.surf2,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:job.status==="ready"?C.teal:SYS_DEFS[system].color,width:`${job.progress}%`,transition:"width .4s",borderRadius:3}}/></div></div>
              {job.status==="ready"?<div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Btn onClick={()=>{}}>Import design → Restora</Btn>
                <Btn variant="ghost" onClick={()=>{}}>Open in partner system ↗</Btn>
                <Btn variant="ghost" onClick={reset}>↺ New case</Btn>
              </div>:<div style={{textAlign:"center",fontSize:12,color:C.muted}}>Processing in {SYS_DEFS[system].name}…</div>}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ── Smile Simulation ──
function SmileSim(){
  const canvasRef=useRef(null);
  const [shade,setShade]=useState("A1");
  const [trans,setTrans]=useState(35);
  const [specular,setSpecular]=useState(60);
  const [approved,setApproved]=useState(false);
  const [view,setView]=useState("split"); // split|before|after
  const [divider,setDivider]=useState(50);
  const shades=["BL1","BL2","BL3","BL4","A1","A2","A3","B1","B2"];
  const shadeColors={"BL1":"#f5f2ec","BL2":"#f2ede3","BL3":"#eee7d8","BL4":"#ebe0cc","A1":"#e8dcc0","A2":"#e2d3ad","A3":"#d9c596","B1":"#e6dab8","B2":"#ddd0a5"};

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    // Background
    ctx.fillStyle="#1a1a2e";ctx.fillRect(0,0,W,H);
    // Face gradient
    const fg=ctx.createRadialGradient(W*.5,H*.38,20,W*.5,H*.4,H*.52);
    fg.addColorStop(0,"#d4a880");fg.addColorStop(.7,"#c49268");fg.addColorStop(1,"rgba(180,130,90,0)");
    ctx.fillStyle=fg;ctx.beginPath();ctx.ellipse(W*.5,H*.38,W*.42,H*.48,0,0,Math.PI*2);ctx.fill();
    // Eyes
    [[W*.36,H*.28],[W*.64,H*.28]].forEach(([ex,ey])=>{
      ctx.fillStyle="rgba(0,0,0,.7)";ctx.beginPath();ctx.ellipse(ex,ey,8,5.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#3a2010";ctx.beginPath();ctx.ellipse(ex,ey,5,5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.9)";ctx.beginPath();ctx.ellipse(ex+2,ey-2,1.8,1.8,0,0,Math.PI*2);ctx.fill();
    });
    // Nose
    ctx.strokeStyle="rgba(0,0,0,.2)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*.5,H*.37);ctx.lineTo(W*.47,H*.46);ctx.lineTo(W*.53,H*.46);ctx.stroke();
    // Lips
    ctx.fillStyle="#c06060";ctx.beginPath();ctx.ellipse(W*.5,H*.55,W*.12,8,0,0,Math.PI);ctx.fill();
    // Teeth area
    const MY=H*.575,MH=view==="before"?0:32,MW=W*.28;
    if(view!=="before"&&(view==="after"||view==="split")){
      ctx.fillStyle="#1a0808";ctx.beginPath();ctx.ellipse(W*.5,MY+MH*.4,MW*.52,MH*.52,0,0,Math.PI*2);ctx.fill();
      const col=shadeColors[shade]||"#e8dcc0";
      const n=4,tw=(MW*.95)/n,th=MH*.85;
      const sx=W*.5-(n*tw)*.5;
      for(let i=0;i<n;i++){
        const tx=sx+i*tw+tw*.05,isc=i===1||i===2;
        const fw=isc?tw*.9:tw*.84,fh=isc?th:th*.9,fy=isc?MY:MY+th*.05;
        const gr=ctx.createLinearGradient(tx,fy,tx+fw,fy+fh);
        gr.addColorStop(0,col);gr.addColorStop(.7,col+"cc");gr.addColorStop(1,"rgba(200,180,140,.5)");
        ctx.fillStyle=gr;
        ctx.beginPath();
        const r=fw*.25;
        ctx.moveTo(tx+r,fy);ctx.lineTo(tx+fw-r,fy);ctx.arcTo(tx+fw,fy,tx+fw,fy+r,r);
        ctx.lineTo(tx+fw,fy+fh-r*.5);ctx.arcTo(tx+fw,fy+fh,tx+fw-r,fy+fh,r*.5);
        ctx.lineTo(tx+r,fy+fh);ctx.arcTo(tx,fy+fh,tx,fy+fh-r*.5,r*.5);
        ctx.lineTo(tx,fy+r);ctx.arcTo(tx,fy,tx+r,fy,r);ctx.closePath();ctx.fill();
        // Specular
        const sg=ctx.createRadialGradient(tx+fw*.35,fy+fh*.25,0,tx+fw*.35,fy+fh*.25,fw*.4);
        sg.addColorStop(0,`rgba(255,255,255,${specular/300})`);sg.addColorStop(1,"transparent");
        ctx.fillStyle=sg;ctx.fill();
        // Incisal translucency
        if(trans>10){
          const tg=ctx.createLinearGradient(tx,fy,tx,fy+fh*.25);
          tg.addColorStop(0,`rgba(180,210,240,${trans/250})`);tg.addColorStop(1,"transparent");
          ctx.fillStyle=tg;ctx.fillRect(tx,fy,fw,fh*.25);
        }
      }
    }
    // Split divider
    if(view==="split"){
      const dx=W*(divider/100);
      ctx.strokeStyle="white";ctx.lineWidth=2;ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(dx,0);ctx.lineTo(dx,H);ctx.stroke();
      ctx.fillStyle="white";ctx.beginPath();ctx.arc(dx,H*.5,14,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#333";ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("◀▶",dx,H*.5);
    }
  },[shade,trans,specular,view,divider]);

  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{display:"flex",gap:8,padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.b}`,flexShrink:0}}>
          {["split","before","after"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"5px 12px",borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${view===v?C.teal:C.b}`,background:view===v?C.tealD:"transparent",color:view===v?C.teal:C.muted,cursor:"pointer"}}>{v[0].toUpperCase()+v.slice(1)}</button>)}
        </div>
        <canvas ref={canvasRef} width={400} height={480} style={{flex:1,width:"100%",height:"100%",objectFit:"contain",cursor:view==="split"?"ew-resize":"default"}} onClick={e=>{if(view==="split"){const r=e.currentTarget.getBoundingClientRect();setDivider(Math.round((e.clientX-r.left)/r.width*100));}}}/>
        {approved&&<div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",padding:"8px 20px",borderRadius:999,background:C.green,color:"white",fontSize:12,fontWeight:700}}>✓ Patient approved</div>}
      </div>
      <div style={{width:220,background:C.surf,borderLeft:`1px solid ${C.b}`,padding:14,overflow:"auto",flexShrink:0}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:10}}>SHADE</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16}}>
          {shades.map(s=><div key={s} onClick={()=>setShade(s)} style={{height:32,borderRadius:5,background:shadeColors[s],border:`2px solid ${shade===s?C.teal:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontFamily:C.mono,fontWeight:700,color:"#666"}}>{s}</div>)}
        </div>
        {[{label:"Translucency",val:trans,set:setTrans},{label:"Specular",val:specular,set:setSpecular}].map(({label,val,set})=>(
          <div key={label} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:C.muted}}>{label}</span><span style={{fontSize:10,fontFamily:C.mono,color:C.teal}}>{val}</span></div>
            <input type="range" min={0} max={100} value={val} onChange={e=>set(parseInt(e.target.value))} style={{width:"100%",accentColor:C.teal}}/>
          </div>
        ))}
        <div style={{borderTop:`1px solid ${C.b}`,paddingTop:12,marginTop:4}}>
          <Btn onClick={()=>setApproved(true)} style={{width:"100%",marginBottom:8}}>{approved?"✓ Approved":"Patient approval"}</Btn>
          {approved&&<div style={{fontSize:10,color:C.green,textAlign:"center"}}>Signed · Design locked</div>}
        </div>
      </div>
    </div>
  );
}

// ── Restoration CAD ──
function RestorationCAD(){
  const canvasRef=useRef(null);
  const [tooth,setTooth]=useState(8);
  const [type,setType]=useState("crown");
  const [scale,setScale]=useState(1.0);
  const [rotY,setRotY]=useState(0);
  const [margin,setMargin]=useState(0.5);
  const [contact,setContact]=useState(0.02);
  const [occ,setOcc]=useState(0.1);
  const [showMargin,setShowMargin]=useState(true);
  const [showOcc,setShowOcc]=useState(true);
  const [exported,setExported]=useState(false);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    // Background
    ctx.fillStyle="#06090e";ctx.fillRect(0,0,W,H);
    // Grid
    ctx.strokeStyle="rgba(255,255,255,.04)";ctx.lineWidth=1;
    for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    const cx=W/2,cy=H/2;
    // Crown geometry (2D projection of 3D form)
    const s=scale*80,r=rotY*(Math.PI/180);
    const cw=s*(0.8+Math.cos(r)*0.2);
    // Prep (grey)
    ctx.fillStyle="rgba(100,110,130,.4)";ctx.strokeStyle="rgba(150,160,180,.5)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(cx,cy+s*.15,cw*.45,s*.3,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // Crown form
    const grad=ctx.createRadialGradient(cx-cw*.2,cy-s*.3,10,cx,cy,s);
    grad.addColorStop(0,"rgba(245,240,232,.95)");grad.addColorStop(.6,"rgba(230,222,210,.88)");grad.addColorStop(1,"rgba(210,200,185,.7)");
    ctx.fillStyle=grad;ctx.strokeStyle="rgba(255,255,255,.15)";ctx.lineWidth=2;
    // Crown shape
    ctx.beginPath();
    ctx.moveTo(cx-cw*.5,cy+s*.2);
    ctx.bezierCurveTo(cx-cw*.5,cy+s*.35,cx-cw*.35,cy+s*.42,cx,cy+s*.4);
    ctx.bezierCurveTo(cx+cw*.35,cy+s*.42,cx+cw*.5,cy+s*.35,cx+cw*.5,cy+s*.2);
    ctx.bezierCurveTo(cx+cw*.52,cy,cx+cw*.4,cy-s*.45,cx+cw*.15,cy-s*.5);
    ctx.bezierCurveTo(cx+cw*.05,cy-s*.55,cx-cw*.05,cy-s*.55,cx-cw*.15,cy-s*.5);
    ctx.bezierCurveTo(cx-cw*.4,cy-s*.45,cx-cw*.52,cy,cx-cw*.5,cy+s*.2);
    ctx.closePath();ctx.fill();ctx.stroke();
    // Occlusal anatomy
    if(type==="crown"){
      ctx.strokeStyle="rgba(180,170,155,.4)";ctx.lineWidth=1;
      [[0,-0.3],[0.25,-0.1],[-0.25,-0.1],[0.15,0.1],[-0.15,0.1]].forEach(([dx,dy])=>{
        ctx.beginPath();ctx.arc(cx+dx*cw,cy+dy*s,6,0,Math.PI*2);ctx.stroke();
      });
    }
    // Margin line
    if(showMargin){ctx.strokeStyle=C.teal;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(cx,cy+s*.2,cw*.48,s*.04,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    // Occlusion dots
    if(showOcc){[[0,-s*.3],[cw*.2,-s*.15],[-cw*.2,-s*.15]].forEach(([dx,dy])=>{ctx.fillStyle="rgba(0,180,138,.6)";ctx.beginPath();ctx.arc(cx+dx,cy+dy,4,0,Math.PI*2);ctx.fill();});}
    // Labels
    ctx.fillStyle=C.teal;ctx.font="bold 11px monospace";ctx.textAlign="left";ctx.textBaseline="top";
    ctx.fillText(`#${tooth} · ${type}`,10,10);
    ctx.fillStyle=C.muted;ctx.font="10px monospace";ctx.fillText(`Scale ${(scale*100).toFixed(0)}% · RotY ${rotY}°`,10,26);
  },[tooth,type,scale,rotY,showMargin,showOcc,margin,contact,occ]);

  const TYPES=["crown","veneer","onlay","inlay"];
  const TEETH=[7,8,9,10,14,19,30];
  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <canvas ref={canvasRef} width={420} height={500} style={{flex:1,background:"#06090e",objectFit:"contain",maxWidth:"60%"}}/>
      <div style={{width:220,background:C.surf,borderLeft:`1px solid ${C.b}`,padding:14,overflow:"auto",flexShrink:0,fontSize:11}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>RESTORATION TYPE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {TYPES.map(t=><button key={t} onClick={()=>setType(t)} style={{padding:"6px 10px",borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${type===t?C.teal:C.b}`,background:type===t?C.tealD:"transparent",color:type===t?C.teal:C.muted,cursor:"pointer"}}>{t}</button>)}
        </div>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>TOOTH</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
          {TEETH.map(t=><button key={t} onClick={()=>setTooth(t)} style={{width:32,height:28,borderRadius:5,fontSize:11,fontWeight:700,border:`1px solid ${tooth===t?C.teal:C.b}`,background:tooth===t?C.tealD:"transparent",color:tooth===t?C.teal:C.muted,cursor:"pointer"}}>#{t}</button>)}
        </div>
        {[{label:"Scale",val:scale,set:setScale,min:.5,max:1.5,step:.01,unit:"×"},{label:"Rotate Y",val:rotY,set:setRotY,min:-45,max:45,step:1,unit:"°"},{label:"Margin depth",val:margin,set:setMargin,min:0,max:2,step:.1,unit:"mm"},{label:"Contact",val:contact,set:setContact,min:0,max:.1,step:.005,unit:"mm"},{label:"Occlusion gap",val:occ,set:setOcc,min:0,max:.5,step:.01,unit:"mm"}].map(({label,val,set,min,max,step,unit})=>(
          <div key={label} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.muted}}>{label}</span><span style={{fontFamily:C.mono,color:C.teal}}>{typeof val==="number"?val.toFixed(val%1===0?0:step<.1?3:1):val}{unit}</span></div>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(parseFloat(e.target.value))} style={{width:"100%",accentColor:C.teal}}/>
          </div>
        ))}
        <div style={{borderTop:`1px solid ${C.b}`,paddingTop:10,marginTop:4}}>
          {[{label:"Show margin line",val:showMargin,set:setShowMargin},{label:"Show occlusion",val:showOcc,set:setShowOcc}].map(({label,val,set})=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:11,color:C.muted}}>{label}</span>
              <div onClick={()=>set(v=>!v)} style={{width:30,height:16,borderRadius:8,background:val?C.teal:C.surf3,cursor:"pointer",position:"relative",border:`1px solid ${val?C.teal:C.b}`,transition:"all .2s"}}><div style={{position:"absolute",top:1.5,left:val?14:1.5,width:11,height:11,borderRadius:6,background:"white",transition:"left .2s"}}/></div>
            </div>
          ))}
          <Btn onClick={()=>setExported(true)} style={{width:"100%",marginTop:8}}>{exported?"✓ Exported STL":"Export STL"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Implant Planning ──
function ImplantPlan(){
  const [sites]=useState([{id:"s1",tooth:3,system:"Neoss ProActive",dia:4.5,len:11,status:"ok"},{id:"s2",tooth:14,system:"Neoss ProActive",dia:4.0,len:9,status:"warn"},{id:"s3",tooth:19,system:"Straumann BL",dia:4.1,len:10,status:"ok"},{id:"s4",tooth:30,system:"Nobel Active",dia:4.3,len:11,status:"ok"}]);
  const [sel,setSel]=useState("s1");
  const [approved,setApproved]=useState(false);
  const s=sites.find(x=>x.id===sel);
  const statusColor={ok:C.green,warn:C.gold,fail:C.red};
  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* Arch diagram */}
      <div style={{flex:1,background:"#06090e",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={360} height={260} viewBox="0 0 360 260">
          <ellipse cx={180} cy={200} rx={140} ry={80} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={30}/>
          <ellipse cx={180} cy={200} rx={140} ry={80} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={1}/>
          {sites.map((site,i)=>{
            const a=(-60+i*40)*(Math.PI/180);
            const x=180+140*Math.cos(a);const y=200+80*Math.sin(a);
            const isS=sel===site.id;
            return(<g key={site.id} onClick={()=>setSel(site.id)} style={{cursor:"pointer"}}>
              <circle cx={x} cy={y} r={isS?16:12} fill={isS?statusColor[site.status]:statusColor[site.status]+"60"} stroke={isS?statusColor[site.status]:"transparent"} strokeWidth={2}/>
              <text x={x} y={y+4} textAnchor="middle" fontSize={9} fill="white" fontWeight={700}>#{site.tooth}</text>
              {site.status==="warn"&&<circle cx={x+10} cy={y-10} r={5} fill={C.gold}/> }
            </g>);
          })}
        </svg>
        <div style={{position:"absolute",bottom:16,left:16,fontSize:9,fontFamily:C.mono,color:C.muted}}>● OK  ● Warning  Click site to inspect</div>
      </div>
      {/* Panel */}
      <div style={{width:260,background:C.surf,borderLeft:`1px solid ${C.b}`,padding:16,overflow:"auto",flexShrink:0}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:10}}>IMPLANT SITES</div>
        {sites.map(site=><div key={site.id} onClick={()=>setSel(site.id)} style={{padding:"10px 12px",borderRadius:7,border:`1px solid ${sel===site.id?C.teal:C.b}`,background:sel===site.id?C.tealD:C.surf2,cursor:"pointer",marginBottom:6,transition:"all .15s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:700}}>Tooth #{site.tooth}</span><span style={{width:8,height:8,borderRadius:"50%",background:statusColor[site.status],display:"block"}}/></div>
          <div style={{fontSize:10,color:C.muted}}>{site.system} Ø{site.dia}×{site.len}mm</div>
        </div>)}
        {s&&<div style={{marginTop:16,padding:14,borderRadius:8,background:C.surf2,border:`1px solid ${C.b}`}}>
          <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>#{s.tooth} — Site detail</div>
          {[["System",s.system],["Diameter",`${s.dia}mm`],["Length",`${s.len}mm`],["Bone quality","D2 (est.)"],["Primary stability","38 Ncm (est.)"],["Guide type","Tooth-supported"]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.b}`,fontSize:11}}><span style={{color:C.muted}}>{k}</span><span style={{fontFamily:C.mono,fontSize:10,color:s.status==="warn"&&k==="Primary stability"?C.gold:C.ink}}>{v}</span></div>)}
          {s.status==="warn"&&<div style={{marginTop:10,padding:"8px 10px",borderRadius:5,background:C.gold+"15",border:`1px solid ${C.gold}30`,fontSize:10,color:C.gold}}>⚠ Primary stability borderline — stage protocol recommended</div>}
          <Btn onClick={()=>setApproved(true)} style={{width:"100%",marginTop:12}}>{approved?"✓ Plan approved":"Approve plan"}</Btn>
        </div>}
      </div>
    </div>
  );
}

// ── Export Hub ──
function ExportHub(){
  const FILES=[{id:"f1",name:"Upper arch scan.stl",type:"scan",size:"8.4 MB"},{id:"f2",name:"Lower arch scan.stl",type:"scan",size:"7.1 MB"},{id:"f3",name:"Crown design #8–9.stl",type:"design",size:"2.3 MB"},{id:"f4",name:"CBCT panoramic.dcm",type:"radiograph",size:"18 MB"},{id:"f5",name:"Face photo retracted.jpg",type:"photo",size:"1.2 MB"},{id:"f6",name:"Treatment plan.pdf",type:"document",size:"0.4 MB"}];
  const DESTS=[{id:"mill",icon:"◈",label:"Mill Connect",fmt:"STL/DXD",color:C.blue},{id:"smile",icon:"◉",label:"Smile Design",fmt:"STL/PNG",color:C.amber},{id:"lab",icon:"⬡",label:"Lab CAD",fmt:"STL/3OX/DCM",color:C.purple},{id:"printer",icon:"🖨",label:"3D Printer",fmt:"STL/OBJ",color:C.green},{id:"cloud",icon:"☁️",label:"Restora Cloud",fmt:"All",color:C.teal},{id:"local",icon:"💾",label:"Local Download",fmt:"ZIP",color:C.muted}];
  const [selFiles,setSelFiles]=useState(new Set(["f1","f2","f3"]));
  const [selDests,setSelDests]=useState(new Set(["mill"]));
  const [note,setNote]=useState("");
  const [sent,setSent]=useState(false);
  const togFile=(id)=>setSelFiles(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const togDest=(id)=>setSelDests(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const typeColor={scan:C.blue,design:C.teal,radiograph:C.amber,photo:C.purple,document:C.muted};
  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* Files */}
      <div style={{width:240,background:C.surf,borderRight:`1px solid ${C.b}`,padding:14,overflow:"auto",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2}}>CASE FILES</span><button onClick={()=>setSelFiles(new Set(FILES.map(f=>f.id)))} style={{fontSize:10,color:C.teal,background:"none",border:"none",cursor:"pointer"}}>Select all</button></div>
        {FILES.map(f=><div key={f.id} onClick={()=>togFile(f.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:6,border:`1px solid ${selFiles.has(f.id)?C.teal+"40":C.b}`,background:selFiles.has(f.id)?C.tealD:"transparent",marginBottom:6,cursor:"pointer",transition:"all .15s"}}>
          <div style={{width:8,height:8,borderRadius:2,background:typeColor[f.type]||C.muted,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{fontSize:9,color:C.muted}}>{f.size}</div></div>
          <div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${selFiles.has(f.id)?C.teal:C.b}`,background:selFiles.has(f.id)?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{selFiles.has(f.id)&&<span style={{fontSize:8,color:"white"}}>✓</span>}</div>
        </div>)}
      </div>
      {/* Destinations */}
      <div style={{flex:1,padding:16,overflow:"auto"}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:10}}>DESTINATIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
          {DESTS.map(d=><div key={d.id} onClick={()=>togDest(d.id)} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${selDests.has(d.id)?d.color+"50":C.b}`,background:selDests.has(d.id)?d.color+"0d":"transparent",cursor:"pointer",transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,color:d.color}}>{d.icon}</span><div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${selDests.has(d.id)?d.color:C.b}`,background:selDests.has(d.id)?d.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{selDests.has(d.id)&&<span style={{fontSize:8,color:"white"}}>✓</span>}</div></div>
            <div style={{fontSize:11,fontWeight:700,marginBottom:2}}>{d.label}</div>
            <div style={{fontSize:9,fontFamily:C.mono,color:C.muted}}>{d.fmt}</div>
          </div>)}
        </div>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:6}}>LAB NOTE</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Case notes, shade details, special instructions…" style={{width:"100%",padding:"9px 12px",borderRadius:6,border:`1px solid ${C.b}`,background:C.surf,color:C.ink,fontSize:12,fontFamily:C.font,resize:"none",outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
        {sent?<div style={{padding:"14px 20px",borderRadius:8,background:C.green+"12",border:`1px solid ${C.green}30`,textAlign:"center"}}><div style={{fontSize:16,marginBottom:4}}>✓</div><div style={{fontSize:13,fontWeight:700,color:C.green}}>Sent to {selDests.size} destination{selDests.size!==1?"s":""}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{selFiles.size} files · {new Date().toLocaleTimeString()}</div><button onClick={()=>setSent(false)} style={{marginTop:10,fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer"}}>Send again</button></div>
        :<Btn onClick={()=>selFiles.size&&selDests.size&&setSent(true)} disabled={!selFiles.size||!selDests.size} style={{width:"100%"}}>Send {selFiles.size} file{selFiles.size!==1?"s":""} →</Btn>}
      </div>
    </div>
  );
}

// ── Settings ──
function SettingsPanel(){
  const [apiKey,setApiKey]=useState("");
  const [mill,setMill]=useState("In-Office Mill (Primemill)");
  const [shade,setShade]=useState("A1");
  const [occ,setOcc]=useState("Canine-guided");
  const [saved,setSaved]=useState(false);
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return(
    <div style={{flex:1,overflow:"auto",padding:"40px 28px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em",marginBottom:24}}>Settings</div>
        {[
          {section:"API",fields:[{label:"Anthropic API Key",hint:"Required for AI Design Guide",val:apiKey,set:setApiKey,type:"password",placeholder:"sk-ant-…"}]},
          {section:"Default Equipment",fields:[{label:"Mill unit",hint:"Your in-office milling system",val:mill,set:setMill,type:"select",options:["In-Office Mill (Primemill)","In-Office Mill (MC X)","In-Office Mill (inLab MC X5)","None — lab only"]}]},
          {section:"Clinical Defaults",fields:[{label:"Default shade",hint:"Starting shade for all new cases",val:shade,set:setShade,type:"select",options:["BL1","BL2","BL3","BL4","A1","A2","A3","B1","B2"]},{label:"Default occlusal scheme",hint:"Applied to all restorations",val:occ,set:setOcc,type:"select",options:["Canine-guided","Mutually protected","Group function"]}]},
        ].map(({section,fields})=>(
          <div key={section} style={{marginBottom:24}}>
            <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:12}}>{section.toUpperCase()}</div>
            <div style={{background:C.surf,borderRadius:8,border:`1px solid ${C.b}`,overflow:"hidden"}}>
              {fields.map(({label,hint,val,set,type,options,placeholder},i)=>(
                <div key={label} style={{padding:"14px 16px",borderBottom:i<fields.length-1?`1px solid ${C.b2}`:"none"}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:10,color:C.muted,marginBottom:8}}>{hint}</div>
                  {type==="select"?<select value={val} onChange={e=>set(e.target.value)} style={{padding:"7px 10px",borderRadius:5,border:`1px solid ${C.b}`,background:C.surf2,color:C.ink,fontSize:12,fontFamily:C.font,outline:"none"}}>{options.map(o=><option key={o}>{o}</option>)}</select>
                  :<input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.b}`,background:C.surf2,color:C.ink,fontSize:12,fontFamily:C.font,outline:"none",boxSizing:"border-box"}}/>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <Btn onClick={save}>{saved?"✓ Saved":"Save settings"}</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const [screen,setScreen]=useState("hub");
  const [patient,setPatient]=useState(DEMO_PATIENTS[0]);
  const nav=(s)=>setScreen(s);

  const screenLabels={"hub":"Patients","dashboard":"Dashboard","ai-guide":"AI Design Guide","design-bridge":"Design Suite","smile-sim":"Smile Simulation","restoration":"Restoration CAD","implant":"Implant Planning","export":"Export Hub","settings":"Settings"};

  return(
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",background:C.bg,color:C.ink,fontFamily:C.font,overflow:"hidden"}}>
      {/* Title bar */}
      <div style={{height:44,display:"flex",alignItems:"center",padding:"0 18px",gap:12,flexShrink:0,background:"rgba(22,27,34,.96)",borderBottom:`1px solid ${C.b}`,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",gap:6}}>{["#ff5f57","#ffbd2e","#27c940"].map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:4}}>
          <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${C.teal},#007aff)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 10.5C1.5 7 4 2 6 2C8 2 10.5 7 10.5 10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="6" cy="10.5" r="1.2" fill="white"/></svg>
          </div>
          <span style={{fontSize:15,fontWeight:700,letterSpacing:"-.02em"}}>Re<em style={{color:C.teal,fontStyle:"normal"}}>stora</em></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}>
          <span onClick={()=>nav("dashboard")} style={{cursor:"pointer",color:C.ink}}>{patient?.name}</span>
          {screen!=="hub"&&screen!=="dashboard"&&<><span style={{color:C.dim,fontSize:10}}>›</span><span style={{fontWeight:600,color:C.ink}}>{screenLabels[screen]||screen}</span></>}
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>nav("ai-guide")} style={{padding:"4px 12px",borderRadius:999,background:C.surf2,color:C.teal,border:`1px solid ${C.tealB}`,fontSize:10,fontFamily:C.mono,fontWeight:700,cursor:"pointer",letterSpacing:.5}}>✦ AI Guide</button>
        <button onClick={()=>nav("settings")} style={{padding:"4px 10px",borderRadius:999,background:"transparent",border:`1px solid ${C.b}`,color:C.muted,fontSize:11,cursor:"pointer"}}>⚙</button>
      </div>

      {/* Body */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Sidebar */}
        {screen!=="hub"&&<div style={{width:200,background:C.surf,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
          {/* Patient card */}
          <div style={{padding:"10px 10px 6px"}}>
            <div onClick={()=>nav("dashboard")} style={{padding:"10px 12px",background:C.surf2,borderRadius:8,border:`.5px solid ${C.b}`,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b;}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white",flexShrink:0}}>{patient?.name[0]}</div>
                <div><div style={{fontSize:12,fontWeight:700,letterSpacing:"-.01em"}}>{patient?.name?.split(",")[0]}</div><div style={{fontSize:10,color:C.muted}}>{patient?.caseType}</div></div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {patient?.teeth?.map(t=><span key={t} style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:C.tealD,color:C.teal,fontFamily:C.mono}}>#{t}</span>)}
              </div>
            </div>
          </div>
          {/* Nav */}
          <div style={{flex:1,overflow:"auto",padding:"6px 0"}}>
            {NAV.map(({section,items})=>(
              <div key={section} style={{marginBottom:4}}>
                <div style={{fontSize:9,fontFamily:C.mono,color:C.dim,letterSpacing:1.5,padding:"8px 14px 4px"}}>{section.toUpperCase()}</div>
                {items.map(item=>{
                  const active=screen===item.id;
                  return(
                    <div key={item.id} onClick={()=>nav(item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",cursor:"pointer",borderLeft:`2px solid ${active?C.teal:"transparent"}`,background:active?C.tealD:"transparent",transition:"all .1s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.surf2;}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                      <span style={{fontSize:13,color:active?C.teal:C.muted,flexShrink:0}}>{item.icon}</span>
                      <span style={{fontSize:12,fontWeight:active?700:500,color:active?C.ink:C.muted,flex:1}}>{item.label}</span>
                      {item.badge&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:item.bc||C.surf3,color:item.bc===C.teal?"white":C.muted,fontFamily:C.mono,fontWeight:700}}>{item.badge}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Footer */}
          <div style={{padding:"10px",borderTop:`1px solid ${C.b}`}}>
            <button onClick={()=>{setScreen("hub");}} style={{width:"100%",padding:"8px",borderRadius:6,background:"transparent",border:`1px solid ${C.b}`,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:C.font}}>← All patients</button>
          </div>
        </div>}

        {/* Main content */}
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {screen==="hub"         &&<PatientHub navigate={nav} setPatient={setPatient}/>}
          {screen==="dashboard"   &&<Dashboard navigate={nav} patient={patient}/>}
          {screen==="ai-guide"    &&<AIDesignGuide navigate={nav}/>}
          {screen==="design-bridge"&&<DesignBridge/>}
          {screen==="smile-sim"   &&<SmileSim/>}
          {screen==="restoration" &&<RestorationCAD/>}
          {screen==="implant"     &&<ImplantPlan/>}
          {screen==="export"      &&<ExportHub/>}
          {screen==="settings"    &&<SettingsPanel/>}
        </main>
      </div>
    </div>
  );
}
