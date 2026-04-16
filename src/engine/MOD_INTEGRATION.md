# MOD Institute Protocol Integration

**Status:** ✅ Complete — April 2026  
**Source:** [themodinstitute.com](https://www.themodinstitute.com) — PACE-approved CE provider  
**Faculty:** Dr. Wally Renne · Dr. Mike DeFee · Dr. Tony Mennito · Dr. Allan Queiroz · Dr. Casey Bennett

---

## Why MOD Institute

The MOD Institute is a leading digital dentistry education provider based in Charleston, SC. Their clinician-led, evidence-backed workflows cover every major restoration type. Their free resources alone include 2,600+ pages of step-by-step guides plus STL files — making them the ideal foundation for Restora AI's clinical intelligence.

---

## What's Integrated

### Protocol Additions to Restora AI System Prompt

| Protocol | MOD Source |
|---|---|
| Mockup-first for all esthetic zone cases | Smile Design & Veneers curriculum |
| No-prep / whisper-thin veneer pathway | Smile Design & Veneers curriculum |
| Direct print mockup workflow (with + without AI) | exocad Smile Design Guide |
| Partial coverage therapy (inlay/onlay over crown) | Fillings, Inlays & Onlays curriculum |
| Isthmus dimension minimums by material | 3D Printing curriculum |
| 3D print orientation + nesting protocol | 3D Printing Nesting Guide |
| VDO assessment for worn dentition | Full Mouth Restorations curriculum |
| Deprogrammer use before full mouth records | Full Mouth Restorations curriculum |
| Photogrammetry for All-on-X accuracy | All-on-X curriculum |
| Same-day conversion prosthesis workflow | All-on-X curriculum |
| Zirconia stain-and-glaze characterization | All-on-X curriculum |
| Tissue-friendly implant crown emergence | Implants curriculum |
| Ti-base + scan body verification | Implants curriculum |
| 2-visit digital denture protocol | Removables curriculum |
| Standardized photography set + lighting | Light Made Simple |

### Case Triage Decision Tree
MOD's tooth-preservation philosophy is embedded in every case decision:
- Single posterior with ≥50% structure → Inlay/Onlay before Crown
- Anterior esthetic → No-prep assessment first → Mockup mandatory
- Full arch → VDO + photogrammetry workflow
- All-on-X → Same-day conversion → staged to final zirconia

### MOD Workflow Tip
Every AI design output includes a `mod_workflow_tip` specific to the restoration type — a concise clinical reminder pulled from MOD protocol.

### MOD Resource Links
Every design output includes `mod_resources` — direct links to the relevant free MOD guides for the dentist to reference.

---

## Free MOD Resources Catalogued (16 total)

| Resource | Type | Pages | Best For |
|---|---|---|---|
| exocad Smile Design Guide | PDF | 300+ | Smile mockup, veneers |
| exocad Foundations Guide | PDF | 500+ | Crown, bridge, CAD basics |
| exocad Full Mouth Restorations Guide | PDF | 200+ | FMR, worn dentition |
| exocad All-on-X Guide | PDF | 900+ | Full arch implants |
| exocad Dentures Guide | PDF | 700+ | Complete/partial dentures |
| 3D Printing in Restorative Dentistry (4th Ed) | eBook | — | All 3D print cases |
| 3D Printing Nesting Guide (2nd Ed) | eBook | — | Print setup/orientation |
| Top 10 Tips for 3D Printing | PDF | — | Print troubleshooting |
| Light Made Simple + MOD Softbox STL | PDF + STL | — | Photography/shade |
| MOD Tissue Tracker STL | STL | — | Implant tissue tracking |
| MOD Denture Record System STL | STL + Tutorial | — | Denture records |
| Modern Optimized Deprogrammer STL | STL | — | Pre-FMR records |
| VDO Gauge STL | STL | — | VDO measurement |
| MOD 3D Printed Shade Tabs STL | STL | — | Shade matching |
| 3D Printed Flex RPD Guide | PDF | 50+ | Removable partials |
| MOD Study Model STL | STL + Handout | — | Test files / practice |

All resources free at: **themodinstitute.com/dental-ce-free-resources**

---

## Test Files

The **MOD Study Model STL** is the recommended test file for the Design Systems Bridge. It provides a realistic upper/lower arch pair that exercises all file upload slots correctly.

---

## Files

```
src/engine/
├── mod-protocols.ts              ← MOD protocol extension + resource registry
├── restora-ai-engine-v2.ts       ← Updated AI engine with MOD system prompt
└── MOD_INTEGRATION.md            ← this file
```

*Last updated: April 2026*
