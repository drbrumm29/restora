import { useState } from "react";
import { PATIENTS } from "./patient-cases.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", amberDim:"rgba(217,119,6,.12)",
  red:"#dc2626", green:"#059669", blue:"#0891b2", purple:"#7c3aed", purpleDim:"rgba(124,58,237,.12)",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// Prosthesis classifications
const TYPES = [
  {
    id: "FP1",
    label: "FP1 — Fixed, replaces crowns only",
    cost: "$$$$",
    when: "Minimal bone loss, ideal ridge, good lip support from native tissue",
    pros: ["Best esthetics", "Natural emergence", "Easiest hygiene"],
    cons: ["Requires excellent bone/soft tissue", "Not suitable for severe atrophy"],
    fit: "Ideal when <3mm vertical defect and patient has normal lip support"
  },
  {
    id: "FP2",
    label: "FP2 — Fixed, replaces crowns + some tissue",
    cost: "$$$",
    when: "Moderate ridge loss, high smile line not an issue",
    pros: ["Compromise between FP1 and FP3", "Works when pink shows"],
    cons: ["Long teeth look may be visible on smile", "Hygiene challenging at transitions"],
    fit: "Patient with ridge atrophy but low-to-medium smile line"
  },
  {
    id: "FP3",
    label: "FP3 — Fixed hybrid, replaces crowns + pink",
    cost: "$$",
    when: "Severe ridge atrophy, needs lip support restoration",
    pros: ["Restores vertical dimension", "Supports lip", "Most versatile"],
    cons: ["Requires restorative space (≥15mm)", "Speech adaptation", "Hygiene access critical"],
    fit: "Atrophic ridge with compromised lip support; patient can accept transition line"
  },
  {
    id: "RP4",
    label: "RP4 — Removable, implant-bar retained",
    cost: "$$",
    when: "Limited implants (2-4), wants removable cleaning",
    pros: ["Removable for cleaning", "Economic with fewer implants", "Tissue support shared"],
    cons: ["Bulkier", "Less retention than fixed", "Bar maintenance"],
    fit: "Budget/anatomy-limited; patient prefers removable option"
  },
  {
    id: "RP5",
    label: "RP5 — Overdenture, stud/locator retained",
    cost: "$",
    when: "2-4 implants, primarily tissue-supported",
    pros: ["Most economical implant option", "Simple fabrication", "Easy repair"],
    cons: ["Retention wears (annual attachment change)", "Still rocks on tissue", "Less secure"],
    fit: "Edentulous patient with limited budget but wanting implant retention"
  },
];

const WORKFLOWS = {
  "analog":    { label:"Analog conventional", time:"6-8 weeks", visits:"5-6" },
  "digital":   { label:"Full-digital (IOS + CAD)", time:"4-5 weeks", visits:"3-4" },
  "immediate": { label:"Immediate load (same-day)", time:"1 day + finals in 4mo", visits:"2 + 1" },
  "teethinaday": { label:"Teeth-in-a-day (all-on-X)", time:"Surgery → PMMA same day, zirconia at 4-6mo", visits:"2-3" },
};

export default function FullArchScreen({ navigate, activePatient }) {
  const [arch, setArch]       = useState("upper");
  const [implants, setImpl]   = useState(6);
  const [type, setType]       = useState("FP3");
  const [workflow, setWF]     = useState("teethinaday");
  const [ridge, setRidge]     = useState("atrophic");
  const [smileline, setSL]    = useState("medium");
  const [opposing, setOpp]    = useState("natural");
  const [material, setMat]    = useState("Zirconia monolithic");

  const selectedType = TYPES.find(t => t.id === type);
  const selectedWF = WORKFLOWS[workflow];

  // Provide recommendations based on inputs
  const recommendations = [];
  if (ridge === "atrophic" && (type === "FP1" || type === "FP2")) {
    recommendations.push({ level:"warning", text:`Atrophic ridge typically contraindicates ${type}. Consider FP3.` });
  }
  if (ridge === "ideal" && type === "FP3") {
    recommendations.push({ level:"info", text:"Ideal ridge can support FP1. FP3 still works but may overbuild." });
  }
  if (smileline === "high" && type === "FP2") {
    recommendations.push({ level:"warning", text:"High smile line + FP2 = visible transition. Consider FP1 or orthognathic/crown lengthening first." });
  }
  if (implants < 4 && arch === "upper" && type !== "RP5") {
    recommendations.push({ level:"warning", text:"Upper arch typically needs ≥4 implants for fixed. Consider RP4/RP5 or add implants." });
  }
  if (implants < 4 && arch === "lower" && (type === "FP1" || type === "FP2" || type === "FP3")) {
    recommendations.push({ level:"warning", text:"Lower arch fixed typically requires ≥4 implants. Consider more implants or removable option." });
  }
  if (opposing === "natural" && material === "Zirconia monolithic") {
    recommendations.push({ level:"info", text:"Monolithic zirconia opposing natural dentition may cause wear. Consider layered zirconia or polish carefully." });
  }
  if (workflow === "immediate" && implants < 4) {
    recommendations.push({ level:"warning", text:"Immediate load requires ≥4 splinted implants with primary stability >35 Ncm each." });
  }

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      {/* Header */}
      <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Full Arch Design</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
          {activePatient ? `${activePatient.name}` : "Prosthetic planning & material selection"}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px", display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
        {/* LEFT: main planning */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {/* Arch + implants + ridge */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>CASE PARAMETERS</div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16 }}>
              <Group label="ARCH">
                {["upper","lower","both"].map(a => (
                  <Pill key={a} active={arch===a} onClick={()=>setArch(a)}>{a.toUpperCase()}</Pill>
                ))}
              </Group>
              <Group label="IMPLANT COUNT">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <input type="range" min={2} max={8} value={implants} onChange={e=>setImpl(parseInt(e.target.value))}
                    style={{ flex:1, accentColor:C.teal }}/>
                  <span style={{ fontSize:18, fontFamily:C.font, color:C.teal, fontWeight:700, minWidth:30 }}>{implants}</span>
                </div>
              </Group>
              <Group label="RIDGE CONDITION">
                {[["ideal","Ideal"],["mild","Mild loss"],["moderate","Moderate"],["atrophic","Atrophic"]].map(([v,l]) => (
                  <Pill key={v} active={ridge===v} onClick={()=>setRidge(v)}>{l}</Pill>
                ))}
              </Group>
              <Group label="SMILE LINE">
                {[["low","Low"],["medium","Medium"],["high","High"]].map(([v,l]) => (
                  <Pill key={v} active={smileline===v} onClick={()=>setSL(v)}>{l}</Pill>
                ))}
              </Group>
              <Group label="OPPOSING">
                {[["natural","Natural dent."],["full-arch","Full arch"],["rpd","RPD/CD"]].map(([v,l]) => (
                  <Pill key={v} active={opposing===v} onClick={()=>setOpp(v)}>{l}</Pill>
                ))}
              </Group>
            </div>
          </div>

          {/* Prosthesis type selection */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.muted, letterSpacing:2, fontWeight:700 }}>PROSTHESIS TYPE (Misch classification)</div>
              <div style={{ fontSize:10, fontFamily:C.font, color:C.muted, letterSpacing:.5 }} title="Relative cost: $ = low · $$$$ = high">
                $ &nbsp;low&nbsp;&nbsp;→&nbsp;&nbsp;$$$$&nbsp; high
              </div>
            </div>
            <div style={{ display:"grid", gap:10 }}>
              {TYPES.map(t => {
                const active = t.id === type;
                return (
                  <button key={t.id} onClick={()=>setType(t.id)}
                    style={{ textAlign:"left", padding:"14px 16px", borderRadius:10, background:active?C.tealDim:C.surface2, border:`1px solid ${active?C.teal:C.border}`, cursor:"pointer", fontFamily:C.sans, color:C.ink, transition:"all .15s", position:"relative" }}>
                    {active && <div style={{ position:"absolute", top:12, right:14, width:8, height:8, borderRadius:"50%", background:C.teal }} />}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, paddingRight:active?16:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:active?C.teal:C.ink }}>{t.label}</div>
                      <span style={{ fontSize:11, color:C.muted, fontFamily:C.font, fontWeight:600, letterSpacing:1 }}>{t.cost}</span>
                    </div>
                    <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{t.when}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected type detail */}
          {selectedType && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>{selectedType.id} DETAIL</div>
              <div style={{ fontSize:13, color:C.ink, marginBottom:12, lineHeight:1.6 }}>{selectedType.fit}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:10 }}>
                <div>
                  <div style={{ fontSize:10, color:C.green, fontFamily:C.font, letterSpacing:1.5, fontWeight:700, marginBottom:6 }}>✓ PROS</div>
                  <ul style={{ margin:0, paddingLeft:16, fontSize:12, color:C.ink, lineHeight:1.7 }}>
                    {selectedType.pros.map((p,i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.amber, fontFamily:C.font, letterSpacing:1.5, fontWeight:700, marginBottom:6 }}>⚠ CONS</div>
                  <ul style={{ margin:0, paddingLeft:16, fontSize:12, color:C.ink, lineHeight:1.7 }}>
                    {selectedType.cons.map((p,i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Workflow + material */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>WORKFLOW & MATERIAL</div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.muted, fontFamily:C.font, letterSpacing:1.5, marginBottom:6 }}>WORKFLOW</div>
              <div style={{ display:"grid", gap:6 }}>
                {Object.entries(WORKFLOWS).map(([k, v]) => (
                  <button key={k} onClick={()=>setWF(k)}
                    style={{ textAlign:"left", padding:"12px 14px", borderRadius:7, background:workflow===k?C.purpleDim:C.surface2, border:`1.5px solid ${workflow===k?C.purple+"60":C.borderSoft}`, cursor:"pointer", fontFamily:C.sans }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:700, color:workflow===k?C.purple:C.ink }}>{v.label}</span>
                      <span style={{ fontSize:10, color:C.muted, fontFamily:C.font }}>{v.visits} visits</span>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>Timeline: {v.time}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:C.font, letterSpacing:1.5, marginBottom:6 }}>FINAL MATERIAL</div>
              <select value={material} onChange={e=>setMat(e.target.value)}
                style={{ width:"100%", padding:"12px 14px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none" }}>
                {[
                  "Zirconia monolithic",
                  "Layered zirconia (pink + white)",
                  "Titanium bar + zirconia",
                  "Titanium bar + PMMA (provisional)",
                  "Composite on Ti bar (PFX)",
                  "Cast metal + acrylic hybrid",
                ].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT: recommendations + summary */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18, position:"sticky", top:20 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>CASE SUMMARY</div>
            <SumRow k="Arch" v={arch.toUpperCase()}/>
            <SumRow k="Implants" v={implants}/>
            <SumRow k="Type" v={type}/>
            <SumRow k="Workflow" v={WORKFLOWS[workflow].label}/>
            <SumRow k="Material" v={material}/>
            <SumRow k="Ridge" v={ridge}/>
            <SumRow k="Smile line" v={smileline}/>

            <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${C.borderSoft}`, fontSize:11, color:C.muted, lineHeight:1.6 }}>
              <div><strong style={{ color:C.ink }}>Est. timeline:</strong> {WORKFLOWS[workflow].time}</div>
              <div><strong style={{ color:C.ink }}>Visits:</strong> {WORKFLOWS[workflow].visits}</div>
            </div>

            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={()=>navigate && navigate("implant-plan")} style={{ padding:"12px", borderRadius:8, background:C.surface2, color:C.ink, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>→ Plan Individual Implants</button>
              <button onClick={()=>navigate && navigate("export")} style={{ padding:"12px", borderRadius:8, background:C.teal, color:"white", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>→ Package Case for Lab</button>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18 }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.amber, letterSpacing:2, fontWeight:700, marginBottom:12 }}>⚠ RECOMMENDATIONS ({recommendations.length})</div>
              {recommendations.map((r, i) => (
                <div key={i} style={{ padding:"10px 12px", borderRadius:7, background:r.level==='warning'?C.amberDim:C.tealDim, border:`1px solid ${r.level==='warning'?C.amber+'40':C.tealBorder}`, fontSize:12, color:C.ink, lineHeight:1.55, marginBottom:8 }}>
                  {r.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, color:C.muted, fontFamily:C.font, letterSpacing:1.5, marginBottom:8, fontWeight:700 }}>{label}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ padding:"8px 14px", borderRadius:20, background:active?C.tealDim:C.surface2, border:`1.5px solid ${active?C.tealBorder:C.border}`, color:active?C.teal:C.muted, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans, whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

function SumRow({ k, v }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.borderSoft}`, fontSize:12 }}>
      <span style={{ color:C.muted }}>{k}</span>
      <span style={{ color:C.ink, fontWeight:600, textAlign:"right" }}>{v}</span>
    </div>
  );
}
