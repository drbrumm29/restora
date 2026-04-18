import { useState, useEffect } from "react";
import { PATIENTS } from "./patient-cases.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", amberDim:"rgba(217,119,6,.08)", red:"#dc2626", green:"#059669", blue:"#0891b2", purple:"#7c3aed",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// Minimal ZIP writer — no external deps. Stored (no compression).
// Writes valid PKZIP files the browser and lab software can read.
function createZip(files) {
  // files: [{name, data: Uint8Array}]
  const encoder = new TextEncoder();
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  function crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = crc ^ data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & (-(crc & 1)));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  files.forEach(f => {
    const nameBytes = encoder.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length + size);
    const ldv = new DataView(local.buffer);
    ldv.setUint32(0, 0x04034b50, true);   // signature
    ldv.setUint16(4, 20, true);            // version
    ldv.setUint16(6, 0, true);             // flags
    ldv.setUint16(8, 0, true);             // compression (stored)
    ldv.setUint16(10, 0, true);            // mod time
    ldv.setUint16(12, 0, true);            // mod date
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, size, true);         // compressed size
    ldv.setUint32(22, size, true);         // uncompressed size
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);            // extra field length
    local.set(nameBytes, 30);
    local.set(f.data, 30 + nameBytes.length);
    localHeaders.push({ data: local, offset, nameBytes, crc, size });
    offset += local.length;
  });

  // Central directory
  localHeaders.forEach(h => {
    const central = new Uint8Array(46 + h.nameBytes.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, 0x02014b50, true);    // signature
    cdv.setUint16(4, 20, true);             // version made by
    cdv.setUint16(6, 20, true);             // version needed
    cdv.setUint16(8, 0, true);              // flags
    cdv.setUint16(10, 0, true);             // compression
    cdv.setUint16(12, 0, true);             // mod time
    cdv.setUint16(14, 0, true);             // mod date
    cdv.setUint32(16, h.crc, true);
    cdv.setUint32(20, h.size, true);
    cdv.setUint32(24, h.size, true);
    cdv.setUint16(28, h.nameBytes.length, true);
    cdv.setUint16(30, 0, true);             // extra field
    cdv.setUint16(32, 0, true);             // comment
    cdv.setUint16(34, 0, true);             // disk number
    cdv.setUint16(36, 0, true);             // internal attrs
    cdv.setUint32(38, 0, true);             // external attrs
    cdv.setUint32(42, h.offset, true);      // offset of local header
    central.set(h.nameBytes, 46);
    centralHeaders.push(central);
  });

  const cdSize = centralHeaders.reduce((s,c) => s + c.length, 0);
  const cdOffset = offset;
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);                // disk number
  edv.setUint16(6, 0, true);                // disk with CD start
  edv.setUint16(8, files.length, true);     // entries on this disk
  edv.setUint16(10, files.length, true);    // total entries
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, cdOffset, true);
  edv.setUint16(20, 0, true);               // comment length

  // Concatenate
  const total = cdOffset + cdSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  localHeaders.forEach(h => { out.set(h.data, p); p += h.data.length; });
  centralHeaders.forEach(c => { out.set(c, p); p += c.length; });
  out.set(eocd, p);
  return out;
}

export default function ExportHub({ navigate, activePatient }) {
  const patient = activePatient || PATIENTS[0];

  const [includeSTL, setSTL]    = useState(true);
  const [includePhotos, setPhotos] = useState(true);
  const [includeRx, setRx]      = useState(true);
  const [includeReport, setReport] = useState(true);
  const [clinicalNotes, setNotes] = useState("");

  const [building, setBuilding] = useState(false);
  const [status, setStatus]     = useState("");
  const [error, setError]       = useState(null);

  // Lab routing
  const [labName, setLabName]   = useState(patient?.system === 'lab' ? "Brumm Dental Lab" : "Mill Connect");
  const [dueDate, setDueDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [material, setMaterial] = useState("eMax LT");

  useEffect(() => {
    setNotes(patient?.notes || "");
  }, [patient?.id]);

  function buildRxPDF() {
    // A minimal printable Rx as a plain-text-styled HTML blob saved as .pdf.html
    const rx = `RESTORA LAB PRESCRIPTION (Rx)
═══════════════════════════════════════════

Patient: ${patient.name}
Patient ID: ${patient.id}
Case: ${patient.caseType || 'Restoration'}
Tooth/Teeth: ${patient.teeth || '—'}

Lab: ${labName}
Due: ${dueDate}

─── MATERIAL ───
${material}

─── DESIGN PARAMETERS (AEP) ───
${patient.parameters ? Object.entries(patient.parameters).map(([k,v]) => `  ${k.padEnd(24)}: ${v}`).join('\n') : '  (none specified)'}

─── CLINICAL NOTES ───
${clinicalNotes || '(none)'}

─── CLINICAL FLAGS ───
${(patient.clinicalFlags || []).map((f,i) => `  ${i+1}. [${f.level || 'note'}] ${f.text || f}`).join('\n') || '  None'}

─── INCLUDED FILES ───
${patient.files?.map(f => `  • ${f.name} [${f.slot}]`).join('\n') || '  None'}

═══════════════════════════════════════════
Generated: ${new Date().toLocaleString()}
Restora Dental CAD Platform
`;
    return new TextEncoder().encode(rx);
  }

  function buildSummaryReport() {
    const json = {
      patient: {
        id: patient.id,
        name: patient.name,
        caseType: patient.caseType,
        teeth: patient.teeth,
      },
      lab: {
        name: labName,
        due: dueDate,
        material,
      },
      aep_parameters: patient.parameters || {},
      clinical_flags: patient.clinicalFlags || [],
      clinical_notes: clinicalNotes,
      files: patient.files || [],
      generated: new Date().toISOString(),
      platform: "Restora Dental CAD",
    };
    return new TextEncoder().encode(JSON.stringify(json, null, 2));
  }

  async function fetchAsBytes(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${url}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function buildAndDownload() {
    if (!patient) return;
    setBuilding(true); setError(null);
    const files = [];
    try {
      setStatus("Packaging STL files...");
      if (includeSTL && patient.files?.length) {
        for (const f of patient.files) {
          try {
            const data = await fetchAsBytes(`/patient-cases/${f.name}`);
            files.push({ name: `stl/${f.name}`, data });
          } catch (e) { console.warn('Skip', f.name, e); }
        }
      }

      setStatus("Packaging photos...");
      if (includePhotos && patient.photos?.length) {
        for (const p of patient.photos) {
          try {
            const data = await fetchAsBytes(`/patient-cases/${p.file}`);
            files.push({ name: `photos/${p.file}`, data });
          } catch (e) { console.warn('Skip', p.file, e); }
        }
      }

      if (includeRx) {
        setStatus("Writing Rx...");
        files.push({ name: `${patient.id}-Rx.txt`, data: buildRxPDF() });
      }

      if (includeReport) {
        setStatus("Writing summary report...");
        files.push({ name: `${patient.id}-report.json`, data: buildSummaryReport() });
      }

      if (files.length === 0) {
        throw new Error("No content selected to export.");
      }

      setStatus("Building zip archive...");
      const zip = createZip(files);

      const blob = new Blob([zip], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patient.id}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(`✓ Exported ${files.length} files`);
    } catch (e) {
      setError(e.message);
      setStatus("");
    }
    setBuilding(false);
  }

  function sendToLab() {
    // Generate a mailto: with Rx text in body
    const rxText = new TextDecoder().decode(buildRxPDF());
    const subject = `Rx · ${patient.name} · ${patient.caseType || 'Case'} · Due ${dueDate}`;
    const body = `Hi ${labName},

Please find the case details below. I will upload the zip package via your portal.

${rxText}

Thanks,
Restora`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const fileCount = (includeSTL ? patient?.files?.length || 0 : 0) +
                    (includePhotos ? patient?.photos?.length || 0 : 0) +
                    (includeRx ? 1 : 0) +
                    (includeReport ? 1 : 0);

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans }}>
      {/* Header */}
      <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:28, fontWeight:700, letterSpacing:"-.02em" }}>Export</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
          {patient ? `${patient.name} · ${patient.caseType || 'Case'}` : "No patient selected"}
        </div>
      </div>

      <div style={{ maxWidth:980, margin:"0 auto", padding:"26px 24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Contents card */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>PACKAGE CONTENTS</div>

          <CheckRow checked={includeSTL} onChange={setSTL}
            label={`STL files (${patient?.files?.length || 0})`}
            desc="All scans, preps, bite reg, scanbodies"/>
          <CheckRow checked={includePhotos} onChange={setPhotos}
            label={`Patient photos (${patient?.photos?.length || 0})`}
            desc="Smile, retracted, references"/>
          <CheckRow checked={includeRx} onChange={setRx}
            label="Lab Rx prescription (.txt)"
            desc="AEP params, clinical flags, material spec"/>
          <CheckRow checked={includeReport} onChange={setReport}
            label="Summary report (.json)"
            desc="Machine-readable case metadata"/>

          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.borderSoft}`, fontSize:12, color:C.muted }}>
            {fileCount} files will be bundled into a zip archive
          </div>
        </div>

        {/* Lab routing card */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>LAB ROUTING</div>

          <Field label="LAB / SERVICE">
            <input value={labName} onChange={e=>setLabName(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", boxSizing:"border-box" }}/>
          </Field>

          <Field label="DUE DATE">
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", boxSizing:"border-box", colorScheme:"dark" }}/>
          </Field>

          <Field label="MATERIAL">
            <select value={material} onChange={e=>setMaterial(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", boxSizing:"border-box" }}>
              {["eMax LT","eMax MT","eMax HT","Zirconia MT","Zirconia HT","Lithium disilicate pressed","Feldspathic porcelain","Composite direct","PMMA provisional"].map(x=><option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>

        {/* Clinical notes */}
        <div style={{ gridColumn:"1 / -1", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:14 }}>CLINICAL NOTES</div>
          <textarea value={clinicalNotes} onChange={e=>setNotes(e.target.value)}
            placeholder="Shade notes, occlusal priorities, prep condition, contacts preference, etc."
            style={{ width:"100%", minHeight:120, padding:"12px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
        </div>

        {/* Case summary */}
        {patient && (
          <div style={{ gridColumn:"1 / -1", background:C.surface2, border:`1px solid ${C.borderSoft}`, borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:12 }}>CASE SUMMARY</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12, fontSize:13 }}>
              <SumItem k="Patient" v={patient.name}/>
              <SumItem k="Case type" v={patient.caseType || '—'}/>
              <SumItem k="Teeth" v={patient.teeth || '—'}/>
              <SumItem k="Route" v={patient.route || '—'}/>
              <SumItem k="Status" v={patient.status || '—'}/>
              <SumItem k="Files" v={`${patient.files?.length || 0} STL`}/>
            </div>

            {patient.clinicalFlags?.length > 0 && (
              <div style={{ marginTop:16, padding:12, borderRadius:8, background:C.amberDim, border:`1px solid ${C.amber}40`, fontSize:12 }}>
                <div style={{ fontSize:10, color:C.amber, fontFamily:C.font, letterSpacing:1.5, fontWeight:700, marginBottom:6 }}>⚠ CLINICAL FLAGS ({patient.clinicalFlags.length})</div>
                <ul style={{ margin:0, paddingLeft:18, color:C.ink, lineHeight:1.7 }}>
                  {patient.clinicalFlags.map((f,i) => (
                    <li key={i}>
                      <span style={{ color: f.level === 'critical' ? C.red : f.level === 'warning' ? C.amber : C.muted, fontWeight:700, marginRight:6, textTransform:'uppercase', fontSize:10, letterSpacing:1, fontFamily:C.font }}>{f.level || 'note'}</span>
                      {f.text || String(f)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ gridColumn:"1 / -1", display:"flex", gap:12, flexWrap:"wrap" }}>
          <button onClick={buildAndDownload} disabled={building || !patient || fileCount === 0}
            style={{ flex:"2 1 300px", padding:"16px 24px", borderRadius:10, background:building?C.surface2:C.teal, color:building?C.muted:"white", border:"none", fontSize:15, fontWeight:700, cursor:building?"wait":"pointer", fontFamily:C.sans }}>
            {building ? (status || "Building...") : `⬇ Download Case Package (${fileCount} files)`}
          </button>
          <button onClick={sendToLab} disabled={!patient}
            style={{ flex:"1 1 200px", padding:"16px 24px", borderRadius:10, background:C.surface2, color:C.ink, border:`1px solid ${C.border}`, fontSize:15, fontWeight:700, cursor:patient?"pointer":"not-allowed", fontFamily:C.sans }}>
            ✉ Email Lab Rx
          </button>
        </div>

        {status && !building && <div style={{ gridColumn:"1 / -1", padding:14, borderRadius:8, background:C.greenDim, border:`1px solid ${C.green}40`, color:C.green, fontSize:13, fontWeight:700 }}>{status}</div>}
        {error && <div style={{ gridColumn:"1 / -1", padding:14, borderRadius:8, background:C.redDim, border:`1px solid ${C.red}40`, color:C.red, fontSize:13 }}>{error}</div>}
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, label, desc }) {
  return (
    <label style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", cursor:"pointer", borderBottom:`1px solid ${C.borderSoft}` }}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
        style={{ marginTop:3, width:18, height:18, accentColor:C.teal, cursor:"pointer" }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:checked?C.ink:C.muted }}>{label}</div>
        <div style={{ fontSize:11, color:C.light, marginTop:2 }}>{desc}</div>
      </div>
    </label>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontFamily:C.font, color:C.muted, letterSpacing:1.5, marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}

function SumItem({ k, v }) {
  return (
    <div>
      <div style={{ fontSize:10, color:C.muted, fontFamily:C.font, letterSpacing:1, marginBottom:2 }}>{k.toUpperCase()}</div>
      <div style={{ fontSize:14, color:C.ink, fontWeight:600 }}>{v}</div>
    </div>
  );
}
