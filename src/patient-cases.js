// Patient cases with real STL files in /public/patient-cases/
// Used by Dashboard → click patient → auto-loads files into Design Systems Bridge

export const PATIENTS = [
  {
    id: "carrie-pappas",
    name: "Carrie Pappas",
    initials: "CP",
    teeth: "#4-#13",
    type: "Smile Makeover",
    subtype: "10-Unit Veneers",
    status: "Files needed",
    statusColor: "warn",
    route: "prep",
    system: "lab",
    age: null,
    gender: "F",
    notes: `10-UNIT VENEER CASE · #4-#13 · YOUTHFUL + 1MM LONGER + GOLDEN RATIO

═══════════════════════════════════════════════
⚠️ CLINICAL FLAGS — RESOLVE BEFORE WAX-UP
═══════════════════════════════════════════════

1. GOLDEN RATIO vs RED PROPORTION
   Strict 1:1.618 Phi across 10 units produces unnaturally narrow laterals.
   Preston: only 17% of naturally attractive smiles match golden ratio.
   RECOMMEND: Ward's RED Proportion (70%) or hybrid — golden ratio contradicts the "youthful" goal.

2. 1MM LENGTHENING — VERIFY BEFORE COMMITTING
   • Incisal display at repose (target 2-4mm for youthful)
   • F/V phonetics — incisal edge must touch wet-dry line of lower lip
   • S phonetics — minimum speaking space maintained
   • Envelope of function — NO protrusive interferences
   • Smile arc consonance — 1mm steepens arc relative to laterals

3. SCOPE OF #4 AND #13 (first premolars)
   Borderline esthetic zone. Verify via full animated smile photography:
   • Does patient display #4 and #13 on full smile?
   • Buccal corridor width — narrow smiles don't reach bicuspids
   • If not displayed → over-treatment risk

4. STRUPP/BRUMM ANTERIOR GUIDANCE + 1MM EXTENSION
   • Canine rise (mutually protected occlusion)
   • Posterior disclusion in ALL excursives
   • Long centric 1-1.5mm flat acceptable
   • Anterior coupling with incisal-edge-to-edge protrusive path
   ⚠️ 1MM EXTENSION MUST NOT CREATE PROTRUSIVE INTERFERENCE

5. "YOUTHFUL" vs "GOLDEN" PARAMETER CONFLICT
   Youthful = W:L ~80%, open embrasures, subtle mamelons, brighter value
   Golden = stylized, can read as mature/mannequin
   → Pick one dominant direction

═══════════════════════════════════════════════
✅ REQUIRED PRE-PREP WORKFLOW
═══════════════════════════════════════════════

1. Diagnostic wax-up at proposed dimensions
2. Intraoral mock-up (Structur/BIS-GMA) — phonetics + smile verification
3. Full facial photo series (repose, E-pos, full smile, lateral, protrusive path)
4. Facebow transfer — MANDATORY for 10-unit occlusal change
5. Material: Pressed lithium disilicate (e.max) for 10-unit strength/esthetics balance
6. Shade: Uniform chroma, slightly higher value on #8, #9
7. Confirm protrusive path post-extension

═══════════════════════════════════════════════
AEP PARAMETERS SET
═══════════════════════════════════════════════
• Tooth form: ovoid (youthful dominant)
• W:L ratio: 80% (youthful, not strict golden)
• Proportion: Hybrid RED (70%) with golden reference for centrals
• Length adjustment: +1.0mm (pending verification)
• Embrasures: open (youthful)
• Characterization: subtle mamelons, incisal halo, cervical chroma
• Smile arc: consonant with lower lip
• Midline: align to facial midline
• Material: Pressed e.max
• Occlusion: Strupp/Brumm protocol — canine rise, posterior disclusion all excursives`,
    parameters: {
      tooth_form: "ovoid",
      width_length_ratio: 0.80,
      length_adjustment_mm: 1.0,
      embrasures: "open",
      characterization: "subtle",
      shade: "BL2 uniform, +1 value centrals",
      proportion: "Hybrid RED 70% + golden reference centrals",
      occlusion: "Strupp/Brumm — canine rise, posterior disclusion",
    },
    clinicalFlags: [
      { level: "critical", text: "Golden ratio vs RED proportion conflict — only 17% of natural attractive smiles match Phi" },
      { level: "warning",  text: "Verify 1mm extension against phonetics + envelope of function" },
      { level: "warning",  text: "Confirm #4/#13 display on full smile before committing to 10-unit" },
      { level: "warning",  text: "Youthful vs Golden parameter tension — pick dominant direction" },
      { level: "info",     text: "Facebow transfer mandatory for 10-unit occlusal case" },
    ],
    photos: [
      { file: "carrie-photos/smile_full.jpg",           label: "Full Smile",                 type: "smile",      date: "2026-04-08", note: "Pre-op full smile at maximum animated position" },
      { file: "carrie-photos/smile_with_ref_lines.jpg", label: "Horizontal Plane Reference", type: "analysis",   date: "2026-04-08", note: "Pupillary + commissure + lip lines · assess cant and smile arc" },
      { file: "carrie-photos/retracted_labeled.jpg",    label: "Retracted — HPC Notes",      type: "retracted",  date: "2026-04-08", note: "HPC: Gp 6 & 1.5mm Coronal · gingival zenith #6 requires 1.5mm coronal repositioning" },
      { file: "carrie-photos/retracted_full.jpg",       label: "Retracted Full Arch",        type: "retracted",  date: "2026-04-08", note: "Full anterior-to-posterior visibility · both arches visible" },
    ],
    files: [
      { name: "carrie_pappas_upper_arch.stl",           slot: "upper", size: 13021184 },
      { name: "carrie_pappas_lower_arch.stl",           slot: "lower", size: 10919984 },
      { name: "carrie_pappas_bite_upper_segment.stl",   slot: "bite",  size: 2012234 },
      { name: "carrie_pappas_bite_lower_segment.stl",   slot: "bite",  size: 2102834 },
    ],
  },
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    initials: "SJ",
    teeth: "#8, #9",
    type: "Cosmetic Anterior",
    subtype: "Veneers",
    status: "Design ready",
    statusColor: "teal",
    route: "prep",       // design-bridge mode
    system: "mill",       // routes to Mill Connect
    age: 34,
    gender: "F",
    notes: "Discolored centrals, wants bright BL2 shade. AEP parameters: W:L 78%, consonant smile arc.",
    files: [
      { name: "sarah_johnson_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "sarah_johnson_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "sarah_johnson_prep_8.stl",     slot: "prep",  size: 9600  },
      { name: "sarah_johnson_prep_9.stl",     slot: "prep2", size: 9600  },
      { name: "sarah_johnson_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "michael-chen",
    name: "Michael Chen",
    initials: "MC",
    teeth: "#3",
    type: "Restorative Posterior",
    subtype: "Crown — Molar",
    status: "Files needed",
    statusColor: "warn",
    route: "prep",
    system: "mill",
    age: 52,
    gender: "M",
    notes: "Fractured cusp on maxillary 1st molar, needs full coverage zirconia crown. A2 shade match.",
    files: [
      { name: "michael_chen_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "michael_chen_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "michael_chen_prep_3.stl",     slot: "prep",  size: 12000 },
      { name: "michael_chen_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "emma-davis",
    name: "Emma Davis",
    initials: "ED",
    teeth: "#30",
    type: "Single Implant",
    subtype: "Crown — Scan body",
    status: "In progress",
    statusColor: "blue",
    route: "implant",
    system: "lab",
    age: 46,
    gender: "F",
    notes: "Straumann BLT 4.1×10mm placed 12 wks prior. Scan body in place. A3 shade, custom abutment.",
    files: [
      { name: "emma_davis_upper_arch.stl",    slot: "upper", size: 37888 },
      { name: "emma_davis_lower_arch.stl",    slot: "lower", size: 37888 },
      { name: "emma_davis_scanbody.stl",      slot: "crown", size: 5000  },
      { name: "emma_davis_implant_crown.stl", slot: "crown", size: 12000 },
      { name: "emma_davis_bite_reg.stl",      slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "david-martinez",
    name: "David Martinez",
    initials: "DM",
    teeth: "#7-#10",
    type: "Smile Makeover",
    subtype: "Anterior 4 Veneers",
    status: "Design ready",
    statusColor: "teal",
    route: "prep",
    system: "lab",
    age: 29,
    gender: "M",
    notes: "Full smile makeover: laterals & centrals. Target BL1 shade. Square-tapering form. W:L 80%.",
    files: [
      { name: "david_martinez_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "david_martinez_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "david_martinez_prep_7.stl",     slot: "prep",  size: 9600  },
      { name: "david_martinez_prep_8.stl",     slot: "prep2", size: 9600  },
      { name: "david_martinez_prep_9.stl",     slot: "prep",  size: 9600  },
      { name: "david_martinez_prep_10.stl",    slot: "prep2", size: 9600  },
      { name: "david_martinez_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
];

// Load patient files as File objects for upload to Design Bridge
export async function loadPatientFiles(patient) {
  const filesPromises = patient.files.map(async (f) => {
    const path = f.subdir ? `/patient-cases/${f.subdir}/${f.name}` : `/patient-cases/${f.name}`;
    const response = await fetch(path);
    const blob = await response.blob();
    const ext = f.name.split('.').pop().toLowerCase();
    const mime = ext==='png'||ext==='jpg'||ext==='jpeg' ? `image/${ext==='jpg'?'jpeg':ext}` :
                 ext==='stl' ? 'model/stl' :
                 ext==='beb' ? 'application/octet-stream' : 'application/octet-stream';
    return new File([blob], f.name, { type: mime, lastModified: Date.now() });
  });
  return Promise.all(filesPromises);
}
