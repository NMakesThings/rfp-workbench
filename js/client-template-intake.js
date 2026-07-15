(function () {
  "use strict";

  const STORAGE_KEYS = {
    workspaces: "rfpClientWorkspaces",
    activeWorkspace: "rfpActiveClientWorkspaceId"
  };

  const DELIVERABLE_TYPES = [
    { value: "rfp_package", label: "RFP Package" },
    { value: "assessment_report", label: "Assessment Report" },
    { value: "executive_briefing", label: "Executive Briefing" },
    { value: "implementation_plan", label: "Implementation Plan" },
    { value: "requirements_matrix", label: "Requirements Matrix" },
    { value: "evaluation_scoring_package", label: "Evaluation / Scoring Package" },
    { value: "custom", label: "Other / Custom" }
  ];

  const FILE_WARN_BYTES = 500 * 1024;
  const FILE_BLOCK_BYTES = 2 * 1024 * 1024;
  const FILE_PREVIEW_CHAR_LIMIT = 5000;
  const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const DOCX_EXTRACTION_WARNING = "DOCX extraction preserves text for review, not Word formatting. Tables, comments, tracked changes, images, headers, footers, and page layout may be incomplete or omitted.";

  const CLASSIFICATIONS = [
    { value: "preserve-exactly", label: "Preserve exactly" },
    { value: "consultant-editable", label: "Consultant editable" },
    { value: "insertion-area", label: "Insertion area" },
    { value: "instruction-only", label: "Instruction only" },
    { value: "unknown", label: "Unknown" }
  ];

  const elements = {};
  let activeWorkspace = null;
  let templates = [];
  let currentTemplate = null;
  let pendingTemplateFile = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    populateDeliverableTypes();
    bindEvents();
    activeWorkspace = getActiveWorkspace();

    if (!activeWorkspace) {
      renderNoWorkspace();
      return;
    }

    templates = readTemplates(activeWorkspace.id);
    currentTemplate = templates[0] ? cloneTemplate(templates[0]) : createBlankTemplate();
    renderWorkspace();
  }

  function cacheElements() {
    elements.status = document.getElementById("client-template-status");
    elements.noActive = document.getElementById("client-template-no-active");
    elements.workspace = document.getElementById("client-template-workspace");
    elements.workspaceTitle = document.getElementById("client-template-workspace-title");
    elements.summary = document.getElementById("client-template-summary");
    elements.list = document.getElementById("client-template-list");
    elements.newButton = document.getElementById("client-template-new");
    elements.form = document.getElementById("client-template-form");
    elements.name = document.getElementById("client-template-name");
    elements.deliverableType = document.getElementById("client-template-deliverable-type");
    elements.sourceName = document.getElementById("client-template-source-name");
    elements.version = document.getElementById("client-template-version");
    elements.notes = document.getElementById("client-template-notes");
    elements.rawText = document.getElementById("client-template-raw-text");
    elements.file = document.getElementById("client-template-file");
    elements.fileMetadata = document.getElementById("client-template-file-metadata");
    elements.filePreviewPanel = document.getElementById("client-template-file-preview-panel");
    elements.filePreview = document.getElementById("client-template-file-preview");
    elements.useLoadedFile = document.getElementById("client-template-use-loaded-text");
    elements.clearLoadedFile = document.getElementById("client-template-clear-loaded-file");
    elements.prepPrompt = document.getElementById("client-template-prep-prompt");
    elements.copyPrepPrompt = document.getElementById("client-template-copy-prep-prompt");
    elements.prepCopyStatus = document.getElementById("client-template-prep-copy-status");
    elements.reset = document.getElementById("client-template-reset");
    elements.extract = document.getElementById("client-template-extract");
    elements.addSection = document.getElementById("client-template-add-section");
    elements.sections = document.getElementById("client-template-sections");
  }

  function populateDeliverableTypes() {
    if (!elements.deliverableType) {
      return;
    }

    elements.deliverableType.innerHTML = DELIVERABLE_TYPES
      .map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`)
      .join("");
  }

  function bindEvents() {
    elements.newButton?.addEventListener("click", () => {
      currentTemplate = createBlankTemplate();
      renderWorkspace("Started a new client template.");
    });

    elements.reset?.addEventListener("click", () => {
      currentTemplate = currentTemplate?.id && templates.some((template) => template.id === currentTemplate.id)
        ? cloneTemplate(templates.find((template) => template.id === currentTemplate.id))
        : createBlankTemplate();
      clearPendingTemplateFile(false);
      renderWorkspace("Editor reset.");
    });

    elements.form?.addEventListener("submit", handleSave);
    elements.file?.addEventListener("change", handleFileLoad);
    elements.useLoadedFile?.addEventListener("click", applyPendingTemplateFileText);
    elements.clearLoadedFile?.addEventListener("click", () => clearPendingTemplateFile(true));
    elements.copyPrepPrompt?.addEventListener("click", handleCopyPrepPrompt);
    elements.extract?.addEventListener("click", handleExtractSections);
    elements.addSection?.addEventListener("click", () => {
      syncCurrentFromForm();
      currentTemplate.sections.push(createBlankSection(currentTemplate.sections.length));
      renderEditor("Manual section added.");
    });

    elements.list?.addEventListener("click", handleTemplateListClick);
    elements.sections?.addEventListener("input", handleSectionInput);
    elements.sections?.addEventListener("change", handleSectionInput);
    elements.sections?.addEventListener("click", handleSectionAction);
  }

  function renderNoWorkspace() {
    elements.noActive?.classList.remove("hidden");
    elements.workspace?.classList.add("hidden");
    setStatus("Select a workspace before capturing client templates.", false);
  }

  function renderWorkspace(message) {
    elements.noActive?.classList.add("hidden");
    elements.workspace?.classList.remove("hidden");
    if (elements.workspaceTitle) {
      elements.workspaceTitle.textContent = `${activeWorkspace.name || "Untitled Workspace"} client template intake`;
    }
    renderList();
    renderEditor();
    setStatus(message || "Client templates are stored only inside this workspace.", false);
  }

  function renderEditor(message) {
    if (!currentTemplate) {
      currentTemplate = createBlankTemplate();
    }

    elements.name.value = currentTemplate.templateName || "";
    elements.deliverableType.value = currentTemplate.deliverableType || "custom";
    elements.sourceName.value = currentTemplate.sourceName || "";
    elements.version.value = currentTemplate.versionOrDate || "";
    elements.notes.value = currentTemplate.notes || "";
    elements.rawText.value = currentTemplate.rawTemplateText || "";

    renderSummary();
    renderSections();
    renderList();

    if (message) {
      setStatus(message, false);
    }
  }

  function renderList() {
    if (!elements.list) {
      return;
    }

    if (!templates.length) {
      elements.list.innerHTML = `
        <div class="empty-state client-template-inline-empty">
          <h3>No client templates yet</h3>
          <p>Create a workspace-specific template record by entering metadata and pasting client template text.</p>
        </div>
      `;
      return;
    }

    elements.list.innerHTML = templates.map((template) => {
      const counts = getClassificationCounts(template.sections || []);
      const active = currentTemplate && template.id === currentTemplate.id;
      return `
        <article class="client-template-card${active ? " active" : ""}">
          <div>
            <p class="section-kicker">${escapeHtml(getDeliverableLabel(template.deliverableType))}</p>
            <h3>${escapeHtml(template.templateName || "Untitled Client Template")}</h3>
            <p>${escapeHtml([template.sourceName, template.versionOrDate].filter(Boolean).join(" - ") || "No source details")}</p>
            <dl class="client-template-card-meta">
              <div><dt>Sections</dt><dd>${escapeHtml(String((template.sections || []).length))}</dd></div>
              <div><dt>Insertion</dt><dd>${escapeHtml(String(counts["insertion-area"] || 0))}</dd></div>
              <div><dt>Unknown</dt><dd>${escapeHtml(String(counts.unknown || 0))}</dd></div>
              <div><dt>Updated</dt><dd>${escapeHtml(formatDateTime(template.updatedAt))}</dd></div>
            </dl>
          </div>
          <div class="client-template-card-actions">
            <button type="button" class="button secondary" data-template-action="open" data-template-id="${escapeHtml(template.id)}">Open/Edit</button>
            <button type="button" class="button secondary" data-template-action="duplicate" data-template-id="${escapeHtml(template.id)}">Duplicate</button>
            <button type="button" class="button text-button" data-template-action="delete" data-template-id="${escapeHtml(template.id)}">Delete</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderSummary() {
    if (!elements.summary) {
      return;
    }

    const counts = getClassificationCounts(currentTemplate.sections || []);
    const hasInsertion = (counts["insertion-area"] || 0) > 0;
    const hasRawText = Boolean((currentTemplate.rawTemplateText || "").trim());
    const metadataComplete = Boolean((currentTemplate.templateName || "").trim() && currentTemplate.deliverableType && (currentTemplate.sourceName || "").trim());
    const summaryItems = [
      { label: "Total sections", value: String((currentTemplate.sections || []).length), detail: "Review and adjust before use.", status: currentTemplate.sections?.length ? "ready" : "missing" },
      { label: "Preserve exactly", value: String(counts["preserve-exactly"] || 0), detail: "Client language to protect.", status: "ready" },
      { label: "Consultant editable", value: String(counts["consultant-editable"] || 0), detail: "Sections consultants may revise.", status: "ready" },
      { label: "Insertion areas", value: String(counts["insertion-area"] || 0), detail: hasInsertion ? "At least one insertion area marked." : "No insertion areas marked yet.", status: hasInsertion ? "ready" : "needs-review" },
      { label: "Instruction only", value: String(counts["instruction-only"] || 0), detail: "Client instructions, not output prose.", status: "ready" },
      { label: "Unknown", value: String(counts.unknown || 0), detail: "Classify before relying on template.", status: counts.unknown ? "needs-review" : "ready" },
      { label: "Raw text", value: hasRawText ? "Available" : "Not started", detail: "Paste or load text before extraction.", status: hasRawText ? "ready" : "missing" },
      { label: "Metadata", value: metadataComplete ? "Ready" : "Needs review", detail: "Name, type, and source name recommended.", status: metadataComplete ? "ready" : "needs-review" }
    ];

    elements.summary.innerHTML = summaryItems.map((item) => `
      <article class="library-summary-card client-template-summary-card status-${escapeHtml(item.status)}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.detail)}</small>
      </article>
    `).join("");
  }

  function renderSections() {
    if (!elements.sections) {
      return;
    }

    const sections = currentTemplate.sections || [];
    if (!sections.length) {
      elements.sections.innerHTML = `
        <div class="empty-state client-template-inline-empty">
          <h3>No sections captured yet</h3>
          <p>Paste template text and extract suggested sections, or add a manual section.</p>
        </div>
      `;
      return;
    }

    elements.sections.innerHTML = sections.map((section, index) => `
      <article class="client-template-section-card" data-section-id="${escapeHtml(section.id)}">
        <div class="client-template-section-header">
          <span class="rfp-package-outline-index">${escapeHtml(String(index + 1))}</span>
          <div>
            <p class="section-kicker">Section ${escapeHtml(String(index + 1))}</p>
            <h3>${escapeHtml(section.title || "Untitled section")}</h3>
          </div>
          <div class="client-template-section-row-actions">
            <button type="button" class="button secondary" data-section-action="up" ${index === 0 ? "disabled" : ""}>Move Up</button>
            <button type="button" class="button secondary" data-section-action="down" ${index === sections.length - 1 ? "disabled" : ""}>Move Down</button>
            <button type="button" class="button text-button" data-section-action="delete">Delete</button>
          </div>
        </div>
        <div class="client-template-section-grid">
          <label class="question-field">
            <span>Section title</span>
            <input type="text" data-section-field="title" value="${escapeAttribute(section.title || "")}" />
          </label>
          <label class="question-field">
            <span>Classification</span>
            <select data-section-field="classification">
              ${CLASSIFICATIONS.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === (section.classification || "unknown") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <label class="question-field full-width">
            <span>Section text</span>
            <textarea data-section-field="sectionText" rows="5">${escapeHtml(section.sectionText || "")}</textarea>
          </label>
          <label class="question-field full-width">
            <span>Notes</span>
            <textarea data-section-field="notes" rows="2">${escapeHtml(section.notes || "")}</textarea>
          </label>
        </div>
      </article>
    `).join("");
  }

  function handleTemplateListClick(event) {
    const button = event.target.closest("[data-template-action]");
    if (!button) {
      return;
    }

    const templateId = button.dataset.templateId;
    const action = button.dataset.templateAction;
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    if (action === "open") {
      currentTemplate = cloneTemplate(template);
      renderEditor("Template loaded for editing.");
      return;
    }

    if (action === "duplicate") {
      const now = new Date().toISOString();
      const copy = {
        ...cloneTemplate(template),
        id: createId("template"),
        templateName: `${template.templateName || "Untitled Client Template"} Copy`,
        createdAt: now,
        updatedAt: now,
        sections: (template.sections || []).map((section, index) => ({
          ...section,
          id: createId("section"),
          order: index + 1
        }))
      };
      templates = [copy, ...templates];
      saveTemplates();
      currentTemplate = cloneTemplate(copy);
      renderWorkspace("Template duplicated.");
      return;
    }

    if (action === "delete") {
      const name = template.templateName || "this template";
      if (!window.confirm(`Delete ${name}? This removes only the workspace client template record.`)) {
        return;
      }
      templates = templates.filter((item) => item.id !== templateId);
      saveTemplates();
      currentTemplate = templates[0] ? cloneTemplate(templates[0]) : createBlankTemplate();
      renderWorkspace("Template deleted.");
    }
  }

  function handleSave(event) {
    event.preventDefault();
    syncCurrentFromForm();

    const now = new Date().toISOString();
    const existing = templates.find((template) => template.id === currentTemplate.id);
    const record = {
      ...currentTemplate,
      templateName: currentTemplate.templateName || "Untitled Client Template",
      sourceType: "client-provided",
      createdAt: existing?.createdAt || currentTemplate.createdAt || now,
      updatedAt: now,
      sections: (currentTemplate.sections || []).map((section, index) => ({
        ...section,
        id: section.id || createId("section"),
        order: index + 1,
        classification: isAllowedClassification(section.classification) ? section.classification : "unknown"
      }))
    };

    if (existing) {
      templates = templates.map((template) => template.id === record.id ? record : template);
    } else {
      templates = [record, ...templates];
    }

    saveTemplates();
    currentTemplate = cloneTemplate(record);
    renderWorkspace("Client template saved.");
  }

  async function handleFileLoad(event) {
    const file = event.target.files && event.target.files[0];
    pendingTemplateFile = null;
    renderTemplateFilePreview(null);

    if (!file) {
      return;
    }

    const validation = validateTemplateTextFile(file);
    if (validation.error) {
      setStatus(validation.error, true);
      event.target.value = "";
      return;
    }
    if (validation.blocked) {
      setStatus(validation.message, true);
      event.target.value = "";
      return;
    }

    try {
      pendingTemplateFile = validation.fileKind === "docx"
        ? await loadDocxTemplateFile(file, validation)
        : await loadTextTemplateFile(file, validation);
      renderTemplateFilePreview(pendingTemplateFile);
      const warningText = pendingTemplateFile.metadata.extractionWarnings.length ? ` ${pendingTemplateFile.metadata.extractionWarnings.join(" ")}` : "";
      setStatus(`Loaded ${file.name} for preview. Review it, then choose Use Loaded Text before saving.${warningText}`, pendingTemplateFile.metadata.extractionWarnings.length ? "warning" : false);
    } catch (error) {
      pendingTemplateFile = null;
      renderTemplateFilePreview(null);
      setStatus(error?.message || "The file could not be read. Paste the template text instead.", true);
    } finally {
      event.target.value = "";
    }
  }

  async function loadTextTemplateFile(file, validation) {
    const text = await readTemplateFileAsText(file);
    return {
      text,
      metadata: buildTemplateFileMetadata(file, validation.warnings, { fileKind: "text", extractionMethod: "Local text load" })
    };
  }

  async function loadDocxTemplateFile(file, validation) {
    if (!window.mammoth || typeof window.mammoth.extractRawText !== "function") {
      throw new Error("DOCX extraction is unavailable because the local Mammoth asset did not load. Use .txt or .md until the local asset is available.");
    }

    const arrayBuffer = await readTemplateFileAsArrayBuffer(file);
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    const warnings = [
      ...validation.warnings,
      DOCX_EXTRACTION_WARNING,
      ...getMammothWarnings(result?.messages)
    ];
    const text = normalizeExtractedText(result?.value || "");
    if (!text.trim()) {
      warnings.push("DOCX extraction did not return visible text. Confirm this is a text-based Word document or export it to plain text.");
    }

    return {
      text,
      metadata: buildTemplateFileMetadata(file, warnings, { fileKind: "docx", extractionMethod: "DOCX text extraction" })
    };
  }

  function readTemplateFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The file could not be read. Paste the template text instead."));
      reader.readAsText(file);
    });
  }

  function readTemplateFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The DOCX file could not be read. Try exporting it to .txt or .md and loading that text instead."));
      reader.readAsArrayBuffer(file);
    });
  }

  function applyPendingTemplateFileText() {
    if (!pendingTemplateFile) {
      setStatus("Load a supported text, Markdown, or DOCX file before using loaded text.", true);
      return;
    }

    syncCurrentFromForm();
    currentTemplate.rawTemplateText = pendingTemplateFile.text;
    if (!currentTemplate.sourceName) {
      currentTemplate.sourceName = pendingTemplateFile.metadata.name;
    }
    renderEditor(`${pendingTemplateFile.metadata.name} loaded into Template Text. Review and extract suggested sections when ready.`);
  }

  function clearPendingTemplateFile(showMessage = true) {
    pendingTemplateFile = null;
    if (elements.file) elements.file.value = "";
    renderTemplateFilePreview(null);
    if (showMessage) setStatus("Loaded file preview cleared.", false);
  }

  function validateTemplateTextFile(file) {
    const extension = getFileExtension(file.name);
    const type = String(file.type || "").toLowerCase();
    const warnings = [];
    const isDocx = extension === ".docx" || type === DOCX_MIME_TYPE;
    const isText = extension === ".txt" || extension === ".md" || type === "text/plain" || type === "text/markdown";

    if (!isText && !isDocx) {
      return { error: "This prototype currently supports .txt, .md, and .docx intake only. PDF, Excel, and OCR support are planned future enhancements.", warnings };
    }
    if (file.size > FILE_BLOCK_BYTES) {
      return { blocked: true, message: "This file is too large for this browser-local prototype slice. Use a smaller text/Markdown/DOCX extract or wait for the planned document handling workflow.", warnings };
    }
    if (file.size > FILE_WARN_BYTES) {
      warnings.push("This file is large for browser-local intake. Review performance and local storage limits before saving extracted text.");
    }
    return { warnings, fileKind: isDocx ? "docx" : "text" };
  }

  function buildTemplateFileMetadata(file, warnings, options = {}) {
    const extension = getFileExtension(file.name);
    return {
      name: file.name,
      size: file.size,
      type: options.fileKind === "docx" ? "docx" : file.type || extension.replace(".", "") || "text/plain",
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : "",
      loadedAt: new Date().toISOString(),
      extractionMethod: options.extractionMethod || "Local text load",
      extractionWarnings: Array.isArray(warnings) ? warnings : []
    };
  }

  function renderTemplateFilePreview(fileData) {
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
      ["Last modified", metadata.lastModified ? formatDateTime(metadata.lastModified) : "Not available"],
      ["Loaded", metadata.loadedAt ? formatDateTime(metadata.loadedAt) : "Now"],
      ["Extraction", metadata.extractionMethod || "Local text load"]
    ];
    return `
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || "Not available"))}</dd></div>`).join("")}
      </dl>
      ${metadata.extractionWarnings?.length ? `<ul class="file-intake-warning-list">${metadata.extractionWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
    `;
  }

  function getMammothWarnings(messages) {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages
      .map((message) => String(message?.message || message || "").trim())
      .filter(Boolean)
      .map((message) => `DOCX extraction note: ${message}`);
  }

  function normalizeExtractedText(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\t ]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function getPreviewText(text) {
    const value = String(text || "");
    if (value.length <= FILE_PREVIEW_CHAR_LIMIT) return value;
    return `${value.slice(0, FILE_PREVIEW_CHAR_LIMIT)}\n\n[Preview truncated. Full loaded text will be used if you choose Use Loaded Text.]`;
  }
  async function handleCopyPrepPrompt() {
    const prompt = (elements.prepPrompt?.value || "").trim();
    if (!prompt) {
      setPrepCopyStatus("Template prep prompt is not available.", true);
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      selectPrepPromptText();
      setPrepCopyStatus("Prompt selected. Use Ctrl+C to copy it.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setPrepCopyStatus("Template prep prompt copied.", false);
    } catch (error) {
      selectPrepPromptText();
      setPrepCopyStatus("Clipboard access was blocked. Prompt selected for manual copy.", true);
    }
  }

  function selectPrepPromptText() {
    if (!elements.prepPrompt) {
      return;
    }
    elements.prepPrompt.focus();
    elements.prepPrompt.select();
  }

  function setPrepCopyStatus(message, warning) {
    if (elements.prepCopyStatus) {
      elements.prepCopyStatus.textContent = message || "";
      elements.prepCopyStatus.classList.toggle("warning", Boolean(warning));
    }
    setStatus(message, warning);
  }
  function handleExtractSections() {
    syncCurrentFromForm();
    const rawText = currentTemplate.rawTemplateText || "";
    if (!rawText.trim()) {
      setStatus("Paste or load template text before extracting sections.", true);
      return;
    }

    if (currentTemplate.sections.length && !window.confirm("Replace current sections with suggested sections from the template text?")) {
      return;
    }

    currentTemplate.sections = extractSections(rawText);
    renderEditor(`${currentTemplate.sections.length} suggested section${currentTemplate.sections.length === 1 ? "" : "s"} extracted. Review and adjust before using.`);
  }

  function handleSectionInput(event) {
    const field = event.target.dataset.sectionField;
    const card = event.target.closest("[data-section-id]");
    if (!field || !card || !currentTemplate) {
      return;
    }

    const section = currentTemplate.sections.find((item) => item.id === card.dataset.sectionId);
    if (!section) {
      return;
    }

    section[field] = event.target.value;
    if (field === "classification" && !isAllowedClassification(section[field])) {
      section[field] = "unknown";
    }
    renderSummary();
  }

  function handleSectionAction(event) {
    const button = event.target.closest("[data-section-action]");
    if (!button || !currentTemplate) {
      return;
    }

    const card = button.closest("[data-section-id]");
    const sectionId = card?.dataset.sectionId;
    const index = currentTemplate.sections.findIndex((section) => section.id === sectionId);
    if (index < 0) {
      return;
    }

    const action = button.dataset.sectionAction;
    if (action === "delete") {
      currentTemplate.sections.splice(index, 1);
    } else if (action === "up" && index > 0) {
      const [section] = currentTemplate.sections.splice(index, 1);
      currentTemplate.sections.splice(index - 1, 0, section);
    } else if (action === "down" && index < currentTemplate.sections.length - 1) {
      const [section] = currentTemplate.sections.splice(index, 1);
      currentTemplate.sections.splice(index + 1, 0, section);
    }

    currentTemplate.sections = currentTemplate.sections.map((section, orderIndex) => ({
      ...section,
      order: orderIndex + 1
    }));
    renderEditor();
  }

  function syncCurrentFromForm() {
    if (!currentTemplate) {
      currentTemplate = createBlankTemplate();
    }

    currentTemplate.templateName = elements.name.value.trim();
    currentTemplate.deliverableType = elements.deliverableType.value || "custom";
    currentTemplate.sourceType = "client-provided";
    currentTemplate.sourceName = elements.sourceName.value.trim();
    currentTemplate.versionOrDate = elements.version.value.trim();
    currentTemplate.notes = elements.notes.value.trim();
    currentTemplate.rawTemplateText = elements.rawText.value;
  }

  function extractSections(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    const headingIndexes = [];

    lines.forEach((line, index) => {
      const heading = getHeadingTitle(line);
      if (heading) {
        headingIndexes.push({ index, title: heading });
      }
    });

    if (!headingIndexes.length) {
      return [createSection("Template Text", text.trim(), 0)];
    }

    const sections = [];
    const firstHeading = headingIndexes[0];
    if (firstHeading.index > 0) {
      const preface = lines.slice(0, firstHeading.index).join("\n").trim();
      if (preface) {
        sections.push(createSection("Template Preamble", preface, sections.length));
      }
    }

    headingIndexes.forEach((heading, headingIndex) => {
      const nextHeading = headingIndexes[headingIndex + 1];
      const bodyStart = heading.index + 1;
      const bodyEnd = nextHeading ? nextHeading.index : lines.length;
      const body = lines.slice(bodyStart, bodyEnd).join("\n").trim();
      sections.push(createSection(heading.title, body, sections.length));
    });

    return sections.length ? sections : [createSection("Template Text", text.trim(), 0)];
  }

  function getHeadingTitle(line) {
    const value = String(line || "").trim();
    if (!value || value.length > 140) {
      return "";
    }

    const markdown = value.match(/^#{1,6}\s+(.+)$/);
    if (markdown) {
      return cleanHeading(markdown[1]);
    }

    const section = value.match(/^Section\s+[A-Za-z0-9]+(?:\s*[:.\-]\s*|\s+)(.+)$/i);
    if (section) {
      return cleanHeading(section[1] || value);
    }

    const numbered = value.match(/^(\d+(?:\.\d+)*[.)]?)\s+(.+)$/);
    if (numbered && numbered[2].length >= 3) {
      return cleanHeading(numbered[2]);
    }

    const lettered = value.match(/^([A-Z][.)])\s+(.+)$/);
    if (lettered && lettered[2].length >= 3) {
      return cleanHeading(lettered[2]);
    }

    const hasLetters = /[A-Z]/.test(value);
    const mostlyUppercase = hasLetters && value === value.toUpperCase();
    const terminalSentence = /[.!?]$/.test(value);
    if (mostlyUppercase && value.length >= 4 && value.length <= 80 && !terminalSentence) {
      return cleanHeading(value);
    }

    return "";
  }

  function cleanHeading(value) {
    return String(value || "")
      .replace(/^[-:.\s]+/, "")
      .replace(/[-:.\s]+$/, "")
      .trim() || "Untitled section";
  }

  function createBlankTemplate() {
    const now = new Date().toISOString();
    return {
      id: createId("template"),
      templateName: "",
      deliverableType: "rfp_package",
      sourceType: "client-provided",
      sourceName: "",
      versionOrDate: "",
      notes: "",
      rawTemplateText: "",
      sections: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function createBlankSection(index) {
    return createSection("Untitled section", "", index);
  }

  function createSection(title, sectionText, index) {
    return {
      id: createId("section"),
      title: title || "Untitled section",
      order: index + 1,
      sectionText: sectionText || "",
      classification: "unknown",
      notes: ""
    };
  }

  function readTemplates(workspaceId) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(scopedKey(workspaceId)) || "[]");
      if (!Array.isArray(parsed)) {
        setStatus("Stored client template data was not in the expected list format. Starting with an empty list.", true);
        return [];
      }
      return parsed
        .filter((template) => template && typeof template === "object")
        .map(normalizeTemplate)
        .sort((a, b) => Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""));
    } catch (error) {
      setStatus("Stored client template data could not be read. Starting with an empty list.", true);
      return [];
    }
  }

  function saveTemplates() {
    if (!activeWorkspace) {
      return;
    }

    window.localStorage.setItem(scopedKey(activeWorkspace.id), JSON.stringify(templates));
  }

  function normalizeTemplate(template) {
    const now = new Date().toISOString();
    return {
      id: template.id || createId("template"),
      templateName: template.templateName || "Untitled Client Template",
      deliverableType: DELIVERABLE_TYPES.some((type) => type.value === template.deliverableType) ? template.deliverableType : "custom",
      sourceType: "client-provided",
      sourceName: template.sourceName || "",
      versionOrDate: template.versionOrDate || "",
      notes: template.notes || "",
      rawTemplateText: template.rawTemplateText || "",
      sections: Array.isArray(template.sections)
        ? template.sections.map((section, index) => normalizeSection(section, index))
        : [],
      createdAt: template.createdAt || now,
      updatedAt: template.updatedAt || template.createdAt || now
    };
  }

  function normalizeSection(section, index) {
    return {
      id: section.id || createId("section"),
      title: section.title || "Untitled section",
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1,
      sectionText: section.sectionText || "",
      classification: isAllowedClassification(section.classification) ? section.classification : "unknown",
      notes: section.notes || ""
    };
  }

  function getActiveWorkspace() {
    if (window.RfpWorkspaces?.getActiveWorkspaceOrNull) {
      return window.RfpWorkspaces.getActiveWorkspaceOrNull();
    }

    try {
      const workspaces = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.workspaces) || "[]");
      const activeId = window.localStorage.getItem(STORAGE_KEYS.activeWorkspace) || "";
      return Array.isArray(workspaces) ? workspaces.find((workspace) => workspace.id === activeId) || null : null;
    } catch (error) {
      return null;
    }
  }

  function scopedKey(workspaceId) {
    return `rfpWorkspace:${workspaceId}:clientTemplates`;
  }

  function cloneTemplate(template) {
    return JSON.parse(JSON.stringify(template));
  }

  function createId(prefix) {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getClassificationCounts(sections) {
    return sections.reduce((counts, section) => {
      const key = isAllowedClassification(section.classification) ? section.classification : "unknown";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {
      "preserve-exactly": 0,
      "consultant-editable": 0,
      "insertion-area": 0,
      "instruction-only": 0,
      unknown: 0
    });
  }

  function isAllowedClassification(value) {
    return CLASSIFICATIONS.some((classification) => classification.value === value);
  }

  function getDeliverableLabel(value) {
    return DELIVERABLE_TYPES.find((type) => type.value === value)?.label || "Other / Custom";
  }


  function formatFileSize(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileExtension(name) {
    const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  }

  function formatDateTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  function setStatus(message, warning) {
    if (!elements.status) {
      return;
    }
    elements.status.textContent = message || "";
    elements.status.classList.toggle("warning", Boolean(warning));
    elements.status.classList.toggle("error", false);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();


