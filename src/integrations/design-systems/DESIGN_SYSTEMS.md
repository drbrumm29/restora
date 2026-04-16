# Design Systems Bridge

**Status:** ✅ Complete — TypeScript implemented April 2026

---

## Purpose

Single interface to route dental restoration cases to CEREC, Smilefy, or exocad — depending on case type. Handles file upload, round-trip design import, and status tracking.

---

## Supported Systems

| System | Vendor | Modes | Round-trip |
|---|---|---|---|
| **CEREC** | Dentsply Sirona | Prep restoration · Implant restoration | ✅ |
| **Smilefy** | Smilefy | Smile mockup · Prep restoration | ✅ |
| **exocad** | exocad GmbH | All modes | ✅ |

---

## Case Modes

### Prep Restoration
Files: Upper arch STL · Lower arch STL · Bite reg STL · Prep photo  
Use for: Crown, veneer, onlay, inlay, bridge  
Best system: CEREC (in-office same-day) or exocad (lab)

### Smile Mockup
Files: Full face repose · Full face smile · Retracted frontal · (+ optional laterals, arch scans)  
Use for: Digital smile design before any prep  
Best system: Smilefy (photo-based DSD) or exocad (3D wax-up)

### Implant Restoration
Files: Upper arch STL (with scan body) · Lower arch STL · CBCT/DICOM · Scan body report  
Use for: Crown on implant, bridge, bar, abutment, full arch zirconia  
Best system: exocad (full implant library) or CEREC (single implant crown)

---

## Workflow

```
1. Select case mode (Prep Restoration / Smile Mockup / Implant Restoration)
2. Select system (CEREC / Smilefy / exocad)
3. Upload files (required + optional)
4. Set restoration type + tooth numbers + notes
5. Send → job created, status tracked
6. When ready → Import design back to Restora OR open in native system
```

---

## CEREC Connect Integration

```ts
// Upload to CEREC Connect cloud
uploadToCerecConnect(job, config)
  → { connectJobId, url }

// Poll for design status
pollCerecDesignStatus(connectJobId, config)
  → { status, downloadUrl? }

// Download completed design
downloadCerecDesign(downloadUrl)
  → Blob (STL)

// Send to mill unit
sendToMillUnit(blob, material, millUnit)
```

**Supported mill units:** CEREC MC X · Primemill · inLab MC X5  
**Supported materials:** IPS e.max CAD · VITA Mark II · CEREC Tessera · Celtra Duo · inCoris TZI

---

## Smilefy Integration

```ts
// Upload photos to Smilefy
uploadToSmilefy(smilefyCase, config)
  → { smilefyCaseId, designUrl }

// Poll for completed mockup
getSmilefyDesign(smilefyCaseId, config)
  → SmilefyDesignOutput | null

// Correlate Smilefy dimensions → STL scale
correlateSmilefyToSTL(smilefyOutput, scanMeshBB)
  → { scaleX, scaleY, offsetX, offsetY }
```

**Output from Smilefy:**
- Mockup overlay PNG (before/after)
- Tooth dimensions in mm (central W/L, lateral W/L, canine W)
- Midline deviation, smile arc, gingival levels

---

## exocad Integration

```ts
// Build export package
buildExocadExportPackage(exocadCase, options)
  → ExocadExportPackage { zipFileName, files, ... }

// Import exocad design back
importExocadDesign(stlFile)
  → { meshUrl, boundingBox }
```

**Restoration types:** Single crown · Veneer · Inlay/Onlay · Bridge · Implant crown · Implant bridge · Implant bar · Abutment · Full arch zirconia  
**exocad modules:** DentalCAD Crown & Bridge · DentalCAD Implant · Bar & Clasp · Full Denture

---

## Files

```
src/integrations/design-systems/
├── DESIGN_SYSTEMS.md           ← this file
├── DesignSystemsBridge.tsx     ← main UI component
├── cerec.ts                    ← CEREC Connect API + types
├── smilefy.ts                  ← Smilefy API + types
└── exocad.ts                   ← exocad export/import + types
```

---

## Add to Sidebar

```ts
// In src/components/Sidebar.tsx, add to Design section:
{ id: 'design-systems', icon: '⬡', label: 'Design Systems', badge: 'CEREC · Smilefy · exocad' }
```

---

## Add to Router

```ts
// In src/App.tsx or router:
import { DesignSystemsBridge } from './integrations/design-systems/DesignSystemsBridge'

case 'design-systems':
  return <DesignSystemsBridge />
```

*Last updated: April 2026*
