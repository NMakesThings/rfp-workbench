(function () {
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const COLLECTIONS = {
    documents: "clientSourceDocuments",
    facts: "extractedClientFacts",
    suggestions: "suggestedInterviewAnswers",
    questions: "openQuestions",
    riskNotes: "clientRiskGapNotes"
  };
  const DOCUMENT_TYPES = {
    interview_transcript: "Interview transcript",
    prior_rfi: "Prior RFI",
    current_state_assessment: "Current-state assessment",
    legacy_system_inventory: "Legacy system inventory",
    stakeholder_notes: "Stakeholder notes",
    contract_sow: "Existing contract or SOW",
    other: "Other"
  };
  const SOURCE_ORIGINS = {
    pasted_text: "Pasted text",
    ai_import: "AI import",
    manual_entry: "Manual entry"
  };
  const PROCESSING_STATUSES = {
    analyzed: "Analyzed",
    imported: "Imported",
    saved: "Saved"
  };
  const ALLOWED_ANSWER_KEYS = [
    "justice_domain",
    "system_type",
    "procurement_type",
    "client_type",
    "integration_partners",
    "deployment_model",
    "compliance",
    "implementation_support",
    "vendor_priorities"
  ];
  const ARRAY_ANSWER_KEYS = new Set([
    "integration_partners",
    "deployment_model",
    "compliance",
    "implementation_support",
    "vendor_priorities"
  ]);
  const ANSWER_LABELS = {
    justice_domain: "Justice domain",
    system_type: "System type",
    procurement_type: "Procurement type",
    client_type: "Client type",
    integration_partners: "Integration partners",
    deployment_model: "Deployment model",
    compliance: "Compliance",
    implementation_support: "Implementation support",
    vendor_priorities: "Vendor priorities"
  };
  const OPTION_SOURCES = {
    domains: "justice_domain",
    systemTypes: "system_type",
    procurementTypes: "procurement_type",
    clientTypes: "client_type",
    integrationPartners: "integration_partners"
  };
  const DEFAULT_OPTIONS = {
    justice_domain: [
      ["courts", "Courts"],
      ["prosecution", "Prosecution / District Attorney"],
      ["law_enforcement", "Law Enforcement"],
      ["corrections_jail", "Corrections / Jail"],
      ["dispatch_cad", "CAD / Dispatch"],
      ["justice_integration", "Justice Integration"],
      ["digital_evidence", "Digital Evidence"]
    ],
    system_type: [
      ["court_cms", "Court Case Management System"],
      ["prosecutor_cms", "Prosecutor / DA Case Management System"],
      ["law_enforcement_rms", "Law Enforcement RMS"],
      ["jail_management_system", "Jail Management System"],
      ["cad_dispatch", "CAD / Dispatch"],
      ["justice_integration_platform", "Justice Integration Platform"],
      ["digital_evidence_management", "Digital Evidence Management"]
    ],
    procurement_type: [
      ["new_system", "New system"],
      ["replacement", "Replacement / modernization"],
      ["implementation_services", "Implementation services"],
      ["integration_project", "Integration project"],
      ["support_maintenance", "Support / maintenance renewal"],
      ["assessment_planning", "Assessment / planning"]
    ],
    client_type: [
      ["county_agency", "County agency"],
      ["city_agency", "City agency"],
      ["state_agency", "State agency"],
      ["court_agency", "Court agency"],
      ["prosecutorial_agency", "Prosecutorial agency"],
      ["law_enforcement_agency", "Law enforcement agency"]
    ],
    integration_partners: [
      ["courts", "Courts"],
      ["prosecution", "Prosecution / DA"],
      ["law_enforcement", "Law enforcement agencies"],
      ["jail", "Jail / corrections"],
      ["cad_dispatch", "CAD / dispatch"],
      ["probation", "Probation / supervision"],
      ["state_criminal_history", "State criminal history"],
      ["digital_evidence", "Digital evidence"],
      ["identity_access", "Identity / access provider"],
      ["data_warehouse", "Data warehouse / analytics"],
      ["payments", "Payments"],
      ["public_portal", "Public portal"]
    ],
    deployment_model: [
      ["cloud", "Cloud hosted"],
      ["on_prem", "On premises"],
      ["hybrid", "Hybrid"],
      ["mobile", "Mobile access"]
    ],
    compliance: [
      ["cjis", "CJIS"],
      ["wcag_2_2_aa", "WCAG 2.2 AA / digital accessibility"],
      ["records_retention", "Records retention"],
      ["nibrs", "NIBRS / statutory reporting"],
      ["soc2", "SOC 2"],
      ["hipaa", "HIPAA"],
      ["pci", "PCI DSS"],
      ["gdpr", "GDPR"],
      ["fedramp", "FedRAMP"]
    ],
    implementation_support: [
      ["migration", "Data migration"],
      ["training", "Admin and end-user training"],
      ["change_management", "Change management"],
      ["phased_rollout", "Phased rollout"]
    ],
    vendor_priorities: [
      ["price", "Price"],
      ["experience", "Relevant justice/public safety experience"],
      ["roadmap", "Product roadmap"],
      ["security", "Security maturity"],
      ["references", "Client references"],
      ["implementation_capacity", "Implementation capacity"]
    ]
  };
  const RULES = [
    rule("justice_domain", "courts", 0.82, [
      "court",
      "courts",
      "clerk",
      "docket",
      "judge",
      "judicial",
      "hearing",
      "case filing",
      "e-filing"
    ]),
    rule("justice_domain", "prosecution", 0.82, [
      "district attorney",
      "prosecutor",
      "prosecution",
      "charging",
      "victim witness",
      "discovery"
    ]),
    rule("justice_domain", "law_enforcement", 0.8, [
      "law enforcement",
      "police",
      "sheriff",
      "officer",
      "incident report"
    ]),
    rule("justice_domain", "corrections_jail", 0.79, [
      "jail",
      "corrections",
      "inmate",
      "booking"
    ]),
    rule("justice_domain", "dispatch_cad", 0.78, ["dispatch", "911", "cad"]),
    rule("justice_domain", "digital_evidence", 0.76, [
      "digital evidence",
      "body camera",
      "redaction"
    ]),
    rule("system_type", "court_cms", 0.84, [
      "court case management",
      "court cms",
      "case management system",
      "docketing",
      "e-filing"
    ]),
    rule("system_type", "prosecutor_cms", 0.83, [
      "prosecutor case management",
      "district attorney case management",
      "da case management",
      "charging workflow"
    ]),
    rule("system_type", "law_enforcement_rms", 0.8, [
      "records management system",
      "law enforcement rms",
      "rms",
      "incident reporting"
    ]),
    rule("system_type", "jail_management_system", 0.8, [
      "jail management",
      "inmate management",
      "booking system"
    ]),
    rule("system_type", "cad_dispatch", 0.78, ["cad", "dispatch system", "911 dispatch"]),
    rule("system_type", "justice_integration_platform", 0.78, [
      "integration platform",
      "justice integration",
      "data exchange"
    ]),
    rule("system_type", "digital_evidence_management", 0.76, [
      "digital evidence management",
      "evidence management",
      "body camera"
    ]),
    rule("procurement_type", "replacement", 0.84, [
      "legacy",
      "replace",
      "replacement",
      "modernization",
      "modernize",
      "current vendor"
    ]),
    rule("procurement_type", "new_system", 0.78, ["new system", "new platform", "greenfield"]),
    rule("procurement_type", "implementation_services", 0.78, [
      "implementation services",
      "implementation partner",
      "configure and deploy"
    ]),
    rule("procurement_type", "integration_project", 0.79, [
      "integration project",
      "integrations",
      "interfaces",
      "data exchange"
    ]),
    rule("procurement_type", "support_maintenance", 0.74, [
      "support renewal",
      "maintenance renewal",
      "support and maintenance"
    ]),
    rule("procurement_type", "assessment_planning", 0.74, [
      "assessment",
      "planning",
      "current-state",
      "current state"
    ]),
    rule("client_type", "court_agency", 0.82, ["court", "clerk", "judiciary"]),
    rule("client_type", "prosecutorial_agency", 0.82, [
      "district attorney",
      "prosecutor",
      "prosecutorial"
    ]),
    rule("client_type", "law_enforcement_agency", 0.8, [
      "police department",
      "sheriff",
      "law enforcement agency"
    ]),
    rule("client_type", "county_agency", 0.77, ["county"]),
    rule("client_type", "city_agency", 0.76, ["city", "municipal"]),
    rule("client_type", "state_agency", 0.76, ["state agency", "statewide"]),
    rule("integration_partners", "courts", 0.78, ["court", "courts"]),
    rule("integration_partners", "prosecution", 0.78, ["district attorney", "prosecutor"]),
    rule("integration_partners", "law_enforcement", 0.78, [
      "police",
      "sheriff",
      "law enforcement"
    ]),
    rule("integration_partners", "jail", 0.78, ["jail", "corrections"]),
    rule("integration_partners", "cad_dispatch", 0.76, ["cad", "dispatch", "911"]),
    rule("integration_partners", "probation", 0.76, ["probation", "supervision"]),
    rule("integration_partners", "state_criminal_history", 0.76, [
      "state criminal history",
      "criminal history"
    ]),
    rule("integration_partners", "digital_evidence", 0.76, [
      "digital evidence",
      "body camera"
    ]),
    rule("integration_partners", "identity_access", 0.74, [
      "single sign-on",
      "sso",
      "identity provider",
      "active directory"
    ]),
    rule("integration_partners", "data_warehouse", 0.74, [
      "data warehouse",
      "analytics platform"
    ]),
    rule("integration_partners", "payments", 0.74, ["payment", "payments", "fees"]),
    rule("integration_partners", "public_portal", 0.74, [
      "public portal",
      "public access"
    ]),
    rule("deployment_model", "cloud", 0.76, ["cloud", "saas", "hosted"]),
    rule("deployment_model", "on_prem", 0.76, ["on premises", "on-prem", "on premise"]),
    rule("deployment_model", "hybrid", 0.74, ["hybrid"]),
    rule("deployment_model", "mobile", 0.74, ["mobile", "field access", "tablet"]),
    rule("compliance", "cjis", 0.84, ["cjis"]),
    rule("compliance", "wcag_2_2_aa", 0.8, ["wcag", "accessibility", "ada"]),
    rule("compliance", "records_retention", 0.78, [
      "records retention",
      "retention schedule"
    ]),
    rule("compliance", "nibrs", 0.78, ["nibrs", "ucr"]),
    rule("compliance", "soc2", 0.74, ["soc 2", "soc2"]),
    rule("compliance", "hipaa", 0.74, ["hipaa"]),
    rule("compliance", "pci", 0.74, ["pci", "credit card"]),
    rule("compliance", "gdpr", 0.7, ["gdpr"]),
    rule("compliance", "fedramp", 0.74, ["fedramp"]),
    rule("implementation_support", "migration", 0.8, [
      "data migration",
      "migrate data",
      "conversion"
    ]),
    rule("implementation_support", "training", 0.78, ["training", "train users"]),
    rule("implementation_support", "change_management", 0.76, [
      "change management",
      "organizational change"
    ]),
    rule("implementation_support", "phased_rollout", 0.76, [
      "phased rollout",
      "pilot rollout",
      "phased implementation"
    ]),
    rule("vendor_priorities", "price", 0.72, ["price", "cost", "budget"]),
    rule("vendor_priorities", "experience", 0.76, [
      "justice experience",
      "public safety experience",
      "similar clients"
    ]),
    rule("vendor_priorities", "roadmap", 0.72, ["roadmap", "future releases"]),
    rule("vendor_priorities", "security", 0.76, [
      "security",
      "cybersecurity",
      "security maturity"
    ]),
    rule("vendor_priorities", "references", 0.72, ["references", "client references"]),
    rule("vendor_priorities", "implementation_capacity", 0.72, [
      "implementation capacity",
      "staffing",
      "project team"
    ])
  ];

  const optionLists = {};
  const optionLookups = {};
  const TRIAGE_TIERS = {
    suggested_accept: "Suggested Accept",
    review_recommended: "Review Recommended",
    requires_review: "Requires Review",
    conflict: "Conflict",
    unsupported_limitation: "Unsupported"
  };
  const TRIAGE_ORDER = [
    "suggested_accept",
    "review_recommended",
    "requires_review",
    "conflict",
    "unsupported_limitation"
  ];
  const FILE_WARN_BYTES = 500 * 1024;
  const FILE_BLOCK_BYTES = 2 * 1024 * 1024;
  const FILE_PREVIEW_CHAR_LIMIT = 5000;
  let elements = {};
  let pendingFileMetadata = null;
  let pendingLoadedFile = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    elements = {
      form: document.getElementById("client-source-form"),
      title: document.getElementById("client-source-title"),
      documentType: document.getElementById("client-source-document-type"),
      sourceOrigin: document.getElementById("client-source-origin"),
      sourceSummary: document.getElementById("client-source-summary"),
      text: document.getElementById("client-source-text"),
      fileInput: document.getElementById("client-source-file"),
      fileStatus: document.getElementById("client-source-file-status"),
      status: document.getElementById("client-source-status"),
      workspaceName: document.getElementById("source-intake-workspace-name"),
      summary: document.getElementById("source-intake-summary"),
      sourceStatusMetrics: document.getElementById("source-status-metrics"),
      recordSummary: document.getElementById("source-record-summary"),
      documentList: document.getElementById("source-document-list"),
      documentTypeFilter: document.getElementById("document-type-filter"),
      processingStatusFilter: document.getElementById("processing-status-filter"),
      documentSearchFilter: document.getElementById("document-search-filter"),
      triageCounts: document.getElementById("client-source-triage-counts"),
      triageFilter: document.getElementById("client-source-triage-filter"),
      factList: document.getElementById("client-fact-list"),
      suggestionList: document.getElementById("suggestion-list"),
      openQuestionList: document.getElementById("open-question-list")
    };

    if (!window.RfpWorkspaces) {
      setStatus("Workspace storage is unavailable.", true);
      return;
    }

    setDefaultOptions();
    await loadOptions();
    injectDictationControls();
    bindDictationElements();
    initializeDictation();
    injectAIAssistPanel();
    bindAIAssistElements();
    bindActions();
    render();
  }

  function rule(answerKey, value, confidence, terms) {
    return {
      answerKey,
      value,
      confidence,
      terms
    };
  }

  function bindActions() {
    elements.form.addEventListener("submit", handleSourceSubmit);
    elements.suggestionList.addEventListener("click", handleSuggestionClick);
    elements.openQuestionList.addEventListener("click", handleOpenQuestionClick);

    if (elements.copyAIPrompt) {
      elements.copyAIPrompt.addEventListener("click", copyAIPrompt);
    }

    if (elements.importAIResponse) {
      elements.importAIResponse.addEventListener("click", importAIResponse);
    }

    if (elements.selectAIPrompt) {
      elements.selectAIPrompt.addEventListener("click", selectAIPrompt);
    }

    if (elements.openChatGPT) {
      elements.openChatGPT.addEventListener("click", openChatGPT);
    }

    if (elements.riskGapNoteList) {
      elements.riskGapNoteList.addEventListener("click", handleRiskGapNoteClick);
    }

    if (elements.startDictation) {
      elements.startDictation.addEventListener("click", startDictation);
    }

    if (elements.stopDictation) {
      elements.stopDictation.addEventListener("click", stopDictation);
    }

    [elements.documentTypeFilter, elements.processingStatusFilter, elements.documentSearchFilter]
      .filter(Boolean)
      .forEach((control) => {
        control.addEventListener("input", render);
        control.addEventListener("change", render);
      });

    if (elements.triageFilter) {
      elements.triageFilter.addEventListener("change", render);
    }

    if (elements.triageCounts) {
      elements.triageCounts.addEventListener("click", handleTriageCountClick);
    }

    if (elements.fileInput) {
      elements.fileInput.addEventListener("change", handleSourceFileSelection);
    }
  }

  function handleSourceFileSelection() {
    const file = elements.fileInput && elements.fileInput.files ? elements.fileInput.files[0] : null;

    pendingLoadedFile = null;
    pendingFileMetadata = null;
    renderSourceFilePreview(null);

    if (!file) {
      setFileStatus("", false);
      return;
    }

    const validation = validateLocalTextFile(file, { allowTextOnlyStructured: true });
    if (validation.error) {
      if (elements.fileInput) elements.fileInput.value = "";
      setFileStatus(validation.error, true);
      return;
    }
    if (validation.blocked) {
      if (elements.fileInput) elements.fileInput.value = "";
      setFileStatus(validation.message, true);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "");
      const metadata = buildSourceFileMetadata(file, validation.warnings);
      pendingLoadedFile = { text, metadata };
      renderSourceFilePreview(pendingLoadedFile);
      const warningText = validation.warnings.length ? ` ${validation.warnings.join(" ")}` : "";
      setFileStatus(`Loaded ${file.name} for preview. Review it, then choose Use Loaded Text before Save & Analyze.${warningText}`, validation.warnings.length ? "warning" : false);
    };

    reader.onerror = () => {
      pendingLoadedFile = null;
      pendingFileMetadata = null;
      renderSourceFilePreview(null);
      setFileStatus("The selected file could not be read in this browser.", true);
    };

    reader.readAsText(file);
  }

  function applyPendingSourceFileText() {
    if (!pendingLoadedFile) {
      setFileStatus("Load a supported text or Markdown file before using loaded text.", true);
      return;
    }

    elements.text.value = pendingLoadedFile.text;
    pendingFileMetadata = { ...pendingLoadedFile.metadata };

    if (elements.title && !elements.title.value.trim()) {
      elements.title.value = stripFileExtension(pendingFileMetadata.name);
    }

    if (elements.sourceOrigin) {
      elements.sourceOrigin.value = "manual_entry";
    }

    const warningText = pendingFileMetadata.extractionWarnings?.length ? ` ${pendingFileMetadata.extractionWarnings.join(" ")}` : "";
    setFileStatus(`${pendingFileMetadata.name} loaded into Document text. Review and Save & Analyze when ready.${warningText}`, pendingFileMetadata.extractionWarnings?.length ? "warning" : false);
    elements.text.focus();
  }

  function clearPendingSourceFile() {
    pendingLoadedFile = null;
    pendingFileMetadata = null;
    if (elements.fileInput) elements.fileInput.value = "";
    renderSourceFilePreview(null);
    setFileStatus("", false);
  }

  function validateLocalTextFile(file, options = {}) {
    const name = String(file.name || "").toLowerCase();
    const type = String(file.type || "").toLowerCase();
    const extension = getFileExtension(file.name);
    const warnings = [];
    const isPrimaryText = extension === ".txt" || extension === ".md" || type === "text/plain" || type === "text/markdown";
    const isTextOnlyStructured = options.allowTextOnlyStructured && [".csv", ".json"].includes(extension) && ["", "text/csv", "application/json", "text/plain"].includes(type);

    if (!isPrimaryText && !isTextOnlyStructured) {
      return { error: "This prototype currently supports .txt and .md intake only. DOCX, PDF, and Excel support are planned future enhancements.", warnings };
    }
    if (isTextOnlyStructured) {
      warnings.push(`${extension.toUpperCase().replace(".", "")} is previewed as plain text only; structured import is planned later.`);
    }
    if (file.size > FILE_BLOCK_BYTES) {
      return { blocked: true, message: "This file is too large for this browser-local prototype slice. Use a smaller text/markdown extract or wait for the planned document handling workflow.", warnings };
    }
    if (file.size > FILE_WARN_BYTES) {
      warnings.push("This file is large for browser-local intake. Review performance and local storage limits before saving extracted text.");
    }
    return { warnings };
  }

  function buildSourceFileMetadata(file, warnings) {
    return {
      name: file.name,
      size: file.size,
      type: file.type || getFileExtension(file.name).replace(".", "") || "text/plain",
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : "",
      loadedAt: new Date().toISOString(),
      extractionWarnings: Array.isArray(warnings) ? warnings : []
    };
  }

  function renderSourceFilePreview(fileData) {
    if (elements.fileMetadata) {
      elements.fileMetadata.classList.toggle("hidden", !fileData);
      elements.fileMetadata.innerHTML = fileData ? renderFileMetadata(fileData.metadata) : "";
    }
    if (elements.filePreviewPanel) elements.filePreviewPanel.classList.toggle("hidden", !fileData);
    if (elements.filePreview) elements.filePreview.textContent = fileData ? getPreviewText(fileData.text) : "";
  }

  function renderFileMetadata(metadata) {
    const rows = [
      ["File", metadata.name || "Local text file"],
      ["Type", metadata.type || getFileExtension(metadata.name) || "Not available"],
      ["Size", formatFileSize(metadata.size)],
      ["Last modified", metadata.lastModified ? formatDate(metadata.lastModified) : "Not available"],
      ["Loaded", metadata.loadedAt ? formatDate(metadata.loadedAt) : "Now"]
    ];
    return `
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || "Not available"))}</dd></div>`).join("")}
      </dl>
      ${metadata.extractionWarnings?.length ? `<ul class="file-intake-warning-list">${metadata.extractionWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
    `;
  }

  function getPreviewText(text) {
    const value = String(text || "");
    if (value.length <= FILE_PREVIEW_CHAR_LIMIT) return value;
    return `${value.slice(0, FILE_PREVIEW_CHAR_LIMIT)}\n\n[Preview truncated. Full loaded text will be used if you choose Use Loaded Text.]`;
  }

  function isSupportedTextFile(file) {
    return !validateLocalTextFile(file, { allowTextOnlyStructured: true }).error;
  }
  function getFileExtension(name) {
    const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  }

  function stripFileExtension(name) {
    return String(name || "Client source document").replace(/\.[^.]+$/, "");
  }

  function setFileStatus(message, isError) {
    if (!elements.fileStatus) {
      return;
    }

    elements.fileStatus.textContent = message;
    elements.fileStatus.classList.toggle("error", Boolean(isError));
  }

  let recognition = null;
  let isDictating = false;

  function injectDictationControls() {
    if (!elements.text || document.getElementById("start-dictation")) {
      return;
    }

    elements.text.insertAdjacentHTML(
      "afterend",
      `
        <div class="dictation-panel" aria-label="Dictation controls">
          <div class="dictation-actions">
            <button type="button" class="button secondary" id="start-dictation">Start Dictation</button>
            <button type="button" class="button secondary" id="stop-dictation" disabled>Stop Dictation</button>
          </div>
          <p id="dictation-status" class="status-message" aria-live="polite"></p>
        </div>
      `
    );
  }

  function bindDictationElements() {
    elements.startDictation = document.getElementById("start-dictation");
    elements.stopDictation = document.getElementById("stop-dictation");
    elements.dictationStatus = document.getElementById("dictation-status");
  }

  function initializeDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictationStatus("Dictation is not available in this browser.", true);

      if (elements.startDictation) {
        elements.startDictation.disabled = true;
      }

      if (elements.stopDictation) {
        elements.stopDictation.disabled = true;
      }

      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = handleDictationResult;
    recognition.onerror = (event) => {
      setDictationStatus(`Dictation error: ${event.error || "microphone unavailable"}.`, true);
      setDictationState(false);
    };
    recognition.onend = () => {
      setDictationState(false);
    };
    setDictationStatus("Dictation is available. Use your browser microphone permission prompt if asked.", false);
  }

  function startDictation() {
    if (!recognition || isDictating) {
      return;
    }

    try {
      recognition.start();
      setDictationState(true);
      setDictationStatus("Listening. Dictated text will append to the document text box.", false);
    } catch (error) {
      setDictationStatus("Dictation could not be started. Try again after the browser finishes the current speech session.", true);
    }
  }

  function stopDictation() {
    if (!recognition || !isDictating) {
      return;
    }

    recognition.stop();
    setDictationState(false);
    setDictationStatus("Dictation stopped.", false);
  }

  function handleDictationResult(event) {
    let finalText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];

      if (result.isFinal) {
        finalText += result[0].transcript;
      }
    }

    if (finalText.trim()) {
      appendDictationText(finalText.trim());
      setDictationStatus("Dictation appended to the document text box.", false);
    }
  }

  function appendDictationText(text) {
    const currentText = elements.text.value.trimEnd();
    const separator = currentText ? " " : "";
    elements.text.value = `${currentText}${separator}${text}`;
  }

  function setDictationState(active) {
    isDictating = active;

    if (elements.startDictation) {
      elements.startDictation.disabled = active || !recognition;
    }

    if (elements.stopDictation) {
      elements.stopDictation.disabled = !active || !recognition;
    }
  }

  function setDictationStatus(message, isError) {
    if (!elements.dictationStatus) {
      return;
    }

    elements.dictationStatus.textContent = message;
    elements.dictationStatus.classList.toggle("error", Boolean(isError));
  }

  function injectAIAssistPanel() {
    const grid = document.querySelector(".source-intake-grid");

    if (!grid || document.getElementById("ai-assist-panel")) {
      return;
    }

    grid.insertAdjacentHTML(
      "afterend",
      `
        <section id="ai-assist-panel" class="context-panel ai-assist-panel">
          <details class="ai-assist-details">
            <summary>
              <p class="section-kicker">Manual AI assist</p>
              <h2>Analyze Source Text With Your AI Tool</h2>
              <span>No API call is made from this app. Copy a prompt for your AI tool, then paste strict JSON back for consultant review.</span>
            </summary>
            <div class="ai-assist-content">
              <p class="ai-assist-note">
                You control what source text is sent outside this browser. Suggestions stay pending until a consultant accepts them.
              </p>
              <div class="ai-prompt-actions ai-prompt-primary-actions">
                <button type="button" class="button secondary" id="copy-ai-prompt">Copy AI Prompt</button>
                <button type="button" class="button secondary" id="select-ai-prompt">Select Prompt</button>
                <button type="button" class="button secondary" id="open-chatgpt">Open ChatGPT</button>
              </div>
              <p id="ai-assist-status" class="status-message ai-assist-status" aria-live="polite"></p>
              <details class="ai-prompt-details">
                <summary>Prompt preview</summary>
                <textarea
                  id="ai-prompt-preview"
                  class="ai-prompt-preview"
                  readonly
                  aria-label="Generated AI prompt"
                  placeholder="Paste client source text, then copy a prompt."
                ></textarea>
              </details>
              <label class="ai-response-field" for="ai-response-json">
                <span>AI JSON response</span>
                <textarea id="ai-response-json" placeholder="Paste strict valid JSON here. Do not include markdown fences."></textarea>
              </label>
              <div class="form-actions">
                <button type="button" class="button primary" id="import-ai-response">Import AI Suggestions</button>
              </div>
              <p id="ai-import-status" class="status-message ai-import-status" aria-live="polite"></p>
            </div>
          </details>
          <div>
            <h3 class="source-panel-heading">Potential Issues from Source Review</h3>
            <p class="source-panel-help">
              These are client-specific review notes from pasted or public source material. They do not affect Requirements Review or requirement generation until a consultant takes action.
            </p>
            <div id="risk-gap-note-list" class="risk-gap-note-list"></div>
          </div>
        </section>
      `
    );
  }

  function bindAIAssistElements() {
    elements.copyAIPrompt = document.getElementById("copy-ai-prompt");
    elements.aiPromptPreview = document.getElementById("ai-prompt-preview");
    elements.selectAIPrompt = document.getElementById("select-ai-prompt");
    elements.openChatGPT = document.getElementById("open-chatgpt");
    elements.aiResponse = document.getElementById("ai-response-json");
    elements.importAIResponse = document.getElementById("import-ai-response");
    elements.aiStatus = document.getElementById("ai-assist-status");
    elements.aiImportStatus = document.getElementById("ai-import-status");
    elements.riskGapNoteList = document.getElementById("risk-gap-note-list");
  }

  function setDefaultOptions() {
    Object.entries(DEFAULT_OPTIONS).forEach(([answerKey, options]) => {
      setOptions(
        answerKey,
        options.map(([value, label]) => ({ value, label }))
      );
    });
  }

  async function loadOptions() {
    try {
      const [questionsResponse, taxonomyResponse] = await Promise.all([
        fetch(QUESTIONS_URL),
        fetch(TAXONOMY_URL)
      ]);

      const questions = questionsResponse.ok ? await questionsResponse.json() : null;
      const taxonomy = taxonomyResponse.ok ? await taxonomyResponse.json() : null;

      if (taxonomy) {
        Object.entries(OPTION_SOURCES).forEach(([sourceKey, answerKey]) => {
          setOptions(answerKey, sourceOptions(taxonomy[sourceKey]));
        });
      }

      if (questions) {
        questions.sections.forEach((section) => {
          section.questions.forEach((question) => {
            if (!ANSWER_LABELS[question.id]) {
              return;
            }

            if (question.options) {
              setOptions(question.id, sourceOptions(question.options));
            } else if (question.optionSource && taxonomy) {
              setOptions(question.id, sourceOptions(taxonomy[question.optionSource]));
            }
          });
        });
      }
    } catch (error) {
      setStatus("Option labels could not be refreshed; saved values will still work.", true);
    }
  }

  function sourceOptions(options) {
    return (options || []).map((option) => ({
      value: option.id || option.value,
      label: option.label || option.id || option.value
    }));
  }

  function setOptions(answerKey, options) {
    optionLists[answerKey] = options || [];
    optionLookups[answerKey] = new Map(
      optionLists[answerKey].map((option) => [option.value, option.label])
    );
  }

  async function copyAIPrompt() {
    const prompt = buildAIPrompt();

    if (!prompt) {
      setAIStatus("Paste client source text before creating an AI prompt.", true);
      elements.text.focus();
      return;
    }

    setPromptPreview(prompt);

    try {
      await copyTextToClipboard(prompt);
      setAIStatus("AI prompt copied to clipboard. Paste it into your chosen AI tool, then paste the JSON response below.", false);
    } catch (error) {
      selectAIPrompt();
      setAIStatus("Prompt generated, but clipboard access was blocked. Use Ctrl+C / Cmd+C to copy the selected prompt text from the prompt box.", true);
    }
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    throw new Error("Clipboard API unavailable.");
  }

  function setPromptPreview(prompt) {
    if (!elements.aiPromptPreview) {
      return;
    }

    elements.aiPromptPreview.value = prompt;
  }

  function selectAIPrompt() {
    const currentPrompt = elements.aiPromptPreview.value || buildAIPrompt();

    if (!currentPrompt) {
      setAIStatus("Paste client source text before selecting a prompt.", true);
      return;
    }

    setPromptPreview(currentPrompt);
    elements.aiPromptPreview.focus();
    if (typeof elements.aiPromptPreview.select === "function") {
      elements.aiPromptPreview.select();
    }
    setAIStatus("Prompt text selected. Use Ctrl+C / Cmd+C to copy it if it is not already on the clipboard.", false);
  }

  function openChatGPT() {
    window.open("https://chatgpt.com/", "_blank", "noopener");
    setAIStatus("Opened ChatGPT in a new tab. Paste the copied prompt there manually.", false);
  }

  function buildAIPrompt() {
    const sourceText = getPromptSourceText();

    if (!sourceText) {
      return "";
    }

    const promptPayload = {
      currentConfirmedInterviewAnswers: getAnswers(),
      allowedInterviewAnswerKeys: ALLOWED_ANSWER_KEYS,
      allowedOptionValues: getAllowedOptionValues(),
      requiredJsonResponseSchema: getAIResponseSchema(),
      clientTranscriptOrDocumentText: sourceText
    };

    return [
      "You are assisting with client source intake for an RFP requirements prototype.",
      "",
      "Analyze the client transcript/document and return strict valid JSON only.",
      "Return exactly one strict valid JSON object only. The response must start with { and end with }.",
      "Do not include markdown code fences, comments, explanatory prose, footnotes, reference definitions such as [1]: URL, citation/reference lists after the JSON, text before or after the JSON object, or trailing commas.",
      "Use raw URLs only in URL fields if any are included. Do not use markdown link format in any JSON value.",
      "",
      "Rules:",
      "- Do not invent facts.",
      "- Use source excerpts from the source text.",
      "- Use only the allowed project intake answer keys.",
      "- Use only allowed option values when suggesting structured answers.",
      "- Mark uncertain items as openQuestions, not confirmed answers.",
      "- Do not suggest reusable library requirements.",
      "- Client-specific content must remain client-specific.",
      "- Suggestions are advisory and will be reviewed by a consultant.",
      "",
      "Input package:",
      JSON.stringify(promptPayload, null, 2)
    ].join("\n");
  }

  function getPromptSourceText() {
    const pastedText = elements.text ? elements.text.value.trim() : "";

    if (pastedText) {
      return pastedText;
    }

    const latestDocument = readCollection(COLLECTIONS.documents)[0];
    return latestDocument && latestDocument.rawText ? latestDocument.rawText : "";
  }

  function getAllowedOptionValues() {
    return ALLOWED_ANSWER_KEYS.reduce((options, answerKey) => {
      options[answerKey] = (optionLists[answerKey] || []).map((option) => ({
        value: option.value,
        label: option.label
      }));
      return options;
    }, {});
  }

  function getAIResponseSchema() {
    return {
      analysisSummary: "Short plain-English summary of the source document.",
      extractedFacts: [
        {
          factType: "current_system | scope | integration | compliance | risk | other",
          factText: "Client-specific fact stated or strongly implied by the source.",
          normalizedValue: "Optional normalized value.",
          confidence: "low | medium | high",
          evidence: [
            {
              excerpt: "Short source excerpt.",
              matchedTerms: ["term one", "term two"]
            }
          ]
        }
      ],
      suggestedInterviewAnswers: [
        {
          answerKey: "one allowed project intake answer key",
          suggestedValue: "one allowed option value",
          suggestedLabel: "Human-readable label for suggestedValue",
          reason: "Plain-English reason for the suggestion.",
          confidence: "low | medium | high",
          sourceFactIndexes: [0],
          evidence: [
            {
              excerpt: "Short source excerpt.",
              matchedTerms: ["term one", "term two"]
            }
          ]
        }
      ],
      openQuestions: [
        {
          questionText: "Question the consultant should resolve.",
          reason: "Why this is unresolved.",
          priority: "low | medium | high",
          relatedAnswerKeys: ["one or more allowed answer keys"],
          sourceFactIndexes: [0],
          evidence: [
            {
              excerpt: "Short source excerpt.",
              matchedTerms: ["term one", "term two"]
            }
          ]
        }
      ],
      riskGapNotes: [
        {
          title: "Short potential issue title.",
          description: "Potential issue for Client Source Intake only.",
          severity: "low | medium | high",
          relatedAnswerKeys: ["one or more allowed answer keys"],
          evidence: [
            {
              excerpt: "Short source excerpt.",
              matchedTerms: ["term one", "term two"]
            }
          ]
        }
      ]
    };
  }

  function importAIResponse() {
    const rawResponse = elements.aiResponse.value.trim();

    if (!rawResponse) {
      setAIImportStatus("Paste an AI JSON response before importing.", true);
      elements.aiResponse.focus();
      return;
    }

    let parsedResponse = null;

    try {
      parsedResponse = parseAIJsonObject(rawResponse);
    } catch (error) {
      setAIImportStatus(`Invalid JSON: ${error.message}`, true);
      return;
    }

    const validationError = validateAIResponse(parsedResponse);

    if (validationError) {
      setAIImportStatus(validationError, true);
      return;
    }

    const sourceText = getPromptSourceText();
    const sourceDocument = ensureAIAssistDocument(sourceText);
    const workspace = getWorkspace();
    const now = new Date().toISOString();
    const answers = getAnswers();
    const factRecords = createAIFactRecords(parsedResponse.extractedFacts || [], sourceDocument, workspace, now);
    const sourceFactIdByIndex = new Map(
      factRecords.map((fact, index) => [index, fact.id])
    );
    const suggestionRecords = createAISuggestionRecords(
      parsedResponse.suggestedInterviewAnswers || [],
      sourceDocument,
      workspace,
      sourceFactIdByIndex,
      answers,
      now
    );
    const openQuestionRecords = createAIOpenQuestions(
      parsedResponse.openQuestions || [],
      sourceDocument,
      workspace,
      sourceFactIdByIndex,
      now
    );
    const riskNoteRecords = createAIRiskNotes(
      parsedResponse.riskGapNotes || [],
      sourceDocument,
      workspace,
      now
    );

    if (!factRecords.length && !suggestionRecords.length && !openQuestionRecords.length && !riskNoteRecords.length) {
      setAIImportStatus("AI response parsed, but no importable records were found.", true);
      return;
    }

    saveCollection(COLLECTIONS.facts, [
      ...factRecords,
      ...readCollection(COLLECTIONS.facts)
    ]);
    saveCollection(COLLECTIONS.suggestions, [
      ...suggestionRecords,
      ...readCollection(COLLECTIONS.suggestions)
    ]);
    saveCollection(COLLECTIONS.questions, [
      ...openQuestionRecords,
      ...readCollection(COLLECTIONS.questions)
    ]);
    saveCollection(COLLECTIONS.riskNotes, [
      ...riskNoteRecords,
      ...readCollection(COLLECTIONS.riskNotes)
    ]);

    const skipped = getSkippedAISuggestionCount(parsedResponse.suggestedInterviewAnswers || [], suggestionRecords);
    const skippedMessage = skipped ? ` ${skipped} suggestion${skipped === 1 ? "" : "s"} skipped because the key or value was not allowed.` : "";
    setAIImportStatus(
      `Imported ${factRecords.length} facts, ${suggestionRecords.length} pending suggestions, ${openQuestionRecords.length} open questions, and ${riskNoteRecords.length} potential issues.${skippedMessage}`,
      false
    );
    render();
  }

  function validateAIResponse(response) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return "AI response must be a JSON object.";
    }

    const allowedArrays = [
      "extractedFacts",
      "suggestedInterviewAnswers",
      "openQuestions",
      "riskGapNotes"
    ];
    const hasArray = allowedArrays.some((key) => Array.isArray(response[key]));

    if (!hasArray && !response.analysisSummary) {
      return "AI response must include at least one supported array: extractedFacts, suggestedInterviewAnswers, openQuestions, or riskGapNotes.";
    }

    const badArray = allowedArrays.find(
      (key) => response[key] !== undefined && !Array.isArray(response[key])
    );

    if (badArray) {
      return `${badArray} must be an array.`;
    }

    return "";
  }

  function parseAIJsonObject(rawResponse) {
    const cleaned = normalizeJsonResponseText(rawResponse);

    if (!cleaned) {
      throw new Error("Paste a JSON object before importing.");
    }

    try {
      return JSON.parse(cleaned);
    } catch (directError) {
      const extraction = extractSingleJsonObject(cleaned);

      if (extraction.error) {
        throw new Error(extraction.error);
      }

      if (extraction.jsonText) {
        return parseExtractedJsonObject(extraction.jsonText);
      }

      throw new Error(getJsonImportErrorMessage(directError.message));
    }
  }

  function normalizeJsonResponseText(value) {
    return stripMarkdownFence(
      String(value || "")
        .replace(/^\uFEFF/, "")
        .replace(/^[\u200B-\u200D\u2060]+/, "")
        .trim()
    ).trim();
  }

  function stripMarkdownFence(value) {
    const text = String(value || "").trim();
    const exactFence = text.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);

    if (exactFence) {
      return exactFence[1].trim();
    }

    const fencedObject = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);

    if (fencedObject && fencedObject[1] && fencedObject[1].includes("{")) {
      const before = text.slice(0, fencedObject.index).trim();
      const after = text.slice(fencedObject.index + fencedObject[0].length).trim();

      if (isAllowedJsonWrapperText(before) && isAllowedJsonWrapperText(after)) {
        return fencedObject[1].trim();
      }
    }

    return text;
  }

  function extractSingleJsonObject(value) {
    const text = String(value || "");
    const start = text.indexOf("{");

    if (start < 0) {
      return { error: getJsonImportErrorMessage("No JSON object was found.") };
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }

    if (end < 0) {
      return { error: getJsonImportErrorMessage("No complete top-level JSON object was found.") };
    }

    const before = text.slice(0, start).trim();
    const after = text.slice(end).trim();

    if (hasTopLevelJsonObject(after)) {
      return { error: "Multiple top-level JSON objects were found. Paste exactly one JSON object." };
    }

    if (!isAllowedJsonWrapperText(before) || !isAllowedJsonWrapperText(after)) {
      return { error: getJsonImportErrorMessage("Unexpected text was found outside the JSON object.") };
    }

    return { jsonText: text.slice(start, end).trim() };
  }

  function parseExtractedJsonObject(jsonText) {
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`${error.message}. ${getJsonImportErrorMessage()}`);
    }
  }

  function getJsonImportErrorMessage(detail) {
    const base = "The response could not be imported as JSON. The importer can handle markdown fences and trailing citation references, but it could not find one complete valid JSON object.";
    return detail ? `${detail} ${base}` : base;
  }

  function isAllowedJsonWrapperText(text) {
    const cleaned = String(text || "").trim();

    if (!cleaned) {
      return true;
    }

    return cleaned
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .every((line) => /^\[\d+\]:\s*https?:\/\/\S+$/i.test(line));
  }

  function hasTopLevelJsonObject(text) {
    const cleaned = String(text || "").trim();
    return cleaned.includes("{") && Boolean(extractBalancedObjectLenient(cleaned));
  }

  function extractBalancedObjectLenient(text) {
    const start = String(text || "").indexOf("{");

    if (start < 0) {
      return "";
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }

    return "";
  }

  function ensureAIAssistDocument(sourceText) {
    const documents = readCollection(COLLECTIONS.documents);
    const sourceHash = sourceText ? hashText(sourceText) : "";
    const existingDocument = sourceHash
      ? documents.find((documentRecord) => documentRecord.textHash === sourceHash)
      : documents[0];

    if (existingDocument) {
      return existingDocument;
    }

    if (!sourceText) {
      return null;
    }

    const now = new Date().toISOString();
    const title = elements.title.value.trim() || `AI Assist source ${documents.length + 1}`;
    const documentRecord = {
      id: createId("clientDoc"),
      workspaceId: getWorkspace().id,
      documentType: "other",
      sourceOrigin: "ai_import",
      title,
      createdAt: now,
      updatedAt: now,
      processingStatus: "imported",
      sourceSummary: "Created from the current Client Source Intake text for manual AI Assist.",
      clientSpecificity: "client_specific",
      reuseEligible: false,
      textHash: sourceHash,
      rawText: sourceText
    };

    saveCollection(COLLECTIONS.documents, [documentRecord, ...documents]);
    return documentRecord;
  }

  function createAIFactRecords(facts, sourceDocument, workspace, createdAt) {
    return facts
      .filter((fact) => fact && typeof fact === "object")
      .map((fact) => ({
        id: createId("fact"),
        workspaceId: workspace.id,
        clientSourceDocumentId: sourceDocument ? sourceDocument.id : null,
        factType: String(fact.factType || "other"),
        factText: String(fact.factText || "").trim(),
        normalizedValue: fact.normalizedValue || "",
        confidence: normalizeConfidence(fact.confidence),
        status: "unreviewed",
        evidence: normalizeEvidenceList(fact.evidence),
        importSource: "manual_ai_assist",
        createdAt
      }))
      .filter((fact) => fact.factText || fact.evidence.length);
  }

  function createAISuggestionRecords(suggestions, sourceDocument, workspace, sourceFactIdByIndex, answers, createdAt) {
    return suggestions.flatMap((suggestion) => {
      if (!suggestion || typeof suggestion !== "object" || !ALLOWED_ANSWER_KEYS.includes(suggestion.answerKey)) {
        return [];
      }

      return normalizeSuggestedValues(suggestion)
        .filter((value) => isAllowedAnswerValue(suggestion.answerKey, value))
        .map((value) => {
          const label = suggestion.suggestedLabel && !Array.isArray(suggestion.suggestedValue)
            ? suggestion.suggestedLabel
            : labelFor(suggestion.answerKey, value);
          const evidence = normalizeEvidenceList(suggestion.evidence);
          const reason = suggestion.reason || getSuggestionReason(
            suggestion.answerKey,
            value,
            evidence[0]
          );

          return {
            id: createId("suggestion"),
            workspaceId: workspace.id,
            clientSourceDocumentId: sourceDocument ? sourceDocument.id : null,
            answerKey: suggestion.answerKey,
            suggestedValue: value,
            suggestedLabel: labelFor(suggestion.answerKey, value) || label,
            sourceFactIds: resolveSourceFactIds(suggestion.sourceFactIndexes, sourceFactIdByIndex),
            confidence: normalizeConfidence(suggestion.confidence),
            status: "pending_review",
            reviewDecision: null,
            reviewedAt: null,
            reviewedBy: null,
            conflictState: getConflictState(suggestion.answerKey, value, answers),
            existingValue: answers[suggestion.answerKey] || "",
            evidence,
            suggestionReason: reason,
            importSource: "manual_ai_assist",
            createdAt
          };
        });
    });
  }

  function createAIOpenQuestions(questions, sourceDocument, workspace, sourceFactIdByIndex, createdAt) {
    return questions
      .filter((question) => question && typeof question === "object")
      .map((question) => ({
        id: createId("followup"),
        workspaceId: workspace.id,
        clientSourceDocumentId: sourceDocument ? sourceDocument.id : null,
        relatedSuggestionId: null,
        relatedQuestionIds: normalizeAnswerKeys(question.relatedAnswerKeys),
        sourceFactIds: resolveSourceFactIds(question.sourceFactIndexes, sourceFactIdByIndex),
        questionText: String(question.questionText || "").trim(),
        reason: String(question.reason || "AI-assisted intake suggested this follow-up for consultant review.").trim(),
        priority: normalizePriority(question.priority),
        status: "open",
        resolution: "",
        evidence: normalizeEvidenceList(question.evidence),
        importSource: "manual_ai_assist",
        createdAt
      }))
      .filter((question) => question.questionText);
  }

  function createAIRiskNotes(notes, sourceDocument, workspace, createdAt) {
    return notes
      .filter((note) => note && typeof note === "object")
      .map((note) => ({
        id: createId("riskgap"),
        workspaceId: workspace.id,
        clientSourceDocumentId: sourceDocument ? sourceDocument.id : null,
        title: String(note.title || "Untitled potential issue").trim(),
        description: String(note.description || "").trim(),
        severity: normalizePriority(note.severity),
        relatedAnswerKeys: normalizeAnswerKeys(note.relatedAnswerKeys),
        evidence: normalizeEvidenceList(note.evidence),
        status: "open",
        importSource: "manual_ai_assist",
        createdAt
      }))
      .filter((note) => note.title || note.description);
  }

  function normalizeSuggestedValues(suggestion) {
    const value = suggestion.suggestedValue;

    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return [String(value || "").trim()].filter(Boolean);
  }

  function isAllowedAnswerValue(answerKey, value) {
    const options = optionLists[answerKey] || [];

    if (!options.length) {
      return true;
    }

    return options.some((option) => option.value === value);
  }

  function resolveSourceFactIds(indexes, sourceFactIdByIndex) {
    if (!Array.isArray(indexes)) {
      return [];
    }

    return indexes
      .map((index) => sourceFactIdByIndex.get(Number(index)))
      .filter(Boolean);
  }

  function normalizeAnswerKeys(keys) {
    if (!Array.isArray(keys)) {
      return [];
    }

    return keys.filter((key) => ALLOWED_ANSWER_KEYS.includes(key));
  }

  function normalizeEvidenceList(evidence) {
    if (!Array.isArray(evidence)) {
      return [];
    }

    return evidence
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        excerpt: cleanEvidenceExcerpt(item.excerpt || ""),
        matchedTerms: Array.isArray(item.matchedTerms)
          ? item.matchedTerms.map((term) => String(term || "").trim()).filter(Boolean)
          : []
      }))
      .filter((item) => item.excerpt || item.matchedTerms.length);
  }

  function normalizeConfidence(value) {
    const text = String(value || "medium").toLowerCase();

    if (text === "low" || text === "medium" || text === "high") {
      return text;
    }

    return "medium";
  }

  function normalizePriority(value) {
    const text = String(value || "medium").toLowerCase();

    if (text === "low" || text === "medium" || text === "high") {
      return text;
    }

    return "medium";
  }

  function getSkippedAISuggestionCount(sourceSuggestions, createdSuggestions) {
    const sourceCount = sourceSuggestions.reduce((count, suggestion) => {
      if (!suggestion || typeof suggestion !== "object") {
        return count;
      }

      return count + normalizeSuggestedValues(suggestion).length;
    }, 0);

    return Math.max(0, sourceCount - createdSuggestions.length);
  }

  function handleSourceSubmit(event) {
    event.preventDefault();

    const rawText = elements.text.value.trim();

    if (!rawText) {
      setStatus("Paste client source text or load a supported text file before saving.", true);
      elements.text.focus();
      return;
    }

    const workspace = getWorkspace();
    const documents = readCollection(COLLECTIONS.documents);
    const title = elements.title.value.trim() || `Client source ${documents.length + 1}`;
    const now = new Date().toISOString();
    const documentRecord = {
      id: createId("clientDoc"),
      workspaceId: workspace.id,
      documentType: getSelectedDocumentType(),
      sourceOrigin: getSelectedSourceOrigin(),
      title,
      createdAt: now,
      updatedAt: now,
      processingStatus: "analyzed",
      sourceSummary: elements.sourceSummary ? elements.sourceSummary.value.trim() : "",
      clientSpecificity: "client_specific",
      reuseEligible: false,
      sourceFile: pendingFileMetadata ? { ...pendingFileMetadata } : null,
      textHash: hashText(rawText),
      rawText
    };
    const extraction = extractFromText(documentRecord, rawText);

    saveCollection(COLLECTIONS.documents, [documentRecord, ...documents]);
    saveCollection(COLLECTIONS.facts, [
      ...extraction.facts,
      ...readCollection(COLLECTIONS.facts)
    ]);
    saveCollection(COLLECTIONS.suggestions, [
      ...extraction.suggestions,
      ...readCollection(COLLECTIONS.suggestions)
    ]);

    elements.title.value = "";
    if (elements.sourceSummary) {
      elements.sourceSummary.value = "";
    }
    elements.text.value = "";
    pendingFileMetadata = null;
    pendingLoadedFile = null;
    renderSourceFilePreview(null);
    if (elements.fileInput) {
      elements.fileInput.value = "";
    }
    setFileStatus("", false);
    setStatus(
      `${extraction.suggestions.length} suggestion${extraction.suggestions.length === 1 ? "" : "s"} generated from ${title}.`,
      false
    );
    render();
  }

  function extractFromText(documentRecord, text) {
    const candidates = RULES.map((candidateRule) => buildCandidate(candidateRule, text))
      .filter(Boolean);
    const selected = selectCandidates(candidates);
    const answers = getAnswers();
    const facts = [];
    const suggestions = [];

    selected.forEach((candidate) => {
      const fact = {
        id: createId("fact"),
        workspaceId: documentRecord.workspaceId,
        clientSourceDocumentId: documentRecord.id,
        factType: candidate.answerKey,
        factText: `${ANSWER_LABELS[candidate.answerKey]} appears to match ${labelFor(candidate.answerKey, candidate.value)}.`,
        normalizedValue: candidate.value,
        confidence: candidate.confidence,
        status: "unreviewed",
        evidence: [candidate.evidence],
        createdAt: documentRecord.createdAt
      };

      facts.push(fact);
      suggestions.push({
        id: createId("suggestion"),
        workspaceId: documentRecord.workspaceId,
        clientSourceDocumentId: documentRecord.id,
        answerKey: candidate.answerKey,
        suggestedValue: candidate.value,
        suggestedLabel: labelFor(candidate.answerKey, candidate.value),
        sourceFactIds: [fact.id],
        confidence: candidate.confidence,
        status: "pending_review",
        reviewDecision: null,
        reviewedAt: null,
        reviewedBy: null,
        conflictState: getConflictState(candidate.answerKey, candidate.value, answers),
        existingValue: answers[candidate.answerKey] || "",
        evidence: [candidate.evidence],
        suggestionReason: getSuggestionReason(candidate.answerKey, candidate.value, candidate.evidence),
        createdAt: documentRecord.createdAt
      });
    });

    return { facts, suggestions };
  }

  function buildCandidate(candidateRule, text) {
    const matchedTerms = candidateRule.terms.filter((term) => findTerm(text, term));

    if (!matchedTerms.length) {
      return null;
    }

    return {
      ...candidateRule,
      confidence: Math.min(
        0.95,
        Number((candidateRule.confidence + Math.min(matchedTerms.length, 4) * 0.03).toFixed(2))
      ),
      evidence: {
        excerpt: getExcerpt(text, matchedTerms[0]),
        matchedTerms
      }
    };
  }

  function selectCandidates(candidates) {
    const scalarByKey = new Map();
    const selected = [];
    const seenArraySuggestions = new Set();

    candidates.forEach((candidate) => {
      if (ARRAY_ANSWER_KEYS.has(candidate.answerKey)) {
        const key = `${candidate.answerKey}:${candidate.value}`;

        if (!seenArraySuggestions.has(key)) {
          selected.push(candidate);
          seenArraySuggestions.add(key);
        }

        return;
      }

      const current = scalarByKey.get(candidate.answerKey);

      if (!current || scoreCandidate(candidate) > scoreCandidate(current)) {
        scalarByKey.set(candidate.answerKey, candidate);
      }
    });

    return [...scalarByKey.values(), ...selected].sort((a, b) => {
      if (a.answerKey === b.answerKey) {
        return b.confidence - a.confidence;
      }

      return Object.keys(ANSWER_LABELS).indexOf(a.answerKey) - Object.keys(ANSWER_LABELS).indexOf(b.answerKey);
    });
  }

  function scoreCandidate(candidate) {
    return candidate.confidence + candidate.evidence.matchedTerms.length * 0.02;
  }

  function handleSuggestionClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const card = button.closest("[data-suggestion-id]");
    const suggestionId = card ? card.getAttribute("data-suggestion-id") : "";
    const action = button.getAttribute("data-action");

    if (!suggestionId) {
      return;
    }

    if (action === "accept") {
      reviewSuggestion(suggestionId, action);
    } else if (action === "edit-accept") {
      const editControl = card.querySelector("[data-edit-value]");
      reviewSuggestion(suggestionId, action, editControl ? editControl.value : "");
    } else if (action === "reject") {
      reviewSuggestion(suggestionId, action);
    } else if (action === "follow-up") {
      reviewSuggestion(suggestionId, action);
    }
  }

  function reviewSuggestion(suggestionId, action, editedValue) {
    const suggestions = readCollection(COLLECTIONS.suggestions);
    const suggestion = suggestions.find((item) => item.id === suggestionId);

    if (!suggestion || suggestion.status !== "pending_review") {
      return;
    }

    let nextSuggestion = suggestion;

    if (action === "accept") {
      nextSuggestion = acceptSuggestion(suggestion, suggestion.suggestedValue, "accepted");
    } else if (action === "edit-accept") {
      nextSuggestion = acceptSuggestion(suggestion, editedValue, "edited_and_accepted");
    } else if (action === "reject") {
      nextSuggestion = {
        ...suggestion,
        status: "rejected",
        reviewDecision: "rejected",
        reviewedAt: new Date().toISOString()
      };
    } else if (action === "follow-up") {
      createOpenQuestion(suggestion);
      nextSuggestion = {
        ...suggestion,
        status: "needs_follow_up",
        reviewDecision: "needs_follow_up",
        reviewedAt: new Date().toISOString()
      };
    }

    saveCollection(
      COLLECTIONS.suggestions,
      suggestions.map((item) => (item.id === suggestionId ? nextSuggestion : item))
    );
    render();
  }

  function acceptSuggestion(suggestion, acceptedValue, decision) {
    const cleanedValue = String(acceptedValue || "").trim();

    if (!cleanedValue) {
      setStatus("Choose a value before accepting the suggestion.", true);
      return suggestion;
    }

    const answers = getAnswers();
    const nextAnswers = { ...answers };

    if (ARRAY_ANSWER_KEYS.has(suggestion.answerKey)) {
      const currentValues = Array.isArray(nextAnswers[suggestion.answerKey])
        ? [...nextAnswers[suggestion.answerKey]]
        : [];

      if (!currentValues.includes(cleanedValue)) {
        currentValues.push(cleanedValue);
      }

      nextAnswers[suggestion.answerKey] = currentValues;
    } else {
      nextAnswers[suggestion.answerKey] = cleanedValue;
    }

    window.RfpWorkspaces.saveAnswers(nextAnswers);
    setStatus(`${ANSWER_LABELS[suggestion.answerKey]} updated.`, false);

    return {
      ...suggestion,
      status: "accepted",
      reviewDecision: decision,
      acceptedValue: cleanedValue,
      acceptedLabel: labelFor(suggestion.answerKey, cleanedValue),
      reviewedAt: new Date().toISOString()
    };
  }

  function createOpenQuestion(suggestion) {
    const questions = readCollection(COLLECTIONS.questions);

    if (questions.some((question) => question.relatedSuggestionId === suggestion.id)) {
      return;
    }

    saveCollection(COLLECTIONS.questions, [
      {
        id: createId("followup"),
        workspaceId: suggestion.workspaceId,
        relatedSuggestionId: suggestion.id,
        relatedQuestionIds: [suggestion.answerKey],
        sourceFactIds: suggestion.sourceFactIds || [],
        questionText: getFollowUpQuestionText(suggestion),
        reason: getFollowUpReason(suggestion),
        priority: suggestion.conflictState === "conflicts_existing_answer" ? "high" : "medium",
        status: "open",
        resolution: "",
        evidence: suggestion.evidence || [],
        createdAt: new Date().toISOString()
      },
      ...questions
    ]);
    setStatus("Follow-up question created.", false);
  }

  function getFollowUpQuestionText(suggestion) {
    const fieldLabel = ANSWER_LABELS[suggestion.answerKey] || formatDisplayLabel(suggestion.answerKey);

    if (suggestion.conflictState === "conflicts_existing_answer") {
      return `Resolve ${fieldLabel}: keep the current answer or use ${suggestion.suggestedLabel}?`;
    }

    if (ARRAY_ANSWER_KEYS.has(suggestion.answerKey)) {
      return `Confirm whether ${suggestion.suggestedLabel} should be added to ${fieldLabel}.`;
    }

    return `Confirm whether ${fieldLabel} should be ${suggestion.suggestedLabel}.`;
  }

  function getFollowUpReason(suggestion) {
    const evidence = (suggestion.evidence || [])[0];
    const matchedTerms = evidence && Array.isArray(evidence.matchedTerms)
      ? evidence.matchedTerms.slice(0, 4)
      : [];

    if (!matchedTerms.length) {
      return "A rule-based source suggestion needs consultant confirmation.";
    }

    return `Rule-based source match from transcript terms: ${matchedTerms.join(", ")}.`;
  }

  function render() {
    const workspace = getWorkspace();
    const documents = readCollection(COLLECTIONS.documents);
    const facts = readCollection(COLLECTIONS.facts);
    const suggestions = readCollection(COLLECTIONS.suggestions);
    const questions = readCollection(COLLECTIONS.questions);
    const riskNotes = readCollection(COLLECTIONS.riskNotes);

    elements.workspaceName.textContent = workspace.name;
    elements.summary.textContent = summaryText(documents, suggestions, questions);
    renderSourceStatusMetrics(suggestions, questions);
    renderRecordSummary(documents, suggestions, questions);
    renderDocuments(documents);
    renderTriageControls(getClientTriageRecords({
      facts,
      suggestions,
      questions,
      riskNotes
    }));
    renderFacts(facts);
    renderSuggestions(suggestions);
    renderOpenQuestions(questions);
    renderRiskGapNotes(riskNotes);
  }

  function summaryText(documents, suggestions, questions) {
    const pending = suggestions.filter((suggestion) => suggestion.status === "pending_review").length;
    const accepted = suggestions.filter((suggestion) => suggestion.status === "accepted").length;
    const open = questions.filter((question) => question.status === "open").length;

    return `${documents.length} source document${documents.length === 1 ? "" : "s"}, ${pending} pending suggestion${pending === 1 ? "" : "s"}, ${accepted} accepted, ${open} open follow-up${open === 1 ? "" : "s"}.`;
  }

  function renderRecordSummary(documents, suggestions, questions) {
    const pending = suggestions.filter((suggestion) => suggestion.status === "pending_review").length;
    const conflicts = suggestions.filter((suggestion) => suggestion.conflictState === "conflicts_existing_answer").length;
    const accepted = suggestions.filter((suggestion) => suggestion.status === "accepted").length;
    const open = questions.filter((question) => question.status === "open").length;
    const items = [
      ["Documents", documents.length],
      ["Pending", pending],
      ["Accepted", accepted],
      ["Conflicts", conflicts],
      ["Follow-up", open]
    ];

    elements.recordSummary.innerHTML = items
      .map(([label, value]) => renderProfileItem(label, value))
      .join("");
  }

  function renderSourceStatusMetrics(suggestions, questions) {
    if (!elements.sourceStatusMetrics) {
      return;
    }

    const confirmedAnswers = countConfirmedAnswers(getAnswers());
    const accepted = suggestions.filter((suggestion) => suggestion.status === "accepted").length;
    const open = questions.filter((question) => question.status === "open").length;

    elements.sourceStatusMetrics.innerHTML = [
      ["Confirmed answers", confirmedAnswers],
      ["Accepted suggestions", accepted],
      ["Open follow-ups", open]
    ]
      .map(([label, value]) => `
        <span>
          <strong>${escapeHtml(value)}</strong>
          ${escapeHtml(label)}
        </span>
      `)
      .join("");
  }

  function getClientTriageRecords(groups) {
    return [
      ...groups.facts.map((record) => ({ record, type: "fact" })),
      ...groups.suggestions.map((record) => ({ record, type: "suggestion" })),
      ...groups.questions.map((record) => ({ record, type: "question" })),
      ...groups.riskNotes.map((record) => ({ record, type: "risk" }))
    ];
  }

  function renderTriageControls(items) {
    if (!elements.triageCounts) {
      return;
    }

    const activeFilter = getActiveTriageFilter();
    const counts = items.reduce((accumulator, item) => {
      const triage = getClientTriage(item.record, item.type);
      accumulator[triage.tier] = (accumulator[triage.tier] || 0) + 1;
      return accumulator;
    }, {});

    const total = items.length;
    const countItems = [
      ["", "All", total],
      ...TRIAGE_ORDER.map((tier) => [tier, TRIAGE_TIERS[tier], counts[tier] || 0])
    ];

    elements.triageCounts.innerHTML = countItems
      .map(([tier, label, value]) => `
        <button
          type="button"
          class="triage-count-chip ${activeFilter === tier ? "triage-count-chip-active" : ""}"
          data-triage-filter="${escapeHtml(tier)}"
        >
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </button>
      `)
      .join("");
  }

  function handleTriageCountClick(event) {
    const button = event.target.closest("[data-triage-filter]");

    if (!button || !elements.triageFilter) {
      return;
    }

    elements.triageFilter.value = button.getAttribute("data-triage-filter") || "";
    render();
  }

  function getActiveTriageFilter() {
    return elements.triageFilter ? elements.triageFilter.value : "";
  }

  function filterByActiveTriage(records, type) {
    const activeFilter = getActiveTriageFilter();

    if (!activeFilter) {
      return records;
    }

    return records.filter((record) => getClientTriage(record, type).tier === activeFilter);
  }

  function getClientTriage(record, type) {
    if (type === "fact") {
      if (!hasClientSourceEvidence(record)) {
        return triage("unsupported_limitation");
      }

      return triageByConfidence(record.confidence, true);
    }

    if (type === "suggestion") {
      if (record.conflictState === "conflicts_existing_answer") {
        return triage("conflict");
      }

      if (normalizeConfidenceForTriage(record.confidence) === "low") {
        return triage("requires_review");
      }

      return normalizeConfidenceForTriage(record.confidence) === "high"
        ? triage("suggested_accept")
        : triage("review_recommended");
    }

    if (type === "question") {
      return normalizePriority(record.priority) === "high"
        ? triage("requires_review")
        : triage("review_recommended");
    }

    if (type === "risk") {
      return normalizePriority(record.severity) === "high"
        ? triage("requires_review")
        : triage("review_recommended");
    }

    return triage("review_recommended");
  }

  function triageByConfidence(confidence, hasSource) {
    if (!hasSource) {
      return triage("unsupported_limitation");
    }

    const normalized = normalizeConfidenceForTriage(confidence);

    if (normalized === "high") {
      return triage("suggested_accept");
    }

    if (normalized === "low") {
      return triage("requires_review");
    }

    return triage("review_recommended");
  }

  function triage(tier) {
    return {
      tier,
      label: TRIAGE_TIERS[tier] || TRIAGE_TIERS.review_recommended
    };
  }

  function renderTriageChip(triageState) {
    return `<span class="staged-badge triage-chip triage-chip-${escapeHtml(triageState.tier)}">${escapeHtml(triageState.label)}</span>`;
  }

  function normalizeConfidenceForTriage(value) {
    const normalized = String(value || "medium").trim().toLowerCase();
    return ["low", "medium", "high"].includes(normalized) ? normalized : "medium";
  }

  function hasClientSourceEvidence(record) {
    if (record.clientSourceDocumentId) {
      return true;
    }

    return Array.isArray(record.evidence) && record.evidence.some((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (!item || typeof item !== "object") {
        return false;
      }

      return Object.values(item).some((value) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        return String(value || "").trim();
      });
    });
  }

  function countConfirmedAnswers(answers) {
    return Object.entries(answers || {}).filter(([key, value]) => {
      if (key === "savedAt") {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== null && value !== undefined && String(value).trim() !== "";
    }).length;
  }

  function renderDocuments(documents) {
    const filteredDocuments = getFilteredDocuments(documents);

    if (!documents.length) {
      elements.documentList.innerHTML = '<p class="staged-muted">No client source documents saved yet.</p>';
      return;
    }

    if (!filteredDocuments.length) {
      elements.documentList.innerHTML = '<p class="staged-muted">No source documents match the current filters.</p>';
      return;
    }

    elements.documentList.innerHTML = filteredDocuments
      .map((documentRecord) => {
        const normalized = normalizeClientSourceDocument(documentRecord);
        return `
          <article class="source-document-item source-document-card">
            <div class="source-document-main">
              <strong>${escapeHtml(normalized.title)}</strong>
              <p>${escapeHtml(normalized.sourceSummary || getSourceSummaryFallback(normalized.rawText))}</p>
              <div class="staged-badge-row">
                <span class="staged-badge">${escapeHtml(labelFromMap(DOCUMENT_TYPES, normalized.documentType))}</span>
                <span class="staged-badge">${escapeHtml(labelFromMap(SOURCE_ORIGINS, normalized.sourceOrigin))}</span>
                <span class="staged-badge">${escapeHtml(labelFromMap(PROCESSING_STATUSES, normalized.processingStatus))}</span>
              </div>
            </div>
            <div class="source-document-meta">
              <span>Created ${escapeHtml(formatDate(normalized.createdAt))}</span>
              <span>Updated ${escapeHtml(formatDate(normalized.updatedAt))}</span>
              <span>${escapeHtml(formatTextLength(normalized.rawText))}</span>
              ${normalized.sourceFile ? `<span>File ${escapeHtml(normalized.sourceFile.name || "local text file")} (${escapeHtml(formatFileSize(normalized.sourceFile.size))})</span>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function getFilteredDocuments(documents) {
    const typeFilter = elements.documentTypeFilter ? elements.documentTypeFilter.value : "";
    const statusFilter = elements.processingStatusFilter ? elements.processingStatusFilter.value : "";
    const searchTerm = elements.documentSearchFilter
      ? elements.documentSearchFilter.value.trim().toLowerCase()
      : "";

    return documents
      .map(normalizeClientSourceDocument)
      .filter((documentRecord) => {
        if (typeFilter && documentRecord.documentType !== typeFilter) {
          return false;
        }

        if (statusFilter && documentRecord.processingStatus !== statusFilter) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        return [
          documentRecord.title,
          documentRecord.sourceSummary,
          documentRecord.rawText
        ].some((value) => String(value || "").toLowerCase().includes(searchTerm));
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  }

  function renderFacts(facts) {
    if (!elements.factList) {
      return;
    }

    if (!facts.length) {
      elements.factList.innerHTML = '<p class="staged-muted">No extracted client source facts yet.</p>';
      return;
    }

    const filteredFacts = filterByActiveTriage(facts, "fact");

    if (!filteredFacts.length) {
      elements.factList.innerHTML = '<p class="staged-muted">No extracted facts match the current triage filter.</p>';
      return;
    }

    elements.factList.innerHTML = [...filteredFacts]
      .sort(sortByConfidenceThenNewest)
      .map((fact) => `
        <article class="client-fact-card status-${escapeHtml(fact.status || "unreviewed")}">
          <div class="staged-badge-row">
            ${renderTriageChip(getClientTriage(fact, "fact"))}
            <span class="staged-badge">${escapeHtml(formatDisplayLabel(fact.confidence || "medium"))}</span>
            <span class="staged-badge">${escapeHtml(statusText(fact.status || "unreviewed"))}</span>
          </div>
          <div>
            <p class="section-kicker">${escapeHtml(formatDisplayLabel(fact.factType || "other"))}</p>
            <h3>${escapeHtml(fact.factText || "Untitled source fact")}</h3>
          </div>
          ${fact.normalizedValue ? renderProfileItem("Normalized value", fact.normalizedValue) : ""}
          ${renderEvidence(fact.evidence || [])}
        </article>
      `)
      .join("");
  }

  function normalizeClientSourceDocument(documentRecord) {
    const rawDocumentType = documentRecord.documentType || "";
    const sourceOrigin = getDocumentSourceOrigin(documentRecord);
    const documentType = DOCUMENT_TYPES[rawDocumentType] ? rawDocumentType : "other";

    return {
      ...documentRecord,
      title: documentRecord.title || "Untitled source document",
      documentType,
      sourceOrigin,
      processingStatus: getDocumentProcessingStatus(documentRecord),
      sourceSummary: documentRecord.sourceSummary || "",
      createdAt: documentRecord.createdAt || documentRecord.updatedAt || "",
      updatedAt: documentRecord.updatedAt || documentRecord.createdAt || "",
      rawText: documentRecord.rawText || ""
    };
  }

  function getDocumentSourceOrigin(documentRecord) {
    if (SOURCE_ORIGINS[documentRecord.sourceOrigin]) {
      return documentRecord.sourceOrigin;
    }

    if (documentRecord.documentType === "manual_ai_assist_source") {
      return "ai_import";
    }

    if (documentRecord.documentType === "pasted_text") {
      return "pasted_text";
    }

    return "manual_entry";
  }

  function getDocumentProcessingStatus(documentRecord) {
    if (PROCESSING_STATUSES[documentRecord.processingStatus]) {
      return documentRecord.processingStatus;
    }

    if (documentRecord.sourceOrigin === "ai_import" || documentRecord.documentType === "manual_ai_assist_source") {
      return "imported";
    }

    return documentRecord.rawText ? "analyzed" : "saved";
  }

  function getSourceSummaryFallback(rawText) {
    const cleanedText = cleanEvidenceExcerpt(rawText);

    if (!cleanedText) {
      return "No source summary provided.";
    }

    return cleanedText.length > 150 ? `${cleanedText.slice(0, 150)}...` : cleanedText;
  }

  function renderSuggestions(suggestions) {
    const answers = getAnswers();

    if (!suggestions.length) {
      elements.suggestionList.innerHTML = '<p class="staged-muted">No suggested project intake answers are waiting for review.</p>';
      return;
    }

    const filteredSuggestions = filterByActiveTriage(suggestions, "suggestion");

    if (!filteredSuggestions.length) {
      elements.suggestionList.innerHTML = '<p class="staged-muted">No suggested project intake answers match the current triage filter.</p>';
      return;
    }

    elements.suggestionList.innerHTML = filteredSuggestions
      .map((suggestion) => renderSuggestionCard(suggestion, answers))
      .join("");
  }

  function renderSuggestionCard(suggestion, answers) {
    const isPending = suggestion.status === "pending_review";
    const conflictClass =
      suggestion.conflictState === "conflicts_existing_answer" ? " suggestion-card-conflict" : "";
    const currentValue = answers[suggestion.answerKey] || suggestion.existingValue || "";
    const statusLabel = statusText(suggestion.status);
    const options = optionLists[suggestion.answerKey] || [];
    const reason = suggestion.suggestionReason || getSuggestionReason(
      suggestion.answerKey,
      suggestion.suggestedValue,
      (suggestion.evidence || [])[0]
    );

    return `
      <article class="suggestion-card${conflictClass}" data-suggestion-id="${escapeHtml(suggestion.id)}">
        <div class="suggestion-card-header">
          <div>
            <p class="section-kicker">${escapeHtml(ANSWER_LABELS[suggestion.answerKey])}</p>
            <h3>${escapeHtml(suggestion.suggestedLabel)}</h3>
          </div>
          <div class="staged-badge-row">
            ${renderTriageChip(getClientTriage(suggestion, "suggestion"))}
            <span class="staged-badge">${escapeHtml(statusLabel)}</span>
            <span class="staged-badge">Rule-based suggestion</span>
            ${renderConflictBadge(suggestion.conflictState)}
          </div>
        </div>

        <div class="source-answer-grid">
          ${renderProfileItem("Suggested value", suggestion.suggestedLabel)}
          ${renderProfileItem("Current answer", formatAnswer(suggestion.answerKey, currentValue))}
        </div>

        <div class="source-rule-note">
          <strong>Why this was suggested</strong>
          <p>${escapeHtml(reason)}</p>
          <span>Rule-based extraction only. Review and confirm before using this answer.</span>
        </div>

        ${renderEvidence(suggestion.evidence || [])}

        ${
          isPending
            ? `
              <div class="suggestion-edit-row">
                <label for="edit-${escapeHtml(suggestion.id)}">Review value</label>
                ${renderEditControl(suggestion, options)}
              </div>
              <div class="review-controls">
                <span class="review-label">Decision</span>
                <button type="button" class="button primary" data-action="accept">Accept</button>
                <button type="button" class="button secondary" data-action="edit-accept">Edit and Accept</button>
                <button type="button" class="button secondary" data-action="follow-up">Needs Follow-up</button>
                <button type="button" class="button secondary button-danger" data-action="reject">Reject</button>
              </div>
            `
            : `<p class="suggestion-reviewed">Reviewed ${escapeHtml(formatDate(suggestion.reviewedAt))}</p>`
        }
      </article>
    `;
  }

  function renderEditControl(suggestion, options) {
    if (!options.length) {
      return `
        <input
          id="edit-${escapeHtml(suggestion.id)}"
          data-edit-value
          type="text"
          value="${escapeHtml(suggestion.suggestedValue)}"
        />
      `;
    }

    return `
      <select id="edit-${escapeHtml(suggestion.id)}" data-edit-value>
        ${options
          .map((option) => {
            const selected = option.value === suggestion.suggestedValue ? "selected" : "";
            return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
          })
          .join("")}
      </select>
    `;
  }

  function renderConflictBadge(conflictState) {
    if (conflictState === "conflicts_existing_answer") {
      return '<span class="staged-badge staged-badge-warning">Conflict</span>';
    }

    if (conflictState === "already_confirmed") {
      return '<span class="staged-badge">Already confirmed</span>';
    }

    if (conflictState === "can_merge") {
      return '<span class="staged-badge">Can merge</span>';
    }

    return "";
  }

  function renderEvidence(evidenceItems) {
    if (!evidenceItems.length) {
      return "";
    }

    return `
      <div class="source-evidence-block">
        <strong>Source Details</strong>
        ${evidenceItems
          .map((item) => {
            const matchedTerms = item.matchedTerms || [];

            return `
              <span class="source-detail-label">Source excerpt</span>
              <blockquote>${escapeHtml(cleanEvidenceExcerpt(item.excerpt))}</blockquote>
              ${
                matchedTerms.length
                  ? `<p><strong>Matched terms</strong>${matchedTerms
                      .map((term) => `<span>${escapeHtml(term)}</span>`)
                      .join("")}</p>`
                  : ""
              }
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderOpenQuestions(questions) {
    if (!questions.length) {
      elements.openQuestionList.innerHTML = '<p class="staged-muted">No open follow-up questions.</p>';
      return;
    }

    const filteredQuestions = filterByActiveTriage(questions, "question");

    if (!filteredQuestions.length) {
      elements.openQuestionList.innerHTML = '<p class="staged-muted">No open follow-up questions match the current triage filter.</p>';
      return;
    }

    elements.openQuestionList.innerHTML = [...filteredQuestions]
      .sort(sortByPriorityThenNewest)
      .map(renderOpenQuestionCard)
      .join("");
  }

  function renderOpenQuestionCard(question) {
    const status = question.status || "open";
    const priority = question.priority || "medium";

    return `
      <details class="open-question-card status-${escapeHtml(status)}" data-open-question-id="${escapeHtml(question.id)}" ${status === "open" ? "open" : ""}>
        <summary>
          <span>
            <strong>${escapeHtml(question.questionText)}</strong>
            <small>${escapeHtml(statusText(status))}</small>
          </span>
          ${renderTriageChip(getClientTriage(question, "question"))}
          <span class="staged-badge ${priority === "high" ? "staged-badge-warning" : ""}">
            ${escapeHtml(formatDisplayLabel(priority))}
          </span>
        </summary>
        <div class="open-question-body">
          <p>${escapeHtml(question.reason || "No reason provided.")}</p>
          ${renderRelatedAnswerLabels(getRelatedAnswerKeys(question))}
          ${renderEvidence(question.evidence || [])}
          <div class="source-review-actions">
            <button type="button" class="button secondary" data-question-action="open">Keep Open</button>
            <button type="button" class="button secondary" data-question-action="addressed">Mark Addressed</button>
            <button type="button" class="button secondary button-danger" data-question-action="dismissed">Dismiss</button>
          </div>
        </div>
      </details>
    `;
  }

  function renderRiskGapNotes(notes) {
    if (!elements.riskGapNoteList) {
      return;
    }

    if (!notes.length) {
      elements.riskGapNoteList.innerHTML = '<p class="staged-muted">No potential issues from source review.</p>';
      return;
    }

    const filteredNotes = filterByActiveTriage(notes, "risk");

    if (!filteredNotes.length) {
      elements.riskGapNoteList.innerHTML = '<p class="staged-muted">No potential issues match the current triage filter.</p>';
      return;
    }

    elements.riskGapNoteList.innerHTML = [...filteredNotes]
      .sort(sortByPriorityThenNewest)
      .map((note) => `
        <article class="risk-gap-note-item status-${escapeHtml(note.status || "open")}" data-risk-note-id="${escapeHtml(note.id)}">
          <div class="risk-gap-note-main">
            <strong>${escapeHtml(note.title || "Untitled potential issue")}</strong>
            <p>${escapeHtml(note.description || "")}</p>
            ${renderRelatedAnswerLabels(note.relatedAnswerKeys || [])}
            ${renderRiskEvidence(note.evidence || [])}
            <div class="source-review-actions">
              <button type="button" class="button secondary" data-risk-action="review">Keep Open / Review</button>
              <button type="button" class="button secondary" data-risk-action="convert">Convert to Follow-Up</button>
              <button type="button" class="button secondary button-danger" data-risk-action="dismiss">Dismiss</button>
            </div>
          </div>
          <div class="staged-badge-row risk-gap-note-badges">
            ${renderTriageChip(getClientTriage(note, "risk"))}
            <span class="staged-badge ${note.severity === "high" ? "staged-badge-warning" : ""}">
              ${escapeHtml(formatDisplayLabel(note.severity || "medium"))}
            </span>
            <span class="staged-badge">${escapeHtml(statusText(note.status || "open"))}</span>
          </div>
        </article>
      `)
      .join("");
  }

  function renderRiskEvidence(evidenceItems) {
    if (!evidenceItems.length) {
      return "";
    }

    return `
      <details class="risk-gap-evidence">
        <summary>Source Details</summary>
        ${evidenceItems
          .map((item) => {
            const matchedTerms = item.matchedTerms || [];
            return `
              <span class="source-detail-label">Source excerpt</span>
              <blockquote>${escapeHtml(cleanEvidenceExcerpt(item.excerpt || ""))}</blockquote>
              ${
                matchedTerms.length
                  ? `<p class="source-matched-terms"><strong>Matched terms</strong>${matchedTerms
                      .map((term) => `<span>${escapeHtml(term)}</span>`)
                      .join("")}</p>`
                  : ""
              }
            `;
          })
          .join("")}
      </details>
    `;
  }

  function handleOpenQuestionClick(event) {
    const button = event.target.closest("[data-question-action]");

    if (!button) {
      return;
    }

    const card = button.closest("[data-open-question-id]");
    const questionId = card ? card.getAttribute("data-open-question-id") : "";
    const action = button.getAttribute("data-question-action");
    const nextStatus = action === "addressed" ? "addressed" : action === "dismissed" ? "dismissed" : "open";

    updateOpenQuestionStatus(questionId, nextStatus);
  }

  function updateOpenQuestionStatus(questionId, status) {
    const questions = readCollection(COLLECTIONS.questions);
    const now = new Date().toISOString();

    saveCollection(
      COLLECTIONS.questions,
      questions.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        return {
          ...question,
          status,
          updatedAt: now,
          resolution: status === "open" ? "" : status
        };
      })
    );
    render();
  }

  function handleRiskGapNoteClick(event) {
    const button = event.target.closest("[data-risk-action]");

    if (!button) {
      return;
    }

    const card = button.closest("[data-risk-note-id]");
    const noteId = card ? card.getAttribute("data-risk-note-id") : "";
    const action = button.getAttribute("data-risk-action");

    updateRiskGapNoteStatus(noteId, action);
  }

  function updateRiskGapNoteStatus(noteId, action) {
    const notes = readCollection(COLLECTIONS.riskNotes);
    const note = notes.find((item) => item.id === noteId);

    if (!note) {
      return;
    }

    const now = new Date().toISOString();
    const convertedOpenQuestionId = action === "convert"
      ? createFollowUpFromRiskGapNote(note, now)
      : note.convertedOpenQuestionId || null;
    const statusByAction = {
      review: "reviewing",
      convert: "converted_to_follow_up",
      dismiss: "dismissed"
    };
    const nextStatus = statusByAction[action] || "open";

    saveCollection(
      COLLECTIONS.riskNotes,
      notes.map((item) => {
        if (item.id !== noteId) {
          return item;
        }

        return {
          ...item,
          status: nextStatus,
          updatedAt: now,
          convertedOpenQuestionId
        };
      })
    );
    render();
  }

  function createFollowUpFromRiskGapNote(note, createdAt) {
    const questions = readCollection(COLLECTIONS.questions);
    const existing = questions.find((question) => question.convertedFromRiskGapNoteId === note.id);

    if (existing) {
      return existing.id;
    }

    const followUp = {
      id: createId("followup"),
      workspaceId: note.workspaceId || getWorkspace().id,
      clientSourceDocumentId: note.clientSourceDocumentId || null,
      relatedSuggestionId: null,
      relatedQuestionIds: note.relatedAnswerKeys || [],
      sourceFactIds: [],
      questionText: note.title || "Review potential issue from source material.",
      reason: note.description || "Potential issue from source review needs consultant review.",
      priority: note.severity || "medium",
      status: "open",
      resolution: "",
      evidence: note.evidence || [],
      convertedFromRiskGapNoteId: note.id,
      importSource: note.importSource || "source_review",
      createdAt
    };

    saveCollection(COLLECTIONS.questions, [followUp, ...questions]);
    return followUp.id;
  }

  function sortByPriorityThenNewest(a, b) {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const priorityDelta =
      (priorityRank[a.priority || a.severity || "medium"] ?? 1) -
      (priorityRank[b.priority || b.severity || "medium"] ?? 1);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getRecordTime(b) - getRecordTime(a);
  }

  function sortByConfidenceThenNewest(a, b) {
    const confidenceRank = { high: 0, medium: 1, low: 2 };
    const confidenceDelta =
      (confidenceRank[normalizeConfidenceForTriage(a.confidence)] ?? 1) -
      (confidenceRank[normalizeConfidenceForTriage(b.confidence)] ?? 1);

    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return getRecordTime(b) - getRecordTime(a);
  }

  function getRecordTime(record) {
    const time = Date.parse(record.updatedAt || record.createdAt || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function getRelatedAnswerKeys(item) {
    return item.relatedAnswerKeys || item.relatedQuestionIds || [];
  }

  function renderRelatedAnswerLabels(keys) {
    const labels = (keys || [])
      .filter((key) => ANSWER_LABELS[key])
      .map((key) => ANSWER_LABELS[key]);

    if (!labels.length) {
      return "";
    }

    return `
      <div class="related-answer-labels">
        <span>Related answers</span>
        ${labels.map((label) => `<strong>${escapeHtml(label)}</strong>`).join("")}
      </div>
    `;
  }

  function renderProfileItem(label, value) {
    const displayValue =
      value === null || value === undefined || String(value).trim() === "" ? "None" : value;

    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(displayValue)}</span>
      </div>
    `;
  }

  function getConflictState(answerKey, suggestedValue, answers) {
    const existingValue = answers[answerKey];

    if (isEmptyAnswer(existingValue)) {
      return "no_conflict";
    }

    if (ARRAY_ANSWER_KEYS.has(answerKey)) {
      const values = Array.isArray(existingValue) ? existingValue : [existingValue];
      return values.includes(suggestedValue) ? "already_confirmed" : "can_merge";
    }

    return existingValue === suggestedValue ? "already_confirmed" : "conflicts_existing_answer";
  }

  function getSuggestionReason(answerKey, suggestedValue, evidence) {
    const label = labelFor(answerKey, suggestedValue);
    const fieldLabel = ANSWER_LABELS[answerKey] || formatDisplayLabel(answerKey);
    const matchedTerms = evidence && Array.isArray(evidence.matchedTerms)
      ? evidence.matchedTerms.slice(0, 4)
      : [];
    const termText = matchedTerms.length
      ? ` because the source text includes ${matchedTerms.map((term) => `"${term}"`).join(", ")}`
      : "";

    if (ARRAY_ANSWER_KEYS.has(answerKey)) {
      return `This rule suggests adding ${label} to ${fieldLabel}${termText}.`;
    }

    return `This rule suggests ${fieldLabel} may be ${label}${termText}.`;
  }

  function cleanEvidenceExcerpt(value) {
    return String(value || "")
      .replace(/\[[0-9:.\-\s]+\]/g, " ")
      .replace(/\b(speaker|participant)\s+\d+\s*:/gi, " ")
      .replace(/\b(interviewer|consultant|client|stakeholder)\s*:/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isEmptyAnswer(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || String(value).trim() === "";
  }

  function getAnswers() {
    return window.RfpWorkspaces.getAnswers() || {};
  }

  function getWorkspace() {
    return window.RfpWorkspaces.getActiveWorkspace();
  }

  function scopedKey(item) {
    return `rfpWorkspace:${getWorkspace().id}:${item}`;
  }

  function readCollection(item) {
    try {
      return JSON.parse(localStorage.getItem(scopedKey(item))) || [];
    } catch (error) {
      return [];
    }
  }

  function saveCollection(item, value) {
    localStorage.setItem(scopedKey(item), JSON.stringify(value));
  }

  function findTerm(text, term) {
    return termRegex(term).test(text);
  }

  function getExcerpt(text, term) {
    const match = termRegex(term).exec(text);
    const index = match ? match.index : 0;
    const start = Math.max(0, index - 80);
    const end = Math.min(text.length, index + term.length + 120);
    const prefix = start > 0 ? "... " : "";
    const suffix = end < text.length ? " ..." : "";

    return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
  }

  function termRegex(term) {
    return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function labelFor(answerKey, value) {
    const lookup = optionLookups[answerKey] || new Map();
    return lookup.get(value) || value;
  }

  function formatAnswer(answerKey, value) {
    if (isEmptyAnswer(value)) {
      return "Not selected";
    }

    if (Array.isArray(value)) {
      return value.map((item) => labelFor(answerKey, item)).join(", ");
    }

    return labelFor(answerKey, value);
  }

  function statusText(status) {
    return formatDisplayLabel(status || "pending_review");
  }

  function formatDisplayLabel(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formatTextLength(value) {
    const length = String(value || "").length;
    return `${length.toLocaleString()} characters`;
  }

  function formatFileSize(value) {
    const size = Number(value);

    if (!Number.isFinite(size) || size < 0) {
      return "size not recorded";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getSelectedDocumentType() {
    const value = elements.documentType ? elements.documentType.value : "";
    return DOCUMENT_TYPES[value] ? value : "other";
  }

  function getSelectedSourceOrigin() {
    const value = elements.sourceOrigin ? elements.sourceOrigin.value : "";
    return SOURCE_ORIGINS[value] ? value : "pasted_text";
  }

  function labelFromMap(map, value) {
    return map[value] || formatDisplayLabel(value || "not_provided");
  }

  function createId(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function hashText(value) {
    let hash = 0;
    const text = String(value || "");

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }

    return `prototype_${Math.abs(hash)}`;
  }

  function setStatus(message, isError) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = message;
    elements.status.classList.toggle("error", Boolean(isError));
  }

  function setAIStatus(message, isError) {
    if (!elements.aiStatus) {
      return;
    }

    elements.aiStatus.textContent = message;
    elements.aiStatus.classList.toggle("error", Boolean(isError));
  }

  function setAIImportStatus(message, isError) {
    if (!elements.aiImportStatus) {
      return;
    }

    elements.aiImportStatus.textContent = message;
    elements.aiImportStatus.classList.toggle("error", Boolean(isError));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();



