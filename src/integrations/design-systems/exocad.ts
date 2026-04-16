// ============================================================
// exocad Integration
// Handles: DentalCAD round-trip, 3OX export, implant bar/abutment
// ============================================================

export interface ExocadCase {
  caseId: string
  patientRef: string          // de-identified
  restorationType: ExocadRestorationType
  files: ExocadFileSet
  status: ExocadCaseStatus
  labName?: string
  notes?: string
}

export type ExocadRestorationType =
  | 'single-crown'
  | 'veneer'
  | 'inlay-onlay'
  | 'bridge'
  | 'implant-crown'
  | 'implant-bridge'
  | 'implant-bar'
  | 'implant-abutment'
  | 'full-arch-zirconia'
  | 'removable-partial'

export type ExocadCaseStatus =
  | 'pending-export'
  | 'exported'
  | 'lab-received'
  | 'designing'
  | 'design-ready'
  | 'approved'
  | 'milling'
  | 'complete'

export interface ExocadFileSet {
  // Input to exocad
  upperArchSTL?: string       // path or blob URL
  lowerArchSTL?: string
  prepSTL?: string            // isolated prep scan
  antagonistSTL?: string
  biteRegSTL?: string
  cbctDCM?: string            // for implant cases

  // Output from exocad
  designSTL?: string          // final crown/restoration design
  frameworkSTL?: string       // for bridge / bar
  abutmentSTL?: string
  exocad3OX?: string          // exocad native project file
}

// ── Restoration type → exocad module mapping ──
export const EXOCAD_MODULE_MAP: Record<ExocadRestorationType, string> = {
  'single-crown':       'DentalCAD — Crown & Bridge',
  'veneer':             'DentalCAD — Crown & Bridge',
  'inlay-onlay':        'DentalCAD — Crown & Bridge',
  'bridge':             'DentalCAD — Crown & Bridge',
  'implant-crown':      'DentalCAD — Implant',
  'implant-bridge':     'DentalCAD — Implant',
  'implant-bar':        'DentalCAD — Bar & Clasp',
  'implant-abutment':   'DentalCAD — Implant',
  'full-arch-zirconia': 'DentalCAD — Full Denture',
  'removable-partial':  'DentalCAD — Removable',
}

// ── Export package for lab ──
export interface ExocadExportPackage {
  zipFileName: string
  files: Array<{
    name: string
    format: 'STL' | '3OX' | 'DCM' | 'PDF'
    sizeBytes?: number
  }>
  labRxIncluded: boolean
  coordinateSystem: 'Z-up' | 'Y-up'
  stlFormat: 'binary' | 'ascii'
}

export function buildExocadExportPackage(
  exocadCase: ExocadCase,
  options: {
    includeLabRx: boolean
    coordinateSystem: 'Z-up' | 'Y-up'
    stlFormat: 'binary' | 'ascii'
  }
): ExocadExportPackage {
  const files: ExocadExportPackage['files'] = []

  if (exocadCase.files.upperArchSTL) files.push({ name: 'upper_arch.stl', format: 'STL' })
  if (exocadCase.files.lowerArchSTL) files.push({ name: 'lower_arch.stl', format: 'STL' })
  if (exocadCase.files.prepSTL) files.push({ name: 'prep_scan.stl', format: 'STL' })
  if (exocadCase.files.antagonistSTL) files.push({ name: 'antagonist.stl', format: 'STL' })
  if (exocadCase.files.biteRegSTL) files.push({ name: 'bite_registration.stl', format: 'STL' })
  if (exocadCase.files.cbctDCM) files.push({ name: 'cbct_data.dcm', format: 'DCM' })
  if (exocadCase.files.designSTL) files.push({ name: 'design_proposal.stl', format: 'STL' })
  if (options.includeLabRx) files.push({ name: 'lab_rx.pdf', format: 'PDF' })

  return {
    zipFileName: `restora_exocad_${exocadCase.caseId}_${Date.now()}.zip`,
    files,
    labRxIncluded: options.includeLabRx,
    coordinateSystem: options.coordinateSystem,
    stlFormat: options.stlFormat,
  }
}

// ── Implant abutment parameters for exocad ──
export interface ImplantAbutmentParams {
  implantSystem: string       // e.g. 'Nobel Biocare Active 4.3'
  connectionType: string      // e.g. 'Tri-Channel Internal'
  platformDiameter: number    // mm
  cuffHeight: number          // mm — subgingival offset
  scanBodyId: string          // matched to exocad scan body library
  angulation: number          // degrees
  material: 'titanium' | 'zirconia' | 'PEEK' | 'titanium-base'
}

// ── Round-trip: import exocad design back to Restora ──
export async function importExocadDesign(stlFile: File): Promise<{
  meshUrl: string
  boundingBox: { x: number; y: number; z: number }
}> {
  const url = URL.createObjectURL(stlFile)
  // In real impl: parse STL → Three.js BufferGeometry → compute bounding box
  console.log('[exocad] Importing design STL:', stlFile.name)
  return {
    meshUrl: url,
    boundingBox: { x: 12, y: 9, z: 8 }, // mm (mock)
  }
}
