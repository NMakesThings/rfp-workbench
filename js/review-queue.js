(function () {
  const REQUIREMENTS_URL = "data/requirements-library.json";
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const COLLECTIONS = {
    documents: "clientSourceDocuments",
    facts: "extractedClientFacts",
    suggestions: "suggestedInterviewAnswers",
    questions: "openQuestions",
    riskNotes: "clientRiskGapNotes",
    publicSources: "publicInfoSources",
    publicFacts: "publicInfoFacts",
    publicSuggestions: "publicInfoSuggestions",
    publicFollowUps: "publicInfoFollowUps",
    publicRiskNotes: "publicInfoRiskNotes",
    publicDisplayState: "publicInfoDisplayState",
    projectPlanItems: "projectPlanItems"
  };
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
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const TRIAGE_TIERS = {
    suggested_accept: "Suggested Accept",
    review_recommended: "Review Recommended",
    requires_review: "Requires Review",
    conflict: "Conflict",
    unsupported_limitation: "Unsupported"
  };
  const publicTriageRank = {
    conflict: 0,
    requires_review: 1,
    review_recommended: 2,
    suggested_accept: 3,
    unsupported_limitation: 4
  };
  const publicItemTypeRank = {
    suggestion: 0,
    fact: 1,
    follow_up: 2,
    issue: 3,
    limitation: 4
  };
  const closedPublicStatuses = new Set([
    "accepted",
    "rejected",
    "dismissed",
    "addressed",
    "resolved",
    "closed",
    "complete",
    "completed",
    "converted_to_follow_up"
  ]);
  const closedClientStatuses = new Set([
    "accepted",
    "rejected",
    "dismissed",
    "addressed",
    "resolved",
    "reviewed",
    "converted_to_follow_up"
  ]);
  const REVIEW_FILTERS = [
    { id: "all", label: "All open items" },
    { id: "client_source", label: "Client Source Intake" },
    { id: "public_research", label: "Public Research" },
    { id: "requirements", label: "Requirements Review" },
    { id: "project_plan", label: "Project Plan" },
    { id: "clarify", label: "Needs Client Clarification" },
    { id: "revise", label: "Needs Revision" },
    { id: "attention", label: "Conflicts / Requires Review" },
    { id: "suggested_accept", label: "Suggested Accept" }
  ];
  const CLIENT_SOURCE_SECTION_KEYS = new Set(["client-facts", "suggestions", "followups", "issues"]);
  const ALL_SECTION_KEYS = ["requirements", "project-plan", "public-research", "client-facts", "suggestions", "followups", "issues"];
  const elements = {};
  let requirementsLibrary = [];
  let questionsConfig = {};
  let taxonomyConfig = {};
  let questionLookup = {};
  let activeFilter = "all";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    elements.workspace = document.getElementById("review-queue-workspace");
    elements.summary = document.getElementById("review-queue-summary");
    elements.metrics = document.getElementById("review-queue-metrics");
    elements.filters = document.getElementById("review-queue-filters");
    elements.emptyState = document.getElementById("review-queue-empty-state");
    elements.requirements = document.getElementById("review-queue-requirements");
    elements.projectPlan = document.getElementById("review-queue-project-plan");
    elements.publicResearch = document.getElementById("review-queue-public-research");
    elements.clientFacts = document.getElementById("review-queue-client-facts");
    elements.suggestions = document.getElementById("review-queue-suggestions");
    elements.followups = document.getElementById("review-queue-followups");
    elements.issues = document.getElementById("review-queue-issues");
    elements.sections = {
      requirements: document.querySelector('[data-review-queue-section="requirements"]'),
      "project-plan": document.querySelector('[data-review-queue-section="project-plan"]'),
      "public-research": document.querySelector('[data-review-queue-section="public-research"]'),
      "client-facts": document.querySelector('[data-review-queue-section="client-facts"]'),
      suggestions: document.querySelector('[data-review-queue-section="suggestions"]'),
      followups: document.querySelector('[data-review-queue-section="followups"]'),
      issues: document.querySelector('[data-review-queue-section="issues"]')
    };

    if (!window.RfpWorkspaces) {
      renderError("Workspace storage is unavailable.");
      return;
    }

    bindFilterActions();
    await loadRequirementsReferenceData();
    renderQueue();
  }

  function bindFilterActions() {
    if (!elements.filters) {
      return;
    }

    elements.filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-review-filter]");

      if (!button) {
        return;
      }

      activeFilter = button.getAttribute("data-review-filter") || "all";
      renderQueue();
    });
  }

  async function loadRequirementsReferenceData() {
    try {
      const [requirementsResponse, questionsResponse, taxonomyResponse] = await Promise.all([
        fetch(REQUIREMENTS_URL),
        fetch(QUESTIONS_URL),
        fetch(TAXONOMY_URL)
      ]);

      if (!requirementsResponse.ok || !questionsResponse.ok || !taxonomyResponse.ok) {
        throw new Error("Requirements reference data failed to load.");
      }

      const [library, questions, taxonomy] = await Promise.all([
        requirementsResponse.json(),
        questionsResponse.json(),
        taxonomyResponse.json()
      ]);

      requirementsLibrary = Array.isArray(library.requirements) ? library.requirements : [];
      questionsConfig = questions || {};
      taxonomyConfig = taxonomy || {};
      questionLookup = buildQuestionLookup(questionsConfig);
    } catch (error) {
      requirementsLibrary = [];
      questionsConfig = {};
      taxonomyConfig = {};
      questionLookup = {};
    }
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

  function buildQuestionLookup(config) {
    const lookup = {};
    const sections = Array.isArray(config.sections) ? config.sections : [];

    sections.forEach((section) => {
      const questions = Array.isArray(section.questions) ? section.questions : [];

      questions.forEach((question) => {
        const optionMap = new Map();

        getOptionList(question).forEach((option) => {
          optionMap.set(option.value, option.label || formatDisplayLabel(option.value));
        });

        lookup[question.id] = {
          label: question.id === "integration_partners"
            ? "Integration Partners"
            : question.label || formatDisplayLabel(question.id),
          optionMap
        };
      });
    });

    return lookup;
  }

  function lowerFirst(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function getQuestionLabel(answerKey) {
    return questionLookup[answerKey]?.label || formatDisplayLabel(answerKey).toLowerCase();
  }

  function getAnswerLabel(answerKey, value) {
    return questionLookup[answerKey]?.optionMap?.get(value) || formatDisplayLabel(value);
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

  function matchesCriteria(requirement, answers) {
    const criteria = requirement.criteria || {};

    if (criteria.always) {
      return true;
    }

    if (criteria.any && !Object.entries(criteria.any).some(([answerKey, expectedValues]) =>
      answerIncludes(answers[answerKey], expectedValues)
    )) {
      return false;
    }

    if (criteria.all && !Object.entries(criteria.all).every(([answerKey, expectedValues]) =>
      answerIncludes(answers[answerKey], expectedValues)
    )) {
      return false;
    }

    if (criteria.none && !Object.entries(criteria.none).every(([answerKey, excludedValues]) =>
      answerExcludes(answers[answerKey], excludedValues)
    )) {
      return false;
    }

    return Boolean(criteria.any || criteria.all || criteria.none);
  }

  function formatSelectionReason(answerKey, matchedValues, answer) {
    if (!matchedValues.length) {
      return "";
    }

    const label = questionLookup[answerKey]?.label
      ? lowerFirst(questionLookup[answerKey].label)
      : formatDisplayLabel(answerKey).toLowerCase();
    const verb = Array.isArray(answer) || matchedValues.length > 1 ? "includes" : "is";
    const values = matchedValues.map((value) => getAnswerLabel(answerKey, value)).join(", ");

    return `Selected because ${label} ${verb} ${values}.`;
  }

  function getSelectionReasons(requirement, answers) {
    const criteria = requirement.criteria || {};
    const reasons = [];

    if (criteria.always) {
      reasons.push("Baseline requirement included for all procurement projects.");
    }

    if (criteria.any) {
      Object.entries(criteria.any).forEach(([answerKey, expectedValues]) => {
        const reason = formatSelectionReason(
          answerKey,
          getMatchedValues(answers[answerKey], expectedValues),
          answers[answerKey]
        );

        if (reason) {
          reasons.push(reason);
        }
      });
    }

    if (criteria.all) {
      Object.entries(criteria.all).forEach(([answerKey, expectedValues]) => {
        const reason = formatSelectionReason(
          answerKey,
          getMatchedValues(answers[answerKey], expectedValues),
          answers[answerKey]
        );

        if (reason) {
          reasons.push(reason);
        }
      });
    }

    if (criteria.none) {
      Object.entries(criteria.none).forEach(([answerKey]) => {
        reasons.push(`Selected because ${lowerFirst(getQuestionLabel(answerKey))} does not include excluded values.`);
      });
    }

    return reasons.length ? reasons : ["Matched the current project intake answers."];
  }

  function isReviewNeededDecision(decision) {
    return decision === "revise" || decision === "clarify";
  }

  function getReviewDecisionLabel(decision) {
    const labels = {
      revise: "Needs Revision",
      clarify: "Needs Client Clarification"
    };

    return labels[decision] || formatDisplayLabel(decision || "no_decision");
  }

  function getRequirementReviewNotesMap() {
    if (!window.RfpWorkspaces.getRequirementReviewNotes) {
      return {};
    }

    const wrapper = window.RfpWorkspaces.getRequirementReviewNotes();
    return wrapper && wrapper.notes && typeof wrapper.notes === "object" ? wrapper.notes : {};
  }

  function getReviewDecisionMap() {
    if (!window.RfpWorkspaces.getReviewDecisions) {
      return {};
    }

    return window.RfpWorkspaces.getReviewDecisions() || {};
  }

  function getProjectSpecificRequirementWrapper() {
    if (!window.RfpWorkspaces.getProjectSpecificRequirements) {
      return { requirements: [] };
    }

    return window.RfpWorkspaces.getProjectSpecificRequirements() || { requirements: [] };
  }

  function getGeneratedRequirementsNeedingReview(answers, decisions, notes) {
    if (!answers || !requirementsLibrary.length) {
      return [];
    }

    return requirementsLibrary
      .filter((requirement) => matchesCriteria(requirement, answers))
      .map((requirement) => {
        const decision = decisions[requirement.id];

        if (!isReviewNeededDecision(decision)) {
          return null;
        }

        return {
          id: requirement.id,
          title: requirement.title || "Untitled requirement",
          sourceType: "Approved Library",
          section: requirement.sectionLabel || requirement.sectionId || "Uncategorized",
          category: requirement.categoryLabel || requirement.categoryId || "",
          functionLabel: requirement.functionLabel || requirement.functionId || "",
          priority: requirement.priority || "unspecified",
          decision,
          decisionLabel: getReviewDecisionLabel(decision),
          consultantNote: notes[requirement.id]?.note || "",
          whySelected: getSelectionReasons(requirement, answers),
          text: requirement.text || "",
          sortKey: requirement.sortOrder || 0
        };
      })
      .filter(Boolean);
  }

  function getProjectSpecificRequirementsNeedingReview(decisions, notes) {
    const wrapper = getProjectSpecificRequirementWrapper();
    const projectSpecificRequirements = Array.isArray(wrapper.requirements) ? wrapper.requirements : [];

    return projectSpecificRequirements
      .map((requirement, index) => {
        const decision = decisions[requirement.id];

        if (!isReviewNeededDecision(decision)) {
          return null;
        }

        return {
          id: requirement.id,
          title: requirement.title || "Untitled project-specific requirement",
          sourceType: "Project Specific",
          section: requirement.section || "Project-Specific Requirements",
          category: requirement.category || "Project Specific",
          functionLabel: requirement.function || "Project Specific",
          priority: requirement.priority || "unspecified",
          decision,
          decisionLabel: getReviewDecisionLabel(decision),
          consultantNote: notes[requirement.id]?.note || "",
          whySelected: ["Project-specific requirement added for this workspace."],
          text: requirement.requirementText || "",
          sortKey: 100000 + index
        };
      })
      .filter(Boolean);
  }

  function getRequirementsNeedingReview() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const answers = window.RfpWorkspaces.getWorkspaceAnswers
      ? window.RfpWorkspaces.getWorkspaceAnswers(workspace.id)
      : window.RfpWorkspaces.getAnswers?.();
    const decisions = getReviewDecisionMap();
    const notes = getRequirementReviewNotesMap();
    const generatedItems = getGeneratedRequirementsNeedingReview(answers, decisions, notes);
    const projectSpecificItems = getProjectSpecificRequirementsNeedingReview(decisions, notes);

    return [...generatedItems, ...projectSpecificItems].sort((a, b) => {
      const decisionDelta = a.decision.localeCompare(b.decision);

      if (decisionDelta !== 0) {
        return decisionDelta;
      }

      const sectionDelta = String(a.section || "").localeCompare(String(b.section || ""));

      if (sectionDelta !== 0) {
        return sectionDelta;
      }

      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function buildQueueData() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const documents = readCollection(COLLECTIONS.documents);
    const documentById = new Map(documents.map((documentRecord) => [documentRecord.id, documentRecord]));
    const clientFacts = readCollection(COLLECTIONS.facts)
      .filter(isOpenClientFact)
      .sort(sortClientSourceItems);
    const publicSources = readCollection(COLLECTIONS.publicSources);
    const publicResearchItems = getPublicResearchReviewItems(publicSources);
    const requirementsNeedingReview = getRequirementsNeedingReview();
    const pendingSuggestions = readCollection(COLLECTIONS.suggestions)
      .filter((item) => item.status === "pending_review")
      .sort(sortClientSourceItems);
    const openQuestions = readCollection(COLLECTIONS.questions)
      .filter((item) => (item.status || "open") === "open")
      .sort(sortClientSourceItems);
    const openIssues = readCollection(COLLECTIONS.riskNotes)
      .filter(isOpenRiskNote)
      .sort(sortClientSourceItems);
    const projectPlanItems = getProjectPlanAttentionItems(workspace.id);

    return {
      workspace,
      documentById,
      requirementsNeedingReview,
      publicResearchItems,
      clientFacts,
      pendingSuggestions,
      openQuestions,
      openIssues,
      projectPlanItems
    };
  }

  function renderQueue() {
    const queue = buildQueueData();
    const filteredQueue = filterQueueData(queue, activeFilter);
    const counts = getQueueCounts(queue);
    const filteredCount = getQueueTotal(filteredQueue);

    elements.workspace.textContent = queue.workspace.name;
    elements.summary.textContent = counts.totalOpen
      ? `${counts.totalOpen} open review item${counts.totalOpen === 1 ? "" : "s"} across Review Queue. Showing ${filteredCount} for ${getActiveFilterLabel().toLowerCase()}.`
      : "No open review items found for the selected workspace.";
    elements.metrics.innerHTML = [
      renderMetric("Total open", counts.totalOpen),
      renderMetric("Client Source", counts.clientSource),
      renderMetric("Public Research", counts.publicResearch),
      renderMetric("Needs Revision", counts.requirementsRevision),
      renderMetric("Client Clarification", counts.requirementsClarification),
      renderMetric("Project Plan", counts.projectPlan),
      renderMetric("Urgent / Conflict", counts.attention)
    ].join("");

    renderFilters(counts);
    renderEmptyState(filteredCount, counts.totalOpen);
    renderSections(filteredQueue);
  }

  function renderMetric(label, value) {
    return `
      <div class="home-metric">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }

  function getQueueCounts(queue) {
    const totalOpen = getQueueTotal(queue);
    const requirementsRevision = queue.requirementsNeedingReview.filter((item) => item.decision === "revise").length;
    const requirementsClarification = queue.requirementsNeedingReview.filter((item) => item.decision === "clarify").length;
    const clientSource = queue.clientFacts.length + queue.pendingSuggestions.length + queue.openQuestions.length + queue.openIssues.length;
    const attention = countFilterMatches(queue, "attention");
    const suggestedAccept = countFilterMatches(queue, "suggested_accept");

    return {
      totalOpen,
      clientSource,
      publicResearch: queue.publicResearchItems.length,
      requirements: queue.requirementsNeedingReview.length,
      requirementsRevision,
      requirementsClarification,
      projectPlan: queue.projectPlanItems.length,
      attention,
      suggestedAccept
    };
  }

  function getQueueTotal(queue) {
    return queue.requirementsNeedingReview.length +
      queue.publicResearchItems.length +
      queue.clientFacts.length +
      queue.pendingSuggestions.length +
      queue.openQuestions.length +
      queue.openIssues.length +
      queue.projectPlanItems.length;
  }

  function countFilterMatches(queue, filterId) {
    return getQueueTotal(filterQueueData(queue, filterId));
  }

  function renderFilters(counts) {
    if (!elements.filters) {
      return;
    }

    const countByFilter = {
      all: counts.totalOpen,
      client_source: counts.clientSource,
      public_research: counts.publicResearch,
      requirements: counts.requirements,
      project_plan: counts.projectPlan,
      clarify: counts.requirementsClarification,
      revise: counts.requirementsRevision,
      attention: counts.attention,
      suggested_accept: counts.suggestedAccept
    };

    elements.filters.innerHTML = REVIEW_FILTERS
      .map((filter) => {
        const active = filter.id === activeFilter;
        const count = countByFilter[filter.id] ?? 0;

        return `
          <button
            type="button"
            class="review-queue-filter-chip${active ? " active" : ""}"
            data-review-filter="${escapeHtml(filter.id)}"
            aria-pressed="${active ? "true" : "false"}"
          >
            <span>${escapeHtml(filter.label)}</span>
            <strong>${escapeHtml(count)}</strong>
          </button>
        `;
      })
      .join("");
  }

  function getActiveFilterLabel() {
    return REVIEW_FILTERS.find((filter) => filter.id === activeFilter)?.label || "All open items";
  }

  function renderEmptyState(filteredCount, totalOpen) {
    if (!elements.emptyState) {
      return;
    }

    const heading = elements.emptyState.querySelector("h2");
    const copy = elements.emptyState.querySelector("p:last-child");

    elements.emptyState.classList.toggle("hidden", filteredCount > 0);

    if (heading) {
      heading.textContent = totalOpen
        ? `No items match ${getActiveFilterLabel().toLowerCase()}.`
        : "No open review items found.";
    }

    if (copy) {
      copy.textContent = totalOpen
        ? "Choose another filter or open the source pages to continue review work."
        : "Use Project Intake, Client Source Intake, Public Research, Requirements Review, and Project Plan to generate or route review work.";
    }
  }

  function renderSections(queue) {
    elements.requirements.innerHTML = renderRequirementReviewItems(queue.requirementsNeedingReview);
    elements.projectPlan.innerHTML = renderProjectPlanAttentionItems(queue.projectPlanItems);
    elements.publicResearch.innerHTML = renderPublicResearchReviewItems(queue.publicResearchItems);
    elements.clientFacts.innerHTML = renderClientFactItems(queue.clientFacts, queue.documentById);
    elements.suggestions.innerHTML = renderSuggestionItems(queue.pendingSuggestions, queue.documentById);
    elements.followups.innerHTML = renderFollowupItems(queue.openQuestions, queue.documentById);
    elements.issues.innerHTML = renderIssueItems(queue.openIssues, queue.documentById);

    ALL_SECTION_KEYS.forEach((sectionKey) => {
      const section = elements.sections[sectionKey];

      if (!section) {
        return;
      }

      section.classList.toggle("hidden", !shouldShowSection(sectionKey, queue));
    });
  }

  function shouldShowSection(sectionKey, queue) {
    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "client_source") {
      return CLIENT_SOURCE_SECTION_KEYS.has(sectionKey);
    }

    if (activeFilter === "public_research") {
      return sectionKey === "public-research";
    }

    if (activeFilter === "requirements" || activeFilter === "clarify" || activeFilter === "revise") {
      return sectionKey === "requirements";
    }

    if (activeFilter === "project_plan") {
      return sectionKey === "project-plan";
    }

    return getSectionCount(sectionKey, queue) > 0;
  }

  function getSectionCount(sectionKey, queue) {
    const counts = {
      requirements: queue.requirementsNeedingReview.length,
      "project-plan": queue.projectPlanItems.length,
      "public-research": queue.publicResearchItems.length,
      "client-facts": queue.clientFacts.length,
      suggestions: queue.pendingSuggestions.length,
      followups: queue.openQuestions.length,
      issues: queue.openIssues.length
    };

    return counts[sectionKey] || 0;
  }

  function filterQueueData(queue, filterId) {
    const resolvedFilter = REVIEW_FILTERS.some((filter) => filter.id === filterId) ? filterId : "all";
    const filterItems = (scope, items) => items.filter((item) => matchesFilter(scope, item, resolvedFilter));

    return {
      ...queue,
      requirementsNeedingReview: filterItems("requirements", queue.requirementsNeedingReview),
      publicResearchItems: filterItems("public", queue.publicResearchItems),
      clientFacts: filterItems("client_fact", queue.clientFacts),
      pendingSuggestions: filterItems("suggestion", queue.pendingSuggestions),
      openQuestions: filterItems("followup", queue.openQuestions),
      openIssues: filterItems("issue", queue.openIssues),
      projectPlanItems: filterItems("project_plan", queue.projectPlanItems)
    };
  }

  function matchesFilter(scope, item, filterId) {
    if (filterId === "all") {
      return true;
    }

    if (filterId === "client_source") {
      return ["client_fact", "suggestion", "followup", "issue"].includes(scope);
    }

    if (filterId === "public_research") {
      return scope === "public";
    }

    if (filterId === "requirements") {
      return scope === "requirements";
    }

    if (filterId === "project_plan") {
      return scope === "project_plan";
    }

    if (filterId === "clarify") {
      return scope === "requirements" && item.decision === "clarify";
    }

    if (filterId === "revise") {
      return scope === "requirements" && item.decision === "revise";
    }

    if (filterId === "attention") {
      return isAttentionItem(scope, item);
    }

    if (filterId === "suggested_accept") {
      return isSuggestedAcceptItem(scope, item);
    }

    return true;
  }

  function isAttentionItem(scope, item) {
    if (scope === "requirements") {
      return item.decision === "clarify" || item.decision === "revise";
    }

    if (scope === "public") {
      return ["conflict", "requires_review", "unsupported_limitation"].includes(item.triageState?.tier);
    }

    if (scope === "project_plan") {
      return item.status === "blocked" || item.type === "risk";
    }

    const triageState = getClientTriageForScope(scope, item);
    return ["conflict", "requires_review", "unsupported_limitation"].includes(triageState.tier);
  }

  function isSuggestedAcceptItem(scope, item) {
    if (scope === "public") {
      return item.triageState?.tier === "suggested_accept";
    }

    if (["client_fact", "suggestion", "followup", "issue"].includes(scope)) {
      return getClientTriageForScope(scope, item).tier === "suggested_accept";
    }

    return false;
  }

  function isOpenClientFact(fact) {
    return !closedClientStatuses.has(String(fact.status || "unreviewed").toLowerCase());
  }

  function getClientTriageForScope(scope, item) {
    const typeByScope = {
      client_fact: "fact",
      suggestion: "suggestion",
      followup: "question",
      issue: "risk"
    };

    return getClientTriage(item, typeByScope[scope] || inferClientRecordType(item));
  }

  function inferClientRecordType(record) {
    if (Object.prototype.hasOwnProperty.call(record, "factText") || Object.prototype.hasOwnProperty.call(record, "factType")) {
      return "fact";
    }

    if (Object.prototype.hasOwnProperty.call(record, "questionText")) {
      return "question";
    }

    if (Object.prototype.hasOwnProperty.call(record, "severity") || Object.prototype.hasOwnProperty.call(record, "description")) {
      return "risk";
    }

    return "suggestion";
  }

  function getClientTriage(record, type) {
    if (type === "fact") {
      return hasClientSourceEvidence(record)
        ? triageByConfidence(record.confidence, true)
        : triage("unsupported_limitation");
    }

    if (type === "suggestion") {
      if (record.conflictState === "conflicts_existing_answer") {
        return triage("conflict");
      }

      const confidence = normalizeConfidenceForTriage(record.confidence);
      if (confidence === "low") {
        return triage("requires_review");
      }

      return confidence === "high" ? triage("suggested_accept") : triage("review_recommended");
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

  function hasClientSourceEvidence(record) {
    if (record.clientSourceDocumentId) {
      return true;
    }

    if (Array.isArray(record.sourceFactIds) && record.sourceFactIds.length) {
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

  function sortClientSourceItems(a, b) {
    const aTriage = getClientTriage(a, inferClientRecordType(a));
    const bTriage = getClientTriage(b, inferClientRecordType(b));
    const triageDelta = (publicTriageRank[aTriage.tier] ?? 2) - (publicTriageRank[bTriage.tier] ?? 2);

    if (triageDelta !== 0) {
      return triageDelta;
    }

    const priorityDelta =
      (priorityRank[normalizePriority(a.priority || a.severity)] ?? 1) -
      (priorityRank[normalizePriority(b.priority || b.severity)] ?? 1);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getTime(b) - getTime(a);
  }

  function getProjectPlanAttentionItems(workspaceId) {
    if (!workspaceId) {
      return [];
    }

    try {
      const savedPlan = JSON.parse(localStorage.getItem(`rfpWorkspace:${workspaceId}:${COLLECTIONS.projectPlanItems}`)) || {};
      const items = Array.isArray(savedPlan.items)
        ? savedPlan.items
        : Array.isArray(savedPlan) ? savedPlan : [];

      return items
        .filter(isProjectPlanAttentionItem)
        .sort(sortProjectPlanAttentionItems);
    } catch (error) {
      return [];
    }
  }

  function isProjectPlanAttentionItem(item) {
    if (!item || typeof item !== "object") {
      return false;
    }

    const status = String(item.status || "not_started").toLowerCase();
    const type = String(item.type || "").toLowerCase();

    if (["complete", "completed", "not_applicable"].includes(status)) {
      return false;
    }

    return status === "blocked" || ["risk", "dependency", "decision"].includes(type);
  }

  function sortProjectPlanAttentionItems(a, b) {
    const blockedDelta = Number(b.status === "blocked") - Number(a.status === "blocked");

    if (blockedDelta !== 0) {
      return blockedDelta;
    }

    const typeRank = { risk: 0, decision: 1, dependency: 2 };
    const typeDelta = (typeRank[a.type] ?? 3) - (typeRank[b.type] ?? 3);

    if (typeDelta !== 0) {
      return typeDelta;
    }

    const dueDelta = getDueTime(a.dueDate) - getDueTime(b.dueDate);

    if (dueDelta !== 0) {
      return dueDelta;
    }

    return getTime(b) - getTime(a);
  }

  function getDueTime(value) {
    const time = Date.parse(value || "");
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  }

  function renderRequirementReviewItems(items) {
    if (!items.length) {
      return '<p class="staged-muted">No Requirements Review decisions are currently marked Needs Revision or Needs Client Clarification.</p>';
    }

    return items
      .map((item) => `
        <article class="review-queue-item review-queue-requirement-item">
          <div>
            <div class="staged-badge-row">
              <span class="staged-badge ${item.decision === "clarify" ? "staged-badge-warning" : ""}">${escapeHtml(item.decisionLabel)}</span>
              <span class="staged-badge">${escapeHtml(item.sourceType)}</span>
            </div>
            <h3>${escapeHtml(item.title || item.id || "Untitled requirement")}</h3>
            <p>${escapeHtml(truncateText(item.text || "No requirement text provided.", 240))}</p>
            ${renderMetaRows([
              ["Requirement ID", item.id],
              ["Source Type", item.sourceType],
              ["Section", item.section],
              ["Priority", formatDisplayLabel(item.priority)],
              ["Review Decision", item.decisionLabel],
              item.consultantNote ? ["Consultant Note", item.consultantNote] : null,
              ["Why Selected", Array.isArray(item.whySelected) ? item.whySelected.join("; ") : item.whySelected]
            ].filter(Boolean))}
          </div>
          <a class="secondary-link" href="preview.html?requirementId=${encodeURIComponent(item.id || "")}">Open Requirements Review</a>
        </article>
      `)
      .join("");
  }

  function renderProjectPlanAttentionItems(items) {
    if (!items.length) {
      return '<p class="staged-muted">No open risks, dependencies, decisions, or blocked project plan items were found.</p>';
    }

    return items
      .map((item) => `
        <article class="review-queue-item">
          <div>
            <div class="staged-badge-row">
              <span class="staged-badge">${escapeHtml(formatDisplayLabel(item.type || "plan item"))}</span>
              <span class="staged-badge ${item.status === "blocked" ? "staged-badge-warning" : ""}">${escapeHtml(statusText(item.status || "not_started"))}</span>
            </div>
            <h3>${escapeHtml(item.title || "Untitled project plan item")}</h3>
            ${item.notes ? `<p>${escapeHtml(truncateText(item.notes, 220))}</p>` : ""}
            ${renderMetaRows([
              ["Owner", item.owner || "Unassigned"],
              ["Due date", item.dueDate ? formatDateValue(item.dueDate) : "No due date"],
              ["Phase", item.roadmapBucketId ? formatDisplayLabel(item.roadmapBucketId) : "Not linked"]
            ])}
          </div>
          <a class="secondary-link" href="project-plan.html">Open Project Plan</a>
        </article>
      `)
      .join("");
  }

  function renderClientFactItems(facts, documentById) {
    if (!facts.length) {
      return '<p class="staged-muted">No extracted client source facts need review.</p>';
    }

    return facts
      .map((fact) => `
        <article class="review-queue-item">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getClientTriage(fact, "fact"))}
              <span class="staged-badge">Client Fact</span>
              <span class="staged-badge">${escapeHtml(formatDisplayLabel(fact.confidence || "medium"))}</span>
              <span class="staged-badge">${escapeHtml(statusText(fact.status || "unreviewed"))}</span>
            </div>
            <h3>${escapeHtml(formatDisplayLabel(fact.factType || "other"))}</h3>
            <p>${escapeHtml(truncateText(fact.factText || "Untitled source fact", 220))}</p>
            ${renderMetaRows([
              ["Normalized value", fact.normalizedValue || "Not provided"],
              ["Source document", sourceTitle(documentById, fact.clientSourceDocumentId)],
              ["Evidence entries", Array.isArray(fact.evidence) ? String(fact.evidence.length) : "0"]
            ])}
          </div>
          <a class="secondary-link" href="client-source-intake.html">Review in Client Source Intake</a>
        </article>
      `)
      .join("");
  }

  function getPublicResearchReviewItems(publicSources) {
    const sourceByUrl = buildPublicSourceUrlMap(publicSources);
    const displayState = getPublicInfoDisplayState();
    const facts = readCollection(COLLECTIONS.publicFacts)
      .filter(isOpenPublicFact)
      .map((fact) => createPublicResearchItem(fact, "fact", sourceByUrl, displayState));
    const suggestions = readCollection(COLLECTIONS.publicSuggestions)
      .filter(isOpenPublicSuggestion)
      .map((suggestion) => createPublicResearchItem(suggestion, "suggestion", sourceByUrl, displayState));
    const followUps = readCollection(COLLECTIONS.publicFollowUps)
      .filter(isOpenPublicActionItem)
      .map((followUp) => createPublicResearchItem(followUp, "follow_up", sourceByUrl, displayState));
    const riskNotes = readCollection(COLLECTIONS.publicRiskNotes);
    const issues = riskNotes
      .filter((note) => note.noteType !== "research_limitation")
      .filter(isOpenPublicActionItem)
      .map((note) => createPublicResearchItem(note, "issue", sourceByUrl, displayState));
    const limitations = riskNotes
      .filter((note) => note.noteType === "research_limitation")
      .filter(isOpenPublicActionItem)
      .map((note) => createPublicResearchItem(note, "limitation", sourceByUrl, displayState));

    return [...suggestions, ...facts, ...followUps, ...issues, ...limitations]
      .filter(Boolean)
      .sort(sortPublicResearchItems);
  }

  function buildPublicSourceUrlMap(publicSources) {
    const sourceByUrl = new Map();

    publicSources.forEach((source) => {
      const url = getRecordUrl(source);

      if (url && !sourceByUrl.has(url)) {
        sourceByUrl.set(url, source);
      }
    });

    return sourceByUrl;
  }

  function createPublicResearchItem(record, type, sourceByUrl, displayState) {
    const source = getPublicSourceInfo(record, sourceByUrl);
    const triageState = getPublicTriage(record, type);

    return {
      id: record.id || `${type}-${getTime(record)}`,
      type,
      typeLabel: getPublicTypeLabel(type),
      title: getPublicItemTitle(record, type),
      summary: getPublicItemSummary(record, type),
      status: getPublicItemStatus(record, type),
      sourceTitle: source.title,
      sourceUrl: source.url,
      triageState,
      isMinimized: isPublicInfoItemMinimized(displayState, type, record.id),
      record,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  function getPublicSourceInfo(record, sourceByUrl) {
    const url = getRecordUrl(record);
    const matchedSource = url ? sourceByUrl.get(url) : null;

    return {
      title: record.sourceTitle || matchedSource?.sourceTitle || matchedSource?.title || "",
      url: url || getRecordUrl(matchedSource)
    };
  }

  function renderPublicResearchReviewItems(items) {
    if (!items.length) {
      return '<p class="staged-muted">No public research items currently need review.</p>';
    }

    return items
      .map((item) => `
        <article class="review-queue-item public-research-review-item ${item.isMinimized ? "public-info-item-minimized" : ""}">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(item.triageState)}
              <span class="staged-badge">${escapeHtml(item.typeLabel)}</span>
              <span class="staged-badge">${escapeHtml(statusText(item.status))}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.isMinimized
              ? item.sourceTitle ? `<p>Source: ${escapeHtml(item.sourceTitle)}</p>` : ""
              : `
                <p>${escapeHtml(truncateText(item.summary || "No summary provided.", 240))}</p>
                ${renderMetaRows(getPublicItemMetaRows(item))}
              `}
          </div>
          <div class="review-action-stack">
            <a class="secondary-link" href="public-information-ai-assist.html">Review in Public Research</a>
          </div>
        </article>
      `)
      .join("");
  }

  function getPublicItemMetaRows(item) {
    const record = item.record;
    const rows = [
      ["Item type", item.typeLabel],
      ["Status", statusText(item.status)],
      item.sourceTitle ? ["Source title", item.sourceTitle] : null,
      item.sourceUrl ? ["Source URL", renderSafeExternalLink(item.sourceUrl)] : null
    ];

    if (item.type === "fact") {
      rows.push(
        ["Fact type", formatDisplayLabel(record.factType || "public_fact")],
        ["Confidence", formatDisplayLabel(record.confidence || "medium")],
        record.isInference ? ["Fact status", "Inference"] : null
      );
    }

    if (item.type === "suggestion") {
      rows.push(
        ["Project Intake field", ANSWER_LABELS[record.answerKey] || getQuestionLabel(record.answerKey)],
        ["Suggested value", getAnswerLabel(record.answerKey, record.suggestedValue)],
        ["Confidence", formatDisplayLabel(record.confidence || "medium")],
        record.conflictState === "conflicts_existing_answer" ? ["Conflict", "Conflicts with an existing confirmed answer"] : null
      );
    }

    if (item.type === "follow_up") {
      rows.push(
        ["Priority", formatDisplayLabel(record.priority || "medium")],
        ["Related answers", relatedAnswerLabels(record.relatedAnswerKeys || [])]
      );
    }

    if (item.type === "issue") {
      rows.push(
        ["Severity", formatDisplayLabel(record.severity || "medium")],
        record.recommendedAction ? ["Recommended action", record.recommendedAction] : null
      );
    }

    if (item.type === "limitation") {
      rows.push(
        ["Recommended action", record.recommendedAction || "Confirm what additional research or source material is needed."],
        ["Related answers", relatedAnswerLabels(record.relatedAnswerKeys || [])]
      );
    }

    return rows.filter(Boolean);
  }

  function getPublicTypeLabel(type) {
    const labels = {
      fact: "Public Fact",
      suggestion: "Suggested Answer",
      follow_up: "Follow-Up",
      issue: "Potential Issue",
      limitation: "Research Limitation"
    };

    return labels[type] || "Public Research Item";
  }

  function getPublicItemTitle(record, type) {
    if (type === "fact") {
      return formatDisplayLabel(record.factType || "Public fact");
    }

    if (type === "suggestion") {
      return record.suggestedLabel || getAnswerLabel(record.answerKey, record.suggestedValue);
    }

    if (type === "follow_up") {
      return record.question || "Untitled follow-up";
    }

    if (type === "issue") {
      return record.issue || "Untitled potential issue";
    }

    if (type === "limitation") {
      return record.limitation || "Research limitation";
    }

    return "Public research item";
  }

  function getPublicItemSummary(record, type) {
    if (type === "fact") {
      return record.factText || record.quoteOrExcerpt || "";
    }

    if (type === "suggestion") {
      return record.rationale || "Public information suggested this project intake answer.";
    }

    if (type === "follow_up") {
      return record.reason || "No reason provided.";
    }

    if (type === "issue") {
      return record.whyItMatters || record.description || "No issue detail provided.";
    }

    if (type === "limitation") {
      return record.whyItMatters || record.recommendedAction || "Public research left this point unresolved.";
    }

    return "";
  }

  function getPublicItemStatus(record, type) {
    if (type === "fact") {
      return record.reviewStatus || record.status || "pending";
    }

    if (type === "suggestion") {
      return record.status || record.reviewStatus || "pending_review";
    }

    return record.status || "open";
  }

  function isOpenPublicFact(fact) {
    return !closedPublicStatuses.has(String(fact.reviewStatus || fact.status || "pending").toLowerCase());
  }

  function isOpenPublicSuggestion(suggestion) {
    return !closedPublicStatuses.has(String(suggestion.status || suggestion.reviewStatus || "pending_review").toLowerCase());
  }

  function isOpenPublicActionItem(record) {
    return !closedPublicStatuses.has(String(record.status || "open").toLowerCase());
  }

  function sortPublicResearchItems(a, b) {
    const triageDelta = (publicTriageRank[a.triageState.tier] ?? 2) - (publicTriageRank[b.triageState.tier] ?? 2);

    if (triageDelta !== 0) {
      return triageDelta;
    }

    const typeDelta = (publicItemTypeRank[a.type] ?? 99) - (publicItemTypeRank[b.type] ?? 99);

    if (typeDelta !== 0) {
      return typeDelta;
    }

    return getTime(b) - getTime(a);
  }

  function getPublicTriage(record, type) {
    if (type === "limitation") {
      return triage("unsupported_limitation");
    }

    if (type === "fact") {
      if (!getRecordUrl(record)) {
        return triage("unsupported_limitation");
      }

      if (record.isInference) {
        return triage("requires_review");
      }

      return triageByConfidence(record.confidence, true);
    }

    if (type === "suggestion") {
      if (record.conflictState === "conflicts_existing_answer") {
        return triage("conflict");
      }

      const allowedValue = isAllowedAnswerValue(record.answerKey, record.suggestedValue);

      if (!allowedValue || normalizeConfidenceForTriage(record.confidence) === "low") {
        return triage("requires_review");
      }

      return normalizeConfidenceForTriage(record.confidence) === "high"
        ? triage("suggested_accept")
        : triage("review_recommended");
    }

    if (type === "follow_up") {
      return normalizePriority(record.priority) === "high"
        ? triage("requires_review")
        : triage("review_recommended");
    }

    if (type === "issue") {
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

  function normalizePriority(value) {
    const normalized = String(value || "medium").trim().toLowerCase();
    return ["low", "medium", "high"].includes(normalized) ? normalized : "medium";
  }

  function isAllowedAnswerValue(answerKey, value) {
    const lookup = questionLookup[answerKey];

    if (!lookup || !lookup.optionMap || lookup.optionMap.size === 0) {
      return Boolean(value);
    }

    return lookup.optionMap.has(value);
  }

  function getRecordUrl(record) {
    if (!record || typeof record !== "object") {
      return "";
    }

    const candidateKeys = [
      "sourceUrl",
      "sourceURL",
      "url",
      "citationUrl",
      "source_url",
      "sourceLink",
      "referenceUrl",
      "evidenceUrl",
      "href",
      "link"
    ];

    for (const key of candidateKeys) {
      const url = normalizeUrlValue(record[key]);

      if (url) {
        return url;
      }
    }

    return "";
  }

  function normalizeUrlValue(value) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const url = normalizeUrlValue(entry);

        if (url) {
          return url;
        }
      }

      return "";
    }

    if (value && typeof value === "object") {
      return normalizeUrlValue(value.url || value.href || value.sourceUrl || value.referenceUrl);
    }

    const text = String(value || "").trim();

    if (!text) {
      return "";
    }

    const markdownMatch = text.match(/\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
    const autolinkMatch = text.match(/^<\s*(https?:\/\/[^>\s]+)\s*>$/i);
    const rawMatch = text.match(/https?:\/\/[^\s<>)\]]+/i);
    const candidate = (markdownMatch?.[1] || autolinkMatch?.[1] || rawMatch?.[0] || "")
      .replace(/[),.;:]+$/g, "");

    if (!candidate) {
      return "";
    }

    try {
      const url = new URL(candidate);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function renderSafeExternalLink(url) {
    const safeUrl = normalizeUrlValue(url);

    if (!safeUrl) {
      return "Not provided";
    }

    return {
      html: `<a class="external-source-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>`
    };
  }

  function renderSuggestionItems(suggestions, documentById) {
    if (!suggestions.length) {
      return '<p class="staged-muted">No suggested intake answers currently need review.</p>';
    }

    return suggestions
      .map((suggestion) => `
        <article class="review-queue-item">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getClientTriage(suggestion, "suggestion"))}
              <span class="staged-badge">Suggested Intake Answer</span>
              <span class="staged-badge">${escapeHtml(statusText(suggestion.status))}</span>
              ${suggestion.conflictState === "conflicts_existing_answer" ? '<span class="staged-badge staged-badge-warning">Conflict</span>' : ""}
            </div>
            <h3>${escapeHtml(suggestion.suggestedLabel || formatDisplayLabel(suggestion.suggestedValue))}</h3>
            <p>${escapeHtml(suggestion.suggestionReason || "Client source suggested this project intake answer.")}</p>
            ${renderMetaRows([
              ["Answer", ANSWER_LABELS[suggestion.answerKey] || suggestion.answerKey],
              ["Confidence", formatDisplayLabel(suggestion.confidence || "medium")],
              ["Source document", sourceTitle(documentById, suggestion.clientSourceDocumentId)]
            ])}
          </div>
          <a class="secondary-link" href="client-source-intake.html">Review in Client Source Intake</a>
        </article>
      `)
      .join("");
  }

  function renderFollowupItems(questions, documentById) {
    if (!questions.length) {
      return '<p class="staged-muted">No client source follow-ups currently need review.</p>';
    }

    return questions
      .map((question) => `
        <article class="review-queue-item">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getClientTriage(question, "question"))}
              <span class="staged-badge">Follow-Up</span>
              <span class="staged-badge ${question.priority === "high" ? "staged-badge-warning" : ""}">${escapeHtml(formatDisplayLabel(question.priority || "medium"))}</span>
              <span class="staged-badge">${escapeHtml(statusText(question.status || "open"))}</span>
            </div>
            <h3>${escapeHtml(question.questionText || "Untitled follow-up")}</h3>
            <p>${escapeHtml(question.reason || "No reason provided.")}</p>
            ${renderMetaRows([
              ["Related answers", relatedAnswerLabels(question.relatedAnswerKeys || question.relatedQuestionIds || [])],
              ["Source document", sourceTitle(documentById, question.clientSourceDocumentId)]
            ])}
          </div>
          <a class="secondary-link" href="client-source-intake.html">Review in Client Source Intake</a>
        </article>
      `)
      .join("");
  }

  function renderIssueItems(issues, documentById) {
    if (!issues.length) {
      return '<p class="staged-muted">No client source potential issues currently need review.</p>';
    }

    return issues
      .map((issue) => `
        <article class="review-queue-item">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getClientTriage(issue, "risk"))}
              <span class="staged-badge">Potential Issue</span>
              <span class="staged-badge ${issue.severity === "high" ? "staged-badge-warning" : ""}">${escapeHtml(formatDisplayLabel(issue.severity || "medium"))}</span>
              <span class="staged-badge">${escapeHtml(statusText(issue.status || "open"))}</span>
            </div>
            <h3>${escapeHtml(issue.title || "Untitled potential issue")}</h3>
            <p>${escapeHtml(issue.description || "No description provided.")}</p>
            ${renderMetaRows([
              ["Related answers", relatedAnswerLabels(issue.relatedAnswerKeys || [])],
              ["Source document", sourceTitle(documentById, issue.clientSourceDocumentId)]
            ])}
          </div>
          <a class="secondary-link" href="client-source-intake.html">Review in Client Source Intake</a>
        </article>
      `)
      .join("");
  }

  function renderMetaRows(rows) {
    return `
      <dl class="review-queue-meta">
        ${rows
          .map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${renderMetaValue(value)}</dd>
            </div>
          `)
          .join("")}
      </dl>
    `;
  }

  function renderMetaValue(value) {
    if (value && typeof value === "object" && value.html) {
      return value.html;
    }

    return escapeHtml(value || "Not provided");
  }

  function sourceTitle(documentById, documentId) {
    if (!documentId || !documentById.has(documentId)) {
      return "Not linked";
    }

    return documentById.get(documentId).title || "Untitled source document";
  }

  function relatedAnswerLabels(keys) {
    const labels = (keys || [])
      .filter((key) => ANSWER_LABELS[key])
      .map((key) => ANSWER_LABELS[key]);

    return labels.length ? labels.join(", ") : "Not linked";
  }

  function getPublicInfoDisplayState() {
    try {
      const workspace = window.RfpWorkspaces.getActiveWorkspace();
      const savedState = JSON.parse(localStorage.getItem(`rfpWorkspace:${workspace.id}:${COLLECTIONS.publicDisplayState}`)) || {};
      const minimized = savedState.minimized && typeof savedState.minimized === "object"
        ? savedState.minimized
        : {};

      return { minimized };
    } catch (error) {
      return { minimized: {} };
    }
  }

  function isPublicInfoItemMinimized(displayState, type, id) {
    return Boolean(displayState?.minimized?.[publicInfoDisplayKey(type, id)]);
  }

  function publicInfoDisplayKey(type, id) {
    return `${type}:${id}`;
  }

  function readCollection(item) {
    try {
      const workspace = window.RfpWorkspaces.getActiveWorkspace();
      return JSON.parse(localStorage.getItem(`rfpWorkspace:${workspace.id}:${item}`)) || [];
    } catch (error) {
      return [];
    }
  }

  function isOpenRiskNote(note) {
    const status = note.status || "open";
    return status !== "dismissed" && status !== "converted_to_follow_up";
  }

  function sortByPriorityThenNewest(a, b) {
    const priorityDelta =
      (priorityRank[a.priority || a.severity || "medium"] ?? 1) -
      (priorityRank[b.priority || b.severity || "medium"] ?? 1);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getTime(b) - getTime(a);
  }

  function getTime(record) {
    const time = Date.parse(record.updatedAt || record.createdAt || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function truncateText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength - 1).trim()}...`;
  }

  function formatDateValue(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "Not provided";
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? new Date(`${text}T00:00:00`)
      : new Date(text);

    if (Number.isNaN(date.getTime())) {
      return text;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function statusText(value) {
    return formatDisplayLabel(value || "open");
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
      .replace(/\bRfp\b/g, "RFP");
  }

  function renderError(message) {
    [elements.workspace, elements.summary].filter(Boolean).forEach((element) => {
      element.textContent = message;
    });
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
