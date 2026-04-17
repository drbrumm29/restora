import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { PATIENTS } from "./patient-cases.js";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#ffffff", muted:"#e0ecf8", light:"#c0d4ea",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.18)", tealBorder:"rgba(10,186,181,.45)",
  amber:"#f59e0b", red:"#ef4444", green:"#10b981", blue:"#0891b2",
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
function STLViewer({ meshes, activeId, onSelect, wireframe, background, onStats, labelMode, toothLabels, onAddLabel, targetTeeth, onPickedLocation, viewAngle, orientFlip }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshObjectsRef = useRef({}); // id -> THREE.Mesh
  const labelGroupRef = useRef(null); // THREE.Group for badge sprites
  const flipGroupRef = useRef(null); // THREE.Group for user-controllable orientation flip
  const rafRef = useRef(0);
  const rotateRef = useRef({ isDragging:false, prevX:0, prevY:0, theta:Math.PI/2, phi:Math.PI/2.3, dist:50, dragDist:0 });
  const raycasterRef = useRef(null);
  const labelModeRef = useRef(labelMode);
  useEffect(() => { labelModeRef.current = labelMode; }, [labelMode]);

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

    // Label group holds all tooth number badges
    const labelGroup = new THREE.Group();
    scene.add(labelGroup);
    labelGroupRef.current = labelGroup;

    // Flip group — wraps all arch meshes, user-controllable X/Y/Z sign
    const flipGroup = new THREE.Group();
    scene.add(flipGroup);
    flipGroupRef.current = flipGroup;

    // Raycaster for click-to-label
    raycasterRef.current = new THREE.Raycaster();

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
    r.updateCamera = updateCamera;  // expose for preset animation
    updateCamera();

    const onDown = (e) => {
      r.isDragging = true;
      r.prevX = e.clientX || e.touches?.[0]?.clientX || 0;
      r.prevY = e.clientY || e.touches?.[0]?.clientY || 0;
      r.startX = r.prevX; r.startY = r.prevY;
      r.dragDist = 0;
    };
    const onMove = (e) => {
      if (!r.isDragging) return;
      const cx = e.clientX || e.touches?.[0]?.clientX || 0;
      const cy = e.clientY || e.touches?.[0]?.clientY || 0;
      if (!labelModeRef.current) {
        r.theta -= (cx - r.prevX) * 0.008;
        r.phi = r.phi - (cy - r.prevY) * 0.008;
        // No clamp — full rotation allowed. Wrap phi into (-π, π) range for numerical stability.
        while (r.phi > Math.PI * 2) r.phi -= Math.PI * 2;
        while (r.phi < -Math.PI * 2) r.phi += Math.PI * 2;
        updateCamera();
      }
      r.dragDist += Math.abs(cx - r.prevX) + Math.abs(cy - r.prevY);
      r.prevX = cx; r.prevY = cy;
    };
    const onUp = (e) => {
      const wasClick = r.isDragging && r.dragDist < 5;
      r.isDragging = false;
      if (wasClick && labelModeRef.current && onPickedLocation) {
        // Raycast to find tooth surface hit point
        const rect = el.getBoundingClientRect();
        const cx = (e.clientX || e.changedTouches?.[0]?.clientX || r.prevX) - rect.left;
        const cy = (e.clientY || e.changedTouches?.[0]?.clientY || r.prevY) - rect.top;
        const mouse = new THREE.Vector2(
          (cx / rect.width) * 2 - 1,
          -(cy / rect.height) * 2 + 1
        );
        const rc = raycasterRef.current;
        rc.setFromCamera(mouse, camera);
        // Raycast against ALL visible meshes (not just filtered by name)
        const visibleMeshes = Object.values(meshObjectsRef.current).filter(o => o.visible);
        const hits = rc.intersectObjects(visibleMeshes, false);
        if (hits.length > 0) {
          // Hit point is in world space. Meshes are shifted by centerOffset,
          // so convert back to original scan coordinates for storage.
          const p = hits[0].point;
          const offset = r.centerOffset || { x:0, y:0, z:0 };
          onPickedLocation({
            x: p.x - offset.x,
            y: p.y - offset.y,
            z: p.z - offset.z,
          });
        }
      }
    };
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

        // ── Auto-orient arch meshes via bounding-box principal axes ──
        // We don't trust the scanner's export convention. Instead, measure the
        // mesh and map its physical axes to Three.js axes:
        //   widest axis  → Three.js X (left-right across arch)
        //   2nd-widest   → Three.js Z (anterior-posterior — front of mouth)
        //   narrowest    → Three.js Y (occlusal-gingival height)
        //
        // Only applies to arch meshes (upper/lower). Library teeth (crown) and
        // single-tooth meshes skip this.
        if (m.slot === 'upper' || m.slot === 'lower') {
          geom.computeBoundingBox();
          const size = new THREE.Vector3();
          geom.boundingBox.getSize(size);

          // Rank axes by extent
          const axes = [
            { axis: 'x', extent: size.x },
            { axis: 'y', extent: size.y },
            { axis: 'z', extent: size.z },
          ].sort((a, b) => b.extent - a.extent);

          const widestAxis = axes[0].axis;      // → target Three.js X
          const mediumAxis = axes[1].axis;      // → target Three.js Z
          const narrowAxis = axes[2].axis;      // → target Three.js Y

          // Build remap: sourceAxis index → targetAxis index in final (x,y,z)
          // We need a rotation matrix such that:
          //   (v_widest, v_medium, v_narrow) → (v'_x, v'_z, v'_y)
          // i.e. the coord on the widest axis becomes X, medium becomes Z, narrow becomes Y
          const axisIndex = { x: 0, y: 1, z: 2 };
          const sourceToTarget = [null, null, null];  // sourceToTarget[srcIdx] = tgtIdx
          sourceToTarget[axisIndex[widestAxis]] = 0;   // → X
          sourceToTarget[axisIndex[mediumAxis]] = 2;   // → Z
          sourceToTarget[axisIndex[narrowAxis]] = 1;   // → Y

          // Apply the permutation to each vertex
          const positions = geom.attributes.position.array;
          const newPositions = new Float32Array(positions.length);
          for (let i = 0; i < positions.length; i += 3) {
            const v = [positions[i], positions[i+1], positions[i+2]];
            for (let s = 0; s < 3; s++) {
              newPositions[i + sourceToTarget[s]] = v[s];
            }
          }
          geom.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));

          // Also permute normals if present
          if (geom.attributes.normal) {
            const normals = geom.attributes.normal.array;
            const newNormals = new Float32Array(normals.length);
            for (let i = 0; i < normals.length; i += 3) {
              const n = [normals[i], normals[i+1], normals[i+2]];
              for (let s = 0; s < 3; s++) {
                newNormals[i + sourceToTarget[s]] = n[s];
              }
            }
            geom.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
          }

          // After permutation, we know X=L-R, Z=A-P, Y=height. But we don't yet
          // know the SIGN: is occlusal +Y or -Y? Is anterior +Z or -Z?
          // Heuristic: for upper arch, occlusal should be BELOW gingiva in camera
          // view (teeth point down). That means teeth should be at Y < 0.
          // Determine by vertex density: the occlusal side has more vertices in
          // the tooth region. Here we use a simpler heuristic: flip axes so the
          // mesh centroid is at origin with expected directions.
          geom.computeBoundingBox();
          const bb = geom.boundingBox;
          const yRange = bb.max.y - bb.min.y;

          // Heuristic: the gingival/base side is a single continuous surface that fills
          // most of the XZ footprint. The occlusal side has individual teeth with air
          // gaps between them — fewer XZ cells covered in a thin slab at that extreme.
          // Count unique grid cells (in XZ plane) with vertices present in each Y-slab.
          function slabCoverage(yMin, yMax) {
            const pos = geom.attributes.position.array;
            const cellSize = 1.0; // mm
            const cells = new Set();
            for (let i = 0; i < pos.length; i += 3) {
              const y = pos[i+1];
              if (y >= yMin && y <= yMax) {
                const cx = Math.floor(pos[i] / cellSize);
                const cz = Math.floor(pos[i+2] / cellSize);
                cells.add(`${cx},${cz}`);
              }
            }
            return cells.size;
          }
          const slabDepth = yRange * 0.08;
          const topCoverage = slabCoverage(bb.max.y - slabDepth, bb.max.y);
          const bottomCoverage = slabCoverage(bb.min.y, bb.min.y + slabDepth);
          // The side with GREATER coverage is the gingival/base side
          const gingivaAtTop = topCoverage > bottomCoverage;
          // For UPPER arch: gingiva should be at TOP (+Y), teeth at BOTTOM (-Y)
          // For LOWER arch: gingiva at BOTTOM (-Y), teeth at TOP (+Y)
          const needFlipY = (m.slot === 'upper' && !gingivaAtTop) || (m.slot === 'lower' && gingivaAtTop);
          if (needFlipY) {
            const pos = geom.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) pos[i+1] = -pos[i+1];
            if (geom.attributes.normal) {
              const nor = geom.attributes.normal.array;
              for (let i = 0; i < nor.length; i += 3) nor[i+1] = -nor[i+1];
            }
            geom.attributes.position.needsUpdate = true;
            if (geom.attributes.normal) geom.attributes.normal.needsUpdate = true;
          }

          geom.computeBoundingBox();
        } else {
          // Non-arch meshes (library teeth, preps, bite) — keep legacy rotation
          geom.rotateX(Math.PI / 2);
        }

        // For library teeth (crown slot): center geometry on its own bbox
        // so the pivot is at tooth center. This makes rotate/scale feel natural.
        if (m.slot === 'crown') {
          geom.computeBoundingBox();
          const c = new THREE.Vector3();
          geom.boundingBox.getCenter(c);
          geom.translate(-c.x, -c.y, -c.z);
        }
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
        (flipGroupRef.current || scene).add(obj);
        meshObjectsRef.current[m.id] = obj;
        obj.userData.isFresh = true;
      }
      obj.visible = m.visible !== false;
      obj.material.wireframe = wireframe;
      obj.material.color.set(m.id === activeId ? (m.highlightColor || 0x0abab5) : (m.color || 0xe8d8c4));
      obj.material.opacity = m.opacity ?? 1;
      obj.material.transparent = (m.opacity ?? 1) < 1;

      // For library teeth (crown): apply placement + transform
      if (m.slot === 'crown' && rotateRef.current.centerOffset) {
        const off = rotateRef.current.centerOffset;
        const t = m.transform || { tx:0, ty:0, tz:0, rx:0, ry:0, rz:0, scale:1 };
        // Base position: if placement (from applyDesignLibrary) use labelX/Y/Z in world space
        // else fallback to scene center + 15mm above
        let baseX, baseY, baseZ;
        if (m.placement) {
          baseX = m.placement.labelX + off.x;
          baseY = m.placement.labelY + off.y;
          baseZ = m.placement.labelZ + off.z;
        } else {
          baseX = off.x; baseY = off.y + 15; baseZ = off.z;
        }
        obj.position.set(baseX + t.tx, baseY + t.ty, baseZ + t.tz);
        // Rotation
        obj.rotation.set(
          (t.rx || 0) * Math.PI / 180,
          (t.ry || 0) * Math.PI / 180,
          (t.rz || 0) * Math.PI / 180,
        );
        // Scale — negative X for mirrored (patient-left) teeth
        const s = t.scale || 1;
        const xSign = m.placement?.mirrored ? -1 : 1;
        obj.scale.set(s * xSign, s, s);
        obj.userData.isFresh = false;
      }

      if (obj.visible) {
        tmpBox.setFromObject(obj);
        bbox.union(tmpBox);
        totalTris += m.triCount;
      }
    });

    // Auto-center + fit ONCE on initial load (don't recenter on visibility toggles)
    if (meshes.length === 0) {
      // Reset centering flag so next patient load re-centers
      rotateRef.current.hasInitialCentered = false;
      rotateRef.current.centerOffset = null;
    }
    if (!bbox.isEmpty() && meshes.length > 0 && !rotateRef.current.hasInitialCentered) {
      const center = new THREE.Vector3(); bbox.getCenter(center);
      const size = new THREE.Vector3(); bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      // Shift all meshes so scene center is at origin
      Object.values(meshObjectsRef.current).forEach(o => {
        o.position.set(-center.x, -center.y, -center.z);
      });
      rotateRef.current.centerOffset = { x:-center.x, y:-center.y, z:-center.z };
      rotateRef.current.hasInitialCentered = true;
      rotateRef.current.dist = Math.max(10, maxDim * 1.8);
    }

    onStats?.({ meshCount: meshes.filter(m=>m.visible!==false).length, triCount: totalTris });
  }, [meshes, activeId, wireframe]);

  // Apply user orientation flip to the scene-level flipGroup
  useEffect(() => {
    const g = flipGroupRef.current;
    if (!g) return;
    g.scale.set(
      orientFlip?.x ? -1 : 1,
      orientFlip?.y ? -1 : 1,
      orientFlip?.z ? -1 : 1,
    );
  }, [orientFlip]);

  // ── Tooth label badges (sprite-based, always face camera) ──
  useEffect(() => {
    const group = labelGroupRef.current;
    if (!group) return;
    // Clear existing labels
    while (group.children.length > 0) {
      const s = group.children[0];
      group.remove(s);
      if (s.material?.map) s.material.map.dispose();
      if (s.material) s.material.dispose();
    }
    if (!toothLabels || toothLabels.length === 0) return;
    // Legacy labels from old 3D workflow are hidden in Scan Viewer.
    // Design workflow moved to Smile Creator (2D).
    return;
    const offset = rotateRef.current.centerOffset || { x:0, y:0, z:0 };

    toothLabels.forEach(lbl => {
      const isTarget = (targetTeeth || []).includes(lbl.num);
      // Build text canvas
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      // Background circle
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI*2);
      ctx.fillStyle = isTarget ? 'rgba(10,186,181,0.95)' : 'rgba(26,47,72,0.9)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = isTarget ? 'rgba(255,255,255,0.8)' : 'rgba(10,186,181,0.6)';
      ctx.stroke();
      // Text
      ctx.fillStyle = isTarget ? 'white' : '#0abab5';
      ctx.font = 'bold 58px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(lbl.num), 64, 66);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(lbl.x + offset.x, lbl.y + offset.y, lbl.z + offset.z);
      sprite.scale.set(3.5, 3.5, 1);
      sprite.renderOrder = 999;
      group.add(sprite);
    });
  }, [toothLabels, targetTeeth, meshes]);

  // ── View preset snapping (front/back/left/right/top/bottom/iso) ──
  useEffect(() => {
    if (!viewAngle || !rotateRef.current.updateCamera) return;
    // Target angles in spherical coordinates
    const presets = {
      front:  { theta: Math.PI/2,       phi: Math.PI/2 },       // looking at +Z
      back:   { theta: -Math.PI/2,      phi: Math.PI/2 },       // looking at -Z
      left:   { theta: Math.PI,         phi: Math.PI/2 },       // looking at -X
      right:  { theta: 0,               phi: Math.PI/2 },       // looking at +X
      top:    { theta: Math.PI/2,       phi: 0.15 },            // looking down
      bottom: { theta: Math.PI/2,       phi: Math.PI - 0.15 },  // looking up
      iso:    { theta: Math.PI/4,       phi: Math.PI/3 },       // isometric default
    };
    const target = presets[viewAngle];
    if (!target) return;
    const r = rotateRef.current;
    const startTheta = r.theta;
    const startPhi = r.phi;
    // Normalize theta diff to shortest path
    let dTheta = target.theta - startTheta;
    while (dTheta > Math.PI) dTheta -= 2*Math.PI;
    while (dTheta < -Math.PI) dTheta += 2*Math.PI;
    const dPhi = target.phi - startPhi;
    // Animate
    const duration = 400;
    const start = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
      r.theta = startTheta + dTheta * ease;
      r.phi = startPhi + dPhi * ease;
      r.updateCamera();
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [viewAngle]);

  return <div ref={mountRef} style={{ width:"100%", height:"100%", position:"relative", cursor: labelMode ? "crosshair" : "grab", touchAction:"none" }}/>;
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

// VITA + Bleach shade → hex (approximate tooth shade colors)
const SHADE_HEX = {
  "BL1":  0xfdfcf7, "BL2":  0xfbf9f0, "BL3":  0xf9f5e8, "BL4":  0xf7f1df,
  "A1":   0xf5ead0, "A2":   0xf0e0b8, "A3":   0xe8d4a0, "A3.5": 0xe0c888, "A4": 0xd4b870,
  "B1":   0xf8ecd0, "B2":   0xf2deb8, "B3":   0xeacfa0,
  "C1":   0xe8d8b8, "C2":   0xddc8a0,
  "eMax LT": 0xf4ead0, "eMax MT": 0xf4ead0, "eMax HT": 0xfbf5e8,
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
  const [labelMode, setLabelMode] = useState(false);
  const [toothLabels, setToothLabels] = useState([]);  // [{num, x, y, z}, ...]
  const [pendingPick, setPendingPick] = useState(null); // { x, y, z }
  const [viewAngle, setViewAngle] = useState(null);    // 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'
  // Manual orientation flip — persisted per patient, lets user override auto-orient
  const [orientFlip, setOrientFlip] = useState(() => {
    try {
      const saved = localStorage.getItem('restora-orient-flip');
      return saved ? JSON.parse(saved) : { x: false, y: false, z: false };
    } catch { return { x: false, y: false, z: false }; }
  });
  useEffect(() => {
    try { localStorage.setItem('restora-orient-flip', JSON.stringify(orientFlip)); } catch {}
  }, [orientFlip]);

  const patient = activePatient || PATIENTS[0];

  // Parse target teeth from patient.teeth (e.g. "#4-#13" → [4,5,6,7,8,9,10,11,12,13])
  const targetTeeth = useMemo(() => {
    if (!patient?.teeth) return [];
    const teeth = [];
    const text = String(patient.teeth).replace(/#/g, '');
    // Handle ranges like "4-13" and comma lists like "8,9" or "7-10"
    text.split(/[,\s]+/).forEach(part => {
      const range = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (range) {
        const a = +range[1], b = +range[2];
        for (let i = Math.min(a,b); i <= Math.max(a,b); i++) teeth.push(i);
      } else if (/^\d+$/.test(part)) {
        teeth.push(+part);
      }
    });
    return teeth;
  }, [patient?.teeth]);

  // Load labels from localStorage per-patient
  useEffect(() => {
    if (!patient?.id) return;
    try {
      const saved = localStorage.getItem(`restora-labels-${patient.id}`);
      setToothLabels(saved ? JSON.parse(saved) : []);
    } catch { setToothLabels([]); }
  }, [patient?.id]);

  // Save labels on change
  useEffect(() => {
    if (!patient?.id) return;
    try {
      localStorage.setItem(`restora-labels-${patient.id}`, JSON.stringify(toothLabels));
    } catch {}
  }, [toothLabels, patient?.id]);

  // Update library teeth color when shade changes
  useEffect(() => {
    const newColor = SHADE_HEX[shade] ?? SHADE_HEX.A1;
    setMeshes(ms => ms.map(m =>
      m.slot === 'crown' ? { ...m, color: newColor } : m
    ));
  }, [shade]);

  // Pick up any queued tooth from ToothLibraryBrowser's "Use This Tooth" button
  useEffect(() => {
    const queuedTooth = sessionStorage.getItem('restora-queued-tooth');
    const queuedLibrary = sessionStorage.getItem('restora-queued-library');
    if (!queuedTooth && !queuedLibrary) return;

    // Wait for patient meshes + labels to be loaded
    const timer = setTimeout(() => {
      if (queuedLibrary) {
        sessionStorage.removeItem('restora-queued-library');
        applyDesignLibrary(queuedLibrary);
      } else if (queuedTooth) {
        try {
          const { libId, fileName } = JSON.parse(queuedTooth);
          sessionStorage.removeItem('restora-queued-tooth');
          addLibraryTooth(libId, fileName);
        } catch {}
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [patient?.id]);

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
        id,
        name: fileName,
        slot: 'crown',
        label: `${libId} · ${fileName.replace('.stl','')}`,
        positions, normals, triCount,
        color: SHADE_HEX[shade] ?? SHADE_HEX.A1,   // use selected shade color
        highlightColor: 0x0abab5,
        visible: true,
        opacity: 1,
        // Transform — user adjusts these via gizmo panel
        transform: {
          tx: 0, ty: 0, tz: 0,          // translation (mm)
          rx: 0, ry: 0, rz: 0,          // rotation (degrees)
          scale: 1,                      // uniform scale
        },
      }]);
      setActive(id);
      setShowLib(false);
    } finally {
      setLoading(false);
    }
  }

  // ── Apply Design Library — ONE CLICK loads matched teeth at all labeled positions
  // Uses the user's tooth number labels to determine which teeth to place and where.
  // Each library tooth auto-positioned at its label coord, sized to adjacent spacing,
  // oriented outward from arch centroid.
  async function applyDesignLibrary(libId) {
    // Must have labels first
    if (toothLabels.length < 2) {
      alert("Label the target teeth first, then apply the design library. Use 🏷 Label Teeth to place at least 2 labels (e.g. #4 and #13), then ✨ Auto-Number to fill the rest.");
      return;
    }

    // Map Universal tooth numbers → library file names
    // Library convention (dannydesigner, g01/g02): files 1-8 follow:
    //   1 = central incisor, 2 = lateral incisor, 3 = canine,
    //   4 = 1st premolar, 5 = 2nd premolar, 6 = 1st molar, 7 = 2nd molar, 8 = 3rd molar
    function fileForTooth(num) {
      // Upper right (#1-8) and upper left (#9-16) mirror each other
      // #8 and #9 = centrals, #7 and #10 = laterals, #6 and #11 = canines, etc.
      const mirrored = num > 8 ? num : (17 - num);
      // Mirrored maps 1→16, 2→15... 8→9, 9→8 so upper right #8 maps to #9 position
      // Simpler: distance from midline determines tooth type
      const distFromMidline = num >= 9 ? num - 8 : 9 - num;
      const map = {
        1: "1.stl",  // central incisor
        2: "2.stl",  // lateral incisor
        3: "3.stl",  // canine
        4: "4.stl",  // 1st premolar
        5: "5.stl",  // 2nd premolar
        6: "6.stl",  // 1st molar
        7: "7.stl",  // 2nd molar
        8: "8.stl",  // 3rd molar
      };
      return map[distFromMidline] || "1.stl";
    }

    // Determine arch centroid from labels — for outward orientation
    const labels = [...toothLabels].sort((a,b) => a.num - b.num);
    const centroid = labels.reduce((acc, l) => ({
      x: acc.x + l.x / labels.length,
      y: acc.y + l.y / labels.length,
      z: acc.z + l.z / labels.length,
    }), { x:0, y:0, z:0 });

    // Compute typical spacing between adjacent labels for scale estimation
    let totalSpacing = 0, pairCount = 0;
    for (let i = 0; i < labels.length - 1; i++) {
      if (labels[i+1].num === labels[i].num + 1) {
        const dx = labels[i+1].x - labels[i].x;
        const dy = labels[i+1].y - labels[i].y;
        const dz = labels[i+1].z - labels[i].z;
        totalSpacing += Math.hypot(dx, dy, dz);
        pairCount++;
      }
    }
    const avgSpacing = pairCount > 0 ? totalSpacing / pairCount : 8;  // default 8mm if can't compute
    // Typical tooth mesiodistal width is ~8mm (central) down to ~6mm (lateral/premolar)
    // Library teeth are already ~6-10mm wide, so the scale factor is ~1.0 in most cases
    // Fine-tune by user afterwards

    // Remove any existing library teeth (crown slot) — user wants a fresh set
    const existingCrownIds = meshes.filter(m => m.slot === 'crown').map(m => m.id);

    setLoading(true);
    const newTeeth = [];
    try {
      // Load each tooth's STL in parallel
      const results = await Promise.all(labels.map(async (label) => {
        const fileName = fileForTooth(label.num);
        try {
          const resp = await fetch(`/libraries/${libId}/${fileName}`);
          if (!resp.ok) return null;
          const buf = await resp.arrayBuffer();
          const { positions, normals, triCount } = parseSTL(buf);
          return { label, fileName, positions, normals, triCount };
        } catch { return null; }
      }));

      const now = Date.now();
      for (const r of results) {
        if (!r) continue;
        const { label, fileName, positions, normals, triCount } = r;

        // Compute outward direction from arch centroid to this tooth position
        // This tells us which way the tooth should "face" (facial surface normal)
        const outX = label.x - centroid.x;
        const outZ = label.z - centroid.z;
        const outLen = Math.hypot(outX, outZ);
        // Convert to a Y-axis rotation angle (yaw) — rotates tooth around vertical axis
        // to face outward. atan2 returns angle in radians, convert to degrees.
        const yawDeg = outLen > 0.1 ? (Math.atan2(outX, outZ) * 180 / Math.PI) : 0;

        // Mirror flag for left-side teeth (patient left = #9-#16)
        // Right-side teeth (#1-#8) use original library geometry
        // Left-side should mirror on X axis so cusp anatomy points correct way
        const isMirrored = label.num >= 9;

        newTeeth.push({
          id: `lib-${libId}-${label.num}-${now}`,
          name: fileName,
          slot: 'crown',
          toothNum: label.num,
          label: `#${label.num} · ${libId}/${fileName.replace('.stl','')}`,
          positions, normals, triCount,
          color: SHADE_HEX[shade] ?? SHADE_HEX.A1,
          highlightColor: 0x0abab5,
          visible: true,
          opacity: 1,
          // Placement info — used by viewer to position mesh at label
          placement: {
            labelX: label.x,
            labelY: label.y,
            labelZ: label.z,
            mirrored: isMirrored,
          },
          // Transform offsets — starts at identity, user fine-tunes
          transform: {
            tx: 0, ty: 0, tz: 0,
            rx: 0,
            ry: yawDeg,  // preset to face outward from arch
            rz: 0,
            scale: 1,
          },
        });
      }

      // Replace existing crown meshes with the new set
      setMeshes(ms => [
        ...ms.filter(m => !existingCrownIds.includes(m.id)),
        ...newTeeth,
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Update transform of selected library tooth
  function updateTransform(id, patch) {
    setMeshes(ms => ms.map(m =>
      m.id === id ? { ...m, transform: { ...m.transform, ...patch } } : m
    ));
  }

  // Auto-generate tooth numbers: user places 2+ anchor labels, app fills in the missing
  // teeth along a parabolic arch curve between consecutive anchor pairs.
  function autoNumberTeeth() {
    if (toothLabels.length < 2) {
      alert("Place at least 2 tooth labels first (the endpoints of the arch you want to number — e.g. #4 and #13). Then click Auto-Number again to fill in between.");
      return;
    }
    const sorted = [...toothLabels].sort((a,b) => a.num - b.num);
    const newLabels = [...toothLabels];

    // Compute an anterior direction from the label cluster:
    // The midpoint of the extreme labels should lie INSIDE the arch;
    // the anterior side is away from the arch centroid.
    // In post-rotation space: Z+ is anterior (faces camera in FRONT view),
    // so arch bulge should be +Z relative to the straight-line between anchors.
    // But robust auto-detect: take the label furthest from the a↔b midline
    // and use its displacement as the bulge reference.

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i+1];
      const gap = b.num - a.num;
      if (gap <= 1) continue;

      // Midpoint of this pair
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      // Chord direction (normalized)
      const chord = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const chordLen = Math.hypot(chord.x, chord.y, chord.z);

      // Find outward direction: try to use another anchor's displacement from midline,
      // else fall back to +Z (anterior in post-rotation dental coord).
      let outX = 0, outY = 0, outZ = 1;
      if (sorted.length >= 3) {
        // Pick the label that's NOT a or b but is roughly between them by tooth number
        const ref = sorted.find(l => l !== a && l !== b && l.num > a.num && l.num < b.num);
        if (ref) {
          // Project ref onto chord, find perpendicular component
          const refDisp = { x: ref.x - a.x, y: ref.y - a.y, z: ref.z - a.z };
          const chordDot = (refDisp.x*chord.x + refDisp.y*chord.y + refDisp.z*chord.z) / (chordLen * chordLen);
          outX = refDisp.x - chordDot * chord.x;
          outY = refDisp.y - chordDot * chord.y;
          outZ = refDisp.z - chordDot * chord.z;
          const outLen = Math.hypot(outX, outY, outZ);
          if (outLen > 0.01) {
            outX /= outLen; outY /= outLen; outZ /= outLen;
          } else {
            outX = 0; outY = 0; outZ = 1;
          }
        }
      }

      const bulgeAmount = chordLen * 0.15;  // 15% of chord length outward bulge

      for (let step = 1; step < gap; step++) {
        const num = a.num + step;
        if (newLabels.find(l => l.num === num)) continue;
        const t = step / gap;
        const bulge = 4 * t * (1 - t);  // parabolic, peaks at 1 in middle
        newLabels.push({
          num,
          x: a.x + (b.x - a.x) * t + outX * bulge * bulgeAmount,
          y: a.y + (b.y - a.y) * t + outY * bulge * bulgeAmount,
          z: a.z + (b.z - a.z) * t + outZ * bulge * bulgeAmount,
        });
      }
    }
    setToothLabels(newLabels.sort((a,b) => a.num - b.num));
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
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-.02em" }}>Scan Viewer</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
            {patient?.name ? `${patient.name}${patient.teeth ? ' · ' + patient.teeth : ''}` : "No patient loaded"} · {stats.meshCount} mesh · {stats.triCount.toLocaleString()} tris
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={()=>navigate && navigate('smile-creator')} style={{ padding:"10px 16px", borderRadius:8, background:`linear-gradient(135deg, ${C.teal}, ${C.purple})`, color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans, boxShadow:`0 3px 12px ${C.teal}50` }}>😊 Design in Smile Creator →</button>
          {/* Orientation flip controls — user can correct if auto-orient got it wrong */}
          <div style={{ display:"flex", gap:4, padding:"4px", borderRadius:10, background:C.surface2, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:11, color:C.muted, alignSelf:"center", padding:"0 8px", fontFamily:C.font, letterSpacing:1, fontWeight:700 }}>FLIP</span>
            {['x','y','z'].map(axis => (
              <button key={axis}
                onClick={()=>setOrientFlip(f => ({ ...f, [axis]: !f[axis] }))}
                title={axis === 'y' ? 'Flip upside-down / right-side-up' : axis === 'x' ? 'Mirror left-right' : 'Flip front-back'}
                style={{
                  width:34, height:30, borderRadius:6,
                  background: orientFlip[axis] ? C.teal : 'transparent',
                  color: orientFlip[axis] ? 'white' : C.ink,
                  border:`1px solid ${orientFlip[axis] ? C.teal : C.borderSoft}`,
                  fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:C.font, textTransform:"uppercase"
                }}>{axis}</button>
            ))}
          </div>
          <button onClick={()=>setWire(w=>!w)} style={{ padding:"10px 16px", borderRadius:8, background:wireframe?C.tealDim:C.surface2, color:wireframe?C.teal:C.muted, border:`1px solid ${wireframe?C.tealBorder:C.border}`, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:C.sans }}>{wireframe?"✓ Wireframe":"Wireframe"}</button>
          <button onClick={exportDesign} disabled={meshes.length===0} style={{ padding:"10px 16px", borderRadius:8, background:meshes.length?C.teal:C.surface2, color:meshes.length?"white":C.muted, border:"none", fontSize:14, fontWeight:700, cursor:meshes.length?"pointer":"not-allowed", fontFamily:C.sans }}>⬇ Export Scan STL</button>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex:1, display:"flex", minHeight:0 }}>
        {/* Viewer */}
        <div style={{ flex:1, position:"relative", minWidth:0, background:"#0a1420" }}>
          <STLViewer
            meshes={meshes}
            activeId={activeId}
            onSelect={setActive}
            wireframe={wireframe}
            background={bgColor}
            onStats={setStats}
            labelMode={labelMode}
            toothLabels={toothLabels}
            targetTeeth={targetTeeth}
            onPickedLocation={(loc) => setPendingPick(loc)}
            viewAngle={viewAngle}
            orientFlip={orientFlip}
          />

          {loading && (
            <div style={{ position:"absolute", top:16, left:16, padding:"10px 14px", borderRadius:8, background:C.surface+"ee", border:`1px solid ${C.border}`, fontSize:15, color:C.teal, fontFamily:C.font, fontWeight:700, letterSpacing:.8 }}>
              LOADING STL FILES…
            </div>
          )}

          {/* Universal numbering orientation — always visible */}
          {meshes.length > 0 && (
            <div style={{ position:"absolute", top:16, left:16, right: labelMode ? 420 : 260, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 14px", pointerEvents:"none", zIndex:2 }}>
              <div style={{ padding:"8px 14px", borderRadius:8, background:C.surface+"dd", border:`1px solid ${C.border}`, backdropFilter:"blur(6px)", fontSize:13, color:C.ink, fontFamily:C.font, letterSpacing:1, fontWeight:700 }}>
                ← PATIENT RIGHT (#1-#16)
              </div>
              <div style={{ padding:"8px 14px", borderRadius:8, background:C.surface+"dd", border:`1px solid ${C.border}`, backdropFilter:"blur(6px)", fontSize:13, color:C.ink, fontFamily:C.font, letterSpacing:1, fontWeight:700 }}>
                PATIENT LEFT (#17-#32) →
              </div>
            </div>
          )}

          {/* Label mode banner */}
          {labelMode && !pendingPick && (
            <div style={{ position:"absolute", top:60, left:"50%", transform:"translateX(-50%)", padding:"12px 20px", borderRadius:10, background:C.teal, color:"white", fontSize:16, fontWeight:700, fontFamily:C.sans, boxShadow:"0 4px 20px rgba(10,186,181,0.4)", zIndex:10 }}>
              🏷 Click any tooth to label it
              {targetTeeth.length > 0 && <span style={{ marginLeft:10, opacity:.85 }}> · Target: #{targetTeeth.join(", #")}</span>}
            </div>
          )}

          {/* Tooth number picker modal (shown when user clicks while in label mode) */}
          {pendingPick && (
            <div style={{ position:"absolute", inset:0, background:"rgba(10,20,32,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20, padding:20 }}>
              <div style={{ background:C.surface, border:`1.5px solid ${C.tealBorder}`, borderRadius:14, padding:24, maxWidth:560, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
                <div style={{ fontSize:16, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700, marginBottom:6 }}>ASSIGN TOOTH NUMBER</div>
                <div style={{ fontSize:15, color:C.ink, marginBottom:18 }}>
                  Which tooth did you click? (Universal #1-32)
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(8, 1fr)", gap:6, marginBottom:18 }}>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map(n => {
                    const isTarget = targetTeeth.includes(n);
                    const alreadyUsed = toothLabels.find(l => l.num === n);
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          setToothLabels(labels => [
                            ...labels.filter(l => l.num !== n),
                            { num: n, ...pendingPick }
                          ]);
                          setPendingPick(null);
                        }}
                        style={{
                          padding:"10px 4px",
                          borderRadius:7,
                          background: alreadyUsed ? C.amber+"30" : isTarget ? C.tealDim : C.surface2,
                          color: alreadyUsed ? C.amber : isTarget ? C.teal : C.ink,
                          border: `1.5px solid ${alreadyUsed ? C.amber : isTarget ? C.teal : C.border}`,
                          fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:C.font,
                        }}
                        title={alreadyUsed ? `#${n} already labeled — click to reassign` : isTarget ? `Target tooth for ${patient?.name}'s case` : ""}
                      >{n}</button>
                    );
                  })}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14, color:C.ink }}>
                  <span>
                    <span style={{ color:C.teal }}>■</span> Target teeth &nbsp;
                    <span style={{ color:C.amber }}>■</span> Already labeled
                  </span>
                  <button onClick={() => setPendingPick(null)}
                    style={{ padding:"8px 14px", borderRadius:6, background:"transparent", color:C.ink, border:`1px solid ${C.border}`, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* View preset toolbar */}
          <div style={{ position:"absolute", bottom:16, right:16, padding:"10px", borderRadius:10, background:C.surface+"ee", border:`1px solid ${C.border}`, backdropFilter:"blur(8px)", display:"grid", gridTemplateColumns:"repeat(3, 56px)", gap:6, zIndex:3 }}>
            {[
              { key:"top",    label:"TOP",    icon:"⬇", grid:{gridColumn:2, gridRow:1} },
              { key:"left",   label:"LEFT",   icon:"◀", grid:{gridColumn:1, gridRow:2} },
              { key:"front",  label:"FRONT",  icon:"●",  grid:{gridColumn:2, gridRow:2} },
              { key:"right",  label:"RIGHT",  icon:"▶", grid:{gridColumn:3, gridRow:2} },
              { key:"bottom", label:"BOT",    icon:"⬆", grid:{gridColumn:2, gridRow:3} },
              { key:"back",   label:"BACK",   icon:"○",  grid:{gridColumn:3, gridRow:3} },
              { key:"iso",    label:"3D",     icon:"◆",  grid:{gridColumn:1, gridRow:3} },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => { setViewAngle(null); setTimeout(()=>setViewAngle(btn.key), 10); }}
                title={btn.label + " view"}
                style={{
                  ...btn.grid,
                  padding:"10px 4px",
                  borderRadius:7,
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  color: C.ink,
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: C.font,
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  transition:"all .12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.tealDim; e.currentTarget.style.color = C.teal; e.currentTarget.style.borderColor = C.tealBorder; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
              >
                <span style={{ fontSize: 18, lineHeight:1 }}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ position:"absolute", bottom:16, left:16, padding:"12px 16px", borderRadius:8, background:C.surface+"dd", border:`1px solid ${C.border}`, fontSize:16, color:C.ink, backdropFilter:"blur(6px)" }}>
            <div style={{ fontFamily:C.font, letterSpacing:1.5, color:C.teal, fontWeight:700, marginBottom:6, fontSize:15 }}>CONTROLS</div>
            <div>Drag · rotate · Scroll · zoom</div>
            <div style={{ marginTop:4 }}>Touch: drag + pinch on mobile</div>
          </div>

          {/* Library picker (overlay) */}
          {showLib && (
            <div style={{ position:"absolute", top:16, right:16, width:340, maxHeight:"calc(100% - 32px)", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.4)", padding:18, overflow:"auto", zIndex:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:15, fontFamily:C.font, color:C.purple, letterSpacing:2, fontWeight:700 }}>TOOTH LIBRARY</span>
                <button onClick={()=>setShowLib(false)} style={{ background:"none", border:"none", color:C.ink, cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
              {toothLabels.length >= 2 && (
                <div style={{ padding:"10px 12px", marginBottom:14, borderRadius:8, background:C.tealDim, border:`1px solid ${C.tealBorder}`, fontSize:12, color:C.ink, lineHeight:1.5 }}>
                  ✨ <strong>Apply Whole Library</strong> — places matched teeth at all {toothLabels.length} labeled positions in one click.
                </div>
              )}
              {libs.map(lib => (
                <div key={lib.id} style={{ marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${C.borderSoft}` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>{lib.label}</div>
                    {toothLabels.length >= 2 && (lib.teeth?.length >= 5 || lib.files?.length >= 5) && (
                      <button
                        onClick={() => { applyDesignLibrary(lib.id); setShowLib(false); }}
                        style={{ padding:"6px 10px", borderRadius:6, background:C.teal, color:"white", border:"none", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:C.sans, whiteSpace:"nowrap" }}
                        title="Apply all matched teeth at labeled positions"
                      >✨ Apply All →</button>
                    )}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {(lib.teeth || []).map(n => (
                      <button key={n} onClick={()=>addLibraryTooth(lib.id, `${n}.stl`)}
                        style={{ width:38, height:38, borderRadius:7, background:C.surface2, border:`1px solid ${C.border}`, color:C.ink, cursor:"pointer", fontSize:16, fontFamily:C.font, fontWeight:700 }}>
                        {n}
                      </button>
                    ))}
                    {(lib.files || []).map(f => (
                      <button key={f} onClick={()=>addLibraryTooth(lib.id, f)}
                        style={{ padding:"8px 12px", borderRadius:7, background:C.surface2, border:`1px solid ${C.border}`, color:C.ink, cursor:"pointer", fontSize:14, fontFamily:C.font }}>
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
        <div style={{ width:400, borderLeft:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", flexShrink:0 }}>
          {/* Mesh list */}
          <div style={{ flex:1, overflow:"auto" }}>
            {/* Tooth labels panel removed — design workflow now lives in Smile Creator (2D) */}
            {false && (toothLabels.length > 0 || targetTeeth.length > 0) && (
              <>
                <div style={{ padding:"16px 20px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:16, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700 }}>
                    TOOTH LABELS ({toothLabels.length}/{targetTeeth.length || 32})
                  </div>
                  {toothLabels.length > 0 && (
                    <button onClick={()=>{ if(confirm(`Clear all ${toothLabels.length} tooth labels for ${patient?.name}?`)) setToothLabels([]); }}
                      style={{ padding:"5px 10px", borderRadius:5, background:"transparent", color:C.ink, border:`1px solid ${C.borderSoft}`, fontSize:15, cursor:"pointer", fontFamily:C.sans }}>Clear</button>
                  )}
                </div>
                {targetTeeth.length > 0 && (
                  <div style={{ padding:"0 20px 8px", fontSize:15, color:C.ink, lineHeight:1.5 }}>
                    Case targets: <span style={{ color:C.teal, fontFamily:C.font, fontWeight:600 }}>#{targetTeeth.join(", #")}</span>
                  </div>
                )}
                {toothLabels.length === 0 && (
                  <div style={{ padding:"8px 20px 14px", fontSize:16, color:C.ink, lineHeight:1.6 }}>
                    Click <span style={{ color:C.teal, fontWeight:700 }}>🏷 Label Teeth</span> above, then tap each tooth in the 3D view to assign numbers.
                  </div>
                )}
                {toothLabels.length > 0 && (
                  <div style={{ padding:"0 16px 14px", display:"flex", flexWrap:"wrap", gap:6 }}>
                    {[...toothLabels].sort((a,b)=>a.num-b.num).map(lbl => {
                      const isTarget = targetTeeth.includes(lbl.num);
                      return (
                        <div key={lbl.num} style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 6px 6px 11px", borderRadius:6, background: isTarget ? C.tealDim : C.surface2, border:`1px solid ${isTarget ? C.teal : C.border}`, fontSize:14, fontWeight:700, color: isTarget ? C.teal : C.ink, fontFamily:C.font }}>
                          #{lbl.num}
                          <button onClick={()=>setToothLabels(ls=>ls.filter(l=>l.num!==lbl.num))}
                            style={{ width:22, height:22, borderRadius:4, background:"transparent", color:C.ink, border:"none", fontSize:16, cursor:"pointer", lineHeight:1, padding:0 }}
                            title="Remove label">×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Missing targets warning */}
                {targetTeeth.length > 0 && targetTeeth.some(n => !toothLabels.find(l=>l.num===n)) && (
                  <div style={{ margin:"0 16px 14px", padding:"10px 14px", borderRadius:7, background:C.amber+"15", border:`1px solid ${C.amber}40`, fontSize:15, color:C.amber, lineHeight:1.5, fontWeight:600 }}>
                    Missing: #{targetTeeth.filter(n=>!toothLabels.find(l=>l.num===n)).join(", #")}
                  </div>
                )}
              </>
            )}

            <div style={{ padding:"16px 20px 8px", fontSize:16, fontFamily:C.font, color:C.teal, letterSpacing:2, fontWeight:700 }}>
              MESHES ({meshes.length})
            </div>
            {meshes.length === 0 && !loading && (
              <div style={{ padding:"24px 18px", textAlign:"center", color:C.ink, fontSize:15 }}>
                No files loaded.<br/>Select a patient on the Dashboard.
              </div>
            )}
            {meshes.map(m => {
              const color = '#'+m.color.toString(16).padStart(6,'0');
              const isActive = m.id === activeId;
              return (
                <div key={m.id} onClick={()=>setActive(m.id)}
                  style={{ padding:"13px 20px", borderBottom:`1px solid ${C.borderSoft}`, cursor:"pointer", background:isActive?C.tealDim:"transparent", transition:"background .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:5 }}>
                    <div style={{ width:16, height:16, borderRadius:4, background:color, flexShrink:0, border:`1px solid ${C.border}` }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:isActive?C.teal:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.label}</div>
                      <div style={{ fontSize:15, color:C.ink, fontFamily:C.font, marginTop:2 }}>{m.slot} · {m.triCount.toLocaleString()} tris</div>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation();toggleVisible(m.id);}}
                      style={{ width:34, height:34, borderRadius:7, background:m.visible===false?C.surface3:C.tealDim, color:m.visible===false?C.muted:C.teal, border:"none", cursor:"pointer", fontSize:15 }}>
                      {m.visible===false?"○":"●"}
                    </button>
                  </div>
                  {isActive && (
                    <div style={{ padding:"8px 0 6px 28px" }}>
                      <div style={{ fontSize:14, color:C.ink, marginBottom:5, letterSpacing:1, fontFamily:C.font, fontWeight:700 }}>OPACITY</div>
                      <input type="range" min={0} max={1} step={0.05} value={m.opacity ?? 1}
                        onChange={e=>setOpacity(m.id, +e.target.value)}
                        onClick={e=>e.stopPropagation()}
                        style={{ width:"100%", accentColor:C.teal }}/>

                      {/* Transform gizmos — only for library teeth */}
                      {m.slot === 'crown' && m.transform && (
                        <div onClick={e=>e.stopPropagation()} style={{ marginTop:14 }}>
                          <div style={{ fontSize:14, color:C.amber, marginBottom:8, letterSpacing:1, fontFamily:C.font, fontWeight:700 }}>POSITION (mm)</div>
                          {[
                            { key:'tx', label:'← / → (L-R)',    color:'#ef4444', min:-30, max:30 },
                            { key:'ty', label:'↑ / ↓ (vertical)', color:'#10b981', min:-30, max:30 },
                            { key:'tz', label:'⇠ / ⇢ (depth)',   color:'#3b82f6', min:-30, max:30 },
                          ].map(ax => (
                            <div key={ax.key} style={{ marginBottom:8 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.ink, marginBottom:3 }}>
                                <span style={{ color:ax.color, fontWeight:700 }}>{ax.label}</span>
                                <span style={{ fontFamily:C.font, color:C.ink }}>{(m.transform[ax.key] || 0).toFixed(1)}</span>
                              </div>
                              <input type="range" min={ax.min} max={ax.max} step={0.25} value={m.transform[ax.key] || 0}
                                onChange={e=>updateTransform(m.id, { [ax.key]: +e.target.value })}
                                style={{ width:"100%", accentColor: ax.color }}/>
                            </div>
                          ))}

                          <div style={{ fontSize:14, color:C.amber, marginTop:12, marginBottom:8, letterSpacing:1, fontFamily:C.font, fontWeight:700 }}>ROTATION (°)</div>
                          {[
                            { key:'rx', label:'pitch (X)', color:'#ef4444' },
                            { key:'ry', label:'yaw (Y)',   color:'#10b981' },
                            { key:'rz', label:'roll (Z)',  color:'#3b82f6' },
                          ].map(ax => (
                            <div key={ax.key} style={{ marginBottom:8 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.ink, marginBottom:3 }}>
                                <span style={{ color:ax.color, fontWeight:700 }}>{ax.label}</span>
                                <span style={{ fontFamily:C.font, color:C.ink }}>{(m.transform[ax.key] || 0).toFixed(0)}°</span>
                              </div>
                              <input type="range" min={-180} max={180} step={1} value={m.transform[ax.key] || 0}
                                onChange={e=>updateTransform(m.id, { [ax.key]: +e.target.value })}
                                style={{ width:"100%", accentColor: ax.color }}/>
                            </div>
                          ))}

                          <div style={{ fontSize:14, color:C.amber, marginTop:12, marginBottom:8, letterSpacing:1, fontFamily:C.font, fontWeight:700 }}>SCALE</div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.ink, marginBottom:3 }}>
                            <span style={{ color:C.teal, fontWeight:700 }}>uniform</span>
                            <span style={{ fontFamily:C.font, color:C.ink }}>{(m.transform.scale || 1).toFixed(2)}×</span>
                          </div>
                          <input type="range" min={0.3} max={3} step={0.05} value={m.transform.scale || 1}
                            onChange={e=>updateTransform(m.id, { scale: +e.target.value })}
                            style={{ width:"100%", accentColor:C.teal }}/>

                          <div style={{ display:"flex", gap:8, marginTop:12 }}>
                            <button onClick={()=>updateTransform(m.id, { tx:0, ty:0, tz:0, rx:0, ry:0, rz:0, scale:1 })}
                              style={{ flex:1, padding:"10px", borderRadius:6, background:C.surface2, border:`1px solid ${C.border}`, color:C.ink, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>↺ Reset</button>
                            <button onClick={()=>setMeshes(ms => ms.filter(mm => mm.id !== m.id))}
                              style={{ flex:1, padding:"10px", borderRadius:6, background:C.red+"20", border:`1px solid ${C.red}60`, color:C.red, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>✕ Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={()=>navigate && navigate('design-bridge')} style={{ padding:"13px", borderRadius:8, background:C.surface2, color:C.ink, border:`1px solid ${C.border}`, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:C.sans }}>← Back to Design Bridge</button>
            <button onClick={()=>navigate && navigate('export')} disabled={meshes.length===0} style={{ padding:"14px", borderRadius:8, background:meshes.length?C.teal:C.surface2, color:meshes.length?"white":C.muted, border:"none", fontSize:15, fontWeight:700, cursor:meshes.length?"pointer":"not-allowed", fontFamily:C.sans }}>Send to Export →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
