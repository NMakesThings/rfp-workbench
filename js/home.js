(function () {
  const COLLECTIONS = {
    documents: "clientSourceDocuments",
    suggestions: "suggestedInterviewAnswers",
    questions: "openQuestions",
    riskNotes: "clientRiskGapNotes",
    publicSources: "publicInfoSources",
    publicFacts: "publicInfoFacts",
    publicSuggestions: "publicInfoSuggestions",
    publicFollowUps: "publicInfoFollowUps",
    publicRiskNotes: "publicInfoRiskNotes",
    reviewDecisions: "reviewDecisions"
  };
  const HOME_DELIVERABLE_TYPES = {
    rfp_package: "RFP Package",
    assessment_report: "Assessment Report",
    executive_briefing: "Executive Briefing",
    implementation_plan: "Implementation Plan",
    requirements_matrix: "Requirements Matrix",
    evaluation_scoring_package: "Evaluation / Scoring Package",
    custom: "Other / Custom"
  };
  const HOME_TEMPLATE_SOURCE_LABELS = {
    outline_only: "Outline only",
    mcp_standard: "MCP standard template",
    client_provided: "Client-provided template",
    ad_hoc_custom: "Ad hoc / custom"
  };
  const HOME_MCP_TEMPLATE_TYPES = new Set([
    "rfp_package",
    "assessment_report",
    "executive_briefing",
    "implementation_plan",
    "requirements_matrix",
    "evaluation_scoring_package"
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
  const priorityRank = { high: 0, medium: 1, low: 2 };

  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    elements.pageTitle = document.querySelector(".app-header h1");
    elements.heroKicker = document.querySelector(".home-hero-copy .section-kicker");
    elements.actionLabel = document.querySelector(".home-action-label");
    elements.primaryActions = document.querySelector(".home-primary-actions");
    elements.phaseStripPanel = document.querySelector("[data-workflow-phase-strip]");
    elements.nextActionsPanel = document.querySelector(".home-next-actions-panel");
    elements.reviewStatus = document.querySelector(".home-review-status");
    elements.deliverablePanel = document.querySelector(".home-deliverable-readiness-panel");
    elements.lowerSections = Array.from(document.querySelectorAll(".home-collapsible-section"));
    elements.createWorkspace = document.getElementById("home-create-workspace");
    elements.inlineCreateWorkspace = document.getElementById("home-create-workspace-inline");
    elements.activeWorkspace = document.getElementById("home-active-workspace");
    elements.activeSummary = document.getElementById("home-active-summary");
    elements.reviewMetrics = document.getElementById("home-review-metrics");
    elements.deliverableReadiness = document.getElementById("home-deliverable-readiness");
    elements.recentHeading = document.getElementById("home-recent-heading");
    elements.recentWorkspaces = document.getElementById("home-recent-workspaces");
    elements.pendingHeading = document.getElementById("home-pending-heading");
    elements.pendingSuggestions = document.getElementById("home-pending-suggestions");
    elements.followupsHeading = document.getElementById("home-followups-heading");
    elements.followups = document.getElementById("home-followups");
    elements.issuesHeading = document.getElementById("home-issues-heading");
    elements.issues = document.getElementById("home-issues");
    elements.nextActions = document.getElementById("home-next-actions");

    if (!window.RfpWorkspaces) {
      renderUnavailable();
      return;
    }

    bindActions();
    renderHome();
  }

  function bindActions() {
    [elements.createWorkspace, elements.inlineCreateWorkspace].filter(Boolean).forEach((button) => {
      button.addEventListener("click", createWorkspaceFromHome);
    });

    if (elements.recentWorkspaces) {
      elements.recentWorkspaces.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-workspace]");

        if (!button) {
          return;
        }

        window.RfpWorkspaces.setActiveWorkspace(button.getAttribute("data-open-workspace"));
        window.location.href = "interview.html";
      });
    }
  }

  function createWorkspaceFromHome() {
    window.RfpWorkspaces.openCreateWorkspaceModal({ redirectTo: "interview.html" });
  }

  function renderHome() {
    const activeWorkspace = window.RfpWorkspaces.getActiveWorkspaceOrNull
      ? window.RfpWorkspaces.getActiveWorkspaceOrNull()
      : window.RfpWorkspaces.getActiveWorkspace();

    if (!activeWorkspace) {
      renderNoActiveWorkspaceHome();
      return;
    }

    renderActiveWorkspaceHome(activeWorkspace);
  }

  function renderActiveWorkspaceHome(activeWorkspace) {
    const answers = window.RfpWorkspaces.getAnswers() || {};
    const documents = readCollection(COLLECTIONS.documents);
    const suggestions = readCollection(COLLECTIONS.suggestions);
    const questions = readCollection(COLLECTIONS.questions);
    const riskNotes = readCollection(COLLECTIONS.riskNotes);
    const publicSources = readCollection(COLLECTIONS.publicSources);
    const publicFacts = readCollection(COLLECTIONS.publicFacts);
    const publicSuggestions = readCollection(COLLECTIONS.publicSuggestions);
    const publicFollowUps = readCollection(COLLECTIONS.publicFollowUps);
    const publicRiskNotes = readCollection(COLLECTIONS.publicRiskNotes);
    const reviewDecisions = readReviewDecisions();
    const clientTemplates = normalizeClientTemplateRecords(readScopedJson(activeWorkspace.id, "clientTemplates", []));
    const deliverablePreferences = normalizeHomeDeliverablePreferences(readScopedJson(activeWorkspace.id, "deliverablePreferences", null));
    const assessmentFindings = normalizeAssessmentFindings(readScopedJson(activeWorkspace.id, "assessmentFindings", null));
    const roadmap = window.RfpWorkspaces.getProjectRoadmap(activeWorkspace.id);
    const projectPlanItems = readProjectPlanItems(activeWorkspace.id);
    const pendingSuggestions = suggestions.filter((item) => item.status === "pending_review");
    const openQuestions = questions.filter((item) => (item.status || "open") === "open");
    const openRiskNotes = riskNotes.filter(isOpenRiskNote);
    const pendingPublicItems = countPendingPublicItems(publicFacts, publicSuggestions, publicFollowUps, publicRiskNotes);
    const requirementsNeedingReview = Object.values(reviewDecisions).filter((decision) => decision === "revise" || decision === "clarify").length;
    const projectPlanBlockers = projectPlanItems.filter((item) => item.status === "blocked").length;
    const publicRecordCount = publicSources.length + publicFacts.length + publicSuggestions.length + publicFollowUps.length + publicRiskNotes.length;
    const answerCount = countAnswers(answers);
    const procurementType = formatAnswerSummary(answers.procurement_type);
    const justiceDomain = formatAnswerSummary(answers.justice_domain);
    const currentPhase = getCurrentRoadmapPhase(roadmap);

    if (elements.pageTitle) {
      elements.pageTitle.textContent = "Continue project work";
    }

    if (elements.heroKicker) {
      elements.heroKicker.textContent = "Client / Project Snapshot";
    }

    elements.activeWorkspace.textContent = activeWorkspace.name;
    elements.activeSummary.classList.add("home-snapshot-grid");
    elements.activeSummary.innerHTML = renderSnapshotSummary([
      ["Procurement", procurementType],
      ["Domain", justiceDomain],
      ["Current phase", currentPhase],
      ["Confirmed answers", String(answerCount)],
      ["Source documents", String(documents.length)],
      ["Public research pending", String(pendingPublicItems)],
      ["Requirement review items", String(requirementsNeedingReview)],
      ["Project blockers", String(projectPlanBlockers)]
    ]);

    renderActiveWorkspaceActions();
    setWorkspaceSectionsVisible(true);

    renderReviewMetrics({
      pendingSuggestions: pendingSuggestions.length,
      pendingPublicItems,
      requirementsNeedingReview,
      openQuestions: openQuestions.length,
      openRiskNotes: openRiskNotes.length,
      projectPlanBlockers
    });
    renderDeliverableReadiness(buildDeliverableReadinessState({
      deliverablePreferences,
      clientTemplates,
      assessmentFindings,
      reviewDecisions,
      requirementsNeedingReview,
      pendingPublicItems,
      openQuestions: openQuestions.length,
      openRiskNotes: openRiskNotes.length,
      projectPlanBlockers,
      sourceMaterialCount: documents.length + publicSources.length + publicFacts.length,
      projectPlanItemCount: projectPlanItems.length
    }));
    renderNextBestActions({
      answerCount,
      documentsCount: documents.length,
      publicRecordCount,
      pendingPublicItems,
      reviewDecisionCount: Object.keys(reviewDecisions).length,
      requirementsNeedingReview,
      projectPlanItemCount: projectPlanItems.length,
      projectPlanBlockers
    });
    renderRecentWorkspaces(openQuestions, pendingSuggestions, openRiskNotes);
    renderPendingSuggestions(pendingSuggestions);
    renderFollowups(openQuestions);
    renderPotentialIssues(openRiskNotes);
  }

  function renderNoActiveWorkspaceHome() {
    if (elements.pageTitle) {
      elements.pageTitle.textContent = "Start project work";
    }

    if (elements.heroKicker) {
      elements.heroKicker.textContent = "Client / Project Workspace";
    }

    if (elements.activeWorkspace) {
      elements.activeWorkspace.textContent = "No workspace selected";
    }

    if (elements.activeSummary) {
      elements.activeSummary.classList.remove("home-snapshot-grid");
      elements.activeSummary.textContent = "Select or create a workspace to begin intake, research, requirements review, and project planning.";
    }

    if (elements.actionLabel) {
      elements.actionLabel.textContent = "Start here";
    }

    if (elements.primaryActions) {
      elements.primaryActions.innerHTML = `
        <button type="button" class="button primary" id="home-create-workspace-inline">Create New Workspace</button>
        <a class="button secondary" href="workspace-management.html">Open / Manage Workspaces</a>
      `;

      const createButton = document.getElementById("home-create-workspace-inline");

      if (createButton) {
        createButton.addEventListener("click", createWorkspaceFromHome);
      }
    }

    if (elements.reviewMetrics) {
      elements.reviewMetrics.innerHTML = "";
    }

    if (elements.nextActions) {
      elements.nextActions.innerHTML = "";
    }

    setWorkspaceSectionsVisible(false);
  }

  function renderSnapshotSummary(items) {
    return items
      .map(([label, value]) => `
        <span class="home-snapshot-item">
          <span class="home-snapshot-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(value || "Not set")}</strong>
        </span>
      `)
      .join("");
  }
  function renderActiveWorkspaceActions() {
    if (elements.actionLabel) {
      elements.actionLabel.textContent = "Pick up where you left off";
    }

    if (!elements.primaryActions) {
      return;
    }

    elements.primaryActions.innerHTML = `
      <a class="button primary" href="interview.html">Continue Project Intake</a>
      <a class="button secondary" href="client-source-intake.html">Add / Review Client Sources</a>
      <a class="button secondary" href="review-queue.html">Review Queue</a>
      <a class="button secondary" href="preview.html">Review Requirements</a>
      <a class="button secondary" href="project-plan.html">Project Plan</a>
      <a class="button secondary" href="workspace-management.html">Manage Workspaces</a>
    `;
  }

  function setWorkspaceSectionsVisible(isVisible) {
    [
      elements.phaseStripPanel,
      elements.nextActionsPanel,
      elements.reviewStatus,
      elements.deliverablePanel,
      ...elements.lowerSections
    ].filter(Boolean).forEach((element) => {
      element.hidden = !isVisible;
    });
  }

  function renderReviewMetrics(counts) {
    elements.reviewMetrics.innerHTML = [
      renderMetric("Pending suggestions", counts.pendingSuggestions, "review-queue.html"),
      renderMetric("Public research", counts.pendingPublicItems, "public-information-ai-assist.html"),
      renderMetric("Requirements review", counts.requirementsNeedingReview, "review-queue.html"),
      renderMetric("Open follow-ups", counts.openQuestions, "review-queue.html"),
      renderMetric("Potential issues", counts.openRiskNotes, "review-queue.html"),
      renderMetric("Plan blockers", counts.projectPlanBlockers, "project-plan.html")
    ].join("");
  }

  function renderDeliverableReadiness(state) {
    if (!elements.deliverableReadiness) {
      return;
    }

    const blockers = state.blockers.length
      ? state.blockers.slice(0, 5).map((blocker) => `<li><a href="${escapeHtml(blocker.href)}">${escapeHtml(blocker.label)}</a></li>`).join("")
      : "<li>No immediate deliverable blockers detected from available workspace data.</li>";
    const links = state.links.map((link) => `<a class="secondary-link home-deliverable-action-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("");
    const assessmentMetricRows = state.assessmentMetrics && state.assessmentMetrics.show
      ? `
          <div><dt>Assessment findings</dt><dd>${escapeHtml(String(state.assessmentMetrics.total))}</dd></div>
          <div><dt>Ready findings</dt><dd>${escapeHtml(String(state.assessmentMetrics.ready))}</dd></div>
          <div><dt>Needs review</dt><dd>${escapeHtml(String(state.assessmentMetrics.needsReview))}</dd></div>
          <div><dt>High/Critical needing recommendations</dt><dd>${escapeHtml(String(state.assessmentMetrics.highCriticalWithoutRecommendations))}</dd></div>
        `
      : "";

    elements.deliverableReadiness.innerHTML = `
      <article class="home-deliverable-card status-${escapeHtml(state.statusKey)}">
        <div class="home-deliverable-summary">
          <span class="staged-badge ${state.statusKey === "ready" ? "staged-badge-info" : "staged-badge-warning"}">${escapeHtml(state.statusLabel)}</span>
          <h3>${escapeHtml(state.deliverableLabel)}</h3>
          <p>${escapeHtml(state.summary)}</p>
        </div>
        <dl class="home-deliverable-metrics">
          <div><dt>Template source</dt><dd>${escapeHtml(state.templateSourceLabel)}</dd></div>
          <div><dt>Client templates</dt><dd>${escapeHtml(String(state.clientTemplateCount))}</dd></div>
          <div><dt>MCP standard template</dt><dd>${escapeHtml(state.mcpAvailability)}</dd></div>
          ${assessmentMetricRows}
        </dl>
        <div class="home-deliverable-next-actions">
          <span class="home-deliverable-subhead">Next actions</span>
          <ul class="home-deliverable-blockers">${blockers}</ul>
        </div>
        <div class="home-deliverable-actions" aria-label="Deliverable readiness links">
          <span class="home-deliverable-subhead">Open</span>
          ${links}
        </div>
      </article>
    `;
  }

  function buildDeliverableReadinessState(state) {
    const selectedType = HOME_DELIVERABLE_TYPES[state.deliverablePreferences.selectedDeliverableType]
      ? state.deliverablePreferences.selectedDeliverableType
      : "rfp_package";
    const selectedPreference = state.deliverablePreferences.deliverables[selectedType] || {};
    const templateSource = HOME_TEMPLATE_SOURCE_LABELS[selectedPreference.templateSource]
      ? selectedPreference.templateSource
      : "outline_only";
    const matchingClientTemplates = state.clientTemplates.filter((template) => template.deliverableType === selectedType);
    const selectedClientTemplate = matchingClientTemplates.find((template) => template.id === selectedPreference.selectedClientTemplateId) || matchingClientTemplates[0] || null;
    const insertionAreaCount = selectedClientTemplate
      ? (selectedClientTemplate.sections || []).filter((section) => section.classification === "insertion-area").length
      : 0;
    const includedRequirements = Object.values(state.reviewDecisions).filter((decision) => decision === "include").length;
    const blockers = [];
    const hasSavedPreference = Boolean(state.deliverablePreferences.hasSavedPreference);

    if (!hasSavedPreference) blockers.push({ label: "Choose a deliverable template source", href: "rfp-package.html" });
    if (selectedType === "rfp_package" && !includedRequirements) blockers.push({ label: "No requirements marked Include in RFP", href: "preview.html" });
    if (templateSource === "client_provided" && !matchingClientTemplates.length) blockers.push({ label: "No matching client template captured", href: "client-template-intake.html" });
    else if (templateSource === "client_provided" && !insertionAreaCount) blockers.push({ label: "Selected client template has no insertion areas", href: "client-template-intake.html" });
    if (state.requirementsNeedingReview) blockers.push({ label: "Open requirement review items", href: "review-queue.html" });
    if (state.pendingPublicItems || state.openQuestions || state.openRiskNotes) blockers.push({ label: "Open review queue source items", href: "review-queue.html" });
    if (state.projectPlanBlockers) blockers.push({ label: "Open Project Plan blockers", href: "project-plan.html" });

    const assessmentMetrics = getHomeAssessmentFindingMetrics(state.assessmentFindings || []);
    const showAssessmentMetrics = selectedType === "assessment_report" || assessmentMetrics.total > 0;
    if (selectedType === "assessment_report" && !assessmentMetrics.total) blockers.push({ label: "Create assessment findings", href: "assessment-findings.html" });
    if (assessmentMetrics.needsReview) blockers.push({ label: "Review assessment findings", href: "assessment-findings.html" });
    if (assessmentMetrics.highCriticalWithoutRecommendations) blockers.push({ label: "Add recommendations to high/critical findings", href: "assessment-findings.html" });

    let statusKey = "ready";
    let statusLabel = "Ready to assemble";
    if (!hasSavedPreference) {
      statusKey = "not-started";
      statusLabel = "Not started";
    } else if ((templateSource === "client_provided" && !matchingClientTemplates.length) || (selectedType === "rfp_package" && !includedRequirements)) {
      statusKey = "blocked";
      statusLabel = "Blocked / incomplete";
    } else if (blockers.length) {
      statusKey = "needs-review";
      statusLabel = "Needs review";
    }

    const assessmentSummary = showAssessmentMetrics ? ` ${assessmentMetrics.total} assessment finding${assessmentMetrics.total === 1 ? "" : "s"}; ${assessmentMetrics.ready} ready.` : "";
    const summary = `${HOME_TEMPLATE_SOURCE_LABELS[templateSource]} selected. ${matchingClientTemplates.length} matching client template${matchingClientTemplates.length === 1 ? "" : "s"}; ${HOME_MCP_TEMPLATE_TYPES.has(selectedType) ? "MCP standard template available" : "no MCP standard template configured"}.${assessmentSummary}`;
    const links = [
      { label: "Open Deliverable Builder", href: "rfp-package.html" },
      { label: "Open Client Template Intake", href: "client-template-intake.html" }
    ];
    if (selectedType === "assessment_report" || assessmentMetrics.total > 0 || blockers.some((blocker) => blocker.href === "assessment-findings.html")) links.push({ label: "Open Assessment Findings", href: "assessment-findings.html" });
    if (selectedType === "rfp_package" || blockers.some((blocker) => blocker.href === "preview.html")) links.push({ label: "Open Requirements Review", href: "preview.html" });
    if (blockers.some((blocker) => blocker.href === "review-queue.html")) links.push({ label: "Open Review Queue", href: "review-queue.html" });
    if (blockers.some((blocker) => blocker.href === "project-plan.html")) links.push({ label: "Open Project Plan", href: "project-plan.html" });

    return {
      statusKey,
      statusLabel,
      deliverableLabel: HOME_DELIVERABLE_TYPES[selectedType] || "RFP Package",
      templateSourceLabel: HOME_TEMPLATE_SOURCE_LABELS[templateSource],
      clientTemplateCount: state.clientTemplates.length,
      mcpAvailability: HOME_MCP_TEMPLATE_TYPES.has(selectedType) ? "Available" : "Not configured",
      assessmentMetrics: { ...assessmentMetrics, show: showAssessmentMetrics },
      blockers,
      links,
      summary
    };
  }
  function renderMetric(label, value, href) {
    return `
      <a class="home-status-chip" href="${escapeHtml(href)}">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </a>
    `;
  }

  function renderNextBestActions(state) {
    if (!elements.nextActions) {
      return;
    }

    const actions = buildNextBestActions(state).slice(0, 5);

    if (!actions.length) {
      elements.nextActions.innerHTML = `
        <article class="home-next-action-card">
          <div>
            <span class="staged-badge">Ready</span>
            <h3>Continue project review</h3>
            <p>No urgent next action was detected. Use the Review Queue or Project Plan to continue refinement.</p>
          </div>
          <a class="button secondary" href="review-queue.html">Open Review Queue</a>
        </article>
      `;
      return;
    }

    elements.nextActions.innerHTML = actions
      .map((action) => `
        <article class="home-next-action-card">
          <div>
            <span class="staged-badge">${escapeHtml(action.phase)}</span>
            <h3>${escapeHtml(action.title)}</h3>
            <p>${escapeHtml(action.reason)}</p>
          </div>
          <a class="button ${action.primary ? "primary" : "secondary"}" href="${escapeHtml(action.href)}">${escapeHtml(action.buttonLabel)}</a>
        </article>
      `)
      .join("");
  }

  function buildNextBestActions(state) {
    const actions = [];

    if (state.answerCount < 3) {
      actions.push({
        phase: "Intake",
        title: "Complete Project Intake",
        reason: "Core project facts drive requirements selection and later review decisions.",
        href: "interview.html",
        buttonLabel: "Continue Project Intake",
        primary: true
      });
    }

    if (!state.documentsCount) {
      actions.push({
        phase: "Intake",
        title: "Add Client Sources",
        reason: "Client documents and notes reduce duplicate entry and create a source trail.",
        href: "client-source-intake.html",
        buttonLabel: "Add Sources"
      });
    }

    if (!state.publicRecordCount) {
      actions.push({
        phase: "Research",
        title: "Start Public Research",
        reason: "Public agency context can reveal constraints, follow-ups, and planning risks.",
        href: "public-information-ai-assist.html",
        buttonLabel: "Open Public Research"
      });
    } else if (state.pendingPublicItems) {
      actions.push({
        phase: "Research",
        title: "Review Public Research Items",
        reason: `${state.pendingPublicItems} public research item${state.pendingPublicItems === 1 ? "" : "s"} need consultant review.`,
        href: "public-information-ai-assist.html",
        buttonLabel: "Review Public Research"
      });
    }

    if (!state.reviewDecisionCount) {
      actions.push({
        phase: "Requirements",
        title: "Review Requirements",
        reason: "Review generated requirements, gaps, and deliverable readiness before delivery work.",
        href: "preview.html",
        buttonLabel: "Review Requirements"
      });
    }

    if (state.requirementsNeedingReview) {
      actions.push({
        phase: "Review",
        title: "Resolve Requirement Review Items",
        reason: `${state.requirementsNeedingReview} requirement${state.requirementsNeedingReview === 1 ? "" : "s"} are marked for revision or clarification.`,
        href: "review-queue.html",
        buttonLabel: "Open Review Queue",
        primary: true
      });
    }

    if (!state.projectPlanItemCount) {
      actions.push({
        phase: "Planning",
        title: "Start Project Plan",
        reason: "Starter plans reduce blank-page work for deliverables, decisions, dependencies, and risks.",
        href: "project-plan.html",
        buttonLabel: "Open Project Plan"
      });
    } else if (state.projectPlanBlockers) {
      actions.push({
        phase: "Planning",
        title: "Review Project Plan Blockers",
        reason: `${state.projectPlanBlockers} project plan item${state.projectPlanBlockers === 1 ? "" : "s"} are blocked.`,
        href: "project-plan.html",
        buttonLabel: "Review Blockers",
        primary: true
      });
    }

    return actions;
  }

  function renderRecentWorkspaces() {
    const activeWorkspace = window.RfpWorkspaces.getActiveWorkspace();
    const workspaces = window.RfpWorkspaces.listWorkspaces()
      .sort((a, b) => getTime(b) - getTime(a))
      .slice(0, 6);

    if (elements.recentHeading) {
      elements.recentHeading.textContent = `Recent Workspaces (${workspaces.length})`;
    }

    if (!workspaces.length) {
      elements.recentWorkspaces.innerHTML = '<p class="staged-muted">No saved workspaces yet.</p>';
      return;
    }

    elements.recentWorkspaces.innerHTML = workspaces
      .map((workspace) => {
        const answers = window.RfpWorkspaces.getWorkspaceAnswers(workspace.id) || {};
        const active = workspace.id === activeWorkspace.id ? '<span class="workspace-status-badge">Active</span>' : "";

        return `
          <article class="home-workspace-card">
            <div>
              <h3>${escapeHtml(workspace.name)} ${active}</h3>
              <p>${escapeHtml(formatWorkspaceSummary(answers))}</p>
              <span>Updated ${escapeHtml(formatDate(workspace.updatedAt || answers.savedAt || workspace.createdAt))}</span>
            </div>
            <button type="button" class="button secondary" data-open-workspace="${escapeHtml(workspace.id)}">
              Open
            </button>
          </article>
        `;
      })
      .join("");
  }

  function renderPendingSuggestions(pendingSuggestions) {
    if (elements.pendingHeading) {
      elements.pendingHeading.textContent = `Pending Review (${pendingSuggestions.length})`;
    }

    if (!elements.pendingSuggestions) {
      return;
    }

    if (!pendingSuggestions.length) {
      elements.pendingSuggestions.innerHTML = '<p class="staged-muted">No pending suggestions for the active workspace.</p>';
      return;
    }

    elements.pendingSuggestions.innerHTML = pendingSuggestions
      .slice(0, 5)
      .map((suggestion) => `
        <article class="home-followup-item">
          <div>
            <span class="staged-badge">${escapeHtml(statusText(suggestion.status || "pending_review"))}</span>
            <h3>${escapeHtml(suggestion.suggestedLabel || formatDisplayLabel(suggestion.suggestedValue))}</h3>
            <p>${escapeHtml(suggestion.suggestionReason || "Client source suggested this project intake answer.")}</p>
            ${renderRelatedAnswers([suggestion.answerKey])}
          </div>
          <a class="secondary-link" href="review-queue.html">Review</a>
        </article>
      `)
      .join("");
  }

  function renderFollowups(openQuestions) {
    if (elements.followupsHeading) {
      elements.followupsHeading.textContent = `Follow-Ups (${openQuestions.length})`;
    }

    if (!openQuestions.length) {
      elements.followups.innerHTML = '<p class="staged-muted">No open follow-up questions for the active workspace.</p>';
      return;
    }

    elements.followups.innerHTML = [...openQuestions]
      .sort(sortByPriorityThenNewest)
      .slice(0, 5)
      .map((question) => `
        <article class="home-followup-item">
          <div>
            <span class="staged-badge ${question.priority === "high" ? "staged-badge-warning" : ""}">
              ${escapeHtml(formatDisplayLabel(question.priority || "medium"))}
            </span>
            <h3>${escapeHtml(question.questionText || "Untitled follow-up")}</h3>
            <p>${escapeHtml(question.reason || "No reason provided.")}</p>
            ${renderRelatedAnswers(question.relatedAnswerKeys || question.relatedQuestionIds || [])}
          </div>
          <a class="secondary-link" href="review-queue.html">Review</a>
        </article>
      `)
      .join("");
  }

  function renderPotentialIssues(openRiskNotes) {
    if (elements.issuesHeading) {
      elements.issuesHeading.textContent = `Potential Issues (${openRiskNotes.length})`;
    }

    if (!elements.issues) {
      return;
    }

    if (!openRiskNotes.length) {
      elements.issues.innerHTML = '<p class="staged-muted">No potential issues from source review for the active workspace.</p>';
      return;
    }

    elements.issues.innerHTML = openRiskNotes
      .slice(0, 5)
      .map((note) => `
        <article class="home-followup-item">
          <div>
            <span class="staged-badge ${note.severity === "high" ? "staged-badge-warning" : ""}">
              ${escapeHtml(formatDisplayLabel(note.severity || "medium"))}
            </span>
            <h3>${escapeHtml(note.title || "Untitled potential issue")}</h3>
            <p>${escapeHtml(note.description || "No description provided.")}</p>
            ${renderRelatedAnswers(note.relatedAnswerKeys || [])}
          </div>
          <a class="secondary-link" href="review-queue.html">Review</a>
        </article>
      `)
      .join("");
  }

  function formatWorkspaceSummary(answers) {
    const labels = [
      answers.project_name,
      answers.justice_domain,
      answers.system_type,
      answers.procurement_type
    ].filter(Boolean);

    return labels.length ? labels.map(formatDisplayLabel).join(" / ") : "No project intake profile saved yet.";
  }

  function renderRelatedAnswers(keys) {
    const labels = (keys || [])
      .filter((key) => ANSWER_LABELS[key])
      .map((key) => ANSWER_LABELS[key]);

    if (!labels.length) {
      return "";
    }

    return `<p class="home-related-answers">Related: ${escapeHtml(labels.join(", "))}</p>`;
  }

  function countAnswers(answers) {
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

  function isOpenRiskNote(note) {
    const status = note.status || "open";
    return status !== "dismissed" &&
      status !== "converted_to_follow_up" &&
      status !== "addressed" &&
      status !== "accepted" &&
      status !== "rejected";
  }

  function readScopedJson(workspaceId, item, fallback) {
    try {
      const value = localStorage.getItem(`rfpWorkspace:${workspaceId}:${item}`);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }


  function normalizeAssessmentFindings(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const findings = Array.isArray(source.findings) ? source.findings : Array.isArray(value) ? value : [];
    return findings.filter((finding) => finding && typeof finding === "object").map((finding) => ({
      findingType: String(finding.findingType || "finding"),
      severity: String(finding.severity || "medium"),
      status: String(finding.status || "draft"),
      evidence: String(finding.evidence || ""),
      recommendation: String(finding.recommendation || ""),
      sourceReferences: Array.isArray(finding.sourceReferences) ? finding.sourceReferences : []
    }));
  }

  function getHomeAssessmentFindingMetrics(findings) {
    const total = findings.length;
    const ready = findings.filter((finding) => finding.status === "ready").length;
    const needsReview = findings.filter((finding) => finding.status === "draft" || finding.status === "needs-review").length;
    const highCriticalWithoutRecommendations = findings.filter((finding) => (finding.severity === "high" || finding.severity === "critical") && !String(finding.recommendation || "").trim()).length;
    return { total, ready, needsReview, highCriticalWithoutRecommendations };
  }

  function normalizeClientTemplateRecords(value) {
    return Array.isArray(value)
      ? value.filter((template) => template && typeof template === "object").map((template) => ({
          ...template,
          id: template.id || "",
          deliverableType: template.deliverableType || "custom",
          sections: Array.isArray(template.sections) ? template.sections : []
        }))
      : [];
  }

  function normalizeHomeDeliverablePreferences(value) {
    const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const deliverables = {};
    Object.entries(safeValue.deliverables || {}).forEach(([typeId, preference]) => {
      if (!HOME_DELIVERABLE_TYPES[typeId] || !preference || typeof preference !== "object") return;
      deliverables[typeId] = {
        templateSource: HOME_TEMPLATE_SOURCE_LABELS[preference.templateSource] ? preference.templateSource : "outline_only",
        selectedClientTemplateId: typeof preference.selectedClientTemplateId === "string" ? preference.selectedClientTemplateId : "",
        selectedMcpTemplateId: typeof preference.selectedMcpTemplateId === "string" ? preference.selectedMcpTemplateId : ""
      };
    });

    return {
      selectedDeliverableType: HOME_DELIVERABLE_TYPES[safeValue.selectedDeliverableType] ? safeValue.selectedDeliverableType : "rfp_package",
      deliverables,
      hasSavedPreference: Boolean(safeValue.selectedDeliverableType || Object.keys(deliverables).length)
    };
  }
  function readCollection(item) {
    try {
      const workspace = window.RfpWorkspaces.getActiveWorkspace();
      return JSON.parse(localStorage.getItem(`rfpWorkspace:${workspace.id}:${item}`)) || [];
    } catch (error) {
      return [];
    }
  }

  function readReviewDecisions() {
    try {
      const workspace = window.RfpWorkspaces.getActiveWorkspace();
      const decisions = JSON.parse(localStorage.getItem(`rfpWorkspace:${workspace.id}:${COLLECTIONS.reviewDecisions}`)) || {};
      return decisions && typeof decisions === "object" && !Array.isArray(decisions) ? decisions : {};
    } catch (error) {
      return {};
    }
  }

  function readProjectPlanItems(workspaceId) {
    try {
      const wrapper = JSON.parse(localStorage.getItem(`rfpWorkspace:${workspaceId}:projectPlanItems`)) || null;
      return wrapper && Array.isArray(wrapper.items) ? wrapper.items : [];
    } catch (error) {
      return [];
    }
  }

  function countPendingPublicItems(facts, suggestions, followUps, riskNotes) {
    return facts.filter((item) => (item.reviewStatus || item.status || "pending") === "pending").length +
      suggestions.filter((item) => item.status === "pending_review").length +
      followUps.filter((item) => (item.status || "open") === "open").length +
      riskNotes.filter(isOpenRiskNote).length;
  }

  function getCurrentRoadmapPhase(roadmap) {
    if (!roadmap || !Array.isArray(roadmap.buckets)) {
      return "Not set";
    }

    const currentBucket = roadmap.buckets.find(
      (bucket) => bucket.selected && bucket.id === roadmap.currentBucketId
    );
    const activeBucket = roadmap.buckets.find(
      (bucket) => bucket.selected && bucket.status !== "not_applicable"
    );

    return currentBucket?.label || activeBucket?.label || "Not set";
  }

  function formatAnswerSummary(value) {
    if (Array.isArray(value)) {
      return value.length ? value.map(formatDisplayLabel).join(", ") : "Not set";
    }

    return value ? formatDisplayLabel(value) : "Not set";
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

  function formatDate(value) {
    if (!value) {
      return "not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "not recorded";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatDisplayLabel(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bCms\b/g, "CMS")
      .replace(/\bRfp\b/g, "RFP");
  }

  function statusText(value) {
    return formatDisplayLabel(value || "open");
  }

  function renderUnavailable() {
    if (elements.activeWorkspace) {
      elements.activeWorkspace.textContent = "Workspace storage unavailable";
    }

    if (elements.activeSummary) {
      elements.activeSummary.textContent = "Local browser storage could not be initialized.";
    }
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
