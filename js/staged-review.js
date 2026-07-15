(function () {
  const STAGING_URL = "data/import-staging/court-cms-functional-pilot.json";
  const summary = document.getElementById("staged-review-summary");
  const batchSummary = document.getElementById("batch-summary");
  const stagedCount = document.getElementById("staged-count");
  const warningSummary = document.getElementById("warning-summary");
  const filtersRoot = document.getElementById("staged-filters");
  const resultsRoot = document.getElementById("staged-results");
  const REVIEW_EDITS_KEY = "rfpStagedReviewEdits:court-cms-functional-pilot";
  const REVIEW_DECISION_OPTIONS = [
    { value: "staged_unreviewed", label: "Staged Unreviewed" },
    { value: "needs_review", label: "Needs Review" },
    { value: "ready_for_curation", label: "Ready for Curation Review" },
    { value: "needs_source_resolution", label: "Needs Source Resolution" },
    { value: "client_specific", label: "Client Specific" },
    { value: "not_a_requirement", label: "Not a Requirement" }
  ];

  const filterConfig = [
    { key: "sourceStatus", label: "Source Status" },
    { key: "classification", label: "Classification" },
    { key: "promotionReadiness", label: "Promotion Readiness" },
    { key: "duplicateAssessment", label: "Source ID Collision" },
    { key: "sourceCaseCategory", label: "Source Case Category" },
    { key: "sourceFunction", label: "Source Function" },
    { key: "schemaWarnings", label: "Action Warnings" }
  ];

  let stagedBatch = null;
  let stagedRequirements = [];
  let activeFilters = {};
  let activeSummaryFilter = "";
  let stagedReviewEdits = {};

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }

    return String(value);
  }

  function formatDisplayLabel(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "Not provided";
    }

    return text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bCms\b/g, "CMS")
      .replace(/\bRfp\b/g, "RFP")
      .replace(/\bCjis\b/g, "CJIS");
  }

  function formatDisplayValue(value) {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }

    if (String(value).includes("/") || String(value).includes("\\")) {
      return String(value);
    }

    return formatDisplayLabel(value);
  }

  function isBlankScoreWeightWarning(warning) {
    return /^sourceScoreWeight is blank\.?$/i.test(String(warning || "").trim());
  }

  function getActionWarnings(requirement) {
    return (Array.isArray(requirement.schemaWarnings) ? requirement.schemaWarnings : []).filter(
      (warning) => !isBlankScoreWeightWarning(warning)
    );
  }

  function getInformationalNotices(requirement) {
    return (Array.isArray(requirement.schemaWarnings) ? requirement.schemaWarnings : []).filter(
      isBlankScoreWeightWarning
    );
  }

  function formatSchemaWarning(warning) {
    if (isBlankScoreWeightWarning(warning)) {
      return "Score weight not provided in source workbook.";
    }

    return warning;
  }

  function formatFilterOption(key, value) {
    if (key === "duplicateAssessment") {
      return formatSourceIdCollision(value);
    }

    if (key === "schemaWarnings") {
      return formatSchemaWarning(value);
    }

    return formatDisplayValue(value);
  }

  function formatSourceIdCollision(value) {
    if (value === "duplicate_id") {
      return "Draft ID collision";
    }

    if (!value || value === "none") {
      return "None";
    }

    return value;
  }

  function formatPromotionReadiness(value) {
    if (value === "needs_source_resolution") {
      return "Needs source resolution";
    }

    if (value === "needs_review") {
      return "Needs review";
    }

    return formatValue(value);
  }

  function getFilterValue(requirement, key) {
    if (key === "schemaWarnings") {
      return getActionWarnings(requirement);
    }

    return requirement[key] || "";
  }

  function getUniqueFilterValues(key) {
    const values = new Set();

    stagedRequirements.forEach((requirement) => {
      const value = getFilterValue(requirement, key);

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item) {
            values.add(item);
          }
        });
      } else if (value) {
        values.add(value);
      }
    });

    return Array.from(values).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function renderSummaryItem(label, value) {
    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(formatDisplayValue(value))}</span>
      </div>
    `;
  }

  function renderRawSummaryItem(label, value) {
    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(formatValue(value))}</span>
      </div>
    `;
  }

  function renderSummaryItemHtml(label, htmlValue) {
    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${htmlValue}</span>
      </div>
    `;
  }

  function renderBatchSummary() {
    const sourceIdCollisionCount = stagedRequirements.filter(
      (item) => item.duplicateAssessment === "duplicate_id"
    ).length;
    const sourceResolutionCount = stagedRequirements.filter(
      (item) => item.promotionReadiness === "needs_source_resolution"
    ).length;
    const warningCount = stagedRequirements.filter(
      (item) => getActionWarnings(item).length
    ).length;

    batchSummary.innerHTML = [
      renderSummaryItem("Batch ID", stagedBatch.batchId),
      renderRawSummaryItem("Source Package", stagedBatch.sourcePackage),
      renderRawSummaryItem("Source File", stagedBatch.sourceFile),
      renderRawSummaryItem("Source Sheet", stagedBatch.sourceSheet),
      renderSummaryItem("Import Scope", stagedBatch.importScope),
      renderSummaryItem("Promotion Status", stagedBatch.promotionStatus)
    ].join("");

    stagedCount.textContent = `${stagedRequirements.length} staged requirements`;
    summary.textContent = `${stagedRequirements.length} staged requirements loaded from ${stagedBatch.sourceSheet}.`;
    warningSummary.innerHTML = `
      <div class="staged-warning-metrics">
        ${renderSummaryPill(
          "source-id-collision",
          sourceIdCollisionCount,
          "source ID collisions",
          "staged-metric-info"
        )}
        ${renderSummaryPill(
          "source-resolution",
          sourceResolutionCount,
          "source resolution items",
          "staged-metric-resolution"
        )}
        ${renderSummaryPill(
          "action-warnings",
          warningCount,
          "action-needed warnings",
          warningCount ? "staged-metric-warning" : ""
        )}
      </div>
      <div class="staged-issue-help">
        <p><strong>Source ID collision:</strong> the same draft source ID appears on more than one source row; each row may still be a separate requirement candidate.</p>
        <p><strong>Source resolution:</strong> source metadata needs review before promotion decisions.</p>
        <p><strong>Action-needed warnings:</strong> excludes optional blank score weight notices.</p>
      </div>
    `;
  }

  function renderSummaryPill(filterName, count, label, extraClass) {
    const activeClass = activeSummaryFilter === filterName ? " staged-metric-active" : "";
    const className = ["staged-metric", extraClass, activeClass].filter(Boolean).join(" ");

    return `
      <button type="button" class="${className}" data-summary-filter="${escapeHtml(filterName)}">
        ${escapeHtml(count)} ${escapeHtml(label)}
      </button>
    `;
  }

  function renderFilters() {
    filtersRoot.innerHTML = filterConfig
      .map((filter) => {
        const values = getUniqueFilterValues(filter.key);
        const options = values
          .map((value) => {
            const selected = activeFilters[filter.key] === value ? "selected" : "";
            return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(formatFilterOption(filter.key, value))}</option>`;
          })
          .join("");
        const allSelected = activeFilters[filter.key] ? "" : "selected";

        return `
          <label class="staged-filter-field">
            <span>${escapeHtml(filter.label)}</span>
            <select data-staged-filter="${escapeHtml(filter.key)}">
              <option value="" ${allSelected}>All</option>
              ${options}
            </select>
          </label>
        `;
      })
      .join("");

    filtersRoot.querySelectorAll("[data-staged-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        activeFilters[control.dataset.stagedFilter] = control.value;
        activeSummaryFilter = "";
        renderBatchSummary();
        renderResults();
      });
    });
  }

  function bindSummaryActions() {
    warningSummary.addEventListener("click", (event) => {
      const control = event.target.closest("[data-summary-filter]");

      if (!control) {
        return;
      }

      applySummaryFilter(control.dataset.summaryFilter);
    });
  }

  function bindEditActions() {
    resultsRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='save-staged-edit']");

      if (!button) {
        return;
      }

      event.preventDefault();
      saveEditForm(button.closest("[data-edit-key]"));
    });
  }

  function applySummaryFilter(filterName) {
    activeSummaryFilter = activeSummaryFilter === filterName ? "" : filterName;
    activeFilters = {};

    if (activeSummaryFilter === "source-id-collision") {
      activeFilters.duplicateAssessment = "duplicate_id";
    } else if (activeSummaryFilter === "source-resolution") {
      activeFilters.promotionReadiness = "needs_source_resolution";
    }

    renderBatchSummary();
    renderFilters();
    renderResults();
    resultsRoot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function requirementMatchesFilters(requirement) {
    return requirementMatchesSummaryFilter(requirement) && filterConfig.every((filter) => {
      const selected = activeFilters[filter.key];

      if (!selected) {
        return true;
      }

      const value = getFilterValue(requirement, filter.key);

      if (Array.isArray(value)) {
        return value.includes(selected);
      }

      return value === selected;
    });
  }

  function getRequirementKey(requirement) {
    return [
      requirement.sourcePackage,
      requirement.sourceFile,
      requirement.sourceSheet,
      requirement.sourceRow
    ].map((value) => String(value || "")).join("::");
  }

  function readStagedReviewEdits() {
    try {
      return JSON.parse(localStorage.getItem(REVIEW_EDITS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveStagedReviewEdits() {
    localStorage.setItem(REVIEW_EDITS_KEY, JSON.stringify(stagedReviewEdits));
  }

  function getReviewEdit(requirement) {
    return stagedReviewEdits[getRequirementKey(requirement)] || {};
  }

  function getEditableValue(requirement, field) {
    const edit = getReviewEdit(requirement);

    if (edit[field] !== null && edit[field] !== undefined) {
      return edit[field];
    }

    if (field === "reviewDecision") {
      return requirement.reviewStatus || requirement.promotionReadiness || "needs_review";
    }

    if (field === "proposedCategoryId" || field === "proposedFunctionId") {
      return formatDisplayValue(requirement[field]);
    }

    return requirement[field] || "";
  }

  function saveEditForm(form) {
    if (!form) {
      return;
    }

    const editKey = form.dataset.editKey;
    const nextEdit = {
      ...(stagedReviewEdits[editKey] || {}),
      updatedAt: new Date().toISOString()
    };

    form.querySelectorAll("[data-edit-field]").forEach((control) => {
      nextEdit[control.dataset.editField] = control.value.trim();
    });

    stagedReviewEdits = {
      ...stagedReviewEdits,
      [editKey]: nextEdit
    };
    saveStagedReviewEdits();

    const status = form.querySelector("[data-edit-status]");

    if (status) {
      status.textContent = "Saved locally.";
    }
  }

  function requirementMatchesSummaryFilter(requirement) {
    if (activeSummaryFilter === "source-id-collision") {
      return requirement.duplicateAssessment === "duplicate_id";
    }

    if (activeSummaryFilter === "source-resolution") {
      return requirement.promotionReadiness === "needs_source_resolution";
    }

    if (activeSummaryFilter === "action-warnings") {
      return getActionWarnings(requirement).length > 0;
    }

    return true;
  }

  function getRequirementStateClasses(requirement) {
    const classes = ["staged-card"];

    if (requirement.duplicateAssessment === "duplicate_id") {
      classes.push("staged-card-warning");
    }

    if (requirement.promotionReadiness === "needs_source_resolution") {
      classes.push("staged-card-source-resolution");
    }

    return classes.join(" ");
  }

  function renderBadge(label, value, warning) {
    const warningClass = warning === "info" ? " staged-badge-info" : warning ? " staged-badge-warning" : "";
    return `
      <span class="staged-badge${warningClass}">
        <span>${escapeHtml(label)}</span>
        ${escapeHtml(formatValue(value))}
      </span>
    `;
  }

  function renderSchemaWarnings(warnings) {
    if (!Array.isArray(warnings) || !warnings.length) {
      return "";
    }

    return `
      <div class="staged-warning-list">
        ${warnings
          .map((warning) => `<span class="staged-warning-chip">${escapeHtml(formatSchemaWarning(warning))}</span>`)
          .join("")}
      </div>
    `;
  }

  function renderActionWarningBlock(requirement) {
    const warnings = getActionWarnings(requirement);

    if (!warnings.length) {
      return "";
    }

    return `
      <div class="staged-warning-block">
        <strong>Action-needed source warnings</strong>
        ${renderSchemaWarnings(warnings)}
      </div>
    `;
  }

  function renderInformationalNotices(requirement) {
    const notices = getInformationalNotices(requirement);

    if (!notices.length) {
      return "";
    }

    return `
      <section>
        <h3>Informational Import Notices</h3>
        <div class="staged-info-list">
          ${notices
            .map((notice) => `<span class="staged-info-chip">${escapeHtml(formatSchemaWarning(notice))}</span>`)
            .join("")}
        </div>
      </section>
    `;
  }

  function renderTraceability(requirement) {
    const columnMap = getSafeColumnMap(requirement.sourceColumnMap || {});
    const hash = formatValue(requirement.originalTextHash);
    return `
      <div class="staged-trace-grid">
        ${renderRawSummaryItem("Source Package", requirement.sourcePackage)}
        ${renderRawSummaryItem("Source File", requirement.sourceFile)}
        ${renderRawSummaryItem("Source Sheet", requirement.sourceSheet)}
        ${renderRawSummaryItem("Source Row", requirement.sourceRow)}
        ${renderSummaryItemHtml(
          "Original Text Hash",
          `<code class="staged-truncated" title="${escapeHtml(hash)}">${escapeHtml(truncateMiddle(hash, 14, 10))}</code>`
        )}
      </div>
      <details class="staged-json-detail">
        <summary>Technical column map</summary>
        <pre class="staged-json-block">${escapeHtml(JSON.stringify(columnMap, null, 2))}</pre>
      </details>
    `;
  }

  function getSafeColumnMap(columnMap) {
    return Object.entries(columnMap || {}).reduce((safeMap, [key, value]) => {
      const serializedValue = JSON.stringify(value);

      if (/reviewer/i.test(key) || /reviewer/i.test(serializedValue)) {
        return safeMap;
      }

      return {
        ...safeMap,
        [key]: value
      };
    }, {});
  }

  function truncateMiddle(value, startLength, endLength) {
    const text = String(value || "");

    if (text.length <= startLength + endLength + 3) {
      return text;
    }

    return `${text.slice(0, startLength)}...${text.slice(-endLength)}`;
  }

  function renderEditableReview(requirement) {
    const editKey = getRequirementKey(requirement);
    const reviewDecision = getEditableValue(requirement, "reviewDecision");

    return `
      <form class="staged-edit-form" data-edit-key="${escapeHtml(editKey)}">
        <div class="staged-edit-note">
          <strong>Consultant review overlay</strong>
          <span>Saved in this browser only. Raw source values stay read-only.</span>
        </div>

        <div class="staged-edit-grid">
          <label>
            <span>Proposed category label</span>
            <input
              type="text"
              data-edit-field="proposedCategoryId"
              value="${escapeHtml(getEditableValue(requirement, "proposedCategoryId"))}"
            />
          </label>
          <label>
            <span>Proposed function label</span>
            <input
              type="text"
              data-edit-field="proposedFunctionId"
              value="${escapeHtml(getEditableValue(requirement, "proposedFunctionId"))}"
            />
          </label>
          <label>
            <span>Review status</span>
            <select data-edit-field="reviewDecision">
              ${REVIEW_DECISION_OPTIONS.map((option) => {
                const selected = option.value === reviewDecision ? "selected" : "";
                return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
              }).join("")}
            </select>
          </label>
        </div>

        <label class="staged-edit-wide">
          <span>Proposed reusable text</span>
          <textarea data-edit-field="proposedRequirementText">${escapeHtml(getEditableValue(requirement, "proposedRequirementText"))}</textarea>
        </label>

        <label class="staged-edit-wide">
          <span>Normalization notes</span>
          <textarea data-edit-field="normalizationNotes">${escapeHtml(getEditableValue(requirement, "normalizationNotes"))}</textarea>
        </label>

        <div class="staged-edit-actions">
          <button type="button" class="button secondary" data-action="save-staged-edit">Save Review Edits</button>
          <span class="status-message" data-edit-status></span>
        </div>
      </form>
    `;
  }

  function renderRequirementCard(requirement) {
    const collisionWarning = requirement.duplicateAssessment === "duplicate_id";
    const readinessWarning = requirement.promotionReadiness === "needs_source_resolution";
    const consultantReviewStatus = formatDisplayValue(getEditableValue(requirement, "reviewDecision"));

    return `
      <article class="${getRequirementStateClasses(requirement)}">
        <div class="staged-card-header">
          <div>
            <span class="requirement-id">${escapeHtml(requirement.originalRequirementId)}</span>
            <h2>Source row ${escapeHtml(requirement.sourceRow)}</h2>
          </div>
          <div class="staged-badge-row">
            ${renderBadge("Source Status", requirement.sourceStatus, false)}
            ${renderBadge("Consultant Review Status", consultantReviewStatus, false)}
            ${renderBadge("Source ID", formatSourceIdCollision(requirement.duplicateAssessment), collisionWarning ? "info" : false)}
            ${renderBadge("Promotion Readiness", formatPromotionReadiness(requirement.promotionReadiness), readinessWarning)}
          </div>
        </div>

        <div class="staged-meta-grid">
          ${renderSummaryItem("Source Case Category", requirement.sourceCaseCategory)}
          ${renderSummaryItem("Source Function", requirement.sourceFunction)}
          ${renderSummaryItem("Score Weight", requirement.sourceScoreWeight)}
          ${renderSummaryItem("Classification", requirement.classification)}
        </div>

        <p class="staged-requirement-text">${escapeHtml(requirement.originalRequirementText)}</p>

        ${renderActionWarningBlock(requirement)}

        <details class="staged-detail">
          <summary>Source and normalization details</summary>
          <div class="staged-detail-grid">
            <section>
              <h3>Score Notes</h3>
              <p>${escapeHtml(formatValue(requirement.sourceScoreNotes))}</p>
            </section>
            ${renderInformationalNotices(requirement)}
            <section>
              <h3>Proposed Reusable Review</h3>
              ${renderEditableReview(requirement)}
            </section>
            <section>
              <h3>Source Traceability</h3>
              ${renderTraceability(requirement)}
            </section>
          </div>
        </details>
      </article>
    `;
  }

  function renderResults() {
    const filtered = stagedRequirements.filter(requirementMatchesFilters);

    if (!filtered.length) {
      resultsRoot.innerHTML = `
        <section class="empty-state">
          <h2>No staged requirements match the current filters</h2>
          <p>Clear one or more filters to inspect the pilot import.</p>
        </section>
      `;
      summary.textContent = `0 of ${stagedRequirements.length} staged requirements match the current filters.`;
      return;
    }

    summary.textContent = `${filtered.length} of ${stagedRequirements.length} staged requirements shown.`;
    resultsRoot.innerHTML = filtered.map(renderRequirementCard).join("");
  }

  async function loadStagedRequirements() {
    try {
      const response = await fetch(STAGING_URL);

      if (!response.ok) {
        throw new Error(`Unable to load staged requirements: ${response.status}`);
      }

      stagedBatch = await response.json();
      stagedRequirements = Array.isArray(stagedBatch.stagedRequirements)
        ? stagedBatch.stagedRequirements
        : [];
      stagedReviewEdits = readStagedReviewEdits();

      renderBatchSummary();
      renderFilters();
      renderResults();
    } catch (error) {
      summary.classList.add("status-message", "error");
      summary.textContent =
        "The staged requirements could not be loaded. Serve this folder over HTTP and try again.";
    }
  }

  bindSummaryActions();
  bindEditActions();
  loadStagedRequirements();
})();
