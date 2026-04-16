// ============================================================
// MOD INSTITUTE PROTOCOL INTEGRATION
// Clinical workflows and design principles sourced from
// The MOD Institute (themodinstitute.com) — leading digital
// dentistry education: Dr. Wally Renne, Dr. Mike DeFee,
// Dr. Tony Mennito, Dr. Allan Queiroz, Dr. Casey Bennett
//
// Covers: Smile Design · Veneers · Crowns · Inlays/Onlays ·
//         Full Mouth Restorations · Implants · All-on-X ·
//         Removables · 3D Printing · Photography
// ============================================================

export const MOD_SYSTEM_PROMPT_EXTENSION = `

=== MOD INSTITUTE WORKFLOW PROTOCOLS ===

These protocols are inspired by clinician-led workflows from The MOD Institute,
a nationally PACE-approved digital dentistry education provider.
Apply these in addition to existing Restora esthetic and biologic protocols.

────────────────────────────────────────────────────────────────
SMILE DESIGN & VENEERS — MOD PROTOCOL
────────────────────────────────────────────────────────────────

DIRECT PRINT MOCKUP WORKFLOW (with AI-assisted design):
1. Collect full records: full-face repose + smile photos, retracted frontal,
   laterals, occlusal arches, intraoral scans.
2. AI generates smile design proposal based on facial analysis.
3. Convert design to direct print mockup STL — print in biocompatible resin.
4. Try-in chairside with spot-etch/spot-bond (no prep required at this stage).
5. Patient and clinician evaluate: length, width, midline, cant, gingival levels.
6. Adjust design based on mockup feedback → reprint if needed.
7. Use approved mockup as prep guide — scan mockup to generate prep depth indicators.
8. Convert final approved mockup to final veneer design.

DIRECT PRINT MOCKUP WORKFLOW (without AI — conventional DSD):
1. Capture standardized photo set (same as above).
2. Manual smile design using proportion analysis.
3. Generate mockup STL directly from design software.
4. Same try-in and adjustment workflow as above.

NO-PREP AND MINIMUM-PREP VENEER PRINCIPLES (MOD):
- Default to no-prep whenever additive design allows.
- Whisper-thin veneers (0.3–0.5mm) achievable with modern printed/pressed materials.
- Flag any prep exceeding 0.5mm on facial surface — justify clinically.
- Leverage additive approach: design wax-up first, evaluate, then determine if prep needed.
- Prep guide: scan existing tooth + mockup → software calculates minimum reduction needed.
- No incisal reduction without functional justification.

VENEER CHARACTERIZATION (MOD tile system principles):
- Apply characterization before glaze, not after.
- Incisal translucency built in at design stage — avoid painting it on.
- Mammelons on younger patients, absent on mature/worn dentitions.
- Horizontal perikymata add life — replicate in texture setting.
- Cervical chroma gradient: warm A/B shade at gingival 1/3, lighter at incisal 1/3.
- Check color match under standardized lighting (avoid operatory overhead for shade).

────────────────────────────────────────────────────────────────
CROWNS, INLAYS & ONLAYS — MOD PARTIAL COVERAGE PROTOCOL
────────────────────────────────────────────────────────────────

PARTIAL COVERAGE THERAPY PRINCIPLES:
- Inlay/onlay preferred over full crown whenever ≥50% of natural tooth structure remains.
- Conservative prep: no extension for prevention — only remove what is compromised.
- Box-only inlay for small MOD lesions; onlay when one or more cusps involved.
- Cusp coverage: if remaining cusp wall <2mm, include in onlay.
- Isthmus width ≥1.5mm for printed resin, ≥1mm for pressed ceramic.
- Butt-joint margin at isthmus, beveled margin at buccal/lingual for ceramics.
- No featheredge margins — minimum 90° cavosurface angle.

CROWN DESIGN WORKFLOW:
- Load prep scan → auto-propose restoration from adjacent tooth morphology.
- Validate margin line before proceeding — Snap-to-gingiva tool, then manual verify.
- Occlusal reduction: 1.5mm zirconia monolithic, 2.0mm e.max/pressed, 1.0mm printed resin.
- Contact tightness: shimstock drag on adjacent contacts, no centric contact on implant crowns.
- Emergence profile: match root surface contour — never convex below gingival margin.
- Axial contour: height of contour at gingival 1/3 buccally — avoid over-contouring.

3D PRINTING TIPS (MOD Nesting Guide principles):
- Orient crowns at 45° to print bed — reduces peel forces on margins.
- Support attachment points away from margin and occlusal surfaces.
- Wash cycle: IPA ≥30s, air dry, second IPA wash 30s, air dry before cure.
- Post-cure: verify manufacturer time/temperature — under-cure = weak, over-cure = brittle.
- Shade tabs: print in same orientation as crown for color-match accuracy.
- Top 10 print tips: consistent resin temperature (68–77°F), fresh resin each session,
  filter resin after 3 prints, check FEP/nFEP film, level plate before each session.

────────────────────────────────────────────────────────────────
FULL MOUTH RESTORATIONS — MOD WORN DENTITION PROTOCOL
────────────────────────────────────────────────────────────────

VDO (VERTICAL DIMENSION OF OCCLUSION) ASSESSMENT:
- Use VDO gauge STL (printable) to measure facial symmetry and existing VDO.
- Deprogrammer worn for 2–4 weeks before final records if signs of muscle tension.
- Facebow transfer for any full-arch reconstruction.
- Test VDO in provisional phase — minimum 4–6 weeks before final restorations.
- Acceptable VDO increase: guided by phonetics (F and V sounds must be clear),
  smile display, and rest position freeway space (2–4mm target).

WORN DENTITION DESIGN APPROACH:
- Additive-first: calculate how much length must be added to restore ideal proportions.
- Work anteriors first (establish VDO and anterior guidance) then posteriors.
- Posterior occlusal scheme: canine-guided preferred; group function only if canine absent.
- Anterior guidance angle: must allow posterior disclusion in all excursions.
- Minimum anterior overbite post-restoration: 1.5mm for long-term stability.
- Flag any case where posterior restorations would bear anterior guidance — redesign.

RECORDS REQUIRED FOR FULL MOUTH:
- Full-face repose + full smile photos.
- Retracted frontal + bilateral laterals.
- Facebow record + centric relation record.
- Upper + lower IOS scans + bite registration.
- CBCT if implants involved.
- VDO assessment (phonetics + freeway space measurement).

────────────────────────────────────────────────────────────────
IMPLANTS & ALL-ON-X — MOD DIGITAL IMPLANT WORKFLOW
────────────────────────────────────────────────────────────────

SINGLE IMPLANT CROWN DESIGN:
- Tissue-friendly surface finish: concave emergence subgingivally — never convex.
- Screw-access channel: design before finalizing occlusal anatomy — don't compromise.
- Ti-base connection: verify internal connection geometry matches implant system.
- Implant crown: shimstock drag only — NO centric contacts. Protect the implant.
- Material selection: zirconia (monolithic) preferred for posterior, e.max for esthetic zone.
- Scan body: verify correct body in library before designing — wrong body = misfit.

ALL-ON-X DIGITAL WORKFLOW (MOD photogrammetry approach):
1. Pre-surgical: full-face records, smile design, prosthetic planning before surgery.
2. Day of surgery: extract remaining teeth, place implants, capture photogrammetry scan.
3. Photogrammetry: captures implant positions with sub-50-micron accuracy —
   superior to IOS for full-arch cases with 4–6 implants.
4. Same-day conversion: design printed conversion prosthesis from photogrammetry data.
5. Delivery: conversion prosthesis seated same day — fully digital, no lab needed day-of.
6. Final prosthesis: zirconia bar or screw-retained zirconia after 3–6 months healing.
7. Zirconia characterization: stain-and-glaze technique — multiple firing cycles
   for depth. No surface painting — internal characterization before glaze fire.

SURGICAL GUIDE DESIGN PRINCIPLES:
- Tooth-supported guides: most stable — preferred when remaining dentition allows.
- Bone-anchor pins for fully edentulous cases: 2 buccal + 1 palatal minimum.
- Guide visibility: design cutouts so surgeon can see surgical field — safety first.
- Sleeve OD: match to implant system drill handle — verify before printing.
- 3D printed guides: superior passive seating vs. milled — preferred method.
- Post-print: verify sleeve position with radiograph before surgery.

IMPLANT CROWN BIOMECHANICS:
- These 3D printed restorations provide biomechanical adaptability — act as shock absorber.
- Preferred for immediate load: printed resin has flex that protects osseointegration.
- Final zirconia: only after confirmed osseointegration (torque test + radiographic check).

────────────────────────────────────────────────────────────────
REMOVABLES & DENTURES — MOD 2-VISIT WORKFLOW
────────────────────────────────────────────────────────────────

2-VISIT DIGITAL DENTURE PROTOCOL:
Visit 1:
- Capture preliminary IOS or conventional impression.
- Record VDO with MOD Denture Record System STL (printable try-in tray).
- Capture centric relation, lip support assessment, midline.
- Photograph: full face, profile, retracted with record base.

Visit 2:
- Deliver final printed dentures — verified from digital try-in.
- Adjustments: occlusal balance check, border molding verification.
- Tissue-conditioner if needed for adaptation.

FLEX RPD (3D PRINTED REMOVABLE PARTIAL):
- Design: ensure rest seats are well-defined (2.0mm minimum depth).
- Clasp design: I-bar preferred for esthetics, RPI for tissue-borne support.
- Connector: must clear tissue by 3mm minimum — flag any contact.
- Material: printed flex resin — tissue-friendly, biocompatible.
- Print orientation: flat to bed for connectors, angled for clasps.

────────────────────────────────────────────────────────────────
CLINICAL PHOTOGRAPHY — MOD LIGHT MADE SIMPLE PROTOCOL
────────────────────────────────────────────────────────────────

STANDARD PHOTO SET FOR RESTORA AI ANALYSIS:
1. Full face — lips at repose (for incisal edge position assessment).
2. Full face — full smile (for smile arc, buccal corridor, gingival display).
3. Retracted frontal (for shade, proportion, midline, gingival levels).
4. Right lateral retracted (for anterior guidance angle, overbite/overjet).
5. Left lateral retracted.
6. Upper occlusal arch.
7. Lower occlusal arch.
8. Profile right (for facial thirds, lip support).

LIGHTING SETUP (MOD Softbox principle):
- Dual diffused light sources eliminate harsh shadows.
- Consistent setup = consistent color — use MOD Softbox STL for repeatable positioning.
- Color temperature: 5500K daylight balanced.
- ISO 400, f/22–32 for depth of field on retracted shots.
- White balance: custom or daylight — never auto.

PHOTO-BASED SHADE MATCHING:
- Capture shade tab in same photo as tooth — same angle, same lighting.
- Avoid shooting through operatory overhead — always position patient near window
  or use standardized softbox.
- Photograph in morning (patient hydrated, tooth natural shade before dehydration).

────────────────────────────────────────────────────────────────
AI DESIGN DECISION TREE (MOD-INFORMED)
────────────────────────────────────────────────────────────────

When Restora AI receives a case, apply this decision sequence:

1. CASE TYPE TRIAGE:
   - Single tooth + adequate structure → Inlay/Onlay first, Crown only if <50% structure.
   - Multiple anteriors + no prep → Mockup first, evaluate, then decide prep need.
   - Full arch wear → VDO assessment, facebow record required before design.
   - Implant → Scan body verification, tissue contour planning, photogrammetry recommended.
   - All-on-X → Photogrammetry required, same-day conversion planning, staged approach.

2. MOCKUP-FIRST PRINCIPLE:
   - Any case involving esthetic zone (#4–#13, #20–#29): propose mockup before final design.
   - State: "A direct print mockup is recommended before finalizing this design."
   - Generate mockup STL alongside final design proposal.

3. TOOTH PRESERVATION FLAG:
   - Any crown proposal on a tooth with >50% remaining structure: flag and suggest onlay.
   - Any prep >0.5mm facial: flag as "prep exceeds MOD minimal-prep threshold."
   - Any no-prep case where additive design is possible: confirm no-prep pathway first.

4. OCCLUSION VALIDATION:
   - All designs: verify canine guidance present before approving.
   - Implant crowns: confirm zero centric contacts in design.
   - Full arch: anterior guidance must disclude posteriors in lateral/protrusive.

5. OUTPUT INCLUDES:
   - Primary design STL.
   - Mockup STL (esthetic zone cases).
   - Lab Rx with MOD characterization notes (shade, texture, mammelons, translucency).
   - Protocol compliance report (prep depth, occlusion, emergence, proportion).
   - Resource reference: "This design follows MOD Institute workflows —
     see themodinstitute.com for free clinical guides."
`

// ── MOD Free Resource Registry ──
// All publicly available free resources from themodinstitute.com
export const MOD_FREE_RESOURCES = [
  {
    title: 'exocad Smile Design Step-by-Step Guide',
    type: 'PDF eBook',
    pages: '300+',
    topics: ['smile design', 'veneers', 'direct print mockup', 'AI-assisted design', 'design conversion'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/exocad-smile-design-step-by-step-guide/',
    relevantTo: ['smile-mockup', 'prep-restoration'],
  },
  {
    title: 'exocad Foundations Step-by-Step Guide',
    type: 'PDF eBook',
    pages: '500+',
    topics: ['CAD fundamentals', 'crown design', 'bridge', 'smile design', 'CAD workflow'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/exocad-foundation-step-by-step-guide/',
    relevantTo: ['prep-restoration', 'smile-mockup'],
  },
  {
    title: 'exocad Full Mouth Restorations Step-by-Step Guide',
    type: 'PDF eBook',
    pages: '200+',
    topics: ['full mouth rehab', 'VDO', 'worn dentition', 'facebow', 'occlusal reconstruction'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/exocad-full-mouth-restorations-step-by-step-guide/',
    relevantTo: ['prep-restoration'],
  },
  {
    title: 'exocad All-on-X Step-by-Step Guide',
    type: 'PDF eBook',
    pages: '900+',
    topics: ['All-on-X', 'full arch implant', 'photogrammetry', 'same-day conversion', 'zirconia bar'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/exocad-all-on-x-step-by-step-guide/',
    relevantTo: ['implant-restoration'],
  },
  {
    title: 'exocad Dentures Step-by-Step Guide',
    type: 'PDF eBook',
    pages: '700+',
    topics: ['complete denture', 'digital denture', 'RPD', '2-visit workflow'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/exocad-dentures-step-by-step-guide/',
    relevantTo: ['implant-restoration'],
  },
  {
    title: '3D Printing in Restorative Dentistry eBook, 4th Edition',
    type: 'eBook',
    pages: null,
    topics: ['3D printing', 'materials', 'workflows', 'applications', 'nesting'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/3d-printing-in-restorative-dentistry-ebook/',
    relevantTo: ['prep-restoration', 'implant-restoration', 'smile-mockup'],
  },
  {
    title: '3D Printing Nesting Guide eBook, 2nd Edition',
    type: 'eBook',
    pages: null,
    topics: ['nesting', 'orientation', 'print setup', '3D printing tips'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/3d-printing-nesting-guide-ebook/',
    relevantTo: ['prep-restoration', 'smile-mockup', 'implant-restoration'],
  },
  {
    title: 'Top 10 Tips for 3D Printing Success',
    type: 'PDF',
    pages: null,
    topics: ['print tips', 'quality control', 'troubleshooting'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/top-10-tips-for-printing-success/',
    relevantTo: ['prep-restoration', 'smile-mockup', 'implant-restoration'],
  },
  {
    title: 'Light Made Simple: Dental Photography eBook & MOD Softbox STL',
    type: 'PDF + STL',
    pages: null,
    topics: ['dental photography', 'lighting', 'shade matching', 'clinical photos'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/photography-ebook-light-made-simple/',
    relevantTo: ['smile-mockup', 'prep-restoration'],
  },
  {
    title: 'MOD Tissue Tracker STL',
    type: 'STL',
    pages: null,
    topics: ['soft tissue tracking', 'pre/post surgical scan alignment', 'implant'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/free-resource/mod-tissue-tracker/',
    relevantTo: ['implant-restoration'],
  },
  {
    title: 'MOD Denture Record System & Tutorial',
    type: 'STL + Tutorial',
    pages: null,
    topics: ['denture records', 'VDO', '2-visit denture', 'centric relation'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/online-course/mod-denture-record-system/',
    relevantTo: ['implant-restoration'],
  },
  {
    title: 'Modern Optimized Deprogrammer STL',
    type: 'STL',
    pages: null,
    topics: ['deprogrammer', 'muscle relaxation', 'centric relation record', 'VDO'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/modern-optimized-deprogrammer/',
    relevantTo: ['prep-restoration'],
  },
  {
    title: 'VDO Gauge STL',
    type: 'STL',
    pages: null,
    topics: ['VDO', 'facial symmetry', 'occlusal vertical dimension', 'full mouth'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/vdo-gauge-product/',
    relevantTo: ['prep-restoration'],
  },
  {
    title: 'MOD 3D Printed Shade Tabs STL',
    type: 'STL',
    pages: null,
    topics: ['shade matching', '3D printed shade', 'color calibration'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/mod-3d-printed-shade-tabs/',
    relevantTo: ['prep-restoration', 'smile-mockup'],
  },
  {
    title: '3D Printed Flex RPD Guide',
    type: 'PDF eBook',
    pages: '50+',
    topics: ['flexible partial denture', 'RPD', 'removable', '3D printing'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/3d-printed-flex-rpd-guide/',
    relevantTo: ['implant-restoration'],
  },
  {
    title: 'MOD Study Model STL',
    type: 'STL + Handout',
    pages: null,
    topics: ['study model', 'test STL', 'dental arch model', 'practice file'],
    url: 'https://www.themodinstitute.com/dental-ce-courses/uncategorized/mod-study-model/',
    relevantTo: ['prep-restoration', 'smile-mockup', 'implant-restoration'],
  },
]

// ── Get relevant MOD resources for a given case mode ──
export function getMODResourcesForMode(
  mode: 'prep-restoration' | 'smile-mockup' | 'implant-restoration'
): typeof MOD_FREE_RESOURCES {
  return MOD_FREE_RESOURCES.filter(r => r.relevantTo.includes(mode))
}

// ── Get the MOD workflow tip for a given restoration type ──
export function getMODWorkflowTip(restorationType: string): string {
  const tips: Record<string, string> = {
    'crown': 'MOD: Verify ≥50% tooth structure lost before proposing crown over onlay. Check occlusal reduction meets material minimums.',
    'veneer': 'MOD: Start with no-prep assessment. Print mockup first. Whisper-thin veneers (0.3–0.5mm) preferred. No incisal reduction without function need.',
    'onlay': 'MOD: Partial coverage therapy — preferred over crown when cusps can be preserved. Isthmus ≥1.5mm for resin, ≥1mm ceramic.',
    'inlay': 'MOD: Box-only design for isolated MOD lesion. Butt-joint margin. No featheredge. Isthmus ≥1.5mm.',
    'bridge': 'MOD: Evaluate pontic contour — modified ridge lap or ovate for esthetics. Check connector size: ≥9mm² for anterior, ≥16mm² for posterior.',
    'implant-crown': 'MOD: Tissue-friendly concave emergence. Screw-access first. Zero centric contacts — shimstock drag only. Ti-base verified.',
    'implant-bridge': 'MOD: Photogrammetry recommended for multi-unit. Connector size: ≥25mm² posterior. Hygiene access critical.',
    'implant-bar': 'MOD: All-on-X workflow. Photogrammetry for passive fit. Milled zirconia bar preferred for long-term. Plan screw-access before esthetics.',
    'smile-mockup': 'MOD: Direct print mockup workflow — design, print, try-in, adjust, then convert to final. Patient approval required before prep.',
    'full-arch': 'MOD: VDO assessment + deprogrammer before records. Anterior guidance established first. Provisionals minimum 4–6 weeks.',
    'implant-abutment': 'MOD: Tissue shaping abutment before final crown if tissue is deficient. Concave profile, Ti-base for strength.',
    'full-arch-zirconia': 'MOD: Stain-and-glaze characterization. Internal stain before glaze fire. Photogrammetry for passive fit verification.',
    'digital-wax-up': 'MOD: Wax-up is mockup basis — print and try in first. Use as prep guide. Scan mockup for minimum reduction guide.',
  }
  return tips[restorationType] ?? 'MOD: Apply tooth-preservation principles. Mockup before prep. Validate occlusion before finalizing.'
}
