// ============================================================
// Smilefy Integration
// Handles: digital smile design, mockup overlay, photo upload
// ============================================================

export interface SmilefyCase {
  caseId: string
  patientName: string       // de-identified for transfer
  photos: SmilefyPhoto[]
  designOutput?: SmilefyDesignOutput
  status: SmilefyCaseStatus
  createdAt: Date
}

export type SmilefyCaseStatus =
  | 'photos-pending'
  | 'uploading'
  | 'in-design'             // Smilefy designer working
  | 'design-complete'
  | 'mockup-ready'
  | 'approved'
  | 'exported'

export interface SmilefyPhoto {
  type: SmilefyPhotoType
  file?: File
  base64?: string
  uploaded: boolean
}

export type SmilefyPhotoType =
  | 'full-face-repose'
  | 'full-face-smile'
  | 'retracted-front'
  | 'retracted-lateral-right'
  | 'retracted-lateral-left'
  | 'occlusal-upper'
  | 'occlusal-lower'
  | 'profile-right'

// All photos needed for a complete Smilefy case
export const SMILEFY_REQUIRED_PHOTOS: SmilefyPhotoType[] = [
  'full-face-repose',
  'full-face-smile',
  'retracted-front',
]

export const SMILEFY_FULL_PHOTO_SET: SmilefyPhotoType[] = [
  'full-face-repose',
  'full-face-smile',
  'retracted-front',
  'retracted-lateral-right',
  'retracted-lateral-left',
  'occlusal-upper',
  'occlusal-lower',
  'profile-right',
]

export interface SmilefyDesignOutput {
  mockupOverlayUrl: string    // PNG with smile design overlaid on photo
  beforeUrl: string
  afterUrl: string
  toothDimensions: {          // Smilefy outputs these for correlation to STL
    centralWidth_mm: number
    centralLength_mm: number
    lateralWidth_mm: number
    lateralLength_mm: number
    canineWidth_mm: number
  }
  midlineDeviation_mm: number
  smileArc: 'consonant' | 'flat' | 'reverse'
  gingivalLevels: {
    central: number
    lateral: number
    canine: number
  }
  exportedAt: Date
}

export interface SmilefyConfig {
  apiKey: string
  workspaceId: string
  designerEmail?: string    // Request specific designer
}

// ── Upload photos to Smilefy ──
export async function uploadToSmilefy(
  smilefyCase: SmilefyCase,
  config: SmilefyConfig
): Promise<{ success: boolean; smilefyCaseId: string; designUrl: string }> {
  // POST https://api.smilefy.com/v1/cases
  console.log('[Smilefy] Creating case:', smilefyCase.caseId)
  return {
    success: true,
    smilefyCaseId: `SF-${Date.now()}`,
    designUrl: `https://app.smilefy.com/cases/SF-${Date.now()}`,
  }
}

// ── Poll for completed mockup ──
export async function getSmilefyDesign(
  smilefyCaseId: string,
  config: SmilefyConfig
): Promise<SmilefyDesignOutput | null> {
  // GET https://api.smilefy.com/v1/cases/{id}/design
  console.log('[Smilefy] Fetching design:', smilefyCaseId)
  return null // null = not ready yet
}

// ── Correlate Smilefy tooth dimensions → STL scale transform ──
export function correlateSmilefyToSTL(
  smilefyOutput: SmilefyDesignOutput,
  scanMeshBoundingBox: { width: number; height: number }
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
  const scaleX = smilefyOutput.toothDimensions.centralWidth_mm / scanMeshBoundingBox.width
  const scaleY = smilefyOutput.toothDimensions.centralLength_mm / scanMeshBoundingBox.height
  return {
    scaleX,
    scaleY,
    offsetX: smilefyOutput.midlineDeviation_mm,
    offsetY: 0,
  }
}

// ── Build photo upload list with completion status ──
export function buildPhotoChecklist(
  uploadedTypes: SmilefyPhotoType[],
  mode: 'required' | 'full' = 'full'
): Array<{ type: SmilefyPhotoType; label: string; uploaded: boolean; required: boolean }> {
  const labels: Record<SmilefyPhotoType, string> = {
    'full-face-repose': 'Full face — lips at repose',
    'full-face-smile': 'Full face — full smile',
    'retracted-front': 'Retracted — frontal',
    'retracted-lateral-right': 'Retracted — right lateral',
    'retracted-lateral-left': 'Retracted — left lateral',
    'occlusal-upper': 'Occlusal — upper arch',
    'occlusal-lower': 'Occlusal — lower arch',
    'profile-right': 'Profile — right side',
  }
  const set = mode === 'required' ? SMILEFY_REQUIRED_PHOTOS : SMILEFY_FULL_PHOTO_SET
  return set.map(type => ({
    type,
    label: labels[type],
    uploaded: uploadedTypes.includes(type),
    required: SMILEFY_REQUIRED_PHOTOS.includes(type),
  }))
}
