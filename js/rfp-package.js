(function () {
  "use strict";

  const STORAGE_KEYS = {
    workspaces: "rfpClientWorkspaces",
    activeWorkspace: "rfpActiveClientWorkspaceId"
  };

  const DATA_URLS = {
    requirements: "data/requirements-library.json",
    templates: "data/rfp-templates.json",
    components: "data/rfp-components-library.json",
    deliverableTemplates: "data/deliverable-templates.json"
  };

  const CORE_INTAKE_FIELDS = [
    ["procurement_type", "Procurement type"],
    ["justice_domain", "Justice domain"],
    ["system_type", "System type"],
    ["client_type", "Client type"]
  ];

  const DECISION_LABELS = {
    include: "Include in RFP",
    revise: "Needs Revision",
    clarify: "Needs Client Clarification",
    exclude: "Excluded"
  };

  const PLAN_ITEM_TYPES = {
    risk: "Risk / Blocker",
    dependency: "Dependency",
    decision: "Decision"
  };

  const DEFAULT_DELIVERABLE_TYPE = "rfp_package";
  const DELIVERABLE_TYPES = {
    rfp_package: { id: "rfp_package", label: "RFP Package", fileSlug: "rfp-package-outline" },
    assessment_report: { id: "assessment_report", label: "Assessment Report", fileSlug: "assessment-report-outline" }
  };

  const DEFAULT_TEMPLATE_SOURCE = "outline_only";
  const TEMPLATE_SOURCES = {
    outline_only: { id: "outline_only", label: "Outline only" },
    mcp_standard: { id: "mcp_standard", label: "MCP standard template" },
    client_provided: { id: "client_provided", label: "Client-provided template" },
    ad_hoc_custom: { id: "ad_hoc_custom", label: "Ad hoc / custom" }
  };

  const FALLBACK_OUTLINE = [
    {
      id: "procurement_overview",
      name: "Procurement Overview",
      sourcePages: [{ label: "Project Intake", href: "interview.html" }],
      fields: ["procurement_type", "justice_domain"]
    },
    {
      id: "project_background",
      name: "Project Background",
      sourcePages: [
        { label: "Project Intake", href: "interview.html" },
        { label: "Client Source Intake", href: "client-source-intake.html" }
      ],
      fields: ["client_type", "project_type"]
    },
    {
      id: "scope_of_work",
      name: "Scope of Work",
      sourcePages: [
        { label: "Project Intake", href: "interview.html" },
        { label: "Project Plan", href: "project-plan.html" }
      ],
      fields: ["system_type", "procurement_stage"]
    },
    {
      id: "functional_requirements",
      name: "Functional Requirements",
      sourcePages: [{ label: "Requirements Review", href: "preview.html" }],
      requirementSection: true
    },
    {
      id: "technical_requirements",
      name: "Technical / Integration Requirements",
      sourcePages: [
        { label: "Requirements Review", href: "preview.html" },
        { label: "Project Intake", href: "interview.html" }
      ],
      requirementSection: true
    },
    {
      id: "implementation_services",
      name: "Implementation and Project Management",
      sourcePages: [{ label: "Project Plan", href: "project-plan.html" }],
      planSection: true
    },
    {
      id: "vendor_qualifications",
      name: "Vendor Qualifications",
      sourcePages: [{ label: "Requirements Review", href: "preview.html" }],
      requirementSection: true
    },
    {
      id: "proposal_submission",
      name: "Proposal Submission Instructions",
      sourcePages: [{ label: "Project Configuration", href: "project-configuration.html" }],
      componentTypes: ["proposal_instruction"]
    },
    {
      id: "evaluation_criteria",
      name: "Evaluation Criteria",
      sourcePages: [{ label: "Project Configuration", href: "project-configuration.html" }],
      componentTypes: ["evaluation_criterion", "scoring_weight"]
    },
    {
      id: "attachments_exhibits",
      name: "Attachments / Exhibits",
      sourcePages: [
        { label: "Client Source Intake", href: "client-source-intake.html" },
        { label: "Public Research", href: "public-information-ai-assist.html" }
      ],
      sourceContextSection: true
    },
    {
      id: "open_items",
      name: "Open Items / Consultant Notes",
      sourcePages: [{ label: "Review Queue", href: "review-queue.html" }],
      blockerSection: true
    }
  ];

  const ASSESSMENT_OUTLINE = [
    { id: "executive_summary", name: "Executive Summary", sourcePages: [{ label: "Project Intake", href: "interview.html" }, { label: "Review Queue", href: "review-queue.html" }] },
    { id: "engagement_background", name: "Engagement Background", sourcePages: [{ label: "Project Intake", href: "interview.html" }, { label: "Client Source Intake", href: "client-source-intake.html" }] },
    { id: "current_state", name: "Current State / Existing Environment", sourcePages: [{ label: "Client Source Intake", href: "client-source-intake.html" }, { label: "Public Research", href: "public-information-ai-assist.html" }] },
    { id: "stakeholder_themes", name: "Stakeholder Themes", sourcePages: [{ label: "Client Source Intake", href: "client-source-intake.html" }, { label: "Review Queue", href: "review-queue.html" }] },
    { id: "findings", name: "Findings", sourcePages: [{ label: "Client Source Intake", href: "client-source-intake.html" }, { label: "Public Research", href: "public-information-ai-assist.html" }] },
    { id: "gaps_risks", name: "Gaps and Risks", sourcePages: [{ label: "Project Plan", href: "project-plan.html" }, { label: "Review Queue", href: "review-queue.html" }, { label: "Requirements Review", href: "preview.html" }] },
    { id: "recommendations", name: "Recommendations", sourcePages: [{ label: "Project Plan", href: "project-plan.html" }, { label: "Requirements Review", href: "preview.html" }] },
    { id: "roadmap_next_steps", name: "Roadmap / Next Steps", sourcePages: [{ label: "Project Plan", href: "project-plan.html" }] },
    { id: "open_questions", name: "Open Questions", sourcePages: [{ label: "Client Source Intake", href: "client-source-intake.html" }, { label: "Public Research", href: "public-information-ai-assist.html" }, { label: "Review Queue", href: "review-queue.html" }] },
    { id: "appendices_source_material", name: "Appendices / Source Material", sourcePages: [{ label: "Client Source Intake", href: "client-source-intake.html" }, { label: "Public Research", href: "public-information-ai-assist.html" }, { label: "Project Intake", href: "interview.html" }] }
  ];

  const elements = {};
  let referenceData = {
    requirements: { requirements: [] },
    templates: null,
    components: null,
    deliverableTemplates: { templates: [] }
  };
  let currentModel = null;
  let selectedDeliverableType = DEFAULT_DELIVERABLE_TYPE;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindActions();
    setStatus("Loading package inputs...", false);

    referenceData = await loadReferenceData();
    currentModel = buildPackageModel(referenceData);
    render(currentModel);
  }

  function cacheElements() {
    elements.status = document.getElementById("rfp-package-status");
    elements.noActive = document.getElementById("rfp-package-no-active");
    elements.workspace = document.getElementById("rfp-package-workspace");
    elements.workspaceTitle = document.getElementById("rfp-package-workspace-title");
    elements.introKicker = document.getElementById("rfp-package-intro-kicker");
    elements.templateNote = document.getElementById("rfp-package-template-note");
    elements.summary = document.getElementById("rfp-package-summary");
    elements.templateSourcePanel = document.getElementById("deliverable-template-source-panel");
    elements.templateSourceSelect = document.getElementById("deliverable-template-source");
    elements.mcpTemplateControl = document.getElementById("deliverable-mcp-template-control");
    elements.mcpTemplateSelect = document.getElementById("deliverable-mcp-template");
    elements.clientTemplateControl = document.getElementById("deliverable-client-template-control");
    elements.clientTemplateSelect = document.getElementById("deliverable-client-template");
    elements.templateSourceMessage = document.getElementById("deliverable-template-source-message");
    elements.deliverableHelpToggle = document.getElementById("deliverable-builder-help-toggle");
    elements.deliverableHelpPopout = document.getElementById("deliverable-builder-help-popout");
    elements.deliverableHelpClose = document.getElementById("deliverable-builder-help-close");
    elements.readinessPathHeading = document.getElementById("deliverable-readiness-path-heading");
    elements.readinessPathNote = document.getElementById("deliverable-readiness-path-note");
    elements.readinessPath = document.getElementById("deliverable-readiness-path");
    elements.outputOwnership = document.getElementById("deliverable-output-ownership");
    elements.clientTemplateStatus = document.getElementById("rfp-package-client-template-status");
    elements.assessmentFindingsSection = document.getElementById("rfp-package-assessment-findings-section");
    elements.assessmentFindingsContext = document.getElementById("rfp-package-assessment-findings-context");
    elements.projectProfile = document.getElementById("rfp-package-project-profile");
    elements.templateSection = document.getElementById("rfp-package-template-section");
    elements.templateContext = document.getElementById("rfp-package-template-context");
    elements.outlineKicker = document.getElementById("rfp-package-outline-kicker");
    elements.outlineHeading = document.getElementById("rfp-package-outline-heading");
    elements.outline = document.getElementById("rfp-package-outline");
    elements.includedSection = document.getElementById("rfp-package-included-section");
    elements.includedRequirements = document.getElementById("rfp-package-included-requirements");
    elements.blockersKicker = document.getElementById("rfp-package-blockers-kicker");
    elements.blockersHeading = document.getElementById("rfp-package-blockers-heading");
    elements.blockers = document.getElementById("rfp-package-blockers");
    elements.deliverableTypeButtons = Array.from(document.querySelectorAll("[data-deliverable-type]"));
    elements.copy = document.getElementById("copy-package-outline");
    elements.download = document.getElementById("download-package-outline");
  }

  function bindActions() {
    if (elements.copy) {
      elements.copy.addEventListener("click", handleCopyOutline);
    }

    if (elements.download) {
      elements.download.addEventListener("click", handleDownloadOutline);
    }

    elements.deliverableTypeButtons.forEach((button) => {
      button.addEventListener("click", handleDeliverableTypeChange);
    });

    if (elements.templateSourceSelect) elements.templateSourceSelect.addEventListener("change", handleTemplateSourceChange);
    if (elements.clientTemplateSelect) elements.clientTemplateSelect.addEventListener("change", handleClientTemplateSelectionChange);
    if (elements.mcpTemplateSelect) elements.mcpTemplateSelect.addEventListener("change", handleMcpTemplateSelectionChange);
    if (elements.deliverableHelpToggle && elements.deliverableHelpPopout) {
      elements.deliverableHelpToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDeliverableHelp();
      });
    }
    if (elements.deliverableHelpClose) {
      elements.deliverableHelpClose.addEventListener("click", closeDeliverableHelp);
    }
    document.addEventListener("click", (event) => {
      if (!isDeliverableHelpOpen() || !elements.deliverableHelpPopout || !elements.deliverableHelpToggle) return;
      const target = event.target;
      if (elements.deliverableHelpPopout.contains(target) || elements.deliverableHelpToggle.contains(target)) return;
      setDeliverableHelpOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isDeliverableHelpOpen()) {
        setDeliverableHelpOpen(false);
        if (elements.deliverableHelpToggle) elements.deliverableHelpToggle.focus();
      }
    });
  }

  function setDeliverableHelpOpen(open) {
    if (!elements.deliverableHelpToggle || !elements.deliverableHelpPopout) return;
    elements.deliverableHelpPopout.classList.toggle("hidden", !open);
    elements.deliverableHelpToggle.setAttribute("aria-expanded", String(open));
    if (open && elements.deliverableHelpClose) elements.deliverableHelpClose.focus();
  }

  function isDeliverableHelpOpen() {
    return Boolean(elements.deliverableHelpPopout && !elements.deliverableHelpPopout.classList.contains("hidden"));
  }

  function toggleDeliverableHelp() {
    setDeliverableHelpOpen(!isDeliverableHelpOpen());
  }

  function closeDeliverableHelp(event) {
    if (event) event.stopPropagation();
    setDeliverableHelpOpen(false);
  }

  function handleDeliverableTypeChange(event) {
    const nextType = event.currentTarget.dataset.deliverableType;
    if (!DELIVERABLE_TYPES[nextType] || nextType === selectedDeliverableType) {
      return;
    }
    selectedDeliverableType = nextType;
    if (currentModel?.hasWorkspace) {
      saveDeliverablePreference(currentModel.workspace.id, nextType, {});
      currentModel = buildPackageModel(referenceData);
    }
    render(currentModel);
  }

  function handleTemplateSourceChange(event) {
    if (!currentModel?.hasWorkspace) return;
    const templateSource = normalizeTemplateSource(event.currentTarget.value);
    const updates = { templateSource };
    if (templateSource !== "client_provided") updates.selectedClientTemplateId = "";
    if (templateSource !== "mcp_standard") updates.selectedMcpTemplateId = "";
    saveDeliverablePreference(currentModel.workspace.id, selectedDeliverableType, updates);
    currentModel = buildPackageModel(referenceData);
    render(currentModel);
  }

  function handleClientTemplateSelectionChange(event) {
    if (!currentModel?.hasWorkspace) return;
    saveDeliverablePreference(currentModel.workspace.id, selectedDeliverableType, {
      templateSource: "client_provided",
      selectedClientTemplateId: event.currentTarget.value || ""
    });
    currentModel = buildPackageModel(referenceData);
    render(currentModel);
  }

  function handleMcpTemplateSelectionChange(event) {
    if (!currentModel?.hasWorkspace) return;
    saveDeliverablePreference(currentModel.workspace.id, selectedDeliverableType, {
      templateSource: "mcp_standard",
      selectedMcpTemplateId: event.currentTarget.value || ""
    });
    currentModel = buildPackageModel(referenceData);
    render(currentModel);
  }

  async function loadReferenceData() {
    const [requirements, templates, components, deliverableTemplates] = await Promise.all([
      fetchJson(DATA_URLS.requirements, { requirements: [] }),
      fetchJson(DATA_URLS.templates, null),
      fetchJson(DATA_URLS.components, null),
      fetchJson(DATA_URLS.deliverableTemplates, { templates: [] })
    ]);

    return { requirements, templates, components, deliverableTemplates };
  }

  async function fetchJson(url, fallback) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      setStatus(`Some package reference data could not be loaded from ${url}. Fallback outline will be used where needed.`, true);
      return fallback;
    }
  }

  function buildPackageModel(data) {
    const workspaceState = getActiveWorkspaceState();
    const workspace = workspaceState.workspace;

    if (!workspace) {
      return {
        hasWorkspace: false,
        workspaceName: "No active workspace",
        generatedAt: new Date().toISOString(),
        summaryItems: [],
        outlineSections: [],
        includedRequirements: [],
        openRequirementIssues: [],
        clientTemplates: [],
        deliverablePreferences: normalizeDeliverablePreferences(null),
        mcpTemplates: normalizeMcpTemplateRecords(data.deliverableTemplates),
        blockers: [],
        template: null,
        dataWarnings: getReferenceDataWarnings(data)
      };
    }

    const workspaceId = workspace.id;
    const answers = readScopedJson(workspaceId, "answers", null) || {};
    const reviewDecisions = readScopedJson(workspaceId, "reviewDecisions", {}) || {};
    const projectSpecificWrapper = readScopedJson(workspaceId, "projectSpecificRequirements", null);
    const projectPlanWrapper = readScopedJson(workspaceId, "projectPlanItems", null);
    const clientCollections = readClientSourceCollections(workspaceId);
    const publicCollections = readPublicResearchCollections(workspaceId);
    const clientTemplates = normalizeClientTemplateRecords(readScopedJson(workspaceId, "clientTemplates", []));
    const deliverablePreferences = normalizeDeliverablePreferences(readScopedJson(workspaceId, "deliverablePreferences", null));
    const assessmentFindingsModel = buildAssessmentFindingsModel(readScopedJson(workspaceId, "assessmentFindings", null));
    if (DELIVERABLE_TYPES[deliverablePreferences.selectedDeliverableType]) {
      selectedDeliverableType = deliverablePreferences.selectedDeliverableType;
    }
    const mcpTemplates = normalizeMcpTemplateRecords(data.deliverableTemplates);
    const selectedTemplate = selectTemplate(data.templates, answers);
    const requirementLookup = buildRequirementLookup(data.requirements, projectSpecificWrapper);
    const requirementDecisionModel = buildRequirementDecisionModel(reviewDecisions, requirementLookup);
    const intakeModel = buildIntakeModel(answers);
    const planModel = buildProjectPlanModel(projectPlanWrapper);
    const clientModel = buildClientSourceModel(clientCollections);
    const publicModel = buildPublicResearchModel(publicCollections);
    const blockers = buildBlockers(intakeModel, requirementDecisionModel, clientModel, publicModel, planModel);

    const model = {
      hasWorkspace: true,
      workspace,
      workspaceName: workspace.name || "Untitled Workspace",
      generatedAt: new Date().toISOString(),
      answers,
      selectedTemplate,
      componentModel: buildComponentModel(data.components),
      requirementDecisionModel,
      intakeModel,
      planModel,
      clientModel,
      publicModel,
      assessmentFindingsModel,
      clientTemplates,
      deliverablePreferences,
      mcpTemplates,
      blockers,
      dataWarnings: getReferenceDataWarnings(data)
    };

    model.summaryItems = buildSummaryItems(model);
    model.outlineSections = buildOutlineSections(model);
    model.includedRequirements = requirementDecisionModel.includedRequirements;
    model.openRequirementIssues = requirementDecisionModel.openIssues;

    return model;
  }

  function getActiveWorkspaceState() {
    const workspaces = readJsonKey(STORAGE_KEYS.workspaces, []);
    const activeId = readStringKey(STORAGE_KEYS.activeWorkspace);
    const workspace = Array.isArray(workspaces)
      ? workspaces.find((item) => item && item.id === activeId)
      : null;

    return { workspaces, activeId, workspace: workspace || null };
  }

  function readStringKey(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function readJsonKey(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readScopedJson(workspaceId, item, fallback) {
    return readJsonKey(scopedKey(workspaceId, item), fallback);
  }

  function scopedKey(workspaceId, item) {
    return `rfpWorkspace:${workspaceId}:${item}`;
  }

  function saveDeliverablePreference(workspaceId, typeId, updates) {
    if (!workspaceId || !DELIVERABLE_TYPES[typeId]) return;
    const existing = normalizeDeliverablePreferences(readScopedJson(workspaceId, "deliverablePreferences", null));
    const previous = getDeliverablePreference({ deliverablePreferences: existing }, typeId);
    const nextPreference = {
      ...previous,
      ...updates,
      templateSource: normalizeTemplateSource(updates.templateSource || previous.templateSource),
      updatedAt: new Date().toISOString()
    };
    const nextPreferences = {
      selectedDeliverableType: typeId,
      deliverables: { ...existing.deliverables, [typeId]: nextPreference }
    };

    try {
      window.localStorage.setItem(scopedKey(workspaceId, "deliverablePreferences"), JSON.stringify(nextPreferences));
    } catch (error) {
      setStatus("Deliverable preference could not be saved in this browser session.", true);
    }
  }

  function normalizeDeliverablePreferences(value) {
    const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const selectedType = DELIVERABLE_TYPES[safeValue.selectedDeliverableType] ? safeValue.selectedDeliverableType : selectedDeliverableType;
    const deliverables = {};

    Object.entries(safeValue.deliverables || {}).forEach(([typeId, preference]) => {
      if (!DELIVERABLE_TYPES[typeId] || !preference || typeof preference !== "object") return;
      deliverables[typeId] = {
        templateSource: normalizeTemplateSource(preference.templateSource),
        selectedClientTemplateId: typeof preference.selectedClientTemplateId === "string" ? preference.selectedClientTemplateId : "",
        selectedMcpTemplateId: typeof preference.selectedMcpTemplateId === "string" ? preference.selectedMcpTemplateId : "",
        updatedAt: typeof preference.updatedAt === "string" ? preference.updatedAt : ""
      };
    });

    return { selectedDeliverableType: selectedType, deliverables };
  }

  function getDeliverablePreference(model, typeId) {
    const preference = model.deliverablePreferences?.deliverables?.[typeId] || {};
    return {
      templateSource: normalizeTemplateSource(preference.templateSource),
      selectedClientTemplateId: typeof preference.selectedClientTemplateId === "string" ? preference.selectedClientTemplateId : "",
      selectedMcpTemplateId: typeof preference.selectedMcpTemplateId === "string" ? preference.selectedMcpTemplateId : "",
      updatedAt: typeof preference.updatedAt === "string" ? preference.updatedAt : ""
    };
  }

  function normalizeTemplateSource(value) {
    return TEMPLATE_SOURCES[value] ? value : DEFAULT_TEMPLATE_SOURCE;
  }

  function readClientSourceCollections(workspaceId) {
    return {
      documents: readScopedJson(workspaceId, "clientSourceDocuments", []),
      facts: readScopedJson(workspaceId, "extractedClientFacts", []),
      suggestions: readScopedJson(workspaceId, "suggestedInterviewAnswers", []),
      questions: readScopedJson(workspaceId, "openQuestions", []),
      risks: readScopedJson(workspaceId, "clientRiskGapNotes", [])
    };
  }

  function readPublicResearchCollections(workspaceId) {
    return {
      sources: readScopedJson(workspaceId, "publicInfoSources", []),
      facts: readScopedJson(workspaceId, "publicInfoFacts", []),
      suggestions: readScopedJson(workspaceId, "publicInfoSuggestions", []),
      followUps: readScopedJson(workspaceId, "publicInfoFollowUps", []),
      risks: readScopedJson(workspaceId, "publicInfoRiskNotes", [])
    };
  }

  function buildIntakeModel(answers) {
    const confirmedAnswers = Object.entries(answers || {})
      .filter(([key, value]) => !["savedAt", "updatedAt", "workspaceId"].includes(key) && !isEmptyValue(value));
    const missingFields = CORE_INTAKE_FIELDS
      .filter(([key]) => isEmptyValue(answers[key]))
      .map(([, label]) => label);

    return {
      confirmedAnswerCount: confirmedAnswers.length,
      procurementType: answers.procurement_type || "",
      justiceDomain: answers.justice_domain || "",
      systemType: answers.system_type || "",
      clientType: answers.client_type || "",
      missingFields
    };
  }

  function buildRequirementLookup(requirementsData, projectSpecificWrapper) {
    const lookup = new Map();
    const libraryRequirements = Array.isArray(requirementsData?.requirements)
      ? requirementsData.requirements
      : [];
    const projectRequirements = Array.isArray(projectSpecificWrapper?.requirements)
      ? projectSpecificWrapper.requirements
      : [];

    libraryRequirements.forEach((requirement) => {
      if (!requirement || !requirement.id) {
        return;
      }

      lookup.set(requirement.id, normalizeRequirement(requirement, "Approved Library"));
    });

    projectRequirements.forEach((requirement) => {
      if (!requirement || !requirement.id) {
        return;
      }

      lookup.set(requirement.id, normalizeProjectSpecificRequirement(requirement));
    });

    return {
      lookup,
      libraryRequirements,
      projectRequirements
    };
  }

  function normalizeRequirement(requirement, sourceType) {
    return {
      id: requirement.id || "",
      title: requirement.title || requirement.id || "Untitled requirement",
      section: requirement.sectionLabel || requirement.section || requirement.sectionId || "",
      category: requirement.categoryLabel || requirement.category || requirement.categoryId || "",
      functionLabel: requirement.functionLabel || requirement.function || requirement.functionId || "",
      priority: requirement.priority || "",
      text: requirement.text || requirement.requirementText || "",
      sourceType
    };
  }

  function normalizeProjectSpecificRequirement(requirement) {
    return {
      id: requirement.id || "",
      title: requirement.title || requirement.id || "Untitled project-specific requirement",
      section: requirement.section || "Project-Specific Requirements",
      category: requirement.category || "Project Specific",
      functionLabel: requirement.function || "Project Specific",
      priority: requirement.priority || "",
      text: requirement.requirementText || requirement.text || "",
      sourceType: "Project Specific"
    };
  }

  function buildRequirementDecisionModel(reviewDecisions, requirementLookup) {
    const entries = Object.entries(reviewDecisions || {});
    const decisionCounts = entries.reduce(
      (counts, [, decision]) => {
        const key = decision || "no_decision";
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      {}
    );

    const includedRequirements = entries
      .filter(([, decision]) => decision === "include")
      .map(([requirementId, decision]) => toRequirementDecisionItem(requirementId, decision, requirementLookup.lookup));
    const openIssues = entries
      .filter(([, decision]) => decision === "revise" || decision === "clarify")
      .map(([requirementId, decision]) => toRequirementDecisionItem(requirementId, decision, requirementLookup.lookup));
    const unknownDecisionCount = entries
      .filter(([requirementId]) => !requirementLookup.lookup.has(requirementId))
      .length;

    return {
      reviewedDecisionCount: entries.length,
      includeCount: decisionCounts.include || 0,
      reviseCount: decisionCounts.revise || 0,
      clarifyCount: decisionCounts.clarify || 0,
      excludeCount: decisionCounts.exclude || 0,
      noDecisionCount: null,
      unknownDecisionCount,
      projectSpecificCount: requirementLookup.projectRequirements.length,
      includedRequirements,
      openIssues
    };
  }

  function toRequirementDecisionItem(requirementId, decision, lookup) {
    const requirement = lookup.get(requirementId) || {
      id: requirementId,
      title: requirementId,
      section: "Not available",
      category: "Not available",
      functionLabel: "",
      priority: "",
      text: "Requirement details are not available from the current local library data.",
      sourceType: "Not available"
    };

    return {
      ...requirement,
      decision,
      decisionLabel: DECISION_LABELS[decision] || decision
    };
  }

  function buildProjectPlanModel(projectPlanWrapper) {
    const items = Array.isArray(projectPlanWrapper?.items) ? projectPlanWrapper.items : [];
    const openAttentionItems = items.filter((item) =>
      item &&
      PLAN_ITEM_TYPES[item.type] &&
      item.status !== "complete"
    );

    return {
      totalItems: items.length,
      openAttentionItems,
      openAttentionCount: openAttentionItems.length
    };
  }

  function buildClientSourceModel(collections) {
    const pendingFacts = collections.facts.filter((fact) => ["unreviewed", "pending", ""].includes(String(fact.status || "").toLowerCase()));
    const pendingSuggestions = collections.suggestions.filter((suggestion) => suggestion.status === "pending_review");
    const acceptedSuggestions = collections.suggestions.filter((suggestion) => suggestion.status === "accepted");
    const openQuestions = collections.questions.filter((question) => (question.status || "open") === "open");
    const openRisks = collections.risks.filter((risk) => (risk.status || "open") === "open");

    return {
      documentCount: collections.documents.length,
      factCount: collections.facts.length,
      suggestionCount: collections.suggestions.length,
      questionCount: collections.questions.length,
      riskCount: collections.risks.length,
      acceptedSuggestionsCount: acceptedSuggestions.length,
      pendingOpenCount: pendingFacts.length + pendingSuggestions.length + openQuestions.length + openRisks.length,
      pendingFactsCount: pendingFacts.length,
      pendingSuggestionsCount: pendingSuggestions.length,
      openQuestionsCount: openQuestions.length,
      openRisksCount: openRisks.length
    };
  }

  function buildPublicResearchModel(collections) {
    const acceptedFacts = collections.facts.filter((fact) => (fact.reviewStatus || fact.status) === "accepted");
    const pendingFacts = collections.facts.filter((fact) => (fact.reviewStatus || fact.status || "pending") === "pending");
    const pendingSuggestions = collections.suggestions.filter((suggestion) => suggestion.status === "pending_review");
    const openFollowUps = collections.followUps.filter((item) => (item.status || "open") === "open");
    const openRisks = collections.risks.filter((item) => (item.status || "open") === "open");

    return {
      sourceCount: collections.sources.length,
      factCount: collections.facts.length,
      suggestionCount: collections.suggestions.length,
      followUpCount: collections.followUps.length,
      riskCount: collections.risks.length,
      acceptedFactsCount: acceptedFacts.length,
      pendingOpenCount: pendingFacts.length + pendingSuggestions.length + openFollowUps.length + openRisks.length,
      pendingFactsCount: pendingFacts.length,
      pendingSuggestionsCount: pendingSuggestions.length,
      openFollowUpsCount: openFollowUps.length,
      openRisksCount: openRisks.length
    };
  }

  function buildBlockers(intakeModel, requirementModel, clientModel, publicModel, planModel) {
    const blockers = [];

    if (intakeModel.missingFields.length) {
      blockers.push({
        label: "Missing core Project Intake fields",
        count: intakeModel.missingFields.length,
        detail: intakeModel.missingFields.join(", "),
        href: "interview.html"
      });
    }

    if (requirementModel.reviseCount > 0) {
      blockers.push({
        label: "Requirements needing revision",
        count: requirementModel.reviseCount,
        detail: "Review wording before package drafting.",
        href: "preview.html"
      });
    }

    if (requirementModel.clarifyCount > 0) {
      blockers.push({
        label: "Requirements needing client clarification",
        count: requirementModel.clarifyCount,
        detail: "Resolve client questions before package drafting.",
        href: "preview.html"
      });
    }

    if (requirementModel.includeCount === 0) {
      blockers.push({
        label: "No included requirements",
        count: 1,
        detail: "Mark requirements Include in RFP before using package content.",
        href: "preview.html"
      });
    }

    if (clientModel.pendingOpenCount > 0) {
      blockers.push({
        label: "Pending Client Source Intake items",
        count: clientModel.pendingOpenCount,
        detail: "Review source facts, suggestions, follow-ups, and potential issues on the source page.",
        href: "client-source-intake.html"
      });
    }

    if (publicModel.pendingOpenCount > 0) {
      blockers.push({
        label: "Pending Public Research items",
        count: publicModel.pendingOpenCount,
        detail: "Review public facts, suggestions, follow-ups, and potential issues on the source page.",
        href: "public-information-ai-assist.html"
      });
    }

    if (planModel.openAttentionCount > 0) {
      blockers.push({
        label: "Open Project Plan risks, dependencies, or decisions",
        count: planModel.openAttentionCount,
        detail: "Review open planning items before package drafting.",
        href: "project-plan.html"
      });
    }

    return blockers;
  }

  function buildSummaryItems(model) {
    const intake = model.intakeModel;
    const requirements = model.requirementDecisionModel;

    return [
      {
        label: "Active Workspace",
        value: model.workspaceName,
        status: "ready",
        detail: "Selected"
      },
      {
        label: "Confirmed Intake Answers",
        value: String(intake.confirmedAnswerCount),
        status: intake.confirmedAnswerCount ? "ready" : "missing",
        detail: intake.confirmedAnswerCount ? "Available" : "Not started"
      },
      {
        label: "Procurement Type",
        value: formatValue(intake.procurementType) || "Not available",
        status: intake.procurementType ? "ready" : "missing",
        detail: "From Project Intake"
      },
      {
        label: "Justice Domain",
        value: formatValue(intake.justiceDomain) || "Not available",
        status: intake.justiceDomain ? "ready" : "missing",
        detail: "From Project Intake"
      },
      {
        label: "Reviewed Decisions",
        value: String(requirements.reviewedDecisionCount),
        status: requirements.reviewedDecisionCount ? "ready" : "missing",
        detail: requirements.reviewedDecisionCount ? "Stored decisions" : "Not started"
      },
      {
        label: "Included Requirements",
        value: String(requirements.includeCount),
        status: requirements.includeCount ? "ready" : "missing",
        detail: "Explicit Include in RFP only"
      },
      {
        label: "Needs Revision",
        value: String(requirements.reviseCount),
        status: requirements.reviseCount ? "needs-review" : "ready",
        detail: "Requirements Review"
      },
      {
        label: "Needs Clarification",
        value: String(requirements.clarifyCount),
        status: requirements.clarifyCount ? "needs-review" : "ready",
        detail: "Requirements Review"
      },
      {
        label: "Project-Specific Requirements",
        value: String(requirements.projectSpecificCount),
        status: requirements.projectSpecificCount ? "ready" : "needs-review",
        detail: requirements.projectSpecificCount ? "Available" : "None"
      },
      {
        label: "Client Source Pending/Open",
        value: String(model.clientModel.pendingOpenCount),
        status: model.clientModel.pendingOpenCount ? "needs-review" : "ready",
        detail: `${model.clientModel.acceptedSuggestionsCount} accepted suggestion${model.clientModel.acceptedSuggestionsCount === 1 ? "" : "s"}`
      },
      {
        label: "Public Research Pending/Open",
        value: String(model.publicModel.pendingOpenCount),
        status: model.publicModel.pendingOpenCount ? "needs-review" : "ready",
        detail: `${model.publicModel.acceptedFactsCount} accepted fact${model.publicModel.acceptedFactsCount === 1 ? "" : "s"}`
      },
      {
        label: "Plan Attention Items",
        value: String(model.planModel.openAttentionCount),
        status: model.planModel.openAttentionCount ? "needs-review" : "ready",
        detail: "Risks, dependencies, decisions"
      }
    ];
  }

  function buildOutlineSections(model) {
    const templateSectionMap = createTemplateSectionMap(model.selectedTemplate);

    return FALLBACK_OUTLINE.map((section) => {
      const templateSection = templateSectionMap.get(section.id) || null;
      const sourceMaterial = getSourceMaterial(section, model, templateSection);
      const status = getSectionStatus(section, model);
      const nextAction = getSectionNextAction(section, model, status);

      return {
        ...section,
        templateSection,
        status,
        readinessLabel: statusLabel(status),
        sourceMaterial,
        nextAction
      };
    });
  }

  function buildDeliverableViewModel(model) {
    return selectedDeliverableType === "assessment_report"
      ? buildAssessmentReportViewModel(model)
      : buildRfpPackageViewModel(model);
  }

  function buildRfpPackageViewModel(model) {
    return {
      typeId: "rfp_package",
      label: "RFP Package",
      introKicker: "Package readiness",
      title: `${model.workspaceName} package outline`,
      note: getTemplateNote(model),
      helperText: "No records are changed from this page. The package outline is derived from existing workspace data.",
      outlineKicker: "Draft outline",
      outlineHeading: "Package Outline",
      blockersKicker: "Before package is ready",
      blockersHeading: "Open Items and Blockers",
      showTemplateContext: true,
      showIncludedRequirements: true,
      summaryItems: model.summaryItems,
      outlineSections: model.outlineSections,
      blockers: model.blockers,
      requirementIssues: model.openRequirementIssues,
      planItems: model.planModel.openAttentionItems,
      emptyOutlineTitle: "No package sections available",
      emptyOutlineText: "Open Project Intake or Requirements Review to start building package inputs."
    };
  }

  function buildAssessmentReportViewModel(model) {
    const assessmentBlockers = buildAssessmentBlockers(model);
    return {
      typeId: "assessment_report",
      label: "Assessment Report",
      introKicker: "Assessment readiness",
      title: `${model.workspaceName} assessment report outline`,
      note: "Assemble reviewed workspace information into an assessment-style report outline. This view is read-only and does not change source records.",
      helperText: "Assessment Report v0 is an outline/readiness surface only. It does not generate final report prose; assessment findings are managed on the Assessment Findings page.",
      outlineKicker: "Assessment outline",
      outlineHeading: "Assessment Report Outline",
      blockersKicker: "Before report is ready",
      blockersHeading: "Assessment Report Blockers",
      showTemplateContext: true,
      showIncludedRequirements: false,
      summaryItems: buildAssessmentSummaryItems(model),
      outlineSections: buildAssessmentOutlineSections(model),
      blockers: assessmentBlockers,
      requirementIssues: [],
      planItems: [],
      emptyOutlineTitle: "No assessment sections available",
      emptyOutlineText: "Open Project Intake, Client Source Intake, or Public Research to start building assessment inputs."
    };
  }

  function getAssessmentCounts(model) {
    const client = model.clientModel;
    const publicResearch = model.publicModel;
    const sourceMaterialCount = client.documentCount + client.factCount + client.acceptedSuggestionsCount + publicResearch.sourceCount + publicResearch.acceptedFactsCount;
    const sourceRecordCount = client.documentCount + client.factCount + client.suggestionCount + publicResearch.sourceCount + publicResearch.factCount + publicResearch.suggestionCount;
    const openQuestionCount = client.openQuestionsCount + publicResearch.openFollowUpsCount;
    const openIssueCount = client.openRisksCount + publicResearch.openRisksCount;
    return {
      sourceMaterialCount,
      sourceRecordCount,
      openQuestionCount,
      openIssueCount,
      pendingSourceCount: client.pendingOpenCount + publicResearch.pendingOpenCount
    };
  }


  function buildAssessmentFindingsModel(wrapper) {
    const source = wrapper && typeof wrapper === "object" && !Array.isArray(wrapper) ? wrapper : {};
    const rawFindings = Array.isArray(source.findings) ? source.findings : Array.isArray(wrapper) ? wrapper : [];
    const findings = rawFindings.filter((finding) => finding && typeof finding === "object").map((finding) => ({
      id: String(finding.id || ""),
      title: String(finding.title || "Untitled finding"),
      findingType: String(finding.findingType || "finding"),
      severity: String(finding.severity || "medium"),
      status: String(finding.status || "draft"),
      evidence: String(finding.evidence || ""),
      recommendation: String(finding.recommendation || ""),
      sourceReferences: Array.isArray(finding.sourceReferences) ? finding.sourceReferences : []
    }));
    const total = findings.length;
    const ready = findings.filter((finding) => finding.status === "ready").length;
    const needsReview = findings.filter((finding) => finding.status === "draft" || finding.status === "needs-review").length;
    const highCritical = findings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
    const recommendations = findings.filter((finding) => finding.findingType === "recommendation" || !isEmptyValue(finding.recommendation)).length;
    const evidenceLinked = findings.filter((finding) => !isEmptyValue(finding.evidence) || finding.sourceReferences.length > 0).length;
    const missingEvidence = findings.filter((finding) => isEmptyValue(finding.evidence) && finding.sourceReferences.length === 0).length;
    const highCriticalWithoutRecommendations = findings.filter((finding) => (finding.severity === "high" || finding.severity === "critical") && isEmptyValue(finding.recommendation)).length;
    return {
      findings,
      total,
      ready,
      needsReview,
      highCritical,
      recommendations,
      evidenceLinked,
      missingEvidence,
      highCriticalWithoutRecommendations
    };
  }

  function buildAssessmentSummaryItems(model) {
    const counts = getAssessmentCounts(model);
    return [
      { label: "Active Workspace", value: model.workspaceName, status: "ready", detail: "Selected" },
      {
        label: "Confirmed Intake Answers",
        value: String(model.intakeModel.confirmedAnswerCount),
        status: model.intakeModel.confirmedAnswerCount ? "ready" : "missing",
        detail: model.intakeModel.confirmedAnswerCount ? "Available" : "Not started"
      },
      {
        label: "Reviewed Source Material",
        value: String(counts.sourceMaterialCount),
        status: counts.sourceMaterialCount ? "ready" : "missing",
        detail: "Client source and accepted public research metadata"
      },
      {
        label: "Pending Source Review",
        value: String(counts.pendingSourceCount),
        status: counts.pendingSourceCount ? "needs-review" : "ready",
        detail: "Client Source Intake and Public Research"
      },
      {
        label: "Open Questions",
        value: String(counts.openQuestionCount),
        status: counts.openQuestionCount ? "needs-review" : "ready",
        detail: "Follow-ups and open source questions"
      },
      {
        label: "Risks / Limitations",
        value: String(counts.openIssueCount + model.planModel.openAttentionCount),
        status: counts.openIssueCount || model.planModel.openAttentionCount ? "needs-review" : "ready",
        detail: "Source issues plus Project Plan attention items"
      }
    ];
  }

  function buildAssessmentOutlineSections(model) {
    return ASSESSMENT_OUTLINE.map((section) => {
      const status = getAssessmentSectionStatus(section, model);
      return {
        ...section,
        status,
        readinessLabel: statusLabel(status),
        sourceMaterial: getAssessmentSectionSourceMaterial(section, model),
        nextAction: getAssessmentSectionNextAction(section, model, status)
      };
    });
  }

  function getAssessmentSectionStatus(section, model) {
    const counts = getAssessmentCounts(model);
    const hasCoreIntake = model.intakeModel.missingFields.length === 0;
    const hasSourceMaterial = counts.sourceMaterialCount > 0 || counts.sourceRecordCount > 0;
    if (section.id === "executive_summary") {
      if (!model.intakeModel.confirmedAnswerCount && !hasSourceMaterial) return "missing";
      return counts.pendingSourceCount || model.planModel.openAttentionCount ? "needs-review" : "ready";
    }
    if (section.id === "engagement_background") {
      if (!hasCoreIntake) return "missing";
      return counts.pendingSourceCount ? "needs-review" : "ready";
    }
    if (["current_state", "findings", "appendices_source_material"].includes(section.id)) {
      if (!hasSourceMaterial) return "missing";
      return counts.pendingSourceCount ? "needs-review" : "ready";
    }
    if (section.id === "stakeholder_themes") {
      if (!hasSourceMaterial) return "missing";
      return counts.openQuestionCount ? "needs-review" : "ready";
    }
    if (section.id === "gaps_risks") {
      if (!hasSourceMaterial && !model.planModel.totalItems) return "missing";
      return counts.openIssueCount || model.planModel.openAttentionCount || model.requirementDecisionModel.reviseCount || model.requirementDecisionModel.clarifyCount ? "needs-review" : "ready";
    }
    if (section.id === "recommendations") {
      if (!model.planModel.totalItems && !model.requirementDecisionModel.reviewedDecisionCount && !hasSourceMaterial) return "missing";
      return model.planModel.openAttentionCount || counts.openQuestionCount ? "needs-review" : "ready";
    }
    if (section.id === "roadmap_next_steps") {
      if (!model.planModel.totalItems) return "missing";
      return model.planModel.openAttentionCount ? "needs-review" : "ready";
    }
    if (section.id === "open_questions") {
      if (counts.openQuestionCount || counts.pendingSourceCount) return "needs-review";
      return hasSourceMaterial || model.intakeModel.confirmedAnswerCount ? "ready" : "missing";
    }
    return hasSourceMaterial ? "ready" : "missing";
  }

  function getAssessmentSectionSourceMaterial(section, model) {
    const counts = getAssessmentCounts(model);
    const material = [];
    if (section.id === "executive_summary") {
      material.push(`${model.intakeModel.confirmedAnswerCount} confirmed intake answer${model.intakeModel.confirmedAnswerCount === 1 ? "" : "s"}`);
      material.push(`${counts.sourceMaterialCount} reviewed source item${counts.sourceMaterialCount === 1 ? "" : "s"}`);
    } else if (section.id === "engagement_background") {
      material.push(`${model.intakeModel.confirmedAnswerCount} Project Intake answer${model.intakeModel.confirmedAnswerCount === 1 ? "" : "s"}`);
      material.push(`${model.clientModel.documentCount} client source document${model.clientModel.documentCount === 1 ? "" : "s"}`);
    } else if (["current_state", "findings", "appendices_source_material"].includes(section.id)) {
      material.push(`${model.clientModel.documentCount} client source document${model.clientModel.documentCount === 1 ? "" : "s"}`);
      material.push(`${model.clientModel.factCount} client source fact${model.clientModel.factCount === 1 ? "" : "s"}`);
      material.push(`${model.publicModel.sourceCount} public source${model.publicModel.sourceCount === 1 ? "" : "s"}`);
      material.push(`${model.publicModel.acceptedFactsCount} accepted public fact${model.publicModel.acceptedFactsCount === 1 ? "" : "s"}`);
    } else if (section.id === "stakeholder_themes") {
      material.push(`${model.clientModel.acceptedSuggestionsCount} accepted client-source suggestion${model.clientModel.acceptedSuggestionsCount === 1 ? "" : "s"}`);
      material.push(`${counts.openQuestionCount} open question or follow-up item${counts.openQuestionCount === 1 ? "" : "s"}`);
    } else if (section.id === "gaps_risks") {
      material.push(`${counts.openIssueCount} source/research risk or limitation item${counts.openIssueCount === 1 ? "" : "s"}`);
      material.push(`${model.planModel.openAttentionCount} open Project Plan attention item${model.planModel.openAttentionCount === 1 ? "" : "s"}`);
      material.push(`${model.requirementDecisionModel.reviseCount + model.requirementDecisionModel.clarifyCount} requirement review issue${model.requirementDecisionModel.reviseCount + model.requirementDecisionModel.clarifyCount === 1 ? "" : "s"}`);
    } else if (section.id === "recommendations") {
      material.push(`${model.planModel.totalItems} Project Plan item${model.planModel.totalItems === 1 ? "" : "s"}`);
      material.push(`${model.requirementDecisionModel.reviewedDecisionCount} requirement review decision${model.requirementDecisionModel.reviewedDecisionCount === 1 ? "" : "s"}`);
    } else if (section.id === "roadmap_next_steps") {
      material.push(`${model.planModel.totalItems} Project Plan item${model.planModel.totalItems === 1 ? "" : "s"}`);
      material.push(`${model.planModel.openAttentionCount} open risk/dependency/decision item${model.planModel.openAttentionCount === 1 ? "" : "s"}`);
    } else if (section.id === "open_questions") {
      material.push(`${model.clientModel.openQuestionsCount} client-source open question${model.clientModel.openQuestionsCount === 1 ? "" : "s"}`);
      material.push(`${model.publicModel.openFollowUpsCount} public research follow-up${model.publicModel.openFollowUpsCount === 1 ? "" : "s"}`);
    }
    const available = material.filter((item) => !item.startsWith("0 "));
    return available.length ? available : ["Not available"];
  }

  function getAssessmentSectionNextAction(section, model, status) {
    if (status === "ready") return "Use the available reviewed workspace metadata when drafting this report section.";
    if (section.id === "executive_summary" || section.id === "engagement_background") return "Complete core Project Intake fields and resolve source review blockers before drafting.";
    if (["current_state", "findings", "appendices_source_material"].includes(section.id)) return "Review Client Source Intake and Public Research material before using it as report evidence.";
    if (section.id === "stakeholder_themes" || section.id === "open_questions") return "Review open source questions and follow-ups on their source pages.";
    if (section.id === "gaps_risks" || section.id === "roadmap_next_steps" || section.id === "recommendations") return "Review Project Plan risks, dependencies, decisions, and source review limitations before drafting.";
    return "Review linked source pages before drafting this report section.";
  }

  function buildAssessmentBlockers(model) {
    const counts = getAssessmentCounts(model);
    const blockers = [];
    if (model.intakeModel.missingFields.length) {
      blockers.push({ label: "Missing core Project Intake fields", count: model.intakeModel.missingFields.length, detail: model.intakeModel.missingFields.join(", "), href: "interview.html" });
    }
    if (!counts.sourceMaterialCount && !counts.sourceRecordCount) {
      blockers.push({ label: "No source material reviewed", count: 1, detail: "Review client source material or public research before drafting assessment findings.", href: "client-source-intake.html" });
    }
    if (model.clientModel.pendingOpenCount > 0) {
      blockers.push({ label: "Pending Client Source Intake items", count: model.clientModel.pendingOpenCount, detail: "Review source facts, suggestions, open questions, and potential issues on the source page.", href: "client-source-intake.html" });
    }
    if (model.publicModel.pendingOpenCount > 0) {
      blockers.push({ label: "Pending Public Research items", count: model.publicModel.pendingOpenCount, detail: "Review public facts, suggestions, follow-ups, and research risks on the source page.", href: "public-information-ai-assist.html" });
    }
    if (counts.openQuestionCount > 0) {
      blockers.push({ label: "Open questions or follow-ups", count: counts.openQuestionCount, detail: "Resolve or account for open questions before treating report content as ready.", href: "review-queue.html" });
    }
    if (counts.openIssueCount > 0) {
      blockers.push({ label: "Unresolved source or research risks", count: counts.openIssueCount, detail: "Review limitations and potential issues before drafting assessment conclusions.", href: "review-queue.html" });
    }
    if (model.planModel.openAttentionCount > 0) {
      blockers.push({ label: "Open Project Plan risks, dependencies, or decisions", count: model.planModel.openAttentionCount, detail: "Review planning items before using roadmap or next-step content.", href: "project-plan.html" });
    }
    return blockers;
  }

  function createTemplateSectionMap(template) {
    const map = new Map();
    const sections = Array.isArray(template?.sections) ? template.sections : [];

    sections.forEach((section) => {
      if (!section || !section.id) {
        return;
      }

      map.set(section.id, section);
    });

    return map;
  }

  function getSourceMaterial(section, model, templateSection) {
    const material = [];

    if (templateSection) {
      material.push(`Template section: ${templateSection.label || templateSection.id}`);
    }

    if (section.componentTypes && section.componentTypes.length) {
      const labels = section.componentTypes
        .map((type) => model.componentModel.labelsById.get(type))
        .filter(Boolean);

      if (labels.length) {
        material.push(`Component types: ${labels.join(", ")}`);
      }
    }

    if (section.fields) {
      const present = section.fields
        .filter((field) => !isEmptyValue(model.answers[field]))
        .map((field) => formatValue(field));

      if (present.length) {
        material.push(`Project Intake fields available: ${present.join(", ")}`);
      }
    }

    if (section.requirementSection) {
      material.push(`${model.requirementDecisionModel.includeCount} included requirement${model.requirementDecisionModel.includeCount === 1 ? "" : "s"}`);
    }

    if (section.planSection) {
      material.push(`${model.planModel.totalItems} project plan item${model.planModel.totalItems === 1 ? "" : "s"}`);
    }

    if (section.sourceContextSection) {
      material.push(`${model.clientModel.documentCount} client source document${model.clientModel.documentCount === 1 ? "" : "s"}`);
      material.push(`${model.publicModel.sourceCount} public source${model.publicModel.sourceCount === 1 ? "" : "s"}`);
    }

    if (section.blockerSection) {
      material.push(`${model.blockers.length} blocker group${model.blockers.length === 1 ? "" : "s"}`);
    }

    return material.length ? material : ["Not available"];
  }

  function getSectionStatus(section, model) {
    if (section.blockerSection) {
      return model.blockers.length ? "needs-review" : "ready";
    }

    if (section.requirementSection) {
      if (!model.requirementDecisionModel.includeCount) {
        return "missing";
      }

      return model.requirementDecisionModel.reviseCount || model.requirementDecisionModel.clarifyCount
        ? "needs-review"
        : "ready";
    }

    if (section.planSection) {
      if (!model.planModel.totalItems) {
        return "missing";
      }

      return model.planModel.openAttentionCount ? "needs-review" : "ready";
    }

    if (section.sourceContextSection) {
      if (!model.clientModel.documentCount && !model.publicModel.sourceCount) {
        return "missing";
      }

      return model.clientModel.pendingOpenCount || model.publicModel.pendingOpenCount
        ? "needs-review"
        : "ready";
    }

    if (section.fields && section.fields.some((field) => isEmptyValue(model.answers[field]))) {
      return "missing";
    }

    return model.blockers.length ? "needs-review" : "ready";
  }

  function getSectionNextAction(section, model, status) {
    if (status === "ready") {
      return "Use the available source material when drafting this section.";
    }

    if (section.requirementSection) {
      return model.requirementDecisionModel.includeCount
        ? "Resolve open requirement review decisions before final drafting."
        : "Mark requirements Include in RFP in Requirements Review.";
    }

    if (section.planSection) {
      return "Review Project Plan risks, dependencies, decisions, and roadmap items.";
    }

    if (section.sourceContextSection) {
      return "Review source material on Client Source Intake and Public Research before using it in a package.";
    }

    if (section.blockerSection) {
      return "Open Review Queue and source pages to resolve pending items.";
    }

    return "Complete the linked source page before drafting this package section.";
  }

  function selectTemplate(templatesData, answers) {
    const templates = Array.isArray(templatesData?.templates) ? templatesData.templates : [];
    const fallbackTemplate = templatesData?.fallbackTemplate || null;
    const systemType = String(answers.system_type || "").toLowerCase();
    const justiceDomain = String(answers.justice_domain || "").toLowerCase();

    const matched = templates.find((template) => {
      const haystack = [
        template.id,
        template.label,
        ...(Array.isArray(template.systemTypes) ? template.systemTypes : []),
        ...(Array.isArray(template.domains) ? template.domains : [])
      ].join(" ").toLowerCase();

      return (systemType && haystack.includes(systemType)) ||
        (justiceDomain && haystack.includes(justiceDomain)) ||
        (systemType.includes("prosecutor") && haystack.includes("prosecutor")) ||
        (systemType.includes("court") && haystack.includes("court"));
    });

    return matched || fallbackTemplate || templates[0] || null;
  }

  function normalizeClientTemplateRecords(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((template) => template && typeof template === "object").map((template) => ({
      ...template,
      id: template.id || "",
      templateName: template.templateName || "Untitled Client Template",
      deliverableType: template.deliverableType || "custom",
      sourceType: "client-provided",
      sourceName: template.sourceName || "",
      versionOrDate: template.versionOrDate || "",
      updatedAt: template.updatedAt || template.createdAt || "",
      sections: Array.isArray(template.sections) ? template.sections : []
    }));
  }

  function normalizeMcpTemplateRecords(catalogData) {
    const templates = Array.isArray(catalogData?.templates) ? catalogData.templates : [];
    return templates.filter((template) => template && typeof template === "object" && template.id && template.deliverableType).map((template) => ({
      ...template,
      name: template.name || template.id,
      version: template.version || "1.0",
      sections: Array.isArray(template.sections) ? [...template.sections].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)) : []
    }));
  }

  function buildComponentModel(componentsData) {
    const componentTypes = Array.isArray(componentsData?.componentTypes)
      ? componentsData.componentTypes
      : [];
    const labelsById = new Map();

    componentTypes.forEach((type) => {
      if (type && type.id) {
        labelsById.set(type.id, type.label || type.id);
      }
    });

    return {
      componentTypes,
      sampleComponents: Array.isArray(componentsData?.sampleComponents) ? componentsData.sampleComponents : [],
      labelsById
    };
  }

  function getReferenceDataWarnings(data) {
    const warnings = [];

    if (!data.templates || !Array.isArray(data.templates.templates)) {
      warnings.push("RFP template data was not available; fallback outline sections are shown.");
    }

    if (!data.components || !Array.isArray(data.components.componentTypes)) {
      warnings.push("RFP component type data was not available; component source hints are limited.");
    }

    if (!data.requirements || !Array.isArray(data.requirements.requirements)) {
      warnings.push("Requirements library data was not available; included requirement details may be incomplete.");
    }

    if (!data.deliverableTemplates || !Array.isArray(data.deliverableTemplates.templates)) {
      warnings.push("MCP deliverable template catalog was not available; standard template source context is limited.");
    }

    return warnings;
  }

  function render(model) {
    updateDeliverableTypeControls();

    if (!model || !model.hasWorkspace) {
      elements.noActive.classList.remove("hidden");
      elements.workspace.classList.add("hidden");
      setStatus(`Select a workspace to assemble a ${getSelectedDeliverableLabel().toLowerCase()} outline.`, false);
      return;
    }

    const viewModel = buildDeliverableViewModel(model);

    elements.noActive.classList.add("hidden");
    elements.workspace.classList.remove("hidden");
    setText(elements.introKicker, viewModel.introKicker);
    setText(elements.workspaceTitle, viewModel.title);
    setText(elements.templateNote, viewModel.note);
    const helper = elements.templateNote && elements.templateNote.nextElementSibling;
    if (helper) {
      helper.textContent = viewModel.helperText;
    }
    setText(elements.outlineKicker, viewModel.outlineKicker);
    setText(elements.outlineHeading, viewModel.outlineHeading);
    setText(elements.blockersKicker, viewModel.blockersKicker);
    setText(elements.blockersHeading, viewModel.blockersHeading);

    setSectionVisibility(elements.templateSection, viewModel.showTemplateContext);
    setSectionVisibility(elements.includedSection, viewModel.showIncludedRequirements);

    const templateSelection = buildTemplateSelectionModel(model, viewModel);

    renderTemplateSourceControls(model, viewModel, templateSelection);
    renderReadinessPath(model, viewModel, templateSelection);
    renderOutputOwnership(model, viewModel, templateSelection);
    renderSummary(viewModel);
    renderClientTemplateStatus(model, viewModel, templateSelection);
    renderAssessmentFindingsContext(model, viewModel);
    renderProjectProfile(model);

    if (viewModel.showTemplateContext) {
      renderTemplateContext(model, viewModel, templateSelection);
    }

    renderOutline(viewModel);

    if (viewModel.showIncludedRequirements) {
      renderIncludedRequirements(model);
    }

    renderBlockers(viewModel);

    if (model.dataWarnings.length && selectedDeliverableType === "rfp_package") {
      setStatus(model.dataWarnings.join(" "), true);
    } else {
      setStatus(`Selected deliverable: ${viewModel.label}. No records are changed from this page.`, false);
    }
  }

  function updateDeliverableTypeControls() {
    elements.deliverableTypeButtons.forEach((button) => {
      const isSelected = button.dataset.deliverableType === selectedDeliverableType;
      button.classList.toggle("active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function setSectionVisibility(element, visible) {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function getSelectedDeliverable() {
    return DELIVERABLE_TYPES[selectedDeliverableType] || DELIVERABLE_TYPES[DEFAULT_DELIVERABLE_TYPE];
  }

  function getSelectedDeliverableLabel() {
    return getSelectedDeliverable().label;
  }

  function getTemplateNote(model) {
    const templateName = model.selectedTemplate?.label || model.selectedTemplate?.id;
    const componentCount = model.componentModel.componentTypes.length;

    if (templateName && componentCount) {
      return `Using ${templateName} with ${componentCount} component type${componentCount === 1 ? "" : "s"} available for source hints.`;
    }

    if (templateName) {
      return `Using ${templateName}. Component source hints are limited.`;
    }

    return "Using the fallback v0 package outline. Template/component data was not available or not structured enough.";
  }

  function buildTemplateSelectionModel(model, viewModel) {
    const preference = getDeliverablePreference(model, viewModel.typeId);
    const source = normalizeTemplateSource(preference.templateSource);
    const clientTemplates = getMatchingClientTemplates(model, viewModel.typeId);
    const mcpTemplates = getMatchingMcpTemplates(model, viewModel.typeId);
    const selectedClientTemplate = clientTemplates.find((template) => template.id === preference.selectedClientTemplateId) || clientTemplates[0] || null;
    const selectedMcpTemplate = mcpTemplates.find((template) => template.id === preference.selectedMcpTemplateId) || mcpTemplates[0] || null;
    return { source, sourceLabel: TEMPLATE_SOURCES[source].label, preference, clientTemplates, selectedClientTemplate, mcpTemplates, selectedMcpTemplate };
  }

  function getMatchingClientTemplates(model, typeId) {
    return (Array.isArray(model.clientTemplates) ? model.clientTemplates : []).filter((template) => template.deliverableType === typeId);
  }

  function getMatchingMcpTemplates(model, typeId) {
    return (Array.isArray(model.mcpTemplates) ? model.mcpTemplates : []).filter((template) => template.deliverableType === typeId);
  }

  function renderReadinessPath(model, viewModel, selection) {
    if (!elements.readinessPath) return;
    if (elements.readinessPathHeading) elements.readinessPathHeading.textContent = `${viewModel.label} Readiness Path`;
    if (elements.readinessPathNote) {
      elements.readinessPathNote.textContent = viewModel.typeId === "assessment_report"
        ? "Assessment Report readiness is driven by reviewed intake/source context, Assessment Findings, optional client report templates, and Project Plan next steps."
        : "RFP Package readiness is driven by reviewed intake/source context, Requirements Review decisions, optional client templates, and Project Plan risks or assumptions.";
    }
    const items = viewModel.typeId === "assessment_report"
      ? buildAssessmentReadinessPathItems(model, selection)
      : buildRfpReadinessPathItems(model, selection);
    const stages = buildDeliverableReadinessStages(viewModel, items);
    elements.readinessPath.innerHTML = stages.map(renderReadinessWorkflowStage).join("");
  }

  function buildRfpReadinessPathItems(model, selection) {
    const pendingSourceCount = model.clientModel.pendingOpenCount + model.publicModel.pendingOpenCount;
    return [
      {
        label: "Project Intake",
        status: model.intakeModel.missingFields.length ? "missing" : "ready",
        detail: model.intakeModel.missingFields.length
          ? `Missing core fields: ${model.intakeModel.missingFields.join(", ")}`
          : `${model.intakeModel.confirmedAnswerCount} confirmed answer${model.intakeModel.confirmedAnswerCount === 1 ? "" : "s"} available.`,
        links: [{ label: "Open Project Intake", href: "interview.html" }]
      },
      {
        label: "Client Source and Public Research",
        status: getSourceContextStatus(model),
        detail: `${model.clientModel.documentCount} client source document${model.clientModel.documentCount === 1 ? "" : "s"}; ${model.publicModel.acceptedFactsCount} accepted public fact${model.publicModel.acceptedFactsCount === 1 ? "" : "s"}; ${pendingSourceCount} pending/open item${pendingSourceCount === 1 ? "" : "s"}.`,
        links: [
          { label: "Open Client Source Intake", href: "client-source-intake.html" },
          { label: "Open Public Research", href: "public-information-ai-assist.html" }
        ]
      },
      {
        label: "Requirements Review",
        status: model.requirementDecisionModel.includeCount ? (model.requirementDecisionModel.reviseCount || model.requirementDecisionModel.clarifyCount ? "needs-review" : "ready") : "missing",
        detail: `${model.requirementDecisionModel.includeCount} requirement${model.requirementDecisionModel.includeCount === 1 ? "" : "s"} marked Include in RFP. Requirements Matrix CSV is generated from Requirements Review.`,
        links: [{ label: "Open Requirements Review", href: "preview.html" }]
      },
      withReadinessStage(buildTemplatePathItem(selection), "discovery"),
      {
        label: "Project Plan",
        status: model.planModel.openAttentionCount ? "needs-review" : (model.planModel.totalItems ? "ready" : "missing"),
        detail: model.planModel.totalItems
          ? `${model.planModel.totalItems} risk/dependency/decision item${model.planModel.totalItems === 1 ? "" : "s"}; ${model.planModel.openAttentionCount} open attention item${model.planModel.openAttentionCount === 1 ? "" : "s"}.`
          : "No plan risks, assumptions, dependencies, or decisions captured yet.",
        links: [{ label: "Open Project Plan", href: "project-plan.html" }]
      },
      {
        label: "Requirements Review Outputs",
        stage: "outputs",
        status: model.requirementDecisionModel.includeCount ? "ready" : "needs-review",
        detail: "Review Brief Markdown and Requirements Matrix CSV are generated from Requirements Review, not duplicated here.",
        links: [{ label: "Open Requirements Review", href: "preview.html" }]
      },
      {
        label: "Outline / Package Structure",
        stage: "outputs",
        status: model.outlineSections.length ? "ready" : "missing",
        detail: `${model.outlineSections.length} package outline section${model.outlineSections.length === 1 ? "" : "s"} available for outline-level Markdown export.`,
        links: [{ label: "Review outline below", href: "#rfp-package-outline" }]
      }
    ];
  }

  function buildAssessmentReadinessPathItems(model, selection) {
    const counts = getAssessmentCounts(model);
    const findings = model.assessmentFindingsModel || buildAssessmentFindingsModel(null);
    return [
      {
        label: "Project Intake",
        status: model.intakeModel.confirmedAnswerCount ? (model.intakeModel.missingFields.length ? "needs-review" : "ready") : "missing",
        detail: model.intakeModel.confirmedAnswerCount
          ? `${model.intakeModel.confirmedAnswerCount} confirmed answer${model.intakeModel.confirmedAnswerCount === 1 ? "" : "s"}; ${model.intakeModel.missingFields.length} core field${model.intakeModel.missingFields.length === 1 ? "" : "s"} missing.`
          : "No confirmed intake answers available yet.",
        links: [{ label: "Open Project Intake", href: "interview.html" }]
      },
      {
        label: "Source Context",
        status: getSourceContextStatus(model),
        detail: `${counts.sourceMaterialCount} reviewed source item${counts.sourceMaterialCount === 1 ? "" : "s"}; ${counts.pendingSourceCount} pending source review item${counts.pendingSourceCount === 1 ? "" : "s"}.`,
        links: [
          { label: "Open Client Source Intake", href: "client-source-intake.html" },
          { label: "Open Public Research", href: "public-information-ai-assist.html" }
        ]
      },
      {
        label: "Assessment Findings",
        status: findings.total ? (findings.needsReview || findings.highCriticalWithoutRecommendations || findings.missingEvidence ? "needs-review" : "ready") : "missing",
        detail: `${findings.total} finding${findings.total === 1 ? "" : "s"}; ${findings.ready} ready; ${findings.needsReview} draft or needs review; ${findings.highCriticalWithoutRecommendations} high/critical without recommendations.`,
        links: [{ label: "Open Assessment Findings", href: "assessment-findings.html" }]
      },
      withReadinessStage(buildTemplatePathItem(selection), "discovery"),
      {
        label: "Project Plan",
        status: model.planModel.openAttentionCount ? "needs-review" : (model.planModel.totalItems ? "ready" : "missing"),
        detail: model.planModel.totalItems
          ? `${model.planModel.totalItems} roadmap, risk, dependency, or decision item${model.planModel.totalItems === 1 ? "" : "s"} available.`
          : "No roadmap, risk, dependency, or decision items captured yet.",
        links: [{ label: "Open Project Plan", href: "project-plan.html" }]
      },
      {
        label: "Assessment Report Outline",
        stage: "outputs",
        status: ASSESSMENT_OUTLINE.length ? "ready" : "missing",
        detail: `${ASSESSMENT_OUTLINE.length} assessment outline section${ASSESSMENT_OUTLINE.length === 1 ? "" : "s"} available for outline-level Markdown export. Findings/register export remains a future Assessment Findings output.`,
        links: [{ label: "Review outline below", href: "#rfp-package-outline" }]
      }
    ];
  }

  function buildTemplatePathItem(selection) {
    const sourceLabel = selection?.sourceLabel || "Outline only";
    if (selection?.source === "client_provided") {
      const template = selection.selectedClientTemplate;
      const totals = template ? countTemplateClassifications([template]) : countTemplateClassifications([]);
      const sections = Array.isArray(template?.sections) ? template.sections : [];
      return {
        label: "Client Template",
        status: template ? (sections.length ? "ready" : "needs-review") : "missing",
        detail: template
          ? `${template.templateName || "Untitled Client Template"}: ${sections.length} section${sections.length === 1 ? "" : "s"}, ${totals.insertionArea} insertion area${totals.insertionArea === 1 ? "" : "s"}, ${totals.instructionOnly} instruction-only section${totals.instructionOnly === 1 ? "" : "s"}.`
          : "Client-provided template source selected, but no matching workspace template is available.",
        links: [{ label: "Open Client Template Intake", href: "client-template-intake.html" }]
      };
    }
    const matchingCount = Array.isArray(selection?.clientTemplates) ? selection.clientTemplates.length : 0;
    return {
      label: "Template Source",
      status: "ready",
      detail: `${sourceLabel} selected. ${matchingCount ? `${matchingCount} matching client template${matchingCount === 1 ? "" : "s"} available if a client-provided structure should be used.` : "Client templates remain optional unless selected."}`,
      links: [{ label: "Open Client Template Intake", href: "client-template-intake.html" }]
    };
  }

  function withReadinessStage(item, stage) {
    return { ...item, stage };
  }

  function getSourceContextStatus(model) {
    const available = model.clientModel.documentCount + model.clientModel.acceptedSuggestionsCount + model.publicModel.acceptedFactsCount + model.publicModel.sourceCount;
    const pending = model.clientModel.pendingOpenCount + model.publicModel.pendingOpenCount;
    if (!available && !pending) return "missing";
    return pending ? "needs-review" : "ready";
  }

  function buildDeliverableReadinessStages(viewModel, items) {
    const definitions = viewModel.typeId === "assessment_report"
      ? [
          { id: "workspace", label: "Workspace", detail: "Project Intake and Project Plan context." },
          { id: "discovery", label: "Discovery", detail: "Client sources, public research, and optional client templates." },
          { id: "analysis", label: "Analysis", detail: "Assessment Findings, gaps, risks, and recommendations." },
          { id: "outputs", label: "Outputs", detail: "Assessment Report outline/readiness and future register outputs." }
        ]
      : [
          { id: "workspace", label: "Workspace", detail: "Project Intake and Project Plan context." },
          { id: "discovery", label: "Discovery", detail: "Client sources, public research, and optional client templates." },
          { id: "analysis", label: "Analysis", detail: "Requirements Review decisions and client clarification needs." },
          { id: "outputs", label: "Outputs", detail: "Requirements Review outputs and RFP Package outline/readiness." }
        ];

    return definitions.map((definition) => {
      const stageItems = items.filter((item) => (item.stage || inferReadinessStage(item.label)) === definition.id);
      return {
        ...definition,
        items: stageItems,
        status: getReadinessStageStatus(stageItems)
      };
    });
  }

  function inferReadinessStage(label) {
    if (/source|research|template/i.test(label || "")) return "discovery";
    if (/requirement|finding|risk|gap/i.test(label || "")) return "analysis";
    if (/outline|output|package|report/i.test(label || "")) return "outputs";
    return "workspace";
  }

  function getReadinessStageStatus(items) {
    if (!items.length) return "missing";
    if (items.some((item) => item.status === "missing")) return "missing";
    if (items.some((item) => item.status === "needs-review")) return "needs-review";
    return "ready";
  }

  function renderReadinessWorkflowStage(stage) {
    return `
      <article class="deliverable-readiness-stage status-${escapeHtml(stage.status)}">
        <div class="deliverable-readiness-stage-header">
          <span class="deliverable-readiness-stage-marker" aria-hidden="true"></span>
          <div>
            <span class="deliverable-workflow-step">${escapeHtml(stage.label)}</span>
            <h3>${escapeHtml(stage.label)}</h3>
            <p>${escapeHtml(stage.detail)}</p>
          </div>
          <span class="staged-badge ${badgeClass(stage.status)}">${escapeHtml(statusLabel(stage.status))}</span>
        </div>
        <div class="deliverable-readiness-stage-items">
          ${stage.items.length ? stage.items.map(renderReadinessPathItem).join("") : '<p class="helper-text">No inputs mapped to this stage yet.</p>'}
        </div>
      </article>
    `;
  }
  function renderReadinessPathItem(item) {
    return `
      <article class="deliverable-readiness-path-item status-${escapeHtml(item.status)}">
        <div>
          <span class="staged-badge ${badgeClass(item.status)}">${escapeHtml(item.statusLabel || statusLabel(item.status))}</span>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.detail)}</p>
        </div>
        <div class="deliverable-readiness-links">
          ${formatActionLinks(item.links)}
        </div>
      </article>
    `;
  }

  function renderOutputOwnership(model, viewModel, selection) {
    if (!elements.outputOwnership) return;
    const findings = model.assessmentFindingsModel || buildAssessmentFindingsModel(null);
    const templateName = selection?.source === "client_provided" && selection.selectedClientTemplate
      ? selection.selectedClientTemplate.templateName || "Untitled Client Template"
      : "No client-provided template selected";
    const items = [
      {
        label: `${viewModel.label} outline Markdown`,
        owner: "Deliverable Builder",
        status: "Available now",
        detail: "Copy Deliverable Outline and Download Markdown export the current outline/readiness view only.",
        links: [{ label: "Review outline", href: "#rfp-package-outline" }]
      },
      {
        label: "Requirements Matrix CSV",
        owner: "Requirements Review",
        status: "Owned by source page",
        detail: "Requirements Matrix CSV is generated from Requirements Review decisions and project-specific requirements, not from Deliverable Builder.",
        links: [{ label: "Open Requirements Review", href: "preview.html" }]
      },
      {
        label: "Client template structure",
        owner: "Client Template Intake",
        status: selection?.source === "client_provided" && selection.selectedClientTemplate ? "Selected" : "Optional input",
        detail: `${templateName}. Prepared sections can guide structure and insertion areas, but content is not inserted automatically.`,
        links: [{ label: "Open Client Template Intake", href: "client-template-intake.html" }]
      }
    ];

    if (viewModel.typeId === "assessment_report") {
      items.splice(2, 0, {
        label: "Findings / risk register export",
        owner: "Assessment Findings",
        status: "Future output",
        detail: `${findings.total} assessment finding${findings.total === 1 ? "" : "s"} available. A dedicated register export is not part of this slice.`,
        links: [{ label: "Open Assessment Findings", href: "assessment-findings.html" }]
      });
    }

    items.push({
      label: "Final client-ready document",
      owner: "Future output workflow",
      status: "Not implemented",
      detail: "Completing upstream sections improves readiness and context; it does not automatically generate a final package.",
      links: []
    });

    elements.outputOwnership.innerHTML = items.map((item) => `
      <article class="deliverable-output-owner-card">
        <div>
          <span class="deliverable-workflow-step">${escapeHtml(item.owner)}</span>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.detail)}</p>
        </div>
        <div class="deliverable-output-owner-meta">
          <span class="staged-badge staged-badge-info">${escapeHtml(item.status)}</span>
          <div class="deliverable-readiness-links">${formatActionLinks(item.links)}</div>
        </div>
      </article>
    `).join("");
  }

  function formatActionLinks(links) {
    if (!Array.isArray(links) || !links.length) return "";
    return links.map((link) => `<a class="secondary-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("");
  }
  function renderTemplateSourceControls(model, viewModel, selection) {
    if (!elements.templateSourcePanel) return;

    if (elements.templateSourceSelect) {
      elements.templateSourceSelect.innerHTML = Object.values(TEMPLATE_SOURCES).map((source) => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.label)}</option>`).join("");
      elements.templateSourceSelect.value = selection.source;
    }

    if (elements.mcpTemplateControl && elements.mcpTemplateSelect) {
      elements.mcpTemplateControl.classList.toggle("hidden", selection.source !== "mcp_standard");
      elements.mcpTemplateSelect.innerHTML = selection.mcpTemplates.length
        ? selection.mcpTemplates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`).join("")
        : '<option value="">No matching MCP standard template</option>';
      elements.mcpTemplateSelect.value = selection.selectedMcpTemplate?.id || "";
    }

    if (elements.clientTemplateControl && elements.clientTemplateSelect) {
      elements.clientTemplateControl.classList.toggle("hidden", selection.source !== "client_provided");
      elements.clientTemplateSelect.innerHTML = selection.clientTemplates.length
        ? selection.clientTemplates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.templateName)}</option>`).join("")
        : '<option value="">No matching client template</option>';
      elements.clientTemplateSelect.value = selection.selectedClientTemplate?.id || "";
    }

    renderTemplateSourceMessage(viewModel, selection);
  }

  function renderTemplateSourceMessage(viewModel, selection) {
    if (!elements.templateSourceMessage) return;
    if (selection.source === "mcp_standard") {
      const templateName = selection.selectedMcpTemplate?.name || "No matching MCP standard template";
      elements.templateSourceMessage.innerHTML = `<p>MCP standard template selected for ${escapeHtml(viewModel.label)}: <strong>${escapeHtml(templateName)}</strong>. Template sections are shown as read-only structure only.</p>`;
      return;
    }
    if (selection.source === "client_provided") {
      if (!selection.clientTemplates.length) {
        elements.templateSourceMessage.innerHTML = `<p>No client-provided ${escapeHtml(viewModel.label)} template is available for this workspace yet. <a class="secondary-link" href="client-template-intake.html">Open Client Template Intake</a></p>`;
        return;
      }
      elements.templateSourceMessage.innerHTML = `<p>Client-provided template selected for ${escapeHtml(viewModel.label)}. Deliverable Builder summarizes the template structure but does not map or insert content yet.</p>`;
      return;
    }
    if (selection.source === "ad_hoc_custom") {
      elements.templateSourceMessage.innerHTML = `<p>Ad hoc / custom source selected. Custom outline editing is a future workflow; the current derived ${escapeHtml(viewModel.label)} outline remains visible.</p>`;
      return;
    }
    elements.templateSourceMessage.innerHTML = `<p>Outline only selected. The current ${escapeHtml(viewModel.label)} outline is derived from reviewed workspace data without applying an external template.</p>`;
  }

  function renderAssessmentFindingsContext(model, viewModel) {
    const isAssessment = viewModel.typeId === "assessment_report";
    setSectionVisibility(elements.assessmentFindingsSection, isAssessment);
    if (!elements.assessmentFindingsContext || !isAssessment) return;
    const findings = model.assessmentFindingsModel || buildAssessmentFindingsModel(null);
    const cards = [
      ["Total findings", findings.total, findings.total ? "ready" : "missing", "Workspace assessment records"],
      ["Ready findings", findings.ready, findings.ready ? "ready" : "needs-review", "Marked Ready"],
      ["Draft / needs review", findings.needsReview, findings.needsReview ? "needs-review" : "ready", "Draft or Needs Review"],
      ["High / Critical", findings.highCritical, findings.highCritical ? "needs-review" : "ready", "High or critical severity"],
      ["Recommendations", findings.recommendations, findings.recommendations ? "ready" : "missing", "Recommendation records or text"],
      ["Evidence-linked", findings.evidenceLinked, findings.evidenceLinked ? "ready" : "needs-review", "Evidence text or source references"]
    ].map(([label, value, status, detail]) => `
      <article class="library-summary-card rfp-package-summary-card status-${escapeHtml(status)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `).join("");
    const blockers = [];
    if (!findings.total) blockers.push(["No assessment findings captured", "Create consultant-authored findings before treating the Assessment Report as ready."]);
    if (findings.needsReview) blockers.push(["Findings still draft or need review", `${findings.needsReview} finding${findings.needsReview === 1 ? "" : "s"} should be reviewed, marked Ready, or deferred.`]);
    if (findings.highCriticalWithoutRecommendations) blockers.push(["High/critical findings need recommendations", `${findings.highCriticalWithoutRecommendations} high/critical finding${findings.highCriticalWithoutRecommendations === 1 ? "" : "s"} lack recommendation text.`]);
    if (findings.missingEvidence) blockers.push(["Findings without evidence/source references", `${findings.missingEvidence} finding${findings.missingEvidence === 1 ? "" : "s"} lack evidence text or manual source references.`]);
    const blockerMarkup = blockers.length
      ? blockers.map(([title, detail]) => `<li><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></li>`).join("")
      : '<li><strong>Assessment findings ready</strong><span>No Assessment Findings blockers were detected from available workspace data.</span></li>';
    elements.assessmentFindingsContext.innerHTML = `
      <div class="client-template-status-grid assessment-findings-context-grid">${cards}</div>
      <div class="assessment-findings-context-blockers">
        <p class="section-kicker">Assessment report context</p>
        <ul>${blockerMarkup}</ul>
        <a class="secondary-link" href="assessment-findings.html">Open Assessment Findings</a>
      </div>
    `;
  }

  function renderClientTemplateStatus(model, viewModel, selection) {
    if (!elements.clientTemplateStatus) {
      return;
    }

    const templates = Array.isArray(model.clientTemplates) ? model.clientTemplates : [];
    const matchingTemplates = templates.filter((template) => template.deliverableType === viewModel.typeId);
    const classificationTotals = countTemplateClassifications(matchingTemplates);

    if (!templates.length) {
      elements.clientTemplateStatus.innerHTML = [
        "<div class=\"empty-state rfp-package-inline-empty\">",
        "<h3>No client templates captured yet</h3>",
        "<p>Use Client Template Intake to capture client-provided language, instructions, sections, and insertion areas for this workspace.</p>",
        "<a class=\"secondary-link\" href=\"client-template-intake.html\">Open Client Template Intake</a>",
        "</div>"
      ].join("");
      return;
    }

    const cards = [
      `<article class="library-summary-card rfp-package-summary-card">
        <span>Client templates available</span>
        <strong>${escapeHtml(String(templates.length))}</strong>
        <small>Workspace-specific records only.</small>
      </article>`,
      `<article class="library-summary-card rfp-package-summary-card ${matchingTemplates.length ? "status-ready" : "status-needs-review"}">
        <span>Matching selected type</span>
        <strong>${escapeHtml(String(matchingTemplates.length))}</strong>
        <small>${escapeHtml(viewModel.label)} templates.</small>
      </article>`,
      `<article class="library-summary-card rfp-package-summary-card ${classificationTotals.insertionArea ? "status-ready" : "status-needs-review"}">
        <span>Insertion areas</span>
        <strong>${escapeHtml(String(classificationTotals.insertionArea))}</strong>
        <small>Marked in matching templates.</small>
      </article>`
    ].join("");

    const selectedId = selection?.selectedClientTemplate?.id || "";
    const matches = matchingTemplates.length
      ? `<div class="client-template-match-list">${matchingTemplates.slice(0, 4).map((template) => {
          const totals = countTemplateClassifications([template]);
          const sections = Array.isArray(template.sections) ? template.sections : [];
          const draftingCount = totals.consultantEditable + totals.unknown;
          const isSelected = selectedId && template.id === selectedId;
          return `
          <article class="client-template-match-card ${isSelected ? "selected" : ""}">
            <div class="client-template-match-heading">
              <h3>${escapeHtml(template.templateName || "Untitled Client Template")}</h3>
              ${isSelected ? '<span class="staged-badge staged-badge-info">Selected</span>' : ""}
            </div>
            <p>${escapeHtml([template.sourceName, template.versionOrDate].filter(Boolean).join(" - ") || "No source details provided")}</p>
            <dl class="rfp-package-detail-list compact-detail-list">
              <div><dt>Sections</dt><dd>${escapeHtml(String(sections.length))}</dd></div>
              <div><dt>Insertion areas</dt><dd>${escapeHtml(String(totals.insertionArea))}</dd></div>
              <div><dt>Manual drafting/review</dt><dd>${escapeHtml(String(draftingCount))}</dd></div>
            </dl>
            <small>${escapeHtml(formatClientTemplateClassificationSummary(totals))}</small>
          </article>`;
        }).join("")}</div>`
      : '<p class="staged-muted">No client templates match the selected deliverable type yet.</p>';

    elements.clientTemplateStatus.innerHTML = `<div class="client-template-status-grid">${cards}</div>${matches}`;
  }

  function countTemplateClassifications(templates) {
    return templates.reduce((totals, template) => {
      (template.sections || []).forEach((section) => {
        const classification = section.classification || "unknown";
        if (classification === "preserve-exactly") totals.preserveExactly += 1;
        else if (classification === "consultant-editable") totals.consultantEditable += 1;
        else if (classification === "insertion-area") totals.insertionArea += 1;
        else if (classification === "instruction-only") totals.instructionOnly += 1;
        else totals.unknown += 1;
      });
      return totals;
    }, { preserveExactly: 0, consultantEditable: 0, insertionArea: 0, instructionOnly: 0, unknown: 0 });
  }

  function renderProjectProfile(model) {
    if (!elements.projectProfile) {
      return;
    }

    const fields = [
      ["Workspace name", model.workspaceName],
      ["Procurement type", model.intakeModel.procurementType],
      ["Justice domain", model.intakeModel.justiceDomain],
      ["System type", model.intakeModel.systemType],
      ["Client type", model.intakeModel.clientType],
      ["Deployment model", model.answers.deployment_model || model.answers.hosting_model],
      ["Implementation/support needs", summarizeAnswerList(model.answers.implementation_services || model.answers.support_needs || model.answers.reporting_needs)]
    ];

    elements.projectProfile.innerHTML = fields
      .map(([label, value]) => `
        <div class="profile-item">
          <span class="profile-label">${escapeHtml(label)}</span>
          <span class="profile-value">${escapeHtml(formatProfileValue(value))}</span>
        </div>
      `)
      .join("");
  }

  function renderTemplateContext(model, viewModel, selection) {
    if (!elements.templateContext) return;
    if (selection.source === "mcp_standard") {
      renderMcpTemplateContext(viewModel, selection);
      return;
    }
    if (selection.source === "client_provided") {
      renderClientProvidedTemplateContext(viewModel, selection);
      return;
    }
    if (selection.source === "ad_hoc_custom") {
      renderAdHocTemplateContext(viewModel);
      return;
    }
    renderOutlineOnlyTemplateContext(model, viewModel);
  }

  function renderOutlineOnlyTemplateContext(model, viewModel) {
    if (viewModel.typeId !== "rfp_package") {
      elements.templateContext.innerHTML = `
        <p class="template-match">Outline only</p>
        <p class="template-description">The ${escapeHtml(viewModel.label)} outline is derived from available workspace signals. No MCP or client template is applied.</p>
        <dl class="rfp-package-detail-list">
          <div><dt>Template source</dt><dd>Outline only</dd></div>
          <div><dt>Document generation</dt><dd>Not implemented in this v0 workflow</dd></div>
          <div><dt>Source records</dt><dd>No records are changed from this page</dd></div>
        </dl>
      `;
      return;
    }

    const template = model.selectedTemplate;
    const sections = Array.isArray(template?.sections) ? template.sections : [];
    const componentLabels = unique(sections.flatMap((section) => Array.isArray(section.componentTypes) ? section.componentTypes : []).map((type) => model.componentModel.labelsById.get(type) || type).filter(Boolean));
    if (!template) {
      elements.templateContext.innerHTML = `<p class="template-match">Outline only</p><p class="template-description">No RFP template data is available. The page is using the v0 fallback package outline.</p>`;
      return;
    }
    elements.templateContext.innerHTML = `
      <p class="template-match">Outline only with RFP source hints</p>
      <p class="template-description">${escapeHtml(template.label || template.id || "RFP template")} is available as source context only. It does not change requirement generation or produce a final document.</p>
      <dl class="rfp-package-detail-list">
        <div><dt>Package sections</dt><dd>${escapeHtml(sections.length ? `${sections.length} sections available` : "Not available")}</dd></div>
        <div><dt>Component context</dt><dd>${escapeHtml(componentLabels.length ? componentLabels.join(", ") : "Not available")}</dd></div>
        <div><dt>How it informs the outline</dt><dd>Template sections are matched to the package outline as source context only. Requirement generation remains unchanged.</dd></div>
      </dl>
      ${sections.length ? `<ol class="template-sections">${sections.map((section) => `<li>${escapeHtml(section.label || section.id || "Untitled section")}</li>`).join("")}</ol>` : ""}
    `;
  }

  function renderMcpTemplateContext(viewModel, selection) {
    const template = selection.selectedMcpTemplate;
    if (!template) {
      elements.templateContext.innerHTML = `<div class="empty-state rfp-package-inline-empty"><h3>No MCP standard template found</h3><p>No read-only MCP template matches ${escapeHtml(viewModel.label)} in the local catalog.</p></div>`;
      return;
    }
    elements.templateContext.innerHTML = `
      <p class="template-match">${escapeHtml(template.name)}</p>
      <p class="template-description">${escapeHtml(template.description || "Read-only MCP standard deliverable template.")}</p>
      <dl class="rfp-package-detail-list">
        <div><dt>Version</dt><dd>${escapeHtml(template.version || "Not available")}</dd></div>
        <div><dt>Template source</dt><dd>MCP standard template</dd></div>
        <div><dt>Sections</dt><dd>${escapeHtml(String(template.sections.length))} read-only section${template.sections.length === 1 ? "" : "s"}</dd></div>
        <div><dt>How it informs the outline</dt><dd>Sections provide structure only. Workbench content is not inserted or drafted in this pass.</dd></div>
      </dl>
      <ol class="template-sections mcp-template-section-list">${template.sections.map((section) => `<li><strong>${escapeHtml(section.title || section.id || "Untitled section")}</strong><span>${escapeHtml(section.purpose || "No purpose provided.")}</span><small>Inputs: ${escapeHtml(formatExpectedInputs(section.expectedWorkbenchInputs))} / Role: ${escapeHtml(formatValue(section.templateRole || "not_set"))}</small></li>`).join("")}</ol>
    `;
  }

  function renderClientProvidedTemplateContext(viewModel, selection) {
    const template = selection.selectedClientTemplate;
    if (!template) {
      elements.templateContext.innerHTML = `<div class="empty-state rfp-package-inline-empty"><h3>No matching client template</h3><p>No workspace-specific client template matches ${escapeHtml(viewModel.label)} yet.</p><a class="secondary-link" href="client-template-intake.html">Open Client Template Intake</a></div>`;
      return;
    }
    const totals = countTemplateClassifications([template]);
    const sections = Array.isArray(template.sections) ? template.sections : [];
    elements.templateContext.innerHTML = `
      <p class="template-match">${escapeHtml(template.templateName || "Untitled Client Template")}</p>
      <p class="template-description">Workspace-specific client template structure. Raw template text is not copied into deliverable outlines and content is not mapped or inserted yet.</p>
      <dl class="rfp-package-detail-list">
        <div><dt>Source</dt><dd>${escapeHtml([template.sourceName, template.versionOrDate].filter(Boolean).join(" - ") || "Not available")}</dd></div>
        <div><dt>Sections</dt><dd>${escapeHtml(String(sections.length))}</dd></div>
        <div><dt>Insertion areas</dt><dd>${escapeHtml(String(totals.insertionArea))}</dd></div>
        <div><dt>Classification mix</dt><dd>${escapeHtml(formatClientTemplateClassificationSummary(totals))}</dd></div>
      </dl>
      ${sections.length ? `<ol class="template-sections client-template-structure-list">${sections.map((section) => {
        const classification = section.classification || "unknown";
        const nextAction = classification === "insertion-area"
          ? "Likely insertion area for reviewed workbench content."
          : classification === "preserve-exactly"
            ? "Preserve client-provided language during future drafting."
            : classification === "instruction-only"
              ? "Treat as guidance, not final deliverable prose."
              : "Review and classify before using in a deliverable.";
        return `<li><strong>${escapeHtml(section.title || "Untitled section")}</strong><span>${escapeHtml(formatTemplateClassification(classification))}</span><small>${escapeHtml(nextAction)}</small></li>`;
      }).join("")}</ol>` : ""}
      <p class="staged-muted">Prepared client template sections can guide structure and insertion areas, but template population is not implemented yet.</p>
      <a class="secondary-link" href="client-template-intake.html">Review in Client Template Intake</a>
    `;
  }

  function renderAdHocTemplateContext(viewModel) {
    elements.templateContext.innerHTML = `
      <p class="template-match">Ad hoc / custom</p>
      <p class="template-description">Custom outline source selected. A full custom template editor is not implemented yet, so the current ${escapeHtml(viewModel.label)} outline remains the working structure.</p>
      <dl class="rfp-package-detail-list">
        <div><dt>Template source</dt><dd>Ad hoc / custom</dd></div>
        <div><dt>Custom editing</dt><dd>Future workflow</dd></div>
        <div><dt>Document generation</dt><dd>Not implemented</dd></div>
      </dl>
    `;
  }
  function renderSummary(model) {
    elements.summary.innerHTML = model.summaryItems
      .map((item) => `
        <article class="library-summary-card rfp-package-summary-card status-${escapeHtml(item.status)}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </article>
      `)
      .join("");
  }

  function renderOutline(model) {
    if (!model.outlineSections.length) {
      const emptyTitle = model.emptyOutlineTitle || "No deliverable sections available";
      const emptyText = model.emptyOutlineText || "Open Project Intake or source workflows to start building deliverable inputs.";
      elements.outline.innerHTML = `
        <div class="empty-state rfp-package-inline-empty">
          <h3>${escapeHtml(emptyTitle)}</h3>
          <p>${escapeHtml(emptyText)}</p>
          <a class="secondary-link" href="interview.html">Go to Project Intake</a>
        </div>
      `;
      return;
    }

    elements.outline.innerHTML = model.outlineSections
      .map((section, index) => `
        <article class="rfp-package-outline-item status-${escapeHtml(section.status)}">
          <div class="rfp-package-outline-header">
            <span class="rfp-package-outline-index">${escapeHtml(String(index + 1))}</span>
            <div>
              <h3>${escapeHtml(section.name)}</h3>
              <span class="staged-badge ${badgeClass(section.status)}">${escapeHtml(section.readinessLabel)}</span>
            </div>
          </div>
          <dl class="rfp-package-detail-list">
            <div>
              <dt>Source material available</dt>
              <dd>${escapeHtml(section.sourceMaterial.join("; "))}</dd>
            </div>
            <div>
              <dt>Suggested next action</dt>
              <dd>${escapeHtml(section.nextAction)}</dd>
            </div>
          </dl>
          <div class="rfp-package-source-links">
            ${section.sourcePages.map((link) => `<a class="secondary-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}
          </div>
        </article>
      `)
      .join("");
  }

  function renderIncludedRequirements(model) {
    if (!model.includedRequirements.length) {
      elements.includedRequirements.innerHTML = `
        <div class="empty-state rfp-package-inline-empty">
          <h3>No included requirements yet</h3>
          <p>Only explicit Include in RFP decisions appear in this package preview.</p>
          <a class="secondary-link" href="preview.html">Open Requirements Review</a>
        </div>
      `;
      return;
    }

    elements.includedRequirements.innerHTML = model.includedRequirements
      .map((requirement) => `
        <article class="rfp-package-requirement">
          <div class="rfp-package-requirement-header">
            <div>
              <span class="staged-badge staged-badge-info">${escapeHtml(requirement.id)}</span>
              <h3>${escapeHtml(requirement.title)}</h3>
            </div>
            <a class="secondary-link" href="preview.html?requirementId=${encodeURIComponent(requirement.id)}">Open Review</a>
          </div>
          <dl class="rfp-package-detail-list">
            <div>
              <dt>Category / domain</dt>
              <dd>${escapeHtml([requirement.section, requirement.category].filter(Boolean).join(" - ") || "Not available")}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>${escapeHtml(requirement.sourceType || "Not available")}</dd>
            </div>
          </dl>
          <p>${escapeHtml(requirement.text || "Requirement text is not available.")}</p>
        </article>
      `)
      .join("");
  }

  function renderBlockers(model) {
    const requirementIssues = model.requirementIssues || [];
    const planItems = model.planItems || [];
    const rows = [];

    model.blockers.forEach((blocker) => {
      rows.push(`
        <article class="rfp-package-blocker">
          <div>
            <span class="staged-badge staged-badge-warning">${escapeHtml(String(blocker.count))}</span>
            <h3>${escapeHtml(blocker.label)}</h3>
            <p>${escapeHtml(blocker.detail)}</p>
          </div>
          <a class="secondary-link" href="${escapeHtml(blocker.href)}">Open source page</a>
        </article>
      `);
    });

    requirementIssues.slice(0, 6).forEach((issue) => {
      rows.push(`
        <article class="rfp-package-blocker">
          <div>
            <span class="staged-badge staged-badge-warning">${escapeHtml(issue.decisionLabel)}</span>
            <h3>${escapeHtml(issue.title)}</h3>
            <p>${escapeHtml(issue.id)} - ${escapeHtml(issue.section || "Requirements Review")}</p>
          </div>
          <a class="secondary-link" href="preview.html?requirementId=${encodeURIComponent(issue.id)}">Open Review</a>
        </article>
      `);
    });

    planItems.slice(0, 6).forEach((item) => {
      rows.push(`
        <article class="rfp-package-blocker">
          <div>
            <span class="staged-badge staged-badge-warning">${escapeHtml(PLAN_ITEM_TYPES[item.type] || item.type || "Plan item")}</span>
            <h3>${escapeHtml(item.title || "Untitled plan item")}</h3>
            <p>${escapeHtml(formatValue(item.status || "not_started"))}</p>
          </div>
          <a class="secondary-link" href="project-plan.html">Open Project Plan</a>
        </article>
      `);
    });

    if (!rows.length) {
      elements.blockers.innerHTML = `
        <div class="empty-state rfp-package-inline-empty">
          <h3>No blockers detected from available workspace data</h3>
          <p>Continue manual review before treating this deliverable as client-ready.</p>
          <a class="secondary-link" href="review-queue.html">Open Review Queue</a>
        </div>
      `;
      return;
    }

    elements.blockers.innerHTML = rows.join("");
  }

  async function handleCopyOutline() {
    if (!currentModel || !currentModel.hasWorkspace) {
      setStatus("Select a workspace before copying a deliverable outline.", true);
      return;
    }

    const markdown = formatMarkdown(currentModel);

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setStatus("Clipboard access is not available in this browser. Use Download Markdown instead.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      setStatus(`${getSelectedDeliverableLabel()} outline copied.`, false);
    } catch (error) {
      setStatus("Clipboard access was blocked. Use Download Markdown instead.", true);
    }
  }

  function handleDownloadOutline() {
    if (!currentModel || !currentModel.hasWorkspace) {
      setStatus("Select a workspace before downloading a deliverable outline.", true);
      return;
    }

    const markdown = formatMarkdown(currentModel);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const deliverable = getSelectedDeliverable();

    link.href = url;
    link.download = buildDownloadFileName(currentModel, deliverable);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`${deliverable.label} outline Markdown downloaded.`, false);
  }

  function formatMarkdown(model) {
    const viewModel = buildDeliverableViewModel(model);
    return viewModel.typeId === "assessment_report"
      ? formatAssessmentMarkdown(model, viewModel)
      : formatRfpMarkdown(model, viewModel);
  }

  function formatRfpMarkdown(model, viewModel) {
    const lines = [
      `# RFP Package Outline - ${model.workspaceName}`,
      "",
      `Generated: ${model.generatedAt}`,
      "",
      "This outline is derived from existing Procurement Workbench workspace data. It does not include full public research records, full source document text, or unaccepted AI-derived source content.",
      "",
      "## Readiness Summary",
      ...viewModel.summaryItems.map((item) => `- ${item.label}: ${item.value} (${item.detail})`),
      "",
      "## Package Outline",
      ...viewModel.outlineSections.flatMap((section, index) => [
        `${index + 1}. ${section.name} - ${section.readinessLabel}`,
        `   - Source material: ${section.sourceMaterial.join("; ")}`,
        `   - Suggested next action: ${section.nextAction}`
      ]),
      "",
      "## Included Requirements",
      ...(model.includedRequirements.length
        ? model.includedRequirements.flatMap((requirement) => [
            `### ${requirement.id} - ${requirement.title}`,
            `- Source: ${requirement.sourceType || "Not available"}`,
            `- Category/domain: ${[requirement.section, requirement.category].filter(Boolean).join(" - ") || "Not available"}`,
            "",
            requirement.text || "Requirement text is not available.",
            ""
          ])
        : ["No requirements are explicitly marked Include in RFP."]),
      "",
      "## Open Items / Blockers",
      ...(model.blockers.length
        ? model.blockers.map((blocker) => `- ${blocker.label}: ${blocker.count} - ${blocker.detail}`)
        : ["No blockers detected from available workspace data. Manual review is still required."])
    ];

    return lines.join("\n");
  }

  function formatAssessmentMarkdown(model, viewModel) {
    const lines = [
      `# Assessment Report Outline - ${model.workspaceName}`,
      "",
      `Generated: ${model.generatedAt}`,
      "",
      "This outline is derived from existing Procurement Workbench workspace metadata. It is not final report prose and does not include full client source documents, full public research facts, or unreviewed AI-derived content.",
      "",
      "## Readiness Summary",
      ...viewModel.summaryItems.map((item) => `- ${item.label}: ${item.value} (${item.detail})`),
      "",
      "## Assessment Report Outline",
      ...viewModel.outlineSections.flatMap((section, index) => [
        `${index + 1}. ${section.name} - ${section.readinessLabel}`,
        `   - Source material: ${section.sourceMaterial.join("; ")}`,
        `   - Suggested next action: ${section.nextAction}`
      ]),
      "",
      "## Before Report Is Ready",
      ...(viewModel.blockers.length
        ? viewModel.blockers.map((blocker) => `- ${blocker.label}: ${blocker.count} - ${blocker.detail}`)
        : ["No blockers detected from available workspace data. Manual consultant review is still required."])
    ];

    return lines.join("\n");
  }

  function setStatus(message, isWarning) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = message || "";
    elements.status.classList.toggle("warning", Boolean(isWarning));
    elements.status.classList.toggle("error", false);
  }

  function isEmptyValue(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || String(value).trim() === "";
  }

  function formatValue(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function summarizeAnswerList(value) {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "";
    }

    return value || "";
  }

  function formatProfileValue(value) {
    if (isEmptyValue(value)) {
      return "Not available";
    }

    return formatValue(summarizeAnswerList(value));
  }

  function formatExpectedInputs(value) {
    return Array.isArray(value) && value.length ? value.join(", ") : "Not available";
  }

  function formatTemplateClassification(value) {
    const labels = {
      "preserve-exactly": "Preserve exactly",
      "consultant-editable": "Consultant editable",
      "insertion-area": "Insertion area",
      "instruction-only": "Instruction only",
      unknown: "Unknown"
    };
    return labels[value] || labels.unknown;
  }

  function formatClientTemplateClassificationSummary(totals) {
    return [
      `${totals.preserveExactly} preserve exactly`,
      `${totals.consultantEditable} consultant editable`,
      `${totals.insertionArea} insertion area`,
      `${totals.instructionOnly} instruction only`,
      `${totals.unknown} unknown`
    ].join("; ");
  }
  function unique(values) {
    return [...new Set(values)];
  }
  function statusLabel(status) {
    if (status === "ready") {
      return "Ready";
    }

    if (status === "needs-review") {
      return "Needs Review";
    }

    return "Missing Inputs";
  }

  function badgeClass(status) {
    if (status === "ready") {
      return "staged-badge-info";
    }

    if (status === "needs-review") {
      return "staged-badge-warning";
    }

    return "staged-badge-warning";
  }

  function buildDownloadFileName(model, deliverable) {
    const workspaceName = sanitizeFileNamePart(model?.workspaceName, "Untitled Workspace");
    const deliverableName = getDeliverableOutlineFileLabel(deliverable);
    const dateStamp = formatDateStamp(new Date());

    return `Procurement Workbench - ${workspaceName} - ${deliverableName} - ${dateStamp}.md`;
  }

  function getDeliverableOutlineFileLabel(deliverable) {
    const label = sanitizeFileNamePart(deliverable?.label, "Deliverable");
    return /outline$/i.test(label) ? label : `${label} Outline`;
  }

  function formatDateStamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function sanitizeFileNamePart(value, fallback) {
    const cleaned = String(value || "")
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
      .replace(/[`#>\[\]{}]/g, " ")
      .replace(/[.]{2,}/g, ".")
      .replace(/[!?,;:]{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");

    return cleaned || fallback;
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





