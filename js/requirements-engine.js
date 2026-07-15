(function () {
  const REQUIREMENTS_URL = "data/requirements-library.json";
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const GAP_RULES_URL = "data/gap-rules.json";
  const root = document.getElementById("requirements-root");
  const emptyState = document.getElementById("empty-state");
  const summary = document.getElementById("preview-summary");
        const gapReview = document.getElementById("gap-review");
  const projectSpecificFormPanel = document.querySelector(".project-specific-requirements-panel");
  const projectSpecificForm = document.getElementById("project-specific-requirement-form");
  const projectSpecificFields = {
    id: document.getElementById("project-specific-requirement-id"),
    title: document.getElementById("project-specific-title"),
    section: document.getElementById("project-specific-section"),
    category: document.getElementById("project-specific-category"),
    functionLabel: document.getElementById("project-specific-function"),
    priority: document.getElementById("project-specific-priority"),
    text: document.getElementById("project-specific-text"),
    rationale: document.getElementById("project-specific-rationale"),
    responseInstructions: document.getElementById("project-specific-response"),
    sourceNote: document.getElementById("project-specific-source-note"),
    saveButton: document.getElementById("project-specific-save"),
    cancelButton: document.getElementById("project-specific-cancel"),
    status: document.getElementById("project-specific-status")
  };
  const reviewControls = {
    counts: document.getElementById("review-decision-counts"),
    decision: document.getElementById("review-filter-decision"),
    section: document.getElementById("review-filter-section"),
    priority: document.getElementById("review-filter-priority"),
    sourceType: document.getElementById("review-filter-source-type"),
    notes: document.getElementById("review-filter-notes"),
    taxonomy: document.getElementById("review-filter-taxonomy"),
    search: document.getElementById("review-filter-search"),
    sortField: document.getElementById("review-sort-field"),
    sortDirection: document.getElementById("review-sort-direction"),
    viewMode: Array.from(document.querySelectorAll('input[name="requirements-view-mode"]')),
    selectedCount: document.getElementById("requirements-selected-count"),
    batchActions: Array.from(document.querySelectorAll("[data-batch-review-decision]"))
  };

  let selectedRequirements = [];
  let projectSpecificRequirements = [];
  let groupedRequirements = {};
  let taxonomyConfig = {};
  let gapRulesConfig = {};
  let questionsConfig = {};
  let questionLookup = {};
  let reviewControlsBound = false;
  let projectSpecificFormBound = false;
  let reviewFilters = {
    decision: "all",
    section: "all",
    priority: "all",
    sourceType: "all",
    notes: "all",
    taxonomy: "all",
    search: ""
  };
  let reviewSort = {
    field: "default",
    direction: "asc"
  };
  let reviewViewMode = "cards";
  let selectedRequirementIds = new Set();
  const deepLinkRequirementId = new URLSearchParams(window.location.search).get("requirementId");
  let deepLinkAttempted = false;
  let deepLinkFiltersReset = false;

  const reviewDecisionLabels = {
    include: "Include in RFP",
    revise: "Needs Revision",
    clarify: "Needs Client Clarification",
    exclude: "Exclude from RFP"
  };
  const filterDecisionLabels = {
    all: "Total",
    include: "Included",
    exclude: "Excluded",
    revise: "Needs Revision",
    clarify: "Needs Client Clarification",
    no_decision: "No decision"
  };
  const priorityOrder = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4
  };
  const decisionOrder = {
    no_decision: 0,
    include: 1,
    revise: 2,
    clarify: 3,
    exclude: 4
  };

  function getSavedAnswers() {
    return window.RfpWorkspaces.getAnswers();
  }

  function getSavedReviewDecisions() {
    return window.RfpWorkspaces.getReviewDecisions();
  }

  function getSavedReviewNotes() {
    if (window.RfpWorkspaces.getRequirementReviewNotes) {
      return window.RfpWorkspaces.getRequirementReviewNotes();
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();

    return {
      version: 1,
      workspaceId: workspace ? workspace.id : "",
      updatedAt: new Date().toISOString(),
      notes: {}
    };
  }

  function saveReviewNotes(notesWrapper) {
    if (window.RfpWorkspaces.saveRequirementReviewNotes) {
      return window.RfpWorkspaces.saveRequirementReviewNotes(notesWrapper);
    }

    return notesWrapper;
  }

  function getSavedProjectSpecificRequirements() {
    if (window.RfpWorkspaces.getProjectSpecificRequirements) {
      return window.RfpWorkspaces.getProjectSpecificRequirements();
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();

    return {
      version: 1,
      workspaceId: workspace ? workspace.id : "",
      updatedAt: new Date().toISOString(),
      requirements: []
    };
  }

  function saveProjectSpecificRequirements(requirementsWrapper) {
    if (window.RfpWorkspaces.saveProjectSpecificRequirements) {
      return window.RfpWorkspaces.saveProjectSpecificRequirements(requirementsWrapper);
    }

    return requirementsWrapper;
  }

  function saveReviewDecision(requirementId, decision) {
    const decisions = getSavedReviewDecisions();

    if (decision === "no_decision") {
      delete decisions[requirementId];
    } else {
      decisions[requirementId] = decision;
    }

    window.RfpWorkspaces.saveReviewDecisions(decisions);
  }

  function getReviewDecision(requirementId) {
    return getSavedReviewDecisions()[requirementId] || "no_decision";
  }

  function getReviewDecisionLabel(requirementId) {
    const decision = getReviewDecision(requirementId);
    return reviewDecisionLabels[decision] || filterDecisionLabels[decision] || filterDecisionLabels.no_decision;
  }

  function getRequirementReviewNoteEntry(requirementId) {
    const reviewNotes = getSavedReviewNotes();
    const notes = reviewNotes && reviewNotes.notes && typeof reviewNotes.notes === "object"
      ? reviewNotes.notes
      : {};

    return notes[requirementId] || null;
  }

  function getRequirementReviewNote(requirementId) {
    const entry = getRequirementReviewNoteEntry(requirementId);
    return entry ? String(entry.note || "") : "";
  }

  function saveRequirementReviewNote(requirementId, note) {
    const reviewNotes = getSavedReviewNotes();
    const notes = {
      ...(reviewNotes.notes || {})
    };
    const trimmedNote = String(note || "").trim();
    const now = new Date().toISOString();

    if (trimmedNote) {
      notes[requirementId] = {
        note: trimmedNote,
        updatedAt: now
      };
    } else {
      delete notes[requirementId];
    }

    return saveReviewNotes({
      ...reviewNotes,
      updatedAt: now,
      notes
    });
  }

  function createProjectSpecificRequirementId() {
    if (window.crypto && window.crypto.randomUUID) {
      return `PSR-${window.crypto.randomUUID()}`;
    }

    return `PSR-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getProjectSpecificWrapper() {
    const wrapper = getSavedProjectSpecificRequirements();

    return {
      ...wrapper,
      requirements: Array.isArray(wrapper.requirements) ? wrapper.requirements : []
    };
  }

  function saveProjectSpecificWrapper(wrapper) {
    const saved = saveProjectSpecificRequirements(wrapper);

    projectSpecificRequirements = mapProjectSpecificRequirementsToReviewItems(saved.requirements || []);
    groupedRequirements = groupBySection(getAllReviewRequirements());
    window.rfpProjectSpecificRequirements = projectSpecificRequirements;
    window.rfpReviewRequirements = getAllReviewRequirements();
    renderReviewFilterOptions();
    syncReviewControlState();
    renderDisplayRequirements();
    return saved;
  }

  function deleteReviewDecision(requirementId) {
    const decisions = getSavedReviewDecisions();
    delete decisions[requirementId];
    window.RfpWorkspaces.saveReviewDecisions(decisions);
  }

  function mapProjectSpecificRequirementsToReviewItems(requirements) {
    return requirements.map((requirement, index) => ({
      id: requirement.id,
      title: requirement.title,
      section: requirement.section || "Project-Specific Requirements",
      sectionLabel: requirement.section || "Project-Specific Requirements",
      categoryLabel: requirement.category || "Project Specific",
      functionLabel: requirement.function || "Project Specific",
      requirementLevel: "project-specific",
      priority: requirement.priority || "unspecified",
      status: "project_specific",
      text: requirement.requirementText,
      rationale: requirement.rationale,
      responseInstructions: requirement.responseInstructions,
      selectionReasons: ["Project-specific requirement added for this workspace."],
      sortOrder: 100000 + index,
      sourceNote: requirement.sourceNote,
      sourceType: "project_specific",
      isProjectSpecific: true,
      originalProjectSpecificRequirement: requirement
    }));
  }

  function getAllReviewRequirements() {
    return [...selectedRequirements, ...projectSpecificRequirements];
  }

  function isExportable(requirement) {
    return getReviewDecision(requirement.id) !== "exclude";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatFallbackLabel(value) {
    if (!value) {
      return "Not selected";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function lowerFirst(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function getOptionList(question) {
    if (question.optionSource && Array.isArray(taxonomyConfig[question.optionSource])) {
      return taxonomyConfig[question.optionSource].map((item) => ({
        value: item.id,
        label: item.label
      }));
    }

    return Array.isArray(question.options) ? question.options : [];
  }

  function getQuestionDisplayLabel(question) {
    if (!question) {
      return "Interview answer";
    }

    if (question.id === "integration_partners") {
      return "Integration Partners";
    }

    return question.label || formatFallbackLabel(question.id);
  }

  function buildQuestionLookup(config) {
    const lookup = {};
    const sections = Array.isArray(config.sections) ? config.sections : [];

    sections.forEach((section) => {
      const questions = Array.isArray(section.questions) ? section.questions : [];

      questions.forEach((question) => {
        const optionMap = new Map();

        getOptionList(question).forEach((option) => {
          optionMap.set(option.value, option.label || formatFallbackLabel(option.value));
        });

        lookup[question.id] = {
          id: question.id,
          label: getQuestionDisplayLabel(question),
          optionMap
        };
      });
    });

    return lookup;
  }

  function getQuestionLabel(answerKey) {
    return questionLookup[answerKey]?.label || formatFallbackLabel(answerKey);
  }

  function getSentenceQuestionLabel(answerKey) {
    const label = questionLookup[answerKey]?.label;
    return label ? lowerFirst(label) : formatFallbackLabel(answerKey).toLowerCase();
  }

  function getAnswerLabel(answerKey, value) {
    const answer = questionLookup[answerKey];
    return answer?.optionMap?.get(value) || formatFallbackLabel(value);
  }

  function getTaxonomyLabel(collectionName, value) {
    const collection = taxonomyConfig[collectionName];

    if (!Array.isArray(collection)) {
      return formatFallbackLabel(value);
    }

    const match = collection.find((item) => item.id === value);
    return match ? match.label : formatFallbackLabel(value);
  }


  function valueMatchesExpected(answer, expectedValues) {
    if (!Array.isArray(expectedValues) || expectedValues.length === 0) {
      return true;
    }

    if (Array.isArray(answer)) {
      return expectedValues.some((expected) => answer.includes(expected));
    }

    return expectedValues.includes(answer);
  }

  function valueMatchesMissing(answer, missingValue) {
    if (missingValue === null) {
      return answer === null || answer === undefined;
    }

    if (Array.isArray(missingValue)) {
      return Array.isArray(answer) && answer.length === missingValue.length;
    }

    return answer === missingValue;
  }

  function ruleRequirementsSatisfied(rule, answers) {
    if (!rule.requires) {
      return true;
    }

    return Object.entries(rule.requires).every(([answerKey, expectedValues]) =>
      valueMatchesExpected(answers[answerKey], expectedValues)
    );
  }

  function gapRuleApplies(rule, answers) {
    if (!ruleRequirementsSatisfied(rule, answers)) {
      return false;
    }

    const answer = answers[rule.answerKey];

    if (Array.isArray(rule.missingWhen)) {
      return rule.missingWhen.some((missingValue) => valueMatchesMissing(answer, missingValue));
    }

    if (Array.isArray(rule.mustInclude)) {
      return !valueMatchesExpected(answer, rule.mustInclude);
    }

    return false;
  }

  function sortGapRules(rules) {
    const severityOrder = {
      high: 1,
      medium: 2,
      low: 3
    };

    return [...rules].sort((a, b) => {
      const severityDiff = (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function renderGapReview(answers) {
    if (!gapReview) {
      return;
    }

    const rules = Array.isArray(gapRulesConfig.rules) ? gapRulesConfig.rules : [];
    const triggeredRules = sortGapRules(rules.filter((rule) => gapRuleApplies(rule, answers)));

    if (!triggeredRules.length) {
      gapReview.innerHTML = `<p class="gap-empty">No configured gaps triggered.</p>`;
      window.rfpGapReview = [];
      return;
    }

    gapReview.innerHTML = `
      <ul class="gap-list">
        ${triggeredRules
          .map((rule) => `
            <li class="gap-item gap-${escapeHtml(rule.severity || "low")}">
              <span class="gap-severity">${escapeHtml(rule.severity || "low")}</span>
              <div>
                <strong>${escapeHtml(rule.title || "Untitled gap")}</strong>
                <p>${escapeHtml(rule.description || "")}</p>
              </div>
            </li>
          `)
          .join("")}
      </ul>
    `;
    window.rfpGapReview = triggeredRules;
  }

  function renderPreviewContext(answers) {
    renderGapReview(answers);
  }

  function answerIncludes(answer, expectedValues) {
    if (!Array.isArray(expectedValues) || expectedValues.length === 0) {
      return true;
    }

    if (Array.isArray(answer)) {
      return expectedValues.some((expected) => answer.includes(expected));
    }

    return expectedValues.includes(answer);
  }

  function answerExcludes(answer, excludedValues) {
    if (!Array.isArray(excludedValues) || excludedValues.length === 0) {
      return true;
    }

    if (Array.isArray(answer)) {
      return !excludedValues.some((excluded) => answer.includes(excluded));
    }

    return !excludedValues.includes(answer);
  }

  function getMatchedValues(answer, expectedValues) {
    if (!Array.isArray(expectedValues) || expectedValues.length === 0) {
      return [];
    }

    if (Array.isArray(answer)) {
      return expectedValues.filter((expected) => answer.includes(expected));
    }

    return expectedValues.includes(answer) ? [answer] : [];
  }

  function formatAnswerReason(answerKey, matchedValues, answer) {
    if (!matchedValues.length) {
      return "";
    }

    const questionLabel = getSentenceQuestionLabel(answerKey);
    const valueLabels = matchedValues.map((value) => getAnswerLabel(answerKey, value));
    const verb = Array.isArray(answer) || matchedValues.length > 1 ? "includes" : "is";

    return `Selected because ${questionLabel} ${verb} ${valueLabels.join(", ")}.`;
  }

  function matchesCriteria(requirement, answers) {
    const criteria = requirement.criteria || {};

    if (criteria.always) {
      return true;
    }

    if (criteria.any) {
      const anyMatch = Object.entries(criteria.any).some(([answerKey, expectedValues]) =>
        answerIncludes(answers[answerKey], expectedValues)
      );

      if (!anyMatch) {
        return false;
      }
    }

    if (criteria.all) {
      const allMatch = Object.entries(criteria.all).every(([answerKey, expectedValues]) =>
        answerIncludes(answers[answerKey], expectedValues)
      );

      if (!allMatch) {
        return false;
      }
    }

    if (criteria.none) {
      const noneMatch = Object.entries(criteria.none).every(([answerKey, excludedValues]) =>
        answerExcludes(answers[answerKey], excludedValues)
      );

      if (!noneMatch) {
        return false;
      }
    }

    return Boolean(criteria.any || criteria.all || criteria.none);
  }

  function getSelectionReasons(requirement, answers) {
    const criteria = requirement.criteria || {};
    const reasons = [];

    if (criteria.always) {
      reasons.push("Baseline requirement included for all procurement projects.");
    }

    if (criteria.any) {
      Object.entries(criteria.any).forEach(([answerKey, expectedValues]) => {
        const matchedValues = getMatchedValues(answers[answerKey], expectedValues);
        const reason = formatAnswerReason(answerKey, matchedValues, answers[answerKey]);

        if (reason) {
          reasons.push(reason);
        }
      });
    }

    if (criteria.all) {
      Object.entries(criteria.all).forEach(([answerKey, expectedValues]) => {
        const matchedValues = getMatchedValues(answers[answerKey], expectedValues);
        const reason = formatAnswerReason(answerKey, matchedValues, answers[answerKey]);

        if (reason) {
          reasons.push(reason);
        }
      });
    }

    if (criteria.none) {
      Object.entries(criteria.none).forEach(([answerKey]) => {
        reasons.push(`Selected because ${getSentenceQuestionLabel(answerKey)} does not include excluded values.`);
      });
    }

    return reasons.length ? reasons : ["Matched the current interview answers."];
  }

  function groupBySection(requirements) {
    return requirements.reduce((groups, requirement) => {
      const section = requirement.sectionLabel || requirement.section || "Uncategorized";

      if (!groups[section]) {
        groups[section] = [];
      }

      groups[section].push(requirement);
      return groups;
    }, {});
  }

  function sortRequirements(requirements) {
    return [...requirements].sort((a, b) => {
      const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : 9999;
      const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : 9999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  function getRequirementSection(requirement) {
    return requirement.sectionLabel || requirement.section || "Uncategorized";
  }

  function getRequirementTaxonomyValue(requirement, kind) {
    if (kind === "category") {
      return requirement.categoryLabel || requirement.categoryId || "Uncategorized";
    }

    if (kind === "function") {
      return requirement.functionLabel || requirement.functionId || "Unspecified";
    }

    return "";
  }

  function getDecisionCounts() {
    const decisions = getSavedReviewDecisions();
    const allRequirements = getAllReviewRequirements();

    return {
      all: allRequirements.length,
      include: allRequirements.filter((requirement) => getReviewDecision(requirement.id) === "include").length,
      exclude: allRequirements.filter((requirement) => getReviewDecision(requirement.id) === "exclude").length,
      revise: allRequirements.filter((requirement) => getReviewDecision(requirement.id) === "revise").length,
      clarify: allRequirements.filter((requirement) => getReviewDecision(requirement.id) === "clarify").length,
      no_decision: allRequirements.filter((requirement) =>
        !decisions[requirement.id] || decisions[requirement.id] === "no_decision"
      ).length
    };
  }

  function getProgressCounts() {
    const allRequirements = getAllReviewRequirements();

    return {
      project_specific: allRequirements.filter((requirement) => requirement.isProjectSpecific).length,
      has_notes: allRequirements.filter((requirement) => Boolean(getRequirementReviewNote(requirement.id))).length,
      exportable: allRequirements.filter(isExportable).length
    };
  }

  function renderDecisionCounts() {
    if (!reviewControls.counts) {
      return;
    }

    const counts = getDecisionCounts();
    const progressCounts = getProgressCounts();
    const activeDecision = reviewFilters.decision || "all";

    const decisionChips = Object.entries(filterDecisionLabels)
      .map(([value, label]) => `
        <button
          type="button"
          class="review-count-chip${activeDecision === value ? " active" : ""}"
          data-review-filter-decision="${escapeHtml(value)}"
        >
          <strong>${escapeHtml(counts[value] ?? 0)}</strong>
          <span>${escapeHtml(label)}</span>
        </button>
      `)
      .join("");
    const progressChips = [
      ["project_specific", "Project Specific"],
      ["has_notes", "Has Notes"],
      ["exportable", "Exportable"]
    ]
      .map(([value, label]) => `
        <span class="review-count-chip review-count-chip-static">
          <strong>${escapeHtml(progressCounts[value] ?? 0)}</strong>
          <span>${escapeHtml(label)}</span>
        </span>
      `)
      .join("");

    reviewControls.counts.innerHTML = decisionChips + progressChips;
  }

  function setFilterOptions(select, options, allLabel) {
    if (!select) {
      return;
    }

    const currentValue = select.value || "all";
    select.innerHTML = [
      `<option value="all">${escapeHtml(allLabel)}</option>`,
      ...options.map((option) =>
        `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
      )
    ].join("");

    const hasCurrent = Array.from(select.options).some((option) => option.value === currentValue);
    select.value = hasCurrent ? currentValue : "all";
  }

  function sortOptionLabels(options) {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }

  function renderReviewFilterOptions() {
    const sections = new Set();
    const priorities = new Set();
    const taxonomyOptions = new Map();

    getAllReviewRequirements().forEach((requirement) => {
      sections.add(getRequirementSection(requirement));

      if (requirement.priority) {
        priorities.add(requirement.priority);
      }

      const category = getRequirementTaxonomyValue(requirement, "category");
      const functionLabel = getRequirementTaxonomyValue(requirement, "function");

      taxonomyOptions.set(`category:${category}`, `Category: ${category}`);
      taxonomyOptions.set(`function:${functionLabel}`, `Function: ${functionLabel}`);
    });

    setFilterOptions(
      reviewControls.section,
      sortOptionLabels(Array.from(sections).map((section) => ({ value: section, label: section }))),
      "All sections"
    );
    setFilterOptions(
      reviewControls.priority,
      sortOptionLabels(Array.from(priorities).map((priority) => ({
        value: priority,
        label: formatFallbackLabel(priority)
      }))),
      "All priorities"
    );
    setFilterOptions(
      reviewControls.taxonomy,
      sortOptionLabels(Array.from(taxonomyOptions).map(([value, label]) => ({ value, label }))),
      "All categories and functions"
    );
  }

  function syncReviewControlState() {
    if (reviewControls.decision) {
      reviewControls.decision.value = reviewFilters.decision;
    }

    if (reviewControls.section) {
      reviewControls.section.value = reviewFilters.section;
    }

    if (reviewControls.priority) {
      reviewControls.priority.value = reviewFilters.priority;
    }

    if (reviewControls.sourceType) {
      reviewControls.sourceType.value = reviewFilters.sourceType;
    }

    if (reviewControls.notes) {
      reviewControls.notes.value = reviewFilters.notes;
    }

    if (reviewControls.taxonomy) {
      reviewControls.taxonomy.value = reviewFilters.taxonomy;
    }

    if (reviewControls.search) {
      reviewControls.search.value = reviewFilters.search;
    }

    if (reviewControls.sortField) {
      reviewControls.sortField.value = reviewSort.field;
    }

    if (reviewControls.sortDirection) {
      reviewControls.sortDirection.value = reviewSort.direction;
    }

    reviewControls.viewMode.forEach((control) => {
      control.checked = control.value === reviewViewMode;
    });
  }

  function resetReviewFiltersForDeepLink() {
    reviewFilters = {
      decision: "all",
      section: "all",
      priority: "all",
      sourceType: "all",
      notes: "all",
      taxonomy: "all",
      search: ""
    };
    clearSelectedRequirements();
    syncReviewControlState();
  }

  function getRequirementCard(requirementId) {
    return Array.from(root.querySelectorAll("[data-requirement-card]")).find(
      (card) => card.dataset.requirementCard === requirementId
    );
  }

  function highlightRequirementCard(requirementId) {
    const card = getRequirementCard(requirementId);

    if (!card) {
      return false;
    }

    card.classList.add("requirement-card-target");
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      card.classList.remove("requirement-card-target");
    }, 4200);

    return true;
  }

  function applyRequirementDeepLink() {
    if (!deepLinkRequirementId || deepLinkAttempted) {
      return;
    }

    const card = getRequirementCard(deepLinkRequirementId);

    if (!card && !deepLinkFiltersReset && getAllReviewRequirements().some((requirement) => requirement.id === deepLinkRequirementId)) {
      deepLinkFiltersReset = true;
      resetReviewFiltersForDeepLink();
      renderDisplayRequirements();
      return;
    }

    deepLinkAttempted = true;

    if (!card) {
      return;
    }

    highlightRequirementCard(deepLinkRequirementId);
  }

  function handleReviewControlChange() {
    clearSelectedRequirements();
    reviewFilters = {
      decision: reviewControls.decision ? reviewControls.decision.value : "all",
      section: reviewControls.section ? reviewControls.section.value : "all",
      priority: reviewControls.priority ? reviewControls.priority.value : "all",
      sourceType: reviewControls.sourceType ? reviewControls.sourceType.value : "all",
      notes: reviewControls.notes ? reviewControls.notes.value : "all",
      taxonomy: reviewControls.taxonomy ? reviewControls.taxonomy.value : "all",
      search: reviewControls.search ? reviewControls.search.value.trim().toLowerCase() : ""
    };
    reviewSort = {
      field: reviewControls.sortField ? reviewControls.sortField.value : "default",
      direction: reviewControls.sortDirection ? reviewControls.sortDirection.value : "asc"
    };

    renderDisplayRequirements();
  }

  function handleViewModeChange(event) {
    reviewViewMode = event.target.value === "table" ? "table" : "cards";
    clearSelectedRequirements();
    syncReviewControlState();
    renderDisplayRequirements();
  }

  function handleCountChipClick(event) {
    const chip = event.target.closest("[data-review-filter-decision]");

    if (!chip || !reviewControls.decision) {
      return;
    }

    reviewControls.decision.value = chip.dataset.reviewFilterDecision;
    handleReviewControlChange();
  }

  function bindReviewFilterControls() {
    if (reviewControlsBound) {
      return;
    }

    reviewControlsBound = true;
    [
      reviewControls.decision,
      reviewControls.section,
      reviewControls.priority,
      reviewControls.sourceType,
      reviewControls.notes,
      reviewControls.taxonomy,
      reviewControls.sortField,
      reviewControls.sortDirection
    ].forEach((control) => {
      if (control) {
        control.addEventListener("change", handleReviewControlChange);
      }
    });

    if (reviewControls.search) {
      reviewControls.search.addEventListener("input", handleReviewControlChange);
    }

    if (reviewControls.counts) {
      reviewControls.counts.addEventListener("click", handleCountChipClick);
    }

    reviewControls.viewMode.forEach((control) => {
      control.addEventListener("change", handleViewModeChange);
    });

    reviewControls.batchActions.forEach((control) => {
      control.addEventListener("click", handleBatchReviewAction);
    });
  }

  function matchesReviewFilters(requirement) {
    if (reviewFilters.decision === "no_decision") {
      const decisions = getSavedReviewDecisions();

      if (decisions[requirement.id] && decisions[requirement.id] !== "no_decision") {
        return false;
      }
    } else if (reviewFilters.decision !== "all" && getReviewDecision(requirement.id) !== reviewFilters.decision) {
      return false;
    }

    if (reviewFilters.section !== "all" && getRequirementSection(requirement) !== reviewFilters.section) {
      return false;
    }

    if (reviewFilters.priority !== "all" && requirement.priority !== reviewFilters.priority) {
      return false;
    }

    if (reviewFilters.sourceType !== "all" && getRequirementSourceTypeValue(requirement) !== reviewFilters.sourceType) {
      return false;
    }

    if (reviewFilters.notes === "has_notes" && !getRequirementReviewNote(requirement.id)) {
      return false;
    }

    if (reviewFilters.notes === "no_notes" && getRequirementReviewNote(requirement.id)) {
      return false;
    }

    if (reviewFilters.taxonomy !== "all") {
      const [kind, ...labelParts] = reviewFilters.taxonomy.split(":");
      const expectedLabel = labelParts.join(":");

      if (getRequirementTaxonomyValue(requirement, kind) !== expectedLabel) {
        return false;
      }
    }

    if (reviewFilters.search) {
      const haystack = [
        requirement.id,
        requirement.title,
        requirement.text,
        requirement.rationale,
        requirement.categoryLabel,
        requirement.categoryId,
        requirement.functionLabel,
        requirement.functionId,
        requirement.sourceType,
        getRequirementSourceTypeLabel(requirement),
        requirement.sourceNote,
        getRequirementSection(requirement),
        Array.isArray(requirement.selectionReasons) ? requirement.selectionReasons.join(" ") : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(reviewFilters.search)) {
        return false;
      }
    }

    return true;
  }

  function getDisplayRequirements() {
    return getAllReviewRequirements().filter(matchesReviewFilters);
  }

  function getSortValue(requirement, field) {
    switch (field) {
      case "section":
        return getRequirementSection(requirement);
      case "title":
        return requirement.title || "";
      case "priority":
        return priorityOrder[requirement.priority] || 99;
      case "decision":
        return decisionOrder[getReviewDecision(requirement.id)] || 99;
      case "category":
        return getRequirementTaxonomyValue(requirement, "category");
      case "function":
        return getRequirementTaxonomyValue(requirement, "function");
      case "id":
        return requirement.id || "";
      default:
        return "";
    }
  }

  function compareDisplayRequirements(a, b) {
    const field = reviewSort.field || "default";

    if (field === "default") {
      return sortRequirements([a, b])[0] === a ? -1 : 1;
    }

    const aValue = getSortValue(a, field);
    const bValue = getSortValue(b, field);
    let result;

    if (typeof aValue === "number" && typeof bValue === "number") {
      result = aValue - bValue;
    } else {
      result = String(aValue).localeCompare(String(bValue));
    }

    if (result === 0) {
      result = sortRequirements([a, b])[0] === a ? -1 : 1;
    }

    return reviewSort.direction === "desc" ? -result : result;
  }

  function sortRequirementsForDisplay(requirements) {
    if ((reviewSort.field || "default") === "default") {
      return sortRequirements(requirements);
    }

    return [...requirements].sort(compareDisplayRequirements);
  }

  function sortGroupedEntriesForDisplay(grouped) {
    const entries = Object.entries(grouped);

    if (reviewSort.field === "section") {
      entries.sort(([aSection], [bSection]) => {
        const result = aSection.localeCompare(bSection);
        return reviewSort.direction === "desc" ? -result : result;
      });
    }

    return entries;
  }

  function getRequirementSourceTypeLabel(requirement) {
    return requirement.isProjectSpecific ? "Project Specific" : "Approved Library";
  }

  function getRequirementSourceTypeValue(requirement) {
    return requirement.isProjectSpecific ? "project_specific" : "approved_library";
  }

  function getOrderedDisplayRequirements(displayRequirements) {
    return sortGroupedEntriesForDisplay(groupBySection(displayRequirements))
      .flatMap(([, requirements]) => sortRequirementsForDisplay(requirements));
  }

  function getWhySelectedSummary(requirement) {
    if (!Array.isArray(requirement.selectionReasons) || !requirement.selectionReasons.length) {
      return "Not available";
    }

    return requirement.selectionReasons[0];
  }

  function clearSelectedRequirements() {
    selectedRequirementIds = new Set();
  }

  function pruneSelectedRequirements() {
    const currentIds = new Set(getAllReviewRequirements().map((requirement) => requirement.id));
    selectedRequirementIds = new Set(
      Array.from(selectedRequirementIds).filter((requirementId) => currentIds.has(requirementId))
    );
  }

  function updateBatchActionState() {
    const selectedCount = selectedRequirementIds.size;
    const actionsEnabled = reviewViewMode === "table" && selectedCount > 0;

    if (reviewControls.selectedCount) {
      reviewControls.selectedCount.textContent = `${selectedCount} selected`;
    }

    reviewControls.batchActions.forEach((control) => {
      control.disabled = !actionsEnabled;
    });
  }

  function getSelectedReviewRequirements() {
    const selectedIds = new Set(selectedRequirementIds);
    return getAllReviewRequirements().filter((requirement) => selectedIds.has(requirement.id));
  }

  function saveBatchReviewDecision(decision) {
    const decisions = getSavedReviewDecisions();

    selectedRequirementIds.forEach((requirementId) => {
      decisions[requirementId] = decision;
    });

    window.RfpWorkspaces.saveReviewDecisions(decisions);
  }

  function getBatchExcludeConfirmationMessage(selectedRequirements) {
    const count = selectedRequirements.length;
    const noteCount = selectedRequirements.filter((requirement) =>
      Boolean(getRequirementReviewNote(requirement.id))
    ).length;
    const baseMessage =
      `Exclude ${count} selected requirement${count === 1 ? "" : "s"}? ` +
      "Excluded requirements will be omitted from text and CSV exports.";

    if (!noteCount) {
      return baseMessage;
    }

    return (
      `${baseMessage}\n\n` +
      `${noteCount} selected requirement${noteCount === 1 ? " has" : "s have"} consultant notes. ` +
      "Notes will remain stored, but excluded requirements will not export while excluded."
    );
  }

  function handleBatchReviewAction(event) {
    const decision = (event.currentTarget || event.target).dataset.batchReviewDecision;
    const selectedRequirements = getSelectedReviewRequirements();

    if (!selectedRequirements.length || !reviewDecisionLabels[decision]) {
      return;
    }

    if (decision === "exclude") {
      const confirmed = !window.confirm || window.confirm(getBatchExcludeConfirmationMessage(selectedRequirements));

      if (!confirmed) {
        return;
      }
    }

    saveBatchReviewDecision(decision);
    clearSelectedRequirements();
    renderDisplayRequirements();
  }

  function handleTableSelectionChange(event) {
    const control = event.target.closest("[data-requirement-row-select]");

    if (!control) {
      return;
    }

    const requirementId = control.dataset.requirementRowSelect;

    if (control.checked) {
      selectedRequirementIds.add(requirementId);
    } else {
      selectedRequirementIds.delete(requirementId);
    }

    const row = control.closest("[data-requirement-row]");

    if (row) {
      row.classList.toggle("is-selected", control.checked);
    }

    updateBatchActionState();
  }

  function viewRequirementDetails(requirementId) {
    reviewViewMode = "cards";
    clearSelectedRequirements();
    syncReviewControlState();
    renderDisplayRequirements();
    window.setTimeout(() => highlightRequirementCard(requirementId), 0);
  }

  function bindTableControls() {
    root.querySelectorAll("[data-requirement-row-select]").forEach((control) => {
      control.addEventListener("change", handleTableSelectionChange);
    });

    root.querySelectorAll("[data-view-requirement-detail]").forEach((control) => {
      control.addEventListener("click", (event) => {
        viewRequirementDetails((event.currentTarget || event.target).dataset.viewRequirementDetail);
      });
    });
  }

  function renderRequirementsTable(requirements) {
    const allCount = getAllReviewRequirements().length;

    if (!requirements.length) {
      root.innerHTML = `
        <section class="empty-state requirements-filter-empty">
          <h2>No requirements match the current filters</h2>
          <p>Clear or adjust the filters to return to the generated requirements list.</p>
        </section>
      `;
      refreshExportText();
      updateBatchActionState();
      return;
    }

    root.innerHTML = `
      <section class="requirements-overview-panel" aria-label="Requirements overview table">
        <div class="requirements-overview-header">
          <div>
            <p class="section-kicker">Overview table</p>
            <h2>Showing ${escapeHtml(requirements.length)} of ${escapeHtml(allCount)} requirements</h2>
          </div>
          <p>Use the table for fast triage. Open Detail Cards for full text, notes, and project-specific edits.</p>
        </div>
        <div class="requirements-overview-table-wrap">
          <table class="requirements-overview-table">
            <thead>
              <tr>
                <th scope="col">Select</th>
                <th scope="col">Requirement ID</th>
                <th scope="col">Source Type</th>
                <th scope="col">Section</th>
                <th scope="col">Title</th>
                <th scope="col">Priority</th>
                <th scope="col">Review Decision</th>
                <th scope="col">Has Note</th>
                <th scope="col">Why Selected</th>
                <th scope="col">Exportable</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              ${requirements.map(renderRequirementTableRow).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    bindTableControls();
    refreshExportText();
    updateBatchActionState();
  }

  function renderRequirementTableRow(requirement) {
    const decision = getReviewDecision(requirement.id);
    const hasNote = Boolean(getRequirementReviewNote(requirement.id));
    const exportable = isExportable(requirement);
    const selected = selectedRequirementIds.has(requirement.id);

    return `
      <tr
        data-requirement-row="${escapeHtml(requirement.id)}"
        class="${selected ? "is-selected" : ""}"
      >
        <td>
          <input
            type="checkbox"
            data-requirement-row-select="${escapeHtml(requirement.id)}"
            aria-label="Select ${escapeHtml(requirement.id || "requirement")}"
            ${selected ? "checked" : ""}
          />
        </td>
        <td><span class="requirement-id">${escapeHtml(requirement.id || "UNNUMBERED")}</span></td>
        <td>${escapeHtml(getRequirementSourceTypeLabel(requirement))}</td>
        <td>${escapeHtml(getRequirementSection(requirement))}</td>
        <td>${escapeHtml(requirement.title || "Untitled Requirement")}</td>
        <td>${escapeHtml(requirement.priority || "unspecified")}</td>
        <td>${escapeHtml(getReviewDecisionLabel(requirement.id))}</td>
        <td>${escapeHtml(hasNote ? "Yes" : "No")}</td>
        <td>${escapeHtml(getWhySelectedSummary(requirement))}</td>
        <td>${escapeHtml(exportable ? "Yes" : "No")}</td>
        <td>
          <button
            type="button"
            class="button text-button"
            data-view-requirement-detail="${escapeHtml(requirement.id)}"
          >
            View Details
          </button>
        </td>
      </tr>
    `;
  }

  function formatRequirementBlock(requirement, index) {
    const lines = [
      `${index + 1}. ${requirement.id || "UNNUMBERED"} - ${requirement.title || "Untitled Requirement"}`,
      `Source Type: ${getRequirementSourceTypeLabel(requirement)}`,
      `Category: ${requirement.categoryLabel || "Uncategorized"}`,
      `Function: ${requirement.functionLabel || "Unspecified"}`,
      `Level: ${requirement.requirementLevel || "unspecified"}`,
      `Priority: ${requirement.priority || "unspecified"}`,
      `Reviewer Decision: ${getReviewDecisionLabel(requirement.id)}`,
      `Requirement: ${requirement.text || ""}`
    ];

    if (requirement.rationale) {
      lines.push(`Rationale: ${requirement.rationale}`);
    }

    if (requirement.responseInstructions) {
      lines.push(`Response Instructions: ${requirement.responseInstructions}`);
    }

    if (requirement.selectionReasons && requirement.selectionReasons.length) {
      lines.push(`Why Selected: ${requirement.selectionReasons.join("; ")}`);
    }

    if (requirement.sourceNote) {
      lines.push(`Source Note: ${requirement.sourceNote}`);
    }

    const consultantNote = getRequirementReviewNote(requirement.id);

    if (consultantNote) {
      lines.push(`Consultant Note: ${consultantNote}`);
    }

    return lines.join("\n");
  }

  function escapeCsvValue(value) {
    const text = String(value || "");

    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  function formatRequirementsMatrixCsv(requirements) {
    const headers = [
      "Requirement ID",
      "Source Type",
      "Section",
      "Title",
      "Category",
      "Function",
      "Priority",
      "Review Decision",
      "Requirement Text",
      "Rationale",
      "Response Instructions",
      "Why Selected",
      "Consultant Note"
    ];
    const rows = requirements
      .filter(isExportable)
      .map((requirement) => [
        requirement.id || "",
        getRequirementSourceTypeLabel(requirement),
        getRequirementSection(requirement),
        requirement.title || "",
        requirement.categoryLabel || "",
        requirement.functionLabel || "",
        requirement.priority || "",
        getReviewDecisionLabel(requirement.id),
        requirement.text || "",
        requirement.rationale || "",
        requirement.responseInstructions || "",
        Array.isArray(requirement.selectionReasons) ? requirement.selectionReasons.join("; ") : "",
        getRequirementReviewNote(requirement.id)
      ]);

    return [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");
  }

  function formatRequirementsReviewBriefMarkdown(requirements) {
    const answers = getSavedAnswers() || {};
    const allRequirements = Array.isArray(requirements) ? requirements : [];
    const exportable = allRequirements.filter(isExportable);
    const decisionCounts = getDecisionCounts();
    const progressCounts = getProgressCounts();
    const sectionSummary = summarizeRequirementsByField(allRequirements, getRequirementSection);
    const categorySummary = summarizeRequirementsByField(allRequirements, (requirement) => requirement.categoryLabel || requirement.categoryId || "Uncategorized");
    const functionSummary = summarizeRequirementsByField(allRequirements, (requirement) => requirement.functionLabel || requirement.functionId || "Unspecified");
    const prioritySummary = summarizeRequirementsByField(allRequirements, (requirement) => requirement.priority || "unspecified");
    const gapRules = Array.isArray(window.rfpGapReview) ? window.rfpGapReview : [];
    const workspace = window.RfpWorkspaces?.getActiveWorkspaceOrNull ? window.RfpWorkspaces.getActiveWorkspaceOrNull() : null;
    const workspaceName = workspace?.name || answers.project_name || "Untitled Workspace";
    const planSummary = getProjectPlanReviewBriefSummary(workspace?.id);
    const lines = [
      `# Requirements Review Brief - ${workspaceName}`,
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "This brief summarizes the requirements review package and explains how to review the accompanying Requirements Matrix CSV. It does not list every full requirement.",
      "",
      "## Purpose",
      "Use this brief to orient reviewers before detailed row-by-row review in the spreadsheet-ready requirements matrix.",
      "",
      "## Client Review Instructions",
      "- Review the Enhanced Requirements Matrix CSV row by row.",
      "- Use the Client Review Decision and Client Comment columns for client feedback.",
      "- Focus first on requirements marked Needs Revision or Needs Client Clarification.",
      "- Do not treat this brief as final RFP boilerplate, legal language, or procurement instructions.",
      "",
      "## Project Context",
      ...formatProjectContextLines(answers),
      "",
      "## Requirements Summary",
      `- Generated requirements: ${selectedRequirements.length}`,
      `- Project-specific requirements: ${projectSpecificRequirements.length}`,
      `- Total requirements in review: ${allRequirements.length}`,
      `- Exportable requirements: ${exportable.length}`,
      `- Included in RFP: ${decisionCounts.include}`,
      `- Excluded from RFP: ${decisionCounts.exclude}`,
      `- Needs Revision: ${decisionCounts.revise}`,
      `- Needs Client Clarification: ${decisionCounts.clarify}`,
      `- No decision: ${decisionCounts.no_decision}`,
      `- Requirements with consultant notes: ${progressCounts.has_notes}`,
      "",
      "## Requirements by Section",
      ...formatSummaryTable(sectionSummary),
      "",
      "## Requirements by Category",
      ...formatSummaryTable(categorySummary),
      "",
      "## Requirements by Function",
      ...formatSummaryTable(functionSummary),
      "",
      "## Priority Summary",
      ...formatSummaryTable(prioritySummary),
      "",
      "## Review Status / Decisions Needed",
      `- ${decisionCounts.revise} requirement${decisionCounts.revise === 1 ? "" : "s"} marked Needs Revision.`,
      `- ${decisionCounts.clarify} requirement${decisionCounts.clarify === 1 ? "" : "s"} marked Needs Client Clarification.`,
      `- ${decisionCounts.no_decision} requirement${decisionCounts.no_decision === 1 ? "" : "s"} still have no workbench review decision.`,
      "",
      "## Gaps, Missing Context, and Readiness Warnings",
      ...formatGapReviewLines(gapRules),
      "",
      "## Open Questions and Follow-Ups",
      ...formatProjectPlanBriefLines(planSummary),
      "",
      "## Assumptions",
      "- Requirements are generated from the current Project Intake answers plus project-specific requirements.",
      "- Excluded requirements are omitted from exportable detailed outputs in this v0 workflow.",
      "- Client review decisions are captured in the CSV, not in this brief.",
      "- Re-export the brief and matrix after intake answers, review decisions, or consultant notes change.",
      "",
      "## Next Review Actions",
      "- Use Requirements Review to resolve Needs Revision and Needs Client Clarification items.",
      "- Send or review the Enhanced Requirements Matrix CSV with client SMEs.",
      "- Update Project Intake if project context changes.",
      "- Re-export the CSV after review decisions are updated."
    ];

    return lines.join("\n");
  }

  function formatProjectContextLines(answers) {
    const fields = [
      ["Project name", answers.project_name],
      ["Procurement type", answers.procurement_type],
      ["Justice domain", answers.justice_domain],
      ["System type", answers.system_type],
      ["Client organization type", answers.client_type],
      ["Procurement stage", answers.procurement_stage],
      ["Expected users", answers.user_count],
      ["Target timeline", answers.timeline],
      ["Deployment/access model", answers.deployment_model],
      ["Key integrations", answers.integrations],
      ["Reporting/data needs", answers.reporting_needs],
      ["Compliance/data sensitivity", [answers.compliance, answers.data_sensitivity].filter(Boolean).flat()]
    ];

    const lines = fields.map(([label, value]) => `- ${label}: ${formatBriefValue(value)}`);
    return lines.length ? lines : ["- Project context is not available yet."];
  }

  function formatBriefValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value.map(formatFallbackLabel).join(", ") : "Not provided";
    }

    return value ? formatFallbackLabel(value) : "Not provided";
  }

  function summarizeRequirementsByField(requirements, resolver) {
    const summary = new Map();
    requirements.forEach((requirement) => {
      const key = resolver(requirement) || "Not specified";
      const current = summary.get(key) || { label: key, total: 0, include: 0, revise: 0, clarify: 0, exclude: 0, noDecision: 0 };
      const decision = getReviewDecision(requirement.id);
      current.total += 1;
      if (decision === "include") current.include += 1;
      else if (decision === "revise") current.revise += 1;
      else if (decision === "clarify") current.clarify += 1;
      else if (decision === "exclude") current.exclude += 1;
      else current.noDecision += 1;
      summary.set(key, current);
    });
    return [...summary.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }

  function formatSummaryTable(rows) {
    if (!rows.length) {
      return ["No requirements available."];
    }

    return [
      "| Area | Total | Include | Needs Revision | Needs Clarification | Excluded | No Decision |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...rows.map((row) => `| ${escapeMarkdownTableCell(row.label)} | ${row.total} | ${row.include} | ${row.revise} | ${row.clarify} | ${row.exclude} | ${row.noDecision} |`)
    ];
  }

  function escapeMarkdownTableCell(value) {
    return String(value || "Not specified").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  }

  function formatGapReviewLines(gapRules) {
    if (!gapRules.length) {
      return ["- No configured gap/readiness rules are currently triggered."];
    }

    return gapRules.map((rule) => `- ${formatFallbackLabel(rule.severity || "warning")}: ${rule.title || "Untitled warning"} - ${rule.description || "No detail provided."}`);
  }

  function getProjectPlanReviewBriefSummary(workspaceId) {
    if (!workspaceId || !window.RfpWorkspaces?.getProjectPlanItems) {
      return { decisions: [], dependencies: [], risks: [] };
    }

    const plan = window.RfpWorkspaces.getProjectPlanItems(workspaceId);
    const items = Array.isArray(plan?.items) ? plan.items : [];
    const openItems = items.filter((item) => item && item.status !== "complete");
    return {
      decisions: openItems.filter((item) => item.type === "decision"),
      dependencies: openItems.filter((item) => item.type === "dependency"),
      risks: openItems.filter((item) => item.type === "risk" || item.status === "blocked")
    };
  }

  function formatProjectPlanBriefLines(summary) {
    const lines = [
      `- Open Project Plan decisions: ${summary.decisions.length}`,
      `- Open Project Plan dependencies: ${summary.dependencies.length}`,
      `- Open Project Plan risks/blockers: ${summary.risks.length}`
    ];
    const titles = [...summary.decisions, ...summary.dependencies, ...summary.risks]
      .slice(0, 8)
      .map((item) => item.title)
      .filter(Boolean);

    if (titles.length) {
      lines.push("- Current open planning items: " + titles.join("; "));
    }

    return lines;
  }

  function formatEnhancedRequirementsMatrixCsv(requirements) {
    const headers = [
      "Requirement ID",
      "Source Type",
      "Section",
      "Subsection",
      "Category",
      "Function",
      "Requirement Number",
      "Requirement Title",
      "Requirement Text",
      "Requirement Level",
      "Priority",
      "Requirement Type",
      "Tags",
      "Evaluation Criteria",
      "Vendor Response Instructions",
      "Rationale",
      "Why Selected",
      "Source Package ID",
      "Source Document ID",
      "Original Requirement ID",
      "Source Status",
      "Reuse Assessment",
      "Client Specificity",
      "Source / Rationale Note",
      "Consultant Note",
      "Workbench Review Decision",
      "Included in RFP",
      "Needs Revision",
      "Needs Client Clarification",
      "Excluded from RFP",
      "Follow-Up Needed",
      "Client Review Decision",
      "Client Comment",
      "Client Priority Override",
      "Client Owner / SME",
      "Client Disposition Notes",
      "Final Disposition",
      "Final Requirement Text",
      "MCP Notes",
      "Disposition Owner",
      "Disposition Date"
    ];
    const rows = requirements
      .filter(isExportable)
      .map((requirement) => {
        const decision = getReviewDecision(requirement.id);
        return [
          requirement.id || "",
          getRequirementSourceTypeLabel(requirement),
          getRequirementSection(requirement),
          requirement.subsection || "",
          requirement.categoryLabel || requirement.categoryId || "",
          requirement.functionLabel || requirement.functionId || "",
          requirement.requirementNumber || "",
          requirement.title || "",
          requirement.text || "",
          requirement.requirementLevel || "",
          requirement.priority || "",
          requirement.requirementLevel || requirement.sourceType || "",
          Array.isArray(requirement.tags) ? requirement.tags.join("; ") : "",
          requirement.evaluationCriteria || "",
          requirement.responseInstructions || "",
          requirement.rationale || "",
          Array.isArray(requirement.selectionReasons) ? requirement.selectionReasons.join("; ") : "",
          requirement.sourcePackageId || requirement.source?.packageId || "",
          requirement.sourceDocumentId || requirement.source?.documentId || "",
          requirement.originalRequirementId || "",
          requirement.sourceStatus || requirement.source?.sourceStatus || "",
          requirement.reuseAssessment || "",
          requirement.clientSpecificity || "",
          requirement.sourceNote || requirement.notes || "",
          getRequirementReviewNote(requirement.id),
          getReviewDecisionLabel(requirement.id),
          decision === "include" ? "Yes" : "No",
          decision === "revise" ? "Yes" : "No",
          decision === "clarify" ? "Yes" : "No",
          decision === "exclude" ? "Yes" : "No",
          decision === "revise" || decision === "clarify" ? "Yes" : "No",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ];
      });

    return [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");
  }
  function formatRequirementText(grouped) {
    return Object.entries(grouped)
      .map(([section, requirements]) => {
        const exportable = sortRequirements(requirements).filter(isExportable);
        const lines = exportable.map(formatRequirementBlock);

        if (!lines.length) {
          return "";
        }

        return `${section}\n${lines.join("\n\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  function renderOptionalDetail(label, value) {
    if (!value) {
      return "";
    }

    return `
      <p class="requirement-detail">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </p>
    `;
  }

  function renderReviewControls(requirement) {
    const decision = getReviewDecision(requirement.id);

    return `
      <div class="review-controls" aria-label="Review decision">
        <span class="review-label">Review</span>
        ${Object.entries(reviewDecisionLabels)
          .map(([value, label]) => {
            const checked = decision === value ? "checked" : "";

            return `
              <label class="review-option">
                <input
                  type="radio"
                  name="review-${escapeHtml(requirement.id)}"
                  value="${escapeHtml(value)}"
                  data-review-decision="${escapeHtml(requirement.id)}"
                  ${checked}
                />
                <span>${escapeHtml(label)}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function formatReviewNoteTimestamp(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return ` Updated ${date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })}.`;
  }

  function renderRequirementNoteControls(requirement) {
    const entry = getRequirementReviewNoteEntry(requirement.id);
    const note = entry ? String(entry.note || "") : "";
    const noteState = note ? "has-note" : "empty";
    const helperText = note
      ? `Workspace-specific consultant note.${formatReviewNoteTimestamp(entry.updatedAt)}`
      : "Workspace-specific. Does not change the reusable requirements library.";

    return `
      <div class="consultant-note-panel" data-note-state="${escapeHtml(noteState)}">
        <label for="note-${escapeHtml(requirement.id)}">Consultant note</label>
        <textarea
          id="note-${escapeHtml(requirement.id)}"
          data-review-note="${escapeHtml(requirement.id)}"
          placeholder="Add rationale, revision direction, or client clarification needed..."
        >${escapeHtml(note)}</textarea>
        <div class="consultant-note-actions">
          <button type="button" class="button secondary" data-save-review-note="${escapeHtml(requirement.id)}">
            Save Note
          </button>
          <button type="button" class="button text-button" data-clear-review-note="${escapeHtml(requirement.id)}">
            Clear
          </button>
        </div>
        <p class="consultant-note-help">${escapeHtml(helperText)}</p>
      </div>
    `;
  }

  function setProjectSpecificStatus(message, isError = false) {
    if (!projectSpecificFields.status) {
      return;
    }

    projectSpecificFields.status.textContent = message || "";
    projectSpecificFields.status.classList.toggle("error", Boolean(isError));
  }

  function resetProjectSpecificForm(statusMessage = "") {
    if (!projectSpecificForm) {
      return;
    }

    projectSpecificForm.reset();

    if (projectSpecificFields.id) {
      projectSpecificFields.id.value = "";
    }

    if (projectSpecificFields.saveButton) {
      projectSpecificFields.saveButton.textContent = "Save Requirement";
    }

    setProjectSpecificStatus(statusMessage);
  }

  function getProjectSpecificFormValue(field) {
    return String(field?.value || "").trim();
  }

  function getProjectSpecificFormData() {
    const requirementText = getProjectSpecificFormValue(projectSpecificFields.text);
    const title = getProjectSpecificFormValue(projectSpecificFields.title) ||
      requirementText.slice(0, 84).trim();

    return {
      id: getProjectSpecificFormValue(projectSpecificFields.id),
      title,
      section: getProjectSpecificFormValue(projectSpecificFields.section),
      category: getProjectSpecificFormValue(projectSpecificFields.category),
      function: getProjectSpecificFormValue(projectSpecificFields.functionLabel),
      priority: getProjectSpecificFormValue(projectSpecificFields.priority),
      requirementText,
      rationale: getProjectSpecificFormValue(projectSpecificFields.rationale),
      responseInstructions: getProjectSpecificFormValue(projectSpecificFields.responseInstructions),
      sourceNote: getProjectSpecificFormValue(projectSpecificFields.sourceNote)
    };
  }

  function populateProjectSpecificForm(requirement) {
    const source = requirement.originalProjectSpecificRequirement || requirement;

    if (projectSpecificFormPanel) {
      projectSpecificFormPanel.open = true;
    }

    projectSpecificFields.id.value = source.id || "";
    projectSpecificFields.title.value = source.title || "";
    projectSpecificFields.section.value = source.section || "";
    projectSpecificFields.category.value = source.category || "";
    projectSpecificFields.functionLabel.value = source.function || "";
    projectSpecificFields.priority.value = source.priority || "";
    projectSpecificFields.text.value = source.requirementText || source.text || "";
    projectSpecificFields.rationale.value = source.rationale || "";
    projectSpecificFields.responseInstructions.value = source.responseInstructions || "";
    projectSpecificFields.sourceNote.value = source.sourceNote || "";

    if (projectSpecificFields.saveButton) {
      projectSpecificFields.saveButton.textContent = "Update Requirement";
    }

    setProjectSpecificStatus("Editing project-specific requirement.");
  }

  function saveProjectSpecificRequirementFromForm(event) {
    event.preventDefault();

    const formData = getProjectSpecificFormData();

    if (!formData.requirementText) {
      setProjectSpecificStatus("Requirement text is required.", true);
      return;
    }

    const wrapper = getProjectSpecificWrapper();
    const now = new Date().toISOString();
    const existing = wrapper.requirements.find((requirement) => requirement.id === formData.id);
    const requirement = {
      ...existing,
      ...formData,
      id: formData.id || createProjectSpecificRequirementId(),
      title: formData.title || "Untitled project-specific requirement",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const requirements = existing
      ? wrapper.requirements.map((item) => item.id === requirement.id ? requirement : item)
      : [...wrapper.requirements, requirement];

    saveProjectSpecificWrapper({
      ...wrapper,
      updatedAt: now,
      requirements
    });
    resetProjectSpecificForm("Project-specific requirement saved.");
  }

  function editProjectSpecificRequirement(requirementId) {
    const requirement = projectSpecificRequirements.find((item) => item.id === requirementId);

    if (!requirement) {
      return;
    }

    populateProjectSpecificForm(requirement);
  }

  function deleteProjectSpecificRequirement(requirementId) {
    const confirmed = !window.confirm || window.confirm("Delete this project-specific requirement from this workspace?");

    if (!confirmed) {
      return;
    }

    const wrapper = getProjectSpecificWrapper();
    const requirements = wrapper.requirements.filter((requirement) => requirement.id !== requirementId);

    saveProjectSpecificWrapper({
      ...wrapper,
      updatedAt: new Date().toISOString(),
      requirements
    });
    deleteReviewDecision(requirementId);
    saveRequirementReviewNote(requirementId, "");
    resetProjectSpecificForm("Project-specific requirement deleted.");
  }

  function renderProjectSpecificActions(requirement) {
    if (!requirement.isProjectSpecific) {
      return "";
    }

    return `
      <div class="project-specific-card-actions" aria-label="Project-specific requirement actions">
        <button type="button" class="button secondary" data-edit-project-specific="${escapeHtml(requirement.id)}">
          Edit Project Requirement
        </button>
        <button type="button" class="button text-button" data-delete-project-specific="${escapeHtml(requirement.id)}">
          Delete
        </button>
      </div>
    `;
  }

  function bindProjectSpecificCardActions() {
    root.querySelectorAll("[data-edit-project-specific]").forEach((control) => {
      control.addEventListener("click", (event) => {
        editProjectSpecificRequirement((event.currentTarget || event.target).dataset.editProjectSpecific);
      });
    });

    root.querySelectorAll("[data-delete-project-specific]").forEach((control) => {
      control.addEventListener("click", (event) => {
        deleteProjectSpecificRequirement((event.currentTarget || event.target).dataset.deleteProjectSpecific);
      });
    });
  }

  function bindProjectSpecificForm() {
    if (projectSpecificFormBound || !projectSpecificForm) {
      return;
    }

    projectSpecificFormBound = true;
    projectSpecificForm.addEventListener("submit", saveProjectSpecificRequirementFromForm);

    if (projectSpecificFields.cancelButton) {
      projectSpecificFields.cancelButton.addEventListener("click", () => resetProjectSpecificForm());
    }
  }

  function updateSummary() {
    const allRequirements = getAllReviewRequirements();
    const selectedCount = selectedRequirements.length;
    const projectSpecificCount = projectSpecificRequirements.length;
    const exportableCount = allRequirements.filter(isExportable).length;
    const excludedCount = allRequirements.length - exportableCount;
    const needsReviewCount = allRequirements.filter((requirement) => {
      const decision = getReviewDecision(requirement.id);
      return decision === "revise" || decision === "clarify";
    }).length;

    summary.textContent = `${selectedCount} generated, ${projectSpecificCount} project-specific, ${exportableCount} exportable, ${excludedCount} excluded from RFP, ${needsReviewCount} needing review.`;
  }

  function refreshExportText() {
    const allRequirements = getAllReviewRequirements();
    const groupedReviewRequirements = groupBySection(allRequirements);

    window.rfpSelectedRequirementsText = formatRequirementText(groupedReviewRequirements);
    window.rfpRequirementsMatrixCsv = formatRequirementsMatrixCsv(allRequirements);
    window.rfpRequirementsReviewBriefMarkdown = formatRequirementsReviewBriefMarkdown(allRequirements);
    window.rfpEnhancedRequirementsMatrixCsv = formatEnhancedRequirementsMatrixCsv(allRequirements);
    window.rfpExportableRequirements = allRequirements.filter(isExportable);
    window.rfpReviewRequirements = allRequirements;
    updateSummary();
    renderDecisionCounts();
  }

  function updateCardReviewState(requirementId) {
    const card = Array.from(root.querySelectorAll("[data-requirement-card]")).find(
      (item) => item.dataset.requirementCard === requirementId
    );

    if (card) {
      card.dataset.reviewDecisionState = getReviewDecision(requirementId);
    }
  }

  function bindReviewControls() {
    root.querySelectorAll("[data-review-decision]").forEach((control) => {
      control.addEventListener("change", (event) => {
        const requirementId = event.target.dataset.reviewDecision;
        saveReviewDecision(requirementId, event.target.value);
        renderDisplayRequirements();
      });
    });
  }

  function getRequirementNoteTextarea(requirementId) {
    return Array.from(root.querySelectorAll("[data-review-note]")).find(
      (control) => control.dataset.reviewNote === requirementId
    );
  }

  function bindRequirementNoteControls() {
    root.querySelectorAll("[data-save-review-note]").forEach((control) => {
      control.addEventListener("click", (event) => {
        const requirementId = (event.currentTarget || event.target).dataset.saveReviewNote;
        const textarea = getRequirementNoteTextarea(requirementId);

        saveRequirementReviewNote(requirementId, textarea ? textarea.value : "");
        renderDisplayRequirements();
      });
    });

    root.querySelectorAll("[data-clear-review-note]").forEach((control) => {
      control.addEventListener("click", (event) => {
        saveRequirementReviewNote((event.currentTarget || event.target).dataset.clearReviewNote, "");
        renderDisplayRequirements();
      });
    });
  }

  function renderRequirements(grouped) {
    const groupedEntries = sortGroupedEntriesForDisplay(grouped);

    if (!groupedEntries.length) {
      root.innerHTML = `
        <section class="empty-state requirements-filter-empty">
          <h2>No requirements match the current filters</h2>
          <p>Clear or adjust the filters to return to the generated requirements list.</p>
        </section>
      `;
      refreshExportText();
      updateBatchActionState();
      return;
    }

    root.innerHTML = groupedEntries
      .map(([section, requirements]) => {
        const items = sortRequirementsForDisplay(requirements)
          .map((requirement) => {
            const tags = requirement.tags && requirement.tags.length
              ? `
                <div class="requirement-tags">
                  ${requirement.tags
                    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
                    .join("")}
                </div>
              `
              : "";
            const sourceMeta = [
              requirement.sourcePackageId,
              requirement.sourceStatus,
              requirement.reuseAssessment
            ].filter(Boolean);
            const decision = getReviewDecision(requirement.id);

            return `
              <li
                class="requirement-card"
                data-requirement-card="${escapeHtml(requirement.id)}"
                data-review-decision-state="${escapeHtml(decision)}"
              >
                <div class="requirement-card-header">
                  <div>
                    <span class="requirement-id">${escapeHtml(requirement.id || "UNNUMBERED")}</span>
                    <h3>${escapeHtml(requirement.title || "Untitled Requirement")}</h3>
                  </div>
                  <div class="requirement-badges">
                    ${requirement.isProjectSpecific ? `<span class="badge badge-project-specific">Project-specific</span>` : ""}
                    <span class="badge badge-level">Level: ${escapeHtml(requirement.requirementLevel || "unspecified")}</span>
                    <span class="badge badge-priority">Priority: ${escapeHtml(requirement.priority || "unspecified")}</span>
                    <span class="badge badge-status">Status: ${escapeHtml(requirement.status || "unspecified")}</span>
                  </div>
                </div>
                <div class="requirement-taxonomy">
                  <span class="taxonomy-badge">
                    <span class="taxonomy-label">Category</span>
                    ${escapeHtml(requirement.categoryLabel || "Uncategorized")}
                  </span>
                  <span class="taxonomy-badge">
                    <span class="taxonomy-label">Function</span>
                    ${escapeHtml(requirement.functionLabel || "Unspecified")}
                  </span>
                </div>
                <p class="requirement-text">${escapeHtml(requirement.text || "")}</p>
                ${renderOptionalDetail("Rationale", requirement.rationale)}
                ${renderOptionalDetail("Response Instructions", requirement.responseInstructions)}
                ${renderOptionalDetail("Why Selected", requirement.selectionReasons.join("; "))}
                ${sourceMeta.length ? renderOptionalDetail("Source Review", sourceMeta.join(" / ")) : ""}
                ${requirement.sourceNote ? renderOptionalDetail("Source / Note", requirement.sourceNote) : ""}
                ${renderProjectSpecificActions(requirement)}
                ${renderReviewControls(requirement)}
                ${renderRequirementNoteControls(requirement)}
                ${tags}
              </li>
            `;
          })
          .join("");

        return `
          <article class="requirements-section">
            <h2>${escapeHtml(section)}</h2>
            <ol class="requirements-list">${items}</ol>
          </article>
        `;
      })
      .join("");

    bindReviewControls();
    bindRequirementNoteControls();
    bindProjectSpecificCardActions();
    refreshExportText();
    updateBatchActionState();
  }

  function renderDisplayRequirements() {
    const displayRequirements = getDisplayRequirements();
    pruneSelectedRequirements();

    if (reviewViewMode === "table") {
      renderRequirementsTable(getOrderedDisplayRequirements(displayRequirements));
      return;
    }

    renderRequirements(groupBySection(displayRequirements));
    applyRequirementDeepLink();
  }

  async function loadRequirements() {
    const answers = getSavedAnswers();

    if (!answers) {
      emptyState.classList.remove("hidden");
      root.classList.add("hidden");
      summary.textContent = "No saved interview answers are available.";
if (gapReview) {
        gapReview.textContent = "No saved interview answers are available.";
      }
      window.rfpSelectedRequirementsText = "";
      return;
    }

    try {
      const [requirementsResponse, questionsResponse, taxonomyResponse, gapRulesResponse] = await Promise.all([
        fetch(REQUIREMENTS_URL),
        fetch(QUESTIONS_URL),
        fetch(TAXONOMY_URL),
        fetch(GAP_RULES_URL)
      ]);

      if (!requirementsResponse.ok) {
        throw new Error(`Unable to load requirements: ${requirementsResponse.status}`);
      }

      if (!questionsResponse.ok) {
        throw new Error(`Unable to load interview questions: ${questionsResponse.status}`);
      }

      if (!taxonomyResponse.ok) {
        throw new Error(`Unable to load taxonomy: ${taxonomyResponse.status}`);
      }


      if (!gapRulesResponse.ok) {
        throw new Error(`Unable to load gap rules: ${gapRulesResponse.status}`);
      }

      const [library, questions, taxonomy, gapRules] = await Promise.all([
        requirementsResponse.json(),
        questionsResponse.json(),
        taxonomyResponse.json(),
        gapRulesResponse.json()
      ]);

      questionsConfig = questions;
      taxonomyConfig = taxonomy;
      gapRulesConfig = gapRules;
      questionLookup = buildQuestionLookup(questionsConfig);
      renderPreviewContext(answers);

      selectedRequirements = sortRequirements(
        library.requirements
          .filter((requirement) => matchesCriteria(requirement, answers))
          .map((requirement) => ({
            ...requirement,
            selectionReasons: getSelectionReasons(requirement, answers)
          }))
      );
      projectSpecificRequirements = mapProjectSpecificRequirementsToReviewItems(
        getProjectSpecificWrapper().requirements
      );
      groupedRequirements = groupBySection(getAllReviewRequirements());

      window.rfpSelectedRequirements = selectedRequirements;
      window.rfpProjectSpecificRequirements = projectSpecificRequirements;
      window.rfpReviewRequirements = getAllReviewRequirements();
      renderReviewFilterOptions();
      syncReviewControlState();
      bindReviewFilterControls();
      bindProjectSpecificForm();
      renderDisplayRequirements();
    } catch (error) {
      console.error("Requirements Review failed to load or render.", error);
      summary.classList.add("status-message", "error");
      summary.textContent =
        "The requirements review data could not be loaded or rendered. Check the browser console for the specific failing resource or render error.";
    }
  }

  loadRequirements();
})();





