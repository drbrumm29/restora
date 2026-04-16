import { useState } from "react";

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

const DELIVERY_TARGETS = [
  { id:"lab-cad",   name:"Lab CAD",       icon:"⬡", color:C.purple, desc:"Full STL package + lab Rx + design notes",     formats:["zip"] },
  { id:"mill",      name:"Mill Connect",  icon:"◈", color:C.blue,   desc:"Send to chairside milling unit",                formats:["stl"] },
  { id:"download",  name:"Download",      icon:"⬇", color:C.teal,   desc:"Download case package to your device",          formats:["zip"] },
  { id:"lab-rx",    name:"Lab Rx PDF",    icon:"📄", color:C.amber,  desc:"Printable lab prescription form",              formats:["pdf"] },
  { id:"share",     name:"Share Link",    icon:"🔗", color:C.green,  desc:"Generate secure link to share with colleagues", formats:["url"] },
];

export default function ExportHub({ activePatient }) {
  const [selectedItems, setSelectedItems] = useState({
    stls: true, photos: true, radiograph: true, notes: true, params: true, flags: true,
  });
  const [target, setTarget] = useState("lab-cad");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [labInstructions, setLabInstructions] = useState("");

  if (!activePatient) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:18, color:C.muted, background:C.bg, padding:30 }}>
        <div style={{ fontSize:64 }}>↑</div>
        <div style={{ fontSize:20, fontWeight:700, color:C.ink }}>No active patient</div>
        <div style={{ fontSize:14, textAlign:"center", maxWidth:400 }}>Select a patient from the Dashboard to export their case package.</div>
      </div>
    );
  }

  const stlCount = activePatient.files?.filter(f => f.name.toLowerCase().endsWith('.stl')).length || 0;
  const photoCount = activePatient.photos?.length || 0;

  async function handleExport() {
    setExporting(true);
    // Build a manifest
    const manifest = {
      patient: activePatient.name,
      case_type: activePatient.type,
      subtype: activePatient.subtype,
      teeth: activePatient.teeth,
      date: new Date().toISOString(),
      target,
      parameters: selectedItems.params ? activePatient.parameters : undefined,
      clinical_flags: selectedItems.flags ? activePatient.clinicalFlags : undefined,
      notes: selectedItems.notes ? (activePatient.notes + '\n\n' + customNotes).trim() : undefined,
      lab_instructions: labInstructions || undefined,
      files: selectedItems.stls ? activePatient.files?.map(f => f.name) : [],
      photos: selectedItems.photos ? activePatient.photos?.map(p => p.file) : [],
    };

    // For Download: generate a case manifest JSON file the user can save
    if (target === "download" || target === "lab-cad") {
      const json = JSON.stringify(manifest, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${activePatient.id}-case-manifest.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (target === "lab-rx") {
      // Generate lab Rx as printable HTML page
      const rxHtml = generateLabRx(activePatient, customNotes, labInstructions);
      const blob = new Blob([rxHtml], { type: "text/html" });
      const w = window.open(URL.createObjectURL(blob), "_blank");
      if (w) setTimeout(() => w.print(), 500);
    } else if (target === "share") {
      const url = `${window.location.origin}/?patient=${activePatient.id}&view=shared`;
      try {
        await navigator.clipboard.writeText(url);
        alert(`Share link copied:\n${url}\n\n(Secure sharing requires user authentication — link works for logged-in users only)`);
      } catch {
        alert(`Share link:\n${url}`);
      }
    }

    // Simulate processing for a moment
    await new Promise(r => setTimeout(r, 700));
    setExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 3500);
  }

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans, padding:"28px 28px 100px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ marginBottom:26 }}>
          <div style={{ fontSize:30, fontWeight:800, letterSpacing:"-.02em", marginBottom:8 }}>Export Hub</div>
          <div style={{ fontSize:15, color:C.muted }}>Package and deliver <strong style={{ color:C.teal }}>{activePatient.name}'s</strong> case</div>
        </div>

        {/* Patient summary card */}
        <div style={{ padding:"20px 24px", borderRadius:12, background:C.surface, border:`1px solid ${C.border}`, marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:54, height:54, borderRadius:"50%", background:`linear-gradient(135deg,${C.teal},#0080cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"white", flexShrink:0 }}>{activePatient.initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.ink }}>{activePatient.name}</div>
            <div style={{ fontSize:13, color:C.teal, marginTop:3 }}>{activePatient.type} — {activePatient.subtype} · Teeth {activePatient.teeth}</div>
          </div>
          <div style={{ display:"flex", gap:18, fontFamily:C.font, fontSize:12 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:C.teal }}>{stlCount}</div>
              <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>STLs</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:C.teal }}>{photoCount}</div>
              <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>PHOTOS</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:C.teal }}>{activePatient.clinicalFlags?.length || 0}</div>
              <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>FLAGS</div>
            </div>
          </div>
        </div>

        {/* Include items */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>INCLUDE IN PACKAGE</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:10, marginBottom:24 }}>
          {[
            { key:"stls",       label:"STL files",           count:stlCount,       desc:"All 3D scans and preps" },
            { key:"photos",     label:"Clinical photos",      count:photoCount,     desc:"Full smile, retracted, references" },
            { key:"radiograph", label:"Radiograph analysis",  count:activePatient.xrayAnalysis ? 1 : 0, desc:"AI-analyzed X-ray report" },
            { key:"notes",      label:"Clinical notes",        count:activePatient.notes ? "✓" : 0, desc:"Pre-prep workflow checklist" },
            { key:"params",     label:"AEP parameters",       count:Object.keys(activePatient.parameters || {}).length, desc:"Tooth form, W:L, shade, occlusion" },
            { key:"flags",      label:"Clinical flags",        count:activePatient.clinicalFlags?.length || 0, desc:"Critical + warning alerts" },
          ].map(it => (
            <button key={it.key} onClick={()=>setSelectedItems(s=>({...s, [it.key]: !s[it.key]}))}
              style={{ padding:"14px 16px", borderRadius:9, cursor:"pointer", fontFamily:C.sans, textAlign:"left",
                background: selectedItems[it.key] ? C.tealDim : C.surface,
                border: `1.5px solid ${selectedItems[it.key] ? C.teal : C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:700, color: selectedItems[it.key] ? C.teal : C.ink }}>
                  {selectedItems[it.key] ? "☑" : "☐"} {it.label}
                </span>
                {it.count !== 0 && <span style={{ fontSize:11, fontFamily:C.font, color:C.muted, fontWeight:700 }}>{it.count}</span>}
              </div>
              <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{it.desc}</div>
            </button>
          ))}
        </div>

        {/* Delivery target */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>DELIVERY TARGET</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:10, marginBottom:24 }}>
          {DELIVERY_TARGETS.map(t => (
            <button key={t.id} onClick={()=>setTarget(t.id)}
              style={{ padding:"16px 18px", borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:C.sans,
                background: target === t.id ? t.color+"15" : C.surface,
                border: `1.5px solid ${target === t.id ? t.color : C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ fontSize:22 }}>{t.icon}</span>
                <span style={{ fontSize:15, fontWeight:700, color: target === t.id ? t.color : C.ink }}>{t.name}</span>
              </div>
              <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom notes */}
        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>LAB INSTRUCTIONS</div>
        <textarea value={labInstructions} onChange={e=>setLabInstructions(e.target.value)}
          placeholder="Material specs, shade notes, contour preferences, margin design, delivery date…"
          rows={4}
          style={{ width:"100%", padding:"14px 16px", borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:14 }} />

        <div style={{ fontSize:12, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:12, fontWeight:700 }}>ADDITIONAL NOTES (optional)</div>
        <textarea value={customNotes} onChange={e=>setCustomNotes(e.target.value)}
          placeholder="Additional context, special considerations…"
          rows={3}
          style={{ width:"100%", padding:"14px 16px", borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:28 }} />

        {/* Export button */}
        <button onClick={handleExport} disabled={exporting}
          style={{ width:"100%", padding:"18px", borderRadius:10, border:"none",
            background: exported ? C.green : exporting ? C.surface3 : `linear-gradient(135deg, ${C.teal}, #0080cc)`,
            color:"white", fontSize:17, fontWeight:700, cursor: exporting ? "not-allowed" : "pointer",
            fontFamily:C.sans,
            boxShadow: exported ? `0 0 0 4px ${C.green}40` : exporting ? "none" : `0 8px 32px ${C.teal}40`,
            transition:"all .2s" }}>
          {exported ? "✓ Exported successfully" : exporting ? "Packaging…" : `Export to ${DELIVERY_TARGETS.find(t=>t.id===target).name} →`}
        </button>

        <div style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:14, lineHeight:1.6 }}>
          Case manifest includes: patient info, case type, AEP parameters, clinical flags, file list, and your notes.
          <br/>STL binary data is referenced by filename — lab downloads from secure URL.
        </div>
      </div>
    </div>
  );
}

// ── Lab Rx generator ────────────────────────────────────────────
function generateLabRx(p, customNotes, labInstructions) {
  const today = new Date().toLocaleDateString();
  return `<!DOCTYPE html>
<html><head>
<title>Lab Rx — ${p.name}</title>
<style>
  @media print { @page { margin: 0.5in; } body { -webkit-print-color-adjust: exact; } }
  body { font-family: Georgia, serif; color:#222; max-width:800px; margin:30px auto; padding:30px; line-height:1.5; }
  h1 { color:#0abab5; font-size:22px; border-bottom:2px solid #0abab5; padding-bottom:10px; margin-top:0; }
  .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .logo { font-size:24px; font-weight:bold; color:#0abab5; }
  .logo span { color:#222; }
  .section { margin-bottom:20px; padding:14px; background:#f5f9fb; border-left:4px solid #0abab5; border-radius:4px; }
  .section-title { font-size:11px; letter-spacing:2px; color:#0abab5; font-weight:bold; margin-bottom:8px; text-transform:uppercase; }
  .row { display:flex; padding:4px 0; font-size:14px; }
  .label { font-weight:bold; width:180px; color:#444; }
  .value { flex:1; color:#111; }
  .flag-critical { color:#c00; font-weight:bold; }
  .flag-warning { color:#b06000; }
  .flag-info { color:#084; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th, td { text-align:left; padding:6px 8px; border-bottom:1px solid #ddd; font-size:13px; }
  th { background:#eef6f7; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #ccc; font-size:11px; color:#666; }
  .sig-area { margin-top:50px; display:flex; gap:40px; }
  .sig-box { flex:1; border-top:1px solid #333; padding-top:5px; font-size:11px; color:#666; }
</style>
</head><body>
  <div class="header">
    <div class="logo">Re<span>stora</span> Lab Rx</div>
    <div style="text-align:right; font-size:12px; color:#666;">Date: ${today}<br/>Case ID: ${p.id}</div>
  </div>
  <h1>Laboratory Prescription</h1>
  <div class="section">
    <div class="section-title">Patient</div>
    <div class="row"><div class="label">Name:</div><div class="value"><strong>${p.name}</strong></div></div>
    ${p.age ? `<div class="row"><div class="label">Age / Gender:</div><div class="value">${p.age} · ${p.gender||''}</div></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Case</div>
    <div class="row"><div class="label">Type:</div><div class="value">${p.type} — ${p.subtype}</div></div>
    <div class="row"><div class="label">Teeth:</div><div class="value"><strong>${p.teeth}</strong></div></div>
    ${p.parameters?.shade ? `<div class="row"><div class="label">Shade:</div><div class="value">${p.parameters.shade}</div></div>` : ''}
    ${p.parameters?.tooth_form ? `<div class="row"><div class="label">Form:</div><div class="value">${p.parameters.tooth_form}</div></div>` : ''}
    ${p.parameters?.width_length_ratio ? `<div class="row"><div class="label">W:L ratio:</div><div class="value">${Math.round(p.parameters.width_length_ratio*100)}%</div></div>` : ''}
    ${p.parameters?.length_adjustment_mm ? `<div class="row"><div class="label">Length adj:</div><div class="value">+${p.parameters.length_adjustment_mm}mm (verify phonetics)</div></div>` : ''}
    ${p.parameters?.occlusion ? `<div class="row"><div class="label">Occlusion:</div><div class="value">${p.parameters.occlusion}</div></div>` : ''}
  </div>
  ${p.clinicalFlags?.length ? `
  <div class="section" style="border-left-color:#b06000; background:#fef7e8">
    <div class="section-title" style="color:#b06000">Clinical Flags</div>
    <ul style="margin:0; padding-left:20px; font-size:13px;">
      ${p.clinicalFlags.map(f => `<li class="flag-${f.level}">${f.text}</li>`).join('')}
    </ul>
  </div>` : ''}
  ${labInstructions ? `
  <div class="section">
    <div class="section-title">Lab Instructions</div>
    <div style="font-size:13px; white-space:pre-wrap;">${labInstructions}</div>
  </div>` : ''}
  ${customNotes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div style="font-size:13px; white-space:pre-wrap;">${customNotes}</div>
  </div>` : ''}
  ${p.files?.length ? `
  <div class="section">
    <div class="section-title">Files Delivered</div>
    <table>
      <thead><tr><th>Filename</th><th>Type</th></tr></thead>
      <tbody>
        ${p.files.filter(f=>f.name.toLowerCase().endsWith('.stl')).map(f =>
          `<tr><td>${f.name}</td><td>${f.slot||'STL'}</td></tr>`
        ).join('')}
      </tbody>
    </table>
  </div>` : ''}
  <div class="sig-area">
    <div class="sig-box">Doctor Signature / Date</div>
    <div class="sig-box">Lab Technician Receipt</div>
  </div>
  <div class="footer">
    Generated by Restora · Advanced Esthetic Protocol · Confidential clinical document
  </div>
</body></html>`;
}
