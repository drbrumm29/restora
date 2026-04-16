import { useState, useCallback, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
// DESIGN SYSTEMS BRIDGE
// Mill Connect · Smile Design · Lab CAD — unified restoration design router
// AUTO MODE: detects case type from files, picks best system,
//            auto-sends when required files are complete
// ─────────────────────────────────────────────────────────────

// ── Types ──
type DesignSystem = 'cerec' | 'smilefy' | 'exocad'
type CaseMode = 'prep-restoration' | 'smile-mockup' | 'implant-restoration'
type WorkflowStep = 'mode' | 'system' | 'files' | 'send' | 'status'

// ── AUTO MODE: infer case mode from file extensions/names ──
function inferModeFromFiles(files: File[]): { mode: CaseMode; confidence: number; reason: string } | null {
  const names = files.map(f => f.name.toLowerCase())
  const exts = files.map(f => f.name.split('.').pop()?.toLowerCase() ?? '')

  const hasSTL = exts.some(e => ['stl', 'obj', 'ply'].includes(e))
  const hasDCM = exts.some(e => ['dcm', 'zip'].includes(e))
  const hasPhoto = exts.some(e => ['jpg', 'jpeg', 'png', 'heic'].includes(e))
  const hasScanBody = names.some(n => n.includes('scan-body') || n.includes('scanbody') || n.includes('implant'))
  const hasCBCT = names.some(n => n.includes('cbct') || n.includes('dicom') || n.includes('cone'))
  const isFacePhoto = names.some(n => n.includes('face') || n.includes('smile') || n.includes('retract') || n.includes('lateral'))

  if ((hasSTL && hasDCM) || (hasSTL && hasScanBody) || hasCBCT) {
    return { mode: 'implant-restoration', confidence: 0.92, reason: 'CBCT/DICOM or scan body STL detected' }
  }
  if (hasPhoto && isFacePhoto && !hasSTL) {
    return { mode: 'smile-mockup', confidence: 0.90, reason: 'Facial/retracted photos detected, no STL' }
  }
  if (hasSTL && !hasDCM && !hasScanBody) {
    return { mode: 'prep-restoration', confidence: 0.85, reason: 'Arch STL scans detected' }
  }
  if (hasPhoto && hasSTL) {
    return { mode: 'prep-restoration', confidence: 0.70, reason: 'Mixed STL + photo — likely prep with photos' }
  }
  return null
}

// ── AUTO MODE: pick best system for a mode ──
function pickBestSystem(mode: CaseMode, files: File[]): { system: DesignSystem; reason: string } {
  const names = files.map(f => f.name.toLowerCase())
  const exts = files.map(f => f.name.split('.').pop()?.toLowerCase() ?? '')
  const hasDCM = exts.some(e => e === 'dcm')
  const hasOnlyPhotos = exts.every(e => ['jpg', 'jpeg', 'png', 'heic'].includes(e))
  const isCerecFile = names.some(n => n.includes('primescan') || n.includes('cerec') || n.includes('.dxd'))

  if (mode === 'implant-restoration' || hasDCM) {
    return { system: 'exocad', reason: 'Lab CAD has full implant library + DICOM support' }
  }
  if (mode === 'smile-mockup' && hasOnlyPhotos) {
    return { system: 'smilefy', reason: 'Smile Design is photo-native — ideal for DSD' }
  }
  if (isCerecFile || mode === 'prep-restoration') {
    return { system: 'cerec', reason: 'Mill Connect — fastest in-office same-day workflow' }
  }
  return { system: 'exocad', reason: 'Lab CAD — most versatile for this case type' }
}

interface FileSlot {
  id: string
  label: string
  required: boolean
  accept: string
  hint: string
  uploaded: boolean
  file?: File
}

interface SystemJob {
  system: DesignSystem
  jobId: string
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error'
  progress: number
  resultUrl?: string
  startedAt?: Date
}

// ── System definitions ──
const SYSTEMS: Record<DesignSystem, {
  name: string
  logo: string
  tagline: string
  color: string
  colorBg: string
  modes: CaseMode[]
  description: string
  outputFormats: string[]
  roundTrip: boolean
}> = {
  cerec: {
    name: 'Mill Connect',
    logo: '◈',
    tagline: 'In-Office CAD/CAM',
    color: '#0055b3',
    colorBg: 'rgba(0,85,179,.07)',
    modes: ['prep-restoration', 'implant-restoration'],
    description: 'In-office mill workflow. Upload prep scan → Restora AI designs → route to your in-office mill unit. Same-day crown delivery.',
    outputFormats: ['STL', 'DXD'],
    roundTrip: true,
  },
  smilefy: {
    name: 'Smile Design',
    logo: '◉',
    tagline: 'Photo-Based DSD',
    color: '#e8612a',
    colorBg: 'rgba(232,97,42,.07)',
    modes: ['smile-mockup', 'prep-restoration'],
    description: 'Upload patient photos → cloud DSD designs the smile → import mockup overlay and tooth dimensions back to Restora for restoration correlation.',
    outputFormats: ['PNG overlay', 'Dimensions JSON'],
    roundTrip: true,
  },
  exocad: {
    name: 'Lab CAD',
    logo: '⬡',
    tagline: 'Full Lab Design Suite',
    color: '#9b7eea',
    colorBg: 'rgba(155,126,234,.07)',
    modes: ['prep-restoration', 'smile-mockup', 'implant-restoration'],
    description: 'Export full design package to your lab's CAD platform. Bridge, implant bar, full arch, and abutment design. Round-trip STL import.',
    outputFormats: ['STL', '3OX', 'DCM', 'PDF lab RX'],
    roundTrip: true,
  },
}

const MODES: Record<CaseMode, {
  label: string
  icon: string
  description: string
  fileSlots: FileSlot[]
}> = {
  'prep-restoration': {
    label: 'Prep Restoration',
    icon: '🦷',
    description: 'Crown, veneer, onlay, inlay — design on a prepared tooth',
    fileSlots: [
      { id: 'upper', label: 'Upper arch scan', required: true, accept: '.stl,.obj,.ply', hint: 'STL from any IOS scanner', uploaded: false },
      { id: 'lower', label: 'Lower arch scan', required: true, accept: '.stl,.obj,.ply', hint: 'STL from any IOS scanner', uploaded: false },
      { id: 'bite', label: 'Bite registration', required: false, accept: '.stl,.obj', hint: 'Optional — improves occlusion', uploaded: false },
      { id: 'prep-photo', label: 'Prep photo', required: false, accept: '.jpg,.jpeg,.png,.heic', hint: 'Retracted view post-prep', uploaded: false },
    ],
  },
  'smile-mockup': {
    label: 'Smile Mockup',
    icon: '😊',
    description: 'Digital smile design — mockup before any preparation',
    fileSlots: [
      { id: 'face-repose', label: 'Full face — repose', required: true, accept: '.jpg,.jpeg,.png,.heic', hint: 'Lips relaxed, natural light', uploaded: false },
      { id: 'face-smile', label: 'Full face — smile', required: true, accept: '.jpg,.jpeg,.png,.heic', hint: 'Full smile, natural light', uploaded: false },
      { id: 'retracted', label: 'Retracted frontal', required: true, accept: '.jpg,.jpeg,.png,.heic', hint: 'Cheek retractors in place', uploaded: false },
      { id: 'lateral-r', label: 'Lateral — right', required: false, accept: '.jpg,.jpeg,.png,.heic', hint: 'Right buccal view', uploaded: false },
      { id: 'lateral-l', label: 'Lateral — left', required: false, accept: '.jpg,.jpeg,.png,.heic', hint: 'Left buccal view', uploaded: false },
      { id: 'upper-arch', label: 'Upper arch scan', required: false, accept: '.stl,.obj,.ply', hint: 'Adds 3D correlation', uploaded: false },
    ],
  },
  'implant-restoration': {
    label: 'Implant Restoration',
    icon: '🔩',
    description: 'Crown on implant, bridge on implants, bar/abutment design',
    fileSlots: [
      { id: 'upper', label: 'Upper arch scan', required: true, accept: '.stl,.obj,.ply', hint: 'With scan body in place', uploaded: false },
      { id: 'lower', label: 'Lower arch scan', required: true, accept: '.stl,.obj,.ply', hint: 'STL from any IOS scanner', uploaded: false },
      { id: 'cbct', label: 'CBCT / DICOM', required: false, accept: '.dcm,.zip', hint: 'Required for guided surgery', uploaded: false },
      { id: 'scan-body-report', label: 'Scan body report', required: false, accept: '.pdf,.csv', hint: 'Manufacturer position data', uploaded: false },
      { id: 'bite', label: 'Bite registration', required: false, accept: '.stl,.obj', hint: 'Occlusal verification', uploaded: false },
    ],
  },
}

// ── Colors matching Restora design system ──
const T = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  ink: '#111827',
  muted: '#6b7280',
  light: '#9ca3af',
  teal: '#00b48a',
  tealBg: 'rgba(0,180,138,.06)',
  tealBorder: 'rgba(0,180,138,.2)',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  shadow: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,.08)',
}

// ── Main component ──
export function DesignSystemsBridge() {
  const [step, setStep] = useState<WorkflowStep>('mode')
  const [mode, setMode] = useState<CaseMode | null>(null)
  const [system, setSystem] = useState<DesignSystem | null>(null)
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([])
  const [job, setJob] = useState<SystemJob | null>(null)
  const [restorationType, setRestorationType] = useState('crown')
  const [toothNumbers, setToothNumbers] = useState<string>('8, 9')
  const [labNote, setLabNote] = useState('')

  // ── AUTO MODE ──
  const [autoMode, setAutoMode] = useState(true)
  const [autoDetection, setAutoDetection] = useState<{
    mode: CaseMode; system: DesignSystem
    modeReason: string; systemReason: string; confidence: number
  } | null>(null)
  const [autoSendCountdown, setAutoSendCountdown] = useState<number | null>(null)
  const autoSendRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const runAutoDetect = useCallback((files: File[]) => {
    const modeResult = inferModeFromFiles(files)
    if (!modeResult) return
    const systemResult = pickBestSystem(modeResult.mode, files)
    setAutoDetection({
      mode: modeResult.mode, system: systemResult.system,
      modeReason: modeResult.reason, systemReason: systemResult.reason,
      confidence: modeResult.confidence,
    })
    setMode(modeResult.mode); setSystem(systemResult.system)
    const slots = MODES[modeResult.mode].fileSlots.map(s => ({ ...s }))
    const assigned = new Set<string>()
    files.forEach(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      const name = f.name.toLowerCase()
      const slot = slots.find(s => {
        if (assigned.has(s.id) || !s.accept.includes(ext)) return false
        if (s.id === 'upper' && (name.includes('upper') || name.includes('max'))) return true
        if (s.id === 'lower' && (name.includes('lower') || name.includes('mand'))) return true
        if (s.id === 'bite' && (name.includes('bite') || name.includes('occ'))) return true
        if (s.id === 'cbct' && (ext === 'dcm' || name.includes('cbct'))) return true
        if (['jpg','jpeg','png','heic'].includes(ext) && !s.uploaded) return true
        if (!s.uploaded) return true
        return false
      })
      if (slot) { slot.file = f; slot.uploaded = true; assigned.add(slot.id) }
    })
    setFileSlots(slots)
    setStep('files')
  }, [])

  // Auto-send countdown when all required files uploaded
  useEffect(() => {
    if (!autoMode || step !== 'files' || !mode || !system) return
    const required = fileSlots.filter(s => s.required)
    const done = fileSlots.filter(s => s.required && s.uploaded)
    if (required.length > 0 && done.length >= required.length) {
      setAutoSendCountdown(5); let t = 5
      autoSendRef.current = setInterval(() => {
        t -= 1
        if (t <= 0) { clearInterval(autoSendRef.current!); setAutoSendCountdown(null); handleSend() }
        else setAutoSendCountdown(t)
      }, 1000)
    } else {
      if (autoSendRef.current) clearInterval(autoSendRef.current)
      setAutoSendCountdown(null)
    }
    return () => { if (autoSendRef.current) clearInterval(autoSendRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileSlots, autoMode, step, mode, system])

  // Restoration type options per mode
  const restorationOptions = mode === 'implant-restoration'
    ? ['implant-crown', 'implant-bridge', 'implant-bar', 'implant-abutment', 'full-arch-zirconia']
    : mode === 'smile-mockup'
    ? ['smile-mockup', 'digital-wax-up']
    : ['crown', 'veneer', 'onlay', 'inlay', 'bridge', 'full-arch']

  const handleSelectMode = (m: CaseMode) => {
    setMode(m)
    setFileSlots(MODES[m].fileSlots.map(s => ({ ...s })))
    setSystem(null)
    setStep('system')
  }

  const handleSelectSystem = (s: DesignSystem) => {
    setSystem(s)
    setStep('files')
  }

  const handleFileUpload = useCallback((slotId: string, file: File) => {
    setFileSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, file, uploaded: true } : s
    ))
  }, [])

  const handleSend = () => {
    if (!system || !mode) return
    const newJob: SystemJob = {
      system,
      jobId: `RES-${Date.now()}`,
      status: 'uploading',
      progress: 0,
      startedAt: new Date(),
    }
    setJob(newJob)
    setStep('status')
    // Simulate upload → processing → ready
    let p = 0
    const iv = setInterval(() => {
      p += Math.random() * 18
      if (p >= 100) {
        p = 100
        clearInterval(iv)
        setJob(j => j ? { ...j, progress: 100, status: 'ready', resultUrl: '#mock-result' } : j)
      } else {
        setJob(j => j ? { ...j, progress: Math.round(p), status: p > 40 ? 'processing' : 'uploading' } : j)
      }
    }, 400)
  }

  const reset = () => {
    setStep('mode'); setMode(null); setSystem(null); setFileSlots([]); setJob(null)
  }

  const uploadedCount = fileSlots.filter(s => s.uploaded).length
  const requiredCount = fileSlots.filter(s => s.required).length
  const requiredDone = fileSlots.filter(s => s.required && s.uploaded).length
  const canSend = requiredDone >= requiredCount && system

  // ── Pill step indicator ──
  const steps: { id: WorkflowStep; label: string }[] = [
    { id: 'mode', label: 'Case type' },
    { id: 'system', label: 'System' },
    { id: 'files', label: 'Files' },
    { id: 'send', label: 'Send' },
    { id: 'status', label: 'Status' },
  ]
  const stepIdx = steps.findIndex(s => s.id === step)

  return (
    <div style={{ minHeight: '100%', background: T.bg, fontFamily: T.font, color: T.ink }}>

      {/* Header */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: T.teal, textTransform: 'uppercase' as const }}>Restora</span>
          <span style={{ width: 1, height: 18, background: T.border }} />
          <span style={{ fontSize: 12, color: T.muted, letterSpacing: 1 }}>Design Systems Bridge</span>
        </div>

        {/* Step pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {steps.map((s, i) => {
            const done = i < stepIdx
            const active = s.id === step
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  letterSpacing: .5, transition: 'all .2s',
                  background: active ? T.teal : done ? T.tealBg : 'transparent',
                  color: active ? 'white' : done ? T.teal : T.light,
                  border: `1px solid ${active ? T.teal : done ? T.tealBorder : T.border}`,
                }}>
                  {done ? '✓ ' : ''}{s.label.toUpperCase()}
                </div>
                {i < steps.length - 1 && <div style={{ width: 16, height: 1, background: T.border }} />}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Auto mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: autoMode ? T.teal : T.muted, fontWeight: 600 }}>AUTO</span>
            <div onClick={() => setAutoMode(a => !a)} style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer', transition: 'background .2s',
              background: autoMode ? T.teal : T.border, position: 'relative' as const,
            }}>
              <div style={{
                position: 'absolute' as const, top: 2, left: autoMode ? 18 : 2,
                width: 16, height: 16, borderRadius: 8, background: 'white',
                transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }} />
            </div>
          </div>
          <button onClick={reset} style={{
            padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.border}`,
            background: 'transparent', fontSize: 11, color: T.muted, cursor: 'pointer',
            fontFamily: T.font,
          }}>↺ Reset</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>

        {/* ── STEP: MODE ── */}
        {step === 'mode' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>
                What are you designing?
              </div>
              <div style={{ fontSize: 13, color: T.muted }}>
                {autoMode ? 'Drop files here — auto mode will detect and route automatically.' : 'Choose a case type to select the right system and file set.'}
              </div>
            </div>

            {/* Auto mode drop zone */}
            {autoMode && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const files = Array.from(e.dataTransfer.files)
                  if (files.length) runAutoDetect(files)
                }}
                style={{
                  border: `2px dashed ${dragOver ? T.teal : T.tealBorder}`,
                  borderRadius: 12, padding: '36px 24px', textAlign: 'center' as const,
                  background: dragOver ? T.tealBg : 'transparent',
                  marginBottom: 28, transition: 'all .2s', cursor: 'pointer',
                }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
                  Drop any case files here
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
                  STL, DICOM, photos — auto mode detects case type, picks system, and sends when ready
                </div>
                <label style={{
                  padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: T.teal, color: 'white', cursor: 'pointer', border: 'none',
                }}>
                  Browse files
                  <input type="file" multiple accept=".stl,.obj,.ply,.dcm,.zip,.jpg,.jpeg,.png,.heic,.pdf,.csv"
                    style={{ display: 'none' }}
                    onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) runAutoDetect(f) }} />
                </label>
              </div>
            )}

            <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, letterSpacing: 1 }}>
              {autoMode ? 'OR SELECT MANUALLY:' : 'SELECT CASE TYPE:'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {(Object.keys(MODES) as CaseMode[]).map(m => {
                const def = MODES[m]
                return (
                  <button key={m} onClick={() => handleSelectMode(m)} style={{
                    textAlign: 'left', padding: 24, borderRadius: 12,
                    border: `1.5px solid ${T.border}`, background: T.surface,
                    cursor: 'pointer', transition: 'all .15s', fontFamily: T.font,
                    boxShadow: T.shadow,
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = T.teal
                      el.style.boxShadow = `0 0 0 3px ${T.tealBg}, ${T.shadow}`
                      el.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = T.border
                      el.style.boxShadow = T.shadow
                      el.style.transform = ''
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{def.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{def.label}</div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{def.description}</div>
                    <div style={{ marginTop: 16, fontSize: 10, color: T.light, fontFamily: T.fontMono }}>
                      {def.fileSlots.length} file slots · {def.fileSlots.filter(f => f.required).length} required
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP: SYSTEM ── */}
        {step === 'system' && mode && (
          <div>
            <button onClick={() => setStep('mode')} style={{
              marginBottom: 24, fontSize: 12, color: T.muted, background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: T.font,
            }}>← Back</button>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>
                {MODES[mode].icon} {MODES[mode].label} — Choose a system
              </div>
              <div style={{ fontSize: 13, color: T.muted }}>
                Systems highlighted in teal support this case type.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {(Object.keys(SYSTEMS) as DesignSystem[]).map(s => {
                const def = SYSTEMS[s]
                const supported = def.modes.includes(mode)
                return (
                  <button key={s} onClick={() => supported && handleSelectSystem(s)}
                    disabled={!supported}
                    style={{
                      textAlign: 'left', padding: 24, borderRadius: 12,
                      border: `1.5px solid ${supported ? def.color + '40' : T.border}`,
                      background: supported ? def.colorBg : '#fafafa',
                      cursor: supported ? 'pointer' : 'not-allowed',
                      opacity: supported ? 1 : 0.45,
                      transition: 'all .15s', fontFamily: T.font, boxShadow: T.shadow,
                    }}
                    onMouseEnter={e => {
                      if (!supported) return
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = def.color
                      el.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      if (!supported) return
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = def.color + '40'
                      el.style.transform = ''
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 22, color: def.color }}>{def.logo}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{def.name}</div>
                        <div style={{ fontSize: 10, color: T.muted, letterSpacing: .5 }}>{def.tagline.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                      {def.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                      {def.outputFormats.map(f => (
                        <span key={f} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 9,
                          fontFamily: T.fontMono, fontWeight: 600,
                          background: def.color + '15', color: def.color,
                        }}>{f}</span>
                      ))}
                      {def.roundTrip && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 9,
                          fontFamily: T.fontMono, fontWeight: 600,
                          background: T.tealBg, color: T.teal,
                        }}>↔ Round-trip</span>
                      )}
                    </div>
                    {!supported && (
                      <div style={{ marginTop: 12, fontSize: 10, color: T.light }}>
                        Not available for {MODES[mode].label}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP: FILES ── */}
        {step === 'files' && mode && system && (
          <div>
            <button onClick={() => setStep('system')} style={{
              marginBottom: 24, fontSize: 12, color: T.muted, background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: T.font,
            }}>← Back</button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
              {/* Left: files */}
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 4 }}>
                    Upload case files
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    {uploadedCount}/{fileSlots.length} files uploaded · {requiredDone}/{requiredCount} required
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 10, height: 3, background: T.border, borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: T.teal,
                      width: `${fileSlots.length ? (uploadedCount / fileSlots.length) * 100 : 0}%`,
                      transition: 'width .3s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  {fileSlots.map(slot => (
                    <div key={slot.id} style={{
                      padding: '14px 16px', borderRadius: 10,
                      border: `1px solid ${slot.uploaded ? T.teal + '60' : T.border}`,
                      background: slot.uploaded ? T.tealBg : T.surface,
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'all .2s',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: slot.uploaded ? T.teal : T.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: 'white',
                      }}>
                        {slot.uploaded ? '✓' : '↑'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{slot.label}</span>
                          {slot.required && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                              background: '#fef3cd', color: '#92400e', letterSpacing: .5,
                            }}>REQUIRED</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                          {slot.uploaded && slot.file ? slot.file.name : slot.hint}
                        </div>
                      </div>
                      <label style={{
                        padding: '7px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${slot.uploaded ? T.teal : T.border}`,
                        color: slot.uploaded ? T.teal : T.muted,
                        background: 'transparent', cursor: 'pointer',
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {slot.uploaded ? 'Replace' : 'Upload'}
                        <input type="file" accept={slot.accept} style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) handleFileUpload(slot.id, f)
                          }} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: case details + send */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {/* System badge */}
                <div style={{
                  padding: 16, borderRadius: 10, border: `1px solid ${SYSTEMS[system].color}30`,
                  background: SYSTEMS[system].colorBg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, color: SYSTEMS[system].color }}>{SYSTEMS[system].logo}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{SYSTEMS[system].name}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{SYSTEMS[system].tagline}</div>
                    </div>
                  </div>
                </div>

                {/* Restoration type */}
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, marginBottom: 10 }}>RESTORATION TYPE</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {restorationOptions.map(r => (
                      <button key={r} onClick={() => setRestorationType(r)} style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${restorationType === r ? T.teal : T.border}`,
                        background: restorationType === r ? T.tealBg : 'transparent',
                        color: restorationType === r ? T.teal : T.muted,
                        cursor: 'pointer', fontFamily: T.font,
                      }}>{r}</button>
                    ))}
                  </div>
                </div>

                {/* Tooth numbers */}
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, marginBottom: 8 }}>TOOTH NUMBERS</div>
                  <input
                    value={toothNumbers}
                    onChange={e => setToothNumbers(e.target.value)}
                    placeholder="e.g. 8, 9 or 30"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 6,
                      border: `1px solid ${T.border}`, fontSize: 13,
                      fontFamily: T.fontMono, color: T.ink, background: T.bg,
                      outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  />
                </div>

                {/* Lab note */}
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, marginBottom: 8 }}>NOTES</div>
                  <textarea
                    value={labNote}
                    onChange={e => setLabNote(e.target.value)}
                    rows={3}
                    placeholder="Design notes, shade details, special instructions…"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 6,
                      border: `1px solid ${T.border}`, fontSize: 12,
                      fontFamily: T.font, color: T.ink, background: T.bg,
                      outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const,
                    }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    padding: '14px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
                    background: canSend ? T.teal : T.border,
                    color: canSend ? 'white' : T.muted,
                    fontFamily: T.font, transition: 'all .15s',
                    boxShadow: canSend ? '0 4px 12px rgba(0,180,138,.3)' : 'none',
                  }}>
                  Send to {system ? SYSTEMS[system].name : '—'} →
                </button>

                {!canSend && (
                  <div style={{ fontSize: 11, color: T.muted, textAlign: 'center' as const }}>
                    Upload {requiredCount - requiredDone} more required file{requiredCount - requiredDone !== 1 ? 's' : ''} to continue
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: STATUS ── */}
        {step === 'status' && job && system && mode && (
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <div style={{
              background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
              padding: 32, boxShadow: T.shadowMd,
            }}>
              {/* System + job ID */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24, color: SYSTEMS[system].color }}>{SYSTEMS[system].logo}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Sent to {SYSTEMS[system].name}</div>
                    <div style={{ fontSize: 10, fontFamily: T.fontMono, color: T.muted }}>{job.jobId}</div>
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: job.status === 'ready' ? T.tealBg : '#fef3cd',
                  color: job.status === 'ready' ? T.teal : '#92400e',
                  border: `1px solid ${job.status === 'ready' ? T.tealBorder : '#f59e0b40'}`,
                }}>
                  {job.status.toUpperCase().replace('-', ' ')}
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: T.muted }}>
                    {job.status === 'uploading' ? 'Uploading files…' :
                     job.status === 'processing' ? `Processing in ${SYSTEMS[system].name}…` :
                     job.status === 'ready' ? 'Design ready for review' : ''}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: T.fontMono, color: T.ink }}>
                    {job.progress}%
                  </span>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: job.status === 'ready' ? T.teal : SYSTEMS[system].color,
                    width: `${job.progress}%`,
                    transition: 'width .4s ease',
                  }} />
                </div>
              </div>

              {/* Case summary */}
              <div style={{
                background: T.bg, borderRadius: 10, padding: 16, marginBottom: 24,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                {[
                  { label: 'Case type', value: MODES[mode].label },
                  { label: 'System', value: SYSTEMS[system].name },
                  { label: 'Restoration', value: restorationType },
                  { label: 'Teeth', value: toothNumbers || '—' },
                  { label: 'Files sent', value: `${fileSlots.filter(f => f.uploaded).length} files` },
                  { label: 'Started', value: job.startedAt?.toLocaleTimeString() || '—' },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: 10, color: T.light, letterSpacing: 1, marginBottom: 2 }}>{row.label.toUpperCase()}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {job.status === 'ready' ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  <button style={{
                    padding: '13px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: 'none', background: T.teal, color: 'white', cursor: 'pointer',
                    fontFamily: T.font, boxShadow: '0 4px 12px rgba(0,180,138,.3)',
                  }}>
                    Import design → Restora
                  </button>
                  <button style={{
                    padding: '11px 24px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.muted, cursor: 'pointer', fontFamily: T.font,
                  }}>
                    Open in partner system ↗
                  </button>
                  <button onClick={reset} style={{
                    padding: '11px 24px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: 'none', background: 'transparent', color: T.light,
                    cursor: 'pointer', fontFamily: T.font,
                  }}>
                    ↺ New case
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' as const, fontSize: 12, color: T.muted }}>
                  Waiting for {SYSTEMS[system].name} to process…
                  {system === 'smilefy' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: T.light }}>
                      Cloud smile design typically completes in 4–24 hours
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DesignSystemsBridge
