#!/bin/bash
# ================================================================
# RESTORA — GitHub Setup & Push
# Run these commands from your project root directory
# ================================================================

# ── FIRST TIME SETUP ──────────────────────────────────────────

# 1. Initialize git repo (skip if already initialized)
git init

# 2. Set your identity (first time only)
git config user.name "Your Name"
git config user.email "your@email.com"

# 3. Create repo on GitHub (do this at github.com first)
#    Then add the remote:
git remote add origin https://github.com/YOUR_USERNAME/restora.git

# ── COMMIT ALL FILES ──────────────────────────────────────────

# 4. Stage everything
git add .

# 5. Verify what will be committed (check .gitignore is working)
#    Should NOT see: *.stl, *.dcm, *.env, node_modules/
git status

# 6. Initial commit
git commit -m "feat: initial Restora platform commit

- DesignSystemsBridge: CEREC/Smilefy/exocad integration with auto mode
- MOD Institute workflow protocols integrated into Restora AI engine
- GPT-2023 prosthodontic terminology database (3,611 terms)
- Implant design evidence base (12 leading studies)
- Evidence-based design rules and AI flag system
- GitHub setup: HIPAA-aware .gitignore (STL/DCM excluded)"

# 7. Push to GitHub
git branch -M main
git push -u origin main

# ── SUBSEQUENT UPDATES ────────────────────────────────────────

# Stage specific files
# git add src/engine/mod-protocols.ts
# git add src/lib/dental-knowledge/implant-studies.ts

# Or stage all changes
# git add .

# Commit with descriptive message
# git commit -m "feat: add [feature description]"

# Push
# git push

# ── RECOMMENDED BRANCH STRATEGY ──────────────────────────────

# Feature branches (recommended):
# git checkout -b feature/implant-design-ai
# git push -u origin feature/implant-design-ai
# (then open Pull Request on GitHub)

# ── HIPAA REMINDER ───────────────────────────────────────────
# The .gitignore excludes:
#   *.stl *.dcm *.ply *.obj *.3ox (scan/design files — may contain PHI)
#   *.env (API keys, credentials)
#   patient-data/ uploads/ cases/ (patient directories)
# NEVER override these exclusions — patient data must NEVER be committed
