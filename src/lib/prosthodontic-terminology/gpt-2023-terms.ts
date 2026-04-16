// ================================================================
// PROSTHODONTIC TERMINOLOGY DATABASE
// Source: Glossary of Prosthodontic Terms 2023 (GPT-2023), 10th Ed.
// Published: J Prosthet Dent 2023;130(4S1):e1-e126
// Editor: Danielle M. Layton — Academy of Prosthodontics
// 3,611 terms total (526 new/amended in 2023 edition)
// ================================================================
// This file encodes the clinical language the AI uses for all
// implant, restoration, and prosthodontic design communications.
// All definitions are consistent with GPT-2023 standard.
// ================================================================

export const PROSTHODONTIC_TERMS: Record<string, {
  definition: string
  category: string
  gptEdition?: string
  synonyms?: string[]
  seeAlso?: string[]
}> = {

  // ── IMPLANT BODY & CONNECTIONS ──────────────────────────────

  "endosseous dental implant": {
    definition: "A device placed into the alveolar and/or basal bone of the mandible or maxilla, transecting only one cortical plate; the most widely used implant type in contemporary implant prosthodontics.",
    category: "implant-body",
    gptEdition: "GPT-2023",
    synonyms: ["endosteal implant", "root-form implant", "osseointegrated implant"],
    seeAlso: ["osseointegration", "implant body", "implant platform"]
  },

  "osseointegration": {
    definition: "A direct structural and functional connection between ordered, living bone and the surface of a load-bearing implant, as defined by Brånemark. Requires direct bone-to-implant contact at the light microscopic level without intervening fibrous tissue.",
    category: "implant-biology",
    gptEdition: "GPT-2023",
    synonyms: ["direct bone anchorage", "bone ankylosis of implant"],
    seeAlso: ["bone-implant contact", "implant stability quotient", "insertion torque"]
  },

  "implant platform": {
    definition: "The coronal surface of an endosseous dental implant body at which the abutment or prosthetic component is seated. Characterized by its diameter, which may match or differ from the implant body diameter (platform switching).",
    category: "implant-body",
    gptEdition: "GPT-2023",
    synonyms: ["implant shoulder", "implant-abutment interface"],
    seeAlso: ["platform switching", "implant-abutment connection", "implant collar"]
  },

  "platform switching": {
    definition: "A design concept wherein the implant-abutment junction is placed interior (inward) to the edge of the implant platform by using an abutment with a smaller diameter than the implant platform. Associated with preservation of crestal bone and soft tissue.",
    category: "implant-body",
    gptEdition: "GPT-2023",
    seeAlso: ["implant platform", "crestal bone preservation", "biological width"]
  },

  "implant-abutment connection": {
    definition: "The interface between a dental implant body and its corresponding prosthetic abutment. Connection types include internal conical (Morse taper), internal hex, external hex, and internal tri-channel. Connection geometry affects micromovement, microgap, and bacterial leakage.",
    category: "implant-body",
    gptEdition: "GPT-2023",
    synonyms: ["IAC", "implant-abutment junction", "IAJ"],
    seeAlso: ["microgap", "Morse taper", "anti-rotation feature", "screw joint"]
  },

  "Morse taper connection": {
    definition: "A conical (tapered) implant-abutment connection in which the abutment is friction-locked into the implant via matching tapers (typically 1.5°–8°). Provides high stability, minimal microgap, and cold-welding effect at low torque.",
    category: "implant-body",
    gptEdition: "GPT-2023",
    synonyms: ["conical connection", "taper-lock connection", "cold-weld connection"],
    seeAlso: ["implant-abutment connection", "microgap", "screw loosening"]
  },

  "implant collar": {
    definition: "The polished, smooth, or rough transmucosal portion of the implant body coronal to the threaded or textured root portion. The collar height and design influences the mucosal seal and crestal bone response.",
    category: "implant-body",
    gptEdition: "GPT-2023",
    synonyms: ["transmucosal collar", "implant neck", "implant coronal portion"],
    seeAlso: ["transmucosal height", "biologic width", "crestal bone"]
  },

  // ── ABUTMENTS ───────────────────────────────────────────────

  "dental implant abutment": {
    definition: "A prosthetic component that connects to the implant body and supports the dental prosthesis. May be prefabricated (stock) or customized (CAD/CAM or cast). Types include healing, final, angled, multi-unit, Ti-base, and scan body abutments.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["implant abutment", "prosthetic abutment"],
    seeAlso: ["custom abutment", "Ti-base abutment", "healing abutment", "angulated abutment"]
  },

  "custom abutment": {
    definition: "A patient-specific dental implant abutment designed and fabricated using CAD/CAM technology or conventional casting to optimize emergence profile, soft tissue contours, and margin placement for a specific patient anatomy.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["individualized abutment", "CAD/CAM abutment"],
    seeAlso: ["emergence profile", "Ti-base abutment", "abutment margin"]
  },

  "Ti-base abutment": {
    definition: "A titanium base component (also: titanium base, hybrid abutment base) upon which an overlying ceramic or zirconia crown/structure is bonded extraorally, creating a hybrid implant abutment-crown unit. Allows ceramic aesthetics with titanium connection reliability.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["titanium base", "hybrid abutment", "LAVA Ti-Base"],
    seeAlso: ["screwmentable restoration", "abutment bonding", "zirconia abutment"]
  },

  "angulated screw channel": {
    definition: "An abutment or prosthetic design feature that redirects the screw access channel by up to 25°–30° relative to the implant long axis, enabling screw-retained restorations when implants are not ideally positioned.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["ASC", "angled screw channel", "tilted screw access"],
    seeAlso: ["screw-retained restoration", "implant angulation", "screw access channel"]
  },

  "healing abutment": {
    definition: "A temporary prosthetic component placed on a dental implant during the soft tissue healing phase to shape and maintain the peri-implant mucosal architecture prior to final prosthetic restoration.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["healing cap", "cover screw", "gingival former"],
    seeAlso: ["transgingival healing", "mucosal architecture", "provisional abutment"]
  },

  "multi-unit abutment": {
    definition: "A prefabricated angulated or straight abutment system designed for use with fixed full-arch prostheses (All-on-X), allowing passive fit across multiple implants placed at varying angulations.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["MUA", "multi-unit prosthetic connector"],
    seeAlso: ["All-on-X", "fixed full-arch prosthesis", "screw-retained prosthesis"]
  },

  "scan body": {
    definition: "A precisely manufactured reference component placed on a dental implant or abutment for intraoral scanning or photogrammetry to accurately capture the three-dimensional position and orientation of the implant for digital prosthetic planning.",
    category: "abutment",
    gptEdition: "GPT-2023",
    synonyms: ["scan post", "implant position indicator", "digital impression body"],
    seeAlso: ["intraoral scanner", "photogrammetry", "implant-level impression", "SCANBODY"]
  },

  // ── EMERGENCE PROFILE & CONTOURS ────────────────────────────

  "emergence profile": {
    definition: "The contour of a tooth, restoration, or implant crown as it transitions from the most apical extension of the restoration or abutment margin to the height of contour in a cervical direction. Classified as concave, flat (vertical), or convex subgingivally.",
    category: "emergence-contour",
    gptEdition: "GPT-2023",
    synonyms: ["EP", "subgingival contour", "prosthetic emergence"],
    seeAlso: ["emergence angle", "transmucosal profile", "peri-implant tissue health"]
  },

  "emergence angle": {
    definition: "The angulation between the average tangent of the transitional contour and the long axis of the implant body. An emergence angle exceeding 30° is considered over-contoured and associated with increased risk of peri-implant disease.",
    category: "emergence-contour",
    gptEdition: "GPT-9 / GPT-2023",
    synonyms: ["EA", "restorative emergence angle"],
    seeAlso: ["emergence profile", "over-contour", "peri-implantitis"]
  },

  "transmucosal profile": {
    definition: "The three-dimensional shape of an implant abutment or restoration in the region traversing the peri-implant mucosa, from the implant platform to the gingival margin. Critical for tissue health, hygiene access, and papilla preservation.",
    category: "emergence-contour",
    gptEdition: "GPT-2023",
    synonyms: ["subgingival contour", "transgingival contour"],
    seeAlso: ["emergence profile", "peri-implant mucosa", "critical contour"]
  },

  "critical contour": {
    definition: "The contour of a restoration or abutment at and above the gingival margin that directly influences the position and shape of the free gingival margin. Convex critical contour may displace tissue apically; concave contour invites coronal tissue migration.",
    category: "emergence-contour",
    gptEdition: "GPT-2023",
    seeAlso: ["subcritical contour", "emergence profile", "gingival margin"]
  },

  "subcritical contour": {
    definition: "The contour of a restoration or abutment apical to and below the gingival margin. Influences tissue health by affecting cleansability. Subcritical concave contours facilitate oral hygiene access and are associated with healthier peri-implant tissue.",
    category: "emergence-contour",
    gptEdition: "GPT-2023",
    seeAlso: ["critical contour", "emergence profile", "peri-implant tissue health"]
  },

  "height of contour": {
    definition: "The greatest projection of a tooth or restoration outline as viewed from a given direction. In implant prosthodontics, the height of contour position (gingival third vs. middle third) affects tissue health and oral hygiene access.",
    category: "emergence-contour",
    gptEdition: "GPT-2023",
    synonyms: ["greatest convexity", "survey line"],
    seeAlso: ["proximal contour", "axial contour", "over-contour"]
  },

  // ── RETENTION & FIT ─────────────────────────────────────────

  "screw-retained restoration": {
    definition: "An implant-supported prosthesis retained by a prosthetic screw that passes through the prosthesis into the implant body or abutment, allowing retrievability. Preferred when implant angulation permits acceptable screw access channel position.",
    category: "retention",
    gptEdition: "GPT-2023",
    synonyms: ["screw-retained prosthesis", "screw-retained crown", "SRC"],
    seeAlso: ["cement-retained restoration", "screwmentable restoration", "screw access channel", "retrievability"]
  },

  "cement-retained restoration": {
    definition: "An implant-supported prosthesis retained by a dental cement. Allows abutment angulation correction and improved esthetics in some cases but carries risk of excess cement subgingivally, which is associated with peri-implantitis.",
    category: "retention",
    gptEdition: "GPT-2023",
    synonyms: ["cemented restoration", "CRC"],
    seeAlso: ["screw-retained restoration", "cement margin", "peri-implantitis", "excess cement"]
  },

  "screwmentable restoration": {
    definition: "A hybrid retention concept in which a crown or prosthetic unit is cemented extraorally to a Ti-base abutment, then delivered as a complete unit via a screw into the implant. Combines advantages of screw retention (retrievability) with cement retention (passive fit, esthetics).",
    category: "retention",
    gptEdition: "GPT-2023",
    synonyms: ["hybrid retention", "screwmentable prosthesis", "Ti-base bonded crown"],
    seeAlso: ["Ti-base abutment", "screw-retained restoration", "passive fit"]
  },

  "passive fit": {
    definition: "The absence of internal stress in a dental prosthesis and its supporting structures when the prosthesis is placed in position without any applied force. Critical for implant-supported fixed dental prostheses to prevent bone loss and mechanical failure. True passive fit is an ideal; clinically acceptable fit is the practical goal.",
    category: "fit",
    gptEdition: "GPT-2023",
    synonyms: ["stress-free fit", "tension-free fit"],
    seeAlso: ["active fit", "marginal fit", "framework fit", "photogrammetry"]
  },

  "marginal fit": {
    definition: "The accuracy of adaptation of the margin of a prosthesis to the finish line of the abutment tooth or implant abutment. Clinically acceptable marginal discrepancy is generally accepted at ≤100 microns for fixed dental prostheses.",
    category: "fit",
    gptEdition: "GPT-2023",
    synonyms: ["marginal adaptation", "marginal gap", "seating accuracy"],
    seeAlso: ["passive fit", "internal fit", "marginal discrepancy"]
  },

  "marginal discrepancy": {
    definition: "The linear distance between the margin of a restoration and the finish line of an abutment preparation when the restoration is in its most seated position. Clinically acceptable threshold generally considered to be ≤100–120 microns.",
    category: "fit",
    gptEdition: "GPT-2023",
    synonyms: ["marginal gap", "marginal misfit"],
    seeAlso: ["marginal fit", "finish line", "cement space"]
  },

  "retrievability": {
    definition: "The ability to remove a prosthesis or prosthetic component from the oral cavity without damage to supporting structures, implants, or the prosthesis itself. Screw-retained restorations provide predictable retrievability; cement-retained restorations may require destructive removal.",
    category: "retention",
    gptEdition: "GPT-2023",
    seeAlso: ["screw-retained restoration", "screw access channel", "cement-retained restoration"]
  },

  // ── OCCLUSION ────────────────────────────────────────────────

  "implant occlusion": {
    definition: "The occlusal contacts and relationships of an implant-supported prosthesis. Because implants lack a periodontal ligament, they do not have proprioceptive feedback equivalent to natural teeth. Implant crowns require controlled, lighter occlusion than natural teeth.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    seeAlso: ["centric occlusion", "excursive contact", "implant-protected occlusion"]
  },

  "implant-protected occlusion": {
    definition: "An occlusal scheme for implant-supported prostheses designed to minimize potentially destructive biomechanical forces transmitted to the implant-bone interface. Characterized by: light centric contacts, absence of working/non-working interferences, canine-guided disclusion or group function, and reduced cuspal inclination.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["IPO"],
    seeAlso: ["implant occlusion", "mutually protected occlusion", "canine guidance"]
  },

  "mutually protected occlusion": {
    definition: "An occlusal scheme in which posterior teeth protect anterior teeth from lateral forces in centric occlusion, and anterior teeth protect posterior teeth from non-axial forces in excursive movements by providing immediate disclusion. Preferred for natural dentition restoration.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["canine-protected occlusion", "anterior-posterior protection"],
    seeAlso: ["canine guidance", "posterior disclusion", "anterior guidance"]
  },

  "centric occlusion": {
    definition: "The occlusion of opposing teeth when the mandible is in centric relation. The maximum intercuspal position when the condyles are in their most superior, anterior position. The starting point for all occlusal analysis and design.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["CO", "centric relation occlusion", "CRO"],
    seeAlso: ["centric relation", "maximum intercuspation", "MIP"]
  },

  "maximum intercuspation": {
    definition: "The complete intercuspation of the opposing teeth independent of condylar position; the position of maximum tooth contact. Also referred to as maximum intercuspal position (MIP). May or may not coincide with centric relation.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["MIP", "maximum intercuspal position", "habitual occlusion"],
    seeAlso: ["centric occlusion", "centric relation", "slide in centric"]
  },

  "vertical dimension of occlusion": {
    definition: "The distance measured between two selected anatomic or marked points (one on the nose, the other on the chin) when the occluding members are in contact. A key parameter in complete denture, full mouth reconstruction, and implant prosthodontics.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["VDO", "occlusal vertical dimension", "OVD"],
    seeAlso: ["vertical dimension of rest", "freeway space", "interocclusal rest space"]
  },

  "freeway space": {
    definition: "The interocclusal distance or clearance between the occlusal surfaces of the maxillary and mandibular teeth when the mandible is in physiologic rest position. Normal range: 2–4mm. Critical assessment parameter before any changes to VDO.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["interocclusal rest space", "interocclusal clearance"],
    seeAlso: ["vertical dimension of rest", "VDO", "rest position"]
  },

  "anterior guidance": {
    definition: "The influence of the contacting surfaces of the anterior teeth upon tooth-limiting mandibular movements. Anterior guidance determines the pathway of incisal and canine teeth in excursive movements and must provide posterior disclusion in lateral and protrusive excursions.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["anterior determinant of occlusion", "incisal guidance"],
    seeAlso: ["canine guidance", "posterior disclusion", "protrusive guidance"]
  },

  "canine guidance": {
    definition: "An occlusal arrangement in which the maxillary and mandibular canines provide immediate posterior disclusion in all lateral excursions. The preferred occlusal scheme for natural dentitions and most implant restorations in the esthetic zone.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["cuspid-protected occlusion", "canine-protected occlusion"],
    seeAlso: ["anterior guidance", "mutually protected occlusion", "group function"]
  },

  "group function": {
    definition: "Multiple tooth contacts on the working side during lateral excursion (canine, premolars, and/or first molar contact simultaneously). Acceptable when canine guidance is absent or contraindicated; used in some full-arch implant cases.",
    category: "occlusion",
    gptEdition: "GPT-2023",
    synonyms: ["unilateral balance"],
    seeAlso: ["canine guidance", "working side", "excursive contact"]
  },

  // ── PERI-IMPLANT TISSUE ─────────────────────────────────────

  "peri-implant mucosa": {
    definition: "The mucosa that surrounds the transmucosal portion of a dental implant or abutment. Comprises junctional epithelium, sulcular epithelium, and supracrestal connective tissue. The mucosal seal is critical to peri-implant tissue health.",
    category: "peri-implant-tissue",
    gptEdition: "GPT-2023",
    synonyms: ["peri-implant soft tissue", "periimplant mucosa"],
    seeAlso: ["peri-implant sulcus", "mucosal seal", "biological width around implants"]
  },

  "peri-implant mucositis": {
    definition: "A reversible inflammatory lesion in the peri-implant mucosa in the absence of continuing marginal bone loss. Characterized by bleeding on probing, erythema, edema. Analogous to gingivitis. Precursor to peri-implantitis if untreated.",
    category: "peri-implant-tissue",
    gptEdition: "GPT-2023",
    synonyms: ["implant mucositis"],
    seeAlso: ["peri-implantitis", "bleeding on probing", "mucosal inflammation"]
  },

  "peri-implantitis": {
    definition: "An inflammatory condition affecting the peri-implant tissues, characterized by inflammation in the peri-implant mucosa and subsequent progressive loss of supporting bone beyond initial bone remodeling. Distinguished from peri-implant mucositis by bone loss.",
    category: "peri-implant-tissue",
    gptEdition: "GPT-2023",
    synonyms: ["periimplantitis", "peri-implant bone loss"],
    seeAlso: ["peri-implant mucositis", "marginal bone loss", "peri-implant disease"]
  },

  "biological width (implant)": {
    definition: "The dimension of the supracrestal soft tissue attachment that exists around a dental implant; includes the junctional epithelium and supracrestal connective tissue. Average ~3–4mm. Violation of biologic width by prosthetic margin placement results in tissue inflammation and bone loss.",
    category: "peri-implant-tissue",
    gptEdition: "GPT-2023",
    synonyms: ["supracrestal tissue attachment", "STA"],
    seeAlso: ["platform switching", "abutment margin", "cement margin location"]
  },

  "mucosal thickness": {
    definition: "The vertical dimension of the peri-implant mucosa measured from the mucosal surface to the crestal bone. Mucosal thickness of ≥3mm correlates with greater crestal bone stability and more favorable soft tissue esthetics around implants.",
    category: "peri-implant-tissue",
    gptEdition: "GPT-2023",
    synonyms: ["soft tissue thickness", "peri-implant tissue thickness"],
    seeAlso: ["tissue biotype", "bone remodeling", "crestal bone preservation"]
  },

  // ── PROSTHESIS TYPES ─────────────────────────────────────────

  "implant-supported fixed dental prosthesis": {
    definition: "A dental prosthesis that is supported entirely by dental implants and is not removable by the patient. Includes single crowns, fixed partial dentures (bridges), and complete arch prostheses (All-on-X).",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["implant-supported FDP", "implant-supported crown", "implant bridge"],
    seeAlso: ["fixed dental prosthesis", "All-on-X", "implant-retained prosthesis"]
  },

  "implant-supported complete denture": {
    definition: "A dental prosthesis that replaces all teeth in a dental arch and is entirely supported by dental implants. May be removable (overdenture) or fixed (All-on-X, hybrid prosthesis, zirconia bar-supported).",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["implant-supported full arch prosthesis", "All-on-4", "All-on-X"],
    seeAlso: ["implant overdenture", "fixed complete denture", "hybrid prosthesis"]
  },

  "implant-retained overdenture": {
    definition: "A complete or partial removable dental prosthesis that gains its primary support from the underlying tissues but is retained by attachments to dental implants. Minimum two implants for mandibular overdenture (McGill Consensus), four for maxillary.",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["implant overdenture", "IOD", "snap-on denture"],
    seeAlso: ["locator attachment", "ball attachment", "bar-clip retention"]
  },

  "fixed complete denture (implant)": {
    definition: "A full-arch implant-supported fixed prosthesis that replaces all teeth and is not removable by the patient. Supported by 4–6 implants. Materials include zirconia, PMMA, composite resin, or hybrid configurations.",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["All-on-4", "All-on-6", "All-on-X", "full-arch fixed prosthesis", "hybrid denture"],
    seeAlso: ["immediately loaded implant prosthesis", "conversion prosthesis", "zirconia full arch"]
  },

  // ── IMPRESSIONS & RECORDS ────────────────────────────────────

  "implant-level impression": {
    definition: "A dental impression made at the level of the implant platform (using an impression coping and scan body), capturing the three-dimensional position and orientation of the implant in relation to adjacent teeth and soft tissue.",
    category: "records",
    gptEdition: "GPT-2023",
    synonyms: ["implant impression", "open-tray impression", "closed-tray impression"],
    seeAlso: ["impression coping", "digital implant impression", "scan body"]
  },

  "photogrammetry (dental)": {
    definition: "A measurement technique using multiple calibrated photographs or structured light to determine the precise three-dimensional spatial positions of dental implants (via fiducial scan bodies). Provides sub-50-micron full-arch accuracy, superior to conventional IOS for full-arch cases with multiple implants.",
    category: "records",
    gptEdition: "GPT-2023",
    synonyms: ["implant photogrammetry", "optical measurement", "PIC camera"],
    seeAlso: ["scan body", "digital implant impression", "passive fit", "full-arch accuracy"]
  },

  "intraoral scanner (IOS)": {
    definition: "A handheld device that captures optical three-dimensional surface data of intraoral structures using structured light, laser triangulation, or video-based technology. Exports data as open-format STL files. Accuracy decreases with increasing span for full-arch implant cases.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["IOS", "digital impression device", "intraoral scanning device"],
    seeAlso: ["photogrammetry", "STL file", "digital workflow", "scan body"]
  },

  // ── MATERIALS ────────────────────────────────────────────────

  "zirconia (dental)": {
    definition: "Zirconium dioxide (ZrO₂), a high-strength ceramic used for implant abutments, crowns, frameworks, and full-arch prostheses. Types include 3Y-TZP (3 mol% yttria-stabilized, highest strength), 4Y-PSZ (translucent), 5Y-PSZ (ultra-translucent). Flexural strength: 900–1,200 MPa for 3Y-TZP.",
    category: "materials",
    gptEdition: "GPT-2023",
    synonyms: ["zirconia ceramic", "yttria-stabilized zirconia", "Y-TZP"],
    seeAlso: ["flexural strength", "translucency", "veneering ceramic", "monolithic zirconia"]
  },

  "lithium disilicate": {
    definition: "A glass-ceramic reinforced with lithium disilicate crystals. Flexural strength: 300–400 MPa. Available in pressable (IPS e.max Press) and CAD/CAM (IPS e.max CAD) forms. Optimal for anterior esthetic restorations, veneers, inlays, onlays, and single implant crowns in esthetic zone.",
    category: "materials",
    gptEdition: "GPT-2023",
    synonyms: ["e.max", "LS2", "lithium disilicate ceramic"],
    seeAlso: ["glass-ceramic", "pressable ceramic", "flexural strength"]
  },

  "PMMA (dental)": {
    definition: "Polymethylmethacrylate; an acrylic resin used for provisional and interim complete arch implant-supported prostheses. Characterized by ease of repair, low cost, and low modulus of elasticity (shock-absorbing). Appropriate for conversion prostheses and provisional restorations.",
    category: "materials",
    gptEdition: "GPT-2023",
    synonyms: ["acrylic resin", "provisional resin", "polymethylmethacrylate"],
    seeAlso: ["conversion prosthesis", "immediate loading", "provisional restoration"]
  },

  "titanium (implant grade)": {
    definition: "Commercially pure titanium (CP Ti grades 1–4) or titanium alloy (Ti-6Al-4V) used for implant bodies, abutments, and frameworks. Biocompatible, corrosion-resistant, and demonstrates predictable osseointegration. Yield strength: 170–900 MPa depending on grade and alloy.",
    category: "materials",
    gptEdition: "GPT-2023",
    synonyms: ["CP titanium", "Ti-6Al-4V", "grade 5 titanium"],
    seeAlso: ["osseointegration", "implant body", "Ti-base abutment"]
  },

  // ── DIGITAL WORKFLOW TERMS ───────────────────────────────────

  "digital workflow (prosthodontic)": {
    definition: "An integrated sequence of digital processes for design and fabrication of dental prostheses including digital imaging/scanning, computer-aided design (CAD), computer-aided manufacturing (CAM), and digital communication. Encompasses IOS, CBCT, photogrammetry, CAD software, milling, and 3D printing.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["digital dentistry workflow", "full digital workflow"],
    seeAlso: ["CAD/CAM", "intraoral scanner", "STL file", "DICOM", "3D printing"]
  },

  "CAD/CAM (dental)": {
    definition: "Computer-aided design/computer-aided manufacturing. The digital process of designing a dental restoration using software (CAD) and fabricating it using milling or additive manufacturing (CAM). Enables precise, reproducible dental prosthetics without traditional laboratory steps.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["computer-aided design/manufacturing", "chairside CAD/CAM"],
    seeAlso: ["digital workflow", "milling unit", "3D printing", "open architecture system"]
  },

  "CBCT (dental)": {
    definition: "Cone beam computed tomography; a volumetric imaging modality that produces three-dimensional radiographic data from a cone-shaped X-ray beam. Used for implant site assessment, bone volume measurement, anatomical structure identification, and surgical guide fabrication.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["cone beam CT", "dental CT", "3D radiograph", "CBCT scan"],
    seeAlso: ["digital implant planning", "surgical guide", "DICOM", "bone quality"]
  },

  "digital smile design": {
    definition: "A digital tool and clinical concept for planning and communicating esthetic dental treatment by integrating photographs, videos, and digital design to preview proposed changes to dental and facial esthetics before treatment. Facilitates patient communication and guides restorative design.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["DSD", "smile design", "digital esthetic planning"],
    seeAlso: ["mockup", "direct print mockup", "wax-up", "esthetic pre-evaluation"]
  },

  "conversion prosthesis": {
    definition: "An interim implant-supported fixed prosthesis fabricated from data captured on the day of implant surgery (typically via photogrammetry or IOS), delivered the same day as implant placement (immediate loading protocol). Usually PMMA; converted to final prosthesis after osseointegration.",
    category: "digital-workflow",
    gptEdition: "GPT-2023",
    synonyms: ["immediate conversion prosthesis", "same-day prosthesis", "interim prosthesis"],
    seeAlso: ["immediate loading", "photogrammetry", "PMMA", "All-on-X"]
  },

  // ── BONE & IMPLANT SITE ──────────────────────────────────────

  "bone density (Lekholm-Zarb)": {
    definition: "A four-category classification of jaw bone quality: D1 (dense cortical bone, anterior mandible), D2 (thick cortical + coarse trabecular, anterior mandible/maxilla), D3 (thin cortical + fine trabecular, posterior maxilla), D4 (minimal cortical + fine trabecular, posterior maxilla). Influences implant stability and protocol.",
    category: "bone",
    gptEdition: "GPT-2023",
    synonyms: ["bone quality classification", "D1-D4 classification", "Lekholm Zarb classification"],
    seeAlso: ["insertion torque", "ISQ", "implant stability", "drilling protocol"]
  },

  "crestal bone": {
    definition: "The most coronal portion of the alveolar bone surrounding the neck of a dental implant. Crestal bone stability is a key outcome measure for implant success. Normal remodeling: 0.5–1.5mm in first year; <0.2mm/year thereafter.",
    category: "bone",
    gptEdition: "GPT-2023",
    synonyms: ["marginal bone", "alveolar crest", "implant neck bone"],
    seeAlso: ["marginal bone loss", "platform switching", "biological width", "bone remodeling"]
  },

  "implant stability quotient": {
    definition: "A resonance frequency analysis (RFA) measurement of implant stability expressed as a value from 1–100, where higher values indicate greater stability. ISQ ≥65–70 is generally considered adequate for immediate loading protocols.",
    category: "bone",
    gptEdition: "GPT-2023",
    synonyms: ["ISQ", "RFA value", "resonance frequency analysis"],
    seeAlso: ["insertion torque", "primary stability", "osseointegration", "immediate loading"]
  },

  "primary stability": {
    definition: "The initial mechanical stability achieved at implant placement, resulting from the engagement between implant threads and surrounding bone. Determined by bone density, implant design, and surgical technique. Required for immediate loading: typically ISQ ≥65, insertion torque ≥35 Ncm.",
    category: "bone",
    gptEdition: "GPT-2023",
    synonyms: ["initial stability", "mechanical stability"],
    seeAlso: ["ISQ", "insertion torque", "secondary stability", "osseointegration"]
  },

  // ── OCCLUSAL/PREP TERMS ─────────────────────────────────────

  "finish line": {
    definition: "The peripheral border of a prepared tooth or implant abutment at which the restoration terminates. Types include chamfer, shoulder (butt joint), knife-edge (featheredge), shoulder with bevel, and deep chamfer. The finish line defines the marginal terminus of the restoration.",
    category: "preparation",
    gptEdition: "GPT-2023",
    synonyms: ["preparation margin", "cavosurface margin", "restoration margin", "marginal terminus"],
    seeAlso: ["shoulder margin", "chamfer margin", "featheredge", "marginal fit"]
  },

  "pontic": {
    definition: "The artificial tooth on a fixed dental prosthesis that replaces the missing natural tooth, restores its function, and usually fills the space previously occupied by the clinical crown. Designs include: ovate, modified ridge lap, saddle/ridge lap, conical, hygiene/bullet, and full ridge lap.",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["dummy tooth", "bridge span"],
    seeAlso: ["ovate pontic", "modified ridge lap pontic", "connector", "retainer"]
  },

  "connector (FDP)": {
    definition: "The portion of a fixed dental prosthesis that joins the retainer(s) to the pontic(s). Minimum cross-sectional area: 9mm² for anterior connectors, 16mm² for posterior connectors. Undersized connectors are a primary cause of bridge fracture.",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["solder joint", "bridge connector"],
    seeAlso: ["retainer", "pontic", "fixed partial denture", "framework design"]
  },

  "abutment tooth": {
    definition: "A tooth that supports a prosthesis. In fixed prosthodontics, a tooth that supports or anchors a fixed dental prosthesis via a retainer crown. Distinguished from an implant abutment (prosthetic component).",
    category: "prosthesis",
    gptEdition: "GPT-2023",
    synonyms: ["prosthetic abutment tooth", "bridge abutment"],
    seeAlso: ["retainer", "pier abutment", "cantilever", "long-span FDP"]
  },

}

// ── Implant-specific term clusters for AI quick lookup ──
export const IMPLANT_TERM_CLUSTERS = {
  emergence: ["emergence profile", "emergence angle", "transmucosal profile", "critical contour", "subcritical contour", "height of contour"],
  retention: ["screw-retained restoration", "cement-retained restoration", "screwmentable restoration", "passive fit", "marginal fit", "retrievability"],
  abutment: ["dental implant abutment", "custom abutment", "Ti-base abutment", "angulated screw channel", "healing abutment", "multi-unit abutment", "scan body"],
  tissue: ["peri-implant mucosa", "peri-implant mucositis", "peri-implantitis", "biological width (implant)", "mucosal thickness"],
  occlusion: ["implant occlusion", "implant-protected occlusion", "mutually protected occlusion", "centric occlusion", "canine guidance", "group function"],
  digital: ["digital workflow (prosthodontic)", "CAD/CAM (dental)", "CBCT (dental)", "photogrammetry (dental)", "intraoral scanner (IOS)", "conversion prosthesis"],
  bone: ["bone density (Lekholm-Zarb)", "crestal bone", "implant stability quotient", "primary stability", "osseointegration"],
  connection: ["implant platform", "platform switching", "implant-abutment connection", "Morse taper connection", "implant collar"],
}

// ── GPT-2023 Reference ──
export const GPT_REFERENCE = {
  edition: "GPT-2023 (10th Edition)",
  fullCitation: "Layton DM (Ed.), Morgano SM, Muller F, Kelly JA, Nguyen CT, Scherrer SS, Salinas TJ, Shah KC, Att W, Frelich MA, Ferro KJ. Glossary of Prosthodontic Terms 2023, 10th edition. J Prosthet Dent 2023;130(4S1):e1-e126.",
  doi: "10.1016/j.prosdent.2023.01.002",
  totalTerms: 3611,
  newOrAmendedIn2023: 526,
  keyDomainsIn2023: [
    "gerodontics",
    "maxillofacial prosthetics",
    "ceramics",
    "patient-related outcome measures",
    "digital-supported prosthodontics"
  ],
  url: "https://www.thejpd.org/article/S0022-3913(23)00137-3/fulltext"
}
