import { useState, useCallback, useReducer } from 'react'

// ═══════════════════════════════════════════════════════════════
// AI DESIGN GUIDE
// Case intake → AACD + technique manual parameters →
// AI design brief → unified Mill Connect · Smile Design · Lab CAD
// ═══════════════════════════════════════════════════════════════

// ── Design tokens ──
const T = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#21262d',
  surface3: '#2d333b',
  border: '#30363d',
  borderSoft: '#21262d',
  ink: '#e6edf3',
  muted: '#8b949e',
  light: '#484f58',
  teal: '#00b48a',
  tealDim: 'rgba(0,180,138,.12)',
  tealBorder: 'rgba(0,180,138,.25)',
  gold: '#d4a843',
  goldDim: 'rgba(212,168,67,.1)',
  amber: '#f0883e',
  amberDim: 'rgba(240,136,62,.1)',
  purple: '#bc8cff',
  purpleDim: 'rgba(188,140,255,.1)',
  red: '#f85149',
  green: '#3fb950',
  font: "'DM Mono', 'JetBrains Mono', monospace",
  fontSans: "'DM Sans', 'Inter', sans-serif",
  shadow: '0 0 0 1px rgba(255,255,255,.04), 0 4px 16px rgba(0,0,0,.4)',
}

// ── Case types ──
type CaseType = 'cosmetic-anterior' | 'smile-makeover' | 'restorative-posterior' | 'implant-single' | 'implant-full-arch'

const CASE_TYPES: Record<CaseType, {
  label: string; icon: string; subtitle: string; color: string; colorDim: string
  systems: string[]; description: string
}> = {
  'cosmetic-anterior': {
    label: 'Cosmetic Anterior', icon: '✦', subtitle: 'Veneers · Crowns · Bonding',
    color: T.gold, colorDim: T.goldDim,
    systems: ['Smile Design', 'Mill Connect', 'Lab CAD'],
    description: 'Esthetic zone cases where smile design parameters drive all decisions',
  },
  'smile-makeover': {
    label: 'Smile Makeover', icon: '◈', subtitle: 'Full arch esthetic redesign',
    color: T.teal, colorDim: T.tealDim,
    systems: ['Smile Design', 'Lab CAD', 'Mill Connect'],
    description: 'Multi-unit comprehensive esthetic treatment — full protocol applied',
  },
  'restorative-posterior': {
    label: 'Restorative Posterior', icon: '⬡', subtitle: 'Crowns · Onlays · Inlays',
    color: T.purple, colorDim: T.purpleDim,
    systems: ['Mill Connect', 'Lab CAD'],
    description: 'Function-first design with biologic shaping and occlusal protocol',
  },
  'implant-single': {
    label: 'Single Implant', icon: '◆', subtitle: 'Crown on implant — any zone',
    color: T.amber, colorDim: T.amberDim,
    systems: ['Lab CAD', 'Mill Connect'],
    description: 'Implant crown design — emergence, platform matching, and esthetic integration',
  },
  'implant-full-arch': {
    label: 'Full Arch Implant', icon: '⬟', subtitle: 'Hybrid · Zirconia · Bar',
    color: T.teal, colorDim: T.tealDim,
    systems: ['Lab CAD'],
    description: 'Complete arch prosthetic design — iBar, monolithic, FP3, All-on-X',
  },
}

// ── Parameter definitions per category ──
interface Param {
  id: string; label: string; type: 'select' | 'range' | 'text' | 'toggle' | 'multiselect'
  options?: string[]; min?: number; max?: number; step?: number; unit?: string
  default: string | number | boolean | string[]; aacd?: boolean; tip?: string
}

const PARAMS_ESTHETIC: Param[] = [
  { id: 'smile_arc', label: 'Smile arc', type: 'select', aacd: true,
    options: ['Consonant (ideal)', 'Slightly flat', 'Reverse — must correct', 'Maintain existing'],
    default: 'Consonant (ideal)',
    tip: 'AACD: arc follows lower lip curvature — never flat or reverse' },
  { id: 'wl_ratio', label: 'Central W:L ratio target', type: 'range', aacd: true,
    min: 65, max: 90, step: 1, unit: '%', default: 78,
    tip: 'AACD standard: 75–80%. Lower = longer feel. Higher = squarer.' },
  { id: 'incisal_display', label: 'Incisal display at repose', type: 'range', aacd: true,
    min: 0, max: 5, step: 0.5, unit: 'mm', default: 2,
    tip: 'AACD: 1–3mm display for female, 0.5–1.5mm male. Age-appropriate.' },
  { id: 'midline', label: 'Midline treatment', type: 'select', aacd: true,
    options: ['Align to facial midline', 'Maintain existing', 'Shift right', 'Shift left', 'Accept deviation <1mm'],
    default: 'Align to facial midline',
    tip: 'AACD: deviations >1mm are perceptible. <1mm often acceptable.' },
  { id: 'gingival_levels', label: 'Gingival levels', type: 'select', aacd: true,
    options: ['Centrals = canines · laterals 0.5mm coronal (AACD ideal)', 'All at same level', 'Custom — note below'],
    default: 'Centrals = canines · laterals 0.5mm coronal (AACD ideal)',
    tip: 'AACD: zenith at distal 1/3. Laterals 0.5mm more coronal than centrals.' },
  { id: 'tooth_form', label: 'Tooth form', type: 'select',
    options: ['Square-tapering (balanced)', 'Ovoid (soft/feminine)', 'Triangular (bold/youthful)', 'Square (broad/masculine)', 'Match existing morphology'],
    default: 'Square-tapering (balanced)' },
  { id: 'embrasure', label: 'Embrasure form', type: 'select', aacd: true,
    options: ['Open (youthful)', 'Closed (mature)', 'Progressive — open anteriorly'],
    default: 'Progressive — open anteriorly',
    tip: 'AACD: embrasures open incisally, closed cervically. Progressive improves with age.' },
  { id: 'axial_incl', label: 'Axial inclination', type: 'select', aacd: true,
    options: ['Mesial convergence toward midline (ideal)', 'Upright', 'Custom — see notes'],
    default: 'Mesial convergence toward midline (ideal)',
    tip: 'AACD: all teeth incline mesially toward midline. Never distal tilt.' },
  { id: 'surface_texture', label: 'Surface texture', type: 'select',
    options: ['Smooth (high gloss · bleached)', 'Subtle perikymata', 'Moderate texture', 'Pronounced (natural · characterised)'],
    default: 'Subtle perikymata' },
  { id: 'shade', label: 'Target shade', type: 'select',
    options: ['BL1', 'BL2', 'BL3', 'BL4', 'A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'Match existing', 'Custom'],
    default: 'A1' },
  { id: 'characterisation', label: 'Characterisation', type: 'multiselect',
    options: ['Mamelons', 'Incisal halo', 'Cervical chroma', 'Surface crazing', 'Stain lines', 'None'],
    default: ['Incisal halo', 'Cervical chroma'],
    tip: 'Characterisation adds lifelike detail. Less = cleaner bleached result.' },
]

const PARAMS_PREP: Param[] = [
  { id: 'prep_type', label: 'Preparation type', type: 'select',
    options: ['No-prep', 'Minimal prep < 0.3mm', 'Conventional veneer 0.3–0.5mm', 'Crown prep full coverage', 'Onlay', 'Inlay', 'Post + core'],
    default: 'Minimal prep < 0.3mm' },
  { id: 'margin_type', label: 'Margin type', type: 'select',
    options: ['Feather/knife edge (no-prep)', 'Chamfer 0.3mm', 'Chamfer 0.5mm', 'Heavy chamfer', 'Shoulder', 'Shoulder + bevel', 'Rounded shoulder'],
    default: 'Chamfer 0.3mm' },
  { id: 'margin_location', label: 'Margin location', type: 'select',
    options: ['Supragingival 0.5–1mm (ideal)', 'Equigingival', 'Subgingival 0.5mm', 'Subgingival 1mm (biologic width risk)'],
    default: 'Supragingival 0.5–1mm (ideal)',
    tip: 'Technique manual: supragingival preferred. Sub only for esthetic necessity.' },
  { id: 'facial_reduction', label: 'Facial reduction', type: 'range',
    min: 0, max: 1.5, step: 0.1, unit: 'mm', default: 0.3,
    tip: 'Technique manual: flag if >0.5mm. Prefer 0.3mm or less.' },
  { id: 'material', label: 'Material', type: 'select',
    options: ['Pressed lithium disilicate', 'Milled lithium disilicate', 'Feldspathic porcelain', 'Composite resin', 'Zirconia HT', 'Zirconia MT (monolithic)', 'Cast gold', 'PFM'],
    default: 'Pressed lithium disilicate' },
  { id: 'emergence', label: 'Emergence profile', type: 'select',
    options: ['Zero tissue push (ideal)', 'Minimal push < 0.5mm', 'Standard (lab default)', 'Customise to shaped root surface'],
    default: 'Zero tissue push (ideal)',
    tip: 'Technique manual: concave or flat subgingival. Never convex below margin.' },
]

const PARAMS_OCCLUSAL: Param[] = [
  { id: 'occlusal_scheme', label: 'Occlusal scheme', type: 'select',
    options: ['Canine-guided (default)', 'Mutually protected', 'Group function', 'Lingualized (full arch)'],
    default: 'Canine-guided (default)' },
  { id: 'anterior_guidance', label: 'Anterior guidance', type: 'select',
    options: ['Establish · posterior disclusion required', 'Maintain existing', 'Shallow — parafunctional concern', 'Steep — not modifying'],
    default: 'Establish · posterior disclusion required' },
  { id: 'centric_contacts', label: 'Centric contacts', type: 'select',
    options: ['Flat planes (ideal)', 'Cusp tip — must adjust', 'Tripod contacts', 'No contacts (implant)'],
    default: 'Flat planes (ideal)' },
  { id: 'excursive', label: 'Excursive contacts', type: 'toggle', default: false,
    tip: 'Toggle ON to flag. AACD / technique: posterior must disclude in all excursives.' },
]

const PARAMS_IMPLANT: Param[] = [
  { id: 'implant_zone', label: 'Zone', type: 'select',
    options: ['Anterior esthetic (1–3, 14–16)', 'Posterior load-bearing', 'Single posterior', 'Replacing canine (guidance concern)'],
    default: 'Posterior load-bearing' },
  { id: 'restoration_type', label: 'Restoration type', type: 'select',
    options: ['Screw-retained crown (preferred)', 'Cement-retained crown', 'Custom abutment + crown', 'Hybrid abutment', 'Bar overdenture'],
    default: 'Screw-retained crown (preferred)' },
  { id: 'platform', label: 'Platform switching', type: 'toggle', default: true,
    tip: 'Platform switching preserves crestal bone. Enabled by default.' },
  { id: 'prosthetic_space', label: 'Prosthetic space available', type: 'range',
    min: 5, max: 20, step: 0.5, unit: 'mm', default: 10 },
  { id: 'immediate_load', label: 'Immediate loading', type: 'toggle', default: false,
    tip: 'Requires ≥35 Ncm primary stability. Only enable if confirmed.' },
  { id: 'tissue_level', label: 'Tissue level', type: 'select',
    options: ['Thick-flat (ideal implant phenotype)', 'Thin-scalloped (high esthetic risk)', 'Medium'],
    default: 'Thick-flat (ideal implant phenotype)' },
]

type ParamValues = Record<string, string | number | boolean | string[]>

// ── Step machine ──
type Step = 'case-type' | 'parameters' | 'generating' | 'brief' | 'suite'
type ActiveSystem = 'mill' | 'smile' | 'lab'

interface State {
  step: Step
  caseType: CaseType | null
  params: ParamValues
  brief: DesignBrief | null
  activeSystem: ActiveSystem
  activeTab: string
}

interface DesignBrief {
  summary: string
  esthetic_decisions: Array<{ parameter: string; value: string; rationale: string; aacd: boolean }>
  restorative_decisions: Array<{ parameter: string; value: string; rationale: string }>
  protocol_flags: Array<{ level: 'pass' | 'warning' | 'critical'; message: string }>
  suite_routing: {
    smile_design: { role: string; tasks: string[]; active: boolean }
    mill_connect: { role: string; tasks: string[]; active: boolean }
    lab_cad: { role: string; tasks: string[]; active: boolean }
  }
  lab_rx_summary: string
}

const INITIAL_STATE: State = {
  step: 'case-type', caseType: null, params: {}, brief: null,
  activeSystem: 'smile', activeTab: 'esthetic',
}

type Action =
  | { type: 'SET_CASE'; payload: CaseType }
  | { type: 'SET_PARAM'; id: string; value: string | number | boolean | string[] }
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_BRIEF'; payload: DesignBrief }
  | { type: 'SET_SYSTEM'; payload: ActiveSystem }
  | { type: 'SET_TAB'; payload: string }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CASE': {
      // Set defaults for this case type
      const defaults: ParamValues = {}
      const allParams = [...PARAMS_ESTHETIC, ...PARAMS_PREP, ...PARAMS_OCCLUSAL, ...PARAMS_IMPLANT]
      allParams.forEach(p => { defaults[p.id] = p.default })
      return { ...state, caseType: action.payload, params: defaults, step: 'parameters', activeTab: 'esthetic' }
    }
    case 'SET_PARAM': return { ...state, params: { ...state.params, [action.id]: action.value } }
    case 'SET_STEP': return { ...state, step: action.payload }
    case 'SET_BRIEF': return { ...state, brief: action.payload, step: 'brief' }
    case 'SET_SYSTEM': return { ...state, activeSystem: action.payload }
    case 'SET_TAB': return { ...state, activeTab: action.payload }
    case 'RESET': return INITIAL_STATE
    default: return state
  }
}

// ── AI prompt builder ──
function buildPrompt(caseType: CaseType, params: ParamValues): string {
  return `You are Restora, an AI dental design assistant. Generate a comprehensive design brief.

CASE TYPE: ${CASE_TYPES[caseType].label}
INDICATION: ${CASE_TYPES[caseType].subtitle}

=== AACD + TECHNIQUE MANUAL PARAMETERS ===
${Object.entries(params).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')}

=== AACD PROTOCOL BASELINES ===
- Central W:L target 75–80% (recurring esthetic dental proportion)
- Smile arc must be consonant — follows lower lip
- Incisal display 1–3mm at repose
- Midline deviations >1mm are perceptible — flag
- Gingival zenith: centrals = canines. Laterals 0.5mm coronal.
- Emergence: concave or flat subgingival. Never convex.
- Minimal prep first: prefer no-prep or <0.5mm facial reduction
- Centric contacts on flat planes. Posterior disclusion in all excursives.

Generate a clinical design brief in this EXACT JSON schema (no preamble, no markdown):
{
  "summary": "2-sentence clinical summary of the case design approach",
  "esthetic_decisions": [
    { "parameter": "name", "value": "chosen value", "rationale": "1-sentence clinical rationale", "aacd": true/false }
  ],
  "restorative_decisions": [
    { "parameter": "name", "value": "chosen value", "rationale": "1-sentence clinical rationale" }
  ],
  "protocol_flags": [
    { "level": "pass|warning|critical", "message": "flag message" }
  ],
  "suite_routing": {
    "smile_design": { "role": "role description", "tasks": ["task 1", "task 2"], "active": true/false },
    "mill_connect": { "role": "role description", "tasks": ["task 1", "task 2"], "active": true/false },
    "lab_cad": { "role": "role description", "tasks": ["task 1", "task 2"], "active": true/false }
  },
  "lab_rx_summary": "Complete lab prescription in 3–4 sentences"
}`
}

// ── API call ──
async function generateBrief(caseType: CaseType, params: ParamValues): Promise<DesignBrief> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(caseType, params) }],
    }),
  })
  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Shared UI atoms ──
function Badge({ label, color, dim }: { label: string; color: string; dim: string }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
      letterSpacing: .8, background: dim, color, border: `1px solid ${color}30`,
      fontFamily: T.font,
    }}>{label}</span>
  )
}

function Flag({ level, message }: { level: string; message: string }) {
  const colors = { pass: T.green, warning: T.gold, critical: T.red }
  const icons = { pass: '✓', warning: '⚠', critical: '✕' }
  const c = colors[level as keyof typeof colors] || T.muted
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
      borderRadius: 6, background: c + '12', border: `1px solid ${c}30`, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: c, flexShrink: 0, marginTop: 1 }}>{icons[level as keyof typeof icons]}</span>
      <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{message}</span>
    </div>
  )
}

// ── Parameter controls ──
function ParamControl({ param, value, onChange }: {
  param: Param; value: string | number | boolean | string[]; onChange: (v: any) => void
}) {
  if (param.type === 'select') {
    return (
      <select value={value as string} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
          background: T.surface2, color: T.ink, fontSize: 12, fontFamily: T.fontSans, outline: 'none' }}>
        {param.options!.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (param.type === 'range') {
    const n = value as number
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="range" min={param.min} max={param.max} step={param.step} value={n}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: T.teal }} />
        <span style={{ fontSize: 12, fontFamily: T.font, color: T.teal, minWidth: 48, textAlign: 'right' as const }}>
          {n}{param.unit}
        </span>
      </div>
    )
  }
  if (param.type === 'toggle') {
    const b = value as boolean
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => onChange(!b)} style={{ width: 40, height: 22, borderRadius: 11,
          background: b ? T.teal : T.surface3, cursor: 'pointer', position: 'relative' as const,
          border: `1px solid ${b ? T.teal : T.border}`, transition: 'all .2s' }}>
          <div style={{ position: 'absolute' as const, top: 2, left: b ? 20 : 2,
            width: 16, height: 16, borderRadius: 8, background: 'white', transition: 'left .2s' }} />
        </div>
        <span style={{ fontSize: 11, color: b ? T.teal : T.muted }}>{b ? 'Yes' : 'No'}</span>
      </div>
    )
  }
  if (param.type === 'multiselect') {
    const selected = (value as string[]) || []
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
        {param.options!.map(o => {
          const on = selected.includes(o)
          return (
            <button key={o} onClick={() => {
              const next = on ? selected.filter(s => s !== o) : [...selected, o]
              onChange(next)
            }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              fontFamily: T.fontSans, border: `1px solid ${on ? T.teal : T.border}`,
              background: on ? T.tealDim : 'transparent', color: on ? T.teal : T.muted }}>
              {o}
            </button>
          )
        })}
      </div>
    )
  }
  return null
}

// ── Main ──
export function AIDesignGuide() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runGenerate = useCallback(async () => {
    if (!state.caseType) return
    setGenerating(true); setError(null)
    dispatch({ type: 'SET_STEP', payload: 'generating' })
    try {
      const brief = await generateBrief(state.caseType, state.params)
      dispatch({ type: 'SET_BRIEF', payload: brief })
    } catch (e: any) {
      setError(e.message || 'Generation failed')
      dispatch({ type: 'SET_STEP', payload: 'parameters' })
    } finally { setGenerating(false) }
  }, [state.caseType, state.params])

  const ct = state.caseType ? CASE_TYPES[state.caseType] : null

  // Parameter tabs per case type
  const tabs: Array<{ id: string; label: string; params: Param[] }> = [
    { id: 'esthetic', label: 'Esthetic', params: PARAMS_ESTHETIC },
    { id: 'prep', label: 'Prep + Material', params: PARAMS_PREP },
    { id: 'occlusion', label: 'Occlusion', params: PARAMS_OCCLUSAL },
    ...(state.caseType?.includes('implant') ? [{ id: 'implant', label: 'Implant', params: PARAMS_IMPLANT }] : []),
  ]
  const activeTabParams = tabs.find(t => t.id === state.activeTab)?.params ?? []

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.fontSans }}>

      {/* ── Header ── */}
      <div style={{ height: 52, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 28px',
        justifyContent: 'space-between', background: T.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3,
            color: T.teal, textTransform: 'uppercase' as const, fontFamily: T.font }}>Restora</span>
          <span style={{ width: 1, height: 16, background: T.border }} />
          <span style={{ fontSize: 11, color: T.muted, letterSpacing: .5 }}>AI Design Guide</span>
          {ct && <Badge label={ct.label.toUpperCase()} color={ct.color} dim={ct.colorDim} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Step breadcrumb */}
          {(['case-type', 'parameters', 'brief', 'suite'] as Step[]).map((s, i) => {
            const labels = { 'case-type': 'Case', 'parameters': 'Parameters', generating: '…', 'brief': 'AI Brief', 'suite': 'Design Suite' }
            const idx = ['case-type', 'parameters', 'brief', 'suite'].indexOf(state.step === 'generating' ? 'parameters' : state.step)
            const done = i < idx; const active = s === state.step
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontFamily: T.font, letterSpacing: .5, padding: '2px 8px', borderRadius: 3,
                  background: active ? T.teal : done ? T.tealDim : 'transparent',
                  color: active ? 'white' : done ? T.teal : T.light,
                  border: `1px solid ${active ? T.teal : done ? T.tealBorder : T.border}` }}>
                  {done ? '✓ ' : ''}{(labels as any)[s]}
                </span>
                {i < 3 && <span style={{ fontSize: 9, color: T.light }}>›</span>}
              </div>
            )
          })}
        </div>
        <button onClick={() => dispatch({ type: 'RESET' })} style={{ fontSize: 10, color: T.muted,
          background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
          padding: '4px 10px', cursor: 'pointer', fontFamily: T.font }}>↺ Reset</button>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* STEP 1: Case type */}
      {/* ═══════════════════════════════════════ */}
      {state.step === 'case-type' && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '52px 28px' }}>
          <div style={{ marginBottom: 40, textAlign: 'center' as const }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em', marginBottom: 8 }}>
              What type of case are you designing?
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              Your selection loads the appropriate AACD + technique manual parameter set
              and routes to the right design suite.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(Object.keys(CASE_TYPES) as CaseType[]).map(k => {
              const def = CASE_TYPES[k]
              return (
                <button key={k} onClick={() => dispatch({ type: 'SET_CASE', payload: k })}
                  style={{ textAlign: 'left', padding: 24, borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${T.border}`, background: T.surface,
                    fontFamily: T.fontSans, transition: 'all .15s', boxShadow: T.shadow }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = def.color; el.style.background = def.colorDim
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = T.border; el.style.background = T.surface
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 22, color: def.color }}>{def.icon}</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                      {def.systems.map(s => (
                        <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3,
                          background: T.surface2, color: T.muted, fontFamily: T.font, letterSpacing: .5 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: T.ink }}>{def.label}</div>
                  <div style={{ fontSize: 11, color: def.color, marginBottom: 10, fontStyle: 'italic' }}>{def.subtitle}</div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{def.description}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* STEP 2: Parameters */}
      {/* ═══════════════════════════════════════ */}
      {state.step === 'parameters' && ct && (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'case-type' })}
              style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 700, color: ct.color }}>{ct.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{ct.label}</div>
              <div style={{ fontSize: 11, color: T.muted }}>Configure AACD + technique manual parameters</div>
            </div>
          </div>

          {/* Parameter tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
                style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
                  cursor: 'pointer', fontFamily: T.fontSans, border: 'none',
                  borderBottom: `2px solid ${state.activeTab === tab.id ? T.teal : 'transparent'}`,
                  background: 'transparent',
                  color: state.activeTab === tab.id ? T.teal : T.muted,
                  transition: 'all .15s' }}>
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Parameter list */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
            {activeTabParams.map((param, i) => (
              <div key={param.id} style={{ padding: '16px 0',
                borderBottom: i < activeTabParams.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{param.label}</span>
                  {param.aacd && <Badge label="AACD" color={T.teal} dim={T.tealDim} />}
                  {param.tip && (
                    <span style={{ fontSize: 10, color: T.light, fontStyle: 'italic', flex: 1 }}>
                      {param.tip}
                    </span>
                  )}
                </div>
                <ParamControl
                  param={param}
                  value={state.params[param.id] ?? param.default}
                  onChange={v => dispatch({ type: 'SET_PARAM', id: param.id, value: v })}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 6,
              background: T.red + '15', border: `1px solid ${T.red}30`, color: T.red, fontSize: 12 }}>
              {error}
            </div>
          )}

          <button onClick={runGenerate}
            style={{ marginTop: 32, width: '100%', padding: '14px 28px', borderRadius: 8,
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: T.teal, color: 'white', fontFamily: T.fontSans,
              boxShadow: `0 4px 20px rgba(0,180,138,.3)`, letterSpacing: .5 }}>
            Generate AI Design Brief →
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* STEP: Generating */}
      {/* ═══════════════════════════════════════ */}
      {state.step === 'generating' && (
        <div style={{ maxWidth: 480, margin: '120px auto', textAlign: 'center' as const, padding: '0 28px' }}>
          <div style={{ fontSize: 32, marginBottom: 20 }}>◈</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Generating design brief…</div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
            Applying AACD guidelines · Technique manual protocol<br />
            Routing to design suite
          </div>
          <div style={{ marginTop: 32, height: 2, background: T.surface2, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: T.teal, width: '60%',
              animation: 'slide 1.4s ease-in-out infinite alternate',
              borderRadius: 1 }} />
          </div>
          <style>{`@keyframes slide { from { margin-left: 0 } to { margin-left: 40% } }`}</style>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* STEP 3: AI Brief */}
      {/* ═══════════════════════════════════════ */}
      {state.step === 'brief' && state.brief && ct && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>AI Design Brief</div>
              <div style={{ fontSize: 12, color: T.muted }}>{ct.label} · Generated from your parameters</div>
            </div>
            <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'suite' })}
              style={{ padding: '10px 22px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: 'none', background: T.teal, color: 'white', cursor: 'pointer',
                fontFamily: T.fontSans, boxShadow: `0 4px 12px rgba(0,180,138,.3)` }}>
              Open Design Suite →
            </button>
          </div>

          {/* Summary */}
          <div style={{ padding: 20, borderRadius: 8, background: T.surface,
            border: `1px solid ${T.border}`, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontFamily: T.font, color: T.teal,
              letterSpacing: 2, marginBottom: 10 }}>CLINICAL SUMMARY</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: T.ink, margin: 0 }}>
              {state.brief.summary}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Esthetic decisions */}
            <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
                fontSize: 10, fontFamily: T.font, color: T.gold, letterSpacing: 2 }}>ESTHETIC DECISIONS</div>
              <div style={{ padding: '8px 0' }}>
                {state.brief.esthetic_decisions?.map((d, i) => (
                  <div key={i} style={{ padding: '10px 16px',
                    borderBottom: i < state.brief!.esthetic_decisions.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.ink }}>{d.parameter}</span>
                      {d.aacd && <Badge label="AACD" color={T.teal} dim={T.tealDim} />}
                    </div>
                    <div style={{ fontSize: 12, color: T.gold, marginBottom: 4, fontFamily: T.font }}>{d.value}</div>
                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{d.rationale}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Restorative decisions */}
            <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
                fontSize: 10, fontFamily: T.font, color: T.purple, letterSpacing: 2 }}>RESTORATIVE DECISIONS</div>
              <div style={{ padding: '8px 0' }}>
                {state.brief.restorative_decisions?.map((d, i) => (
                  <div key={i} style={{ padding: '10px 16px',
                    borderBottom: i < state.brief!.restorative_decisions.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{d.parameter}</div>
                    <div style={{ fontSize: 12, color: T.purple, marginBottom: 4, fontFamily: T.font }}>{d.value}</div>
                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{d.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Protocol flags */}
          <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`,
            padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontFamily: T.font, color: T.muted,
              letterSpacing: 2, marginBottom: 12 }}>PROTOCOL COMPLIANCE</div>
            {state.brief.protocol_flags?.map((f, i) => (
              <Flag key={i} level={f.level} message={f.message} />
            ))}
          </div>

          {/* Suite routing */}
          <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`,
            padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontFamily: T.font, color: T.muted,
              letterSpacing: 2, marginBottom: 14 }}>DESIGN SUITE ROUTING</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { key: 'smile_design', label: 'Smile Design', color: T.amber },
                { key: 'mill_connect', label: 'Mill Connect', color: '#0a84ff' },
                { key: 'lab_cad', label: 'Lab CAD', color: T.purple },
              ].map(({ key, label, color }) => {
                const route = state.brief!.suite_routing?.[key as keyof typeof state.brief.suite_routing]
                if (!route) return null
                return (
                  <div key={key} style={{ padding: 14, borderRadius: 6,
                    border: `1px solid ${route.active ? color + '40' : T.border}`,
                    background: route.active ? color + '0d' : T.surface2,
                    opacity: route.active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: route.active ? color : T.muted,
                        fontFamily: T.font, letterSpacing: .5 }}>{label}</span>
                      {route.active
                        ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: color + '20', color }}>ACTIVE</span>
                        : <span style={{ fontSize: 9, color: T.light }}>—</span>}
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 8 }}>{route.role}</div>
                    {route.tasks.map((t, i) => (
                      <div key={i} style={{ fontSize: 10, color: T.light, marginBottom: 3 }}>· {t}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lab RX */}
          <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, padding: 16 }}>
            <div style={{ fontSize: 10, fontFamily: T.font, color: T.muted,
              letterSpacing: 2, marginBottom: 10 }}>LAB PRESCRIPTION</div>
            <p style={{ fontSize: 12, lineHeight: 1.8, color: T.muted, margin: 0 }}>
              {state.brief.lab_rx_summary}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* STEP 4: Unified Design Suite */}
      {/* ═══════════════════════════════════════ */}
      {state.step === 'suite' && state.brief && ct && (
        <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
          {/* Left: system tabs */}
          <div style={{ width: 200, background: T.surface, borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column' as const, padding: '16px 0' }}>
            <div style={{ padding: '0 16px 12px', fontSize: 9, color: T.light,
              letterSpacing: 2, fontFamily: T.font }}>DESIGN SUITE</div>

            {[
              { id: 'smile' as ActiveSystem, label: 'Smile Design', icon: '◉', color: T.amber,
                active: !!state.brief.suite_routing?.smile_design?.active },
              { id: 'mill' as ActiveSystem, label: 'Mill Connect', icon: '◈', color: '#0a84ff',
                active: !!state.brief.suite_routing?.mill_connect?.active },
              { id: 'lab' as ActiveSystem, label: 'Lab CAD', icon: '⬡', color: T.purple,
                active: !!state.brief.suite_routing?.lab_cad?.active },
            ].map(sys => (
              <button key={sys.id} onClick={() => dispatch({ type: 'SET_SYSTEM', payload: sys.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  border: 'none', cursor: sys.active ? 'pointer' : 'not-allowed',
                  background: state.activeSystem === sys.id ? sys.color + '15' : 'transparent',
                  borderLeft: `2px solid ${state.activeSystem === sys.id ? sys.color : 'transparent'}`,
                  opacity: sys.active ? 1 : 0.35, fontFamily: T.fontSans, transition: 'all .15s' }}>
                <span style={{ fontSize: 14, color: sys.color }}>{sys.icon}</span>
                <div style={{ textAlign: 'left' as const }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: state.activeSystem === sys.id ? sys.color : T.ink }}>
                    {sys.label}
                  </div>
                  {!sys.active && <div style={{ fontSize: 9, color: T.light }}>Not active this case</div>}
                </div>
              </button>
            ))}

            <div style={{ flex: 1 }} />
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'brief' })}
                style={{ fontSize: 10, color: T.muted, background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontFamily: T.fontSans }}>
                ← Back to brief
              </button>
            </div>
          </div>

          {/* Right: active system workspace */}
          <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
            {state.activeSystem === 'smile' && (
              <SuitePanel
                title="Smile Design" icon="◉" color={T.amber}
                role={state.brief.suite_routing?.smile_design?.role ?? ''}
                tasks={state.brief.suite_routing?.smile_design?.tasks ?? []}
                actions={['Upload patient photos', 'Generate smile preview', 'Import mockup overlay', 'Export to Restora']}
                brief={state.brief}
              />
            )}
            {state.activeSystem === 'mill' && (
              <SuitePanel
                title="Mill Connect" icon="◈" color="#0a84ff"
                role={state.brief.suite_routing?.mill_connect?.role ?? ''}
                tasks={state.brief.suite_routing?.mill_connect?.tasks ?? []}
                actions={['Upload prep scans', 'Generate crown design', 'Check occlusion', 'Send to mill unit']}
                brief={state.brief}
              />
            )}
            {state.activeSystem === 'lab' && (
              <SuitePanel
                title="Lab CAD" icon="⬡" color={T.purple}
                role={state.brief.suite_routing?.lab_cad?.role ?? ''}
                tasks={state.brief.suite_routing?.lab_cad?.tasks ?? []}
                actions={['Upload full scan package', 'Generate design file', 'Export STL + 3OX', 'Send to lab']}
                brief={state.brief}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Suite panel (per system workspace) ──
function SuitePanel({ title, icon, color, role, tasks, actions, brief }: {
  title: string; icon: string; color: string; role: string
  tasks: string[]; actions: string[]; brief: DesignBrief
}) {
  const [sent, setSent] = useState<string | null>(null)
  return (
    <div style={{ padding: 32, maxWidth: 680 }}>
      {/* System header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 24, color }}>{icon}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{role}</div>
        </div>
      </div>

      {/* Tasks from AI brief */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: T.font, color, letterSpacing: 2, marginBottom: 12 }}>
          TASKS FOR THIS CASE
        </div>
        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderBottom: i < tasks.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, background: color + '10' }}>
              <span style={{ fontSize: 9, color }}>{i + 1}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink }}>{task}</span>
          </div>
        ))}
      </div>

      {/* Design brief summary inline */}
      <div style={{ padding: 16, borderRadius: 8, background: T.surface,
        border: `1px solid ${T.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: T.font, color: T.muted, letterSpacing: 2, marginBottom: 8 }}>
          DESIGN BRIEF
        </div>
        <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, margin: '0 0 12px' }}>{brief.summary}</p>
        <div style={{ fontSize: 10, fontFamily: T.font, color: T.muted, letterSpacing: 2, marginBottom: 8 }}>
          LAB PRESCRIPTION
        </div>
        <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, margin: 0 }}>{brief.lab_rx_summary}</p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {actions.map((action, i) => (
          <button key={action} onClick={() => setSent(action)}
            style={{ padding: '12px 20px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: `1px solid ${sent === action ? color : T.border}`,
              background: i === 0 ? color : (sent === action ? color + '15' : 'transparent'),
              color: i === 0 ? 'white' : (sent === action ? color : T.muted),
              cursor: 'pointer', fontFamily: T.fontSans, textAlign: 'left' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all .15s' }}>
            <span>{action}</span>
            {sent === action && <span style={{ fontSize: 10 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AIDesignGuide
