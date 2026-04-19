import { useState, useRef } from "react";
import { analyzeRadiograph, RADIOGRAPH_TYPES } from "./radiograph-analyzer.js";
import { loadImageFromFile } from "./image-loaders.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  gold:"#b8860b", amber:"#d97706", amberDim:"rgba(217,119,6,.1)",
  purple:"#7c3aed", purpleDim:"rgba(124,58,237,.1)",
  blue:"#0891b2", blueDim:"rgba(8,145,178,.1)",
  red:"#dc2626", redDim:"rgba(220,38,38,.1)",
  green:"#059669", greenDim:"rgba(5,150,105,.12)",
  warn:"#d97706",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

const QUALITY_COLOR = {
  'excellent':     C.green,
  'good':          C.green,
  'fair':          C.amber,
  'poor':          C.red,
  'non-diagnostic':C.red,
};
const CONFIDENCE_COLOR = { high:C.green, medium:C.amber, low:C.red, not_applicable:C.muted };

function Section({ title, color=C.teal, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, fontFamily:C.font, color, letterSpacing:2.5, marginBottom:10, fontWeight:700 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, color=C.ink, valueFont=null }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.borderSoft}`, fontSize:12, gap:12 }}>
      <span style={{ color:C.muted, flexShrink:0 }}>{label}</span>
      <span style={{ color, fontFamily:valueFont||C.sans, textAlign:"right", fontWeight:600 }}>{value}</span>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const c = CONFIDENCE_COLOR[level] || C.muted;
  return (
    <span style={{ padding:"2px 8px", borderRadius:4, fontSize:9, fontFamily:C.font, fontWeight:700, background:c+"20", color:c, letterSpacing:.8, textTransform:"uppercase" }}>
      {level?.replace('_',' ') || "—"}
    </span>
  );
}

export default function RadiographScreen() {
  const [image, setImage] = useState(null);     // { b64, mime, name, url }
  const [hint, setHint] = useState("");
  const [state, setState] = useState("idle");   // idle | analyzing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rawOut, setRawOut] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(f) {
    if (!f) return;
    setError(null);
    setState("loading");
    try {
      // loadImageFromFile transcodes HEIC → JPEG and DICOM → PNG so the
      // Anthropic vision call downstream always receives a format it can
      // read. Native JPG/PNG/WebP pass through unchanged.
      const loaded = await loadImageFromFile(f);
      const b64 = loaded.dataURL.split(",")[1];
      setImage({ b64, mime: loaded.mimeType, name: loaded.originalName, url: loaded.dataURL });
      setResult(null); setState("idle");
    } catch (err) {
      setError(`${f.name}: ${err.message || "Could not decode image"}`);
      setState("error");
    }
  }

  async function runAnalysis() {
    if (!image) return;
    setState("analyzing"); setError(null);
    try {
      const res = await analyzeRadiograph(image.b64, image.mime, hint);
      if (res.ok) {
        setResult(res.result);
        setState("done");
      } else {
        setError(res.error); setRawOut(res.raw);
        setState("error");
      }
    } catch (e) {
      setError(e.message || "Analysis failed");
      setState("error");
    }
  }

  function reset() {
    setImage(null); setResult(null); setError(null); setState("idle"); setHint("");
  }

  return (
    <div style={{ flex:1, overflow:"auto", background:C.bg, color:C.ink, fontFamily:C.sans, padding:"32px 44px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div>
          <div style={{ fontSize:32, fontWeight:700, letterSpacing:"-.02em", marginBottom:6 }}>X-ray Analysis</div>
          <div style={{ fontSize:14, color:C.muted }}>AI-assisted radiograph reading to board-certified radiologist standard.</div>
        </div>
        {image && <button onClick={reset} style={{ padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:600, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontFamily:C.sans }}>↺ New analysis</button>}
      </div>

      {/* Anti-hallucination disclaimer — condensed with expandable detail */}
      <details style={{ padding:"10px 14px", borderRadius:10, background:C.amberDim, border:`1px solid ${C.amber}40`, marginBottom:24, fontSize:12, color:C.muted, lineHeight:1.6 }}>
        <summary style={{ cursor:"pointer", listStyle:"none", color:C.amber, fontWeight:600 }}>⚠ Clinical use — AI assists, does not replace clinical judgment</summary>
        <div style={{ marginTop:8 }}>All findings must be correlated with clinical examination. The radiologist prompt is engineered to refuse speculation — if a finding is not clearly visible, the AI will say so rather than invent one.</div>
      </details>

      {/* Upload stage */}
      {!image && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
          <div
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files?.[0]);}}
            onClick={()=>fileRef.current?.click()}
            style={{ border:`2px dashed ${C.tealBorder}`, borderRadius:12, padding:"80px 40px", textAlign:"center", cursor:"pointer", background:C.surface, transition:"all .15s" }}>
            <div style={{ width:56, height:56, margin:"0 auto 16px", borderRadius:"50%", background:`${C.teal}15`, border:`1.5px solid ${C.teal}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:C.teal, fontFamily:C.font, fontWeight:300 }}>△</div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:8, letterSpacing:"-.01em" }}>Drop a radiograph here</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:20 }}>or click to browse &nbsp;·&nbsp; JPG · PNG · WebP · HEIC · TIFF · BMP · DICOM</div>
            <div style={{ fontSize:11, color:C.light }}>Panoramic · PA · Bitewing · Cephalometric · Occlusal · CBCT slice</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,image/bmp,application/dicom,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.bmp,.dcm,.dicom" style={{ display:"none" }}
              onChange={e=>handleFile(e.target.files?.[0])} />
          </div>
          <div style={{ padding:22, borderRadius:12, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:14, fontWeight:700 }}>SUPPORTED TYPES</div>
            {Object.entries(RADIOGRAPH_TYPES).map(([k,v]) => (
              <div key={k} style={{ padding:"10px 0", borderBottom:`1px solid ${C.borderSoft}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:3 }}>{v.label}</div>
                <div style={{ fontSize:11, color:C.muted }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image loaded — analyze stage */}
      {image && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20 }}>
          {/* Image panel */}
          <div>
            <div style={{ padding:18, borderRadius:12, background:"#000", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", minHeight:380 }}>
              <img src={image.url} alt="radiograph" style={{ maxWidth:"100%", maxHeight:580, objectFit:"contain", borderRadius:4 }} />
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:10, fontFamily:C.font }}>{image.name}</div>

            {/* Results panel (full width below image when done) */}
            {result && (
              <div style={{ marginTop:20, padding:22, borderRadius:12, background:C.surface, border:`1px solid ${C.border}` }}>
                <ResultDisplay result={result} />
              </div>
            )}
            {state === "error" && (
              <div style={{ marginTop:20, padding:22, borderRadius:12, background:C.redDim, border:`1px solid ${C.red}40` }}>
                <div style={{ fontSize:13, color:C.red, fontWeight:700, marginBottom:8 }}>Analysis error</div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{error}</div>
                {rawOut && <div style={{ fontSize:11, color:C.muted, fontFamily:C.font, whiteSpace:"pre-wrap", maxHeight:200, overflow:"auto", background:C.bg, padding:10, borderRadius:6 }}>{rawOut.slice(0,2000)}</div>}
              </div>
            )}
          </div>

          {/* Side panel — hint + run button */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ padding:20, borderRadius:12, background:C.surface, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>CLINICAL CONTEXT (OPTIONAL)</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:10, lineHeight:1.5 }}>Give the AI chief complaint or area of focus. Leave blank for unbiased read.</div>
              <textarea
                value={hint} onChange={e=>setHint(e.target.value)}
                disabled={state==="analyzing"}
                placeholder="e.g., Patient reports pain upper right quadrant, rule out periapical pathology..."
                rows={4}
                style={{ width:"100%", padding:12, borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:12, fontFamily:C.sans, outline:"none", resize:"vertical", boxSizing:"border-box" }}
              />
            </div>

            {state !== "done" && (
              <button onClick={runAnalysis} disabled={state==="analyzing"}
                style={{ padding:"16px", borderRadius:9, fontSize:14, fontWeight:700, border:"none", background:state==="analyzing"?C.surface2:C.teal, color:state==="analyzing"?C.muted:"white", cursor:state==="analyzing"?"wait":"pointer", fontFamily:C.sans, boxShadow:state==="analyzing"?"none":`0 4px 16px ${C.teal}40`, transition:"all .15s" }}>
                {state==="analyzing" ? "⚡ Analyzing — reading like a radiologist..." : "⚡ Analyze Radiograph"}
              </button>
            )}

            {state === "analyzing" && (
              <div style={{ padding:16, borderRadius:9, background:C.tealDim, border:`1px solid ${C.tealBorder}`, fontSize:11, color:C.muted, lineHeight:1.8 }}>
                <div style={{ color:C.teal, fontWeight:700, marginBottom:8, letterSpacing:1.5, fontSize:10, fontFamily:C.font }}>READING PROTOCOL</div>
                <div>▸ Assessing image quality & type</div>
                <div>▸ Systematic anatomical survey</div>
                <div>▸ Tooth-by-tooth review</div>
                <div>▸ Periodontal bone assessment</div>
                <div>▸ Pathology screen</div>
                <div>▸ Artifact differentiation</div>
                <div>▸ Clinical correlation</div>
              </div>
            )}

            {result && (
              <div style={{ padding:16, borderRadius:9, background:C.greenDim, border:`1px solid ${C.green}40`, fontSize:12, color:C.muted }}>
                <div style={{ color:C.green, fontWeight:700, marginBottom:6, fontSize:11 }}>✓ ANALYSIS COMPLETE</div>
                Image type: <strong style={{ color:C.ink }}>{result.image_type || "unknown"}</strong><br/>
                Quality: <strong style={{ color:QUALITY_COLOR[result.image_quality?.rating]||C.muted }}>{result.image_quality?.rating || "—"}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultDisplay({ result }) {
  const hasImplants = result.implants?.present && result.implants?.count > 0;
  const hasEndo = result.endodontic_treatment?.teeth?.length > 0;
  const hasRestor = result.existing_restorations?.length > 0;
  const hasCaries = (result.caries?.definitive?.length || 0) + (result.caries?.suspicious?.length || 0) > 0;
  const hasPeriapical = result.periapical_findings?.length > 0;
  const hasPathology = result.pathology_findings?.length > 0;

  return (
    <div>
      {/* Top banner */}
      <div style={{ padding:16, borderRadius:9, background:QUALITY_COLOR[result.image_quality?.rating]+"18", border:`1px solid ${QUALITY_COLOR[result.image_quality?.rating]}40`, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontFamily:C.font, letterSpacing:2, marginBottom:6, fontWeight:700, color:QUALITY_COLOR[result.image_quality?.rating] }}>
              {result.image_type?.toUpperCase().replace('-',' ')} · QUALITY: {result.image_quality?.rating?.toUpperCase()}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:C.ink, lineHeight:1.5 }}>{result.general_impression}</div>
          </div>
        </div>
        {result.image_quality?.limitations?.length > 0 && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.borderSoft}`, fontSize:11, color:C.muted }}>
            <strong>Limitations:</strong> {result.image_quality.limitations.join(', ')}
          </div>
        )}
      </div>

      {/* Dentition */}
      <Section title="DENTITION" color={C.teal}>
        {result.visible_teeth_inventory ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {result.visible_teeth_inventory.visible?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:4, fontFamily:C.font, fontWeight:700 }}>VISIBLE IN IMAGE</div>
                <div style={{ fontSize:13, color:C.ink, fontFamily:C.font }}>{result.visible_teeth_inventory.visible.join(", ")}</div>
              </div>
            )}
            {result.visible_teeth_inventory.missing_extracted?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:C.red, letterSpacing:1, marginBottom:4, fontFamily:C.font, fontWeight:700 }}>MISSING / EXTRACTED</div>
                <div style={{ fontSize:13, color:C.ink, fontFamily:C.font }}>{result.visible_teeth_inventory.missing_extracted.join(", ")}</div>
              </div>
            )}
            {result.visible_teeth_inventory.not_captured?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:4, fontFamily:C.font, fontWeight:700 }}>NOT CAPTURED (outside image)</div>
                <div style={{ fontSize:13, color:C.muted, fontFamily:C.font }}>{result.visible_teeth_inventory.not_captured.join(", ")}</div>
              </div>
            )}
            {result.visible_teeth_inventory.note && (
              <div style={{ fontSize:10, color:C.light, fontStyle:"italic", marginTop:4 }}>{result.visible_teeth_inventory.note}</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.ink, lineHeight:1.6 }}>{result.teeth_present}</div>
        )}
      </Section>

      {/* Implants */}
      <Section title="IMPLANTS" color={hasImplants?C.purple:C.muted}>
        <div style={{ padding:12, borderRadius:7, background:hasImplants?C.purpleDim:C.surface2, border:`1px solid ${hasImplants?C.purple+"40":C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:hasImplants?10:0 }}>
            <span style={{ fontSize:13, fontWeight:700, color:hasImplants?C.purple:C.muted }}>
              {hasImplants ? `${result.implants.count} implant${result.implants.count!==1?'s':''} identified` : "No implants visible"}
            </span>
            <ConfidenceBadge level={result.implants?.confidence} />
          </div>
          {hasImplants && result.implants.locations?.length > 0 && (
            <div style={{ fontSize:11, color:C.muted }}>Locations: {result.implants.locations.join(', ')}</div>
          )}
        </div>
      </Section>

      {/* Restorations */}
      {hasRestor && (
        <Section title="EXISTING RESTORATIONS" color={C.blue}>
          {result.existing_restorations.map((r, i) => (
            <div key={i} style={{ padding:"10px 12px", background:C.surface2, borderRadius:6, marginBottom:6, fontSize:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <strong style={{ color:C.blue, fontFamily:C.font, marginRight:12 }}>{r.tooth}</strong>
                  <span style={{ color:C.ink, textTransform:"capitalize" }}>{r.type?.replace(/-/g,' ')}</span>
                  {r.surfaces && <span style={{ color:C.muted, fontFamily:C.font, marginLeft:8, fontSize:11 }}>{r.surfaces}</span>}
                </div>
                <ConfidenceBadge level={r.confidence} />
              </div>
              {r.reasoning && <div style={{ fontSize:10, color:C.muted, marginTop:4, fontStyle:"italic", lineHeight:1.5 }}>{r.reasoning}</div>}
            </div>
          ))}
        </Section>
      )}

      {/* Endodontic */}
      {hasEndo && (
        <Section title="ENDODONTIC TREATMENT" color={C.amber}>
          <div style={{ fontSize:12, color:C.ink, marginBottom:6 }}>Teeth: <strong>{result.endodontic_treatment.teeth.join(', ')}</strong></div>
          {result.endodontic_treatment.quality_notes && <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{result.endodontic_treatment.quality_notes}</div>}
        </Section>
      )}

      {/* Caries */}
      <Section title="CARIES ASSESSMENT" color={hasCaries?C.red:C.muted}>
        <div style={{ padding:12, borderRadius:7, background:hasCaries?C.redDim:C.surface2, border:`1px solid ${hasCaries?C.red+"40":C.border}` }}>
          {result.caries?.definitive?.length > 0 && (
            <div style={{ fontSize:12, marginBottom:6 }}><strong style={{ color:C.red }}>Definitive:</strong> <span style={{ color:C.ink }}>{result.caries.definitive.join(', ')}</span></div>
          )}
          {result.caries?.suspicious?.length > 0 && (
            <div style={{ fontSize:12, marginBottom:6 }}><strong style={{ color:C.amber }}>Suspicious:</strong> <span style={{ color:C.ink }}>{result.caries.suspicious.join(', ')}</span></div>
          )}
          {!hasCaries && <div style={{ fontSize:12, color:C.muted }}>No definitive caries identified on this radiograph.</div>}
          {result.caries?.note && <div style={{ fontSize:10, color:C.muted, fontStyle:"italic", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.borderSoft}` }}>{result.caries.note}</div>}
        </div>
      </Section>

      {/* Periapical findings */}
      {hasPeriapical && (
        <Section title="PERIAPICAL FINDINGS" color={C.amber}>
          {result.periapical_findings.map((f, i) => (
            <div key={i} style={{ padding:10, background:C.amberDim, border:`1px solid ${C.amber}30`, borderRadius:6, marginBottom:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.amber }}>{f.tooth} {f.size_mm && <span style={{ fontFamily:C.font, color:C.muted, marginLeft:8, fontSize:10 }}>{f.size_mm}</span>}</span>
                <ConfidenceBadge level={f.confidence} />
              </div>
              <div style={{ fontSize:11, color:C.ink, lineHeight:1.5 }}>{f.finding}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Periodontal */}
      <Section title="PERIODONTAL STATUS" color={C.teal}>
        <Row label="Bone loss"           value={result.periodontal_status?.bone_loss || "—"} />
        <Row label="Pattern"              value={result.periodontal_status?.pattern || "—"} />
        <Row label="Crestal bone"         value={result.periodontal_status?.crestal_bone_level || "—"} />
      </Section>

      {/* Pathology */}
      {hasPathology && (
        <Section title="PATHOLOGY FINDINGS" color={C.red}>
          {result.pathology_findings.map((p, i) => (
            <div key={i} style={{ padding:12, background:C.redDim, border:`1px solid ${C.red}40`, borderRadius:7, marginBottom:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <strong style={{ color:C.red, fontSize:12 }}>{p.location}</strong>
                <ConfidenceBadge level={p.confidence} />
              </div>
              <div style={{ fontSize:12, color:C.ink, marginBottom:6, lineHeight:1.5 }}>{p.finding}</div>
              {p.differential?.length > 0 && (
                <div style={{ fontSize:11, color:C.muted }}>DDx: {p.differential.join(' · ')}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Anatomical notes */}
      {result.anatomical_notes?.length > 0 && (
        <Section title="ANATOMICAL NOTES" color={C.muted}>
          <ul style={{ margin:0, paddingLeft:20, fontSize:12, color:C.ink, lineHeight:1.8 }}>
            {result.anatomical_notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Section>
      )}

      {/* Artifacts */}
      {result.artifacts_and_non_pathology?.length > 0 && (
        <Section title="ARTIFACTS (NOT PATHOLOGY)" color={C.muted}>
          <ul style={{ margin:0, paddingLeft:20, fontSize:11, color:C.muted, lineHeight:1.8 }}>
            {result.artifacts_and_non_pathology.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Section>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <Section title="RECOMMENDATIONS" color={C.teal}>
          <ol style={{ margin:0, paddingLeft:20, fontSize:12, color:C.ink, lineHeight:1.8 }}>
            {result.recommendations.map((n, i) => <li key={i}>{n}</li>)}
          </ol>
        </Section>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop:20, padding:12, borderRadius:7, background:C.surface2, fontSize:11, color:C.muted, fontStyle:"italic", textAlign:"center", lineHeight:1.6 }}>
        {result.disclaimer}
      </div>
    </div>
  );
}
