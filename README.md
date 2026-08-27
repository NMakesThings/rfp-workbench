# RFP Requirements Prototype

Static HTML, CSS, JavaScript, and JSON prototype for generating RFP requirements from a structured interview.

## Files

- `index.html` is the Home / Launch Pad. It contains the home dashboard and loads home UI scripts (`js/home.js`, `js/workspaces.js`).
- `interview.html` contains the structured Project Intake workflow and loads `js/app.js` (which reads `data/interview-questions.json` and manages interview autosave and validation).
- `preview.html` loads `data/requirements-library.json` and displays matching requirements grouped by section.
- `css/styles.css` contains shared styling.
- `js/app.js` handles interview rendering and browser storage.
- `js/workspaces.js` manages browser-local client workspaces.
- `js/requirements-engine.js` selects and groups matching requirements.
- `js/export.js` copies or downloads selected requirements.
- `data/interview-questions.json` stores interview sections, prompts, and answer choices.
- `data/requirements-library.json` stores reusable RFP requirements, Category/Function taxonomy, applicability metadata, and matching criteria.
- `data/source-packages.json` describes source RFP packages staged for review before import.
- `data/rfp-components-library.json` sketches reusable RFP component types that are not always requirements, such as scoring weights, proposal instructions, SOW tasks, cost requirements, service liabilities, and templates.
- `source-rfps/` stores source package notes and source documents for future review.

## Run Locally

Because the app fetches local JSON files, open it through a static HTTP server from this folder:

```powershell
node server.js
```

Then visit:

```text
http://localhost:8000/
```

No backend, database, framework, package manager, or build tooling is required.

## Client Workspaces

The prototype supports multiple browser-local client workspaces. Each workspace has its own:

- interview answers
- preview review decisions
- export filename

Use the sidebar workspace selector to switch between clients. Use `New Client` to create another workspace for a separate client or project.

Workspace data is stored in `localStorage` in the current browser. It is not shared across browsers or devices, and it is not a production multi-user persistence model.

## How Matching Works

Each requirement uses a v1 Category/Function schema. The primary `id` uses:

```text
CATEGORY-FUNCTION-NUMBER
```

Examples:

```text
SEC-AUTH-001
SEC-ENCRYPT-001
FUN-WORKFLOW-001
TECH-API-001
DATA-MIGRATION-001
VENDOR-QUAL-001
```

Category and Function are structured fields, not tags:

- `categoryId` and `categoryLabel` define the broad library domain.
- `functionId` and `functionLabel` define the capability area within the category.
- `requirementNumber` is a three-digit sequence within the Category/Function pair.
- `sectionId` and `sectionLabel` control generated RFP grouping.
- `subsection` provides a finer placement inside the section.
- `tags` provide secondary search and filtering labels.
- `applicability` describes where the requirement is generally reusable.
- `criteria` is the prototype's machine-readable interview matching logic.

Each requirement also includes `title`, `sortOrder`, `requirementLevel`, `priority`, `status`, `version`, `text`, `rationale`, `responseInstructions`, `evaluationCriteria`, `source`, and `notes`.

The current sample requirements also include import-readiness metadata:

- `sourcePackageId`
- `sourceDocumentId`
- `originalRequirementId`
- `originalText`
- `sourceStatus`
- `reviewStatus`
- `reuseAssessment`
- `clientSpecificity`

These fields are intended to keep future imports from mixing approved reusable requirements with draft source language, reviewer comments, client-specific language, contract clauses, scoring items, and other non-reusable material.

The `criteria` object remains compatible with the current interview answers:

- `always: true` includes the requirement for every preview.
- `any` includes the requirement when at least one listed answer matches.
- `all` includes the requirement only when every listed answer matches.
- `none` excludes the requirement when any listed answer matches.

Example:

```json
{
  "id": "SEC-AUTH-001",
  "categoryId": "SEC",
  "categoryLabel": "Security",
  "functionId": "AUTH",
  "functionLabel": "Authentication and Access Control",
  "requirementNumber": "001",
  "title": "Single Sign-On Integration",
  "sectionId": "technical_requirements",
  "sectionLabel": "Technical Requirements",
  "subsection": "Identity and Access Management",
  "sortOrder": 403,
  "requirementLevel": "must",
  "priority": "high",
  "status": "approved",
  "version": "1.0.0",
  "text": "Solution shall integrate with the organization's single sign-on provider using SAML 2.0, OpenID Connect, or another mutually agreed standard.",
  "rationale": "Centralized identity reduces access risk and simplifies user lifecycle management.",
  "responseInstructions": "Describe supported SSO standards, configuration steps, identity provider experience, and limitations.",
  "evaluationCriteria": "Preference will be given to native standards-based SSO with documented implementation references.",
  "applicability": {
    "integrations": ["sso"]
  },
  "tags": ["sso", "identity"],
  "source": {
    "type": "prototype",
    "name": "Initial sample library",
    "year": 2026,
    "packageId": "prototype-sample-library",
    "documentId": "prototype-requirements-library",
    "originalRequirementId": "SEC-AUTH-001",
    "sourceStatus": "normalized_sample"
  },
  "sourcePackageId": "prototype-sample-library",
  "sourceDocumentId": "prototype-requirements-library",
  "originalRequirementId": "SEC-AUTH-001",
  "originalText": "Solution shall integrate with the organization's single sign-on provider using SAML 2.0, OpenID Connect, or another mutually agreed standard.",
  "sourceStatus": "normalized_sample",
  "reviewStatus": "approved",
  "reuseAssessment": "reusable",
  "clientSpecificity": "generic",
  "notes": "",
  "criteria": {
    "any": {
      "integrations": ["sso"]
    }
  }
}
```

## Source Package Review

The `source-rfps/` folder currently contains two source packages:

- `da-full-rfp-package`: a staged District Attorney / prosecutor CMS RFP package.
- `court-requirements-in-progress`: a staged court CMS requirements workbook.

The app should not import those files directly into `requirements-library.json` until each source item has been reviewed and classified.

Recommended staging decisions:

- `requirement`: reusable functional, technical, implementation, support, accessibility, security, or operational requirement.
- `proposal_instruction`: vendor response instruction.
- `evaluation_criterion`: scoring or evaluation criterion.
- `scoring_weight`: phase, criterion, demonstration, or cost weighting.
- `cost_requirement`: cost matrix or pricing response item.
- `contract_clause`: reusable legal or contractual term.
- `sow_task`: implementation or operational task.
- `deliverable`: required work product or acceptance artifact.
- `service_level`: support, uptime, response, resolution, credit, backup, or disaster recovery commitment.

## Preview Review Workflow

The preview page now shows why each requirement was selected from the interview answers. Each requirement also has a reviewer decision:

- `Include in export`
- `Needs revision`
- `Needs client clarification`
- `Exclude from export`

Reviewer decisions are stored in browser storage. Copy/download output excludes only requirements marked `Exclude from export`; requirements marked for revision or clarification remain in the exported outputs to preserve reviewer context and consultant notes.
