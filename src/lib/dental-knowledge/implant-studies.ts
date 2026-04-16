// ================================================================
// IMPLANT DESIGN EVIDENCE BASE
// Leading peer-reviewed studies on implant workflow, fit,
// emergence profile, retention, and peri-implant health
// Used by Restora AI to guide evidence-based design decisions
// ================================================================

export const IMPLANT_STUDIES: Array<{
  id: string
  title: string
  authors: string
  journal: string
  year: number
  type: string
  keyFindings: string[]
  clinicalImplication: string
  doi?: string
  topic: string[]
}> = [

  // ── EMERGENCE PROFILE ────────────────────────────────────────

  {
    id: "hamilton-2023",
    title: "Implant prosthodontic design as a predisposing or precipitating factor for peri-implant disease: A review",
    authors: "Hamilton A et al.",
    journal: "Clinical Implant Dentistry and Related Research",
    year: 2023,
    type: "Narrative Review",
    keyFindings: [
      "Ideal implant position is the most critical factor for acceptable restorative emergence profile",
      "Emergence angle >30° from implant long axis is defined as over-contoured (per GPT-9)",
      "Malpositioned implants restrict hygiene access and precipitate peri-implant disease",
      "Concave/flat subcritical contours are associated with better peri-implant tissue health",
      "Angulated screw channel solutions expand the viability of screw-retained restorations",
      "Cement margin location close to mucosal crest minimizes risk of cement extrusion"
    ],
    clinicalImplication: "Design all implant restorations with emergence angle ≤30°. Flag any case exceeding this threshold. Default to concave subcritical contour. Screw-retained preferred; cement-retained only when angulation prohibits acceptable screw access.",
    doi: "10.1111/cid.13183",
    topic: ["emergence-profile", "peri-implant-disease", "implant-position", "retention"]
  },

  {
    id: "gomez-meda-2021",
    title: "The esthetic biological contour concept for implant restoration emergence profile design",
    authors: "Gomez-Meda R, Esquivel J, Blatz MB",
    journal: "Journal of Esthetic and Restorative Dentistry",
    year: 2021,
    type: "Clinical Review / Design Concept",
    keyFindings: [
      "Proposes EBC (Esthetic Biological Contour) framework integrating biology and esthetics in emergence design",
      "Critical contour position at free gingival margin dictates final tissue level",
      "Subcritical contour (below margin) must be concave or flat — convexity causes tissue recession",
      "Supracritical contour (above margin to height of contour) influences emergence illusion",
      "Customized abutments allow fine control of all three contour zones",
      "Ti-base bonded restorations allow ceramic subcritical contour for tissue health"
    ],
    clinicalImplication: "Use EBC framework for all implant crown designs: (1) concave subcritical contour, (2) critical contour at tissue level to position free gingival margin, (3) supracritical contour for esthetic emergence illusion. Custom abutments required for esthetic zone cases.",
    topic: ["emergence-profile", "esthetic-zone", "abutment-design", "tissue-health"]
  },

  // ── SCREW VS. CEMENT RETENTION ──────────────────────────────

  {
    id: "systematic-screw-cement-2024",
    title: "Single Dental Implant Restoration: Cemented or Screw-Retained? A Systematic Review of Multi-Factor Randomized Clinical Trials",
    authors: "Multiple authors",
    journal: "Dentistry (MDPI)",
    year: 2024,
    type: "Systematic Review of RCTs",
    keyFindings: [
      "No statistically significant difference in MBL (marginal bone loss) between screw- and cement-retained (p=0.5813)",
      "No statistically significant difference in BOP (bleeding on probing) between groups (p=0.8093)",
      "Technical complications more common with screw-retained (screw loosening, fracture)",
      "Biological complications more common with cement-retained (excess cement, peri-implantitis risk)",
      "Screw-retained preferred for retrievability and implant health monitoring",
      "Esthetic outcomes comparable when implant in ideal position"
    ],
    clinicalImplication: "Both retention types viable when properly executed. Primary decision factor: implant angulation (screw access position). Secondary: retrievability need, patient hygiene compliance, esthetic requirements. Default to screw-retained when angulation allows.",
    doi: "10.3390/dentistry12040063",
    topic: ["retention", "screw-retained", "cement-retained", "marginal-bone-loss"]
  },

  {
    id: "screwmentable-2023",
    title: "Screwmentable implant-supported prostheses: A systematic review",
    authors: "Multiple authors",
    journal: "Journal of Prosthetic Dentistry",
    year: 2023,
    type: "Systematic Review",
    keyFindings: [
      "Screwmentable design combines: passive fit + retrievability + excess cement control + improved esthetics",
      "Crown bonded extraorally to Ti-base eliminates intraoral cementation risk",
      "No cement subgingivally — eliminates excess cement as peri-implantitis precipitant",
      "Allows angulation correction via angled Ti-base while maintaining screw retention",
      "Limited long-term RCT data — further research required",
      "Clinically, 5-year data shows favorable peri-implant tissue response"
    ],
    clinicalImplication: "Screwmentable (Ti-base + bonded crown) is the preferred restoration design for posterior implant crowns and where esthetics require ceramic subcritical contour. Eliminates main biological risk of cement-retained (excess cement) while preserving retrievability.",
    doi: "10.1016/j.prosdent.2021.10.027",
    topic: ["retention", "screwmentable", "Ti-base", "peri-implant-disease"]
  },

  {
    id: "choy-2024",
    title: "The Effect of Cement- Versus Screw-Retained Implant Positioning in the Esthetic Zone on Emergence Angle",
    authors: "Choy K, Sattler D, Daubert D, Wang IC",
    journal: "International Journal of Periodontics and Restorative Dentistry",
    year: 2024,
    type: "Proof-of-Principle Study (n=133)",
    keyFindings: [
      "133 maxillary anterior implant cases analyzed via digital prosthetic design",
      "Facial-palatal implant position significantly affects facial emergence angle",
      "More palatal implant positioning → more favorable screw access + better emergence angle",
      "More buccal implant positioning → higher emergence angle → over-contour risk",
      "Retention method choice (screw vs. cement) directly influenced by implant position",
      "Digital design tools enable precise emergence angle measurement pre-delivery"
    ],
    clinicalImplication: "In esthetic zone implant cases: assess implant position before designing restoration. Measure facial emergence angle. If EA >30°, angulated screw channel or cement-retained solution required. Ideal positioning: axis through cingulum for anterior teeth.",
    doi: "10.11607/prd.6903",
    topic: ["esthetic-zone", "emergence-angle", "retention", "implant-position"]
  },

  // ── PASSIVE FIT & DIGITAL ACCURACY ──────────────────────────

  {
    id: "ma-zhang-2023",
    title: "Accuracy of digital implant impressions obtained using intraoral scanners: A systematic review and meta-analysis of in vivo studies",
    authors: "Ma J, Zhang B, Song H, Wu D, Song T",
    journal: "International Journal of Implant Dentistry",
    year: 2023,
    type: "Systematic Review & Meta-analysis",
    keyFindings: [
      "IOS accuracy decreases significantly with increasing number of implants and arch span",
      "Single implant IOS: clinically acceptable accuracy",
      "Full-arch multi-implant IOS: deviation accumulates with distance — photogrammetry superior",
      "3D-printed models from IOS scans: generally clinically acceptable for single/short-span",
      "Scan body design and IOS brand affect accuracy",
      "Fully digital workflow comparable to conventional for single implants"
    ],
    clinicalImplication: "Use IOS for single implant and short-span (<3 units) cases. For full-arch multi-implant (All-on-X) cases, photogrammetry provides superior passive fit accuracy and should be the default impression technique.",
    doi: "10.1186/s40729-023-00517-8",
    topic: ["digital-impression", "IOS-accuracy", "photogrammetry", "passive-fit"]
  },

  {
    id: "gracis-2023",
    title: "Digital Workflow in Implant Prosthodontics: The Critical Aspects for Reliable Accuracy",
    authors: "Gracis S, Appiani A, Noè G",
    journal: "Journal of Esthetic and Restorative Dentistry",
    year: 2023,
    type: "Clinical Review",
    keyFindings: [
      "Digital workflow critical success factors: scan body design, IOS calibration, CAD design parameters",
      "Connector dimensions are most common source of framework fracture in digital prostheses",
      "Minimum 9mm² anterior connector, 16mm² posterior connector cross-section",
      "Screw access channel design must precede occlusal anatomy design",
      "Framework verification step essential before final ceramic layering",
      "Implant-level scanning protocol standardization reduces impression error"
    ],
    clinicalImplication: "Always design screw access channel first in any implant prosthesis. Verify connector cross-sections meet minimums. Use calibrated scan bodies from the implant manufacturer's verified library. Verify framework fit before any ceramic application.",
    doi: "10.1111/jerd.12987",
    topic: ["digital-workflow", "framework-design", "connector", "screw-access"]
  },

  // ── PERI-IMPLANT HEALTH & CONTOUR ───────────────────────────

  {
    id: "valente-2020",
    title: "Impact of concave/convergent vs parallel/divergent implant transmucosal profiles on hard and soft peri-implant tissues: A systematic review with meta-analyses",
    authors: "Valente NA, Wu M, Toti P, Derchi G, Barone A",
    journal: "International Journal of Prosthodontics",
    year: 2020,
    type: "Systematic Review with Meta-analysis",
    keyFindings: [
      "Concave/convergent transmucosal profiles associated with less marginal bone loss",
      "Concave profiles: mean bone loss 0.47mm less than convex profiles",
      "Concave contours associated with less peri-implant inflammation (lower BOP rates)",
      "Parallel (vertical) profiles: intermediate outcomes between concave and convex",
      "Convex profiles associated with highest marginal bone loss and peri-implant disease",
      "Tissue biotype moderates the effect — thin biotype more sensitive to convex contours"
    ],
    clinicalImplication: "Design all implant subgingival contours as concave or flat (parallel). Never design convex subgingival profiles. This is the single most evidence-supported design rule for long-term peri-implant tissue health.",
    doi: "10.11607/ijp.6706",
    topic: ["peri-implant-health", "transmucosal-profile", "marginal-bone-loss", "tissue-health"]
  },

  {
    id: "linkevicius-cement",
    title: "The influence of the cementation margin position on the amount of undetected cement: A prospective clinical study",
    authors: "Linkevicius T, Vindasiute E, Puisys A, Linkeviciene L, Maslova N, Puriene A",
    journal: "Clinical Oral Implants Research",
    year: 2013,
    type: "Prospective Clinical Study",
    keyFindings: [
      "Cement margin location at mucosal crest: 57% of cases had detectable excess cement",
      "Cement margin 1.5mm submucosal: 85% undetectable cement — significantly higher risk",
      "All submucosal cement margins had some degree of cement extrusion",
      "Supramucosal margins: cement fully visible and removable",
      "Correlation between subgingival cement and peri-implant disease established",
      "Recommendation: cement margin at or 0.5–1mm supramucosal when cement-retained chosen"
    ],
    clinicalImplication: "If cement-retained restoration is used, position abutment margin at mucosal crest or 0.5–1mm supramucosal maximum. Avoid subgingival cement margins. Use temporary cement initially to verify tissue response.",
    topic: ["cement-retained", "excess-cement", "peri-implantitis", "abutment-margin"]
  },

  // ── ZIRCONIA & MATERIALS ────────────────────────────────────

  {
    id: "pozzi-2023",
    title: "Long-term survival and success of zirconia screw-retained implant-supported prostheses for up to 12 years: A retrospective multicenter study",
    authors: "Pozzi A, Arcuri L, Fabbri G, Singer G, Londono J",
    journal: "Journal of Prosthetic Dentistry",
    year: 2023,
    type: "Retrospective Multicenter Study (12-year)",
    keyFindings: [
      "Zirconia screw-retained prostheses: 98.2% survival rate at 12 years",
      "Technical complications: chipping of veneering ceramic in 4.8% of cases (monolithic had lower fracture rate)",
      "Monolithic zirconia preferred over veneered zirconia for mechanical reliability",
      "High-translucency 5Y-PSZ recommended for esthetic zone when translucency critical",
      "Screw-retained zirconia eliminates peri-implant disease risk from cement",
      "Passive fit verification essential at delivery — digital photogrammetry workflows superior"
    ],
    clinicalImplication: "Monolithic zirconia screw-retained is the gold standard for long-term full-arch implant prostheses. Use 3Y-TZP (highest strength) for posterior crowns; 4Y-PSZ or 5Y-PSZ for esthetic zone where translucency required. Avoid veneered frameworks on posterior implants.",
    doi: "10.1016/j.prosdent.2021.04.026",
    topic: ["zirconia", "long-term-survival", "materials", "monolithic-zirconia"]
  },

  {
    id: "pjetursson-2022-materials",
    title: "EAO Position Paper: Material selection for implant-supported restorations",
    authors: "Pjetursson BE, Fehmer V, Sailer I",
    journal: "International Journal of Prosthodontics",
    year: 2022,
    type: "EAO Position Paper / Consensus",
    keyFindings: [
      "Zirconia and metal-ceramic have comparable 5-year survival rates for single crowns",
      "Monolithic zirconia recommended for posterior implant crowns — lowest complication rate",
      "Lithium disilicate acceptable for anterior esthetic zone single crowns",
      "Ti-base + bonded ceramic superior to fully custom zirconia abutments for tissue response",
      "PEEK frameworks: evidence limited, not yet recommended as definitive prosthetic material",
      "Material selection must consider implant angulation, occlusal forces, and esthetic requirements"
    ],
    clinicalImplication: "Posterior implant crowns: monolithic zirconia (3Y-TZP) on Ti-base. Anterior esthetic zone: lithium disilicate or high-translucency zirconia (4Y-5Y) on Ti-base. Avoid PEEK as definitive implant prosthetic material until further evidence available.",
    topic: ["materials", "zirconia", "lithium-disilicate", "material-selection"]
  },

  // ── ALL-ON-X & FULL ARCH ─────────────────────────────────────

  {
    id: "arcuri-2025-photogrammetry",
    title: "Complete arch digital implant scan accuracy with screw-retained or snap-on scan bodies: A comparative in vitro study",
    authors: "Arcuri L, Pozzi A, Londono J, Nardi A, Testarelli L, Galli M",
    journal: "Journal of Prosthetic Dentistry",
    year: 2025,
    type: "In Vitro Comparative Study",
    keyFindings: [
      "Screw-retained scan bodies significantly more accurate than snap-on for full-arch",
      "Positional deviations increase with span — more pronounced with snap-on bodies",
      "Screw-retained protocol recommended as standard for complete arch digital impressions",
      "Combined IOS + photogrammetry workflow achieves highest accuracy for full-arch implants",
      "Scan body design (not just IOS quality) is a critical variable in full-arch accuracy"
    ],
    clinicalImplication: "For full-arch implant cases: use manufacturer-specific screw-retained scan bodies, not snap-on. For highest accuracy and passive fit, combine IOS with photogrammetry verification. Screw-retained scan body protocol is the current evidence-based standard.",
    doi: "10.1016/j.prosdent.2024.07.003",
    topic: ["scan-body", "photogrammetry", "full-arch", "IOS-accuracy"]
  },

  // ── PROSTHETIC CAP / CAPLESS ─────────────────────────────────

  {
    id: "capless-2025",
    title: "Prosthetic Cap-Free Implant Restorations: Five-Year Clinical Performance with Mechanical Verification",
    authors: "Multiple authors",
    journal: "Dentistry Journal (MDPI)",
    year: 2025,
    type: "5-Year Retrospective + In Vitro Verification",
    keyFindings: [
      "Cap-free zirconia screw-retained crowns: satisfactory 5-year outcomes",
      "Improved esthetics: no metallic cap reduces light reflection artifacts",
      "More anatomical emergence contours achievable without metallic cap bulk",
      "Patients reported improved hygiene access with cap-free design",
      "Two cap-free cases required reglaze/adjustment — easily accomplished without metallic component",
      "Connector dimensions, emergence profile, and screw-access alignment standardized across cases"
    ],
    clinicalImplication: "Cap-free (direct zirconia-to-implant interface) restorations are a viable option, particularly in esthetic zone and where emergence anatomy is critical. Mechanical verification required before clinical delivery. Connector dimensions must meet minimum specifications.",
    doi: "10.3390/dj13120586",
    topic: ["zirconia", "cap-free", "esthetics", "screw-retained", "digital-workflow"]
  },

]

// ── Evidence-based design rules derived from literature ──
export const EVIDENCE_BASED_DESIGN_RULES = {

  emergenceProfile: {
    rule: "Emergence angle must not exceed 30° from implant long axis",
    evidence: "Hamilton 2023 (GPT-9 definition); Gomez-Meda 2021 EBC framework",
    action: "Flag any design with EA >30°. Recommend angulated screw channel or positional reassessment.",
    aiFlag: "EMERGENCE_ANGLE_EXCEEDED"
  },

  subgingivalContour: {
    rule: "Subcritical (subgingival) contour must be concave or parallel — never convex",
    evidence: "Valente 2020 (meta-analysis): concave = 0.47mm less bone loss vs convex)",
    action: "Reject convex subcritical designs. Auto-apply concave emergence from implant platform.",
    aiFlag: "CONVEX_SUBGINGIVAL_CONTOUR"
  },

  retentionDefault: {
    rule: "Default to screw-retained or screwmentable (Ti-base bonded) restorations",
    evidence: "Multiple systematic reviews 2023–2024; Linkevicius cement study",
    action: "Cement-retained only when implant angulation makes screw access esthetically unacceptable and ASC not available.",
    aiFlag: "CEMENT_RETAINED_RISK"
  },

  cementMarginLocation: {
    rule: "If cement-retained: abutment margin at or ≤1mm submucosal maximum",
    evidence: "Linkevicius prospective study: >1mm submucosal → 85% undetectable excess cement",
    action: "Flag any cement margin >1mm submucosal. Recommend supramucosal or mucosal margin.",
    aiFlag: "CEMENT_MARGIN_DEPTH"
  },

  implantOcclusion: {
    rule: "Implant crowns: shimstock drag only in centric — zero loading contacts",
    evidence: "Implant-protected occlusion (IPO) concept; absence of PDL proprioception",
    action: "Verify zero centric contacts in implant crown design. Posterior disclusion in excursions.",
    aiFlag: "IMPLANT_CENTRIC_CONTACT"
  },

  fullArchImpression: {
    rule: "Full-arch multi-implant: photogrammetry preferred over IOS alone",
    evidence: "Ma 2023 meta-analysis: IOS accuracy declines with span; Arcuri 2025: screw-retained scan bodies superior",
    action: "Recommend photogrammetry for all-on-X cases. If IOS used: screw-retained scan bodies required.",
    aiFlag: "FULL_ARCH_IOS_ACCURACY"
  },

  materialPosteriorImplant: {
    rule: "Posterior implant crowns: monolithic zirconia (3Y-TZP) on Ti-base",
    evidence: "Pozzi 2023: 98.2% 12-year survival; Pjetursson 2022 EAO position paper",
    action: "Default to monolithic 3Y-TZP zirconia for posterior implant crowns. Flag veneered frameworks.",
    aiFlag: "MATERIAL_VENEERED_POSTERIOR"
  },

  materialAnteriorImplant: {
    rule: "Anterior esthetic zone: lithium disilicate or 4Y–5Y PSZ zirconia on Ti-base",
    evidence: "Pjetursson 2022 EAO; translucency requirements for anterior esthetic zone",
    action: "Propose lithium disilicate or high-translucency zirconia for anterior implant crowns.",
    aiFlag: "MATERIAL_ANTERIOR_SELECTION"
  },

  connectorDimensions: {
    rule: "FDP connectors: ≥9mm² anterior, ≥16mm² posterior",
    evidence: "Gracis 2023; mechanical failure analysis across multiple studies",
    action: "Flag undersized connectors before case export. Calculate cross-section from design parameters.",
    aiFlag: "CONNECTOR_UNDERSIZED"
  },

  screwAccessFirst: {
    rule: "Design screw access channel position before occlusal anatomy",
    evidence: "Gracis 2023 — screw access dictates prosthetic envelope",
    action: "In all implant crown designs: position screw access first. Occlusal anatomy adapts around it.",
    aiFlag: "SCREW_ACCESS_SEQUENCE"
  },

}

// ── AI Design Prompt Additions (Implant-Specific) ──
export const IMPLANT_AI_DESIGN_LANGUAGE = `
When designing implant restorations, use precise GPT-2023 terminology and apply the following evidence-based rules:

EMERGENCE PROFILE:
- Subcritical contour: always concave or flat (parallel) — NEVER convex
- Critical contour: position at free gingival margin to guide tissue level
- Emergence angle: must not exceed 30° from implant long axis
- Over-contoured restoration (EA >30°): ALWAYS flag this as a design violation

RETENTION DECISION (evidence hierarchy):
1. Screw-retained: ideal when implant angulation allows acceptable screw access position
2. Screwmentable (Ti-base bonded): when slight angulation correction needed; eliminates intraoral cement risk
3. Angulated screw channel: when implant angulation is up to 25° off-axis
4. Cement-retained: only when none of the above are viable; margin must be ≤1mm submucosal

OCCLUSION (implant-protected):
- Zero centric contacts on implant crowns (shimstock drag ONLY)
- Posterior disclusion in all excursive movements
- No working or non-working interferences
- If cantilever present: reduce occlusal table and eliminate excursive contacts entirely

SCREW ACCESS:
- Design screw access channel BEFORE occlusal anatomy
- Document screw access position in lab Rx
- Angulated screw channel (ASC): acceptable up to 25°; verify aesthetics of access opening

MATERIALS (evidence-based selection):
- Posterior implant crown: monolithic 3Y-TZP zirconia on Ti-base (screwmentable)
- Anterior esthetic zone: lithium disilicate OR 4Y/5Y-PSZ zirconia on Ti-base
- Full-arch (All-on-X): monolithic zirconia or PMMA (interim/conversion)
- Avoid veneered frameworks on posterior implants (higher chipping rates)

IMPRESSION/FIT (for CAD reference):
- Single implant or short span: IOS with manufacturer scan body (screw-retained type)
- Full arch: photogrammetry + verified passive fit before ceramic application
- Document impression technique and scan body in case record

FLAG the following violations in every implant design output:
- EA > 30° → EMERGENCE_ANGLE_EXCEEDED
- Convex subcritical contour → CONVEX_SUBGINGIVAL_CONTOUR
- Cement margin >1mm submucosal → CEMENT_MARGIN_DEPTH
- Any centric contact on implant crown → IMPLANT_CENTRIC_CONTACT
- Connector <9mm² anterior or <16mm² posterior → CONNECTOR_UNDERSIZED
`
