import { useState } from "react";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.15)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669",
  purple:"#7c3aed", blue:"#0891b2", gold:"#b8860b",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

const PROSTHESIS_TYPES = {
  "fp1": {
    name: "FP1 — Fixed Prosthesis, Natural Emergence",
    color: C.teal,
    description: "Replaces natural crowns only — looks like natural teeth emerging from gingiva",
    indications: ["Minimal bone/soft tissue loss", "High smile line", "Esthetic zone cases", "Young patients"],
    challenges: ["Requires adequate bone volume", "Tissue management critical", "Higher cost per unit"],
    implants: "Typically 6-8 implants per arch",
    material: "Zirconia with ceramic layering, or monolithic zirconia",
  },
  "fp2": {
    name: "FP2 — Fixed Prosthesis, Elongated Teeth",
    color: C.blue,
    description: "Replaces crowns + some tissue — teeth appear elongated beyond natural CEJ",
    indications: ["Moderate bone loss", "Low-to-medium smile line", "Cost-conscious", "Posterior cases"],
    challenges: ["Hygiene access", "Can look unnatural on high smile line", "Requires good vertical dimension"],
    implants: "4-6 implants per arch",
    material: "Titanium bar + zirconia, or monolithic zirconia",
  },
  "fp3": {
    name: "FP3 — Fixed Prosthesis with Pink",
    color: C.purple,
    description: "Replaces teeth + significant gingival tissue using pink acrylic or ceramic",
    indications: ["Significant bone/tissue loss", "Low smile line preferred", "Budget constraints", "All-on-X conversion"],
    challenges: ["Visible transition line risk", "Pink ceramic matching", "Hygiene critical"],
    implants: "4-6 implants per arch (common: All-on-4)",
    material: "Titanium bar + acrylic/composite teeth with pink gingiva",
  },
};

const WORKFLOW_STEPS = [
  { num:1, title:"Diagnostic Records",  items:["CBCT scan", "Intraoral scan (upper + lower)", "Facial photos", "Bite registration"] },
  { num:2, title:"Treatment Planning",  items:["Determine prosthesis type", "Implant number/position", "Smile design + wax-up", "Surgical guide design"] },
  { num:3, title:"Surgical Phase",       items:["Implant placement (guided)", "Immediate temporary (if applicable)", "Healing phase 3-6mo", "Soft tissue management"] },
  { num:4, title:"Final Prosthesis",    items:["Final impressions/scans", "Try-in + verification jig", "Bite registration", "Final delivery + adjustment"] },
];

export default function FullArchScreen({ activePatient }) {
  const [selectedType, setSelectedType] = useState("fp1");
  const [arch, setArch] = useState("upper");  // upper | lower | both
  const [implantCount, setImplantCount] = useState(6);
  const [material, setMaterial] = useState("monolithic-zirconia");

  const current = PROSTHESIS_TYPES[selectedType];

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans, padding:"28px 24px 100px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:30, fontWeight:800, letterSpacing:"-.02em", marginBottom:8 }}>Full Arch Planning</div>
          <div style={{ fontSize:15, color:C.muted }}>
            {activePatient ? `${activePatient.name} · ` : ""}Implant-supported full-arch prosthesis design workflow
          </div>
        </div>

        {/* Prosthesis type selection */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>PROSTHESIS CLASSIFICATION</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:12, marginBottom:28 }}>
          {Object.entries(PROSTHESIS_TYPES).map(([k, p]) => (
            <button key={k} onClick={()=>setSelectedType(k)}
              style={{ padding:"20px 22px", borderRadius:12, cursor:"pointer", textAlign:"left", fontFamily:C.sans,
                background: selectedType === k ? p.color+"15" : C.surface,
                border: `1.5px solid ${selectedType === k ? p.color : C.border}` }}>
              <div style={{ fontSize:20, fontWeight:800, color: selectedType === k ? p.color : C.ink, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{k.toUpperCase()}</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:8, lineHeight:1.4 }}>{p.name.split(' — ')[1]}</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{p.description}</div>
            </button>
          ))}
        </div>

        {/* Selected type details */}
        <div style={{ padding:"24px 28px", borderRadius:12, background:C.surface, border:`1.5px solid ${current.color}40`, marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:800, color:current.color, marginBottom:14 }}>{current.name}</div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:20, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, fontFamily:C.font, color:current.color, letterSpacing:2, marginBottom:8, fontWeight:700 }}>INDICATIONS</div>
              <ul style={{ margin:0, paddingLeft:20, fontSize:13, color:C.ink, lineHeight:1.7 }}>
                {current.indications.map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.amber, letterSpacing:2, marginBottom:8, fontWeight:700 }}>CHALLENGES</div>
              <ul style={{ margin:0, paddingLeft:20, fontSize:13, color:C.ink, lineHeight:1.7 }}>
                {current.challenges.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"14px 18px", background:C.surface2, borderRadius:8 }}>
            <div>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:1, fontFamily:C.font, marginBottom:4, fontWeight:700 }}>IMPLANTS</div>
              <div style={{ fontSize:14, color:C.ink }}>{current.implants}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:1, fontFamily:C.font, marginBottom:4, fontWeight:700 }}>MATERIAL</div>
              <div style={{ fontSize:14, color:C.ink }}>{current.material}</div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>CONFIGURATION</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:14, marginBottom:28 }}>
          <div style={{ padding:"16px 18px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontFamily:C.font, letterSpacing:1 }}>ARCH</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {["upper","lower","both"].map(a => (
                <button key={a} onClick={()=>setArch(a)}
                  style={{ padding:"9px 4px", borderRadius:6, border:`1px solid ${arch===a?C.teal:C.border}`, background:arch===a?C.tealDim:"transparent", color:arch===a?C.teal:C.muted, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans, textTransform:"capitalize" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:"16px 18px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontFamily:C.font, letterSpacing:1 }}>IMPLANTS PER ARCH</div>
            <div style={{ display:"flex", gap:6 }}>
              {[4,5,6,8].map(n => (
                <button key={n} onClick={()=>setImplantCount(n)}
                  style={{ flex:1, padding:"9px 4px", borderRadius:6, border:`1px solid ${implantCount===n?C.teal:C.border}`, background:implantCount===n?C.tealDim:"transparent", color:implantCount===n?C.teal:C.muted, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:"16px 18px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontFamily:C.font, letterSpacing:1 }}>MATERIAL</div>
            <select value={material} onChange={e=>setMaterial(e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:12, fontFamily:C.sans, outline:"none" }}>
              <option value="monolithic-zirconia">Monolithic Zirconia</option>
              <option value="layered-zirconia">Layered Zirconia</option>
              <option value="titanium-acrylic">Ti Bar + Acrylic</option>
              <option value="pekkton">PEKK Hybrid</option>
              <option value="emax">Lithium Disilicate</option>
            </select>
          </div>
        </div>

        {/* Workflow */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>CLINICAL WORKFLOW</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:12, marginBottom:28 }}>
          {WORKFLOW_STEPS.map(s => (
            <div key={s.num} style={{ padding:"18px 20px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:C.tealDim, border:`1.5px solid ${C.teal}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.teal, fontFamily:C.font }}>{s.num}</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{s.title}</div>
              </div>
              <ul style={{ margin:0, paddingLeft:18, fontSize:12, color:C.muted, lineHeight:1.8 }}>
                {s.items.map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Summary + CTA */}
        <div style={{ padding:"24px 28px", borderRadius:12, background:`linear-gradient(135deg, ${C.teal}15, ${current.color}15)`, border:`1.5px solid ${C.tealBorder}`, marginBottom:20 }}>
          <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>YOUR PLAN</div>
          <div style={{ fontSize:16, color:C.ink, lineHeight:1.7, marginBottom:14 }}>
            <strong style={{ color:C.teal }}>{selectedType.toUpperCase()}</strong> prosthesis · <strong>{implantCount} implants</strong> per arch · <strong>{arch}</strong> arch{arch==="both"?"es":""} · <strong>{material.replace(/-/g,' ')}</strong>
          </div>
          <button onClick={()=>alert(`Full arch plan saved.\n\n${selectedType.toUpperCase()} · ${arch} arch · ${implantCount} implants · ${material}\n\nNext step: proceed to Implant Planning for fixture positioning.`)}
            style={{ padding:"14px 28px", borderRadius:8, border:"none", background:C.teal, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>
            Save treatment plan →
          </button>
        </div>
      </div>
    </div>
  );
}
