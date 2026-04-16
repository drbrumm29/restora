import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

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

// ── Binary STL parser ──────────────────────────────────────────────
function parseSTL(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  // Check if ASCII STL (starts with "solid")
  const header = new Uint8Array(arrayBuffer, 0, 5);
  const headerStr = String.fromCharCode(...header);
  if (headerStr.toLowerCase() === "solid" && arrayBuffer.byteLength < 1000) {
    // try ASCII
    return parseASCIISTL(arrayBuffer);
  }
  // Binary STL
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);
  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    const nx = dv.getFloat32(offset, true);
    const ny = dv.getFloat32(offset + 4, true);
    const nz = dv.getFloat32(offset + 8, true);
    offset += 12;
    for (let v = 0; v < 3; v++) {
      const x = dv.getFloat32(offset, true);
      const y = dv.getFloat32(offset + 4, true);
      const z = dv.getFloat32(offset + 8, true);
      positions[i*9 + v*3] = x;
      positions[i*9 + v*3 + 1] = y;
      positions[i*9 + v*3 + 2] = z;
      normals[i*9 + v*3] = nx;
      normals[i*9 + v*3 + 1] = ny;
      normals[i*9 + v*3 + 2] = nz;
      offset += 12;
    }
    offset += 2; // attribute byte count
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geom;
}

function parseASCIISTL(ab) {
  const text = new TextDecoder().decode(ab);
  const positions = [];
  const normals = [];
  const re = /facet normal ([-\d.e+]+) ([-\d.e+]+) ([-\d.e+]+)\s+outer loop\s+vertex ([-\d.e+]+) ([-\d.e+]+) ([-\d.e+]+)\s+vertex ([-\d.e+]+) ([-\d.e+]+) ([-\d.e+]+)\s+vertex ([-\d.e+]+) ([-\d.e+]+) ([-\d.e+]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = [+m[1], +m[2], +m[3]];
    for (let v = 0; v < 3; v++) {
      positions.push(+m[4+v*3], +m[5+v*3], +m[6+v*3]);
      normals.push(...n);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geom;
}

// ── Viewport component ────────────────────────────────────────────
function Viewport({ meshes, viewMode, onMeshHover, autoRotate }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshObjectsRef = useRef({});
  const controlsRef = useRef({ dragging:false, panning:false, lastX:0, lastY:0, rotX:0.35, rotY:-0.4, zoom:1, panX:0, panY:0, targetRotY:-0.4, targetRotX:0.35 });
  const animFrameRef = useRef(null);

  // Setup scene ONCE
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const w = mount.clientWidth, h = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1521);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, w/h, 0.1, 1000);
    camera.position.set(0, 0, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting — studio setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(30, 50, 40);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x88b4e8, 0.35);
    rimLight.position.set(-40, 20, -30);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x0abab5, 0.2);
    fillLight.position.set(0, -30, 20);
    scene.add(fillLight);

    // Grid plane
    const grid = new THREE.GridHelper(120, 24, 0x1f3352, 0x1a2f48);
    grid.position.y = -25;
    scene.add(grid);

    // Interaction
    const onPointerDown = (e) => {
      const t = e.touches ? e.touches[0] : e;
      controlsRef.current.dragging = !e.shiftKey && !e.ctrlKey;
      controlsRef.current.panning = e.shiftKey || e.ctrlKey || (e.touches && e.touches.length === 2);
      controlsRef.current.lastX = t.clientX;
      controlsRef.current.lastY = t.clientY;
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      const ctrl = controlsRef.current;
      if (!ctrl.dragging && !ctrl.panning) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - ctrl.lastX;
      const dy = t.clientY - ctrl.lastY;
      if (ctrl.dragging) {
        ctrl.targetRotY += dx * 0.01;
        ctrl.targetRotX = Math.max(-1.5, Math.min(1.5, ctrl.targetRotX + dy * 0.01));
      } else if (ctrl.panning) {
        ctrl.panX += dx * 0.1;
        ctrl.panY -= dy * 0.1;
      }
      ctrl.lastX = t.clientX;
      ctrl.lastY = t.clientY;
      e.preventDefault();
    };
    const onPointerUp = () => {
      controlsRef.current.dragging = false;
      controlsRef.current.panning = false;
    };
    const onWheel = (e) => {
      controlsRef.current.zoom *= (1 - e.deltaY * 0.0015);
      controlsRef.current.zoom = Math.max(0.2, Math.min(5, controlsRef.current.zoom));
      e.preventDefault();
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, {passive:false});
    canvas.addEventListener('touchmove', onPointerMove, {passive:false});
    window.addEventListener('touchend', onPointerUp);
    canvas.addEventListener('wheel', onWheel, {passive:false});

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const ctrl = controlsRef.current;
      // Smooth interpolation
      ctrl.rotY += (ctrl.targetRotY - ctrl.rotY) * 0.15;
      ctrl.rotX += (ctrl.targetRotX - ctrl.rotX) * 0.15;
      if (autoRotate) ctrl.targetRotY += 0.005;

      // Apply to scene pivot (we'll use camera position instead)
      const r = 80 / ctrl.zoom;
      camera.position.x = ctrl.panX + r * Math.cos(ctrl.rotX) * Math.sin(ctrl.rotY);
      camera.position.y = ctrl.panY + r * Math.sin(ctrl.rotX);
      camera.position.z = r * Math.cos(ctrl.rotX) * Math.cos(ctrl.rotY);
      camera.lookAt(ctrl.panX, ctrl.panY, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      try { mount.removeChild(renderer.domElement); } catch(e){}
      renderer.dispose();
    };
  }, []);

  // Track autoRotate changes without recreating scene
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  // Update meshes when they change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old meshes
    Object.values(meshObjectsRef.current).forEach(m => {
      scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    });
    meshObjectsRef.current = {};

    if (meshes.length === 0) return;

    // Compute combined bounding box for centering
    let combinedBB = null;

    meshes.forEach((m, i) => {
      if (!m.geometry) return;
      const geom = m.geometry.clone();
      geom.computeBoundingBox();
      geom.computeVertexNormals();

      const color = m.color || 0xe8e0d0;
      const opacity = m.opacity ?? 1;
      const wireframe = viewMode === "wireframe";

      let material;
      if (viewMode === "xray") {
        material = new THREE.MeshPhongMaterial({
          color, specular:0x222222, shininess:40,
          transparent:true, opacity:0.5, side:THREE.DoubleSide,
          depthWrite:false,
        });
      } else {
        material = new THREE.MeshPhongMaterial({
          color, specular:0x333333, shininess:60,
          transparent:opacity<1, opacity, side:THREE.DoubleSide,
          wireframe,
          flatShading:false,
        });
      }

      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: m.id, label: m.label };
      scene.add(mesh);
      meshObjectsRef.current[m.id] = mesh;

      if (!combinedBB) combinedBB = geom.boundingBox.clone();
      else combinedBB.union(geom.boundingBox);
    });

    // Center and scale meshes
    if (combinedBB) {
      const center = combinedBB.getCenter(new THREE.Vector3());
      const size = combinedBB.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 40 / (maxDim || 1);

      Object.values(meshObjectsRef.current).forEach(m => {
        m.position.sub(center).multiplyScalar(scale);
        m.scale.setScalar(scale);
      });
    }
  }, [meshes, viewMode]);

  return <div ref={mountRef} style={{ width:"100%", height:"100%", background:"#0a1521", cursor:"grab", touchAction:"none" }} />;
}

// ── Main screen ───────────────────────────────────────────────────
export default function RestorationCAD({ activePatient }) {
  const [meshes, setMeshes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("solid"); // solid | wireframe | xray
  const [autoRotate, setAutoRotate] = useState(false);
  const [visible, setVisible] = useState({});  // { meshId: boolean }
  const [toothNotes, setToothNotes] = useState("");
  const fileInputRef = useRef(null);

  // Auto-load patient files if patient is active
  useEffect(() => {
    if (!activePatient?.files?.length) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const loaded = [];
        for (let i = 0; i < activePatient.files.length; i++) {
          const f = activePatient.files[i];
          if (!f.name.toLowerCase().endsWith('.stl')) continue;
          const res = await fetch(`/patient-cases/${f.name}`);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          const geom = parseSTL(buf);
          const meshInfo = classifyMesh(f.name, f.slot, i);
          loaded.push({
            id: f.name,
            label: meshInfo.label,
            color: meshInfo.color,
            opacity: meshInfo.opacity,
            geometry: geom,
          });
        }
        setMeshes(loaded);
        // All visible by default
        const vis = {};
        loaded.forEach(m => vis[m.id] = true);
        setVisible(vis);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, [activePatient]);

  // Filter only visible meshes
  const activeMeshes = meshes.filter(m => visible[m.id]);

  async function loadFromFile(file) {
    setLoading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const geom = parseSTL(buf);
      const info = classifyMesh(file.name, null, meshes.length);
      const newMesh = {
        id: file.name + '-' + Date.now(),
        label: info.label,
        color: info.color,
        opacity: info.opacity,
        geometry: geom,
      };
      setMeshes(m => [...m, newMesh]);
      setVisible(v => ({ ...v, [newMesh.id]: true }));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function removeMesh(id) {
    setMeshes(m => m.filter(x => x.id !== id));
    setVisible(v => { const n = {...v}; delete n[id]; return n; });
  }

  function resetView() {
    // trigger by recreating meshes array
    setMeshes(m => [...m]);
  }

  const triCount = meshes.reduce((sum, m) => {
    const attr = m.geometry?.getAttribute('position');
    return sum + (attr ? attr.count / 3 : 0);
  }, 0);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Top toolbar */}
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", flexShrink:0, background:C.surface }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Restoration CAD</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
            {activePatient ? `${activePatient.name} · ${activePatient.type}` : "Upload an STL file to begin"}
          </div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {/* View mode toggle */}
          {["solid","wireframe","xray"].map(mode => (
            <button key={mode} onClick={()=>setViewMode(mode)}
              style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
                background: viewMode===mode ? C.teal : C.surface2,
                color: viewMode===mode ? "white" : C.muted,
                cursor:"pointer", fontFamily:C.sans, textTransform:"capitalize" }}>
              {mode==="xray"?"X-Ray":mode}
            </button>
          ))}
          <button onClick={()=>setAutoRotate(a=>!a)}
            style={{ padding:"10px 16px", borderRadius:7, fontSize:13, fontWeight:700, border:"none",
              background:autoRotate?C.amber:C.surface2, color:autoRotate?"white":C.muted,
              cursor:"pointer", fontFamily:C.sans }}>
            ↻ {autoRotate?"Stop":"Rotate"}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* 3D viewport */}
        <div style={{ flex:1, position:"relative", minWidth:0 }}>
          {meshes.length === 0 && !loading && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:18, color:C.muted, pointerEvents:"none", zIndex:2, background:"#0a1521" }}>
              <div style={{ fontSize:56 }}>🦷</div>
              <div style={{ fontSize:18, fontWeight:700 }}>No STL loaded</div>
              <div style={{ fontSize:14, textAlign:"center", maxWidth:400, lineHeight:1.6 }}>
                {activePatient ? "Loading patient files…" : "Upload an STL file using the button in the right panel, or select a patient from the Dashboard."}
              </div>
            </div>
          )}
          {loading && (
            <div style={{ position:"absolute", top:16, left:16, padding:"10px 16px", background:C.surface, border:`1px solid ${C.tealBorder}`, borderRadius:8, color:C.teal, fontSize:13, fontWeight:700, zIndex:3 }}>
              ⚡ Loading 3D meshes…
            </div>
          )}
          {error && (
            <div style={{ position:"absolute", top:16, left:16, padding:"10px 16px", background:"rgba(220,38,38,.2)", border:`1px solid ${C.red}`, borderRadius:8, color:C.red, fontSize:13, maxWidth:400, zIndex:3 }}>
              Error: {error}
            </div>
          )}
          <Viewport meshes={activeMeshes} viewMode={viewMode} autoRotate={autoRotate} />

          {/* Viewport overlay info */}
          {meshes.length > 0 && (
            <>
              <div style={{ position:"absolute", bottom:16, left:16, padding:"10px 14px", background:"rgba(19,35,56,.85)", backdropFilter:"blur(8px)", borderRadius:7, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, fontFamily:C.font, pointerEvents:"none" }}>
                DRAG to rotate · SHIFT+DRAG to pan · WHEEL to zoom
              </div>
              <div style={{ position:"absolute", bottom:16, right:16, padding:"10px 14px", background:"rgba(19,35,56,.85)", backdropFilter:"blur(8px)", borderRadius:7, border:`1px solid ${C.border}`, fontSize:11, color:C.teal, fontFamily:C.font, pointerEvents:"none" }}>
                {activeMeshes.length}/{meshes.length} meshes · {triCount.toLocaleString()} triangles
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width:320, background:C.surface, borderLeft:`1px solid ${C.border}`, overflow:"auto", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:18 }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>FILES</div>
            <button onClick={()=>fileInputRef.current?.click()}
              style={{ width:"100%", padding:"12px", borderRadius:8, border:`1.5px dashed ${C.tealBorder}`, background:"transparent", color:C.teal, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:C.sans, marginBottom:12 }}>
              ⬆ Upload STL
            </button>
            <input ref={fileInputRef} type="file" accept=".stl" multiple style={{ display:"none" }}
              onChange={e=>{
                Array.from(e.target.files || []).forEach(loadFromFile);
                e.target.value = "";
              }} />

            {meshes.length === 0 && (
              <div style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"14px 0", lineHeight:1.6 }}>
                No files loaded yet
              </div>
            )}

            {meshes.map(m => (
              <div key={m.id} style={{ padding:"10px 12px", marginBottom:6, borderRadius:7, background:visible[m.id]?C.surface2:"transparent", border:`1px solid ${visible[m.id]?C.border:C.borderSoft}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:3, background:"#"+m.color.toString(16).padStart(6,'0'), flexShrink:0, border:`1px solid ${C.border}` }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.label}</div>
                  <div style={{ fontSize:10, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.id.replace(/\.(stl|STL)$/,'')}</div>
                </div>
                <button onClick={()=>setVisible(v=>({...v, [m.id]: !v[m.id]}))}
                  style={{ padding:"4px 8px", borderRadius:4, fontSize:10, border:"none", background:visible[m.id]?C.teal:C.surface3, color:visible[m.id]?"white":C.muted, cursor:"pointer", fontFamily:C.font, minWidth:30 }}>
                  {visible[m.id]?"◉":"○"}
                </button>
                <button onClick={()=>removeMesh(m.id)}
                  style={{ padding:"4px 7px", borderRadius:4, fontSize:10, border:"none", background:"rgba(220,38,38,.15)", color:C.red, cursor:"pointer", fontFamily:C.sans }}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {activePatient && (
            <div style={{ padding:"0 18px 18px" }}>
              <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>CASE INFO</div>
              <div style={{ padding:14, borderRadius:8, background:C.surface2, border:`1px solid ${C.border}` }}>
                {[
                  ["Patient", activePatient.name],
                  ["Teeth", activePatient.teeth],
                  ["Type", activePatient.subtype],
                  activePatient.parameters?.tooth_form && ["Form", activePatient.parameters.tooth_form],
                  activePatient.parameters?.length_adjustment_mm && ["Length adj", `+${activePatient.parameters.length_adjustment_mm}mm`],
                  activePatient.parameters?.shade && ["Shade", activePatient.parameters.shade],
                ].filter(Boolean).map(([l,v]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.borderSoft}`, fontSize:12 }}>
                    <span style={{ color:C.muted }}>{l}</span>
                    <span style={{ color:C.ink, fontFamily:C.font, textAlign:"right", maxWidth:180 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding:"0 18px 18px" }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>DESIGN NOTES</div>
            <textarea value={toothNotes} onChange={e=>setToothNotes(e.target.value)} rows={4}
              placeholder="Margin notes, emergence profile, contacts…"
              style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, fontFamily:C.sans, outline:"none", resize:"vertical", boxSizing:"border-box", minHeight:80 }}/>
          </div>

          <div style={{ padding:"0 18px 18px", marginTop:"auto" }}>
            <button onClick={()=>alert('Design export feature coming soon — will package all loaded STLs + notes into a lab package')}
              style={{ width:"100%", padding:"14px", borderRadius:8, border:"none", background:C.teal, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans, boxShadow:`0 4px 16px ${C.teal}40` }}>
              Export Design →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mesh classification for coloring and labeling ─────────────────
function classifyMesh(filename, slot, index) {
  const lower = filename.toLowerCase();
  // Arch scans
  if (lower.includes("upper_arch") || lower.includes("maxillary") || slot === "upper")
    return { label: "Upper Arch", color: 0xf4e8d0, opacity: 1 };  // warm ivory
  if (lower.includes("lower_arch") || lower.includes("mandibular") || slot === "lower")
    return { label: "Lower Arch", color: 0xe8d8b8, opacity: 1 };
  // Bite reg
  if (lower.includes("bite") || lower.includes("reg") || slot === "bite")
    return { label: "Bite Registration", color: 0x9d5fc4, opacity: 0.65 };
  // Preps
  if (lower.includes("prep") || slot === "prep" || slot === "prep2") {
    const m = lower.match(/prep[_-]?(\d+)/);
    const n = m ? m[1] : (index+1);
    return { label: `Prep #${n}`, color: 0xff9a5c, opacity: 1 };
  }
  // Implant
  if (lower.includes("implant_crown") || lower.includes("crown") || slot === "crown")
    return { label: "Implant Crown", color: 0x7ac4f0, opacity: 1 };
  if (lower.includes("scanbody"))
    return { label: "Scan Body", color: 0xd63380, opacity: 1 };
  // Alignment / full arch
  if (lower.includes("alignment"))
    return { label: "Alignment Plates", color: 0xfaf5e8, opacity: 1 };
  if (lower.includes("full_arch"))
    return { label: "Full Arch", color: 0xf0e6c8, opacity: 1 };
  // Library teeth
  if (/^\d+\.stl$/i.test(filename))
    return { label: `Library Tooth ${filename.replace(/\.stl$/i,'')}`, color: 0xf4e8d0, opacity: 1 };
  return { label: filename.replace(/\.(stl|STL)$/,''), color: 0xc0c0d0, opacity: 1 };
}
