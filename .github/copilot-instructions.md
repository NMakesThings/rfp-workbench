# Copilot / Automation Instructions — RFP Workbench (short)

Purpose
This repository is a static HTML/CSS/JavaScript prototype that generates and reviews RFP requirements. It is client-driven in the browser and uses JSON files under data/ as authoritative sources. Workspace-scoped user state is stored in browser localStorage.

Key files and runtime shape (quick)
- Home / Launch Pad: index.html (loads js/home.js and js/workspaces.js)
- Interview (Project Intake): interview.html (loads js/app.js, which reads data/interview-questions.json)
- Requirements generation and review: preview.html + js/requirements-engine.js (loads data/requirements-library.json)
- Authoritative data: data/*.json (requirements-library.json, interview-questions.json, source-packages.json, rfp-components-library.json, etc.)
- Staged source packages: source-rfps/ (source documents & notes)
- Workspace persistence: browser localStorage with keys:
  - rfpClientWorkspaces (workspaces list)
  - rfpActiveClientWorkspaceId (active workspace id)
  - rfpWorkspace:{workspaceId}:{scopedItem} (scoped items such as `answers`, `reviewDecisions`, `requirementReviewNotes`, `projectSpecificRequirements`, `projectPlanItems`, etc.)
- Static server for local dev: server.js (serves the files under the repo root)

Non-negotiable application guardrails (must be preserved)
1. Do not edit source RFP files (source-rfps/) programmatically. Source files are human-reviewed artifacts.
2. Do not mutate data/requirements-library.json directly from a browser UI or client-side automation. The reusable library is authoritative and requires a controlled import path.
3. Do not automatically promote client-specific content or staged imports into the reusable library. Promotion must be a deliberate, auditable action after human review.
4. Keep reusable library content, staged imports, client/project workspace data, and source documents clearly separated — maintain clear conceptual and workflow separation; when adding a backend, use separate storage and APIs as appropriate.
5. Keep AI-generated content pending review; do not allow it to affect RFP generation without explicit acceptance by a human reviewer.
6. Do not overwrite confirmed intake answers automatically. Changes to confirmed intake must be explicit, visible, and auditable.
7. Prefer low-effort consultant workflows: avoid duplicate data entry and make each user input clearly useful in the UI and exports.
8. Preserve provenance and human review decisions (timestamps, user attribution, sourcePackageId/sourceDocumentId/originalRequirementId, reviewStatus).
9. Any substantial architecture changes — e.g., adding authentication, a database, document storage, shared collaboration, or automated AI/API integrations that affect the persistence/import model — must be proposed as a written implementation plan and approved before code changes begin.

Guidance for contributions and automation
- Documentation-only edits (README, docs) are acceptable directly as PRs.
- Any change that affects data model, import/promotion behavior, storage, or introduces server-side write paths must include:
  - design doc describing: data model, access control, audit, rollback, and migration strategy,
  - an appropriate validation plan, including automated tests where practical,
  - an explicit plan to preserve provenance and to maintain the staging/review pipeline.
- Keep any automation conservative: prefer tools that validate JSON, lint data, and produce human-reviewable reports rather than automatic transforms.

If you need pointers
- To inspect workspace scoping: js/workspaces.js
- To inspect the interview app: js/app.js
- To inspect selection and export logic: js/requirements-engine.js and js/export.js
