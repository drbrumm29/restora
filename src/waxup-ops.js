// ─────────────────────────────────────────────────────────────────────────
// Waxup mesh operations — MVP per-tooth deformations for voice-driven edits.
//
// Each op takes a mesh ({ positions, normals, triCount }) plus a tooth
// anchor ({ num, x, y, z } from the user's labeled tooth center) plus op
// parameters, and returns a new mesh with modified positions+normals. The
// original mesh is never mutated — RestorationCAD keeps both so the user
// can toggle before/after and export the waxup separately.
//
// Vertex selection strategy:
//   Every op operates on vertices within a radius R of the tooth anchor
//   point, weighted by a smooth falloff (1 - t)^2 where t = distance/R.
//   R is estimated from tooth type — anteriors ~4.5mm, premolars ~5mm,
//   molars ~6mm. This concentrates the edit on one tooth without creating
//   creases at the selection boundary.
//
// Direction frames (derived from mesh metadata, not magic):
//   • incisalAxis — +Y for lower arch, -Y for upper (teeth point toward
//     the incisal edge which is where the arch is shortest in Y).
//   • mesialAxis — vector from the tooth anchor toward midline (x=0).
//   • labialAxis — normal at the tooth anchor, averaged across nearby
//     triangles so one noisy normal doesn't dominate.
//
// All distances assume mesh units are mm (STL is unitless but intra-oral
// scanner exports are almost universally mm).
// ─────────────────────────────────────────────────────────────────────────

// Radius (in mm) around the tooth anchor that belongs to the tooth.
// Anterior, premolar, molar heuristic by Universal numbering.
function toothRadius(num) {
  if (num == null) return 5
  // Midline centrals/laterals/canines
  if ((num >= 6 && num <= 11) || (num >= 22 && num <= 27)) return 4.5
  // Premolars (4,5,12,13, 20,21,28,29)
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(num)) return 5.0
  // Molars
  return 6.0
}

// Axis sign for the incisal direction given the arch the mesh belongs to.
// Returns {x,y,z} unit vector. Upper teeth point down (-Y), lower up (+Y).
function incisalAxis(slot) {
  if (slot === 'lower') return { x: 0, y: 1, z: 0 }
  return { x: 0, y: -1, z: 0 }
}

// Mesial direction for a tooth at position p — unit vector from p toward
// the midline (x=0). If the tooth sits exactly on midline, fall back to
// the patient-right direction to avoid NaN.
function mesialAxis(p) {
  const dx = -p.x
  const len = Math.abs(dx)
  if (len < 0.001) return { x: 1, y: 0, z: 0 }
  return { x: dx / len, y: 0, z: 0 }
}

// Average surface normal in a neighborhood around the anchor. Used as the
// labial direction — for an upper-anterior tooth labeled at its labial
// surface, this points out of the arch toward the camera.
function estimatedLabialAxis(positions, normals, anchor, radius) {
  let sx = 0, sy = 0, sz = 0, count = 0
  const r2 = radius * radius
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - anchor.x
    const dy = positions[i + 1] - anchor.y
    const dz = positions[i + 2] - anchor.z
    if (dx * dx + dy * dy + dz * dz > r2) continue
    sx += normals[i]
    sy += normals[i + 1]
    sz += normals[i + 2]
    count++
  }
  if (count === 0) return { x: 0, y: 0, z: 1 }
  const len = Math.hypot(sx, sy, sz) || 1
  return { x: sx / len, y: sy / len, z: sz / len }
}

// Clone a mesh's position + normal buffers so ops never mutate input.
function cloneMesh(mesh) {
  return {
    ...mesh,
    positions: new Float32Array(mesh.positions),
    normals: mesh.normals ? new Float32Array(mesh.normals) : null,
  }
}

// Smooth falloff — used to weight each op's displacement so edits blend
// into the surrounding tooth instead of creating a crease at radius R.
function falloff(distance, radius) {
  if (distance >= radius) return 0
  const t = distance / radius
  // smoothstep(1, 0, t)  →  cubic easing, 1 at center, 0 at boundary
  return 1 - t * t * (3 - 2 * t)
}

// Apply a per-vertex displacement filtered by falloff around the anchor.
// displaceFn receives (localIdx, vertex, weight) and writes into outPos.
function displaceAroundAnchor(mesh, anchor, radius, displaceFn) {
  const out = cloneMesh(mesh)
  const r2 = radius * radius
  const pos = out.positions
  for (let i = 0; i < pos.length; i += 3) {
    const dx = pos[i] - anchor.x
    const dy = pos[i + 1] - anchor.y
    const dz = pos[i + 2] - anchor.z
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 > r2) continue
    const d = Math.sqrt(d2)
    const w = falloff(d, radius)
    displaceFn(i, { x: pos[i], y: pos[i + 1], z: pos[i + 2] }, w)
  }
  return out
}

// ── Primitive ops ────────────────────────────────────────────────────────

export function opExtendIncisally(mesh, anchor, { mm = 1 } = {}) {
  const axis = incisalAxis(mesh.slot)
  const radius = toothRadius(anchor.num)
  return displaceAroundAnchor(mesh, anchor, radius, (i, v, w) => {
    mesh.positions // silence unused
    // Only extend vertices that are already on the incisal half — so we
    // don't pull the gingival margin down with the edge.
    const rel = (v.x - anchor.x) * axis.x + (v.y - anchor.y) * axis.y + (v.z - anchor.z) * axis.z
    if (rel < 0) return
    const incisalWeight = Math.min(1, rel / radius) // further toward incisal = more displacement
    const k = w * incisalWeight * mm
    const newPos = [v.x + axis.x * k, v.y + axis.y * k, v.z + axis.z * k]
    // Need to write into the *output* mesh, not the source. Fetch it via closure trick:
    _writeVertex(i, newPos)
  })
}

// Helper — bound at dispatch time to the output mesh.
let _activeOut = null
function _writeVertex(i, [x, y, z]) {
  if (!_activeOut) return
  _activeOut.positions[i] = x
  _activeOut.positions[i + 1] = y
  _activeOut.positions[i + 2] = z
}

// Rework: dispatch runs the op with a bound output buffer. Each op returns
// a function that produces the new mesh.
export function applyOp(mesh, anchor, op) {
  const out = cloneMesh(mesh)
  _activeOut = out
  try {
    const radius = toothRadius(anchor.num)
    if (op.type === 'extend_incisally' || op.type === 'shorten') {
      const axis = incisalAxis(mesh.slot)
      const mm = (op.type === 'shorten' ? -1 : 1) * (op.mm ?? 1)
      const pos = mesh.positions
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        const rel = dx * axis.x + dy * axis.y + dz * axis.z
        if (rel < 0) continue
        const w = falloff(d, radius) * Math.min(1, rel / radius)
        out.positions[i]     += axis.x * w * mm
        out.positions[i + 1] += axis.y * w * mm
        out.positions[i + 2] += axis.z * w * mm
      }
    } else if (op.type === 'widen_mesially' || op.type === 'narrow_mesially') {
      const axis = mesialAxis(anchor)
      const mm = (op.type === 'narrow_mesially' ? -1 : 1) * (op.mm ?? 0.5)
      const pos = mesh.positions
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        const rel = dx * axis.x + dy * axis.y + dz * axis.z
        if (rel < 0) continue // only move the mesial-side vertices
        const w = falloff(d, radius) * Math.min(1, rel / (radius * 0.7))
        out.positions[i]     += axis.x * w * mm
        out.positions[i + 1] += axis.y * w * mm
        out.positions[i + 2] += axis.z * w * mm
      }
    } else if (op.type === 'widen_distally' || op.type === 'narrow_distally') {
      const ma = mesialAxis(anchor)
      const axis = { x: -ma.x, y: -ma.y, z: -ma.z }
      const mm = (op.type === 'narrow_distally' ? -1 : 1) * (op.mm ?? 0.5)
      const pos = mesh.positions
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        const rel = dx * axis.x + dy * axis.y + dz * axis.z
        if (rel < 0) continue
        const w = falloff(d, radius) * Math.min(1, rel / (radius * 0.7))
        out.positions[i]     += axis.x * w * mm
        out.positions[i + 1] += axis.y * w * mm
        out.positions[i + 2] += axis.z * w * mm
      }
    } else if (op.type === 'add_labial_convexity' || op.type === 'reduce_labial_convexity') {
      const axis = estimatedLabialAxis(mesh.positions, mesh.normals, anchor, radius)
      const mm = (op.type === 'reduce_labial_convexity' ? -1 : 1) * (op.mm ?? 0.3)
      const pos = mesh.positions
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        // Only push out vertices whose normal faces roughly labially.
        const nDotLabial = (mesh.normals?.[i] ?? 0) * axis.x
                         + (mesh.normals?.[i + 1] ?? 0) * axis.y
                         + (mesh.normals?.[i + 2] ?? 0) * axis.z
        if (nDotLabial < 0.2) continue
        const w = falloff(d, radius) * nDotLabial
        out.positions[i]     += axis.x * w * mm
        out.positions[i + 1] += axis.y * w * mm
        out.positions[i + 2] += axis.z * w * mm
      }
    } else if (op.type === 'smooth') {
      // One-pass Laplacian smoothing restricted to the tooth neighborhood.
      // Without an adjacency graph we approximate by averaging each vertex
      // with nearby vertices within a small sub-radius. Cheap but the
      // result visibly softens sharp scan artifacts.
      const subRadius = Math.min(radius, 2.5)
      const pos = mesh.positions
      const strength = Math.min(1, op.strength ?? 0.6)
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        // Local average
        let ax = 0, ay = 0, az = 0, count = 0
        const sr2 = subRadius * subRadius
        for (let j = 0; j < pos.length; j += 3) {
          if (j === i) continue
          const ex = pos[j] - pos[i]
          const ey = pos[j + 1] - pos[i + 1]
          const ez = pos[j + 2] - pos[i + 2]
          if (ex * ex + ey * ey + ez * ez > sr2) continue
          ax += pos[j]; ay += pos[j + 1]; az += pos[j + 2]; count++
        }
        if (count === 0) continue
        ax /= count; ay /= count; az /= count
        const w = falloff(d, radius) * strength
        out.positions[i]     = pos[i]     * (1 - w) + ax * w
        out.positions[i + 1] = pos[i + 1] * (1 - w) + ay * w
        out.positions[i + 2] = pos[i + 2] * (1 - w) + az * w
      }
    } else if (op.type === 'rotate_axis') {
      // Rotate the tooth neighborhood around the incisal axis through the
      // anchor. Useful for "rotate mesially a few degrees" type commands.
      const axis = incisalAxis(mesh.slot)
      const rad = (op.degrees ?? 3) * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const pos = mesh.positions
      for (let i = 0; i < pos.length; i += 3) {
        const dx = pos[i] - anchor.x
        const dy = pos[i + 1] - anchor.y
        const dz = pos[i + 2] - anchor.z
        const d = Math.hypot(dx, dy, dz)
        if (d >= radius) continue
        const w = falloff(d, radius)
        // Rodrigues rotation for arbitrary axis, partial strength via w
        const theta = rad * w
        const c = Math.cos(theta), s = Math.sin(theta), omc = 1 - c
        const { x: ax, y: ay, z: az } = axis
        const m00 = c + ax * ax * omc
        const m01 = ax * ay * omc - az * s
        const m02 = ax * az * omc + ay * s
        const m10 = ay * ax * omc + az * s
        const m11 = c + ay * ay * omc
        const m12 = ay * az * omc - ax * s
        const m20 = az * ax * omc - ay * s
        const m21 = az * ay * omc + ax * s
        const m22 = c + az * az * omc
        const nx = dx * m00 + dy * m01 + dz * m02
        const ny = dx * m10 + dy * m11 + dz * m12
        const nz = dx * m20 + dy * m21 + dz * m22
        out.positions[i]     = anchor.x + nx
        out.positions[i + 1] = anchor.y + ny
        out.positions[i + 2] = anchor.z + nz
      }
    } else {
      // Unknown op — return the unmodified clone
    }

    // Recompute normals in the affected region so lighting matches the new
    // geometry. Cheap per-vertex normal accumulation across triangles.
    recomputeNormals(out)
  } finally {
    _activeOut = null
  }
  return out
}

// Simple per-triangle normal accumulation. Slow for huge meshes but
// straightforward; called once after a mesh edit, not inside the render
// loop. Drop-in replacement for computeVertexNormals that works on the
// flat float arrays we use.
function recomputeNormals(mesh) {
  const pos = mesh.positions
  const normals = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i],     ay = pos[i + 1], az = pos[i + 2]
    const bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5]
    const cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8]
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len; ny /= len; nz /= len
    for (let k = 0; k < 9; k += 3) {
      normals[i + k]     = nx
      normals[i + k + 1] = ny
      normals[i + k + 2] = nz
    }
  }
  mesh.normals = normals
}

// Apply many ops in sequence, folding through the mesh list.
export function applyOps(meshes, toothLabels, ops) {
  let result = meshes.map(m => ({ ...m }))
  for (const op of ops) {
    const label = toothLabels.find(l => l.num === op.tooth)
    if (!label) continue
    // Find mesh that contains this label — cheap heuristic: arch that has
    // vertices closest to the label point.
    let bestMeshIdx = -1, bestDist = Infinity
    for (let i = 0; i < result.length; i++) {
      const m = result[i]
      if (!m.positions || (m.slot !== 'upper' && m.slot !== 'lower')) continue
      // Sample a few vertices for speed
      const step = Math.max(3, Math.floor(m.positions.length / 300) - (Math.floor(m.positions.length / 300) % 3))
      let minD = Infinity
      for (let k = 0; k < m.positions.length; k += step) {
        const dx = m.positions[k]     - label.x
        const dy = m.positions[k + 1] - label.y
        const dz = m.positions[k + 2] - label.z
        const d = dx * dx + dy * dy + dz * dz
        if (d < minD) minD = d
      }
      if (minD < bestDist) { bestDist = minD; bestMeshIdx = i }
    }
    if (bestMeshIdx === -1) continue
    result[bestMeshIdx] = applyOp(result[bestMeshIdx], label, op)
  }
  return result
}

// Human-readable summary of a command, used in the command history panel.
export function describeOp(op) {
  const t = op.tooth ? `#${op.tooth}` : '—'
  switch (op.type) {
    case 'extend_incisally': return `${t} extended ${op.mm ?? 1}mm toward incisal edge`
    case 'shorten':          return `${t} shortened ${op.mm ?? 1}mm`
    case 'widen_mesially':   return `${t} widened ${op.mm ?? 0.5}mm toward midline`
    case 'narrow_mesially':  return `${t} narrowed ${op.mm ?? 0.5}mm toward midline`
    case 'widen_distally':   return `${t} widened ${op.mm ?? 0.5}mm toward posterior`
    case 'narrow_distally':  return `${t} narrowed ${op.mm ?? 0.5}mm toward posterior`
    case 'add_labial_convexity':    return `${t} labial bulge +${op.mm ?? 0.3}mm`
    case 'reduce_labial_convexity': return `${t} labial flattened ${op.mm ?? 0.3}mm`
    case 'smooth':           return `${t} smoothed (strength ${op.strength ?? 0.6})`
    case 'rotate_axis':      return `${t} rotated ${op.degrees ?? 3}° around long axis`
    default:                 return `${t} ${op.type}`
  }
}

export const SUPPORTED_OPS = [
  'extend_incisally', 'shorten',
  'widen_mesially', 'narrow_mesially',
  'widen_distally', 'narrow_distally',
  'add_labial_convexity', 'reduce_labial_convexity',
  'smooth', 'rotate_axis',
]
