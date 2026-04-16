import { useState, useReducer, useCallback, useEffect, useRef } from "react";

const C = {
  bg:"#f5f6f8",surface:"#ffffff",surface2:"#f9fafb",surface3:"#f0f2f4",
  border:"#e5e7eb",borderStrong:"#d1d5db",
  ink:"#111827",muted:"#6b7280",light:"#9ca3af",faint:"#e5e7eb",
  teal:"#00b48a",tealBg:"rgba(0,180,138,.07)",tealBorder:"rgba(0,180,138,.22)",tealGlow:"rgba(0,180,138,.25)",
  gold:"#d4a843",goldBg:"rgba(212,168,67,.08)",
  purple:"#8b5cf6",purpleBg:"rgba(139,92,246,.08)",
  amber:"#f59e0b",amberBg:"rgba(245,158,11,.08)",
  blue:"#3b82f6",blueBg:"rgba(59,130,246,.08)",
  red:"#ef4444",green:"#10b981",
  font:"system-ui,sans-serif",mono:"monospace",
  sh:"0 1px 3px rgba(0,0,0,.08)",shMd:"0 4px 12px rgba(0,0,0,.08)",
};

// ── Params ──
const PE=[
  {id:"smile_arc",label:"Smile arc",type:"select",aacd:true,options:["Consonant (ideal)","Slightly flat","Reverse — correct","Maintain existing"],default:"Consonant (ideal)",tip:"Follows lower lip — AACD"},
  {id:"wl_ratio",label:"Central W:L ratio",type:"range",aacd:true,min:65,max:90,step:1,unit:"%",default:78,tip:"AACD: 75–80%"},
  {id:"incisal_display",label:"Incisal display at repose",type:"range",aacd:true,min:0,max:5,step:0.5,unit:"mm",default:2,tip:"AACD: 1–3mm"},
  {id:"midline",label:"Midline",type:"select",aacd:true,options:["Align to facial midline","Maintain existing","Shift right","Shift left"],default:"Align to facial midline",tip:">1mm is perceptible"},
  {id:"gingival_levels",label:"Gingival levels",type:"select",aacd:true,options:["Centrals=canines · laterals 0.5mm coronal (AACD)","All level","Custom"],default:"Centrals=canines · laterals 0.5mm coronal (AACD)"},
  {id:"tooth_form",label:"Tooth form",type:"select",options:["Square-tapering","Ovoid","Triangular","Square","Match existing"],default:"Square-tapering"},
  {id:"embrasure",label:"Embrasure",type:"select",aacd:true,options:["Open (youthful)","Closed (mature)","Progressive open anteriorly"],default:"Progressive open anteriorly"},
  {id:"shade",label:"Shade",type:"select",options:["BL1","BL2","BL3","A1","A2","A3","B1","Match existing"],default:"A1"},
  {id:"texture",label:"Surface texture",type:"select",options:["Smooth high gloss","Subtle perikymata","Moderate","Pronounced"],default:"Subtle perikymata"},
  {id:"char",label:"Characterisation",type:"multiselect",options:["Mamelons","Incisal halo","Cervical chroma","Crazing","None"],default:["Incisal halo","Cervical chroma"]},
];
const PP=[
  {id:"prep_type",label:"Preparation",type:"select",options:["No-prep","Minimal <0.3mm","Veneer 0.3–0.5mm","Full crown","Onlay","Inlay"],default:"Minimal <0.3mm"},
  {id:"margin_type",label:"Margin type",type:"select",options:["Feather/knife edge","Chamfer 0.3mm","Chamfer 0.5mm","Heavy chamfer","Shoulder"],default:"Chamfer 0.3mm"},
  {id:"margin_loc",label:"Margin location",type:"select",options:["Supragingival 0.5–1mm (ideal)","Equigingival","Subgingival 0.5mm"],default:"Supragingival 0.5–1mm (ideal)",tip:"Supragingival preferred"},
  {id:"facial_red",label:"Facial reduction",type:"range",min:0,max:1.5,step:0.1,unit:"mm",default:0.3,tip:"Flag if >0.5mm"},
  {id:"material",label:"Material",type:"select",options:["Pressed lithium disilicate","Milled lithium disilicate","Feldspathic porcelain","Composite resin","Zirconia HT","Zirconia MT","Cast gold","PFM"],default:"Pressed lithium disilicate"},
  {id:"emergence",label:"Emergence profile",type:"select",options:["Zero tissue push (ideal)","Minimal push","Standard","Custom"],default:"Zero tissue push (ideal)",tip:"Concave/flat — never convex"},
];
const PO=[
  {id:"occ_scheme",label:"Occlusal scheme",type:"select",options:["Canine-guided (default)","Mutually protected","Group function","Lingualized"],default:"Canine-guided (default)"},
  {id:"ant_guidance",label:"Anterior guidance",type:"select",options:["Establish — posterior disclusion","Maintain existing","Shallow concern","Steep"],default:"Establish — posterior disclusion"},
  {id:"centric",label:"Centric contacts",type:"select",options:["Flat planes (ideal)","Cusp tip — adjust","Tripod contacts","No contacts (implant)"],default:"Flat planes (ideal)"},
];
const PI=[
  {id:"impl_zone",label:"Zone",type:"select",options:["Anterior esthetic","Posterior load-bearing","Canine replacement"],default:"Posterior load-bearing"},
  {id:"impl_rest",label:"Restoration type",type:"select",options:["Screw-retained (preferred)","Cement-retained","Custom abutment + crown","Bar overdenture"],default:"Screw-retained (preferred)"},
  {id:"platform",label:"Platform switching",type:"toggle",default:true,tip:"Preserves crestal bone"},
  {id:"prosth_space",label:"Prosthetic space",type:"range",min:5,max:20,step:0.5,unit:"mm",default:10},
  {id:"imm_load",label:"Immediate loading",type:"toggle",default:false,tip:"Requires ≥35 Ncm"},
];

const CASES={
  "cosmetic-anterior":{label:"Cosmetic Anterior",icon:"✦",sub:"Veneers · Crowns · Bonding",color:C.gold,colorBg:C.goldBg,systems:["Smile Design","Mill Connect","Lab CAD"],desc:"Esthetic zone — smile design parameters drive all decisions"},
  "smile-makeover":{label:"Smile Makeover",icon:"◈",sub:"Full arch esthetic redesign",color:C.teal,colorBg:C.tealBg,systems:["Smile Design","Lab CAD","Mill Connect"],desc:"Multi-unit comprehensive esthetic treatment"},
  "restorative-posterior":{label:"Restorative Posterior",icon:"⬡",sub:"Crowns · Onlays · Inlays",color:C.purple,colorBg:C.purpleBg,systems:["Mill Connect","Lab CAD"],desc:"Function-first — biologic shaping + occlusal protocol"},
  "implant-single":{label:"Single Implant",icon:"◆",sub:"Crown on implant",color:C.amber,colorBg:C.amberBg,systems:["Lab CAD","Mill Connect"],desc:"Emergence, platform matching, esthetic integration"},
  "implant-full-arch":{label:"Full Arch Implant",icon:"⬟",sub:"Hybrid · Zirconia · Bar",color:C.teal,colorBg:C.tealBg,systems:["Lab CAD"],desc:"Complete arch prosthetic design"},
};
const SUITES={
  smile:{title:"Smile Design",icon:"◉",color:C.amber,key:"smile_design",actions:["Upload patient photos","Generate smile preview","Import mockup overlay","Approve with patient"]},
  mill:{title:"Mill Connect",icon:"◈",color:C.blue,key:"mill_connect",actions:["Upload prep scans","Generate crown design","Check occlusion","Send to mill unit"]},
  lab:{title:"Lab CAD",icon:"⬡",color:C.purple,key:"lab_cad",actions:["Upload full scan set","Generate design file","Export STL + design file","Send to lab"]},
};
const BMODES={
  "prep-restoration":{label:"Prep Restoration",icon:"🦷",desc:"Crown, veneer, onlay, inlay",slots:[{id:"upper",label:"Upper arch scan",req:true,accept:".stl,.obj,.ply",hint:"STL from any IOS"},{id:"lower",label:"Lower arch scan",req:true,accept:".stl,.obj,.ply",hint:"STL from any IOS"},{id:"bite",label:"Bite registration",req:false,accept:".stl,.obj",hint:"Optional"},{id:"prep-photo",label:"Prep photo",req:false,accept:".jpg,.jpeg,.png",hint:"Post-prep retracted"}]},
  "smile-mockup":{label:"Smile Mockup",icon:"😊",desc:"DSD before any preparation",slots:[{id:"face-repose",label:"Full face — repose",req:true,accept:".jpg,.jpeg,.png,.heic",hint:"Natural light"},{id:"face-smile",label:"Full face — smile",req:true,accept:".jpg,.jpeg,.png,.heic",hint:"Full natural smile"},{id:"retracted",label:"Retracted frontal",req:true,accept:".jpg,.jpeg,.png,.heic",hint:"Cheek retractors"},{id:"lateral",label:"Right lateral",req:false,accept:".jpg,.jpeg,.png",hint:"Buccal view"},{id:"upper-scan",label:"Upper arch scan",req:false,accept:".stl,.obj,.ply",hint:"3D correlation"}]},
  "implant-restoration":{label:"Implant Restoration",icon:"🔩",desc:"Crown, bridge, bar, abutment",slots:[{id:"upper",label:"Upper arch + scan body",req:true,accept:".stl,.obj,.ply",hint:"Scan body in place"},{id:"lower",label:"Lower arch",req:true,accept:".stl,.obj,.ply",hint:"STL from IOS"},{id:"cbct",label:"CBCT / DICOM",req:false,accept:".dcm,.zip",hint:"Guided surgery"},{id:"bite",label:"Bite registration",req:false,accept:".stl,.obj",hint:"Optional"}]},
};
const BSYS={
  mill:{label:"Mill Connect",icon:"◈",color:C.blue,colorBg:C.blueBg,desc:"In-office mill workflow. Prep scan → AI design → mill unit. Same-day delivery.",fmts:["STL","DXD"],modes:["prep-restoration","implant-restoration"]},
  smile:{label:"Smile Design",icon:"◉",color:C.amber,colorBg:C.amberBg,desc:"Photos → cloud DSD → mockup overlay + tooth dimensions back to Restora.",fmts:["PNG overlay","Dimensions JSON"],modes:["smile-mockup","prep-restoration"]},
  lab:{label:"Lab CAD",icon:"⬡",color:C.purple,colorBg:C.purpleBg,desc:"Full design package to lab. Bridge, implant bar, full arch, abutment design.",fmts:["STL","Design file","PDF RX"],modes:["prep-restoration","smile-mockup","implant-restoration"]},
};

// ── Shared atoms ──
const Pill=({label,color,bg})=><span style={{padding:"2px 7px",borderRadius:3,fontSize:9,fontWeight:700,letterSpacing:.7,background:bg||color+"18",color,border:`1px solid ${color}30`,fontFamily:C.mono}}>{label}</span>;
const Btn=({children,onClick,variant="primary",disabled,style:s={}})=>{
  const base={border:"none",borderRadius:7,padding:"10px 20px",fontSize:12,fontFamily:C.font,fontWeight:700,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",...s};
  const v={primary:{background:disabled?C.faint:C.teal,color:disabled?C.muted:"white",boxShadow:disabled?"none":`0 4px 12px ${C.tealGlow}`},secondary:{background:C.surface,color:C.ink,border:`1px solid ${C.border}`},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`}};
  return<button disabled={disabled} onClick={onClick} style={{...base,...v[variant],...s}}>{children}</button>;
};
function Toggle({on,onChange}){return<div onClick={()=>onChange(!on)} style={{width:38,height:20,borderRadius:10,background:on?C.teal:C.border,cursor:"pointer",position:"relative",transition:"background .2s",border:`1px solid ${on?C.teal:C.borderStrong}`,flexShrink:0}}><div style={{position:"absolute",top:2,left:on?20:2,width:14,height:14,borderRadius:7,background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/></div>;}
function PC({param,value,onChange}){
  if(param.type==="select")return<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,color:C.ink,fontSize:12,fontFamily:C.font,outline:"none",cursor:"pointer"}}>{param.options.map(o=><option key={o}>{o}</option>)}</select>;
  if(param.type==="range")return<div style={{display:"flex",alignItems:"center",gap:10}}><input type="range" min={param.min} max={param.max} step={param.step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{flex:1,accentColor:C.teal}}/><span style={{fontSize:12,fontFamily:C.mono,color:C.teal,minWidth:46,textAlign:"right"}}>{value}{param.unit}</span></div>;
  if(param.type==="toggle")return<div style={{display:"flex",alignItems:"center",gap:10}}><Toggle on={!!value} onChange={onChange}/><span style={{fontSize:11,color:value?C.teal:C.muted}}>{value?"Enabled":"Disabled"}</span></div>;
  if(param.type==="multiselect"){const sel=Array.isArray(value)?value:[];return<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{param.options.map(o=>{const on=sel.includes(o);return<button key={o} onClick={()=>onChange(on?sel.filter(s=>s!==o):[...sel,o])} style={{padding:"4px 10px",borderRadius:4,fontSize:11,cursor:"pointer",fontFamily:C.font,border:`1px solid ${on?C.teal:C.border}`,background:on?C.tealBg:"transparent",color:on?C.teal:C.muted}}>{o}</button>})}</div>;}
  return null;
}

async function callAI(caseType,params){
  const lines=Object.entries(params).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join("\n");
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:`You are Restora AI applying AACD guidelines + technique manual. Generate a dental design brief.
CASE: ${CASES[caseType]?.label} — ${CASES[caseType]?.sub}
PARAMETERS:\n${lines}
AACD RULES: W:L 75–80%. Consonant smile arc. 1–3mm incisal display. Midline >1mm flag. Gingival: centrals=canines, laterals 0.5mm coronal. Emergence concave/flat. Facial reduction >0.5mm = flag. Centric on flat planes; posterior disclusion in excursives.
Respond ONLY in valid JSON (no markdown):
{"summary":"2-sentence summary","esthetic_decisions":[{"parameter":"","value":"","rationale":"","aacd":true}],"restorative_decisions":[{"parameter":"","value":"","rationale":""}],"protocol_flags":[{"level":"pass|warning|critical","message":""}],"suite_routing":{"smile_design":{"role":"","tasks":[],"active":true},"mill_connect":{"role":"","tasks":[],"active":true},"lab_cad":{"role":"","tasks":[],"active":false}},"lab_rx_summary":"3-sentence lab RX"}`}]})});
  const d=await res.json();
  return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
}

// NAV
const NAV=[
  {section:"Intake",items:[{id:"patient-hub",icon:"👤",label:"Patients"},{id:"import",icon:"⬆",label:"Import files"}]},
  {section:"Design",items:[{id:"ai-design-guide",icon:"✦",label:"AI Design Guide",badge:"NEW",bc:C.teal},{id:"design-systems",icon:"⬡",label:"Design Systems",badge:"Bridge",bc:C.purple},{id:"restoration-design",icon:"✏️",label:"Restoration CAD"},{id:"smile-sim",icon:"😊",label:"Smile Simulation"},{id:"crown-design",icon:"🦷",label:"Crown Design"},{id:"patient-3d",icon:"🖼",label:"3D Patient View"}]},
  {section:"Planning",items:[{id:"implant-plan",icon:"🔩",label:"Implant + Guide"},{id:"ai-planning",icon:"🤖",label:"AI Planning"},{id:"full-arch",icon:"🦴",label:"Full Arch"}]},
  {section:"Delivery",items:[{id:"case-presentation",icon:"🎬",label:"Case Presentation"},{id:"export",icon:"📦",label:"Export Hub"}]},
  {section:"Library",items:[{id:"tooth-library",icon:"📚",label:"Tooth Library"},{id:"settings",icon:"⚙️",label:"Settings"}]},
];

function Sidebar({screen,navigate,patient}){
  return(
    <div style={{width:214,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
      <div style={{padding:"10px 8px 0"}}>
        <div onClick={()=>navigate("dashboard")} style={{padding:"10px 12px",background:C.tealBg,borderRadius:10,border:`1px solid ${C.tealBorder}`,cursor:"pointer",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},#00c49a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",flexShrink:0}}>
              {patient?.name?.split(" ").map(w=>w[0]).join("").slice(0,2)||"—"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{patient?.name||"Select patient"}</div>
              <div style={{fontSize:10,color:C.muted}}>{patient?.selectedCaseType||"No case"}</div>
            </div>
          </div>
          <div style={{fontSize:10,color:C.teal,fontWeight:600}}>Dashboard →</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 8px 8px"}}>
        {NAV.map(sec=>(
          <div key={sec.section} style={{marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:C.light,padding:"6px 8px 3px",textTransform:"uppercase",fontFamily:C.mono}}>{sec.section}</div>
            {sec.items.map(item=>{
              const active=screen===item.id;
              return(
                <button key={item.id} onClick={()=>navigate(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:7,border:"none",background:active?C.tealBg:"transparent",color:active?C.teal:C.muted,cursor:"pointer",fontFamily:C.font,fontSize:12,fontWeight:active?700:400,transition:"all .12s",textAlign:"left",marginBottom:1}}>
                  <span style={{fontSize:13,flexShrink:0}}>{item.icon}</span>
                  <span style={{flex:1}}>{item.label}</span>
                  {item.badge&&<span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:(item.bc||C.teal)+"20",color:item.bc||C.teal,fontFamily:C.mono,fontWeight:700}}>{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{padding:8,borderTop:`1px solid ${C.border}`}}>
        <button onClick={()=>navigate("import")} style={{width:"100%",padding:"9px",borderRadius:7,background:C.teal,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.font}}>+ Import files</button>
      </div>
    </div>
  );
}

function Header({screen,navigate,patient}){
  const L={"patient-hub":"Patients","dashboard":"Dashboard","ai-design-guide":"AI Design Guide","design-systems":"Design Systems","restoration-design":"Restoration CAD","smile-sim":"Smile Simulation","crown-design":"Crown Design","patient-3d":"3D Patient View","implant-plan":"Implant + Guide","ai-planning":"AI Planning","full-arch":"Full Arch","case-presentation":"Case Presentation","export":"Export Hub","tooth-library":"Tooth Library","settings":"Settings","import":"Import Files"};
  return(
    <div style={{height:44,display:"flex",alignItems:"center",padding:"0 16px",gap:10,background:"rgba(255,255,255,.95)",borderBottom:`1px solid ${C.border}`,backdropFilter:"blur(12px)",zIndex:100,flexShrink:0}}>
      <div style={{display:"flex",gap:5,flexShrink:0}}>{["#ff5f57","#ffbd2e","#27c940"].map((c,i)=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
      <div onClick={()=>navigate("dashboard")} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",flexShrink:0}}>
        <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${C.teal},#00c49a)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 6px ${C.tealGlow}`}}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 10.5C1.5 7 4 2 6 2C8 2 10.5 7 10.5 10.5" stroke="white" strokeWidth="2" strokeLinecap="round"/><circle cx="6" cy="10.5" r="1.2" fill="white"/></svg>
        </div>
        <span style={{fontSize:14,fontWeight:700,color:C.ink,letterSpacing:"-.02em"}}>Restora</span>
      </div>
      <span style={{color:C.faint,fontSize:11}}>›</span>
      <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{L[screen]||screen}</span>
      <div style={{flex:1}}/>
      <button onClick={()=>navigate("ai-design-guide")} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,background:C.ink,color:C.teal,border:"none",fontSize:10,fontFamily:C.mono,fontWeight:700,letterSpacing:.5,cursor:"pointer"}}>⌘ AI Guide</button>
      <button onClick={()=>navigate("export")} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:C.font}}>Export ↗</button>
      <button onClick={()=>navigate("settings")} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚙️</button>
    </div>
  );
}

// ── Patient Hub ──
function PatientHub({navigate,patients,addPatient,selectPatient}){
  const[search,setSearch]=useState("");const[creating,setCreating]=useState(false);
  const[name,setName]=useState("");const[dob,setDob]=useState("");const[ct,setCt]=useState("restoration");
  const f=patients.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const create=()=>{if(!name)return;const p={id:`p${Date.now()}`,name,dob,selectedCaseType:ct,status:"active"};addPatient(p);setCreating(false);setName("");};
  return(
    <div style={{flex:1,overflow:"auto",background:C.bg}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"36px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div><div style={{fontSize:22,fontWeight:700,color:C.ink}}>Patients</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{patients.length} total</div></div>
          <Btn onClick={()=>setCreating(true)}>+ New Patient</Btn>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients…" style={{width:"100%",padding:"9px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,fontSize:13,fontFamily:C.font,outline:"none",marginBottom:16,boxSizing:"border-box"}}/>
        {creating&&(
          <div style={{padding:20,borderRadius:10,background:C.surface,border:`1px solid ${C.tealBorder}`,marginBottom:16,boxShadow:C.shMd}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:C.ink}}>New patient</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name *" style={{padding:"8px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:13,fontFamily:C.font,outline:"none"}}/>
              <input value={dob} onChange={e=>setDob(e.target.value)} type="date" style={{padding:"8px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:13,fontFamily:C.font,outline:"none"}}/>
            </div>
            <select value={ct} onChange={e=>setCt(e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,fontSize:13,fontFamily:C.font,outline:"none",marginBottom:14}}>
              <option value="restoration">Restoration</option><option value="smile-mockup">Smile Mockup</option><option value="full-implant">Full Implant</option>
            </select>
            <div style={{display:"flex",gap:8}}><Btn onClick={create} disabled={!name}>Create →</Btn><Btn variant="ghost" onClick={()=>setCreating(false)}>Cancel</Btn></div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {f.map(p=>(
            <div key={p.id} onClick={()=>selectPatient(p.id)} style={{padding:"14px 16px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:12,boxShadow:C.sh,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow=`0 0 0 3px ${C.tealBg},${C.sh}`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow=C.sh;}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},#00c49a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>
                {p.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.selectedCaseType||"—"} · {p.dob||"DOB not set"}</div>
              </div>
              <Pill label={p.status||"active"} color={p.status==="active"?C.teal:C.muted}/>
            </div>
          ))}
          {f.length===0&&<div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>No patients found</div>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──
function Dashboard({navigate,patient}){
  const cards=[
    {id:"restoration-design",icon:"✏️",label:"Restoration CAD",desc:"3D crown and veneer workspace",color:C.teal},
    {id:"smile-sim",icon:"😊",label:"Smile Simulation",desc:"8-layer optical + patient approval",color:C.teal},
    {id:"implant-plan",icon:"🔩",label:"Implant + Guide",desc:"Site analysis + surgical guide",color:C.amber},
    {id:"ai-planning",icon:"🤖",label:"AI Planning",desc:"Conversational clinical AI",color:C.teal},
    {id:"case-presentation",icon:"🎬",label:"Case Presentation",desc:"3D before/after for acceptance",color:C.blue},
    {id:"export",icon:"📦",label:"Export Hub",desc:"Send to lab, mill, printer",color:C.purple},
  ];
  return(
    <div style={{flex:1,overflow:"auto",background:C.bg}}>
      <div style={{maxWidth:820,margin:"0 auto",padding:"36px 24px"}}>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:700,color:C.ink}}>{patient?.name||"Dashboard"}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:3}}>{patient?.selectedCaseType||"No case"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <button onClick={()=>navigate("ai-design-guide")} style={{padding:"18px 20px",borderRadius:10,background:`linear-gradient(135deg,${C.teal},#00c49a)`,border:"none",color:"white",cursor:"pointer",textAlign:"left",boxShadow:`0 4px 16px ${C.tealGlow}`}}>
            <div style={{fontSize:18,marginBottom:6}}>✦</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:3}}>AI Design Guide</div>
            <div style={{fontSize:11,opacity:.85}}>AACD parameters → AI brief → design suite</div>
          </button>
          <button onClick={()=>navigate("design-systems")} style={{padding:"18px 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,cursor:"pointer",textAlign:"left",boxShadow:C.shMd}}>
            <div style={{fontSize:18,marginBottom:6}}>⬡</div>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:3}}>Design Systems Bridge</div>
            <div style={{fontSize:11,color:C.muted}}>Mill Connect · Smile Design · Lab CAD</div>
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {cards.map(card=>(
            <button key={card.id} onClick={()=>navigate(card.id)} style={{padding:16,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,cursor:"pointer",textAlign:"left",boxShadow:C.sh,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=card.color;e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";}}>
              <div style={{fontSize:18,marginBottom:8}}>{card.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:4}}>{card.label}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{card.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Design Guide ──
const GI={step:"case-type",caseType:null,params:{},brief:null,activeSys:"smile",activeTab:"esthetic"};
function gr(s,a){
  if(a.type==="CASE"){const d={};[...PE,...PP,...PO,...PI].forEach(p=>{d[p.id]=p.default;});return{...s,caseType:a.p,params:d,step:"parameters",activeTab:"esthetic"};}
  if(a.type==="PARAM")return{...s,params:{...s.params,[a.id]:a.v}};
  if(a.type==="STEP")return{...s,step:a.p};
  if(a.type==="BRIEF")return{...s,brief:a.p,step:"brief"};
  if(a.type==="SYS")return{...s,activeSys:a.p};
  if(a.type==="TAB")return{...s,activeTab:a.p};
  if(a.type==="RESET")return GI;
  return s;
}
function FlagRow({level,message}){
  const fc={pass:C.green,warning:C.gold,critical:C.red}[level]||C.muted;
  const fi={pass:"✓",warning:"⚠",critical:"✕"}[level];
  return<div style={{display:"flex",gap:10,padding:"8px 12px",borderRadius:5,background:fc+"12",border:`1px solid ${fc}30`,marginBottom:5}}><span style={{fontSize:11,color:fc,flexShrink:0}}>{fi}</span><span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{message}</span></div>;
}
function AIDesignGuide({navigate}){
  const[g,d]=useReducer(gr,GI);const[err,setErr]=useState(null);const[loading,setLoading]=useState(false);
  const ct=g.caseType?CASES[g.caseType]:null;
  const isImpl=g.caseType?.includes("implant");
  const tabs=[{id:"esthetic",label:"Esthetic",params:PE},{id:"prep",label:"Prep + Material",params:PP},{id:"occlusion",label:"Occlusion",params:PO},...(isImpl?[{id:"implant",label:"Implant",params:PI}]:[])];
  const tabParams=tabs.find(t=>t.id===g.activeTab)?.params||[];
  const run=useCallback(async()=>{if(!g.caseType)return;setLoading(true);setErr(null);d({type:"STEP",p:"generating"});try{const brief=await callAI(g.caseType,g.params);d({type:"BRIEF",p:brief});}catch(e){setErr(e.message||"API error");d({type:"STEP",p:"parameters"});}finally{setLoading(false);}});
  const steps=["case-type","parameters","brief","suite"];
  const si=steps.indexOf(g.step==="generating"?"parameters":g.step);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,height:44,display:"flex",alignItems:"center",padding:"0 24px",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {["Case Type","Parameters","AI Brief","Design Suite"].map((s,i)=>{
            const done=i<si,active=i===si;
            return<div key={s} style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:10,fontFamily:C.mono,padding:"2px 8px",borderRadius:3,background:active?C.teal:done?C.tealBg:"transparent",color:active?"white":done?C.teal:C.light,border:`1px solid ${active?C.teal:done?C.tealBorder:C.border}`}}>{done?"✓ ":""}{s}</span>{i<3&&<span style={{fontSize:9,color:C.faint}}>›</span>}</div>;
          })}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {ct&&<Pill label={ct.label.toUpperCase()} color={ct.color} bg={ct.colorBg}/>}
          <Btn variant="ghost" onClick={()=>d({type:"RESET"})} style={{padding:"5px 12px",fontSize:11}}>↺ Reset</Btn>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto"}}>
        {/* CASE TYPE */}
        {g.step==="case-type"&&(
          <div style={{maxWidth:780,margin:"0 auto",padding:"40px 24px"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:22,fontWeight:700,color:C.ink,marginBottom:8}}>What type of case are you designing?</div>
              <div style={{fontSize:13,color:C.muted}}>Loads AACD + technique manual parameters · Routes to the correct design suite</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {Object.keys(CASES).map(k=>{const c=CASES[k];return(
                <button key={k} onClick={()=>d({type:"CASE",p:k})} style={{textAlign:"left",padding:22,borderRadius:10,cursor:"pointer",border:`1px solid ${C.border}`,background:C.surface,fontFamily:C.font,transition:"all .15s",boxShadow:C.sh}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.background=c.colorBg;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontSize:20,color:c.color}}>{c.icon}</span>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.systems.map(s=><span key={s} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:C.surface3,color:C.muted,fontFamily:C.mono}}>{s}</span>)}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:3}}>{c.label}</div>
                  <div style={{fontSize:11,color:c.color,marginBottom:8,fontStyle:"italic"}}>{c.sub}</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{c.desc}</div>
                </button>
              );})}
            </div>
          </div>
        )}
        {/* PARAMETERS */}
        {g.step==="parameters"&&ct&&(
          <div style={{maxWidth:680,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
              <button onClick={()=>d({type:"STEP",p:"case-type"})} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0}}>← Back</button>
              <span style={{fontSize:18,color:ct.color}}>{ct.icon}</span>
              <div><div style={{fontSize:15,fontWeight:700,color:C.ink}}>{ct.label}</div><div style={{fontSize:11,color:C.muted}}>AACD + technique manual parameters</div></div>
            </div>
            <div style={{display:"flex",gap:0,marginBottom:22,borderBottom:`1px solid ${C.border}`}}>
              {tabs.map(t=><button key={t.id} onClick={()=>d({type:"TAB",p:t.id})} style={{padding:"8px 16px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:C.font,border:"none",borderBottom:`2px solid ${g.activeTab===t.id?C.teal:"transparent"}`,background:"transparent",color:g.activeTab===t.id?C.teal:C.muted}}>{t.label.toUpperCase()}</button>)}
            </div>
            {tabParams.map((param,i)=>(
              <div key={param.id} style={{padding:"13px 0",borderBottom:i<tabParams.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{param.label}</span>
                  {param.aacd&&<Pill label="AACD" color={C.teal} bg={C.tealBg}/>}
                  {param.tip&&<span style={{fontSize:10,color:C.light,fontStyle:"italic"}}>{param.tip}</span>}
                </div>
                <PC param={param} value={g.params[param.id]??param.default} onChange={v=>d({type:"PARAM",id:param.id,v})}/>
              </div>
            ))}
            {err&&<div style={{marginTop:14,padding:"10px 14px",borderRadius:6,background:"#fee2e2",border:"1px solid #fca5a5",color:C.red,fontSize:12}}>{err}</div>}
            <Btn onClick={run} disabled={loading} style={{marginTop:24,width:"100%",padding:"14px",fontSize:13}}>{loading?"Generating…":"Generate AI Design Brief →"}</Btn>
          </div>
        )}
        {/* GENERATING */}
        {g.step==="generating"&&(
          <div style={{maxWidth:380,margin:"100px auto",textAlign:"center",padding:"0 24px"}}>
            <div style={{fontSize:28,marginBottom:14,color:C.teal}}>◈</div>
            <div style={{fontSize:14,fontWeight:600,color:C.ink,marginBottom:6}}>Generating design brief…</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Applying AACD guidelines<br/>Technique manual · Routing suite</div>
            <div style={{marginTop:24,height:3,background:C.surface3,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:C.teal,width:"60%",borderRadius:2,animation:"sl 1.3s ease-in-out infinite alternate"}}/></div>
            <style>{`@keyframes sl{from{margin-left:0}to{margin-left:40%}}`}</style>
          </div>
        )}
        {/* BRIEF */}
        {g.step==="brief"&&g.brief&&ct&&(
          <div style={{maxWidth:820,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div><div style={{fontSize:16,fontWeight:700,color:C.ink}}>AI Design Brief</div><div style={{fontSize:12,color:C.muted}}>{ct.label} · AACD + technique manual</div></div>
              <Btn onClick={()=>d({type:"STEP",p:"suite"})}>Open Design Suite →</Btn>
            </div>
            <div style={{padding:18,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,marginBottom:14}}>
              <div style={{fontSize:9,fontFamily:C.mono,color:C.teal,letterSpacing:2,marginBottom:8}}>CLINICAL SUMMARY</div>
              <p style={{fontSize:13,lineHeight:1.7,color:C.ink,margin:0}}>{g.brief.summary}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:9,fontFamily:C.mono,color:C.gold,letterSpacing:2}}>ESTHETIC DECISIONS</div>
                {g.brief.esthetic_decisions?.slice(0,4).map((dec,i)=>(
                  <div key={i} style={{padding:"10px 14px",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><span style={{fontSize:11,fontWeight:600,color:C.ink}}>{dec.parameter}</span>{dec.aacd&&<Pill label="AACD" color={C.teal} bg={C.tealBg}/>}</div>
                    <div style={{fontSize:11,color:C.gold,marginBottom:3,fontFamily:C.mono}}>{dec.value}</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{dec.rationale}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:9,fontFamily:C.mono,color:C.purple,letterSpacing:2}}>RESTORATIVE DECISIONS</div>
                {g.brief.restorative_decisions?.slice(0,4).map((dec,i)=>(
                  <div key={i} style={{padding:"10px 14px",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                    <div style={{fontSize:11,fontWeight:600,color:C.ink,marginBottom:3}}>{dec.parameter}</div>
                    <div style={{fontSize:11,color:C.purple,marginBottom:3,fontFamily:C.mono}}>{dec.value}</div>
                    <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{dec.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,padding:14,marginBottom:14}}>
              <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:10}}>PROTOCOL COMPLIANCE</div>
              {g.brief.protocol_flags?.map((f,i)=><FlagRow key={i} level={f.level} message={f.message}/>)}
            </div>
            <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,padding:14,marginBottom:14}}>
              <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:12}}>DESIGN SUITE ROUTING</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {Object.entries(SUITES).map(([k,sys])=>{
                  const r=g.brief.suite_routing?.[sys.key];
                  return r?<div key={k} style={{padding:12,borderRadius:6,border:`1px solid ${r.active?sys.color+"40":C.border}`,background:r.active?sys.color+"08":C.surface3,opacity:r.active?1:0.5}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span style={{fontSize:14,color:sys.color}}>{sys.icon}</span><span style={{fontSize:10,fontWeight:700,color:r.active?sys.color:C.muted,fontFamily:C.mono}}>{sys.title}</span>{r.active&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:sys.color+"20",color:sys.color}}>ON</span>}</div>
                    <div style={{fontSize:10,color:C.muted,marginBottom:5}}>{r.role}</div>
                    {r.tasks?.map((t,i)=><div key={i} style={{fontSize:10,color:C.light,marginBottom:2}}>· {t}</div>)}
                  </div>:null;
                })}
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,padding:14}}>
              <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>LAB PRESCRIPTION</div>
              <p style={{fontSize:12,lineHeight:1.8,color:C.muted,margin:0}}>{g.brief.lab_rx_summary}</p>
            </div>
          </div>
        )}
        {/* SUITE */}
        {g.step==="suite"&&g.brief&&ct&&(
          <div style={{display:"flex",height:"100%"}}>
            <div style={{width:180,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"14px 0",flexShrink:0}}>
              <div style={{padding:"0 12px 10px",fontSize:9,color:C.light,letterSpacing:2,fontFamily:C.mono}}>DESIGN SUITE</div>
              {Object.entries(SUITES).map(([k,sys])=>{
                const r=g.brief.suite_routing?.[sys.key];const active=r?.active;const sel=g.activeSys===k;
                return<button key={k} onClick={()=>active&&d({type:"SYS",p:k})} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",border:"none",cursor:active?"pointer":"not-allowed",background:sel?sys.color+"12":"transparent",borderLeft:`2px solid ${sel?sys.color:"transparent"}`,opacity:active?1:0.3,fontFamily:C.font,transition:"all .15s"}}>
                  <span style={{fontSize:14,color:sys.color}}>{sys.icon}</span>
                  <div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:600,color:sel?sys.color:C.ink}}>{sys.title}</div>{!active&&<div style={{fontSize:9,color:C.light}}>Not active</div>}</div>
                </button>;
              })}
              <div style={{flex:1}}/>
              <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`}}>
                <button onClick={()=>d({type:"STEP",p:"brief"})} style={{fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:C.font}}>← Brief</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto",padding:28}}>
              {(()=>{
                const sys=SUITES[g.activeSys];if(!sys)return null;
                const r=g.brief.suite_routing?.[sys.key];
                return<SuiteWorkspace sys={sys} route={r} brief={g.brief} navigate={navigate}/>;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuiteWorkspace({sys,route,brief,navigate}){
  const[done,setDone]=useState([]);const[fileUp,setFileUp]=useState(false);
  return(
    <div style={{maxWidth:560}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,paddingBottom:18,borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:22,color:sys.color}}>{sys.icon}</span>
        <div><div style={{fontSize:15,fontWeight:700,color:C.ink}}>{sys.title}</div><div style={{fontSize:12,color:C.muted}}>{route?.role||""}</div></div>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:sys.color,letterSpacing:2,marginBottom:10}}>TASKS FOR THIS CASE</div>
        {route?.tasks?.map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:20,height:20,borderRadius:4,border:`1px solid ${sys.color}50`,background:sys.color+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:sys.color,flexShrink:0}}>{i+1}</div>
            <span style={{fontSize:12,color:C.ink}}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{padding:16,borderRadius:8,background:C.surface,border:`2px dashed ${fileUp?sys.color:C.border}`,marginBottom:16,textAlign:"center",transition:"all .2s"}}>
        <div style={{fontSize:20,marginBottom:8}}>{fileUp?"✓":"⬆"}</div>
        <div style={{fontSize:12,fontWeight:600,color:fileUp?sys.color:C.ink,marginBottom:4}}>{fileUp?"Files ready":"Upload case files"}</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:12}}>STL · Photos · DICOM · PDF</div>
        <label style={{padding:"7px 16px",borderRadius:6,background:fileUp?sys.color:C.teal,color:"white",cursor:"pointer",fontSize:11,fontWeight:600}}>
          {fileUp?"Replace files":"Browse files"}<input type="file" multiple style={{display:"none"}} onChange={()=>setFileUp(true)}/>
        </label>
      </div>
      <div style={{padding:14,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,marginBottom:16}}>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>DESIGN BRIEF</div>
        <p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:"0 0 10px"}}>{brief.summary}</p>
        <div style={{fontSize:9,fontFamily:C.mono,color:C.muted,letterSpacing:2,marginBottom:8}}>LAB RX</div>
        <p style={{fontSize:12,color:C.muted,lineHeight:1.7,margin:0}}>{brief.lab_rx_summary}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {sys.actions.map((a,i)=>{
          const dn=done.includes(a);
          return<button key={a} onClick={()=>setDone(p=>dn?p.filter(x=>x!==a):[...p,a])} style={{padding:"11px 18px",borderRadius:7,fontSize:12,fontWeight:600,border:`1px solid ${dn?sys.color:C.border}`,background:i===0&&!dn?sys.color:(dn?sys.color+"12":"transparent"),color:i===0&&!dn?"white":(dn?sys.color:C.muted),cursor:"pointer",fontFamily:C.font,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s"}}><span>{a}</span>{dn&&<span>✓</span>}</button>;
        })}
        <button onClick={()=>navigate("export")} style={{marginTop:8,padding:"11px 18px",borderRadius:7,fontSize:12,fontWeight:600,border:`1px solid ${C.tealBorder}`,background:C.tealBg,color:C.teal,cursor:"pointer",fontFamily:C.font}}>→ Export Hub</button>
      </div>
    </div>
  );
}

// ── Design Systems Bridge ──
function inferMode(files){
  const ns=files.map(f=>f.name.toLowerCase()),es=files.map(f=>f.name.split(".").pop()?.toLowerCase()||"");
  const hasSTL=es.some(e=>["stl","obj","ply"].includes(e)),hasDCM=es.some(e=>["dcm","zip"].includes(e));
  const hasPhoto=es.some(e=>["jpg","jpeg","png","heic"].includes(e));
  const hasSB=ns.some(n=>n.includes("scanbody")||n.includes("implant")),isFace=ns.some(n=>n.includes("face")||n.includes("smile")||n.includes("retract"));
  if(hasSTL&&(hasDCM||hasSB))return{mode:"implant-restoration",confidence:92,reason:"CBCT or scan body detected"};
  if(hasPhoto&&isFace&&!hasSTL)return{mode:"smile-mockup",confidence:90,reason:"Facial/retracted photos — no STL"};
  if(hasSTL&&!hasDCM)return{mode:"prep-restoration",confidence:85,reason:"Arch STL scans detected"};
  return null;
}
function pickSys(mode,files){
  const es=files.map(f=>f.name.split(".").pop()?.toLowerCase()||"");
  const hasDCM=es.some(e=>e==="dcm"),onlyPhotos=es.every(e=>["jpg","jpeg","png","heic"].includes(e));
  if(mode==="implant-restoration"||hasDCM)return{sys:"lab",reason:"Lab CAD — full implant library + DICOM"};
  if(mode==="smile-mockup"&&onlyPhotos)return{sys:"smile",reason:"Smile Design — photo-native DSD"};
  return{sys:"mill",reason:"Mill Connect — fastest in-office workflow"};
}

function DesignSystems({navigate}){
  const[step,setStep]=useState("mode");const[mode,setMode]=useState(null);const[sys,setSys]=useState(null);
  const[slots,setSlots]=useState([]);const[autoMode,setAutoMode]=useState(true);const[dragOver,setDragOver]=useState(false);
  const[autoDetect,setAutoDetect]=useState(null);const[countdown,setCountdown]=useState(null);const cdRef=useRef(null);
  const[progress,setProgress]=useState(0);const[jobStatus,setJobStatus]=useState("idle");
  const[restoType,setRestoType]=useState("crown");const[toothNums,setToothNums]=useState("8, 9");
  const[note,setNote]=useState("");const[doneTasks,setDoneTasks]=useState([]);
  const[jobId]=useState(`RES-${Date.now()}`);

  const runAutoDetect=useCallback((files)=>{
    const r=inferMode(files);if(!r)return;
    const ps=pickSys(r.mode,files);
    setAutoDetect({mode:r.mode,sys:ps.sys,modeReason:r.reason,sysReason:ps.reason,confidence:r.confidence});
    setMode(r.mode);setSys(ps.sys);
    const ns=BMODES[r.mode].slots.map(s=>({...s,uploaded:false,file:null}));
    const used=new Set();
    files.forEach(f=>{
      const ext=f.name.split(".").pop()?.toLowerCase()||"",name=f.name.toLowerCase();
      const slot=ns.find(s=>!used.has(s.id)&&!s.uploaded&&s.accept.includes(ext));
      if(slot){slot.file=f;slot.uploaded=true;used.add(slot.id);}
    });
    setSlots(ns);setStep("files");
  },[]);

  useEffect(()=>{
    if(!autoMode||step!=="files"||!mode||!sys)return;
    const req=slots.filter(s=>s.req),done=slots.filter(s=>s.req&&s.uploaded);
    if(req.length>0&&done.length>=req.length){
      setCountdown(5);let t=5;
      cdRef.current=setInterval(()=>{t-=1;if(t<=0){clearInterval(cdRef.current);setCountdown(null);send();}else setCountdown(t);},1000);
    }else{if(cdRef.current)clearInterval(cdRef.current);setCountdown(null);}
    return()=>{if(cdRef.current)clearInterval(cdRef.current);};
  },[slots,autoMode,step,mode,sys]);

  const uploadFile=(slotId,file)=>setSlots(prev=>prev.map(s=>s.id===slotId?{...s,file,uploaded:true}:s));
  const send=()=>{
    setStep("status");setJobStatus("uploading");setProgress(0);let p=0;
    const iv=setInterval(()=>{p+=Math.random()*15;if(p>=100){p=100;clearInterval(iv);setJobStatus("ready");}else setJobStatus(p>45?"processing":"uploading");setProgress(Math.min(Math.round(p),100));},350);
  };
  const reset=()=>{setStep("mode");setMode(null);setSys(null);setSlots([]);setAutoDetect(null);setCountdown(null);setProgress(0);setJobStatus("idle");setDoneTasks([]);};
  const uploaded=slots.filter(s=>s.uploaded).length;
  const reqDone=slots.filter(s=>s.req&&s.uploaded).length;
  const reqTotal=slots.filter(s=>s.req).length;
  const canSend=reqDone>=reqTotal&&sys;
  const steps=["mode","system","files","status"];const si=steps.indexOf(step);

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,height:44,display:"flex",alignItems:"center",padding:"0 24px",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {["Case Type","System","Files","Status"].map((s,i)=>{
            const done=i<si,active=i===si;
            return<div key={s} style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:10,fontFamily:C.mono,padding:"2px 8px",borderRadius:3,background:active?C.teal:done?C.tealBg:"transparent",color:active?"white":done?C.teal:C.light,border:`1px solid ${active?C.teal:done?C.tealBorder:C.border}`}}>{done?"✓ ":""}{s}</span>{i<3&&<span style={{fontSize:9,color:C.faint}}>›</span>}</div>;
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,fontWeight:700,color:autoMode?C.teal:C.muted,fontFamily:C.mono}}>AUTO</span><Toggle on={autoMode} onChange={setAutoMode}/></div>
          <Btn variant="ghost" onClick={reset} style={{padding:"5px 12px",fontSize:11}}>↺ Reset</Btn>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto"}}>
        {/* MODE */}
        {step==="mode"&&(
          <div style={{maxWidth:740,margin:"0 auto",padding:"36px 24px"}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:20,fontWeight:700,color:C.ink,marginBottom:6}}>What are you designing?</div>
              <div style={{fontSize:13,color:C.muted}}>{autoMode?"Drop files — auto mode detects and routes automatically.":"Choose case type."}</div>
            </div>
            {autoMode&&(
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const fs=Array.from(e.dataTransfer.files);if(fs.length)runAutoDetect(fs);}}
                style={{border:`2px dashed ${dragOver?C.teal:C.tealBorder}`,borderRadius:10,padding:"32px 24px",textAlign:"center",background:dragOver?C.tealBg:"transparent",marginBottom:24,transition:"all .2s",cursor:"pointer"}}>
                <div style={{fontSize:28,marginBottom:10}}>⚡</div>
                <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:5}}>Drop case files here</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>STL · Photos · DICOM — auto detects mode, picks system, sends when ready</div>
                <label style={{padding:"8px 18px",borderRadius:6,background:C.teal,color:"white",cursor:"pointer",fontSize:11,fontWeight:600}}>
                  Browse files<input type="file" multiple style={{display:"none"}} onChange={e=>{const fs=Array.from(e.target.files||[]);if(fs.length)runAutoDetect(fs);}}/>
                </label>
              </div>
            )}
            {autoMode&&<div style={{fontSize:10,color:C.muted,marginBottom:14,fontFamily:C.mono,letterSpacing:1}}>OR SELECT MANUALLY:</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {Object.entries(BMODES).map(([k,def])=>(
                <button key={k} onClick={()=>{setMode(k);setSlots(def.slots.map(s=>({...s,uploaded:false,file:null})));setStep("system");}} style={{textAlign:"left",padding:18,borderRadius:10,cursor:"pointer",border:`1px solid ${C.border}`,background:C.surface,fontFamily:C.font,boxShadow:C.sh,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background=C.tealBg;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
                  <div style={{fontSize:20,marginBottom:8}}>{def.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:4}}>{def.label}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{def.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* SYSTEM */}
        {step==="system"&&mode&&(
          <div style={{maxWidth:740,margin:"0 auto",padding:"36px 24px"}}>
            <button onClick={()=>setStep("mode")} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:20}}>← Back</button>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,marginBottom:20}}>{BMODES[mode].icon} {BMODES[mode].label} — Choose a system</div>
            {autoDetect&&<div style={{padding:"12px 16px",borderRadius:8,background:C.tealBg,border:`1px solid ${C.tealBorder}`,marginBottom:20,display:"flex",gap:10}}><span>⚡</span><div><div style={{fontSize:11,fontWeight:700,color:C.teal,marginBottom:3}}>Auto detected · {autoDetect.confidence}% confidence</div><div style={{fontSize:11,color:C.muted}}>Mode: {BMODES[autoDetect.mode]?.label} — {autoDetect.modeReason}</div><div style={{fontSize:11,color:C.muted}}>System: {BSYS[autoDetect.sys]?.label} — {autoDetect.sysReason}</div></div></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {Object.entries(BSYS).map(([k,def])=>{
                const sup=def.modes.includes(mode);
                return<button key={k} onClick={()=>{if(sup){setSys(k);setStep("files");}}} disabled={!sup} style={{textAlign:"left",padding:18,borderRadius:10,cursor:sup?"pointer":"not-allowed",border:`1px solid ${sup?def.color+"40":C.border}`,background:sup?def.colorBg:"#fafafa",opacity:sup?1:0.4,fontFamily:C.font,transition:"all .15s",boxShadow:sup?C.sh:"none"}}
                  onMouseEnter={e=>{if(sup){e.currentTarget.style.borderColor=def.color;e.currentTarget.style.transform="translateY(-1px)";}}} onMouseLeave={e=>{if(sup){e.currentTarget.style.borderColor=def.color+"40";e.currentTarget.style.transform="";}}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:18,color:def.color}}>{def.icon}</span><div><div style={{fontSize:12,fontWeight:700,color:C.ink}}>{def.label}</div><div style={{fontSize:9,color:sup?def.color:C.muted,fontFamily:C.mono}}>{sup?"SUPPORTED":"NOT AVAILABLE"}</div></div></div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:10}}>{def.desc}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{def.fmts.map(f=><span key={f} style={{padding:"2px 6px",borderRadius:3,fontSize:9,background:def.color+"15",color:def.color,fontFamily:C.mono}}>{f}</span>)}</div>
                </button>;
              })}
            </div>
          </div>
        )}
        {/* FILES */}
        {step==="files"&&mode&&sys&&(
          <div style={{maxWidth:840,margin:"0 auto",padding:"32px 24px"}}>
            <button onClick={()=>setStep("system")} style={{fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:16}}>← Back</button>
            {autoDetect&&<div style={{padding:"12px 16px",borderRadius:8,background:C.tealBg,border:`1px solid ${C.tealBorder}`,marginBottom:14,display:"flex",alignItems:"flex-start",gap:10}}><span>⚡</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:C.teal,marginBottom:3}}>Auto detected · {autoDetect.confidence}% confidence</div><div style={{fontSize:11,color:C.muted}}>{BMODES[autoDetect.mode]?.label} · {BSYS[autoDetect.sys]?.label} — {autoDetect.sysReason}</div></div><button onClick={()=>{setAutoDetect(null);setStep("mode");}} style={{fontSize:10,color:C.muted,background:"none",border:"none",cursor:"pointer"}}>Change</button></div>}
            {countdown!==null&&<div style={{padding:"10px 16px",borderRadius:6,background:"#fef3cd",border:"1px solid #f59e0b40",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,color:"#92400e"}}>⚡ Auto-sending in <strong>{countdown}s</strong> — all required files ready</span><button onClick={()=>{clearInterval(cdRef.current);setCountdown(null);}} style={{fontSize:11,color:"#92400e",background:"none",border:"1px solid #f59e0b",borderRadius:4,padding:"3px 10px",cursor:"pointer"}}>Cancel</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:14,fontWeight:700,color:C.ink}}>Upload case files</div><span style={{fontSize:11,color:C.muted}}>{uploaded}/{slots.length} · {reqDone}/{reqTotal} required</span></div>
                <div style={{height:3,background:C.surface3,borderRadius:2,marginBottom:16}}><div style={{height:"100%",borderRadius:2,background:C.teal,width:`${slots.length?(uploaded/slots.length)*100:0}%`,transition:"width .3s"}}/></div>
                {slots.map(slot=>(
                  <div key={slot.id} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${slot.uploaded?C.teal+"50":C.border}`,background:slot.uploaded?C.tealBg:C.surface,display:"flex",alignItems:"center",gap:12,marginBottom:8,transition:"all .2s"}}>
                    <div style={{width:28,height:28,borderRadius:6,background:slot.uploaded?C.teal:C.surface3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",flexShrink:0}}>{slot.uploaded?"✓":"↑"}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12,fontWeight:600,color:C.ink}}>{slot.label}</span>{slot.req&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:"#fef3cd",color:"#92400e",fontWeight:700}}>REQUIRED</span>}</div>
                      <div style={{fontSize:10,color:C.muted}}>{slot.uploaded&&slot.file?slot.file.name:slot.hint}</div>
                    </div>
                    <label style={{padding:"6px 12px",borderRadius:5,fontSize:10,fontWeight:600,border:`1px solid ${slot.uploaded?C.teal:C.border}`,color:slot.uploaded?C.teal:C.muted,cursor:"pointer",whiteSpace:"nowrap"}}>
                      {slot.uploaded?"Replace":"Upload"}<input type="file" accept={slot.accept} style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(slot.id,f);}}/>
                    </label>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{padding:14,borderRadius:8,border:`1px solid ${BSYS[sys].color}40`,background:BSYS[sys].colorBg}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,color:BSYS[sys].color}}>{BSYS[sys].icon}</span><div style={{fontSize:12,fontWeight:700,color:C.ink}}>{BSYS[sys].label}</div></div>
                </div>
                <div style={{padding:14,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:8}}>RESTORATION TYPE</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {(mode==="implant-restoration"?["implant-crown","implant-bridge","implant-bar","abutment"]:mode==="smile-mockup"?["smile-mockup","digital wax-up"]:["crown","veneer","onlay","inlay","bridge"]).map(r=>(
                      <button key={r} onClick={()=>setRestoType(r)} style={{padding:"4px 10px",borderRadius:4,fontSize:10,border:`1px solid ${restoType===r?C.teal:C.border}`,background:restoType===r?C.tealBg:"transparent",color:restoType===r?C.teal:C.muted,cursor:"pointer",fontFamily:C.font}}>{r}</button>
                    ))}
                  </div>
                </div>
                <div style={{padding:14,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:8}}>TOOTH NUMBERS</div>
                  <input value={toothNums} onChange={e=>setToothNums(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.border}`,fontSize:12,fontFamily:C.mono,color:C.ink,background:C.surface2,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div style={{padding:14,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:8}}>NOTES</div>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Shade, design notes, instructions…" style={{width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.border}`,fontSize:11,fontFamily:C.font,outline:"none",resize:"none",boxSizing:"border-box"}}/>
                </div>
                <Btn onClick={send} disabled={!canSend} style={{padding:13,width:"100%",fontSize:13}}>Send to {BSYS[sys].label} →</Btn>
                {!canSend&&reqDone<reqTotal&&<div style={{fontSize:10,color:C.muted,textAlign:"center"}}>Upload {reqTotal-reqDone} more required file{reqTotal-reqDone!==1?"s":""}</div>}
              </div>
            </div>
          </div>
        )}
        {/* STATUS */}
        {step==="status"&&sys&&(
          <div style={{maxWidth:500,margin:"48px auto",padding:"0 24px"}}>
            <div style={{padding:28,borderRadius:12,background:C.surface,border:`1px solid ${C.border}`,boxShadow:C.shMd}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22,color:BSYS[sys].color}}>{BSYS[sys].icon}</span><div><div style={{fontSize:14,fontWeight:700,color:C.ink}}>Sent to {BSYS[sys].label}</div><div style={{fontSize:10,fontFamily:C.mono,color:C.muted}}>{jobId}</div></div></div>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:jobStatus==="ready"?C.tealBg:"#fef3cd",color:jobStatus==="ready"?C.teal:"#92400e",border:`1px solid ${jobStatus==="ready"?C.tealBorder:"#f59e0b40"}`,fontFamily:C.mono,fontWeight:700}}>{jobStatus.toUpperCase()}</span>
              </div>
              <div style={{marginBottom:22}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.muted}}>{jobStatus==="uploading"?"Uploading…":jobStatus==="processing"?"Processing…":"Ready for review"}</span><span style={{fontSize:11,fontFamily:C.mono,fontWeight:700,color:C.ink}}>{progress}%</span></div>
                <div style={{height:6,background:C.surface3,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:jobStatus==="ready"?C.teal:BSYS[sys].color,width:`${progress}%`,transition:"width .4s"}}/></div>
              </div>
              <div style={{background:C.bg,borderRadius:8,padding:14,marginBottom:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Mode",BMODES[mode]?.label],["System",BSYS[sys].label],["Restoration",restoType],["Teeth",toothNums||"—"],["Files",`${uploaded} uploaded`],["Job",jobId.slice(-8)]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:9,color:C.light,letterSpacing:1,marginBottom:2,fontFamily:C.mono}}>{l.toUpperCase()}</div><div style={{fontSize:11,fontWeight:600,color:C.ink}}>{v}</div></div>
                ))}
              </div>
              {jobStatus==="ready"?(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {["Import design → Restora","Open in partner system ↗","Export to lab"].map((a,i)=>{
                    const dn=doneTasks.includes(a);
                    return<button key={a} onClick={()=>{setDoneTasks(p=>dn?p.filter(x=>x!==a):[...p,a]);if(a.includes("Export"))navigate("export");}} style={{padding:"11px 18px",borderRadius:7,fontSize:12,fontWeight:600,border:`1px solid ${i===0?C.teal:(dn?BSYS[sys].color:C.border)}`,background:i===0?C.teal:(dn?BSYS[sys].color+"12":"transparent"),color:i===0?"white":(dn?BSYS[sys].color:C.muted),cursor:"pointer",fontFamily:C.font,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{a}</span>{dn&&<span>✓</span>}</button>;
                  })}
                  <button onClick={reset} style={{padding:10,borderRadius:7,fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer"}}>↺ New case</button>
                </div>
              ):<div style={{textAlign:"center",fontSize:12,color:C.muted}}>Processing… results appear here when ready.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export Hub ──
function ExportHub({navigate}){
  const DESTS=[{id:"mill",label:"Mill Connect",fmt:"STL · DXD",color:C.blue},{id:"smile",label:"Smile Design",fmt:"STL · PNG overlay",color:C.amber},{id:"lab",label:"Lab CAD",fmt:"STL · Design file · PDF",color:C.purple},{id:"printer",label:"3D Printer",fmt:"STL · OBJ",color:C.teal},{id:"cloud",label:"Restora Cloud",fmt:"All · HIPAA",color:C.green},{id:"local",label:"Local Download",fmt:"ZIP",color:C.muted}];
  const FILES=["Upper arch scan.stl","Lower arch scan.stl","Crown design #8-9.stl","Lab RX.pdf","Pre-op photo.jpg"];
  const[selDest,setSelDest]=useState(new Set(["mill"]));const[selFiles,setSelFiles]=useState(new Set(FILES.slice(0,3)));
  const[note,setNote]=useState("");const[sent,setSent]=useState(false);
  const toggleD=id=>setSelDest(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleF=f=>setSelFiles(p=>{const n=new Set(p);n.has(f)?n.delete(f):n.add(f);return n;});
  return(
    <div style={{flex:1,overflow:"auto",background:C.bg}}>
      <div style={{maxWidth:880,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{fontSize:18,fontWeight:700,color:C.ink,marginBottom:20}}>Export Hub</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 260px",gap:16}}>
          <div>
            <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:10}}>CASE ASSETS</div>
            {FILES.map(f=>(
              <div key={f} onClick={()=>toggleF(f)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,background:selFiles.has(f)?C.tealBg:C.surface,border:`1px solid ${selFiles.has(f)?C.tealBorder:C.border}`,marginBottom:6,cursor:"pointer"}}>
                <div style={{width:15,height:15,borderRadius:3,border:`1px solid ${selFiles.has(f)?C.teal:C.border}`,background:selFiles.has(f)?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {selFiles.has(f)&&<span style={{fontSize:8,color:"white"}}>✓</span>}
                </div>
                <span style={{fontSize:11,color:C.ink}}>{f}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:10}}>DESTINATIONS</div>
            {DESTS.map(dest=>(
              <div key={dest.id} onClick={()=>toggleD(dest.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,background:selDest.has(dest.id)?dest.color+"10":C.surface,border:`1px solid ${selDest.has(dest.id)?dest.color+"50":C.border}`,marginBottom:6,cursor:"pointer"}}>
                <div style={{width:15,height:15,borderRadius:3,border:`1px solid ${selDest.has(dest.id)?dest.color:C.border}`,background:selDest.has(dest.id)?dest.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {selDest.has(dest.id)&&<span style={{fontSize:8,color:"white"}}>✓</span>}
                </div>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.ink}}>{dest.label}</div><div style={{fontSize:9,color:C.muted,fontFamily:C.mono}}>{dest.fmt}</div></div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{padding:14,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontFamily:C.mono,color:C.muted,letterSpacing:1,marginBottom:8}}>LAB NOTE</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} placeholder="Notes for the lab…" style={{width:"100%",padding:"7px 10px",borderRadius:5,border:`1px solid ${C.border}`,fontSize:11,fontFamily:C.font,outline:"none",resize:"none",boxSizing:"border-box"}}/>
            </div>
            {sent?(
              <div style={{padding:16,borderRadius:8,background:C.tealBg,border:`1px solid ${C.tealBorder}`,textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:6}}>✓</div>
                <div style={{fontSize:12,fontWeight:700,color:C.teal}}>Sent to {selDest.size} destination{selDest.size!==1?"s":""}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:3}}>{selFiles.size} files · {new Date().toLocaleTimeString()}</div>
                <button onClick={()=>setSent(false)} style={{marginTop:10,fontSize:11,color:C.teal,background:"none",border:"none",cursor:"pointer"}}>Send more</button>
              </div>
            ):(
              <button onClick={()=>setSent(true)} style={{padding:13,borderRadius:7,background:C.teal,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.font,boxShadow:`0 4px 12px ${C.tealGlow}`}}>
                Send {selFiles.size} file{selFiles.size!==1?"s":""} →
              </button>
            )}
            <button onClick={()=>navigate("design-systems")} style={{padding:10,borderRadius:7,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:C.font}}>← Design Systems</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stub screen ──
function Stub({icon,title,desc,actions=[],navigate}){
  const[done,setDone]=useState([]);
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}>
      <div style={{textAlign:"center",maxWidth:460,padding:"0 24px"}}>
        <div style={{fontSize:40,marginBottom:16}}>{icon}</div>
        <div style={{fontSize:20,fontWeight:700,color:C.ink,marginBottom:8}}>{title}</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:28}}>{desc}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {actions.map((a,i)=>{
            const dn=done.includes(i),nav=typeof a==="object"?a.nav:null,label=typeof a==="object"?a.label:a;
            return<button key={i} onClick={()=>{setDone(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i]);if(nav)navigate(nav);}} style={{padding:"11px 20px",borderRadius:7,fontSize:12,fontWeight:600,border:`1px solid ${dn?C.teal:C.border}`,background:i===0?C.teal:(dn?C.tealBg:"transparent"),color:i===0?"white":(dn?C.teal:C.muted),cursor:"pointer",fontFamily:C.font,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{label}</span>{dn&&<span>✓</span>}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

const DEMO=[
  {id:"p001",name:"Sarah Johnson",dob:"1985-03-12",selectedCaseType:"cosmetic-anterior",status:"active"},
  {id:"p002",name:"Michael Chen",dob:"1972-07-24",selectedCaseType:"full-implant",status:"active"},
  {id:"p003",name:"Emma Williams",dob:"1991-11-05",selectedCaseType:"smile-mockup",status:"active"},
];

export default function RestoraApp(){
  const[screen,setScreen]=useState("patient-hub");
  const[patients,setPatients]=useState(DEMO);
  const[selId,setSelId]=useState(null);
  const patient=patients.find(p=>p.id===selId)||DEMO[0];
  const navigate=useCallback(s=>setScreen(s),[]);
  const selectPatient=useCallback(id=>{setSelId(id);setScreen("dashboard");},[]);
  const addPatient=useCallback(p=>{setPatients(prev=>[p,...prev]);setSelId(p.id);setScreen("dashboard");},[]);
  const isHub=screen==="patient-hub";
  return(
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",background:C.bg,overflow:"hidden",fontFamily:C.font}}>
      <Header screen={screen} navigate={navigate} patient={patient}/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {!isHub&&<Sidebar screen={screen} navigate={navigate} patient={patient}/>}
        <main style={{flex:1,display:"flex",overflow:"hidden"}}>
          {screen==="patient-hub"&&<PatientHub navigate={navigate} patients={patients} addPatient={addPatient} selectPatient={selectPatient}/>}
          {screen==="dashboard"&&<Dashboard navigate={navigate} patient={patient}/>}
          {screen==="ai-design-guide"&&<AIDesignGuide navigate={navigate}/>}
          {screen==="design-systems"&&<DesignSystems navigate={navigate}/>}
          {screen==="export"&&<ExportHub navigate={navigate}/>}
          {screen==="restoration-design"&&<Stub icon="✏️" title="Restoration CAD" desc="3D crown, veneer, onlay, and inlay design workspace. Load prep scan, place tooth form, adjust margins and occlusion." actions={["Load prep scan","Place tooth form + shade","Check occlusion","Adjust emergence profile",{label:"Export to Design Systems →",nav:"design-systems"}]} navigate={navigate}/>}
          {screen==="smile-sim"&&<Stub icon="😊" title="Smile Simulation" desc="8-layer optical rendering with translucency, perikymata, mamelons, and specular highlights. Patient approval workflow." actions={["Upload patient photo","Adjust tooth form + shade","Generate before/after",{label:"Send to Smile Design →",nav:"design-systems"}]} navigate={navigate}/>}
          {screen==="crown-design"&&<Stub icon="🦷" title="Crown Design" desc="Full anatomy crown CAD with occlusal heatmap, margin detection, voice commands, and material minimums enforced." actions={["Load prep + antagonist","Select material + shade","Adjust anatomy zones","Run occlusion check",{label:"Export STL →",nav:"export"}]} navigate={navigate}/>}
          {screen==="patient-3d"&&<Stub icon="🖼" title="3D Patient View" desc="Composite face + IOS scan + design overlay + CBCT + nerve canal in a single WebGL viewer. 360° rotate." actions={["Build virtual patient","Toggle design overlay","HPC plane alignment",{label:"Share with patient",nav:null}]} navigate={navigate}/>}
          {screen==="implant-plan"&&<Stub icon="🔩" title="Implant + Guide" desc="Site analysis with bone quality classification, implant selection, 11 safety checks, drill protocol, and surgical guide generation." actions={["Load CBCT + scans","Place implant site","Select implant system","Run 11 safety checks",{label:"Export to Lab CAD →",nav:"design-systems"}]} navigate={navigate}/>}
          {screen==="ai-planning"&&<Stub icon="🤖" title="AI Planning" desc="Conversational clinical AI assistant. Ask about implant sizing, drill protocols, material selection, occlusal schemes, and more." actions={["Open AI assistant","Ask about implant sizing","Get drill protocol",{label:"Start AI Design Guide →",nav:"ai-design-guide"}]} navigate={navigate}/>}
          {screen==="full-arch"&&<Stub icon="🦴" title="Full Arch" desc="Complete arch prosthetic design — bar hybrid, monolithic zirconia, FP3 metal-resin, All-on-X, overdenture. AI command bar." actions={["Select prosthesis type","Configure implant positions","Design prosthetic space",{label:"Export to Lab CAD →",nav:"design-systems"}]} navigate={navigate}/>}
          {screen==="case-presentation"&&<Stub icon="🎬" title="Case Presentation" desc="3D presentation with before/after, design overlays, and CBCT for patient case acceptance. Patient view strips all clinical data." actions={["Build presentation","Add before/after comparison","Review chairside",{label:"Send for patient approval",nav:null}]} navigate={navigate}/>}
          {screen==="tooth-library"&&<Stub icon="📚" title="Tooth Library" desc="32-tooth database with multiple morphologies, mirrored pairs, and anatomy levels. Import directly into Crown Design workspace." actions={["Browse tooth forms","Filter by tooth type","Preview 3D anatomy",{label:"Import into Crown Design →",nav:"crown-design"}]} navigate={navigate}/>}
          {screen==="import"&&<Stub icon="⬆" title="Import Files" desc="Import IOS scans (STL), clinical photos, CBCT (DICOM), and lab files. Auto-assigns file type. Drag and drop supported." actions={["Import IOS scans (STL)","Import clinical photos","Import CBCT (DICOM)",{label:"Continue to Design Systems →",nav:"design-systems"}]} navigate={navigate}/>}
          {screen==="settings"&&<Stub icon="⚙️" title="Settings" desc="Practice setup, scanner connection, default materials, shade preferences, occlusal scheme defaults, and HIPAA configuration." actions={["Practice setup","Scanner connection","Default preferences","Notification settings"]} navigate={navigate}/>}
        </main>
      </div>
    </div>
  );
}
