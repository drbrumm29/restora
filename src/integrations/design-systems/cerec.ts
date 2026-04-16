// ============================================================
// CEREC (Dentsply Sirona) Integration
// Handles: Connect cloud, Primescan import, milling output
// ============================================================

export interface CerecConnectJob {
  jobId: string
  patientId: string
  toothNumbers: number[]
  restorationType: 'crown' | 'veneer' | 'onlay' | 'inlay' | 'bridge' | 'implant-crown'
  scanFile?: File       // STL from Primescan
  designFile?: File     // STL from Restora
  status: CerecJobStatus
  createdAt: Date
  updatedAt: Date
}

export type CerecJobStatus =
  | 'pending-upload'
  | 'uploading'
  | 'uploaded'
  | 'designing'         // Being worked in CEREC SW
  | 'design-ready'      // Design available for download
  | 'approved'
  | 'milling'
  | 'complete'
  | 'error'

export interface CerecConnectConfig {
  practiceId: string
  apiKey: string        // CEREC Connect API key
  millUnit: 'CEREC-MC-X' | 'Primemill' | 'inLab-MC-X5' | 'none'
  defaultMaterial: CerecMaterial
}

export type CerecMaterial =
  | 'IPS e.max CAD'
  | 'VITABLOCS Mark II'
  | 'CEREC Tessera'
  | 'Celtra Duo'
  | 'VITA Suprinity'
  | 'GC Initial LiSi Block'
  | 'inCoris TZI'        // Zirconia

// ── File format rules ──
export const CEREC_EXPORT_FORMATS = {
  scan: 'STL',        // Primescan output
  design: 'STL',      // Restora → CEREC
  casePackage: 'dxd', // CEREC Connect native
} as const

// ── API calls (mocked — replace with real CEREC Connect API) ──

export async function uploadToCerecConnect(
  job: CerecConnectJob,
  config: CerecConnectConfig
): Promise<{ success: boolean; connectJobId: string; url: string }> {
  // CEREC Connect API endpoint
  // POST https://connect.dentsply.com/api/v2/cases
  console.log('[CEREC] Uploading case to Connect:', job.jobId)
  return {
    success: true,
    connectJobId: `CC-${Date.now()}`,
    url: `https://connect.dentsply.com/cases/CC-${Date.now()}`,
  }
}

export async function pollCerecDesignStatus(
  connectJobId: string,
  config: CerecConnectConfig
): Promise<{ status: CerecJobStatus; downloadUrl?: string }> {
  // GET https://connect.dentsply.com/api/v2/cases/{id}/status
  console.log('[CEREC] Polling design status:', connectJobId)
  return { status: 'design-ready', downloadUrl: '/mock/design.stl' }
}

export async function downloadCerecDesign(
  downloadUrl: string
): Promise<Blob> {
  const res = await fetch(downloadUrl)
  return res.blob()
}

export function sendToMillUnit(
  designBlob: Blob,
  material: CerecMaterial,
  millUnit: CerecConnectConfig['millUnit']
): void {
  // Triggers local CEREC SW or Primemill queue
  console.log(`[CEREC] Sending to ${millUnit} — Material: ${material}`)
}

// ── Prep scan import from Primescan ──
export function parsePrimescanExport(files: FileList): {
  upperArch?: File
  lowerArch?: File
  biteReg?: File
  brand: 'Primescan'
} {
  const result: { upperArch?: File; lowerArch?: File; biteReg?: File; brand: 'Primescan' } = {
    brand: 'Primescan',
  }
  Array.from(files).forEach(f => {
    const name = f.name.toLowerCase()
    if (name.includes('upper') || name.includes('max')) result.upperArch = f
    else if (name.includes('lower') || name.includes('mand')) result.lowerArch = f
    else if (name.includes('bite') || name.includes('occ')) result.biteReg = f
  })
  return result
}
