import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#ffffff", muted:"#e0ecf8", light:"#c0d4ea",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.18)", tealBorder:"rgba(10,186,181,.45)",
  amber:"#f59e0b", red:"#ef4444", green:"#10b981",
  purple:"#7c3aed", purpleDim:"rgba(124,58,237,.15)",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

// ── STL Parser (binary + ASCII, same as main viewer) ────────────────
function parseSTL(buffer) {
  const dv = new DataView(buffer);
  // Check ASCII STL
  const header = new Uint8Array(buffer, 0, 5);
  const headerStr = String.fromCharCode(...header);
  if (headerStr.toLowerCase() === 'solid') {
    const text = new TextDecoder().decode(buffer);
    if (text.includes('facet normal')) {
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
      return { positions: new Float32Array(positions), normals: new Float32Array(normals), triCount: positions.length / 9 };
    }
  }
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    const nx = dv.getFloat32(off, true), ny = dv.getFloat32(off+4, true), nz = dv.getFloat32(off+8, true);
    off += 12;
    for (let v = 0; v < 3; v++) {
      positions[i*9 + v*3]     = dv.getFloat32(off, true);
      positions[i*9 + v*3 + 1] = dv.getFloat32(off+4, true);
      positions[i*9 + v*3 + 2] = dv.getFloat32(off+8, true);
      normals[i*9 + v*3]     = nx;
      normals[i*9 + v*3 + 1] = ny;
      normals[i*9 + v*3 + 2] = nz;
      off += 12;
    }
    off += 2;
  }
  return { positions, normals, triCount };
}

// ── Library manifest (what's in each pack) ──────────────────────────
const LIBRARY_PACKS = [
  {
    id: "dannydesigner5",
    name: "Danny Designer 5",
    tag: "Ovoid / Ultra-detail",
    description: "Ultra-detailed ovoid teeth with natural characterization. Best for high-end veneers and feminine smile designs.",
    files: ["1.stl", "2.stl", "3.stl", "4.stl", "5.stl", "6.stl", "7.stl", "8.stl"],
    totalTris: "17K-39K per tooth",
    recommendedFor: ["Veneer cases", "Feminine smile designs", "Golden ratio cases"],
    color: "#0abab5",
  },
  {
    id: "dannydesigner4",
    name: "Danny Designer 4",
    tag: "Square / Natural",
    description: "Natural squared anterior teeth. Classic masculine shapes with subtle mamelons.",
    files: ["1.stl", "2.stl", "3.stl", "4.stl", "5.stl", "6.stl", "7.stl"],
    totalTris: "9K-33K per tooth",
    recommendedFor: ["Masculine cases", "Square tooth form", "Youthful restorations"],
    color: "#7c3aed",
  },
  {
    id: "g01",
    name: "G01 Aesthetic Pack",
    tag: "Balanced",
    description: "Balanced anterior set. Good default choice for most veneer cases.",
    files: ["1.stl", "2.stl", "3.stl", "4.stl", "5.stl", "6.stl", "7.stl", "8.stl"],
    totalTris: "17K-33K per tooth",
    recommendedFor: ["Default choice", "Mixed arch forms", "Teaching cases"],
    color: "#f59e0b",
  },
  {
    id: "g02",
    name: "G02 Aesthetic Pack",
    tag: "Balanced (variant)",
    description: "Variant of G01 with slightly different proportions. Both packs share source models.",
    files: ["1.stl", "2.stl", "3.stl", "4.stl", "5.stl", "6.stl", "7.stl", "8.stl"],
    totalTris: "17K-33K per tooth",
    recommendedFor: ["Second-opinion shapes", "Comparison workflows"],
    color: "#0891b2",
  },
  {
    id: "nct",
    name: "NCT Design",
    tag: "Single reference",
    description: "Reference tooth model. Use as morphology reference.",
    files: ["NCT Design.stl"],
    totalTris: "16K tris",
    recommendedFor: ["Anatomy reference", "Morphology study"],
    color: "#10b981",
  },
  {
    id: "samples",
    name: "Sample Models",
    tag: "Full arch + single",
    description: "Full-arch demo STL and a sample single tooth.",
    files: ["tooth8.stl", "full_arch.stl"],
    totalTris: "varies",
    recommendedFor: ["Testing", "Demo presentations"],
    color: "#ef4444",
  },
];

// Classify tooth by bbox aspect ratio
function classifyTooth(bbox) {
  if (!bbox) return { type: "unknown", label: "Unknown" };
  const dx = bbox.max.x - bbox.min.x;
  const dy = bbox.max.y - bbox.min.y;
  const dz = bbox.max.z - bbox.min.z;
  const maxDim = Math.max(dx, dy, dz);
  const minDim = Math.min(dx, dy, dz);
  const aspect = maxDim / minDim;
  const widthMM = Math.max(dx, dy);  // mesiodistal
  const heightMM = dz;  // incisal-cervical
  if (widthMM > 15) return { type: "full-arch", label: "Full Arch" };
  if (aspect > 2.2) return { type: "incisor", label: "Incisor" };
  if (aspect > 1.6) return { type: "canine", label: "Canine" };
  if (aspect > 1.3) return { type: "premolar", label: "Premolar" };
  return { type: "molar", label: "Molar" };
}

// ── Mini thumbnail renderer (live, cached) ──────────────────────────
function ThumbRenderer({ libId, fileName, size = 120, color = 0xf0e4d0 }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    let disposed = false;
    let renderer, scene, camera, animFrame;

    const init = async () => {
      try {
        const resp = await fetch(`/libraries/${libId}/${encodeURIComponent(fileName)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const { positions, normals, triCount } = parseSTL(buf);
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a1420);
        camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(size, size);
        if (disposed) return;
        ref.current?.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const dir1 = new THREE.DirectionalLight(0xffffff, 1.1); dir1.position.set(20, 30, 20); scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0xcfe8ff, 0.4); dir2.position.set(-15, -10, 10); scene.add(dir2);

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geom.rotateX(Math.PI / 2);  // Z-up → Y-up
        geom.computeBoundingBox();
        const bbox = geom.boundingBox;
        const center = bbox.getCenter(new THREE.Vector3());
        geom.translate(-center.x, -center.y, -center.z);
        geom.computeBoundingBox();
        const size3 = geom.boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size3.x, size3.y, size3.z);

        const mat = new THREE.MeshStandardMaterial({
          color, roughness: 0.45, metalness: 0.02, side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        scene.add(mesh);

        // Compute info
        const classification = classifyTooth(geom.boundingBox);
        setInfo({
          triCount,
          width: size3.x.toFixed(1),
          height: size3.y.toFixed(1),
          depth: size3.z.toFixed(1),
          ...classification,
        });

        // Orbit camera slowly
        let theta = Math.PI / 4;
        const phi = Math.PI / 2.8;
        const dist = maxDim * 1.8;
        const animate = () => {
          if (disposed) return;
          theta += 0.006;
          camera.position.set(dist * Math.sin(phi) * Math.cos(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.sin(theta));
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
          animFrame = requestAnimationFrame(animate);
        };
        animate();
        setLoaded(true);
      } catch (e) {
        console.warn('Thumbnail failed:', libId, fileName, e.message);
      }
    };
    init();

    return () => {
      disposed = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (renderer) {
        renderer.dispose();
        try { ref.current?.removeChild(renderer.domElement); } catch {}
      }
      if (scene) {
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      }
    };
  }, [libId, fileName, size, color]);

  return (
    <div ref={ref} style={{
      width: size, height: size, borderRadius: 8, overflow: "hidden",
      background: loaded ? "#0a1420" : C.surface2,
      border: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {!loaded && <div style={{ color: C.muted, fontSize: 10, fontFamily: C.font }}>LOADING…</div>}
    </div>
  );
}

// ── Large preview renderer (with controls) ──────────────────────────
function LargePreview({ libId, fileName, color, onAdd }) {
  const ref = useRef(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const rotateRef = useRef({ theta: Math.PI/4, phi: Math.PI/2.8, dist: 40, isDown: false, prevX: 0, prevY: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const mount = ref.current;
    let disposed = false;
    let renderer, scene, camera, animFrame;
    setLoading(true);

    const init = async () => {
      try {
        const resp = await fetch(`/libraries/${libId}/${encodeURIComponent(fileName)}`);
        const buf = await resp.arrayBuffer();
        const { positions, normals, triCount } = parseSTL(buf);
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a1420);
        const w = mount.clientWidth, h = mount.clientHeight;
        camera = new THREE.PerspectiveCamera(40, w/h, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        mount.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dir1 = new THREE.DirectionalLight(0xffffff, 1.1); dir1.position.set(30, 40, 30); scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0xcfe8ff, 0.4); dir2.position.set(-20, -10, 15); scene.add(dir2);
        scene.add(new THREE.HemisphereLight(0xf4f0e8, 0x1a1a2a, 0.35));
        // Grid
        const grid = new THREE.GridHelper(40, 8, 0x264060, 0x1a2f48);
        grid.position.y = -12;
        scene.add(grid);

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geom.rotateX(Math.PI / 2);
        geom.computeBoundingBox();
        const bbox = geom.boundingBox;
        const center = bbox.getCenter(new THREE.Vector3());
        geom.translate(-center.x, -center.y, -center.z);
        geom.computeBoundingBox();
        const size3 = geom.boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size3.x, size3.y, size3.z);
        rotateRef.current.dist = maxDim * 2.2;

        const mat = new THREE.MeshStandardMaterial({
          color, roughness: 0.42, metalness: 0.03, side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        scene.add(mesh);

        setInfo({
          triCount,
          width: size3.x.toFixed(2),
          height: size3.y.toFixed(2),
          depth: size3.z.toFixed(2),
          ...classifyTooth(geom.boundingBox),
        });
        setLoading(false);

        // Controls
        const r = rotateRef.current;
        const onDown = (e) => { r.isDown = true; r.prevX = e.clientX || e.touches?.[0]?.clientX || 0; r.prevY = e.clientY || e.touches?.[0]?.clientY || 0; };
        const onMove = (e) => {
          if (!r.isDown) return;
          const cx = e.clientX || e.touches?.[0]?.clientX || 0;
          const cy = e.clientY || e.touches?.[0]?.clientY || 0;
          r.theta -= (cx - r.prevX) * 0.01;
          r.phi = Math.max(0.1, Math.min(Math.PI - 0.1, r.phi - (cy - r.prevY) * 0.01));
          r.prevX = cx; r.prevY = cy;
        };
        const onUp = () => { r.isDown = false; };
        const onWheel = (e) => { e.preventDefault(); r.dist = Math.max(5, Math.min(150, r.dist * (1 + e.deltaY * 0.001))); };
        renderer.domElement.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
        renderer.domElement.addEventListener('touchstart', onDown);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onUp);

        const animate = () => {
          if (disposed) return;
          const r = rotateRef.current;
          if (!r.isDown) r.theta += 0.003;  // idle rotation
          camera.position.set(r.dist * Math.sin(r.phi) * Math.cos(r.theta), r.dist * Math.cos(r.phi), r.dist * Math.sin(r.phi) * Math.sin(r.theta));
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
          animFrame = requestAnimationFrame(animate);
        };
        animate();
      } catch (e) {
        console.warn('Preview load fail:', e);
        setLoading(false);
      }
    };
    init();

    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      disposed = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      ro.disconnect();
      if (renderer) { renderer.dispose(); try { mount.removeChild(renderer.domElement); } catch {} }
    };
  }, [libId, fileName, color]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={ref} style={{ flex: 1, minHeight: 300, background: "#0a1420", borderRadius: 10, position: "relative", cursor: "grab", touchAction: "none" }}>
        {loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.teal, fontFamily: C.font, fontSize: 13 }}>LOADING 3D MODEL…</div>}
      </div>
      {info && (
        <div style={{ marginTop: 14, padding: "14px 18px", background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontFamily: C.font, fontWeight: 700 }}>TYPE</div>
              <div style={{ fontSize: 16, color: C.ink, fontWeight: 700, marginTop: 2 }}>{info.label}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontFamily: C.font, fontWeight: 700 }}>WIDTH</div>
              <div style={{ fontSize: 16, color: C.ink, fontFamily: C.font, marginTop: 2 }}>{info.width}mm</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontFamily: C.font, fontWeight: 700 }}>HEIGHT</div>
              <div style={{ fontSize: 16, color: C.ink, fontFamily: C.font, marginTop: 2 }}>{info.depth}mm</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontFamily: C.font, fontWeight: 700 }}>TRIANGLES</div>
              <div style={{ fontSize: 16, color: C.ink, fontFamily: C.font, marginTop: 2 }}>{info.triCount.toLocaleString()}</div>
            </div>
          </div>
          {onAdd && (
            <button onClick={onAdd} style={{
              marginTop: 14, width: "100%", padding: "14px 18px", borderRadius: 8,
              background: C.teal, color: "white", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: C.sans,
              boxShadow: `0 4px 16px ${C.teal}40`,
            }}>
              ➕ Use This Tooth in Active Patient Case
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function ToothLibraryBrowser({ navigate, activePatient }) {
  const [favorites, setFavorites] = useState([]);
  const [activePack, setActivePack] = useState(LIBRARY_PACKS[0].id);
  const [selected, setSelected] = useState(null);  // { libId, fileName }
  const [filter, setFilter] = useState("all");
  const [shadeColor, setShadeColor] = useState(0xf0e4d0);

  // Load favorites
  useEffect(() => {
    try {
      const saved = localStorage.getItem('restora-lib-favorites');
      setFavorites(saved ? JSON.parse(saved) : []);
    } catch { setFavorites([]); }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('restora-lib-favorites', JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  function toggleFavorite(libId) {
    setFavorites(f => f.includes(libId) ? f.filter(x => x !== libId) : [...f, libId]);
  }

  function useTooth() {
    if (!selected) return;
    // Stash selection for Restoration CAD to pick up
    sessionStorage.setItem('restora-queued-tooth', JSON.stringify(selected));
    if (navigate) navigate('restoration-cad');
  }

  function applyWholeLibrary() {
    // Stash which library to apply — Restoration CAD picks it up and places
    // all teeth matching patient's labels in one go
    sessionStorage.setItem('restora-queued-library', activePack);
    if (navigate) navigate('restoration-cad');
  }

  // Sort packs: favorites first
  const sortedPacks = useMemo(() => {
    const favs = LIBRARY_PACKS.filter(p => favorites.includes(p.id));
    const rest = LIBRARY_PACKS.filter(p => !favorites.includes(p.id));
    return [...favs, ...rest];
  }, [favorites]);

  const pack = LIBRARY_PACKS.find(p => p.id === activePack) || LIBRARY_PACKS[0];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: C.sans, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: C.ink }}>Tooth Library</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>
              Browse, preview, and choose tooth shapes for restoration cases
              {activePatient && <span style={{ color: C.teal }}> · Active: {activePatient.name}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: C.muted, fontFamily: C.font }}>FILTER</label>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, color: C.ink, fontSize: 14, fontFamily: C.sans, outline: "none" }}>
              <option value="all">All teeth</option>
              <option value="incisor">Incisors</option>
              <option value="canine">Canines</option>
              <option value="premolar">Premolars</option>
              <option value="molar">Molars</option>
            </select>
            <label style={{ fontSize: 13, color: C.muted, fontFamily: C.font, marginLeft: 8 }}>COLOR</label>
            <select value={shadeColor} onChange={e => setShadeColor(+e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2, color: C.ink, fontSize: 14, fontFamily: C.sans, outline: "none" }}>
              <option value={0xf0e4d0}>Natural ivory</option>
              <option value={0xfdfcf7}>BL1 (brightest)</option>
              <option value={0xfbf9f0}>BL2</option>
              <option value={0xf5ead0}>A1</option>
              <option value={0xf0e0b8}>A2</option>
              <option value={0xe8d4a0}>A3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Body: 3-column layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: pack list */}
        <div style={{ width: 260, borderRight: `1px solid ${C.border}`, overflow: "auto", background: C.surface, padding: "14px 0" }}>
          {favorites.length > 0 && (
            <div style={{ padding: "6px 18px 4px", fontSize: 12, fontFamily: C.font, color: C.amber, letterSpacing: 2, fontWeight: 700 }}>
              ⭐ FAVORITES
            </div>
          )}
          {sortedPacks.map(p => {
            const isActive = p.id === activePack;
            const isFav = favorites.includes(p.id);
            return (
              <div key={p.id}>
                {/* Show a SECTION divider between favorites and rest */}
                {favorites.length > 0 && !isFav && sortedPacks.findIndex(x => !favorites.includes(x.id)) === sortedPacks.indexOf(p) && (
                  <div style={{ padding: "12px 18px 4px", fontSize: 12, fontFamily: C.font, color: C.muted, letterSpacing: 2, fontWeight: 700 }}>
                    ALL LIBRARIES
                  </div>
                )}
                <div
                  onClick={() => setActivePack(p.id)}
                  style={{
                    padding: "14px 18px",
                    borderLeft: `4px solid ${isActive ? p.color : "transparent"}`,
                    background: isActive ? C.tealDim : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.surface2; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? C.teal : C.ink, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>{p.files.length} teeth · {p.tag}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}
                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: isFav ? C.amber + "30" : "transparent",
                      border: `1px solid ${isFav ? C.amber : C.borderSoft}`,
                      color: isFav ? C.amber : C.muted,
                      cursor: "pointer", fontSize: 16, padding: 0,
                    }}>{isFav ? "★" : "☆"}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER: thumbnail grid */}
        <div style={{ flex: 1, overflow: "auto", padding: 20, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: pack.color, marginBottom: 4 }}>{pack.name}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{pack.description}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pack.recommendedFor.map(r => (
                  <span key={r} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: pack.color + "20", color: pack.color, fontFamily: C.font, fontWeight: 600 }}>{r}</span>
                ))}
              </div>
            </div>
            {activePatient && pack.files.length >= 5 && (
              <button onClick={applyWholeLibrary}
                style={{
                  padding: "14px 20px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${pack.color}, ${C.teal})`,
                  color: "white",
                  border: "none",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: C.sans,
                  boxShadow: `0 6px 24px ${pack.color}50`,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                title={`Apply ${pack.name} to all target teeth in ${activePatient.name}'s case`}
              >
                ✨ Apply Whole Library →
              </button>
            )}
          </div>
          {activePatient && pack.files.length >= 5 && (
            <div style={{ padding: "10px 14px", marginBottom: 18, borderRadius: 7, background: C.tealDim, border: `1px solid ${C.tealBorder}`, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
              ℹ️ <strong>Apply Whole Library</strong> places matched teeth at ALL your labeled target positions in one click. Label the target teeth in Restoration CAD first (#4-#13 for {activePatient.name}'s case), then return here and click Apply.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
            {pack.files.map(f => {
              const isSelected = selected && selected.libId === pack.id && selected.fileName === f;
              return (
                <div key={f}
                  onClick={() => setSelected({ libId: pack.id, fileName: f })}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 10,
                    background: isSelected ? C.tealDim : C.surface,
                    border: `1.5px solid ${isSelected ? C.teal : C.border}`,
                    transition: "all 0.12s",
                  }}>
                  <ThumbRenderer libId={pack.id} fileName={f} size={120} color={shadeColor} />
                  <div style={{ marginTop: 8, fontSize: 13, color: C.ink, fontWeight: 600, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.replace('.stl', '')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: large preview */}
        <div style={{ width: 480, borderLeft: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column", padding: 20, flexShrink: 0 }}>
          {selected ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontFamily: C.font, color: C.teal, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>PREVIEW</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>
                  {selected.libId} · {selected.fileName.replace('.stl', '')}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Drag to rotate · scroll to zoom · auto-rotates when idle</div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <LargePreview libId={selected.libId} fileName={selected.fileName} color={shadeColor}
                  onAdd={activePatient ? useTooth : null} />
              </div>
              {!activePatient && (
                <div style={{ marginTop: 12, padding: "12px 14px", background: C.amber + "15", border: `1px solid ${C.amber}50`, borderRadius: 7, fontSize: 13, color: C.amber, lineHeight: 1.5 }}>
                  Select a patient on the Dashboard first to add teeth to a case.
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: C.muted, textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🦷</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Select a tooth</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                Click any thumbnail in the center grid to preview it in full 3D here. Rotate, zoom, and inspect the shape before adding to a patient case.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
