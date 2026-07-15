(function () {
  const WORKSPACES_KEY = "rfpClientWorkspaces";
  const ACTIVE_WORKSPACE_KEY = "rfpActiveClientWorkspaceId";
  const LEGACY_ANSWERS_KEY = "rfpInterviewAnswers";
  const LEGACY_REVIEW_DECISIONS_KEY = "rfpRequirementReviewDecisions";
  const SIDEBAR_COLLAPSED_KEY = "rfpSidebarCollapsed";
  const SIDEBAR_SECTION_STATE_KEY = "rfpSidebarSectionState";
  const DEFAULT_WORKSPACE_ID = "default-client";
  const NO_ACTIVE_WORKSPACE = Object.freeze({
    id: "",
    name: "No workspace selected",
    createdAt: "",
    updatedAt: "",
    isNoActiveWorkspace: true
  });
  const PROJECT_ROADMAP_VERSION = 1;
  const PROJECT_PLAN_ITEMS_VERSION = 1;
  const REQUIREMENT_REVIEW_NOTES_VERSION = 1;
  const PROJECT_SPECIFIC_REQUIREMENTS_VERSION = 1;
  const PROJECT_PLAN_ITEM_TYPES = [
    "deliverable",
    "checkpoint",
    "decision",
    "dependency",
    "risk"
  ];
  const PROJECT_ROADMAP_STATUSES = [
    "not_started",
    "in_progress",
    "blocked",
    "complete",
    "not_applicable"
  ];
  const WORKFLOW_PHASES = [
    { id: "setup", label: "Setup" },
    { id: "intake", label: "Intake" },
    { id: "research", label: "Research" },
    { id: "requirements", label: "Requirements" },
    { id: "review", label: "Review" },
    { id: "delivery", label: "Delivery" }
  ];
  const WORKFLOW_STATUS_LABELS = {
    not_started: "Not started",
    in_progress: "In progress",
    needs_attention: "Needs attention",
    ready: "Ready"
  };
  const PROJECT_ROADMAP_BUCKETS = [
    {
      id: "initiation_setup",
      label: "Initiation / Setup",
      description: "Establish scope, governance, workspace context, and project controls."
    },
    {
      id: "discovery_intake",
      label: "Discovery / Intake",
      description: "Gather client context, stakeholder input, and intake information."
    },
    {
      id: "source_research",
      label: "Source Review / Research",
      description: "Review client source materials, public research, and supporting evidence."
    },
    {
      id: "analysis_requirements",
      label: "Analysis / Requirements",
      description: "Analyze needs, gaps, workflows, requirements, and recommendation inputs."
    },
    {
      id: "package_development",
      label: "Package Development",
      description: "Develop RFP, SOW, report, exhibit, or package content."
    },
    {
      id: "review_approval",
      label: "Review / Approval",
      description: "Resolve review comments, readiness checks, and approval decisions."
    },
    {
      id: "evaluation_selection",
      label: "Evaluation / Selection Support",
      description: "Support vendor questions, scoring, evaluation, selection, and negotiation work."
    },
    {
      id: "implementation_readiness",
      label: "Implementation Readiness",
      description: "Prepare downstream readiness, transition, or implementation planning inputs."
    },
    {
      id: "closeout_handoff",
      label: "Closeout / Handoff",
      description: "Finalize outputs, handoff materials, closeout items, and next steps."
    }
  ];
  const ADDITIONAL_ROADMAP_STAGE_METADATA = {
    current_state_analysis: {
      label: "Current-State Analysis",
      description: "Review current-state workflows, operations, constraints, and process dependencies."
    },
    systems_integration_analysis: {
      label: "Systems / Integration Analysis",
      description: "Assess systems, integrations, data flows, and platform capabilities."
    },
    gap_recommendations: {
      label: "Gap / Risk / Recommendations",
      description: "Identify gaps, risks, recommendations, priorities, and roadmap themes."
    }
  };
  const LEGACY_ROADMAP_STAGE_REMAP = {
    setup: "initiation_setup",
    discovery_interviews: "discovery_intake",
    workshops: "discovery_intake",
    public_information_review: "source_research",
    current_state_review: "analysis_requirements",
    source_document_analysis: "source_research",
    requirements_development: "analysis_requirements",
    rfp_drafting: "package_development",
    internal_review: "review_approval",
    client_review: "review_approval",
    final_package: "package_development",
    procurement_support: "evaluation_selection",
    project_initiation_controls: "initiation_setup",
    source_background_review: "source_research",
    stakeholder_discovery: "discovery_intake",
    business_requirements_analysis: "analysis_requirements",
    requirements_validation: "analysis_requirements",
    rfp_solicitation_development: "package_development",
    evaluation_scoring_model: "evaluation_selection",
    negotiation_support: "evaluation_selection",
    project_closure: "closeout_handoff",
    project_initiation_kickoff: "initiation_setup",
    documentation_review: "source_research",
    legislative_policy_review: "source_research",
    stakeholder_engagement: "discovery_intake",
    current_state_workflow_review: "current_state_analysis",
    gap_risk_analysis: "gap_recommendations",
    recommendations_roadmap: "gap_recommendations",
    draft_report_review: "review_approval",
    final_report_presentation: "closeout_handoff",
    closeout: "closeout_handoff"
  };
  const ROADMAP_STATUS_PRIORITY = {
    not_applicable: 0,
    not_started: 1,
    complete: 2,
    in_progress: 3,
    blocked: 4
  };
  const createWorkspaceModalState = {
    onCreated: null,
    redirectTo: "",
    lastFocusedElement: null
  };
  const SCOPED_ITEMS = [
    "answers",
    "reviewDecisions",
    "requirementReviewNotes",
    "projectSpecificRequirements",
    "clientSourceDocuments",
    "extractedClientFacts",
    "suggestedInterviewAnswers",
    "openQuestions",
    "clientRiskGapNotes",
    "publicInfoSources",
    "publicInfoFacts",
    "publicInfoSuggestions",
    "publicInfoFollowUps",
    "publicInfoRiskNotes",
    "publicInfoDisplayState",
    "projectRoadmap",
    "projectPlanItems",
    "clientTemplates",
    "deliverablePreferences",
    "assessmentFindings"
  ];
  const WORKSPACE_ID_SCOPED_ITEMS = [
    "clientSourceDocuments",
    "requirementReviewNotes",
    "projectSpecificRequirements",
    "extractedClientFacts",
    "suggestedInterviewAnswers",
    "openQuestions",
    "clientRiskGapNotes",
    "publicInfoSources",
    "publicInfoFacts",
    "publicInfoSuggestions",
    "publicInfoFollowUps",
    "publicInfoRiskNotes",
    "publicInfoDisplayState",
    "projectRoadmap",
    "projectPlanItems"
  ];

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

  function scopedKey(workspaceId, item) {
    return `rfpWorkspace:${workspaceId}:${item}`;
  }

  function createId() {
    if (window.crypto && crypto.randomUUID) {
      return `client-${crypto.randomUUID()}`;
    }

    return `client-${Date.now()}`;
  }

  function getWorkspaces() {
    return readJson(WORKSPACES_KEY, []);
  }

  function saveWorkspaces(workspaces) {
    writeJson(WORKSPACES_KEY, workspaces);
  }

  function createDefaultWorkspace() {
    const now = new Date().toISOString();

    return {
      id: DEFAULT_WORKSPACE_ID,
      name: "Default Client",
      createdAt: now,
      updatedAt: now
    };
  }

  function ensureWorkspaces() {
    let workspaces = getWorkspaces();

    if (!workspaces.length) {
      return [];
    }

    let activeId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);

    if (activeId && !workspaces.some((workspace) => workspace.id === activeId)) {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      activeId = "";
    }

    if (activeId) {
      migrateLegacyData(activeId);
    }

    return workspaces;
  }

  function listWorkspaces() {
    return ensureWorkspaces().map((workspace) => ({ ...workspace }));
  }

  function migrateLegacyData(workspaceId) {
    const legacyAnswers = localStorage.getItem(LEGACY_ANSWERS_KEY);
    const answersKey = scopedKey(workspaceId, "answers");

    if (legacyAnswers && !localStorage.getItem(answersKey)) {
      localStorage.setItem(answersKey, legacyAnswers);
    }

    const legacyDecisions = localStorage.getItem(LEGACY_REVIEW_DECISIONS_KEY);
    const decisionsKey = scopedKey(workspaceId, "reviewDecisions");

    if (legacyDecisions && !localStorage.getItem(decisionsKey)) {
      localStorage.setItem(decisionsKey, legacyDecisions);
    }
  }

  function getActiveWorkspace() {
    const workspaces = ensureWorkspaces();
    const activeId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return workspaces.find((workspace) => workspace.id === activeId) || { ...NO_ACTIVE_WORKSPACE };
  }

  function getActiveWorkspaceOrNull() {
    const workspace = getActiveWorkspace();
    return workspace && workspace.id ? workspace : null;
  }

  function setActiveWorkspace(workspaceId) {
    const workspaces = ensureWorkspaces();
    const cleanedWorkspaceId = String(workspaceId || "").trim();

    if (!cleanedWorkspaceId) {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      return true;
    }

    if (workspaces.some((workspace) => workspace.id === cleanedWorkspaceId)) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, cleanedWorkspaceId);
      return true;
    }

    return false;
  }

  function touchWorkspace(workspaceId) {
    const workspaces = getWorkspaces().map((workspace) => {
      if (workspace.id !== workspaceId) {
        return workspace;
      }

      return {
        ...workspace,
        updatedAt: new Date().toISOString()
      };
    });

    saveWorkspaces(workspaces);
  }

  function createWorkspace(name) {
    const cleanedName = String(name || "").trim();
    const workspaceName = cleanedName || `Client ${getWorkspaces().length + 1}`;
    const now = new Date().toISOString();
    const workspace = {
      id: createId(),
      name: workspaceName,
      createdAt: now,
      updatedAt: now
    };

    saveWorkspaces([...ensureWorkspaces(), workspace]);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    return workspace;
  }

  function renameWorkspace(workspaceId, name) {
    const cleanedName = String(name || "").trim();

    if (!cleanedName) {
      return null;
    }

    let updatedWorkspace = null;
    const workspaces = ensureWorkspaces().map((workspace) => {
      if (workspace.id !== workspaceId) {
        return workspace;
      }

      updatedWorkspace = {
        ...workspace,
        name: cleanedName,
        updatedAt: new Date().toISOString()
      };

      return updatedWorkspace;
    });

    if (!updatedWorkspace) {
      return null;
    }

    saveWorkspaces(workspaces);
    return { ...updatedWorkspace };
  }

  function duplicateWorkspace(workspaceId, name) {
    const workspaces = ensureWorkspaces();
    const sourceWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);

    if (!sourceWorkspace) {
      return null;
    }

    const cleanedName = String(name || "").trim();
    const now = new Date().toISOString();
    const duplicatedWorkspace = {
      id: createId(),
      name: cleanedName || `${sourceWorkspace.name} Copy`,
      createdAt: now,
      updatedAt: now
    };

    saveWorkspaces([...workspaces, duplicatedWorkspace]);

    copyWorkspaceScopedItems(sourceWorkspace.id, duplicatedWorkspace.id);

    localStorage.setItem(ACTIVE_WORKSPACE_KEY, duplicatedWorkspace.id);
    return { ...duplicatedWorkspace };
  }

  function deleteWorkspace(workspaceId) {
    const workspaces = ensureWorkspaces();

    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      return false;
    }

    const remainingWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId);
    SCOPED_ITEMS.forEach((item) => {
      localStorage.removeItem(scopedKey(workspaceId, item));
    });

    if (!remainingWorkspaces.length) {
      saveWorkspaces([]);
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      return true;
    }

    saveWorkspaces(remainingWorkspaces);

    if (localStorage.getItem(ACTIVE_WORKSPACE_KEY) === workspaceId) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, remainingWorkspaces[0].id);
    }

    return true;
  }

  function copyWorkspaceScopedItems(sourceWorkspaceId, destinationWorkspaceId) {
    SCOPED_ITEMS.forEach((item) => {
      const value = localStorage.getItem(scopedKey(sourceWorkspaceId, item));

      if (value === null) {
        return;
      }

      if (!WORKSPACE_ID_SCOPED_ITEMS.includes(item)) {
        localStorage.setItem(scopedKey(destinationWorkspaceId, item), value);
        return;
      }

      if (item === "projectPlanItems") {
        localStorage.setItem(
          scopedKey(destinationWorkspaceId, item),
          rewriteProjectPlanItemsWorkspaceId(value, destinationWorkspaceId)
        );
        return;
      }

      localStorage.setItem(
        scopedKey(destinationWorkspaceId, item),
        rewriteWorkspaceId(value, destinationWorkspaceId)
      );
    });
  }

  function rewriteWorkspaceId(value, workspaceId) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return JSON.stringify(
          parsed.map((item) => ({
            ...item,
            workspaceId
          }))
        );
      }

      if (parsed && typeof parsed === "object") {
        return JSON.stringify({
          ...parsed,
          workspaceId,
          updatedAt: new Date().toISOString()
        });
      }

      return value;
    } catch (error) {
      return value;
    }
  }

  function rewriteProjectPlanItemsWorkspaceId(value, workspaceId) {
    try {
      const parsed = JSON.parse(value);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return value;
      }

      return JSON.stringify({
        ...parsed,
        workspaceId,
        updatedAt: new Date().toISOString(),
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item) => ({
              ...item,
              workspaceId
            }))
          : []
      });
    } catch (error) {
      return value;
    }
  }

  function getAnswers() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return null;
    }

    return readJson(scopedKey(workspace.id, "answers"), null);
  }

  function getWorkspaceAnswers(workspaceId) {
    if (!workspaceId) {
      return null;
    }

    return readJson(scopedKey(workspaceId, "answers"), null);
  }

  function saveAnswers(answers) {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return false;
    }

    writeJson(scopedKey(workspace.id, "answers"), {
      ...answers,
      savedAt: new Date().toISOString()
    });
    touchWorkspace(workspace.id);
    return true;
  }

  function clearAnswers() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return false;
    }

    localStorage.removeItem(scopedKey(workspace.id, "answers"));
    touchWorkspace(workspace.id);
    return true;
  }

  function getReviewDecisions() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return {};
    }

    return readJson(scopedKey(workspace.id, "reviewDecisions"), {});
  }

  function getWorkspaceReviewDecisions(workspaceId) {
    if (!workspaceId) {
      return {};
    }

    return readJson(scopedKey(workspaceId, "reviewDecisions"), {});
  }

  function saveReviewDecisions(decisions) {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return false;
    }

    writeJson(scopedKey(workspace.id, "reviewDecisions"), decisions);
    touchWorkspace(workspace.id);
    return true;
  }

  function createDefaultRequirementReviewNotes(workspaceId) {
    return {
      version: REQUIREMENT_REVIEW_NOTES_VERSION,
      workspaceId,
      updatedAt: new Date().toISOString(),
      notes: {}
    };
  }

  function normalizeRequirementReviewNotes(workspaceId, reviewNotes) {
    if (!reviewNotes || typeof reviewNotes !== "object" || Array.isArray(reviewNotes)) {
      return createDefaultRequirementReviewNotes(workspaceId);
    }

    const notes = {};

    if (reviewNotes.notes && typeof reviewNotes.notes === "object" && !Array.isArray(reviewNotes.notes)) {
      Object.entries(reviewNotes.notes).forEach(([requirementId, entry]) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return;
        }

        const note = String(entry.note || "").trim();

        if (!note) {
          return;
        }

        notes[requirementId] = {
          note,
          updatedAt: entry.updatedAt || new Date().toISOString()
        };
      });
    }

    return {
      version: REQUIREMENT_REVIEW_NOTES_VERSION,
      workspaceId,
      updatedAt: reviewNotes.updatedAt || new Date().toISOString(),
      notes
    };
  }

  function getRequirementReviewNotes() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return createDefaultRequirementReviewNotes("");
    }

    return normalizeRequirementReviewNotes(
      workspace.id,
      readJson(scopedKey(workspace.id, "requirementReviewNotes"), null)
    );
  }

  function saveRequirementReviewNotes(reviewNotes) {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return null;
    }

    const normalized = normalizeRequirementReviewNotes(workspace.id, reviewNotes);

    normalized.updatedAt = new Date().toISOString();
    writeJson(scopedKey(workspace.id, "requirementReviewNotes"), normalized);
    touchWorkspace(workspace.id);
    return normalized;
  }

  function createDefaultProjectSpecificRequirements(workspaceId) {
    return {
      version: PROJECT_SPECIFIC_REQUIREMENTS_VERSION,
      workspaceId,
      updatedAt: new Date().toISOString(),
      requirements: []
    };
  }

  function normalizeProjectSpecificRequirements(workspaceId, requirementsWrapper) {
    if (!requirementsWrapper || typeof requirementsWrapper !== "object" || Array.isArray(requirementsWrapper)) {
      return createDefaultProjectSpecificRequirements(workspaceId);
    }

    return {
      version: PROJECT_SPECIFIC_REQUIREMENTS_VERSION,
      workspaceId,
      updatedAt: requirementsWrapper.updatedAt || new Date().toISOString(),
      requirements: Array.isArray(requirementsWrapper.requirements)
        ? requirementsWrapper.requirements
            .filter((requirement) => requirement && typeof requirement === "object")
            .map(normalizeProjectSpecificRequirement)
        : []
    };
  }

  function normalizeProjectSpecificRequirement(requirement) {
    const now = new Date().toISOString();

    return {
      id: String(requirement.id || `PSR-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title: String(requirement.title || ""),
      section: String(requirement.section || ""),
      category: String(requirement.category || ""),
      function: String(requirement.function || ""),
      priority: String(requirement.priority || ""),
      requirementText: String(requirement.requirementText || ""),
      rationale: String(requirement.rationale || ""),
      responseInstructions: String(requirement.responseInstructions || ""),
      sourceNote: String(requirement.sourceNote || ""),
      createdAt: requirement.createdAt || now,
      updatedAt: requirement.updatedAt || requirement.createdAt || now
    };
  }

  function getProjectSpecificRequirements() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return createDefaultProjectSpecificRequirements("");
    }

    const key = scopedKey(workspace.id, "projectSpecificRequirements");
    const savedRequirements = readJson(key, null);
    const normalized = normalizeProjectSpecificRequirements(workspace.id, savedRequirements);

    if (!savedRequirements) {
      writeJson(key, normalized);
    }

    return normalized;
  }

  function saveProjectSpecificRequirements(requirementsWrapper) {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return null;
    }

    const normalized = normalizeProjectSpecificRequirements(workspace.id, requirementsWrapper);

    normalized.updatedAt = new Date().toISOString();
    writeJson(scopedKey(workspace.id, "projectSpecificRequirements"), normalized);
    touchWorkspace(workspace.id);
    return normalized;
  }

  function getProjectRoadmapBucketCatalog() {
    return PROJECT_ROADMAP_BUCKETS.map((bucket) => ({ ...bucket }));
  }

  function getProjectRoadmapStatuses() {
    return [...PROJECT_ROADMAP_STATUSES];
  }

  function createDefaultProjectRoadmap(workspaceId) {
    const now = new Date().toISOString();
    const firstBucketId = PROJECT_ROADMAP_BUCKETS[0] ? PROJECT_ROADMAP_BUCKETS[0].id : "";

    return {
      version: PROJECT_ROADMAP_VERSION,
      workspaceId,
      currentBucketId: firstBucketId,
      updatedAt: now,
      buckets: PROJECT_ROADMAP_BUCKETS.map((bucket, index) => ({
        id: bucket.id,
        label: bucket.label,
        sortOrder: index,
        selected: bucket.id === firstBucketId,
        status: bucket.id === firstBucketId ? "not_started" : "not_applicable",
        notes: ""
      }))
    };
  }

  function getProjectRoadmap(workspaceId) {
    const workspace = workspaceId
      ? ensureWorkspaces().find((item) => item.id === workspaceId)
      : getActiveWorkspace();
    const targetWorkspaceId = workspace ? workspace.id : workspaceId;

    if (!targetWorkspaceId) {
      return createDefaultProjectRoadmap("");
    }

    const key = scopedKey(targetWorkspaceId, "projectRoadmap");
    const savedRoadmap = readJson(key, null);
    const roadmap = normalizeProjectRoadmap(targetWorkspaceId, savedRoadmap);

    if (!savedRoadmap || JSON.stringify(savedRoadmap) !== JSON.stringify(roadmap)) {
      writeJson(key, roadmap);
    }

    return roadmap;
  }

  function saveProjectRoadmap(workspaceId, roadmap) {
    if (!workspaceId) {
      return null;
    }

    const normalized = normalizeProjectRoadmap(workspaceId, roadmap);
    normalized.updatedAt = new Date().toISOString();
    writeJson(scopedKey(workspaceId, "projectRoadmap"), normalized);
    touchWorkspace(workspaceId);
    return normalized;
  }

  function createDefaultProjectPlanItems(workspaceId) {
    return {
      version: PROJECT_PLAN_ITEMS_VERSION,
      workspaceId,
      updatedAt: new Date().toISOString(),
      items: []
    };
  }

  function getProjectPlanItems(workspaceId) {
    const workspace = workspaceId
      ? ensureWorkspaces().find((item) => item.id === workspaceId)
      : getActiveWorkspace();
    const targetWorkspaceId = workspace ? workspace.id : workspaceId;

    if (!targetWorkspaceId) {
      return createDefaultProjectPlanItems("");
    }

    const key = scopedKey(targetWorkspaceId, "projectPlanItems");
    const savedItems = readJson(key, null);
    const projectPlanItems = normalizeProjectPlanItems(targetWorkspaceId, savedItems);

    if (!savedItems || JSON.stringify(savedItems) !== JSON.stringify(projectPlanItems)) {
      writeJson(key, projectPlanItems);
    }

    return projectPlanItems;
  }

  function saveProjectPlanItems(workspaceId, projectPlanItems) {
    if (!workspaceId) {
      return null;
    }

    const normalized = normalizeProjectPlanItems(workspaceId, projectPlanItems);
    normalized.updatedAt = new Date().toISOString();
    writeJson(scopedKey(workspaceId, "projectPlanItems"), normalized);
    touchWorkspace(workspaceId);
    return normalized;
  }

  function normalizeProjectPlanItems(workspaceId, projectPlanItems) {
    if (!projectPlanItems || typeof projectPlanItems !== "object" || Array.isArray(projectPlanItems)) {
      return createDefaultProjectPlanItems(workspaceId);
    }

    return {
      version: PROJECT_PLAN_ITEMS_VERSION,
      workspaceId,
      updatedAt: projectPlanItems.updatedAt || new Date().toISOString(),
      items: Array.isArray(projectPlanItems.items)
        ? projectPlanItems.items
            .filter((item) => item && typeof item === "object")
            .map((item) => normalizeProjectPlanItem(workspaceId, item))
        : []
    };
  }

  function normalizeProjectPlanItem(workspaceId, item) {
    const now = new Date().toISOString();
    const type = PROJECT_PLAN_ITEM_TYPES.includes(item.type) ? item.type : "deliverable";
    const status = PROJECT_ROADMAP_STATUSES.includes(item.status) ? item.status : "not_started";

    return {
      id: String(item.id || `plan-item-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      workspaceId,
      type,
      title: String(item.title || ""),
      roadmapBucketId: normalizeRoadmapStageId(String(item.roadmapBucketId || "")),
      owner: String(item.owner || ""),
      status,
      dueDate: String(item.dueDate || ""),
      notes: String(item.notes || ""),
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || item.createdAt || now
    };
  }

  function normalizeProjectRoadmap(workspaceId, roadmap) {
    if (!roadmap || typeof roadmap !== "object") {
      return createDefaultProjectRoadmap(workspaceId);
    }

    const catalogById = new Map(PROJECT_ROADMAP_BUCKETS.map((bucket) => [bucket.id, bucket]));
    const metadataById = createRoadmapMetadataMap();
    const savedBucketList = Array.isArray(roadmap.buckets)
      ? roadmap.buckets.filter((bucket) => bucket && bucket.id)
      : [];
    const seenBucketIds = new Set();
    const buckets = [];

    savedBucketList.forEach((savedBucket, index) => {
      const originalBucketId = String(savedBucket.id || "");
      const bucketId = normalizeRoadmapStageId(originalBucketId);

      if (!bucketId || seenBucketIds.has(bucketId)) {
        if (bucketId && seenBucketIds.has(bucketId)) {
          const existingIndex = buckets.findIndex((bucket) => bucket.id === bucketId);
          const metadata = metadataById.get(bucketId);
          const normalizedBucket = normalizeProjectRoadmapBucket(
            normalizeSavedRoadmapBucket(savedBucket, bucketId, originalBucketId, metadata),
            catalogById.get(bucketId) || metadata,
            index
          );

          if (existingIndex >= 0) {
            buckets[existingIndex] = mergeProjectRoadmapBuckets(buckets[existingIndex], normalizedBucket);
          }
        }

        return;
      }

      const catalogBucket = catalogById.get(bucketId);
      const metadata = metadataById.get(bucketId);
      buckets.push(
        normalizeProjectRoadmapBucket(
          normalizeSavedRoadmapBucket(savedBucket, bucketId, originalBucketId, metadata),
          catalogBucket || metadata,
          index
        )
      );
      seenBucketIds.add(bucketId);
    });

    PROJECT_ROADMAP_BUCKETS.forEach((catalogBucket, index) => {
      if (seenBucketIds.has(catalogBucket.id)) {
        return;
      }

      buckets.push(
        normalizeProjectRoadmapBucket(
          {
            id: catalogBucket.id,
            selected: false,
            status: "not_applicable",
            notes: ""
          },
          catalogBucket,
          buckets.length || index
        )
      );
      seenBucketIds.add(catalogBucket.id);
    });

    const inProgressBucket = buckets.find(
      (bucket) => bucket.selected && bucket.status === "in_progress"
    );
    const normalizedCurrentBucketId = normalizeRoadmapStageId(roadmap.currentBucketId);
    const selectedCurrentBucket = buckets.find(
      (bucket) => bucket.selected && bucket.id === normalizedCurrentBucketId
    );
    const firstSelectedBucket = buckets.find((bucket) => bucket.selected);

    return {
      version: PROJECT_ROADMAP_VERSION,
      workspaceId,
      currentBucketId:
        (inProgressBucket && inProgressBucket.id) ||
        (selectedCurrentBucket && selectedCurrentBucket.id) ||
        (firstSelectedBucket && firstSelectedBucket.id) ||
        "",
      updatedAt: roadmap.updatedAt || new Date().toISOString(),
      buckets
    };
  }

  function normalizeProjectRoadmapBucket(savedBucket, catalogBucket, index) {
    const selected = Boolean(savedBucket.selected);
    const savedStatus = PROJECT_ROADMAP_STATUSES.includes(savedBucket.status)
      ? savedBucket.status
      : "not_started";
    const status = selected
      ? savedStatus === "not_applicable" ? "not_started" : savedStatus
      : "not_applicable";
    const sortOrder = Number.isFinite(Number(savedBucket.sortOrder))
      ? Number(savedBucket.sortOrder)
      : index;

    return {
      id: String(savedBucket.id || (catalogBucket && catalogBucket.id) || ""),
      label: String(savedBucket.label || (catalogBucket && catalogBucket.label) || savedBucket.id || ""),
      sortOrder,
      selected,
      status,
      notes: String(savedBucket.notes || "")
    };
  }

  function createRoadmapMetadataMap() {
    const metadata = new Map();

    PROJECT_ROADMAP_BUCKETS.forEach((bucket) => {
      metadata.set(bucket.id, bucket);
    });

    Object.entries(ADDITIONAL_ROADMAP_STAGE_METADATA).forEach(([id, bucket]) => {
      metadata.set(id, {
        id,
        ...bucket
      });
    });

    return metadata;
  }

  function normalizeRoadmapStageId(stageId) {
    const id = String(stageId || "");
    return LEGACY_ROADMAP_STAGE_REMAP[id] || id;
  }

  function normalizeSavedRoadmapBucket(savedBucket, bucketId, originalBucketId, metadata) {
    const wasRemapped = originalBucketId && bucketId !== originalBucketId;

    return {
      ...savedBucket,
      id: bucketId,
      label: wasRemapped && metadata ? metadata.label : savedBucket.label,
      sortOrder: Number.isFinite(Number(savedBucket.sortOrder))
        ? Number(savedBucket.sortOrder)
        : savedBucket.sortOrder
    };
  }

  function mergeProjectRoadmapBuckets(primary, secondary) {
    const selected = Boolean(primary.selected || secondary.selected);
    const status = selected
      ? mergeRoadmapStatuses(primary.status, secondary.status)
      : "not_applicable";

    return {
      ...primary,
      selected,
      status,
      notes: mergeRoadmapNotes(primary.notes, secondary.notes)
    };
  }

  function mergeRoadmapStatuses(firstStatus, secondStatus) {
    const firstPriority = ROADMAP_STATUS_PRIORITY[firstStatus] ?? 0;
    const secondPriority = ROADMAP_STATUS_PRIORITY[secondStatus] ?? 0;
    const status = secondPriority > firstPriority ? secondStatus : firstStatus;

    return status === "not_applicable" ? "not_started" : status;
  }

  function mergeRoadmapNotes(firstNotes, secondNotes) {
    const notes = [firstNotes, secondNotes]
      .map((note) => String(note || "").trim())
      .filter(Boolean);

    if (!notes.length) {
      return "";
    }

    return [...new Set(notes)].join("\n\n---\n\n");
  }

  function getStatusLabel(status) {
    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      blocked: "Blocked",
      complete: "Complete",
      not_applicable: "Not Applicable"
    };

    return labels[status] || status;
  }

  function renderProjectRoadmapStrip() {
    const targets = document.querySelectorAll("[data-project-roadmap-strip]");

    if (!targets.length) {
      return;
    }

    const roadmap = getProjectRoadmap();
    const selectedBuckets = roadmap
      ? roadmap.buckets.filter((bucket) => bucket.selected && bucket.status !== "not_applicable")
      : [];
    const completeCount = selectedBuckets.filter((bucket) => bucket.status === "complete").length;
    const currentBucket = roadmap
      ? selectedBuckets.find((bucket) => bucket.id === roadmap.currentBucketId)
      : null;
    const currentLabel = currentBucket ? currentBucket.label : "Not set";

    targets.forEach((target) => {
      if (!selectedBuckets.length) {
        target.innerHTML = "";
        target.classList.add("hidden");
        return;
      }

      target.classList.remove("hidden");
      target.innerHTML = `
        <div class="project-roadmap-compact-header">
          <div class="project-roadmap-title-block">
            <span class="project-roadmap-heading">Project Roadmap</span>
            <span class="project-roadmap-summary">${escapeHtml(completeCount)} of ${escapeHtml(selectedBuckets.length)} complete</span>
            <span class="project-roadmap-current">Current: ${escapeHtml(currentLabel)}</span>
          </div>
          <a class="project-roadmap-manage-link" href="project-plan.html">Open Project Plan</a>
        </div>
        <div class="project-roadmap-timeline" role="list" aria-label="Selected project roadmap stages" tabindex="0">
          ${selectedBuckets
            .map((bucket) => {
              const current = bucket.id === roadmap.currentBucketId ? " current" : "";
              return `
                <div
                  class="project-roadmap-marker status-${escapeHtml(bucket.status)}${current}"
                  role="listitem"
                  title="${escapeHtml(`${bucket.label}: ${getStatusLabel(bucket.status)}`)}"
                >
                  <span class="project-roadmap-marker-dot" aria-hidden="true"></span>
                  <span class="project-roadmap-marker-label">${escapeHtml(bucket.label)}</span>
                  <span class="project-roadmap-marker-status">${escapeHtml(getStatusLabel(bucket.status))}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    });
  }

  function renderWorkflowPhaseStrip() {
    const containers = document.querySelectorAll("[data-workflow-phase-strip]");

    if (!containers.length) {
      return;
    }

    const phases = getWorkflowPhaseStatuses();

    containers.forEach((container) => {
      container.innerHTML = `
        <div class="workflow-phase-strip">
          ${phases
            .map((phase) => `
              <article class="workflow-phase-card status-${escapeHtml(phase.status)}">
                <span class="workflow-phase-name">${escapeHtml(phase.label)}</span>
                <strong>${escapeHtml(WORKFLOW_STATUS_LABELS[phase.status] || phase.status)}</strong>
                <small>${escapeHtml(phase.detail)}</small>
              </article>
            `)
            .join("")}
        </div>
      `;
    });
  }

  function getWorkflowPhaseStatuses() {
    const workspace = getActiveWorkspaceOrNull();

    if (!workspace) {
      return WORKFLOW_PHASES.map((phase) =>
        phaseStatus(phase, "not_started", "Select a workspace to begin")
      );
    }

    const workspaceId = workspace.id;
    const answers = getWorkspaceAnswers(workspaceId) || {};
    const answerCount = countMeaningfulAnswers(answers);
    const sourceDocuments = readScopedCollection(workspaceId, "clientSourceDocuments");
    const sourceSuggestions = readScopedCollection(workspaceId, "suggestedInterviewAnswers");
    const sourceQuestions = readScopedCollection(workspaceId, "openQuestions");
    const sourceRiskNotes = readScopedCollection(workspaceId, "clientRiskGapNotes");
    const publicSources = readScopedCollection(workspaceId, "publicInfoSources");
    const publicFacts = readScopedCollection(workspaceId, "publicInfoFacts");
    const publicSuggestions = readScopedCollection(workspaceId, "publicInfoSuggestions");
    const publicFollowUps = readScopedCollection(workspaceId, "publicInfoFollowUps");
    const publicRiskNotes = readScopedCollection(workspaceId, "publicInfoRiskNotes");
    const reviewDecisions = getWorkspaceReviewDecisions(workspaceId);
    const projectSpecificRequirements = readProjectSpecificRequirementCount(workspaceId);
    const projectPlan = readJson(scopedKey(workspaceId, "projectPlanItems"), null);
    const projectPlanItems = projectPlan && Array.isArray(projectPlan.items) ? projectPlan.items : [];
    const roadmap = readJson(scopedKey(workspaceId, "projectRoadmap"), null);
    const selectedRoadmapCount = roadmap && Array.isArray(roadmap.buckets)
      ? roadmap.buckets.filter((bucket) => bucket.selected).length
      : 0;
    const pendingSourceSuggestions = sourceSuggestions.filter((item) => item.status === "pending_review").length;
    const openSourceQuestions = sourceQuestions.filter((item) => isOpenStatus(item.status)).length;
    const openSourceRisks = sourceRiskNotes.filter(isOpenRiskRecord).length;
    const publicRecordCount = publicSources.length + publicFacts.length + publicSuggestions.length + publicFollowUps.length + publicRiskNotes.length;
    const pendingPublicItems = countPendingPublicItems(publicFacts, publicSuggestions, publicFollowUps, publicRiskNotes);
    const decisionValues = Object.values(reviewDecisions || {});
    const explicitDecisions = decisionValues.filter(Boolean).length;
    const requirementsNeedingReview = decisionValues.filter((decision) => decision === "revise" || decision === "clarify").length;
    const blockedPlanItems = projectPlanItems.filter((item) => item.status === "blocked").length;
    const reviewAttentionCount = pendingSourceSuggestions + openSourceQuestions + openSourceRisks + pendingPublicItems + requirementsNeedingReview + blockedPlanItems;
    const hasRequirementsWork = explicitDecisions > 0 || projectSpecificRequirements > 0;

    return WORKFLOW_PHASES.map((phase) => {
      if (phase.id === "setup") {
        if (projectPlanItems.length || selectedRoadmapCount > 1) {
          return phaseStatus(phase, "ready", "Workspace and plan started");
        }

        return phaseStatus(phase, "in_progress", "Workspace is active");
      }

      if (phase.id === "intake") {
        if (pendingSourceSuggestions) {
          return phaseStatus(phase, "needs_attention", `${pendingSourceSuggestions} source suggestion${pendingSourceSuggestions === 1 ? "" : "s"} pending`);
        }

        if (answerCount && sourceDocuments.length) {
          return phaseStatus(phase, "ready", `${answerCount} answers, ${sourceDocuments.length} source${sourceDocuments.length === 1 ? "" : "s"}`);
        }

        if (answerCount || sourceDocuments.length) {
          return phaseStatus(phase, "in_progress", `${answerCount} answers, ${sourceDocuments.length} source${sourceDocuments.length === 1 ? "" : "s"}`);
        }

        return phaseStatus(phase, "not_started", "No intake captured");
      }

      if (phase.id === "research") {
        if (pendingPublicItems) {
          return phaseStatus(phase, "needs_attention", `${pendingPublicItems} public research item${pendingPublicItems === 1 ? "" : "s"} pending`);
        }

        if (publicRecordCount) {
          return phaseStatus(phase, "ready", `${publicRecordCount} public record${publicRecordCount === 1 ? "" : "s"}`);
        }

        return phaseStatus(phase, "not_started", "No public research imported");
      }

      if (phase.id === "requirements") {
        if (requirementsNeedingReview) {
          return phaseStatus(phase, "needs_attention", `${requirementsNeedingReview} requirement${requirementsNeedingReview === 1 ? "" : "s"} need review`);
        }

        if (hasRequirementsWork) {
          return phaseStatus(phase, "ready", `${explicitDecisions} decision${explicitDecisions === 1 ? "" : "s"} recorded`);
        }

        return phaseStatus(phase, "not_started", "No requirement decisions yet");
      }

      if (phase.id === "review") {
        if (reviewAttentionCount) {
          return phaseStatus(phase, "needs_attention", `${reviewAttentionCount} item${reviewAttentionCount === 1 ? "" : "s"} need attention`);
        }

        if (hasRequirementsWork || publicRecordCount || sourceDocuments.length) {
          return phaseStatus(phase, "ready", "No open review signals");
        }

        return phaseStatus(phase, "not_started", "No review items yet");
      }

      if (phase.id === "delivery") {
        if (hasRequirementsWork && !requirementsNeedingReview) {
          return phaseStatus(phase, "ready", "Requirements export can be prepared");
        }

        if (hasRequirementsWork) {
          return phaseStatus(phase, "in_progress", "Resolve review items first");
        }

        return phaseStatus(phase, "not_started", "No delivery output yet");
      }

      return phaseStatus(phase, "not_started", "");
    });
  }

  function phaseStatus(phase, status, detail) {
    return {
      ...phase,
      status,
      detail
    };
  }

  function readScopedCollection(workspaceId, item) {
    const value = readJson(scopedKey(workspaceId, item), []);
    return Array.isArray(value) ? value : [];
  }

  function readProjectSpecificRequirementCount(workspaceId) {
    const wrapper = readJson(scopedKey(workspaceId, "projectSpecificRequirements"), null);
    return wrapper && Array.isArray(wrapper.requirements) ? wrapper.requirements.length : 0;
  }

  function countMeaningfulAnswers(answers) {
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

  function countPendingPublicItems(facts, suggestions, followUps, riskNotes) {
    return facts.filter((item) => (item.reviewStatus || item.status || "pending") === "pending").length +
      suggestions.filter((item) => item.status === "pending_review").length +
      followUps.filter((item) => isOpenStatus(item.status)).length +
      riskNotes.filter(isOpenRiskRecord).length;
  }

  function isOpenStatus(status) {
    return (status || "open") === "open";
  }

  function isOpenRiskRecord(record) {
    const status = record.status || "open";
    return status !== "dismissed" &&
      status !== "addressed" &&
      status !== "converted_to_follow_up" &&
      status !== "accepted" &&
      status !== "rejected";
  }

  function getExportFileName() {
    return buildRequirementsExportFileName("Requirements Review - Selected Requirements", "txt");
  }

  function getRequirementsMatrixExportFileName() {
    return buildRequirementsExportFileName("Requirements Matrix", "csv");
  }

  function getRequirementsReviewBriefFileName() {
    return buildRequirementsExportFileName("Requirements Review Brief", "md");
  }

  function getEnhancedRequirementsMatrixExportFileName() {
    return buildRequirementsExportFileName("Enhanced Requirements Matrix", "csv");
  }

  function buildRequirementsExportFileName(outputLabel, extension) {
    const workspace = getActiveWorkspaceOrNull();
    const workspaceName = sanitizeExportFileNamePart(workspace?.name, "Untitled Workspace");
    const label = sanitizeExportFileNamePart(outputLabel, "Selected Requirements");
    const dateStamp = formatExportDateStamp(new Date());
    const safeExtension = String(extension || "txt").replace(/[^a-z0-9]/gi, "").toLowerCase() || "txt";

    return `Procurement Workbench - ${workspaceName} - ${label} - ${dateStamp}.${safeExtension}`;
  }

  function formatExportDateStamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function sanitizeExportFileNamePart(value, fallback) {
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

  function renderWorkspaceControls() {
    const select = document.getElementById("workspace-select");
    const createButton = document.getElementById("workspace-create");
    const nameTarget = document.getElementById("workspace-current-name");

    if (!select) {
      return;
    }

    const workspaces = ensureWorkspaces();
    const activeWorkspace = getActiveWorkspaceOrNull();

    select.innerHTML = [
      `<option value="" ${activeWorkspace ? "" : "selected"}>No workspace selected</option>`,
      ...workspaces.map((workspace) => {
        const selected = activeWorkspace && workspace.id === activeWorkspace.id ? "selected" : "";
        return `<option value="${escapeHtml(workspace.id)}" ${selected}>${escapeHtml(workspace.name)}</option>`;
      })
    ].join("");

    if (nameTarget) {
      nameTarget.textContent = activeWorkspace ? activeWorkspace.name : "No workspace selected";
    }

    select.onchange = () => {
      setActiveWorkspace(select.value);
      window.location.reload();
    };

    if (createButton) {
      createButton.onclick = () => {
        openCreateWorkspaceModal({ redirectTo: "interview.html" });
      };
    }
  }

  function openCreateWorkspaceModal(options = {}) {
    const modal = ensureCreateWorkspaceModal();
    const input = modal.querySelector("#create-workspace-name");
    const error = modal.querySelector("#create-workspace-error");

    createWorkspaceModalState.onCreated = typeof options.onCreated === "function" ? options.onCreated : null;
    createWorkspaceModalState.redirectTo = options.redirectTo || "";
    createWorkspaceModalState.lastFocusedElement = document.activeElement;

    input.value = "";
    error.textContent = "";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => input.focus(), 0);
  }

  function ensureCreateWorkspaceModal() {
    let modal = document.getElementById("create-workspace-modal");

    if (modal) {
      return modal;
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div id="create-workspace-modal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" aria-describedby="create-workspace-help" aria-hidden="true">
          <div class="modal-panel create-workspace-modal-panel">
            <form id="create-workspace-form" novalidate>
              <div class="modal-header">
                <div>
                  <p class="section-kicker">Client / Project Workspace</p>
                  <h2 id="create-workspace-title">Create Client / Project Workspace</h2>
                  <p id="create-workspace-help">Create a workspace to begin intake, research, requirements review, and project planning.</p>
                </div>
                <button type="button" class="modal-close-button" data-create-workspace-cancel aria-label="Cancel">&times;</button>
              </div>
              <label class="field-label" for="create-workspace-name">
                <span>Workspace Name</span>
                <input id="create-workspace-name" type="text" autocomplete="off" />
              </label>
              <p id="create-workspace-error" class="status-message modal-validation-message" aria-live="polite"></p>
              <div class="form-actions modal-actions">
                <button type="submit" class="button primary">Create Workspace</button>
                <button type="button" class="button secondary" data-create-workspace-cancel>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      `
    );

    modal = document.getElementById("create-workspace-modal");
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-create-workspace-cancel]")) {
        closeCreateWorkspaceModal();
      }
    });

    modal.querySelector("#create-workspace-form").addEventListener("submit", handleCreateWorkspaceSubmit);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        closeCreateWorkspaceModal();
      }
    });

    return modal;
  }

  function handleCreateWorkspaceSubmit(event) {
    event.preventDefault();

    const modal = document.getElementById("create-workspace-modal");
    const input = modal.querySelector("#create-workspace-name");
    const error = modal.querySelector("#create-workspace-error");
    const workspaceName = input.value.trim();

    if (!workspaceName) {
      error.textContent = "Workspace name is required.";
      input.focus();
      return;
    }

    const workspace = createWorkspace(workspaceName);
    const onCreated = createWorkspaceModalState.onCreated;
    const redirectTo = createWorkspaceModalState.redirectTo;

    closeCreateWorkspaceModal({ restoreFocus: false });

    if (onCreated) {
      onCreated(workspace);
    }

    if (redirectTo) {
      window.location.href = redirectTo;
    }
  }

  function closeCreateWorkspaceModal(options = {}) {
    const modal = document.getElementById("create-workspace-modal");

    if (!modal) {
      return;
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    createWorkspaceModalState.onCreated = null;
    createWorkspaceModalState.redirectTo = "";

    if (options.restoreFocus !== false && createWorkspaceModalState.lastFocusedElement?.focus) {
      createWorkspaceModalState.lastFocusedElement.focus();
    }

    createWorkspaceModalState.lastFocusedElement = null;
  }

  function renderNoActiveWorkspaceState() {
    if (getActiveWorkspaceOrNull()) {
      return;
    }

    const pageName = window.location.pathname.split("/").pop() || "index.html";
    const managementPages = new Set([
      "index.html",
      "",
      "workspace-management.html",
      "default-profiles.html",
      "requirements-library-manager.html",
      "staged-review.html"
    ]);

    if (managementPages.has(pageName)) {
      return;
    }

    const main = document.querySelector("main.page-shell");

    if (!main || main.querySelector(".no-active-workspace-panel")) {
      return;
    }

    main.classList.add("no-active-workspace-shell");
    main.insertAdjacentHTML(
      "afterbegin",
      `
        <section class="context-panel no-active-workspace-panel">
          <div>
            <p class="section-kicker">Client / Project Workspace</p>
            <h2>No workspace selected</h2>
            <p>Select or create a workspace to begin intake, research, requirements review, and project planning.</p>
          </div>
          <div class="no-active-workspace-actions">
            <a class="button primary" href="index.html">Go to Home</a>
            <a class="button secondary" href="workspace-management.html">Open / Manage Workspaces</a>
          </div>
        </section>
      `
    );
  }

  function isSidebarCollapsed() {
    return false;
  }

  function hydrateSidebarNavigationLabels() {
    document.querySelectorAll(".app-sidebar .nav-link").forEach((link) => {
      const title = link.querySelector(".nav-title");
      const label = title ? title.textContent.trim() : link.textContent.trim();

      if (!label) {
        return;
      }

      link.setAttribute("title", label);
      link.setAttribute("aria-label", label);
    });
  }

  function applySidebarCollapsedState(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);

    const toggle = document.getElementById("sidebar-toggle");

    if (!toggle) {
      return;
    }

    const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
    const text = toggle.querySelector(".sidebar-toggle-text");
    const icon = toggle.querySelector(".sidebar-toggle-icon");

    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);

    if (text) {
      text.textContent = collapsed ? "Expand" : "Collapse";
    }

    if (icon) {
      icon.textContent = collapsed ? ">>" : "<<";
    }
  }

  function renderSidebarControls() {
    hydrateSidebarNavigationLabels();
    renderSidebarSectionControls();

    const toggle = document.getElementById("sidebar-toggle");

    applySidebarCollapsedState(isSidebarCollapsed());

    if (!toggle) {
      return;
    }

    toggle.onclick = () => {
      const collapsed = !document.body.classList.contains("sidebar-collapsed");
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
      applySidebarCollapsedState(collapsed);
    };
  }

  function getSidebarSectionState() {
    return readJson(SIDEBAR_SECTION_STATE_KEY, {});
  }

  function saveSidebarSectionState(state) {
    writeJson(SIDEBAR_SECTION_STATE_KEY, state);
  }

  function getSidebarSections() {
    const configuredSections = Array.from(document.querySelectorAll(".app-sidebar [data-sidebar-section-key]"))
      .map((container) => ({
        key: container.getAttribute("data-sidebar-section-key"),
        container,
        extraContent: []
      }))
      .filter((section) => section.key && section.container);

    if (configuredSections.length) {
      return configuredSections;
    }

    return [
      {
        key: "workspace",
        container: document.querySelector(".sidebar-context"),
        extraContent: []
      },
      {
        key: "workflow",
        container: document.querySelector(".app-nav"),
        extraContent: []
      },
      {
        key: "admin",
        container: document.querySelector(".sidebar-admin"),
        extraContent: []
      }
    ].filter((section) => section.container);
  }

  function renderSidebarSectionControls() {
    const state = getSidebarSectionState();

    getSidebarSections().forEach((section) => {
      const label = section.container.querySelector(".sidebar-group-label");

      if (!label) {
        return;
      }

      const storedState = state[section.key];
      const expanded = storedState === undefined ? true : storedState !== false;

      label.setAttribute("role", "button");
      label.setAttribute("tabindex", "0");
      label.setAttribute("aria-controls", `sidebar-section-${section.key}`);
      label.classList.add("sidebar-section-toggle");
      section.container.setAttribute("data-sidebar-section", section.key);
      section.container.setAttribute("id", `sidebar-section-${section.key}`);

      applySidebarSectionState(section, expanded);

      label.onclick = () => {
        const nextExpanded = section.container.classList.contains("sidebar-section-collapsed");
        const nextState = {
          ...getSidebarSectionState(),
          [section.key]: nextExpanded
        };

        saveSidebarSectionState(nextState);
        applySidebarSectionState(section, nextExpanded);
      };

      label.onkeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        label.click();
      };
    });
  }

  function applySidebarSectionState(section, expanded) {
    const label = section.container.querySelector(".sidebar-group-label");

    section.container.classList.toggle("sidebar-section-collapsed", !expanded);
    section.container.setAttribute("aria-expanded", String(expanded));

    if (label) {
      label.setAttribute("aria-expanded", String(expanded));
    }

    section.extraContent.filter(Boolean).forEach((element) => {
      element.hidden = !expanded;
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.RfpWorkspaces = {
    clearAnswers,
    createWorkspace,
    deleteWorkspace,
    duplicateWorkspace,
    ensureWorkspaces,
    getActiveWorkspace,
    getActiveWorkspaceOrNull,
    getAnswers,
    getExportFileName,
    getRequirementsMatrixExportFileName,
    getRequirementsReviewBriefFileName,
    getEnhancedRequirementsMatrixExportFileName,
    getProjectRoadmap,
    getProjectRoadmapBucketCatalog,
    getProjectRoadmapStatuses,
    getProjectPlanItems,
    getProjectSpecificRequirements,
    getRequirementReviewNotes,
    getReviewDecisions,
    getWorkspaceAnswers,
    getWorkspaceReviewDecisions,
    listWorkspaces,
    openCreateWorkspaceModal,
    renameWorkspace,
    saveProjectRoadmap,
    saveProjectPlanItems,
    saveProjectSpecificRequirements,
    saveRequirementReviewNotes,
    renderProjectRoadmapStrip,
    renderWorkflowPhaseStrip,
    renderWorkspaceControls,
    renderSidebarControls,
    saveAnswers,
    saveReviewDecisions,
    setActiveWorkspace
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderWorkspaceControls();
    renderNoActiveWorkspaceState();
    renderSidebarControls();
    renderProjectRoadmapStrip();
    renderWorkflowPhaseStrip();
  });
})();


