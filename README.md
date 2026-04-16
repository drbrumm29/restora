# Restora — AI Dental Design Platform

> Cloud-based dental CAD platform for designing restorations, smile mockups, and implant prosthetics — powered by AI.

---

## Overview

Restora is a clinical-grade dental design platform built for dentists and lab technicians. It integrates with leading CAD systems — **CEREC**, **Smilefy**, and **exocad** — to support the full restoration design workflow from prep assessment through milling/printing output.

---

## Core Features

| Module | Description |
|---|---|
| **AI Design Engine** | 4-stage workflow: Assessment → Design → 3D Review → Output |
| **Restoration CAD** | Crown, veneer, onlay, inlay, bridge — on any prep |
| **Smile Simulation** | 8-layer optical rendering with patient approval workflow |
| **Implant Planning** | Site analysis, surgical guide, prosthetic design |
| **Design Systems Bridge** | CEREC Connect · Smilefy · exocad round-trip integration |
| **Export Hub** | SprintRay · Formlabs · Lab send · Alien Milling · Restora Cloud |
| **AI Clinical Assistant** | Restora AI — esthetic + biologic protocol enforcement |

---

## Design Systems Integration

### CEREC (Dentsply Sirona)
- CEREC Connect cloud upload/download
- Primescan STL import
- In-office milling output (CEREC MC X, Primemill)
- Prep scan → restoration design → mill workflow

### Smilefy
- Patient photo upload to Smilefy design workspace
- Mockup overlay import back into Restora
- Digital smile design → restoration correlation
- Before/after generation for case presentation

### exocad
- Full design package export (STL + 3OX + DCM)
- Lab-side exocad DentalCAD round-trip
- Bridge framework + crown design compatibility
- Implant abutment and bar framework support

---

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **3D Engine**: Three.js (WebGL)
- **AI**: Anthropic Claude (claude-sonnet-4) — Restora AI
- **Build**: Vite
- **Styling**: CSS Variables design system

---

## Project Structure

```
restora/
├── src/
│   ├── components/          # Shared UI (Sidebar, ToothChart, etc.)
│   ├── engine/              # AI engine, image analysis pipeline
│   ├── features/            # Page-level feature components
│   │   ├── RestorationDesign.tsx
│   │   ├── SmileSimulation.tsx
│   │   ├── ImplantPlan.tsx
│   │   ├── ExportHub.tsx
│   │   ├── PatientHub.tsx
│   │   └── Dashboard.tsx
│   ├── integrations/
│   │   └── design-systems/  # CEREC · Smilefy · exocad bridge
│   │       ├── DesignSystemsBridge.tsx
│   │       ├── cerec.ts
│   │       ├── smilefy.ts
│   │       └── exocad.ts
│   ├── lib/
│   │   ├── implant-db/      # 11 implant systems
│   │   └── tooth-anatomy-db/
│   ├── store.ts
│   └── types.ts
└── public/
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## HIPAA Compliance

- All patient data is processed locally or via HIPAA-compliant endpoints
- STL/scan files are **never committed to this repo** (see `.gitignore`)
- AES-256 encryption on Restora Cloud
- BAA verification required for all third-party lab sends

---

## Contributing

This is a private repository. All contributors must sign an NDA and BAA before access is granted.

---

*Restora — April 2026*
