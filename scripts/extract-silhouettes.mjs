// ┌─────────────────────────────────────────────────────────────────┐
// │ extract-silhouettes.mjs                                         │
// │                                                                  │
// │ Reads every library tooth STL, projects its 3D geometry onto    │
// │ the facial view, computes a 2D convex hull, and writes out a    │
// │ normalized silhouette as JSON.                                   │
// │                                                                  │
// │ Output: src/tooth-silhouettes.json                               │
// │   { [libId]: { [fileName]: [[x,y], ...] } }                      │
// │   x,y normalized to [-0.5, +0.5]                                 │
// │   y=-0.5 is incisal edge, y=+0.5 is cervical                    │
// │   Polygon is counterclockwise, ~20 points after simplification   │
// │                                                                  │
// │ Run: node scripts/extract-silhouettes.mjs                        │
// └─────────────────────────────────────────────────────────────────┘

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARIES_DIR = path.join(__dirname, '..', 'public', 'libraries');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'tooth-silhouettes.json');

// ── Parse binary STL ────────────────────────────────────────────────
function parseSTL(filePath) {
  const buf = fs.readFileSync(filePath);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // ASCII STL check
  const head = buf.slice(0, 5).toString('ascii').toLowerCase();
  if (head === 'solid' && buf.slice(0, 300).toString('ascii').includes('facet normal')) {
    return parseAsciiSTL(buf.toString('ascii'));
  }

  const triCount = dv.getUint32(80, true);
  const vertices = [];
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    off += 12;  // skip normal
    for (let v = 0; v < 3; v++) {
      vertices.push([
        dv.getFloat32(off,     true),
        dv.getFloat32(off + 4, true),
        dv.getFloat32(off + 8, true),
      ]);
      off += 12;
    }
    off += 2;
  }
  return vertices;
}

function parseAsciiSTL(text) {
  const verts = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    verts.push([+m[1], +m[2], +m[3]]);
  }
  return verts;
}

// ── Orient tooth: long axis vertical (incisal-cervical), map to 2D facial ──
// Library teeth STLs are in various raw coord systems. Normalize:
//   1. Compute centroid and subtract
//   2. PCA → find principal axes of the vertex cloud
//   3. Principal axis 0 = longest (incisal-cervical length) → Y in facial view
//   4. Principal axis 1 = 2nd longest (mesiodistal width) → X in facial view
//   5. Principal axis 2 = narrowest (facial-lingual depth) → drop for 2D
// This gives us the facial silhouette regardless of input orientation.
function getFacialProjection(vertices) {
  const n = vertices.length;
  if (n === 0) return [];

  // Centroid
  const c = [0, 0, 0];
  for (const v of vertices) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
  c[0] /= n; c[1] /= n; c[2] /= n;

  // Covariance matrix (3x3)
  const cov = [[0,0,0],[0,0,0],[0,0,0]];
  for (const v of vertices) {
    const d = [v[0]-c[0], v[1]-c[1], v[2]-c[2]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cov[i][j] += d[i] * d[j];
      }
    }
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] /= n;

  // Power-iteration eigenvectors (Jacobi for 3x3 is overkill; iterate).
  const eigenvectors = [];
  let M = cov.map(row => row.slice());
  for (let k = 0; k < 3; k++) {
    // Power iteration → largest eigenvector of M
    let v = [Math.random(), Math.random(), Math.random()];
    for (let iter = 0; iter < 80; iter++) {
      const Mv = [
        M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
        M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
        M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
      ];
      const norm = Math.hypot(Mv[0], Mv[1], Mv[2]) || 1;
      v = [Mv[0]/norm, Mv[1]/norm, Mv[2]/norm];
    }
    // Eigenvalue
    const Mv = [
      M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
      M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
      M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
    const lambda = v[0]*Mv[0] + v[1]*Mv[1] + v[2]*Mv[2];
    eigenvectors.push({ vec: v, lambda });
    // Deflate: M = M - λ v vᵀ
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      M[i][j] -= lambda * v[i] * v[j];
    }
  }
  // Sort by eigenvalue descending
  eigenvectors.sort((a,b) => b.lambda - a.lambda);

  // Longest axis → vertical (Y), 2nd → horizontal (X)
  const axisY = eigenvectors[0].vec;  // incisal-cervical direction
  const axisX = eigenvectors[1].vec;  // mesiodistal direction
  // (3rd eigenvector is the facial-lingual "depth" we discard)

  // Project each vertex onto (axisX, axisY)
  const pts2d = [];
  for (const v of vertices) {
    const d = [v[0]-c[0], v[1]-c[1], v[2]-c[2]];
    const x = d[0]*axisX[0] + d[1]*axisX[1] + d[2]*axisX[2];
    const y = d[0]*axisY[0] + d[1]*axisY[1] + d[2]*axisY[2];
    pts2d.push([x, y]);
  }
  return pts2d;
}

// ── Convex hull (Andrew's monotone chain) ──────────────────────────
function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a,b) => a[0] - b[0] || a[1] - b[1]);

  // Lower hull
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  // Upper hull
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);  // counterclockwise
}

function cross(o, a, b) {
  return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
}

// ── Simplify polygon via angle-based decimation ────────────────────
// Keep ~20 points evenly-spaced by arc length (preserves overall shape).
function simplifyEven(polygon, targetCount = 22) {
  if (polygon.length <= targetCount) return polygon;
  // Compute cumulative arc length
  const n = polygon.length;
  const cum = [0];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i+1) % n];
    total += Math.hypot(b[0]-a[0], b[1]-a[1]);
    cum.push(total);
  }
  // Pick points at evenly-spaced arc-length positions
  const out = [];
  for (let k = 0; k < targetCount; k++) {
    const target = (k / targetCount) * total;
    // Find segment containing this arc length
    let i = 0;
    while (i < n && cum[i+1] < target) i++;
    const segLen = cum[i+1] - cum[i] || 1;
    const frac = (target - cum[i]) / segLen;
    const a = polygon[i];
    const b = polygon[(i+1) % n];
    out.push([
      a[0] + (b[0]-a[0]) * frac,
      a[1] + (b[1]-a[1]) * frac,
    ]);
  }
  return out;
}

// ── Normalize to [-0.5, +0.5] on both axes ──────────────────────────
// Also ensure orientation: incisal edge at y = -0.5 (top in image space)
// Heuristic: the side of the tooth with the POINTIER profile is incisal.
// Compare the "spread" of points in the top half vs bottom half.
function normalize(polygon) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  // Center and scale
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const rescaled = polygon.map(([x, y]) => [
    (x - cx) / dx,
    (y - cy) / dy,
  ]);

  // Check if we need to flip Y so incisal edge is at top (y = -0.5)
  // Heuristic: compute average |x| for top half vs bottom half points.
  // Incisal edge has more variation in X (cusp tips, embrasures);
  // cervical side is smoother and more uniform.
  // Simpler: the incisal side has the MINIMUM Y in a natural-axis orientation.
  // For now, flip so that the longest-extent half is at cervical (+y).

  // Actually, for teeth, tapering matters more. Incisal is NARROWER
  // (tooth narrows to incisal edge or cusp tips).
  // Compute average horizontal extent in the upper and lower halves.
  let topSpread = 0, topCount = 0, botSpread = 0, botCount = 0;
  for (const [x, y] of rescaled) {
    if (y < 0) { topSpread += Math.abs(x); topCount++; }
    else       { botSpread += Math.abs(x); botCount++; }
  }
  const topAvg = topCount ? topSpread / topCount : 0;
  const botAvg = botCount ? botSpread / botCount : 0;
  // Cervical side is wider. If top is wider, the tooth is upside-down → flip Y.
  if (topAvg > botAvg) {
    return rescaled.map(([x, y]) => [x, -y]);
  }
  // Also: teeth narrow toward INCISAL; if incisal ended up on top (y negative),
  // that's wrong — incisal should be at bottom (y positive? no, y=-0.5 = top).
  // Wait — in canvas coord Y grows down. If we want incisal edge at image top,
  // then incisal = negative Y.
  // Narrower half should be at y = -0.5 (top).
  // Flip if narrower is at bottom.
  // topAvg < botAvg means top is narrower → incisal at top → correct, no flip.
  // We already flip if topAvg > botAvg (incisal at bottom → needs correction).
  return rescaled;
}

// ── Main extraction loop ────────────────────────────────────────────
const libraries = ['dannydesigner4', 'dannydesigner5', 'g01', 'g02'];
const output = {};

for (const lib of libraries) {
  const libDir = path.join(LIBRARIES_DIR, lib);
  if (!fs.existsSync(libDir)) continue;

  const files = fs.readdirSync(libDir).filter(f => f.endsWith('.stl'));
  output[lib] = {};

  for (const file of files) {
    const filePath = path.join(libDir, file);
    try {
      const vertices = parseSTL(filePath);
      if (vertices.length < 30) {
        console.warn(`  ${lib}/${file}: too few vertices, skipping`);
        continue;
      }
      const projected = getFacialProjection(vertices);
      const hull = convexHull(projected);
      const simplified = simplifyEven(hull, 22);
      const normalized = normalize(simplified);

      // Store as array of [x,y] arrays (smaller JSON than objects)
      output[lib][file] = normalized.map(p => [
        +p[0].toFixed(4),
        +p[1].toFixed(4),
      ]);
      console.log(`  ${lib}/${file}: ${vertices.length} verts → ${normalized.length} pts`);
    } catch (err) {
      console.error(`  ${lib}/${file}: ERROR`, err.message);
    }
  }
}

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
const stat = fs.statSync(OUTPUT_FILE);
console.log(`\nWrote ${OUTPUT_FILE}`);
console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB`);
