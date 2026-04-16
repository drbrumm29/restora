import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { PATIENTS } from "./patient-cases.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.12)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669", blue:"#0891b2",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// ── STL Loader (binary + ASCII) ─────────────────────────────────
function parseBinarySTL(buffer) {
  const dv = new DataView(buffer);
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  const normals   = new Float32Array(triCount * 9);
  let p = 0, n = 0;
  for (let i = 0; i < triCount; i++) {
    const o = 84 + i * 50;
    const nx = dv.getFloat32(o, true), ny = dv.getFloat32(o+4, true), nz = dv.getFloat32(o+8, true);
    for (let v = 0; v < 3; v++) {
      positions[p++] = dv.getFloat32(o+12+v*12, true);
      positions[p++] = dv.getFloat32(o+16+v*12, true);
      positions[p++] = dv.getFloat32(o+20+v*12, true);
      normals[n++] = nx; normals[n++] = ny; normals[n++] = nz;
    }
  }
  return { positions, normals, triCount };
}
function parseASCIISTL(text) {
  const positions = [], normals = [];
  const vertRe = /vertex\s+([\d.e+\-]+)\s+([\d.e+\-]+)\s+([\d.e+\-]+)/g;
  const normRe = /facet normal\s+([\d.e+\-]+)\s+([\d.e+\-]+)\s+([\d.e+\-]+)/g;
  let m;
  while ((m = normRe.exec(text)) !== null) {
    const nx = +m[1], ny = +m[2], nz = +m[3];
    for (let i = 0; i < 3; i++) { normals.push(nx, ny, nz); }
  }
  while ((m = vertRe.exec(text)) !== null) {
    positions.push(+m[1], +m[2], +m[3]);
  }
  return {
    positions: new Float32Array(positions),
    normals: normals.length ? new Float32Array(normals) : null,
    triCount: positions.length / 9,
  };
}
function parseSTL(buffer) {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (head === "solid") {
    const text = new TextDecoder().decode(bytes);
    if (text.includes("facet normal") && text.includes("vertex")) {
      return parseASCIISTL(text);
    }
  }
  return parseBinarySTL(buffer);
}

// ── The 3D Viewer ────────────────────────────────────────────────
function STLViewer({ meshes, activeId, onSelect, wireframe, background, onStats }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshObjectsRef = useRef({}); // id -> THREE.Mesh
  const rafRef = useRef(0);
  const rotateRef = useRef({ isDragging:false, prevX:0, prevY:0, theta:Math.PI/4, phi:Math.PI/3, dist:50 });

  // Init scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background || 0x0a1420);
    const w = mount.clientWidth, h = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.0); dir1.position.set(30, 40, 30);
    const dir2 = new THREE.DirectionalLight(0xcfe8ff, 0.45); dir2.position.set(-30, -20, 20);
    const dir3 = new THREE.DirectionalLight(0xffe8cc, 0.3);  dir3.position.set(0, 20, -30);
    // Hemisphere fill — simulates diffuse ambient light typical in dental operatory
    const hemi = new THREE.HemisphereLight(0xf4f0e8, 0x1a1a2a, 0.4);
    scene.add(amb, dir1, dir2, dir3, hemi);

    // Grid + axes for orientation
    const grid = new THREE.GridHelper(100, 20, 0x264060, 0x1a2f48);
    grid.position.y = -20; scene.add(grid);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    // Camera control — drag to rotate, scroll to zoom
    const el = renderer.domElement;
    const r = rotateRef.current;
    const updateCamera = () => {
      const x = r.dist * Math.sin(r.phi) * Math.cos(r.theta);
      const y = r.dist * Math.cos(r.phi);
      const z = r.dist * Math.sin(r.phi) * Math.sin(r.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onDown = (e) => {
      r.isDragging = true;
      r.prevX = e.clientX || e.touches?.[0]?.clientX || 0;
      r.prevY = e.clientY || e.touches?.[0]?.clientY || 0;
    };
    const onMove = (e) => {
      if (!r.isDragging) return;
      const cx = e.clientX || e.touches?.[0]?.clientX || 0;
      const cy = e.clientY || e.touches?.[0]?.clientY || 0;
      r.theta -= (cx - r.prevX) * 0.008;
      r.phi = Math.max(0.15, Math.min(Math.PI - 0.15, r.phi - (cy - r.prevY) * 0.008));
      r.prevX = cx; r.prevY = cy;
      updateCamera();
    };
    const onUp = () => { r.isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      r.dist = Math.max(8, Math.min(200, r.dist * (1 + e.deltaY * 0.001)));
      updateCamera();
    };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onDown);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);

    // Resize handler
    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw/nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    const animate = () => {
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(el)) mount.removeChild(el);
    };
  }, []);

  // Update background
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(background || 0x0a1420);
  }, [background]);

  // Add/update meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove meshes that are no longer in the list
    const currentIds = new Set(meshes.map(m => m.id));
    Object.keys(meshObjectsRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        const mesh = meshObjectsRef.current[id];
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material.dispose) mesh.material.dispose();
        delete meshObjectsRef.current[id];
      }
    });

    // Add new meshes + update visibility/style
    let totalTris = 0;
    const bbox = new THREE.Box3();
    const tmpBox = new THREE.Box3();

    meshes.forEach(m => {
      let obj = meshObjectsRef.current[m.id];
      if (!obj) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
        if (m.normals) geom.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
        else geom.computeVertexNormals();
        geom.computeBoundingBox();
        const mat = new THREE.MeshStandardMaterial({
          color: m.color || 0xe8d8c4,
          roughness: 0.45,
          metalness: 0.02,
          flatShading: false,
          wireframe,
          side: THREE.DoubleSide,
        });
        obj = new THREE.Mesh(geom, mat);
        scene.add(obj);
        meshObjectsRef.current[m.id] = obj;
      }
      obj.visible = m.visible !== false;
      obj.material.wireframe = wireframe;
      obj.material.color.set(m.id === activeId ? (m.highlightColor || 0x0abab5) : (m.color || 0xe8d8c4));
      obj.material.opacity = m.opacity ?? 1;
      obj.material.transparent = (m.opacity ?? 1) < 1;
      if (obj.visible) {
        tmpBox.setFromObject(obj);
        bbox.union(tmpBox);
        totalTris += m.triCount;
      }
    });

    // Auto-center + fit first time meshes load
    if (!bbox.isEmpty() && meshes.length > 0) {
      const center = new THREE.Vector3(); bbox.getCenter(center);
      const size = new THREE.Vector3(); bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      // Re-center meshes
      Object.values(meshObjectsRef.current).forEach(o => {
        o.position.set(-center.x, -center.y, -center.z);
      });
      const desiredDist = maxDim * 1.8;
      if (rotateRef.current.dist === 50 || Math.abs(rotateRef.current.dist - desiredDist) > maxDim) {
        rotateRef.current.dist = Math.max(10, desiredDist);
      }
    }

    onStats?.({ meshCount: meshes.filter(m=>m.visible!==false).length, triCount: totalTris });
  }, [meshes, activeId, wireframe]);

  return <div ref={mountRef} style={{ width:"100%", height:"100%", position:"relative", cursor:"grab", touchAction:"none" }}/>;
}

// ── Main screen ──────────────────────────────────────────────────
const FILE_COLORS = {
  upper: 0xf0e4d0,   // natural tooth + gingiva tone (warm cream)
  lower: 0xece0cc,   // slightly cooler for visual separation
  prep:  0xd4a868,   // tan (preps — die-stone color)
  prep2: 0xd4a868,
  bite:  0x7a8898,   // blue-grey (bite reg — scanner bite scan)
  crown: 0x0abab5,   // teal (proposed restoration)
};

export default function RestorationCAD({ navigate, activePatient }) {
  const [meshes, setMeshes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeId, setActive] = useState(null);
  const [wireframe, setWire]  = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [stats, setStats]     = useState({ meshCount: 0, triCount: 0 });
  const [material, setMat]    = useState("eMax LT");
  const [shade, setShade]     = useState("A1");
  const [bgColor]             = useState(0x0a1420);

  const patient = activePatient || PATIENTS[0];

  // Load patient files into viewer
  useEffect(() => {
    if (!patient) return;
    setLoading(true); setError(null); setMeshes([]);
    (async () => {
      const out = [];
      for (const f of patient.files) {
        try {
          const resp = await fetch(`/patient-cases/${f.name}`);
          if (!resp.ok) throw new Error(`${resp.status}`);
          const buf = await resp.arrayBuffer();
          const { positions, normals, triCount } = parseSTL(buf);
          out.push({
            id: f.name,
            name: f.name,
            slot: f.slot,
            label: f.name.replace(/^.*?_/, '').replace('.stl', '').replace(/_/g, ' '),
            positions, normals, triCount,
            color: FILE_COLORS[f.slot] ?? 0xe8d8c4,
            highlightColor: 0x0abab5,
            visible: true,
          });
        } catch (e) {
          console.warn('Failed to load', f.name, e);
        }
      }
      setMeshes(out);
      setLoading(false);
    })();
  }, [patient?.id]);

  function toggleVisible(id) {
    setMeshes(ms => ms.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
  }
  function setOpacity(id, opacity) {
    setMeshes(ms => ms.map(m => m.id === id ? { ...m, opacity } : m));
  }
  async function addLibraryTooth(libId, fileName) {
    try {
      setLoading(true);
      const resp = await fetch(`/libraries/${libId}/${fileName}`);
      const buf = await resp.arrayBuffer();
      const { positions, normals, triCount } = parseSTL(buf);
      const id = `lib-${libId}-${fileName}-${Date.now()}`;
      setMeshes(ms => [...ms, {
        id, name: fileName, slot: 'crown',
        label: `${libId} · ${fileName}`,
        positions, normals, triCount,
        color: FILE_COLORS.crown, highlightColor: 0x0abab5,
        visible: true, opacity: 0.85,
      }]);
      setActive(id);
      setShowLib(false);
    } finally {
      setLoading(false);
    }
  }
  function exportDesign() {
    // Merge visible meshes into a single STL and download
    const visible = meshes.filter(m => m.visible !== false);
    if (visible.length === 0) return;
    let totalTris = 0;
    visible.forEach(m => { totalTris += m.triCount; });
    const buffer = new ArrayBuffer(84 + totalTris * 50);
    const dv = new DataView(buffer);
    // header (80 bytes, empty) + triangle count
    dv.setUint32(80, totalTris, true);
    let offset = 84;
    visible.forEach(m => {
      for (let t = 0; t < m.triCount; t++) {
        const nIdx = t * 9;
        // normal from first vertex of triangle (normals stored per-vertex in parse)
        const nx = m.normals?.[nIdx]   ?? 0;
        const ny = m.normals?.[nIdx+1] ?? 0;
        const nz = m.normals?.[nIdx+2] ?? 1;
        dv.setFloat32(offset, nx, true); offset += 4;
        dv.setFloat32(offset, ny, true); offset += 4;
        dv.setFloat32(offset, nz, true); offset += 4;
        for (let v = 0; v < 3; v++) {
          dv.setFloat32(offset, m.positions[nIdx + v*3],     true); offset += 4;
          dv.setFloat32(offset, m.positions[nIdx + v*3 + 1], true); offset += 4;
          dv.setFloat32(offset, m.positions[nIdx + v*3 + 2], true); offset += 4;
        }
        dv.setUint16(offset, 0, true); offset += 2;
      }
    });
    const blob = new Blob([buffer], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patient.id}-design-${Date.now()}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Mini library browser
  const libs = [
    { id:'dannydesigner4', label:'Dannydesigner 4', teeth:[1,2,3,4,5,6,7] },
    { id:'dannydesigner5', label:'Dannydesigner 5', teeth:[1,2,3,4,5,6,7,8] },
    { id:'g01',            label:'G01',             teeth:[1,2,3,4,5,6,7,8] },
    { id:'g02',            label:'G02',             teeth:[1,2,3,4,5,6,7,8] },
    { id:'nct',            label:'NCT',             files:['NCT Design.stl'] },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>
      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:`1px solid ${C.border}`, gap:14, flexWrap:"wrap", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.02em" }}>Restoration CAD</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
            {patient?.name ? `${patient.name} · ${patient.teeth}` : "No patient loaded"} · {stats.meshCount} mesh · {stats.triCount.toLocaleString()} tris
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={()=>setShowLib(s=>!s)} style={{ padding:"10px 16px", borderRadius:8, background:C.purple+"20", color:C.purple, border:`1px solid ${C.purple}50`, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>＋ Add Library Tooth</button>
          <button onClick={()=>setWire(w=>!w)} style={{ padding:"10px 16px", borderRadius:8, background:wireframe?C.tealDim:C.surface2, color:wireframe?C.teal:C.muted, border:`1px solid ${wireframe?C.tealBorder:C.border}`, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>{wireframe?"✓ Wireframe":"Wireframe"}</button>
          <button onClick={exportDesign} disabled={meshes.length===0} style={{ padding:"10px 16px", borderRadius:8, background:meshes.length?C.teal:C.surface2, color:meshes.length?"white":C.muted, border:"none", fontSize:14, fontWeight:700, cursor:meshes.length?"pointer":"not-allowed", fontFamily:C.sans }}>⬇ Export Design STL</button>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex:1, display:"flex", minHeight:0 }}>
        {/* Viewer */}
        <div style={{ flex:1, position:"relative", minWidth:0, background:"#0a1420" }}>
          <STLViewer meshes={meshes} activeId={activeId} onSelect={setActive} wireframe={wireframe} background={bgColor} onStats={setStats}/>

          {loading && (
            <div style={{ position:"absolute", top:16, left:16, padding:"10px 14px", borderRadius:8, background:C.surface+"ee", border:`1px solid ${C.border}`, fontSize:12, color:C.teal, fontFamily:C.font, fontWeight:700, letterSpacing:.8 }}>
              LOADING STL FILES…
            </div>
          )}

          {/* Legend */}
          <div style={{ position:"absolute", bottom:16, left:16, padding:"10px 14px", borderRadius:8, background:C.surface+"dd", border:`1px solid ${C.border}`, fontSize:11, color:C.muted, backdropFilter:"blur(6px)" }}>
            <div style={{ fontFamily:C.font, letterSpacing:1.5, color:C.teal, fontWeight:700, marginBottom:6 }}>CONTROLS</div>
            <div>Drag · rotate · Scroll · zoom</div>
            <div style={{ marginTop:4 }}>Touch: drag + pinch on mobile</div>
          </div>

          {/* Library picker (overlay) */}
          {showLib && (
            <div style={{ position:"absolute", top:16, right:16, width:320, maxHeight:"calc(100% - 32px)", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.4)", padding:18, overflow:"auto", zIndex:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:12, fontFamily:C.font, color:C.purple, letterSpacing:2, fontWeight:700 }}>TOOTH LIBRARY</span>
                <button onClick={()=>setShowLib(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
              {libs.map(lib => (
                <div key={lib.id} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:6 }}>{lib.label}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {(lib.teeth || []).map(n => (
                      <button key={n} onClick={()=>addLibraryTooth(lib.id, `${n}.stl`)}
                        style={{ width:38, height:38, borderRadius:7, background:C.surface2, border:`1px solid ${C.border}`, color:C.ink, cursor:"pointer", fontSize:13, fontFamily:C.font, fontWeight:700 }}>
                        {n}
                      </button>
                    ))}
                    {(lib.files || []).map(f => (
                      <button key={f} onClick={()=>addLibraryTooth(lib.id, f)}
                        style={{ padding:"8px 12px", borderRadius:7, background:C.surface2, border:`1px solid ${C.border}`, color:C.ink, cursor:"pointer", fontSize:11, fontFamily:C.font }}>
                        {f.replace('.stl','')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel — mesh list + controls */}
        <div style={{ width:320, borderLeft:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", flexShrink:0 }}>
          {/* Material + shade */}
          <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700 }}>MATERIAL</div>
            <select value={material} onChange={e=>setMat(e.target.value)} style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none", marginBottom:10 }}>
              {["eMax LT","eMax MT","eMax HT","Zirconia MT","Zirconia HT","Pressed lithium disilicate","Feldspathic porcelain","Composite"].map(x=><option key={x}>{x}</option>)}
            </select>
            <div style={{ fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, marginBottom:10, fontWeight:700, marginTop:12 }}>SHADE</div>
            <select value={shade} onChange={e=>setShade(e.target.value)} style={{ width:"100%", padding:"10px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:14, fontFamily:C.sans, outline:"none" }}>
              {["BL1","BL2","BL3","BL4","A1","A2","A3","A3.5","B1","B2","C1"].map(x=><option key={x}>{x}</option>)}
            </select>
          </div>

          {/* Mesh list */}
          <div style={{ flex:1, overflow:"auto" }}>
            <div style={{ padding:"14px 18px 8px", fontSize:11, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700 }}>
              MESHES ({meshes.length})
            </div>
            {meshes.length === 0 && !loading && (
              <div style={{ padding:"24px 18px", textAlign:"center", color:C.muted, fontSize:12 }}>
                No files loaded.<br/>Select a patient on the Dashboard.
              </div>
            )}
            {meshes.map(m => {
              const color = '#'+m.color.toString(16).padStart(6,'0');
              const isActive = m.id === activeId;
              return (
                <div key={m.id} onClick={()=>setActive(m.id)}
                  style={{ padding:"11px 18px", borderBottom:`1px solid ${C.borderSoft}`, cursor:"pointer", background:isActive?C.tealDim:"transparent", transition:"background .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                    <div style={{ width:14, height:14, borderRadius:3, background:color, flexShrink:0, border:`1px solid ${C.border}` }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:isActive?C.teal:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.label}</div>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:C.font }}>{m.slot} · {m.triCount.toLocaleString()} tris</div>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation();toggleVisible(m.id);}}
                      style={{ width:30, height:30, borderRadius:6, background:m.visible===false?C.surface3:C.tealDim, color:m.visible===false?C.muted:C.teal, border:"none", cursor:"pointer", fontSize:13 }}>
                      {m.visible===false?"○":"●"}
                    </button>
                  </div>
                  {isActive && (
                    <div style={{ padding:"4px 0 2px 24px" }}>
                      <div style={{ fontSize:9, color:C.muted, marginBottom:4, letterSpacing:1, fontFamily:C.font }}>OPACITY</div>
                      <input type="range" min={0} max={1} step={0.05} value={m.opacity ?? 1}
                        onChange={e=>setOpacity(m.id, +e.target.value)}
                        onClick={e=>e.stopPropagation()}
                        style={{ width:"100%", accentColor:C.teal }}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div style={{ padding:"14px 18px", borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={()=>navigate && navigate('design-bridge')} style={{ padding:"12px", borderRadius:8, background:C.surface2, color:C.muted, border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>← Back to Design Bridge</button>
            <button onClick={()=>navigate && navigate('export')} disabled={meshes.length===0} style={{ padding:"12px", borderRadius:8, background:meshes.length?C.teal:C.surface2, color:meshes.length?"white":C.muted, border:"none", fontSize:13, fontWeight:700, cursor:meshes.length?"pointer":"not-allowed", fontFamily:C.sans }}>Send to Export →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
