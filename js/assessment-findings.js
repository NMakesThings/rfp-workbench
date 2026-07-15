(function () {
  "use strict";

  const STORAGE_KEYS = {
    workspaces: "rfpClientWorkspaces",
    activeWorkspace: "rfpActiveClientWorkspaceId"
  };
  const STORAGE_ITEM = "assessmentFindings";
  const VERSION = 1;
  const ASSIST_PROMPT_VERSION = "assessment-findings-assist-v1";
  const ASSIST_IMPORT_SOURCE = "external-ai-assist";
  const ASSIST_SUPPORTED_SCHEMA_VERSION = 1;
  const ASSIST_MAX_WARNING_COUNT = 25;
  const ASSIST_MAX_BLOCK_COUNT = 50;
  const CSV_IMPORT_SOURCE = "csv-import";
  const CSV_FILE_WARN_BYTES = 500 * 1024;
  const CSV_FILE_BLOCK_BYTES = 2 * 1024 * 1024;
  const CSV_MAX_WARNING_ROWS = 50;
  const CSV_MAX_BLOCK_ROWS = 200;
  const CSV_PREVIEW_ROW_LIMIT = 5;
  const FINDING_TYPES = {
    finding: "Finding",
    gap: "Gap",
    risk: "Risk",
    opportunity: "Opportunity",
    recommendation: "Recommendation"
  };
  const SEVERITIES = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical"
  };
  const STATUSES = {
    draft: "Draft",
    "needs-review": "Needs Review",
    ready: "Ready",
    deferred: "Deferred"
  };
  const CONFIDENCE_LEVELS = {
    high: "High",
    medium: "Medium",
    low: "Low"
  };
  const SOURCE_TYPES = {
    "project-intake": "Project Intake",
    "client-source-intake": "Client Source Intake",
    "public-research": "Public Research",
    "requirements-review": "Requirements Review",
    "project-plan": "Project Plan",
    "manual-note": "Manual Note"
  };
  const SOURCE_PAGE_OPTIONS = [
    ["", "No route selected"],
    ["interview.html", "Project Intake"],
    ["client-source-intake.html", "Client Source Intake"],
    ["public-information-ai-assist.html", "Public Research"],
    ["preview.html", "Requirements Review"],
    ["project-plan.html", "Project Plan"],
    ["review-queue.html", "Review Queue"],
    ["rfp-package.html", "Deliverable Builder"]
  ];
  const CSV_MAPPING_FIELDS = [
    { value: "title", label: "Title", aliases: ["title", "finding", "finding title", "issue", "risk", "gap"] },
    { value: "findingType", label: "Finding type", aliases: ["type", "finding type", "category type"] },
    { value: "severity", label: "Severity", aliases: ["severity", "priority", "risk level", "impact level"] },
    { value: "status", label: "Status", aliases: ["status", "state", "review status"] },
    { value: "domain", label: "Domain", aliases: ["domain", "area", "category", "workstream"] },
    { value: "summary", label: "Summary", aliases: ["summary", "description", "finding summary", "issue description"] },
    { value: "evidence", label: "Evidence", aliases: ["evidence", "source", "basis", "observation", "supporting detail"] },
    { value: "impact", label: "Impact", aliases: ["impact", "effect", "business impact", "operational impact"] },
    { value: "recommendation", label: "Recommendation", aliases: ["recommendation", "recommended action", "next step", "mitigation"] },
    { value: "sourceLabel", label: "Source label", aliases: ["source label", "reference label"] },
    { value: "sourceNote", label: "Source note", aliases: ["source note", "reference", "source reference"] },
    { value: "tags", label: "Tags", aliases: ["tags", "labels", "keywords"] },
    { value: "notes", label: "Internal notes", aliases: ["notes", "internal notes", "comments"] }
  ];

  const elements = {};
  const state = {
    workspace: null,
    wrapper: createEmptyWrapper(),
    selectedFindingId: "",
    draftReferences: [],
    filters: {
      search: "",
      findingType: "",
      status: "",
      severity: ""
    },
    assistValidation: null,
    csvImport: createEmptyCsvImportState()
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindActions();
    populateSelects();
    loadWorkspaceState();
  }

  function cacheElements() {
    elements.status = document.getElementById("assessment-findings-status");
    elements.noActive = document.getElementById("assessment-findings-no-active");
    elements.workspace = document.getElementById("assessment-findings-workspace");
    elements.workspaceTitle = document.getElementById("assessment-findings-workspace-title");
    elements.summary = document.getElementById("assessment-findings-summary");
    elements.readiness = document.getElementById("assessment-findings-readiness");
    elements.newButton = document.getElementById("assessment-findings-new");
    elements.resetButton = document.getElementById("assessment-findings-reset");
    elements.resetFilters = document.getElementById("assessment-findings-reset-filters");
    elements.list = document.getElementById("assessment-findings-list");
    elements.listCount = document.getElementById("assessment-findings-list-count");
    elements.search = document.getElementById("assessment-findings-search");
    elements.typeFilter = document.getElementById("assessment-findings-type-filter");
    elements.statusFilter = document.getElementById("assessment-findings-status-filter");
    elements.severityFilter = document.getElementById("assessment-findings-severity-filter");
    elements.form = document.getElementById("assessment-findings-form");
    elements.editorKicker = document.getElementById("assessment-findings-editor-kicker");
    elements.editorTitle = document.getElementById("assessment-findings-editor-title");
    elements.importMeta = document.getElementById("assessment-findings-import-meta");
    elements.title = document.getElementById("assessment-finding-title");
    elements.domain = document.getElementById("assessment-finding-domain");
    elements.findingType = document.getElementById("assessment-finding-type");
    elements.severity = document.getElementById("assessment-finding-severity");
    elements.findingStatus = document.getElementById("assessment-finding-status");
    elements.tags = document.getElementById("assessment-finding-tags");
    elements.summaryText = document.getElementById("assessment-finding-summary");
    elements.evidence = document.getElementById("assessment-finding-evidence");
    elements.impact = document.getElementById("assessment-finding-impact");
    elements.recommendation = document.getElementById("assessment-finding-recommendation");
    elements.notes = document.getElementById("assessment-finding-notes");
    elements.addSource = document.getElementById("assessment-findings-add-source");
    elements.sourceList = document.getElementById("assessment-findings-source-list");
    elements.saveNew = document.getElementById("assessment-findings-save-new");
    elements.copyAssistPrompt = document.getElementById("assessment-findings-copy-assist-prompt");
    elements.insertAssistSample = document.getElementById("assessment-findings-insert-assist-sample");
    elements.assistStatus = document.getElementById("assessment-findings-assist-status");
    elements.assistPrompt = document.getElementById("assessment-findings-assist-prompt");
    elements.assistJson = document.getElementById("assessment-findings-assist-json");
    elements.validateAssist = document.getElementById("assessment-findings-validate-assist-output");
    elements.assistImport = document.getElementById("assessment-findings-import-assist-output");
    elements.assistWarnings = document.getElementById("assessment-findings-assist-warnings");
    elements.assistPreview = document.getElementById("assessment-findings-assist-preview");
    elements.csvText = document.getElementById("assessment-findings-csv-text");
    elements.csvFile = document.getElementById("assessment-findings-csv-file");
    elements.csvFileMeta = document.getElementById("assessment-findings-csv-file-meta");
    elements.parseCsv = document.getElementById("assessment-findings-parse-csv");
    elements.validateCsv = document.getElementById("assessment-findings-validate-csv");
    elements.importCsv = document.getElementById("assessment-findings-import-csv");
    elements.clearCsv = document.getElementById("assessment-findings-clear-csv");
    elements.csvStatus = document.getElementById("assessment-findings-csv-status");
    elements.csvWarnings = document.getElementById("assessment-findings-csv-warnings");
    elements.csvHeaders = document.getElementById("assessment-findings-csv-headers");
    elements.csvPreview = document.getElementById("assessment-findings-csv-preview");
    elements.csvMapping = document.getElementById("assessment-findings-csv-mapping");
    elements.csvImportPreview = document.getElementById("assessment-findings-csv-import-preview");
  }

  function bindActions() {
    if (elements.newButton) elements.newButton.addEventListener("click", startNewFinding);
    if (elements.resetButton) elements.resetButton.addEventListener("click", resetEditor);
    if (elements.resetFilters) elements.resetFilters.addEventListener("click", resetFilters);
    if (elements.form) elements.form.addEventListener("submit", handleSaveFinding);
    if (elements.saveNew) elements.saveNew.addEventListener("click", handleSaveAndNew);
    if (elements.addSource) elements.addSource.addEventListener("click", addSourceReference);
    if (elements.list) elements.list.addEventListener("click", handleListAction);
    if (elements.sourceList) elements.sourceList.addEventListener("click", handleSourceReferenceAction);
    if (elements.copyAssistPrompt) elements.copyAssistPrompt.addEventListener("click", handleCopyAssistPrompt);
    if (elements.insertAssistSample) elements.insertAssistSample.addEventListener("click", handleInsertAssistSampleJson);
    if (elements.assistJson) elements.assistJson.addEventListener("input", handleAssistJsonInput);
    if (elements.validateAssist) elements.validateAssist.addEventListener("click", handleValidateAssistOutput);
    if (elements.assistImport) elements.assistImport.addEventListener("click", handleImportAssistFindings);
    if (elements.csvText) elements.csvText.addEventListener("input", handleCsvTextInput);
    if (elements.csvFile) elements.csvFile.addEventListener("change", handleCsvFileLoad);
    if (elements.parseCsv) elements.parseCsv.addEventListener("click", handleParseCsv);
    if (elements.validateCsv) elements.validateCsv.addEventListener("click", handleValidateCsvRows);
    if (elements.importCsv) elements.importCsv.addEventListener("click", handleImportCsvFindings);
    if (elements.clearCsv) elements.clearCsv.addEventListener("click", clearCsvImport);
    if (elements.csvMapping) elements.csvMapping.addEventListener("change", handleCsvMappingChange);
    [elements.search, elements.typeFilter, elements.statusFilter, elements.severityFilter]
      .filter(Boolean)
      .forEach((control) => {
        control.addEventListener("input", handleFilterChange);
        control.addEventListener("change", handleFilterChange);
      });
  }

  function populateSelects() {
    populateOptions(elements.findingType, FINDING_TYPES);
    populateOptions(elements.severity, SEVERITIES);
    populateOptions(elements.findingStatus, STATUSES);
    populateFilterOptions(elements.typeFilter, FINDING_TYPES, "All types");
    populateFilterOptions(elements.statusFilter, STATUSES, "All statuses");
    populateFilterOptions(elements.severityFilter, SEVERITIES, "All severities");
  }

  function populateOptions(select, options) {
    if (!select) return;
    select.innerHTML = Object.entries(options)
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join("");
  }

  function populateFilterOptions(select, options, firstLabel) {
    if (!select) return;
    select.innerHTML = [`<option value="">${escapeHtml(firstLabel)}</option>`]
      .concat(Object.entries(options).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`))
      .join("");
  }

  function loadWorkspaceState() {
    state.workspace = getActiveWorkspace();

    if (!state.workspace) {
      renderNoActiveWorkspace();
      return;
    }

    state.wrapper = loadWrapper(state.workspace.id);
    state.selectedFindingId = "";
    state.draftReferences = [];
    renderWorkspace();
    startNewFinding();
    setStatus(`Assessment Findings loaded for ${state.workspace.name || "Untitled Workspace"}.`, false);
  }

  function renderNoActiveWorkspace() {
    state.wrapper = createEmptyWrapper();
    state.selectedFindingId = "";
    state.assistValidation = null;
    state.csvImport = createEmptyCsvImportState();
    renderCsvImport();
    if (elements.noActive) elements.noActive.classList.remove("hidden");
    if (elements.workspace) elements.workspace.classList.add("hidden");
    setStatus("Select a workspace to capture assessment findings.", false);
  }

  function renderWorkspace() {
    if (elements.noActive) elements.noActive.classList.add("hidden");
    if (elements.workspace) elements.workspace.classList.remove("hidden");
    if (elements.workspaceTitle) elements.workspaceTitle.textContent = `${state.workspace.name || "Untitled Workspace"} assessment findings`;
    renderSummaryCards();
    renderReadiness();
    renderAssistPrompt();
    renderAssistValidation();
    renderCsvImport();
    renderFindingsList();
  }

  function renderSummaryCards() {
    if (!elements.summary) return;
    const metrics = getFindingMetrics(state.wrapper.findings);
    const cards = [
      ["Total findings", metrics.total, metrics.total ? "ready" : "missing", "All finding records"],
      ["Ready findings", metrics.ready, metrics.ready ? "ready" : "needs-review", "Marked Ready"],
      ["Needs review", metrics.needsReview, metrics.needsReview ? "needs-review" : "ready", "Draft or Needs Review"],
      ["High/Critical risks", metrics.highCriticalRisks, metrics.highCriticalRisks ? "needs-review" : "ready", "Risk records only"],
      ["Recommendations", metrics.recommendations, metrics.recommendations ? "ready" : "missing", "Recommendation-type records"],
      ["Evidence-linked findings", metrics.evidenceLinked, metrics.evidenceLinked ? "ready" : "needs-review", "Evidence text or source references"]
    ];

    elements.summary.innerHTML = cards.map(([label, value, status, detail]) => `
      <article class="library-summary-card assessment-summary-card status-${escapeHtml(status)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `).join("");
  }

  function renderReadiness() {
    if (!elements.readiness) return;
    const readiness = getReadinessSignals(state.wrapper.findings);
    elements.readiness.innerHTML = readiness.map((item) => `
      <article class="assessment-readiness-item status-${escapeHtml(item.status)}">
        <span class="staged-badge ${badgeClass(item.status)}">${escapeHtml(item.label)}</span>
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.detail)}</p>
        </div>
      </article>
    `).join("");
  }

  function renderFindingsList() {
    if (!elements.list) return;
    const findings = getFilteredFindings();
    if (elements.listCount) elements.listCount.textContent = `${findings.length} shown`;

    if (!state.wrapper.findings.length) {
      elements.list.innerHTML = `
        <div class="empty-state assessment-inline-empty">
          <h3>No assessment findings yet</h3>
          <p>Create the first finding, gap, risk, opportunity, or recommendation for this workspace.</p>
          <button type="button" class="button secondary" data-action="new">New Finding</button>
        </div>
      `;
      return;
    }

    if (!findings.length) {
      elements.list.innerHTML = `
        <div class="empty-state assessment-inline-empty">
          <h3>No findings match the current filters</h3>
          <p>Clear filters or adjust the search terms.</p>
        </div>
      `;
      return;
    }

    elements.list.innerHTML = findings.map((finding) => {
      const tags = finding.tags.length ? finding.tags.join(", ") : "No tags";
      const isSelected = finding.id === state.selectedFindingId;
      return `
        <article class="assessment-finding-card ${isSelected ? "active" : ""}">
          <div class="assessment-finding-card-main">
            <div>
              <div class="assessment-finding-badge-row">
                <span class="staged-badge ${badgeClass(finding.status)}">Import status: ${escapeHtml(getLabel(STATUSES, finding.status))}</span>
                ${renderImportBadges(finding)}
              </div>
              <h3>${escapeHtml(finding.title || "Untitled finding")}</h3>
              <p>${escapeHtml(finding.summary || "No summary captured yet.")}</p>
            </div>
            <dl class="assessment-finding-card-meta">
              <div><dt>Type</dt><dd>${escapeHtml(getLabel(FINDING_TYPES, finding.findingType))}</dd></div>
              <div><dt>Severity</dt><dd>${escapeHtml(getLabel(SEVERITIES, finding.severity))}</dd></div>
              <div><dt>Domain / tags</dt><dd>${escapeHtml([finding.domain, tags].filter(Boolean).join(" / "))}</dd></div>
              <div><dt>Source references</dt><dd>${escapeHtml(String(finding.sourceReferences.length))}</dd></div>
            <div><dt>Tags</dt><dd>${escapeHtml(finding.tags.length ? finding.tags.join(", ") : "None")}</dd></div>
              ${finding.importSource === ASSIST_IMPORT_SOURCE ? `<div><dt>Confidence</dt><dd>${escapeHtml(getLabel(CONFIDENCE_LEVELS, finding.confidence || "medium"))}</dd></div>` : ""}
              <div><dt>Updated</dt><dd>${escapeHtml(formatDate(finding.updatedAt))}</dd></div>
            </dl>
          </div>
          <div class="assessment-finding-card-actions">
            <button type="button" class="button secondary" data-action="edit" data-id="${escapeHtml(finding.id)}">Open/Edit</button>
            <button type="button" class="button secondary" data-action="duplicate" data-id="${escapeHtml(finding.id)}">Duplicate</button>
            <button type="button" class="button secondary danger-action" data-action="delete" data-id="${escapeHtml(finding.id)}">Delete</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEditor(finding) {
    const current = normalizeFinding(finding || createEmptyFinding());
    if (elements.editorKicker) elements.editorKicker.textContent = state.selectedFindingId ? "Edit finding" : "New finding";
    if (elements.editorTitle) elements.editorTitle.textContent = state.selectedFindingId ? (current.title || "Untitled finding") : "New Finding";
    setField(elements.title, current.title);
    setField(elements.domain, current.domain);
    setField(elements.findingType, current.findingType);
    setField(elements.severity, current.severity);
    setField(elements.findingStatus, current.status);
    setField(elements.tags, current.tags.join(", "));
    setField(elements.summaryText, current.summary);
    setField(elements.evidence, current.evidence);
    setField(elements.impact, current.impact);
    setField(elements.recommendation, current.recommendation);
    setField(elements.notes, current.notes);
    state.draftReferences = current.sourceReferences.map((reference) => ({ ...reference }));
    renderSourceReferences();
    renderImportMetadata(current);  }

  function renderSourceReferences() {
    if (!elements.sourceList) return;
    if (!state.draftReferences.length) {
      elements.sourceList.innerHTML = `
        <div class="assessment-source-reference-empty">
          <p>No source references added yet. Add manual references for traceability when evidence is available.</p>
        </div>
      `;
      return;
    }

    elements.sourceList.innerHTML = state.draftReferences.map((reference, index) => `
      <article class="assessment-source-ref-card" data-reference-index="${escapeHtml(String(index))}" data-reference-id="${escapeHtml(reference.id)}">
        <div class="form-grid two-column-form-grid">
          <label class="question-field">
            <span>Source type</span>
            <select data-source-field="sourceType">
              ${Object.entries(SOURCE_TYPES).map(([value, label]) => `<option value="${escapeHtml(value)}" ${reference.sourceType === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label class="question-field">
            <span>Page / route</span>
            <select data-source-field="page">
              ${SOURCE_PAGE_OPTIONS.map(([value, label]) => `<option value="${escapeHtml(value)}" ${reference.page === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label class="question-field">
            <span>Label</span>
            <input type="text" value="${escapeHtml(reference.label)}" data-source-field="label" placeholder="Source label" />
          </label>
          <label class="question-field">
            <span>Source ID</span>
            <input type="text" value="${escapeHtml(reference.sourceId)}" data-source-field="sourceId" placeholder="Optional source ID" />
          </label>
        </div>
        <label class="question-field">
          <span>Note</span>
          <textarea rows="2" data-source-field="note" placeholder="Why this source supports the finding">${escapeHtml(reference.note)}</textarea>
        </label>
        <div class="assessment-source-ref-actions">
          ${reference.page ? `<a class="secondary-link" href="${escapeHtml(reference.page)}">Open source page</a>` : ""}
          <button type="button" class="button secondary danger-action" data-action="remove-source" data-index="${escapeHtml(String(index))}">Remove Source Reference</button>
        </div>
      </article>
    `).join("");
  }

  function renderImportBadges(finding) {
    if (isImportedAssistFinding(finding)) {
      const confidence = finding.confidence ? getLabel(CONFIDENCE_LEVELS, finding.confidence) : "Medium";
      return `
        <span class="staged-badge assessment-ai-assisted-badge">AI-assisted draft</span>
        <span class="staged-badge staged-badge-muted">Confidence: ${escapeHtml(confidence)}</span>
      `;
    }
    if (isImportedCsvFinding(finding)) {
      return `
        <span class="staged-badge assessment-csv-import-badge">CSV import</span>
        ${finding.sourceRowNumber ? `<span class="staged-badge staged-badge-muted">Row ${escapeHtml(String(finding.sourceRowNumber))}</span>` : ""}
      `;
    }
    return "";
  }

  function renderImportMetadata(finding) {
    if (!elements.importMeta) return;
    if (!isImportedAssistFinding(finding) && !isImportedCsvFinding(finding)) {
      elements.importMeta.classList.add("hidden");
      elements.importMeta.innerHTML = "";
      return;
    }
    const warnings = Array.isArray(finding.importWarnings) ? finding.importWarnings : [];
    elements.importMeta.classList.remove("hidden");
    if (isImportedCsvFinding(finding)) {
      elements.importMeta.innerHTML = `
        <div class="assessment-import-meta-badges">
          <span class="staged-badge assessment-csv-import-badge">CSV import</span>
          <span class="staged-badge staged-badge-muted">Imported ${escapeHtml(formatDate(finding.importedAt))}</span>
          ${finding.sourceRowNumber ? `<span class="staged-badge staged-badge-muted">Row ${escapeHtml(String(finding.sourceRowNumber))}</span>` : ""}
        </div>
        <p class="helper-text">This finding was imported from a CSV row and still requires consultant review before it should be treated as report-ready.</p>
        ${finding.sourceFileName ? `<p class="helper-text">Source file: ${escapeHtml(finding.sourceFileName)}${finding.sourceFileSize ? ` (${escapeHtml(formatFileSize(finding.sourceFileSize))})` : ""}</p>` : ""}
        ${warnings.length ? `<details class="assessment-import-warning-details"><summary>${escapeHtml(String(warnings.length))} import warning${warnings.length === 1 ? "" : "s"}</summary><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>` : ""}
      `;
      return;
    }
    const confidence = finding.confidence ? getLabel(CONFIDENCE_LEVELS, finding.confidence) : "Medium";
    elements.importMeta.innerHTML = `
      <div class="assessment-import-meta-badges">
        <span class="staged-badge assessment-ai-assisted-badge">AI-assisted draft</span>
        <span class="staged-badge staged-badge-muted">Confidence: ${escapeHtml(confidence)}</span>
        <span class="staged-badge staged-badge-muted">Imported ${escapeHtml(formatDate(finding.importedAt))}</span>
      </div>
      <p class="helper-text">This finding was imported from an external AI-assisted draft and still requires consultant review.</p>
      ${warnings.length ? `<details class="assessment-import-warning-details"><summary>${escapeHtml(String(warnings.length))} import warning${warnings.length === 1 ? "" : "s"}</summary><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>` : ""}
    `;
  }
  function renderAssistPrompt() {
    if (!elements.assistPrompt) return;
    elements.assistPrompt.value = buildAssessmentAssistPrompt();
  }

  function renderAssistValidation() {
    if (!elements.assistWarnings || !elements.assistPreview) return;
    const validation = state.assistValidation;
    const hasImportableRecords = Boolean(validation && !validation.errors.length && validation.records.length);
    if (elements.assistImport) elements.assistImport.disabled = !hasImportableRecords;
    if (!validation) {
      elements.assistWarnings.innerHTML = "";
      elements.assistPreview.innerHTML = '<p class="helper-text">Validate pasted JSON to preview draft findings before import.</p>';
      return;
    }
    const warnings = [
      ...validation.errors.map((message) => ({ type: "error", message })),
      ...validation.warnings.map((message) => ({ type: "warning", message }))
    ];
    elements.assistWarnings.innerHTML = warnings.length
      ? `<div class="assessment-assist-message-list">${warnings.map((item) => `<p class="${item.type === "error" ? "error" : "warning"}">${escapeHtml(item.message)}</p>`).join("")}</div>`
      : '<p class="helper-text">No validation warnings. Review the preview before importing.</p>';
    if (!validation.records.length) {
      elements.assistPreview.innerHTML = '<p class="helper-text">No draft findings are available to preview.</p>';
      return;
    }
    elements.assistPreview.innerHTML = '<p class="helper-text">These findings will be imported as Draft or Needs Review and require consultant review before use.</p>' + validation.records.map((record, index) => {
      const finding = record.finding;
      const warningsList = record.warnings || [];
      return `
        <article class="assessment-assist-preview-card">
          <div class="assessment-finding-badge-row">
            <span class="staged-badge ${badgeClass(finding.status)}">Import status: ${escapeHtml(getLabel(STATUSES, finding.status))}</span>
            <span class="staged-badge assessment-ai-assisted-badge">AI-assisted draft</span>
            <span class="staged-badge staged-badge-muted">Confidence: ${escapeHtml(getLabel(CONFIDENCE_LEVELS, finding.confidence || "medium"))}</span>
          </div>
          <h4>${escapeHtml(finding.title || `Draft finding ${index + 1}`)}</h4>
          <dl class="assessment-assist-preview-meta">
            <div><dt>Type</dt><dd>${escapeHtml(getLabel(FINDING_TYPES, finding.findingType))}</dd></div>
            <div><dt>Severity</dt><dd>${escapeHtml(getLabel(SEVERITIES, finding.severity))}</dd></div>
            <div><dt>Domain</dt><dd>${escapeHtml(finding.domain || "Not set")}</dd></div>
            <div><dt>Evidence</dt><dd>${escapeHtml(hasText(finding.evidence) ? "Present" : "Missing")}</dd></div>
            <div><dt>Recommendation</dt><dd>${escapeHtml(hasText(finding.recommendation) ? "Present" : "Missing")}</dd></div>
            <div><dt>Source references</dt><dd>${escapeHtml(String(finding.sourceReferences.length))}</dd></div>
            <div><dt>Tags</dt><dd>${escapeHtml(finding.tags.length ? finding.tags.join(", ") : "None")}</dd></div>
          </dl>
          ${finding.summary ? `<p>${escapeHtml(finding.summary)}</p>` : '<p class="helper-text">No summary provided.</p>'}
          ${warningsList.length ? `<ul class="assessment-assist-card-warnings">${warningsList.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
        </article>
      `;
    }).join("");
  }
  function createEmptyCsvImportState() {
    return { rawText: "", sourceMeta: null, parsed: null, mapping: {}, validation: null };
  }

  function renderCsvImport() {
    const csv = state.csvImport || createEmptyCsvImportState();
    if (elements.importCsv) elements.importCsv.disabled = !(csv.validation && !csv.validation.errors.length && csv.validation.records.length);
    renderCsvFileMetadata(csv.sourceMeta);
    renderCsvMessages(csv);
    renderCsvHeaders(csv.parsed);
    renderCsvPreview(csv.parsed);
    renderCsvMapping(csv.parsed, csv.mapping);
    renderCsvImportPreview(csv.validation);
  }

  function renderCsvFileMetadata(meta) {
    if (!elements.csvFileMeta) return;
    elements.csvFileMeta.classList.toggle("hidden", !meta);
    if (!meta) {
      elements.csvFileMeta.innerHTML = "";
      return;
    }
    const rows = [
      ["File", meta.name || "CSV text"],
      ["Type", meta.type || "text/csv"],
      ["Size", formatFileSize(meta.size)],
      ["Last modified", meta.lastModified ? formatDate(meta.lastModified) : "Not available"],
      ["Loaded", meta.loadedAt ? formatDate(meta.loadedAt) : "Now"]
    ];
    elements.csvFileMeta.innerHTML = `<dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || "Not available"))}</dd></div>`).join("")}</dl>`;
  }

  function renderCsvMessages(csv) {
    if (!elements.csvWarnings) return;
    const messages = [];
    if (csv.parsed) {
      messages.push(...csv.parsed.errors.map((message) => ({ type: "error", message })));
      messages.push(...csv.parsed.warnings.map((message) => ({ type: "warning", message })));
    }
    if (csv.validation) {
      messages.push(...csv.validation.errors.map((message) => ({ type: "error", message })));
      messages.push(...csv.validation.warnings.map((message) => ({ type: "warning", message })));
    }
    elements.csvWarnings.innerHTML = messages.length
      ? `<div class="assessment-assist-message-list">${messages.map((item) => `<p class="${item.type === "error" ? "error" : "warning"}">${escapeHtml(item.message)}</p>`).join("")}</div>`
      : '<p class="helper-text">Parse CSV, map columns, and validate rows before importing draft findings.</p>';
  }

  function renderCsvHeaders(parsed) {
    if (!elements.csvHeaders) return;
    if (!parsed || !parsed.headers.length) {
      elements.csvHeaders.innerHTML = "";
      return;
    }
    elements.csvHeaders.innerHTML = parsed.headers.map((header, index) => `<span class="staged-badge staged-badge-muted">${escapeHtml(String(index + 1))}. ${escapeHtml(header.label)}</span>`).join("");
  }

  function renderCsvPreview(parsed) {
    if (!elements.csvPreview) return;
    if (!parsed || !parsed.rows.length) {
      elements.csvPreview.innerHTML = '<p class="helper-text">Parse CSV to preview rows before mapping.</p>';
      return;
    }
    const visibleRows = parsed.rows.slice(0, CSV_PREVIEW_ROW_LIMIT);
    elements.csvPreview.innerHTML = `
      <div class="assessment-csv-table-scroll">
        <table class="assessment-csv-table">
          <thead><tr>${parsed.headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join("")}</tr></thead>
          <tbody>
            ${visibleRows.map((row) => `<tr>${parsed.headers.map((_, index) => `<td>${escapeHtml(row.cells[index] || "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="helper-text">Showing ${escapeHtml(String(visibleRows.length))} of ${escapeHtml(String(parsed.rows.length))} importable row${parsed.rows.length === 1 ? "" : "s"}.</p>
    `;
  }

  function renderCsvMapping(parsed, mapping) {
    if (!elements.csvMapping) return;
    if (!parsed || !parsed.headers.length || parsed.errors.length) {
      elements.csvMapping.innerHTML = '<p class="helper-text">Parse a valid CSV with headers to map columns.</p>';
      return;
    }
    const options = ['<option value="">Do not import</option>']
      .concat(parsed.headers.map((header, index) => `<option value="${escapeHtml(String(index))}">${escapeHtml(header.label)}</option>`))
      .join("");
    elements.csvMapping.innerHTML = CSV_MAPPING_FIELDS.map((field) => `
      <label class="question-field">
        <span>${escapeHtml(field.label)}</span>
        <select data-csv-target="${escapeHtml(field.value)}">
          ${options.replace(`value="${escapeHtml(String(mapping[field.value] ?? ""))}"`, `value="${escapeHtml(String(mapping[field.value] ?? ""))}" selected`)}
        </select>
      </label>
    `).join("");
  }

  function renderCsvImportPreview(validation) {
    if (!elements.csvImportPreview) return;
    if (!validation) {
      elements.csvImportPreview.innerHTML = '<p class="helper-text">Validate mapped rows to preview draft findings before import.</p>';
      return;
    }
    if (!validation.records.length) {
      elements.csvImportPreview.innerHTML = '<p class="helper-text">No draft findings are available to preview.</p>';
      return;
    }
    elements.csvImportPreview.innerHTML = '<p class="helper-text">These CSV rows will be imported as Draft or Needs Review and require consultant review before use.</p>' + validation.records.map((record) => {
      const finding = record.finding;
      const warnings = record.warnings || [];
      return `
        <article class="assessment-assist-preview-card">
          <div class="assessment-finding-badge-row">
            <span class="staged-badge ${badgeClass(finding.status)}">Import status: ${escapeHtml(getLabel(STATUSES, finding.status))}</span>
            <span class="staged-badge assessment-csv-import-badge">CSV import</span>
            <span class="staged-badge staged-badge-muted">Row ${escapeHtml(String(record.rowNumber))}</span>
          </div>
          <h4>${escapeHtml(finding.title || `CSV row ${record.rowNumber}`)}</h4>
          <dl class="assessment-assist-preview-meta">
            <div><dt>Type</dt><dd>${escapeHtml(getLabel(FINDING_TYPES, finding.findingType))}</dd></div>
            <div><dt>Severity</dt><dd>${escapeHtml(getLabel(SEVERITIES, finding.severity))}</dd></div>
            <div><dt>Domain</dt><dd>${escapeHtml(finding.domain || "Not set")}</dd></div>
            <div><dt>Evidence</dt><dd>${escapeHtml(hasText(finding.evidence) ? "Present" : "Missing")}</dd></div>
            <div><dt>Recommendation</dt><dd>${escapeHtml(hasText(finding.recommendation) ? "Present" : "Missing")}</dd></div>
            <div><dt>Source references</dt><dd>${escapeHtml(String(finding.sourceReferences.length))}</dd></div>
          </dl>
          ${finding.summary ? `<p>${escapeHtml(finding.summary)}</p>` : '<p class="helper-text">No summary provided.</p>'}
          ${warnings.length ? `<ul class="assessment-assist-card-warnings">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
        </article>
      `;
    }).join("");
  }

  function handleCsvTextInput() {
    state.csvImport.rawText = elements.csvText ? elements.csvText.value : "";
    state.csvImport.sourceMeta = null;
    state.csvImport.parsed = null;
    state.csvImport.validation = null;
    if (elements.csvFile) elements.csvFile.value = "";
    setCsvStatus("", false);
    renderCsvImport();
  }

  function handleCsvFileLoad(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const validation = validateCsvFile(file);
    if (validation.error) {
      setCsvStatus(validation.error, true);
      event.target.value = "";
      return;
    }
    if (validation.blocked) {
      setCsvStatus(validation.message, true);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const meta = buildCsvFileMetadata(file);
      state.csvImport = { rawText: text, sourceMeta: meta, parsed: null, mapping: {}, validation: null };
      if (elements.csvText) elements.csvText.value = text;
      renderCsvImport();
      const warningText = validation.warnings.length ? ` ${validation.warnings.join(" ")}` : "";
      setCsvStatus(`Loaded ${file.name}. Parse CSV to preview headers and rows.${warningText}`, validation.warnings.length ? "warning" : false);
      event.target.value = "";
    };
    reader.onerror = () => {
      setCsvStatus("The CSV file could not be read. Paste CSV text instead.", true);
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function validateCsvFile(file) {
    const extension = getFileExtension(file.name);
    const warnings = [];
    if (extension !== ".csv") {
      return { error: "CSV Import v0 accepts .csv files only. Paste CSV text or select a .csv file.", warnings };
    }
    if (file.size > CSV_FILE_BLOCK_BYTES) {
      return { blocked: true, message: "This CSV file is too large for this browser-local import. Split it into smaller CSV files before importing.", warnings };
    }
    if (file.size > CSV_FILE_WARN_BYTES) {
      warnings.push("This CSV file is large for browser-local intake. Review performance and local storage limits before importing.");
    }
    return { warnings };
  }

  function buildCsvFileMetadata(file) {
    return {
      name: file.name,
      type: file.type || "text/csv",
      size: file.size,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : "",
      loadedAt: new Date().toISOString()
    };
  }

  function handleParseCsv() {
    const rawText = elements.csvText ? elements.csvText.value : "";
    if (!rawText.trim()) {
      state.csvImport.parsed = { headers: [], rows: [], warnings: [], errors: ["Paste CSV text or load a .csv file before parsing."] };
      state.csvImport.validation = null;
      renderCsvImport();
      setCsvStatus("CSV text is required before parsing.", true);
      return;
    }
    const parsed = parseCsvInput(rawText);
    const mappingResult = parsed.errors.length ? { mapping: {}, warnings: [] } : buildDefaultCsvMapping(parsed.headers);
    parsed.warnings.push(...mappingResult.warnings);
    state.csvImport.rawText = rawText;
    state.csvImport.parsed = parsed;
    state.csvImport.mapping = mappingResult.mapping;
    state.csvImport.validation = null;
    renderCsvImport();
    if (parsed.errors.length) {
      setCsvStatus(`${parsed.errors.length} CSV parse error${parsed.errors.length === 1 ? "" : "s"}. Import is blocked.`, true);
      return;
    }
    setCsvStatus(`Parsed ${parsed.rows.length} importable row${parsed.rows.length === 1 ? "" : "s"}. Map columns and validate before importing.`, parsed.warnings.length ? "warning" : false);
  }

  function clearCsvImport() {
    state.csvImport = createEmptyCsvImportState();
    if (elements.csvText) elements.csvText.value = "";
    if (elements.csvFile) elements.csvFile.value = "";
    renderCsvImport();
    setCsvStatus("CSV import cleared. Saved findings were not changed.", false);
  }

  function handleCsvMappingChange() {
    state.csvImport.mapping = readCsvMappingFromDom();
    state.csvImport.validation = null;
    renderCsvImport();
  }

  function handleValidateCsvRows() {
    if (!state.csvImport.parsed || state.csvImport.parsed.errors.length) {
      setCsvStatus("Parse a valid CSV before validating mapped rows.", true);
      return;
    }
    state.csvImport.mapping = readCsvMappingFromDom();
    state.csvImport.validation = validateCsvMappedRows(state.csvImport.parsed, state.csvImport.mapping, state.csvImport.sourceMeta);
    renderCsvImport();
    if (state.csvImport.validation.errors.length) {
      setCsvStatus(`${state.csvImport.validation.errors.length} CSV validation error${state.csvImport.validation.errors.length === 1 ? "" : "s"}. Import is blocked.`, true);
      return;
    }
    setCsvStatus(`Validated ${state.csvImport.validation.records.length} draft finding${state.csvImport.validation.records.length === 1 ? "" : "s"}.${state.csvImport.validation.warnings.length ? " Review warnings before importing." : ""}`, state.csvImport.validation.warnings.length ? "warning" : false);
  }

  function handleImportCsvFindings() {
    const validation = state.csvImport.validation;
    if (!validation || validation.errors.length || !validation.records.length) {
      setCsvStatus("Validate importable CSV rows before importing draft findings.", true);
      return;
    }
    const now = new Date().toISOString();
    const importBatchId = createId("csv-import");
    const imported = validation.records.map((record) => normalizeFinding({
      ...record.finding,
      id: createId("finding"),
      status: record.finding.status === "needs-review" ? "needs-review" : "draft",
      sourceReferences: record.finding.sourceReferences.map((reference) => ({ ...reference, id: createId("source-ref") })),
      importBatchId,
      importedAt: now,
      importSource: CSV_IMPORT_SOURCE,
      importWarnings: record.warnings || [],
      sourceFileName: state.csvImport.sourceMeta?.name || "",
      sourceFileType: state.csvImport.sourceMeta?.type || "text/csv",
      sourceFileSize: state.csvImport.sourceMeta?.size || 0,
      sourceRowNumber: record.rowNumber,
      createdAt: now,
      updatedAt: now
    })).filter(Boolean);
    if (!imported.length) {
      setCsvStatus("No importable CSV findings were available after validation.", true);
      return;
    }
    state.wrapper.findings = [...imported, ...state.wrapper.findings];
    saveWrapper();
    state.selectedFindingId = imported[0].id;
    state.csvImport = createEmptyCsvImportState();
    if (elements.csvText) elements.csvText.value = "";
    if (elements.csvFile) elements.csvFile.value = "";
    renderWorkspace();
    renderEditor(imported[0]);
    setStatus(`${imported.length} CSV draft finding${imported.length === 1 ? "" : "s"} imported for consultant review.`, false);
    setCsvStatus(`${imported.length} draft finding${imported.length === 1 ? "" : "s"} imported. Review and edit before marking Ready.`, false);
  }

  function parseCsvInput(rawText) {
    const warnings = [];
    const errors = [];
    const text = String(rawText || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    if (!text.trim()) return { headers: [], rows: [], warnings, errors: ["CSV text is empty."] };
    const delimiterWarning = getLikelyDelimiterWarning(text);
    if (delimiterWarning) warnings.push(delimiterWarning);
    let table = [];
    try {
      table = parseCsvRows(text);
    } catch (error) {
      return { headers: [], rows: [], warnings, errors: [error.message] };
    }
    const firstDataIndex = table.findIndex((row) => row.some((cell) => cleanString(cell)));
    if (firstDataIndex < 0) return { headers: [], rows: [], warnings, errors: ["CSV must include a usable header row."] };
    const rawHeaders = table[firstDataIndex];
    if (!rawHeaders.some((header) => cleanString(header))) return { headers: [], rows: [], warnings, errors: ["CSV must include a usable header row."] };
    const headers = rawHeaders.map((header, index) => {
      const label = cleanString(header) || `Column ${index + 1}`;
      if (!cleanString(header)) warnings.push(`Header column ${index + 1} is blank and was labeled ${label}.`);
      return { index, label, normalized: normalizeCsvHeader(label) };
    });
    addDuplicateHeaderWarnings(headers, warnings);
    const rows = [];
    let skippedBlankRows = 0;
    table.slice(firstDataIndex + 1).forEach((cells, offset) => {
      const rowNumber = firstDataIndex + offset + 2;
      if (!cells.some((cell) => cleanString(cell))) {
        skippedBlankRows += 1;
        return;
      }
      const rowWarnings = [];
      if (cells.length < headers.length) rowWarnings.push(`Row ${rowNumber} has fewer columns than the header row; missing cells were treated as blank.`);
      if (cells.length > headers.length) rowWarnings.push(`Row ${rowNumber} has more columns than the header row; extra cells were ignored.`);
      rows.push({ rowNumber, cells, warnings: rowWarnings });
    });
    if (skippedBlankRows) warnings.push(`${skippedBlankRows} blank row${skippedBlankRows === 1 ? "" : "s"} skipped.`);
    if (!rows.length) errors.push("CSV includes headers but no importable data rows.");
    if (rows.length > CSV_MAX_BLOCK_ROWS) errors.push(`This CSV includes ${rows.length} importable rows. Import is blocked above ${CSV_MAX_BLOCK_ROWS}; split large files into smaller groups.`);
    else if (rows.length > CSV_MAX_WARNING_ROWS) warnings.push(`This CSV includes ${rows.length} importable rows. Large batches should be reviewed in smaller groups for quality control.`);
    return { headers, rows, warnings, errors };
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (inQuotes) {
        if (char === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }
      if (char === '"' && field === "") {
        inQuotes = true;
        continue;
      }
      if (char === ",") {
        row.push(field);
        field = "";
        continue;
      }
      if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
      }
      field += char;
    }
    if (inQuotes) throw new Error("CSV has an unterminated quoted field. Fix the CSV and parse again.");
    row.push(field);
    rows.push(row);
    return rows;
  }

  function getLikelyDelimiterWarning(text) {
    const sample = text.split("\n").slice(0, 10).join("\n");
    const commaCount = (sample.match(/,/g) || []).length;
    const semicolonCount = (sample.match(/;/g) || []).length;
    if (semicolonCount >= 4 && semicolonCount > commaCount * 2) return "This file looks semicolon-delimited. CSV Intake v0 supports comma-delimited files only.";
    return "";
  }

  function addDuplicateHeaderWarnings(headers, warnings) {
    const seen = new Map();
    headers.forEach((header) => {
      if (!header.normalized) return;
      const count = seen.get(header.normalized) || 0;
      seen.set(header.normalized, count + 1);
    });
    seen.forEach((count, key) => {
      if (count > 1) warnings.push(`Duplicate CSV header detected: ${key}. Choose the intended column manually.`);
    });
  }

  function buildDefaultCsvMapping(headers) {
    const warnings = [];
    const mapping = {};
    const headerMatches = new Map();
    CSV_MAPPING_FIELDS.forEach((field) => {
      const aliases = field.aliases.map(normalizeCsvHeader);
      const matches = headers.filter((header) => aliases.includes(header.normalized));
      if (matches.length === 1) {
        mapping[field.value] = String(matches[0].index);
        const users = headerMatches.get(matches[0].index) || [];
        users.push(field.value);
        headerMatches.set(matches[0].index, users);
      } else if (matches.length > 1) {
        warnings.push(`Multiple CSV headers match ${field.label}; choose the intended column manually.`);
      }
    });
    headerMatches.forEach((fields, headerIndex) => {
      if (fields.length > 1) {
        fields.forEach((field) => { mapping[field] = ""; });
        warnings.push(`Header "${headers[headerIndex].label}" matched multiple fields; those mappings were left blank for manual review.`);
      }
    });
    return { mapping, warnings };
  }

  function readCsvMappingFromDom() {
    const mapping = {};
    if (!elements.csvMapping) return mapping;
    elements.csvMapping.querySelectorAll("[data-csv-target]").forEach((select) => {
      mapping[select.getAttribute("data-csv-target") || ""] = select.value;
    });
    return mapping;
  }

  function validateCsvMappedRows(parsed, mapping, sourceMeta) {
    const errors = [];
    const warnings = [];
    const records = [];
    if (!parsed || parsed.errors.length) return { errors: ["Parse a valid CSV before validating mapped rows."], warnings, records };
    const mappedFields = Object.entries(mapping || {}).filter(([, value]) => value !== "" && value !== undefined && value !== null);
    if (!mappedFields.length) return { errors: ["Map at least one CSV column before validating rows."], warnings, records };
    const batchMaps = createCsvDuplicateMaps();
    parsed.rows.forEach((row) => {
      const record = normalizeCsvRowToFinding(row, mapping, sourceMeta, batchMaps);
      records.push(record);
      registerCsvDuplicate(record.finding, batchMaps);
    });
    if (!records.length) errors.push("No importable CSV rows were found.");
    return { errors, warnings, records };
  }

  function normalizeCsvRowToFinding(row, mapping, sourceMeta, batchMaps) {
    const warnings = [...(row.warnings || [])];
    const raw = {};
    CSV_MAPPING_FIELDS.forEach((field) => {
      raw[field.value] = getCsvMappedCell(row, mapping[field.value]);
      if (raw[field.value] && isFormulaLikeValue(raw[field.value])) warnings.push(`Row ${row.rowNumber} ${field.label}: Formula-like value preserved as plain text; review before downstream export.`);
    });
    const generatedTitle = !cleanString(raw.title);
    const title = generatedTitle ? `Untitled CSV finding - row ${row.rowNumber}` : cleanString(raw.title);
    if (generatedTitle) warnings.push(`Row ${row.rowNumber} is missing a title; imported as "${title}" and forced to Draft.`);
    const summary = cleanString(raw.summary);
    const evidence = cleanString(raw.evidence);
    const recommendation = cleanString(raw.recommendation);
    if (!summary) warnings.push(`${title} is missing a summary and will be forced to Draft.`);
    if (!evidence) warnings.push(`${title} is missing evidence.`);
    if (!recommendation) warnings.push(`${title} is missing a recommendation.`);
    const typeResult = normalizeCsvEnum(FINDING_TYPES, raw.findingType, "finding", { issue: "finding", observation: "finding", weakness: "gap", risk: "risk", opportunity: "opportunity", recommendation: "recommendation" }, "finding type");
    const severityResult = normalizeCsvEnum(SEVERITIES, raw.severity, "medium", { severe: "high", urgent: "critical", blocker: "critical", p1: "critical", p2: "high", p3: "medium", p4: "low" }, "severity");
    if (typeResult.warning) warnings.push(`Row ${row.rowNumber}: ${typeResult.warning}`);
    if (severityResult.warning) warnings.push(`Row ${row.rowNumber}: ${severityResult.warning}`);
    const statusResult = normalizeCsvStatus(raw.status, row.rowNumber);
    if (statusResult.warning) warnings.push(statusResult.warning);
    const highCriticalWithoutRecommendation = (severityResult.value === "high" || severityResult.value === "critical") && !recommendation;
    if (highCriticalWithoutRecommendation) warnings.push(`${title} is high/critical and lacks a recommendation; it will be forced to Draft.`);
    const sourceReferences = buildCsvSourceReferences(raw, row.rowNumber, warnings);
    const tags = splitCsvTags(raw.tags, row.rowNumber, warnings);
    warnForLongCsvFields({ title, summary, evidence, impact: raw.impact, recommendation, notes: raw.notes }, row.rowNumber, warnings);
    warnings.push(...getCsvDuplicateWarnings({ title, summary, domain: raw.domain, findingType: typeResult.value }, batchMaps));
    const seriousDefault = generatedTitle || !summary || typeResult.defaulted || severityResult.defaulted || statusResult.forceDraft || highCriticalWithoutRecommendation;
    const status = !seriousDefault && summary && (evidence || recommendation) ? "needs-review" : "draft";
    return {
      rowNumber: row.rowNumber,
      warnings,
      finding: {
        id: "",
        title,
        findingType: typeResult.value,
        severity: severityResult.value,
        status,
        domain: cleanString(raw.domain),
        summary,
        evidence,
        impact: cleanString(raw.impact),
        recommendation,
        sourceReferences,
        tags,
        notes: cleanString(raw.notes),
        importWarnings: warnings,
        importSource: CSV_IMPORT_SOURCE,
        createdAt: "",
        updatedAt: ""
      },
      sourceMeta
    };
  }

  function getCsvMappedCell(row, selectedIndex) {
    if (selectedIndex === "" || selectedIndex === undefined || selectedIndex === null) return "";
    const index = Number(selectedIndex);
    if (!Number.isInteger(index) || index < 0) return "";
    return cleanString(row.cells[index]);
  }

  function normalizeCsvEnum(labels, value, fallback, aliases, label) {
    const raw = cleanString(value);
    if (!raw) return { value: fallback, warning: "", defaulted: false };
    const key = normalizeEnumKey(raw);
    if (Object.prototype.hasOwnProperty.call(labels, key)) return { value: key, warning: "", defaulted: false };
    if (aliases && aliases[key]) return { value: aliases[key], warning: `Value "${raw}" normalized to ${aliases[key]} for ${label}.`, defaulted: false };
    return { value: fallback, warning: `Unsupported ${label} "${raw}" defaulted to ${fallback}.`, defaulted: true };
  }

  function normalizeCsvStatus(value, rowNumber) {
    const raw = cleanString(value);
    if (!raw) return { warning: "", forceDraft: false };
    const key = normalizeEnumKey(raw);
    if (key === "draft") return { warning: "", forceDraft: true };
    if (key === "needs-review" || key === "needsreview") return { warning: "", forceDraft: false };
    return { warning: `Row ${rowNumber}: CSV status "${raw}" was downgraded; imported status is Draft or Needs Review only.`, forceDraft: true };
  }

  function buildCsvSourceReferences(raw, rowNumber, warnings) {
    const label = cleanString(raw.sourceLabel);
    const note = cleanString(raw.sourceNote);
    if (!label && !note) return [];
    if (label.length > 240 || note.length > 2000) warnings.push(`Row ${rowNumber}: source reference text is long; review the manual source reference after import.`);
    return [{ id: "", sourceType: "manual-note", label: label || `CSV row ${rowNumber}`, page: "", sourceId: "", note }];
  }

  function splitCsvTags(value, rowNumber, warnings) {
    const tags = String(value || "").split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
    if (tags.length > 20) warnings.push(`Row ${rowNumber}: more than 20 tags were supplied; review tag quality after import.`);
    return tags;
  }

  function warnForLongCsvFields(fields, rowNumber, warnings) {
    if (fields.title.length > 180) warnings.push(`Row ${rowNumber}: title is long; consider shortening it after import.`);
    ["summary", "evidence", "impact", "recommendation", "notes"].forEach((field) => {
      if (String(fields[field] || "").length > 5000) warnings.push(`Row ${rowNumber}: ${field} is long and may be hard to review in the browser-local editor.`);
    });
  }

  function createCsvDuplicateMaps() {
    return { title: new Map(), summary: new Map(), titleDomain: new Map(), titleType: new Map() };
  }

  function getCsvDuplicateWarnings(finding, batchMaps) {
    const warnings = [];
    const title = normalizeTitleForDuplicate(finding.title);
    const summary = normalizeSummaryForDuplicate(finding.summary);
    const domain = normalizeTitleForDuplicate(finding.domain);
    const type = normalizeTitleForDuplicate(finding.findingType);
    if (title) {
      if (state.wrapper.findings.some((existing) => normalizeTitleForDuplicate(existing.title) === title)) warnings.push("Possible duplicate: existing finding has the same title.");
      if (batchMaps.title.has(title)) warnings.push("Possible duplicate within this import batch: same title.");
      const titleDomain = `${title}::${domain}`;
      if (domain && state.wrapper.findings.some((existing) => normalizeTitleForDuplicate(existing.title) === title && normalizeTitleForDuplicate(existing.domain) === domain)) warnings.push("Possible duplicate: existing finding has the same title and domain.");
      if (domain && batchMaps.titleDomain.has(titleDomain)) warnings.push("Possible duplicate within this import batch: same title and domain.");
      const titleType = `${title}::${type}`;
      if (type && state.wrapper.findings.some((existing) => normalizeTitleForDuplicate(existing.title) === title && normalizeTitleForDuplicate(existing.findingType) === type)) warnings.push("Possible duplicate: existing finding has the same title and type.");
      if (type && batchMaps.titleType.has(titleType)) warnings.push("Possible duplicate within this import batch: same title and type.");
    }
    if (summary) {
      if (state.wrapper.findings.some((existing) => normalizeSummaryForDuplicate(existing.summary) === summary)) warnings.push("Possible duplicate: existing finding has the same summary.");
      if (batchMaps.summary.has(summary)) warnings.push("Possible duplicate within this import batch: same summary.");
    }
    return warnings;
  }

  function registerCsvDuplicate(finding, batchMaps) {
    const title = normalizeTitleForDuplicate(finding.title);
    const summary = normalizeSummaryForDuplicate(finding.summary);
    const domain = normalizeTitleForDuplicate(finding.domain);
    const type = normalizeTitleForDuplicate(finding.findingType);
    if (title) batchMaps.title.set(title, true);
    if (summary) batchMaps.summary.set(summary, true);
    if (title && domain) batchMaps.titleDomain.set(`${title}::${domain}`, true);
    if (title && type) batchMaps.titleType.set(`${title}::${type}`, true);
  }

  function isFormulaLikeValue(value) {
    return /^[\s]*[=+\-@]/.test(String(value || ""));
  }

  function normalizeCsvHeader(value) {
    return String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]+/g, "").trim().replace(/\s+/g, " ");
  }

  function normalizeEnumKey(value) {
    return String(value || "").toLowerCase().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function getFileExtension(name) {
    const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  }

  function formatFileSize(value) {
    const size = Number(value) || 0;
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} bytes`;
  }

  function setCsvStatus(message, status) {
    if (!elements.csvStatus) return;
    elements.csvStatus.textContent = message || "";
    elements.csvStatus.classList.toggle("warning", status === "warning");
    elements.csvStatus.classList.toggle("error", status === true || status === "error");
  }
  async function handleCopyAssistPrompt() {
    renderAssistPrompt();
    const prompt = elements.assistPrompt ? elements.assistPrompt.value.trim() : "";
    if (!prompt) {
      setAssistStatus("Assessment Findings prompt is not available.", true);
      return;
    }
    try {
      await copyTextToClipboard(prompt);
      setAssistStatus("Assessment Findings prompt copied. Run it outside the app with the source material you choose.", false);
    } catch (error) {
      if (elements.assistPrompt) {
        elements.assistPrompt.focus();
        elements.assistPrompt.select();
      }
      setAssistStatus("Clipboard access was blocked. Prompt selected for manual copy.", "warning");
    }
  }

  function handleInsertAssistSampleJson() {
    if (!elements.assistJson) return;
    elements.assistJson.value = buildAssistSampleJson();
    state.assistValidation = null;
    renderAssistValidation();
    setAssistStatus("Sample JSON inserted. Validate it before importing draft findings.", false);
    elements.assistJson.focus();
  }
  function handleAssistJsonInput() {
    state.assistValidation = null;
    renderAssistValidation();
    setAssistStatus("", false);
  }

  function handleValidateAssistOutput() {
    const raw = elements.assistJson ? elements.assistJson.value.trim() : "";
    if (!raw) {
      state.assistValidation = null;
      renderAssistValidation();
      setAssistStatus("Paste JSON output before validating.", true);
      return;
    }
    let parsed = null;
    try {
      parsed = parseAssistJsonObject(raw);
    } catch (error) {
      state.assistValidation = { errors: [`Invalid JSON: ${error.message}`], warnings: [], records: [] };
      renderAssistValidation();
      setAssistStatus("Invalid JSON. Fix the pasted output and validate again.", true);
      return;
    }
    state.assistValidation = validateAssistResponse(parsed);
    renderAssistValidation();
    if (state.assistValidation.errors.length) {
      setAssistStatus(`${state.assistValidation.errors.length} validation error${state.assistValidation.errors.length === 1 ? "" : "s"}. Import is blocked.`, true);
      return;
    }
    setAssistStatus(
      `Validated ${state.assistValidation.records.length} draft finding${state.assistValidation.records.length === 1 ? "" : "s"}.${state.assistValidation.warnings.length ? " Review warnings before importing." : ""}`,
      state.assistValidation.warnings.length ? "warning" : false
    );
  }

  function handleImportAssistFindings() {
    const validation = state.assistValidation;
    if (!validation || validation.errors.length || !validation.records.length) {
      setAssistStatus("Validate importable JSON before importing draft findings.", true);
      return;
    }
    const now = new Date().toISOString();
    const importBatchId = createId("assist-import");
    const imported = validation.records.map((record) => normalizeFinding({
      ...record.finding,
      id: createId("finding"),
      status: record.finding.status === "needs-review" ? "needs-review" : "draft",
      sourceReferences: record.finding.sourceReferences.map((reference) => ({ ...reference, id: createId("source-ref") })),
      importBatchId,
      importedAt: now,
      importSource: ASSIST_IMPORT_SOURCE,
      importWarnings: record.warnings || [],
      confidence: normalizeConfidence(record.finding.confidence) || "medium",
      assistPromptVersion: ASSIST_PROMPT_VERSION,
      createdAt: now,
      updatedAt: now
    })).filter(Boolean);
    if (!imported.length) {
      setAssistStatus("No importable findings were available after validation.", true);
      return;
    }
    state.wrapper.findings = [...imported, ...state.wrapper.findings];
    saveWrapper();
    state.selectedFindingId = imported[0].id;
    state.assistValidation = null;
    if (elements.assistJson) elements.assistJson.value = "";
    renderWorkspace();
    renderEditor(imported[0]);
    setStatus(`${imported.length} AI-assisted draft finding${imported.length === 1 ? "" : "s"} imported for consultant review.`, false);
    setAssistStatus(`${imported.length} draft finding${imported.length === 1 ? "" : "s"} imported. Review and edit before marking Ready.`, false);
  }
  function validateAssistResponse(response) {
    const errors = [];
    const warnings = [];
    const records = [];
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return { errors: ["Top-level JSON must be an object."], warnings, records };
    }
    if (response.schemaVersion !== ASSIST_SUPPORTED_SCHEMA_VERSION) warnings.push(`schemaVersion is ${response.schemaVersion === undefined ? "missing" : `unsupported (${response.schemaVersion})`}; findings were checked against schemaVersion ${ASSIST_SUPPORTED_SCHEMA_VERSION}.`);
    if (!response.assistType) warnings.push("assistType is missing; expected assessment-findings.");
    if (response.assistType && response.assistType !== "assessment-findings") errors.push(`assistType "${response.assistType}" is not supported for Assessment Findings import.`);
    if (!Array.isArray(response.findings)) {
      return { errors: ["Top-level JSON must include a findings array."], warnings, records };
    }
    if (!response.findings.length) {
      const limitationText = Array.isArray(response.limitations) && response.limitations.length
        ? ` Limitations: ${response.limitations.map((item) => String(item || "").trim()).filter(Boolean).join("; ")}`
        : "";
      return { errors: [`The findings array is empty. Nothing can be imported.${limitationText}`], warnings, records };
    }
    if (response.findings.length > ASSIST_MAX_BLOCK_COUNT) {
      return { errors: [`This batch includes ${response.findings.length} findings. Import is blocked above ${ASSIST_MAX_BLOCK_COUNT}; split large batches into smaller groups for quality control.`], warnings, records };
    }
    if (response.findings.length > ASSIST_MAX_WARNING_COUNT) {
      warnings.push(`This batch includes ${response.findings.length} findings. Large batches should be reviewed in smaller groups for quality control.`);
    }
    if (Array.isArray(response.limitations)) {
      response.limitations.map((item) => String(item || "").trim()).filter(Boolean).forEach((item) => warnings.push(`AI limitation: ${item}`));
    }
    const batchTitleDomains = new Map();
    response.findings.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        warnings.push(`Finding ${index + 1} was skipped because it is not an object.`);
        return;
      }
      const record = normalizeAssistFindingItem(item, index);
      record.warnings.push(...getDuplicateWarnings(record.finding, batchTitleDomains));
      record.finding.importWarnings = [...record.warnings];
      const batchKey = getDuplicateKey(record.finding);
      if (batchKey) batchTitleDomains.set(batchKey, true);
      const batchSummaryKey = getDuplicateSummaryKey(record.finding);
      if (batchSummaryKey) batchTitleDomains.set(`summary::${batchSummaryKey}`, true);
      records.push(record);
    });
    if (!records.length) errors.push("No importable finding objects were found.");
    return { errors, warnings, records };
  }

  function normalizeAssistFindingItem(item, index) {
    const warnings = [];
    const title = cleanString(item.title);
    const summary = cleanString(item.summary);
    const evidence = cleanString(item.evidence);
    const recommendation = cleanString(item.recommendation);
    const typeResult = normalizeAssistEnum(FINDING_TYPES, item.findingType, "finding", { issue: "finding", observation: "finding", weakness: "gap", risk: "risk", opportunity: "opportunity", recommendation: "recommendation" });
    const severityResult = normalizeAssistEnum(SEVERITIES, item.severity, "medium", { severe: "high", urgent: "critical", blocker: "critical" });
    const confidenceResult = normalizeAssistEnum(CONFIDENCE_LEVELS, item.confidence, "medium", { certain: "high", moderate: "medium", uncertain: "low", weak: "low" });
    if (!title) warnings.push(`Finding ${index + 1} is missing a title; imported as Untitled imported finding and forced to Draft.`);
    if (!summary) warnings.push(`${title || `Finding ${index + 1}`} is missing a summary and will be forced to Draft.`);
    if (!evidence) warnings.push(`${title || `Finding ${index + 1}`} is missing evidence.`);
    if (!recommendation) warnings.push(`${title || `Finding ${index + 1}`} is missing a recommendation.`);
    if (typeResult.warning) warnings.push(typeResult.warning);
    if (severityResult.warning) warnings.push(severityResult.warning);
    if (confidenceResult.warning) warnings.push(confidenceResult.warning);
    if (item.status) warnings.push(`AI-provided status "${cleanString(item.status)}" was ignored; imported status is Draft or Needs Review only.`);
    if ((severityResult.value === "high" || severityResult.value === "critical") && !recommendation) warnings.push(`${title || `Finding ${index + 1}`} is high/critical and lacks a recommendation; it will be forced to Draft.`);
    const sourceReferences = normalizeAssistSourceReferences(item.sourceReferences, warnings, title || `Finding ${index + 1}`);
    if (!sourceReferences.length) warnings.push(`${title || `Finding ${index + 1}`} has no source references.`);
    const tags = normalizeAssistTags(item.tags, warnings, title || `Finding ${index + 1}`);
    const notes = [cleanString(item.notes), cleanString(item.reviewNotes) ? `AI review notes: ${cleanString(item.reviewNotes)}` : ""].filter(Boolean).join("\n\n");
    const status = getAssistImportStatus({ title, summary, evidence, recommendation, sourceReferences, severity: severityResult.value });
    return { warnings, finding: { id: "", title: title || "Untitled imported finding", findingType: typeResult.value, severity: severityResult.value, status, domain: cleanString(item.domain), summary, evidence, impact: cleanString(item.impact), recommendation, sourceReferences, tags, notes, importWarnings: warnings, confidence: confidenceResult.value, importSource: ASSIST_IMPORT_SOURCE, assistPromptVersion: ASSIST_PROMPT_VERSION, createdAt: "", updatedAt: "" } };
  }
  function normalizeAssistSourceReferences(value, warnings, findingTitle) {
    if (value === undefined || value === null) {
      warnings.push(`${findingTitle} is missing sourceReferences; manual traceability should be reviewed.`);
      return [];
    }
    if (!Array.isArray(value)) {
      warnings.push(`${findingTitle} sourceReferences must be an array; source references were ignored.`);
      return [];
    }
    const references = [];
    value.forEach((reference, index) => {
      if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
        warnings.push(`${findingTitle} source reference ${index + 1} is malformed and was ignored.`);
        return;
      }
      const sourceTypeResult = normalizeAssistEnum(SOURCE_TYPES, reference.sourceType, "manual-note", { intake: "project-intake", project: "project-intake", client: "client-source-intake", "client-source": "client-source-intake", "public-info": "public-research", research: "public-research", requirements: "requirements-review", plan: "project-plan", manual: "manual-note" });
      if (sourceTypeResult.warning) warnings.push(`${findingTitle} source reference ${index + 1}: ${sourceTypeResult.warning}`);
      const sourceType = sourceTypeResult.value;
      const normalized = { id: "", sourceType, label: cleanString(reference.label || reference.sourceLabel || reference.title), page: normalizeSourcePage(reference.page || defaultPageForSourceType(sourceType)), sourceId: cleanString(reference.sourceId || reference.id), note: cleanString(reference.note || reference.evidence || reference.description) };
      if (normalized.label || normalized.note || normalized.sourceId || normalized.page) references.push(normalized);
      else warnings.push(`${findingTitle} source reference ${index + 1} had no label, note, source ID, or route and was ignored.`);
    });
    return references;
  }
  function normalizeAssistEnum(labels, value, fallback, aliases) {
    const raw = cleanString(value);
    if (!raw) return { value: fallback, warning: "" };
    const key = raw.toLowerCase().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (Object.prototype.hasOwnProperty.call(labels, key)) return { value: key, warning: "" };
    if (aliases && aliases[key]) return { value: aliases[key], warning: `Value "${raw}" normalized to ${aliases[key]}.` };
    return { value: fallback, warning: `Unsupported value "${raw}" normalized to ${fallback}.` };
  }

  function getDuplicateWarnings(finding, batchTitleDomains) {
    const warnings = [];
    const normalizedTitle = normalizeTitleForDuplicate(finding.title);
    if (!normalizedTitle) return warnings;
    const normalizedDomain = normalizeTitleForDuplicate(finding.domain);
    const existingTitleMatches = state.wrapper.findings.filter((existing) => normalizeTitleForDuplicate(existing.title) === normalizedTitle);
    const exactDomainMatch = normalizedDomain && existingTitleMatches.some((existing) => normalizeTitleForDuplicate(existing.domain) === normalizedDomain);
    if (exactDomainMatch) warnings.push("Possible duplicate: existing finding has the same title and domain.");
    else if (existingTitleMatches.length) warnings.push("Possible duplicate: existing finding has the same title.");
    const normalizedSummary = normalizeSummaryForDuplicate(finding.summary);
    const existingSummaryMatches = normalizedSummary
      ? state.wrapper.findings.filter((existing) => normalizeSummaryForDuplicate(existing.summary) === normalizedSummary)
      : [];
    if (existingSummaryMatches.length) warnings.push("Possible duplicate: existing finding has the same summary.");
    const batchKey = getDuplicateKey(finding);
    if (batchKey && batchTitleDomains.has(batchKey)) warnings.push("Possible duplicate within this import batch.");
    const batchSummaryKey = getDuplicateSummaryKey(finding);
    if (batchSummaryKey && batchTitleDomains.has(`summary::${batchSummaryKey}`)) warnings.push("Possible duplicate within this import batch: same summary.");
    return warnings;
  }
  function getDuplicateKey(finding) {
    const title = normalizeTitleForDuplicate(finding.title);
    if (!title) return "";
    const domain = normalizeTitleForDuplicate(finding.domain);
    return `${title}::${domain}`;
  }

  function normalizeTitleForDuplicate(value) {
    return String(value || "").toLowerCase().replace(/^\s*\d+(?:\.\d+)*[.)-]?\s*/, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }


  function getDuplicateSummaryKey(finding) {
    return normalizeSummaryForDuplicate(finding.summary);
  }

  function normalizeSummaryForDuplicate(value) {
    const summary = normalizeTitleForDuplicate(value);
    return summary.length >= 40 ? summary : "";
  }

  function getAssistImportStatus(details) {
    if (!details.title || !details.summary) return "draft";
    if ((details.severity === "high" || details.severity === "critical") && !details.recommendation) return "draft";
    if (!details.evidence && !details.recommendation && (!Array.isArray(details.sourceReferences) || !details.sourceReferences.length)) return "draft";
    return "needs-review";
  }

  function normalizeAssistTags(value, warnings, findingTitle) {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    if (typeof value === "string") {
      warnings.push(`${findingTitle} tags were supplied as a string and split on commas.`);
      return splitTags(value);
    }
    warnings.push(`${findingTitle} tags were malformed and ignored.`);
    return [];
  }

  function parseAssistJsonObject(rawResponse) {
    const cleaned = normalizeJsonResponseText(rawResponse);
    if (!cleaned) throw new Error("Paste a JSON object before validating.");
    try {
      return JSON.parse(cleaned);
    } catch (directError) {
      const jsonText = extractSingleJsonObject(cleaned);
      if (!jsonText) throw new Error(`${directError.message}. The response must contain one complete JSON object.`);
      try {
        return JSON.parse(jsonText);
      } catch (error) {
        throw new Error(`${error.message}. The response must contain valid JSON.`);
      }
    }
  }

  function normalizeJsonResponseText(value) {
    return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }

  function extractSingleJsonObject(text) {
    const start = text.indexOf("{");
    if (start < 0) return "";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) return text.slice(start, index + 1).trim();
      }
    }
    return "";
  }
  function buildAssistSampleJson() {
    const context = getAssistWorkspaceContext();
    return JSON.stringify({
      schemaVersion: ASSIST_SUPPORTED_SCHEMA_VERSION,
      assistType: "assessment-findings",
      workspaceContext: {
        projectName: context.projectName,
        deliverableType: "Assessment Report"
      },
      findings: [
        {
          title: "Source materials identify manual handoffs in the current process",
          findingType: "gap",
          severity: "medium",
          domain: "Operations",
          summary: "Reviewed source material indicates that staff rely on manual handoffs between intake, review, and reporting steps.",
          evidence: "Client notes describe handoffs between teams and spreadsheet-based status tracking.",
          impact: "Manual handoffs can slow response times and create inconsistent visibility into project status.",
          recommendation: "Confirm the handoff points with stakeholders and identify where workflow tracking should be standardized.",
          sourceReferences: [
            {
              sourceType: "manual-note",
              label: "Sample client notes",
              note: "Use a real source label before importing production findings."
            }
          ],
          tags: ["workflow", "sample"],
          notes: "Sample complete finding for validation testing.",
          confidence: "medium",
          reviewNotes: "Replace sample evidence with real source notes before marking Ready."
        },
        {
          title: "Reporting ownership may need follow-up",
          findingType: "finding",
          severity: "low",
          domain: "Reporting",
          summary: "The available material suggests reporting ownership may not be fully documented.",
          evidence: "",
          impact: "Unclear ownership can delay report production or review cycles.",
          recommendation: "",
          sourceReferences: [],
          tags: "reporting, follow-up",
          notes: "Sample lower-confidence finding with missing evidence and recommendation.",
          confidence: "low",
          reviewNotes: "Evidence is intentionally incomplete for validation testing."
        }
      ],
      limitations: ["This sample is for workflow testing only and should be replaced with real source material."]
    }, null, 2);
  }
  function buildAssessmentAssistPrompt() {
    const context = getAssistWorkspaceContext();
    return `You are helping prepare draft assessment findings for a public-sector procurement / justice technology consulting workbench.

Task:
Review the source material I provide and return structured draft assessment findings as JSON.

Project context:
- Workspace/project: ${context.projectName}
- Procurement type: ${context.procurementType}
- Justice domain: ${context.justiceDomain}
- System type: ${context.systemType}
- Client type: ${context.clientType}
- Deliverable type: Assessment Report

Rules:
- Do not invent facts.
- Base each finding on the provided source material.
- Include evidence or source notes wherever possible.
- If evidence is weak, incomplete, or inferred, set confidence to "low" and explain the concern in reviewNotes.
- Do not create final report prose.
- Do not make procurement, legal, or policy conclusions beyond the evidence provided.
- Do not mark any finding as final, accepted, or ready.
- All findings are drafts requiring consultant review.
- Return JSON only. Do not include commentary outside the JSON.

Use this exact JSON shape:
{
  "schemaVersion": 1,
  "assistType": "assessment-findings",
  "workspaceContext": {
    "projectName": "${escapePromptJson(context.projectName)}",
    "deliverableType": "Assessment Report"
  },
  "findings": [
    {
      "title": "",
      "findingType": "finding",
      "severity": "medium",
      "domain": "",
      "summary": "",
      "evidence": "",
      "impact": "",
      "recommendation": "",
      "sourceReferences": [
        {
          "sourceType": "manual-note",
          "label": "",
          "note": ""
        }
      ],
      "tags": [],
      "notes": "",
      "confidence": "medium",
      "reviewNotes": ""
    }
  ],
  "limitations": []
}

Allowed findingType values:
finding, gap, risk, opportunity, recommendation

Allowed severity values:
low, medium, high, critical

Allowed confidence values:
high, medium, low

For each finding:
- title should be concise
- summary should describe the finding
- evidence should cite or summarize the source basis
- impact should explain why it matters
- recommendation should suggest a practical next step, if supported
- sourceReferences should identify the source material in plain language
- reviewNotes should flag uncertainty, missing evidence, or consultant follow-up needed

If there is not enough evidence to create a finding, return an empty findings array and explain the limitation in limitations.

Paste source material below this line before asking for the JSON response:
`;
  }

  function getAssistWorkspaceContext() {
    const answers = state.workspace ? readJson(scopedKey(state.workspace.id, "answers"), {}) : {};
    return {
      projectName: formatAssistContextValue(answers.project_name || state.workspace?.name || "Untitled Workspace"),
      procurementType: formatAssistContextValue(answers.procurement_type),
      justiceDomain: formatAssistContextValue(answers.justice_domain),
      systemType: formatAssistContextValue(answers.system_type),
      clientType: formatAssistContextValue(answers.client_type)
    };
  }

  function formatAssistContextValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "Not set";
    return cleanString(value) || "Not set";
  }

  function defaultPageForSourceType(sourceType) {
    const pages = {
      "project-intake": "interview.html",
      "client-source-intake": "client-source-intake.html",
      "public-research": "public-information-ai-assist.html",
      "requirements-review": "preview.html",
      "project-plan": "project-plan.html",
      "manual-note": ""
    };
    return pages[sourceType] || "";
  }

  function isImportedAssistFinding(finding) {
    return finding && finding.importSource === ASSIST_IMPORT_SOURCE;
  }

  function isImportedCsvFinding(finding) {
    return finding && finding.importSource === CSV_IMPORT_SOURCE;
  }

  function normalizeConfidence(value) {
    return normalizeKey(CONFIDENCE_LEVELS, value, "");
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function escapePromptJson(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error("Clipboard unavailable.");
  }

  function setAssistStatus(message, status) {
    if (!elements.assistStatus) return;
    elements.assistStatus.textContent = message || "";
    elements.assistStatus.classList.toggle("warning", status === "warning");
    elements.assistStatus.classList.toggle("error", status === true || status === "error");
  }
  function handleListAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id") || "";
    if (action === "new") startNewFinding();
    if (action === "edit") editFinding(id);
    if (action === "duplicate") duplicateFinding(id);
    if (action === "delete") deleteFinding(id);
  }

  function handleFilterChange() {
    state.filters.search = elements.search ? elements.search.value.trim().toLowerCase() : "";
    state.filters.findingType = elements.typeFilter ? elements.typeFilter.value : "";
    state.filters.status = elements.statusFilter ? elements.statusFilter.value : "";
    state.filters.severity = elements.severityFilter ? elements.severityFilter.value : "";
    renderFindingsList();
  }

  function resetFilters() {
    state.filters.search = "";
    state.filters.findingType = "";
    state.filters.status = "";
    state.filters.severity = "";
    if (elements.search) elements.search.value = "";
    if (elements.typeFilter) elements.typeFilter.value = "";
    if (elements.statusFilter) elements.statusFilter.value = "";
    if (elements.severityFilter) elements.severityFilter.value = "";
    renderFindingsList();
    setStatus("Finding filters reset. Editor content was not changed.", false);
  }

  function startNewFinding() {
    state.selectedFindingId = "";
    renderFindingsList();
    renderEditor(createEmptyFinding());
    setStatus("Ready to capture a new assessment finding.", false);
  }

  function resetEditor() {
    if (state.selectedFindingId) {
      const finding = findById(state.selectedFindingId);
      renderEditor(finding || createEmptyFinding());
      setStatus("Editor reset to the saved finding values.", false);
      return;
    }
    startNewFinding();
  }

  function editFinding(id) {
    const finding = findById(id);
    if (!finding) return;
    state.selectedFindingId = id;
    renderFindingsList();
    renderEditor(finding);
    setStatus("Finding opened for editing.", false);
  }

  function duplicateFinding(id) {
    const finding = findById(id);
    if (!finding) return;
    const now = new Date().toISOString();
    const duplicate = normalizeFinding({
      ...finding,
      id: createId("finding"),
      title: `${finding.title || "Untitled finding"} Copy`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      sourceReferences: finding.sourceReferences.map((reference) => ({ ...reference, id: createId("source-ref") }))
    });
    state.wrapper.findings.unshift(duplicate);
    saveWrapper();
    state.selectedFindingId = duplicate.id;
    renderWorkspace();
    renderEditor(duplicate);
    setStatus("Finding duplicated. Review and save any changes.", false);
  }

  function deleteFinding(id) {
    const finding = findById(id);
    if (!finding) return;
    const confirmed = window.confirm(`Delete "${finding.title || "Untitled finding"}"? This only removes the finding record from this workspace.`);
    if (!confirmed) return;
    state.wrapper.findings = state.wrapper.findings.filter((item) => item.id !== id);
    if (state.selectedFindingId === id) state.selectedFindingId = "";
    saveWrapper();
    renderWorkspace();
    startNewFinding();
    setStatus("Finding deleted from this workspace.", false);
  }

  function handleSaveFinding(event) {
    event.preventDefault();
    saveCurrentFinding(false);
  }

  function handleSaveAndNew() {
    saveCurrentFinding(true);
  }

  function saveCurrentFinding(shouldStartNew) {
    if (!state.workspace) return;
    const now = new Date().toISOString();
    const existing = state.selectedFindingId ? findById(state.selectedFindingId) : null;
    const next = normalizeFinding({
      ...(existing || createEmptyFinding()),
      id: existing?.id || createId("finding"),
      title: getFieldValue(elements.title) || "Untitled finding",
      findingType: getFieldValue(elements.findingType) || "finding",
      severity: getFieldValue(elements.severity) || "medium",
      status: getFieldValue(elements.findingStatus) || "draft",
      domain: getFieldValue(elements.domain),
      summary: getFieldValue(elements.summaryText),
      evidence: getFieldValue(elements.evidence),
      impact: getFieldValue(elements.impact),
      recommendation: getFieldValue(elements.recommendation),
      tags: splitTags(getFieldValue(elements.tags)),
      notes: getFieldValue(elements.notes),
      sourceReferences: readSourceReferencesFromDom(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });

    if (existing) {
      state.wrapper.findings = state.wrapper.findings.map((finding) => finding.id === existing.id ? next : finding);
    } else {
      state.wrapper.findings.unshift(next);
    }

    saveWrapper();
    state.selectedFindingId = shouldStartNew ? "" : next.id;
    renderWorkspace();
    if (shouldStartNew) {
      startNewFinding();
      setStatus("Finding saved. Ready for a new finding.", false);
    } else {
      renderEditor(next);
      setStatus("Finding saved to the active workspace.", false);
    }
  }

  function addSourceReference() {
    state.draftReferences = readSourceReferencesFromDom();
    state.draftReferences.push(createEmptySourceReference());
    renderSourceReferences();
    renderImportMetadata(current);  }

  function handleSourceReferenceAction(event) {
    const button = event.target.closest("[data-action='remove-source']");
    if (!button) return;
    const index = Number(button.getAttribute("data-index"));
    state.draftReferences = readSourceReferencesFromDom().filter((_, itemIndex) => itemIndex !== index);
    renderSourceReferences();
    renderImportMetadata(current);  }

  function getFilteredFindings() {
    return state.wrapper.findings.filter((finding) => {
      if (state.filters.findingType && finding.findingType !== state.filters.findingType) return false;
      if (state.filters.status && finding.status !== state.filters.status) return false;
      if (state.filters.severity && finding.severity !== state.filters.severity) return false;
      if (!state.filters.search) return true;
      const haystack = [
        finding.title,
        finding.domain,
        finding.summary,
        finding.evidence,
        finding.impact,
        finding.recommendation,
        finding.notes,
        finding.tags.join(" ")
      ].join(" ").toLowerCase();
      return haystack.includes(state.filters.search);
    });
  }

  function getFindingMetrics(findings) {
    const total = findings.length;
    const ready = findings.filter((finding) => finding.status === "ready").length;
    const needsReview = findings.filter((finding) => finding.status === "draft" || finding.status === "needs-review").length;
    const highCriticalRisks = findings.filter((finding) => finding.findingType === "risk" && isHighCritical(finding)).length;
    const recommendations = findings.filter((finding) => finding.findingType === "recommendation" || hasText(finding.recommendation)).length;
    const evidenceLinked = findings.filter(hasEvidenceOrReference).length;
    const missingEvidence = findings.filter((finding) => !hasEvidenceOrReference(finding)).length;
    const highCriticalWithoutRecommendation = findings.filter((finding) => isHighCritical(finding) && !hasText(finding.recommendation)).length;
    return { total, ready, needsReview, highCriticalRisks, recommendations, evidenceLinked, missingEvidence, highCriticalWithoutRecommendation };
  }

  function getReadinessSignals(findings) {
    const metrics = getFindingMetrics(findings);
    if (!metrics.total) {
      return [{ status: "missing", label: "Not started", title: "No assessment findings captured", detail: "Create consultant-authored findings before treating an Assessment Report as ready to assemble." }];
    }

    const signals = [];
    if (metrics.needsReview) {
      signals.push({ status: "needs-review", label: "Needs review", title: `${metrics.needsReview} finding${metrics.needsReview === 1 ? "" : "s"} still draft or needs review`, detail: "Review and mark findings Ready or Deferred before using them as report-ready content." });
    }
    if (metrics.missingEvidence > Math.floor(metrics.total / 2)) {
      signals.push({ status: "needs-review", label: "Needs evidence", title: `${metrics.missingEvidence} finding${metrics.missingEvidence === 1 ? "" : "s"} lack evidence or source references`, detail: "Add evidence text or manual source references for traceability." });
    }
    if (metrics.highCriticalWithoutRecommendation) {
      signals.push({ status: "needs-review", label: "Needs recommendations", title: `${metrics.highCriticalWithoutRecommendation} high/critical finding${metrics.highCriticalWithoutRecommendation === 1 ? "" : "s"} need recommendations`, detail: "High and critical findings should include recommendation text or be deferred intentionally." });
    }
    if (!signals.length && metrics.ready) {
      signals.push({ status: "ready", label: "Ready to assemble", title: "Assessment findings are ready for report assembly", detail: "At least one finding is ready and high/critical findings include recommendation context." });
    }
    if (!signals.length) {
      signals.push({ status: "needs-review", label: "Needs review", title: "Findings exist but none are ready yet", detail: "Review the findings and mark report-ready records as Ready." });
    }
    return signals;
  }

  function loadWrapper(workspaceId) {
    return normalizeWrapper(readJson(scopedKey(workspaceId, STORAGE_ITEM), createEmptyWrapper()));
  }

  function saveWrapper() {
    if (!state.workspace) return false;
    state.wrapper = normalizeWrapper({
      ...state.wrapper,
      version: VERSION,
      updatedAt: new Date().toISOString(),
      findings: state.wrapper.findings
    });
    writeJson(scopedKey(state.workspace.id, STORAGE_ITEM), state.wrapper);
    return true;
  }

  function createEmptyWrapper() {
    return { version: VERSION, updatedAt: "", findings: [] };
  }

  function createEmptyFinding() {
    const now = new Date().toISOString();
    return {
      id: "",
      title: "",
      findingType: "finding",
      severity: "medium",
      status: "draft",
      domain: "",
      summary: "",
      evidence: "",
      impact: "",
      recommendation: "",
      sourceReferences: [],
      tags: [],
      notes: "",
      createdAt: now,
      updatedAt: now
    };
  }

  function createEmptySourceReference() {
    return { id: createId("source-ref"), sourceType: "manual-note", label: "", page: "", sourceId: "", note: "" };
  }

  function normalizeWrapper(value) {
    const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const sourceFindings = Array.isArray(safeValue.findings) ? safeValue.findings : Array.isArray(value) ? value : [];
    return {
      version: VERSION,
      updatedAt: typeof safeValue.updatedAt === "string" ? safeValue.updatedAt : "",
      findings: sourceFindings.map(normalizeFinding).filter(Boolean)
    };
  }

  function normalizeFinding(value) {
    if (!value || typeof value !== "object") return null;
    const now = new Date().toISOString();
    const normalized = {
      id: String(value.id || ""),
      title: String(value.title || ""),
      findingType: normalizeKey(FINDING_TYPES, value.findingType, "finding"),
      severity: normalizeKey(SEVERITIES, value.severity, "medium"),
      status: normalizeKey(STATUSES, value.status, "draft"),
      domain: String(value.domain || ""),
      summary: String(value.summary || ""),
      evidence: String(value.evidence || ""),
      impact: String(value.impact || ""),
      recommendation: String(value.recommendation || ""),
      sourceReferences: normalizeSourceReferences(value.sourceReferences),
      tags: normalizeTags(value.tags),
      notes: String(value.notes || ""),
      createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : now,
      updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : now
    };

    const hasImportMetadata = value.importSource === ASSIST_IMPORT_SOURCE || value.importSource === CSV_IMPORT_SOURCE || value.importBatchId || value.importedAt || value.importWarnings || value.confidence || value.assistPromptVersion || value.sourceFileName || value.sourceRowNumber;
    if (hasImportMetadata) {
      normalized.importBatchId = String(value.importBatchId || "");
      normalized.importedAt = typeof value.importedAt === "string" ? value.importedAt : "";
      normalized.importSource = value.importSource === ASSIST_IMPORT_SOURCE ? ASSIST_IMPORT_SOURCE : value.importSource === CSV_IMPORT_SOURCE ? CSV_IMPORT_SOURCE : String(value.importSource || "");
      normalized.importWarnings = normalizeStringList(value.importWarnings);
      if (value.confidence) normalized.confidence = normalizeConfidence(value.confidence) || "medium";
      if (value.assistPromptVersion) normalized.assistPromptVersion = String(value.assistPromptVersion || "");
      if (value.sourceFileName) normalized.sourceFileName = String(value.sourceFileName || "");
      if (value.sourceFileType) normalized.sourceFileType = String(value.sourceFileType || "");
      if (value.sourceFileSize !== undefined && value.sourceFileSize !== null) normalized.sourceFileSize = Number(value.sourceFileSize) || 0;
      if (value.sourceRowNumber !== undefined && value.sourceRowNumber !== null) normalized.sourceRowNumber = Number(value.sourceRowNumber) || 0;
    }

    return normalized;
  }

  function normalizeSourceReferences(value) {
    return Array.isArray(value)
      ? value.filter((reference) => reference && typeof reference === "object").map((reference) => ({
          id: String(reference.id || createId("source-ref")),
          sourceType: normalizeKey(SOURCE_TYPES, reference.sourceType, "manual-note"),
          label: String(reference.label || ""),
          page: normalizeSourcePage(reference.page),
          sourceId: String(reference.sourceId || ""),
          note: String(reference.note || "")
        }))
      : [];
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    if (typeof value === "string") return splitTags(value);
    return [];
  }

  function normalizeStringList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }

  function normalizeSourcePage(value) {
    const route = String(value || "");
    return SOURCE_PAGE_OPTIONS.some(([option]) => option === route) ? route : "";
  }

  function normalizeKey(labels, value, fallback) {
    const key = String(value || "");
    return Object.prototype.hasOwnProperty.call(labels, key) ? key : fallback;
  }

  function readSourceReferencesFromDom() {
    if (!elements.sourceList) return [];
    return Array.from(elements.sourceList.querySelectorAll(".assessment-source-ref-card")).map((card) => {
      const readField = (field) => {
        const input = card.querySelector(`[data-source-field='${field}']`);
        return input ? input.value.trim() : "";
      };
      return {
        id: card.getAttribute("data-reference-id") || createId("source-ref"),
        sourceType: normalizeKey(SOURCE_TYPES, readField("sourceType"), "manual-note"),
        label: readField("label"),
        page: normalizeSourcePage(readField("page")),
        sourceId: readField("sourceId"),
        note: readField("note")
      };
    }).filter((reference) => reference.label || reference.page || reference.sourceId || reference.note || reference.sourceType !== "manual-note");
  }

  function getActiveWorkspace() {
    if (window.RfpWorkspaces && typeof window.RfpWorkspaces.getActiveWorkspaceOrNull === "function") {
      return window.RfpWorkspaces.getActiveWorkspaceOrNull();
    }
    const workspaces = readJson(STORAGE_KEYS.workspaces, []);
    const activeId = readString(STORAGE_KEYS.activeWorkspace);
    return Array.isArray(workspaces) ? workspaces.find((workspace) => workspace && workspace.id === activeId) || null : null;
  }

  function readJson(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      setStatus("Assessment findings could not be saved in this browser session.", true);
    }
  }

  function readString(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function scopedKey(workspaceId, item) {
    return `rfpWorkspace:${workspaceId}:${item}`;
  }

  function findById(id) {
    return state.wrapper.findings.find((finding) => finding.id === id) || null;
  }

  function hasText(value) {
    return String(value || "").trim().length > 0;
  }

  function hasEvidenceOrReference(finding) {
    return hasText(finding.evidence) || (Array.isArray(finding.sourceReferences) && finding.sourceReferences.length > 0);
  }

  function isHighCritical(finding) {
    return finding.severity === "high" || finding.severity === "critical";
  }

  function splitTags(value) {
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setField(element, value) {
    if (element) element.value = value || "";
  }

  function getFieldValue(element) {
    return element ? element.value.trim() : "";
  }

  function getLabel(labels, value) {
    return labels[value] || value || "Not set";
  }

  function badgeClass(status) {
    if (status === "ready") return "staged-badge-info";
    if (status === "deferred") return "staged-badge-muted";
    if (status === "missing") return "staged-badge-warning";
    return "staged-badge-warning";
  }

  function formatDate(value) {
    if (!value) return "Not saved";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not saved";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function setStatus(message, isWarning) {
    if (!elements.status) return;
    elements.status.textContent = message || "";
    elements.status.classList.toggle("warning", Boolean(isWarning));
    elements.status.classList.toggle("error", false);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}());































