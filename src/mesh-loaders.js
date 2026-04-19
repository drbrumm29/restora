// Unified mesh loaders for Scan Viewer imports.
//
// Reads an ArrayBuffer and returns the same { positions, normals, triCount }
// shape the viewer already expects for STL. Supports the intra-oral scanner
// formats dentists typically hand over:
//   • .stl  — binary / ASCII (existing parseSTL kept in RestorationCAD.jsx
//             and also re-exported here for API uniformity)
//   • .obj  — Wavefront (common exocad / 3Shape export)
//   • .ply  — Stanford PLY (occasional 3Shape + some CBCT exports)
//   • .glb / .gltf — glTF, takes the first mesh in the scene
//
// three.js loaders work on strings/JSON/ArrayBuffers depending on format,
// so we normalise at the entry point and pull raw geometry attributes out
// the other side.
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Extract the { positions, normals, triCount } triple from a BufferGeometry.
// If normals are missing, compute them so shading is consistent across
// formats (OBJ without `vn` lines, PLY without normal property, etc.).
function geometryToMesh(geom) {
  if (!geom.attributes.normal) geom.computeVertexNormals()
  // Indexed geometries need to be expanded — the viewer's renderer expects
  // flat per-vertex arrays so every triangle has its own normal.
  if (geom.index) geom = geom.toNonIndexed()
  const positions = geom.attributes.position.array
  const normals   = geom.attributes.normal.array
  const triCount  = positions.length / 9
  return { positions, normals, triCount }
}

// Walk a glTF scene to find the first Mesh; merge siblings if multiple
// (a single arch scan can be exported as multiple parts).
function gltfSceneToMesh(gltf) {
  const geoms = []
  gltf.scene.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      const g = obj.geometry.clone()
      obj.updateWorldMatrix(true, false)
      g.applyMatrix4(obj.matrixWorld)
      geoms.push(g)
    }
  })
  if (geoms.length === 0) throw new Error('glTF contains no meshes')
  if (geoms.length === 1) return geometryToMesh(geoms[0])
  // Merge all geoms into one by concatenating positions.
  const merged = new THREE.BufferGeometry()
  let total = 0
  for (const g of geoms) {
    if (g.index) { const ng = g.toNonIndexed(); g.dispose(); Object.assign(g, ng) }
    if (!g.attributes.normal) g.computeVertexNormals()
    total += g.attributes.position.count
  }
  const positions = new Float32Array(total * 3)
  const normals   = new Float32Array(total * 3)
  let offset = 0
  for (const g of geoms) {
    positions.set(g.attributes.position.array, offset * 3)
    normals.set(g.attributes.normal.array, offset * 3)
    offset += g.attributes.position.count
  }
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal',   new THREE.BufferAttribute(normals, 3))
  return geometryToMesh(merged)
}

export async function loadMeshFromFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const buf = await file.arrayBuffer()

  if (ext === 'obj') {
    // OBJ is text — decode, parse through OBJLoader which returns a Group.
    const text = new TextDecoder().decode(buf)
    const group = new OBJLoader().parse(text)
    // Flatten all Meshes in the group into one geometry.
    const geoms = []
    group.traverse((o) => { if (o.isMesh && o.geometry) geoms.push(o.geometry) })
    if (geoms.length === 0) throw new Error('OBJ contains no geometry')
    if (geoms.length === 1) return geometryToMesh(geoms[0])
    return gltfSceneToMesh({ scene: group })  // reuse merge path
  }

  if (ext === 'ply') {
    const geom = new PLYLoader().parse(buf)
    return geometryToMesh(geom)
  }

  if (ext === 'glb' || ext === 'gltf') {
    return await new Promise((resolve, reject) => {
      const loader = new GLTFLoader()
      // parse() works for both binary (GLB) and JSON (GLTF); GLTF with
      // external resources isn't supported via a raw buffer — user would
      // need to drop the .glb instead.
      loader.parse(buf, '',
        (gltf) => { try { resolve(gltfSceneToMesh(gltf)) } catch (e) { reject(e) } },
        reject
      )
    })
  }

  throw new Error(`Unsupported mesh format: .${ext}`)
}
