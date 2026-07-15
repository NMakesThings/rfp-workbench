(function () {
  const REQUIREMENTS_URL = "data/requirements-library.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const COMPONENTS_URL = "data/rfp-components-library.json";
  const EDITS_KEY = "rfpRequirementsLibraryEdits";
  const ADDS_KEY = "rfpRequirementsLibraryAdds";
  const RETIREMENTS_KEY = "rfpRequirementsLibraryRetirements";
  const ARRAY_FIELDS = [
    "domains",
    "systemTypes",
    "procurementTypes",
    "clientTypes",
    "capabilityCategories",
    "componentTypes"
  ];
  const STATUS_VALUES = ["approved", "draft", "needs_review", "retired", "inactive"];
  const PRIORITY_VALUES = ["critical", "high", "medium", "low"];
  const LEVEL_VALUES = ["must", "should", "could", "optional"];

  const elements = {};
  let baseRequirements = [];
  let effectiveRequirements = [];
  let taxonomyConfig = {};
  let componentConfig = {};
  let edits = {};
  let adds = [];
  let retirements = {};
  let selectedId = "";
  let activeWarningRequirementId = "";
  let validationWarnings = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindElements();
    bindActions();
    await loadLibrary();
  }

  function bindElements() {
    elements.addButton = document.getElementById("library-add-requirement");
    elements.summary = document.getElementById("library-summary");
    elements.validationList = document.getElementById("library-validation-list");
    elements.clearWarningFilter = document.getElementById("library-clear-warning-filter");
    elements.search = document.getElementById("library-search");
    elements.filters = {
      category: document.getElementById("library-filter-category"),
      functionId: document.getElementById("library-filter-function"),
      domain: document.getElementById("library-filter-domain"),
      systemType: document.getElementById("library-filter-system-type"),
      procurementType: document.getElementById("library-filter-procurement-type"),
      componentType: document.getElementById("library-filter-component-type"),
      status: document.getElementById("library-filter-status"),
      priority: document.getElementById("library-filter-priority")
    };
    elements.sort = document.getElementById("library-sort");
    elements.showRetired = document.getElementById("library-show-retired");
    elements.resultsHeading = document.getElementById("library-results-heading");
    elements.resultsSummary = document.getElementById("library-results-summary");
    elements.list = document.getElementById("library-requirements-list");
    elements.editorTitle = document.getElementById("library-editor-title");
    elements.editorRoot = document.getElementById("library-editor-root");
  }

  function bindActions() {
    elements.addButton.addEventListener("click", addRequirement);
    elements.list.addEventListener("click", handleListClick);
    elements.editorRoot.addEventListener("click", handleEditorClick);
    elements.validationList.addEventListener("click", handleWarningClick);
    elements.clearWarningFilter.addEventListener("click", () => {
      activeWarningRequirementId = "";
      render();
    });

    [elements.search, elements.sort, elements.showRetired]
      .filter(Boolean)
      .forEach((control) => {
        control.addEventListener("input", renderList);
        control.addEventListener("change", renderList);
      });

    Object.values(elements.filters).forEach((control) => {
      control.addEventListener("change", renderList);
    });
  }

  async function loadLibrary() {
    try {
      const [requirementsResponse, taxonomyResponse, componentsResponse] = await Promise.all([
        fetch(REQUIREMENTS_URL),
        fetch(TAXONOMY_URL),
        fetch(COMPONENTS_URL)
      ]);

      if (!requirementsResponse.ok) {
        throw new Error(`Unable to load requirements: ${requirementsResponse.status}`);
      }

      const library = await requirementsResponse.json();
      taxonomyConfig = taxonomyResponse.ok ? await taxonomyResponse.json() : {};
      componentConfig = componentsResponse.ok ? await componentsResponse.json() : {};
      baseRequirements = Array.isArray(library.requirements) ? library.requirements : [];
      readOverlays();
      rebuildEffectiveLibrary();
      selectedId = effectiveRequirements[0] ? effectiveRequirements[0].id : "";
      render();
    } catch (error) {
      elements.summary.innerHTML = '<section class="empty-state"><h2>Requirements library could not be loaded</h2><p>Serve this folder over HTTP and try again.</p></section>';
      elements.list.innerHTML = "";
    }
  }

  function readOverlays() {
    edits = readJson(EDITS_KEY, {});
    adds = readJson(ADDS_KEY, []);
    retirements = readJson(RETIREMENTS_KEY, {});
  }

  function saveOverlays() {
    writeJson(EDITS_KEY, edits);
    writeJson(ADDS_KEY, adds);
    writeJson(RETIREMENTS_KEY, retirements);
  }

  function rebuildEffectiveLibrary() {
    effectiveRequirements = [
      ...baseRequirements.map((requirement) => applyOverlay(requirement, false)),
      ...adds.map((requirement) => applyOverlay(requirement, true))
    ];
    validationWarnings = validateLibrary(effectiveRequirements);
  }

  function applyOverlay(requirement, isLocalAdd) {
    const edit = edits[requirement.id];
    const retirement = retirements[requirement.id];
    const fields = edit && edit.fields ? edit.fields : {};
    const merged = {
      ...deepClone(requirement),
      ...deepClone(fields)
    };

    if (requirement.applicability || fields.applicability) {
      merged.applicability = {
        ...(requirement.applicability || {}),
        ...(fields.applicability || {})
      };
    }

    if (retirement) {
      merged.status = retirement.status || "retired";
    }

    merged.__localAdd = Boolean(isLocalAdd);
    merged.__edited = Boolean(edit);
    merged.__retired = Boolean(retirement);
    merged.__changeState = getChangeState(merged);
    return merged;
  }

  function getChangeState(requirement) {
    const states = [];

    if (requirement.__localAdd) {
      states.push("added");
    }

    if (requirement.__edited) {
      states.push("edited");
    }

    if (requirement.__retired) {
      states.push("retired");
    }

    return states.length ? states.join(" / ") : "base";
  }

  function render() {
    rebuildEffectiveLibrary();
    renderSummary();
    renderFilters();
    renderValidation();
    renderList();
    renderEditor();
  }

  function renderSummary() {
    const active = effectiveRequirements.filter((requirement) => !isRetired(requirement)).length;
    const retired = effectiveRequirements.length - active;
    const localChanges = Object.keys(edits).length + adds.length + Object.keys(retirements).length;

    elements.summary.innerHTML = [
      renderSummaryCard("Total requirements", effectiveRequirements.length),
      renderSummaryCard("Active requirements", active),
      renderSummaryCard("Retired / inactive", retired),
      renderSummaryCard("Local edits / additions", localChanges),
      renderSummaryCard("Validation warnings", validationWarnings.length)
    ].join("");
  }

  function renderSummaryCard(label, value) {
    return `
      <article class="library-summary-card">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `;
  }

  function renderFilters() {
    setSelectOptions(elements.filters.category, uniqueValueLabelOptions(effectiveRequirements, "categoryId", "categoryLabel"), "All categories");
    setSelectOptions(elements.filters.functionId, uniqueValueLabelOptions(effectiveRequirements, "functionId", "functionLabel"), "All functions");
    setSelectOptions(elements.filters.domain, referenceOptions("domains", uniqueArrayValues(effectiveRequirements, "domains")), "All domains");
    setSelectOptions(elements.filters.systemType, referenceOptions("systemTypes", uniqueArrayValues(effectiveRequirements, "systemTypes")), "All system types");
    setSelectOptions(elements.filters.procurementType, referenceOptions("procurementTypes", uniqueArrayValues(effectiveRequirements, "procurementTypes")), "All procurement types");
    setSelectOptions(elements.filters.componentType, componentTypeOptions(uniqueArrayValues(effectiveRequirements, "componentTypes")), "All component types");
    setSelectOptions(elements.filters.status, valueOptions(uniqueValues(effectiveRequirements, "status")), "All statuses");
    setSelectOptions(elements.filters.priority, valueOptions(uniqueValues(effectiveRequirements, "priority")), "All priorities");
  }

  function setSelectOptions(select, options, allLabel) {
    const current = select.value;
    const normalizedOptions = options.map((option) => typeof option === "string" ? { value: option, label: formatDisplayLabel(option) } : option);
    select.innerHTML = [
      `<option value="">${escapeHtml(allLabel)}</option>`,
      ...normalizedOptions.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label || formatDisplayLabel(option.value))}</option>`)
    ].join("");
    select.value = normalizedOptions.some((option) => option.value === current) ? current : "";
  }

  function renderValidation() {
    if (!validationWarnings.length) {
      elements.validationList.innerHTML = '<p class="staged-muted">No validation warnings detected in the effective local view.</p>';
      return;
    }

    elements.validationList.innerHTML = validationWarnings
      .slice(0, 80)
      .map((warning) => `
        <button type="button" class="library-warning-item severity-${escapeHtml(warning.severity)}" data-warning-requirement-id="${escapeHtml(warning.id || "")}">
          <span>${escapeHtml(warning.type)}</span>
          <strong>${escapeHtml(warning.id || "Library-wide")}</strong>
          ${escapeHtml(warning.message)}
        </button>
      `)
      .join("");
  }

  function renderList() {
    const requirements = getFilteredRequirements();
    elements.resultsHeading.textContent = "Requirements";
    elements.resultsSummary.textContent = `${requirements.length} of ${effectiveRequirements.length} shown`;

    if (!requirements.length) {
      elements.list.innerHTML = '<p class="staged-muted">No requirements match the current search, filters, and warning selection.</p>';
      return;
    }

    elements.list.innerHTML = `
      <div class="library-row library-row-heading" role="row">
        <span>ID</span>
        <span>Category</span>
        <span>Function</span>
        <span>No.</span>
        <span>Title</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Change</span>
      </div>
      ${requirements.map(renderRequirementRow).join("")}
    `;
  }

  function renderRequirementRow(requirement) {
    const selected = requirement.id === selectedId ? " selected" : "";
    const warningCount = validationWarnings.filter((warning) => warning.id === requirement.id).length;

    return `
      <button type="button" class="library-row${selected}" data-requirement-id="${escapeHtml(requirement.id)}" role="row">
        <span>${escapeHtml(requirement.id || "Missing ID")}</span>
        <span>${escapeHtml(requirement.categoryLabel || requirement.categoryId || "Not provided")}</span>
        <span>${escapeHtml(requirement.functionLabel || requirement.functionId || "Not provided")}</span>
        <span>${escapeHtml(requirement.requirementNumber || "Not provided")}</span>
        <span>${escapeHtml(requirement.title || "Untitled requirement")}</span>
        <span>${escapeHtml(formatDisplayLabel(requirement.status || ""))}</span>
        <span>${escapeHtml(formatDisplayLabel(requirement.priority || ""))}</span>
        <span>
          <strong>${escapeHtml(requirement.__changeState)}</strong>
          ${warningCount ? `<em>${escapeHtml(warningCount)} warning${warningCount === 1 ? "" : "s"}</em>` : ""}
        </span>
      </button>
    `;
  }

  function getFilteredRequirements() {
    const search = elements.search.value.trim().toLowerCase();
    const showRetired = elements.showRetired.checked;
    const statusFilter = elements.filters.status.value;
    const sortKey = elements.sort.value || "category";

    return effectiveRequirements
      .filter((requirement) => showRetired || statusFilter === "retired" || statusFilter === "inactive" || !isRetired(requirement))
      .filter((requirement) => !activeWarningRequirementId || requirement.id === activeWarningRequirementId)
      .filter((requirement) => matchesSearch(requirement, search))
      .filter((requirement) => matchesSelectFilter(requirement, "categoryId", elements.filters.category.value))
      .filter((requirement) => matchesSelectFilter(requirement, "functionId", elements.filters.functionId.value))
      .filter((requirement) => matchesArrayFilter(requirement, "domains", elements.filters.domain.value))
      .filter((requirement) => matchesArrayFilter(requirement, "systemTypes", elements.filters.systemType.value))
      .filter((requirement) => matchesArrayFilter(requirement, "procurementTypes", elements.filters.procurementType.value))
      .filter((requirement) => matchesArrayFilter(requirement, "componentTypes", elements.filters.componentType.value))
      .filter((requirement) => matchesSelectFilter(requirement, "status", statusFilter))
      .filter((requirement) => matchesSelectFilter(requirement, "priority", elements.filters.priority.value))
      .sort((a, b) => compareRequirements(a, b, sortKey));
  }

  function matchesSearch(requirement, search) {
    if (!search) {
      return true;
    }

    const searchable = [
      requirement.id,
      requirement.categoryId,
      requirement.categoryLabel,
      requirement.functionId,
      requirement.functionLabel,
      requirement.requirementNumber,
      requirement.title,
      requirement.text,
      requirement.rationale,
      requirement.responseInstructions,
      requirement.evaluationCriteria,
      requirement.notes,
      ...(requirement.tags || [])
    ].join(" ").toLowerCase();

    return searchable.includes(search);
  }

  function matchesSelectFilter(requirement, field, selected) {
    return !selected || String(requirement[field] || "") === selected;
  }

  function matchesArrayFilter(requirement, field, selected) {
    if (!selected) {
      return true;
    }

    const values = getArrayField(requirement, field);

    if (values.includes(selected)) {
      return true;
    }

    if (field === "domains" && selected !== "all_justice_public_safety" && values.includes("all_justice_public_safety")) {
      return true;
    }

    if (field === "systemTypes" && selected !== "all" && values.includes("all")) {
      return true;
    }

    return false;
  }

  function compareRequirements(a, b, sortKey) {
    const valueMap = {
      category: `${a.categoryLabel || a.categoryId || ""} ${a.functionLabel || ""} ${a.requirementNumber || ""}`,
      function: `${a.functionLabel || a.functionId || ""} ${a.requirementNumber || ""}`,
      requirementNumber: `${a.requirementNumber || ""} ${a.id || ""}`,
      title: a.title || "",
      status: a.status || "",
      priority: a.priority || ""
    };
    const otherMap = {
      category: `${b.categoryLabel || b.categoryId || ""} ${b.functionLabel || ""} ${b.requirementNumber || ""}`,
      function: `${b.functionLabel || b.functionId || ""} ${b.requirementNumber || ""}`,
      requirementNumber: `${b.requirementNumber || ""} ${b.id || ""}`,
      title: b.title || "",
      status: b.status || "",
      priority: b.priority || ""
    };

    return String(valueMap[sortKey] || "").localeCompare(String(otherMap[sortKey] || ""), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  }

  function renderEditor() {
    const requirement = getSelectedRequirement();

    if (!requirement) {
      elements.editorTitle.textContent = "Select a requirement";
      elements.editorRoot.innerHTML = '<p class="staged-muted">Choose a requirement to inspect and edit local admin overlay fields.</p>';
      return;
    }

    elements.editorTitle.textContent = requirement.title || requirement.id || "Untitled requirement";
    elements.editorRoot.innerHTML = `
      <form id="library-editor-form" class="library-editor-form" data-requirement-id="${escapeHtml(requirement.id)}">
        <div class="library-editor-actions">
          <button type="button" class="button primary" data-library-action="save">Save Local Edit</button>
          <button type="button" class="button secondary" data-library-action="revert">${requirement.__localAdd ? "Remove Local Add" : "Revert Local Changes"}</button>
          <button type="button" class="button secondary" data-library-action="duplicate">Duplicate</button>
          <button type="button" class="button secondary button-danger" data-library-action="retire">Retire</button>
        </div>
        <p class="status-message" id="library-editor-status" aria-live="polite"></p>
        <section class="library-editor-section">
          <h3>Reusable requirement fields</h3>
          <div class="library-editor-grid">
            ${renderInput("id", "Requirement ID", requirement.id, !requirement.__localAdd)}
            ${renderInput("categoryId", "Category ID", requirement.categoryId)}
            ${renderInput("categoryLabel", "Category label", requirement.categoryLabel)}
            ${renderInput("functionId", "Function ID", requirement.functionId)}
            ${renderInput("functionLabel", "Function label", requirement.functionLabel)}
            ${renderInput("requirementNumber", "Requirement number", requirement.requirementNumber)}
            ${renderInput("title", "Title", requirement.title)}
            ${renderInput("sectionId", "Section ID", requirement.sectionId)}
            ${renderInput("sectionLabel", "Section label", requirement.sectionLabel)}
            ${renderInput("subsection", "Subsection", requirement.subsection)}
            ${renderInput("sortOrder", "Sort order", requirement.sortOrder, false, "number")}
            ${renderSelect("requirementLevel", "Requirement level", requirement.requirementLevel, LEVEL_VALUES)}
            ${renderSelect("priority", "Priority", requirement.priority, PRIORITY_VALUES)}
            ${renderSelect("status", "Status", requirement.status, STATUS_VALUES)}
            ${renderInput("version", "Version", requirement.version)}
          </div>
          ${renderTextarea("text", "Requirement text", requirement.text)}
          ${renderTextarea("rationale", "Rationale", requirement.rationale)}
          ${renderTextarea("responseInstructions", "Response instructions", requirement.responseInstructions)}
          ${renderTextarea("evaluationCriteria", "Evaluation criteria", requirement.evaluationCriteria)}
          ${renderTextarea("notes", "Notes", requirement.notes)}
          ${renderTextarea("tags", "Tags", (requirement.tags || []).join(", "))}
        </section>
        <section class="library-editor-section">
          <h3>Applicability metadata</h3>
          <div class="library-editor-grid">
            ${ARRAY_FIELDS.map((field) => renderApplicabilityTextarea(field, getArrayField(requirement, field))).join("")}
          </div>
        </section>
        <section class="library-editor-section">
          <h3>Criteria JSON</h3>
          ${renderTextarea("criteria", "Criteria", JSON.stringify(requirement.criteria || {}, null, 2), "library-code-textarea")}
        </section>
        <section class="library-editor-section">
          <h3>Read-only provenance / source fields</h3>
          <div class="library-readonly-grid">
            ${renderReadonly("Source package ID", requirement.sourcePackageId)}
            ${renderReadonly("Source document ID", requirement.sourceDocumentId)}
            ${renderReadonly("Original requirement ID", requirement.originalRequirementId)}
            ${renderReadonly("Source status", requirement.sourceStatus)}
            ${renderReadonly("Review status", requirement.reviewStatus)}
            ${renderReadonly("Reuse assessment", requirement.reuseAssessment)}
            ${renderReadonly("Client specificity", requirement.clientSpecificity)}
          </div>
          <details class="staged-json-detail">
            <summary>Source object and original text</summary>
            <pre class="staged-json-block">${escapeHtml(JSON.stringify({
              source: requirement.source || null,
              originalText: requirement.originalText || ""
            }, null, 2))}</pre>
          </details>
        </section>
      </form>
    `;
  }

  function renderInput(name, label, value, disabled, type) {
    return `
      <label>
        <span>${escapeHtml(label)}</span>
        <input name="${escapeHtml(name)}" type="${escapeHtml(type || "text")}" value="${escapeHtml(value ?? "")}" ${disabled ? "disabled" : ""} />
      </label>
    `;
  }

  function renderSelect(name, label, value, options) {
    return `
      <label>
        <span>${escapeHtml(label)}</span>
        <select name="${escapeHtml(name)}">
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(formatDisplayLabel(option))}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderTextarea(name, label, value, className) {
    return `
      <label class="library-editor-wide">
        <span>${escapeHtml(label)}</span>
        <textarea name="${escapeHtml(name)}" class="${escapeHtml(className || "")}">${escapeHtml(value ?? "")}</textarea>
      </label>
    `;
  }

  function renderApplicabilityTextarea(field, values) {
    const displayValues = values.length
      ? values.map((value) => getApplicabilityDisplayLabel(field, value)).join(", ")
      : "No values set";

    return `
      <label class="library-editor-wide library-applicability-field">
        <span>${escapeHtml(getApplicabilityFieldLabel(field))}</span>
        <span class="library-friendly-values">Display: ${escapeHtml(displayValues)}</span>
        <textarea name="${escapeHtml(`applicability.${field}`)}">${escapeHtml(values.join(", "))}</textarea>
      </label>
    `;
  }

  function renderReadonly(label, value) {
    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(value || "Not provided")}</span>
      </div>
    `;
  }

  function handleListClick(event) {
    const row = event.target.closest("[data-requirement-id]");

    if (!row) {
      return;
    }

    selectedId = row.getAttribute("data-requirement-id");
    renderList();
    renderEditor();
  }

  function handleEditorClick(event) {
    const button = event.target.closest("[data-library-action]");

    if (!button) {
      return;
    }

    event.preventDefault();
    const action = button.getAttribute("data-library-action");

    if (action === "save") {
      saveEditor();
    } else if (action === "revert") {
      revertSelected();
    } else if (action === "duplicate") {
      duplicateSelected();
    } else if (action === "retire") {
      retireSelected();
    }
  }

  function handleWarningClick(event) {
    const warningButton = event.target.closest("[data-warning-requirement-id]");

    if (!warningButton) {
      return;
    }

    const id = warningButton.getAttribute("data-warning-requirement-id");

    if (!id) {
      return;
    }

    activeWarningRequirementId = id;
    selectedId = id;
    renderList();
    renderEditor();
  }

  function saveEditor() {
    const requirement = getSelectedRequirement();
    const form = document.getElementById("library-editor-form");
    const status = document.getElementById("library-editor-status");

    if (!requirement || !form) {
      return;
    }

    const result = collectEditorFields(form);

    if (result.error) {
      setEditorStatus(result.error, true);
      return;
    }

    if (!result.fields.id) {
      setEditorStatus("Requirement ID is required before saving.", true);
      return;
    }

    if (requirement.__localAdd) {
      const oldId = requirement.id;
      const nextLocalAdd = {
        ...deepClone(requirement),
        ...result.fields,
        applicability: {
          ...(requirement.applicability || {}),
          ...(result.fields.applicability || {})
        },
        updatedAt: new Date().toISOString()
      };

      delete nextLocalAdd.__localAdd;
      delete nextLocalAdd.__edited;
      delete nextLocalAdd.__retired;
      delete nextLocalAdd.__changeState;
      adds = adds.map((item) => item.id === oldId ? nextLocalAdd : item);

      if (oldId !== result.fields.id) {
        if (edits[oldId]) {
          edits[result.fields.id] = edits[oldId];
          delete edits[oldId];
        }

        if (retirements[oldId]) {
          retirements[result.fields.id] = retirements[oldId];
          delete retirements[oldId];
        }
      }

      selectedId = result.fields.id;
    } else {
      const { id, ...editableFields } = result.fields;
      edits[requirement.id] = {
        fields: editableFields,
        updatedAt: new Date().toISOString()
      };
    }

    saveOverlays();
    render();
    setEditorStatus("Saved local library overlay.", false);

    if (status) {
      status.focus();
    }
  }

  function collectEditorFields(form) {
    const fields = {
      applicability: {}
    };

    [
      "id",
      "categoryId",
      "categoryLabel",
      "functionId",
      "functionLabel",
      "requirementNumber",
      "title",
      "sectionId",
      "sectionLabel",
      "subsection",
      "requirementLevel",
      "priority",
      "status",
      "version",
      "text",
      "rationale",
      "responseInstructions",
      "evaluationCriteria",
      "notes"
    ].forEach((name) => {
      const control = form.elements[name];

      if (control) {
        fields[name] = control.value.trim();
      }
    });

    const sortControl = form.elements.sortOrder;
    fields.sortOrder = sortControl && sortControl.value !== "" ? Number(sortControl.value) : "";
    fields.tags = parseList(form.elements.tags ? form.elements.tags.value : "");

    ARRAY_FIELDS.forEach((field) => {
      const control = form.elements[`applicability.${field}`];
      fields.applicability[field] = parseList(control ? control.value : "");
    });

    try {
      fields.criteria = JSON.parse(form.elements.criteria.value || "{}");
    } catch (error) {
      return { error: `Criteria JSON is invalid: ${error.message}` };
    }

    return { fields };
  }

  function setEditorStatus(message, isError) {
    const status = document.getElementById("library-editor-status");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.toggle("error", Boolean(isError));
  }

  function addRequirement() {
    const now = new Date().toISOString();
    const requirement = {
      id: generateLocalId("LOCAL-REQ"),
      categoryId: "",
      categoryLabel: "",
      functionId: "",
      functionLabel: "",
      requirementNumber: "",
      title: "New reusable requirement",
      sectionId: "",
      sectionLabel: "",
      subsection: "",
      sortOrder: "",
      requirementLevel: "should",
      priority: "medium",
      status: "draft",
      version: "0.1.0",
      text: "",
      rationale: "",
      responseInstructions: "",
      evaluationCriteria: "",
      applicability: {
        baseline: false,
        domains: [],
        systemTypes: [],
        procurementTypes: [],
        clientTypes: [],
        capabilityCategories: [],
        componentTypes: ["requirement"]
      },
      criteria: {},
      tags: [],
      source: {
        type: "local_admin",
        name: "Requirements Library Manager",
        sourceStatus: "local_add"
      },
      notes: "",
      createdAt: now,
      updatedAt: now
    };

    adds = [requirement, ...adds];
    selectedId = requirement.id;
    saveOverlays();
    render();
  }

  function duplicateSelected() {
    const requirement = getSelectedRequirement();

    if (!requirement) {
      return;
    }

    const copy = deepClone(requirement);
    delete copy.__localAdd;
    delete copy.__edited;
    delete copy.__retired;
    delete copy.__changeState;
    copy.id = generateLocalId(`${copy.categoryId || "REQ"}-${copy.functionId || "COPY"}`);
    copy.title = `${copy.title || "Requirement"} Copy`;
    copy.status = "draft";
    copy.version = "0.1.0";
    copy.source = {
      type: "local_admin_duplicate",
      name: "Requirements Library Manager",
      originalRequirementId: requirement.id,
      sourceStatus: "local_duplicate"
    };
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;

    adds = [copy, ...adds];
    selectedId = copy.id;
    saveOverlays();
    render();
  }

  function retireSelected() {
    const requirement = getSelectedRequirement();

    if (!requirement) {
      return;
    }

    retirements[requirement.id] = {
      status: "retired",
      retiredAt: new Date().toISOString()
    };
    selectedId = requirement.id;
    elements.showRetired.checked = true;
    saveOverlays();
    render();
  }

  function revertSelected() {
    const requirement = getSelectedRequirement();

    if (!requirement) {
      return;
    }

    if (requirement.__localAdd) {
      adds = adds.filter((item) => item.id !== requirement.id);
      delete edits[requirement.id];
      delete retirements[requirement.id];
      selectedId = effectiveRequirements.find((item) => item.id !== requirement.id)?.id || "";
    } else {
      delete edits[requirement.id];
      delete retirements[requirement.id];
      selectedId = requirement.id;
    }

    saveOverlays();
    render();
  }

  function getSelectedRequirement() {
    return effectiveRequirements.find((requirement) => requirement.id === selectedId) || null;
  }

  function validateLibrary(requirements) {
    const warnings = [];
    const idMap = groupBy(requirements, (requirement) => requirement.id || "");
    const numberMap = groupBy(
      requirements.filter((requirement) => requirement.categoryId && requirement.functionId && requirement.requirementNumber),
      (requirement) => [requirement.categoryId, requirement.functionId, requirement.requirementNumber].join("::")
    );
    const textMap = groupBy(
      requirements.filter((requirement) => normalizeText(requirement.text).length > 28),
      (requirement) => normalizeText(requirement.text)
    );

    addDuplicateWarnings(warnings, idMap, "duplicate_id", "Duplicate requirement ID");
    addDuplicateWarnings(warnings, numberMap, "duplicate_number", "Duplicate category/function requirement number");
    addDuplicateWarnings(warnings, textMap, "possible_duplicate_text", "Possible duplicate requirement text");

    requirements.forEach((requirement) => {
      if (!requirement.id) {
        warnings.push(warning(requirement, "missing_id", "high", "Requirement ID is missing."));
      }

      if (!requirement.categoryId || !requirement.functionId) {
        warnings.push(warning(requirement, "missing_category_function", "high", "Category ID and function ID are required."));
      }

      if (!requirement.title) {
        warnings.push(warning(requirement, "missing_title", "high", "Title is missing."));
      }

      if (!requirement.text) {
        warnings.push(warning(requirement, "missing_text", "high", "Requirement text is missing."));
      }

      if (requirement.status && !STATUS_VALUES.includes(requirement.status)) {
        warnings.push(warning(requirement, "invalid_status", "medium", `Status '${requirement.status}' is not in the supported status list.`));
      }

      if (requirement.priority && !PRIORITY_VALUES.includes(requirement.priority)) {
        warnings.push(warning(requirement, "invalid_priority", "medium", `Priority '${requirement.priority}' is not in the supported priority list.`));
      }

      if (requirement.requirementLevel && !LEVEL_VALUES.includes(requirement.requirementLevel)) {
        warnings.push(warning(requirement, "invalid_requirement_level", "medium", `Requirement level '${requirement.requirementLevel}' is not supported.`));
      }

      if (requirement.sortOrder !== "" && requirement.sortOrder !== null && requirement.sortOrder !== undefined && !Number.isFinite(Number(requirement.sortOrder))) {
        warnings.push(warning(requirement, "invalid_sort_order", "medium", "Sort order must be numeric."));
      }

      if (!requirement.criteria || typeof requirement.criteria !== "object" || Array.isArray(requirement.criteria) || !Object.keys(requirement.criteria).length) {
        warnings.push(warning(requirement, "invalid_criteria", "low", "Criteria object is missing or empty."));
      }

      validateApplicabilityValues(warnings, requirement);
    });

    return warnings;
  }

  function validateApplicabilityValues(warnings, requirement) {
    const validators = {
      domains: getTaxonomyIdSet("domains", ["all", "all_justice_public_safety"]),
      systemTypes: getTaxonomyIdSet("systemTypes", ["all"]),
      procurementTypes: getTaxonomyIdSet("procurementTypes", ["all"]),
      clientTypes: getTaxonomyIdSet("clientTypes", ["all"]),
      componentTypes: getComponentTypeIdSet(["requirement"]),
      capabilityCategories: getExistingValueSet("capabilityCategories", [])
    };

    Object.entries(validators).forEach(([field, allowed]) => {
      getArrayField(requirement, field).forEach((value) => {
        if (!allowed.size || allowed.has(value)) {
          return;
        }

        warnings.push(warning(requirement, "invalid_applicability", "medium", `${formatDisplayLabel(field)} contains unsupported value '${value}'.`));
      });
    });
  }

  function addDuplicateWarnings(warnings, groups, type, message) {
    Object.values(groups)
      .filter((group) => group.length > 1)
      .forEach((group) => {
        group.forEach((requirement) => {
          warnings.push(warning(requirement, type, "high", `${message}: ${group.map((item) => item.id || "missing ID").join(", ")}`));
        });
      });
  }

  function warning(requirement, type, severity, message) {
    return {
      id: requirement.id || "",
      type,
      severity,
      message
    };
  }

  function groupBy(items, getKey) {
    return items.reduce((groups, item) => {
      const key = getKey(item);

      if (!key) {
        return groups;
      }

      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  function uniqueValues(requirements, field) {
    return Array.from(new Set(requirements.map((requirement) => requirement[field]).filter(Boolean))).sort();
  }

  function uniqueArrayValues(requirements, field) {
    return Array.from(new Set(requirements.flatMap((requirement) => getArrayField(requirement, field)).filter(Boolean))).sort();
  }

  function uniqueValueLabelOptions(requirements, valueField, labelField) {
    const labelsByValue = new Map();

    requirements.forEach((requirement) => {
      const value = requirement[valueField];

      if (!value) {
        return;
      }

      const label = requirement[labelField] || formatDisplayLabel(value);

      if (!labelsByValue.has(value) || labelsByValue.get(value) === formatDisplayLabel(value)) {
        labelsByValue.set(value, label);
      }
    });

    return sortOptions(Array.from(labelsByValue.entries()).map(([value, label]) => ({ value, label })));
  }

  function referenceOptions(collectionName, existingValues) {
    const optionsByValue = new Map();

    (taxonomyConfig[collectionName] || []).forEach((item) => {
      const value = item.id || item.value;

      if (value) {
        optionsByValue.set(value, item.label || item.name || formatDisplayLabel(value));
      }
    });

    existingValues.forEach((value) => {
      if (!optionsByValue.has(value)) {
        optionsByValue.set(value, getReferenceLabel(collectionName, value));
      }
    });

    return sortOptions(Array.from(optionsByValue.entries()).map(([value, label]) => ({ value, label })));
  }

  function componentTypeOptions(existingValues) {
    const optionsByValue = new Map();

    (componentConfig.componentTypes || []).forEach((item) => {
      const value = item.id || item.value;

      if (value) {
        optionsByValue.set(value, item.label || item.name || formatDisplayLabel(value));
      }
    });

    existingValues.forEach((value) => {
      if (!optionsByValue.has(value)) {
        optionsByValue.set(value, formatDisplayLabel(value));
      }
    });

    return sortOptions(Array.from(optionsByValue.entries()).map(([value, label]) => ({ value, label })));
  }

  function valueOptions(values) {
    return values.map((value) => ({
      value,
      label: formatDisplayLabel(value)
    }));
  }

  function sortOptions(options) {
    return options.sort((a, b) => String(a.label || a.value).localeCompare(String(b.label || b.value), undefined, {
      numeric: true,
      sensitivity: "base"
    }));
  }

  function getReferenceLabel(collectionName, value) {
    const match = (taxonomyConfig[collectionName] || []).find((item) => (item.id || item.value) === value);

    if (match) {
      return match.label || match.name || formatDisplayLabel(value);
    }

    if (value === "all_justice_public_safety") {
      return "All Justice / Public Safety";
    }

    if (value === "all") {
      return "All";
    }

    return formatDisplayLabel(value);
  }

  function getApplicabilityFieldLabel(field) {
    const labels = {
      domains: "Domains",
      systemTypes: "System Types",
      procurementTypes: "Procurement Types",
      clientTypes: "Client Types",
      capabilityCategories: "Capability Categories",
      componentTypes: "Component Types"
    };

    return labels[field] || formatDisplayLabel(field);
  }

  function getApplicabilityDisplayLabel(field, value) {
    if (field === "componentTypes") {
      return getComponentTypeLabel(value);
    }

    if (field === "capabilityCategories") {
      return getCapabilityCategoryLabel(value);
    }

    const taxonomyCollection = {
      domains: "domains",
      systemTypes: "systemTypes",
      procurementTypes: "procurementTypes",
      clientTypes: "clientTypes"
    }[field];

    if (taxonomyCollection) {
      return getReferenceLabel(taxonomyCollection, value);
    }

    return formatDisplayLabel(value);
  }

  function getComponentTypeLabel(value) {
    const match = (componentConfig.componentTypes || []).find((item) => (item.id || item.value) === value);

    if (match) {
      return match.label || match.name || formatDisplayLabel(value);
    }

    return formatDisplayLabel(value);
  }

  function getCapabilityCategoryLabel(value) {
    const crossDomainMatch = (taxonomyConfig.crossDomainCapabilityCategories || []).find((item) => (item.id || item.value) === value);

    if (crossDomainMatch) {
      return crossDomainMatch.label || crossDomainMatch.name || formatDisplayLabel(value);
    }

    const domainSpecificValues = Object.values(taxonomyConfig.domainSpecificCapabilityCategories || {}).flat();
    const domainSpecificMatch = domainSpecificValues.find((item) => {
      if (typeof item === "string") {
        return item === value;
      }

      return (item.id || item.value) === value;
    });

    if (domainSpecificMatch && typeof domainSpecificMatch === "object") {
      return domainSpecificMatch.label || domainSpecificMatch.name || formatDisplayLabel(value);
    }

    return formatDisplayLabel(value);
  }

  function getArrayField(requirement, field) {
    if (Array.isArray(requirement[field])) {
      return requirement[field];
    }

    if (requirement.applicability && Array.isArray(requirement.applicability[field])) {
      return requirement.applicability[field];
    }

    return [];
  }

  function getTaxonomyIdSet(collectionName, extras) {
    return new Set([
      ...(taxonomyConfig[collectionName] || []).map((item) => item.id || item.value).filter(Boolean),
      ...(extras || [])
    ]);
  }

  function getExistingValueSet(field, extras) {
    return new Set([
      ...uniqueArrayValues(effectiveRequirements, field),
      ...(extras || [])
    ]);
  }

  function getComponentTypeIdSet(extras) {
    return new Set([
      ...(componentConfig.componentTypes || []).map((item) => item.id || item.value).filter(Boolean),
      ...uniqueArrayValues(effectiveRequirements, "componentTypes"),
      ...(extras || [])
    ]);
  }

  function isRetired(requirement) {
    return requirement.__retired || requirement.status === "retired" || requirement.status === "inactive";
  }

  function parseList(value) {
    return String(value || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function generateLocalId(prefix) {
    const base = String(prefix || "LOCAL-REQ")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "LOCAL-REQ";
    let index = 1;
    let id = `${base}-${String(index).padStart(3, "0")}`;
    const usedIds = new Set([...baseRequirements, ...adds].map((requirement) => requirement.id));

    while (usedIds.has(id)) {
      index += 1;
      id = `${base}-${String(index).padStart(3, "0")}`;
    }

    return id;
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function formatDisplayLabel(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "Not provided";
    }

    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bCms\b/g, "CMS")
      .replace(/\bRfp\b/g, "RFP")
      .replace(/\bCjis\b/g, "CJIS");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
