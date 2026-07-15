(function () {
  const TAXONOMY_URL = "data/justice-taxonomy.json";

  const FIELD_LABELS = {
    justice_domain: "Justice domain",
    system_type: "System type",
    procurement_type: "Procurement type",
    client_type: "Client type"
  };
  const WORKSPACE_COLLECTIONS = {
    suggestions: "suggestedInterviewAnswers",
    questions: "openQuestions",
    riskNotes: "clientRiskGapNotes",
    publicFacts: "publicInfoFacts",
    publicSuggestions: "publicInfoSuggestions",
    publicFollowUps: "publicInfoFollowUps",
    publicRiskNotes: "publicInfoRiskNotes",
    reviewDecisions: "reviewDecisions",
    projectPlanItems: "projectPlanItems"
  };

  const taxonomyLookups = {
    justice_domain: new Map(),
    system_type: new Map(),
    procurement_type: new Map(),
    client_type: new Map()
  };
  const workspaceFilterState = {
    query: "",
    sort: "active_updated"
  };

  let listRoot;
  let summary;
  let emptyState;
  let filterEmptyState;
  let searchInput;
  let sortSelect;
  let roadmapEditor;
  let roadmapSummary;
  let roadmapStatus;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    listRoot = document.getElementById("workspace-management-list");
    summary = document.getElementById("workspace-management-summary");
    emptyState = document.getElementById("workspace-empty-state");
    filterEmptyState = document.getElementById("workspace-filter-empty-state");
    searchInput = document.getElementById("workspace-search");
    sortSelect = document.getElementById("workspace-sort");
    roadmapEditor = document.getElementById("project-roadmap-editor");
    roadmapSummary = document.getElementById("project-roadmap-summary");
    roadmapStatus = document.getElementById("project-roadmap-status");

    if (!window.RfpWorkspaces) {
      renderError("Workspace storage is unavailable.");
      return;
    }

    await loadTaxonomy();
    bindActions();
    renderWorkspaces();
    renderProjectRoadmapEditor();
  }

  async function loadTaxonomy() {
    try {
      const response = await fetch(TAXONOMY_URL);

      if (!response.ok) {
        return;
      }

      const taxonomy = await response.json();
      setLookup("justice_domain", taxonomy.domains);
      setLookup("system_type", taxonomy.systemTypes);
      setLookup("procurement_type", taxonomy.procurementTypes);
      setLookup("client_type", taxonomy.clientTypes);
    } catch (error) {
      // Raw saved values are still useful if the taxonomy cannot be loaded.
    }
  }

  function setLookup(fieldId, options) {
    taxonomyLookups[fieldId] = new Map(
      (options || []).map((option) => [option.id, option.label])
    );
  }

  function bindActions() {
    listRoot.addEventListener("click", handleWorkspaceAction);

    document
      .getElementById("workspace-management-create")
      .addEventListener("click", createWorkspace);

    document
      .getElementById("workspace-empty-create")
      .addEventListener("click", createWorkspace);

    if (roadmapEditor) {
      roadmapEditor.addEventListener("change", handleRoadmapChange);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        workspaceFilterState.query = searchInput.value.trim().toLowerCase();
        renderWorkspaces();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        workspaceFilterState.sort = sortSelect.value;
        renderWorkspaces();
      });
    }
  }

  function renderWorkspaces() {
    const workspaces = window.RfpWorkspaces.listWorkspaces();
    const activeWorkspace = window.RfpWorkspaces.getActiveWorkspace();
    const workspaceModels = workspaces.map((workspace) => buildWorkspaceModel(workspace, activeWorkspace));
    const filteredModels = sortWorkspaceModels(
      filterWorkspaceModels(workspaceModels),
      workspaceFilterState.sort
    );

    if (!workspaces.length) {
      summary.textContent = "No saved workspaces found.";
      emptyState.classList.remove("hidden");
      if (filterEmptyState) {
        filterEmptyState.classList.add("hidden");
      }
      listRoot.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");
    if (!filteredModels.length) {
      summary.textContent = `${workspaces.length} saved workspace${workspaces.length === 1 ? "" : "s"} in this browser; none match the current search.`;
      if (filterEmptyState) {
        filterEmptyState.classList.remove("hidden");
      }
      listRoot.innerHTML = "";
      return;
    }

    if (filterEmptyState) {
      filterEmptyState.classList.add("hidden");
    }

    summary.textContent = `${filteredModels.length} of ${workspaces.length} saved workspace${workspaces.length === 1 ? "" : "s"} shown.`;
    listRoot.innerHTML = filteredModels
      .map((model) => renderWorkspaceCard(model))
      .join("");
  }

  function buildWorkspaceModel(workspace, activeWorkspace) {
    const answers = window.RfpWorkspaces.getWorkspaceAnswers(workspace.id) || {};
    const roadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const roadmapSummary = summarizeRoadmap(roadmap);
    const currentPhase = getCurrentRoadmapPhase(roadmap);
    const answerCount = countSavedAnswers(answers);
    const openReviewItems = countOpenReviewItems(workspace.id);
    const projectPlanSummary = summarizeProjectPlan(workspace.id);
    const procurementType = labelFor("procurement_type", answers.procurement_type);
    const justiceDomain = labelFor("justice_domain", answers.justice_domain);
    const systemType = labelFor("system_type", answers.system_type);
    const projectClientName = answers.project_name || workspace.name;
    const updatedAt = workspace.updatedAt || answers.savedAt || "";
    const createdAt = workspace.createdAt || "";

    return {
      workspace,
      isActive: Boolean(activeWorkspace && activeWorkspace.id === workspace.id),
      answers,
      answerCount,
      roadmapSummary,
      currentPhase,
      openReviewItems,
      projectPlanSummary,
      procurementType,
      justiceDomain,
      systemType,
      projectClientName,
      updatedAt,
      createdAt,
      searchText: [
        workspace.name,
        projectClientName,
        procurementType,
        justiceDomain,
        systemType,
        roadmapSummary,
        currentPhase,
        openReviewItems ? "open review items" : "no open review items"
      ].join(" ").toLowerCase()
    };
  }

  function renderWorkspaceCard(model) {
    const workspace = model.workspace;
    const profileItems = [
      ["Project/client name", model.projectClientName],
      [FIELD_LABELS.justice_domain, model.justiceDomain],
      [FIELD_LABELS.system_type, model.systemType],
      [FIELD_LABELS.procurement_type, model.procurementType],
      ["Current phase", model.currentPhase],
      ["Roadmap", model.roadmapSummary],
      ["Review items", model.openReviewItems ? `${model.openReviewItems} open` : "No open review items"],
      ["Plan items", model.projectPlanSummary],
      ["Last updated", formatDate(model.updatedAt)],
      ["Created", formatDate(model.createdAt)],
      ["Saved answers", String(model.answerCount)]
    ];
    const activeBadge =
      model.isActive
        ? '<span class="workspace-status-badge">Active</span>'
        : "";

    return `
      <article class="workspace-card" data-workspace-id="${escapeHtml(workspace.id)}">
        <div class="workspace-card-header">
          <div>
            <p class="section-kicker">Client workspace</p>
            <h2>${escapeHtml(workspace.name)} ${activeBadge}</h2>
          </div>
          <div class="workspace-card-actions" aria-label="Workspace actions">
            <button type="button" class="button primary" data-action="open">Open / Continue</button>
            <button type="button" class="button secondary" data-action="rename">Rename</button>
            <button type="button" class="button secondary" data-action="duplicate">Duplicate</button>
            <button type="button" class="button secondary button-danger" data-action="delete">Delete</button>
          </div>
        </div>

        <div class="workspace-profile-grid">
          ${profileItems.map(renderProfileItem).join("")}
        </div>
      </article>
    `;
  }

  function filterWorkspaceModels(models) {
    if (!workspaceFilterState.query) {
      return models;
    }

    return models.filter((model) => model.searchText.includes(workspaceFilterState.query));
  }

  function sortWorkspaceModels(models, sortMode) {
    const sorted = [...models];

    sorted.sort((a, b) => {
      if (sortMode === "active_updated") {
        const activeDelta = Number(b.isActive) - Number(a.isActive);

        if (activeDelta !== 0) {
          return activeDelta;
        }

        return compareDateDesc(a.updatedAt, b.updatedAt) || compareText(a.workspace.name, b.workspace.name);
      }

      if (sortMode === "updated_desc") {
        return compareDateDesc(a.updatedAt, b.updatedAt) || compareText(a.workspace.name, b.workspace.name);
      }

      if (sortMode === "created_desc") {
        return compareDateDesc(a.createdAt, b.createdAt) || compareText(a.workspace.name, b.workspace.name);
      }

      if (sortMode === "name_desc") {
        return compareText(b.workspace.name, a.workspace.name);
      }

      if (sortMode === "procurement_asc") {
        return compareText(a.procurementType, b.procurementType) || compareText(a.workspace.name, b.workspace.name);
      }

      if (sortMode === "domain_asc") {
        return compareText(a.justiceDomain, b.justiceDomain) || compareText(a.workspace.name, b.workspace.name);
      }

      return compareText(a.workspace.name, b.workspace.name);
    });

    return sorted;
  }

  function summarizeRoadmap(roadmap) {
    if (!roadmap || !Array.isArray(roadmap.buckets)) {
      return "Setup only";
    }

    const selected = roadmap.buckets.filter(
      (bucket) => bucket.selected && bucket.status !== "not_applicable"
    );
    const current = selected.find((bucket) => bucket.id === roadmap.currentBucketId);

    if (!selected.length) {
      return "No active buckets";
    }

    return current
      ? `${selected.length} bucket${selected.length === 1 ? "" : "s"}; current: ${current.label}`
      : `${selected.length} bucket${selected.length === 1 ? "" : "s"} selected`;
  }

  function getCurrentRoadmapPhase(roadmap) {
    if (!roadmap || !Array.isArray(roadmap.buckets)) {
      return "Not set";
    }

    const current = roadmap.buckets.find(
      (bucket) => bucket.selected && bucket.id === roadmap.currentBucketId
    );
    const firstActive = roadmap.buckets.find(
      (bucket) => bucket.selected && bucket.status !== "not_applicable"
    );

    return current?.label || firstActive?.label || "Not set";
  }

  function countOpenReviewItems(workspaceId) {
    const reviewDecisions = readWorkspaceJson(workspaceId, WORKSPACE_COLLECTIONS.reviewDecisions, {});
    const requirementsNeedingReview = Object.values(reviewDecisions || {})
      .filter((decision) => decision === "revise" || decision === "clarify")
      .length;
    const sourceSuggestions = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.suggestions)
      .filter((item) => item.status === "pending_review")
      .length;
    const sourceQuestions = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.questions)
      .filter((item) => (item.status || "open") === "open")
      .length;
    const sourceRisks = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.riskNotes)
      .filter(isOpenRiskNote)
      .length;
    const publicFacts = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.publicFacts)
      .filter((item) => (item.reviewStatus || item.status || "pending") === "pending")
      .length;
    const publicSuggestions = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.publicSuggestions)
      .filter((item) => item.status === "pending_review")
      .length;
    const publicFollowUps = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.publicFollowUps)
      .filter((item) => (item.status || "open") === "open")
      .length;
    const publicRisks = readWorkspaceArray(workspaceId, WORKSPACE_COLLECTIONS.publicRiskNotes)
      .filter(isOpenRiskNote)
      .length;

    return requirementsNeedingReview +
      sourceSuggestions +
      sourceQuestions +
      sourceRisks +
      publicFacts +
      publicSuggestions +
      publicFollowUps +
      publicRisks;
  }

  function summarizeProjectPlan(workspaceId) {
    const wrapper = readWorkspaceJson(workspaceId, WORKSPACE_COLLECTIONS.projectPlanItems, null);
    const items = wrapper && Array.isArray(wrapper.items) ? wrapper.items : [];
    const blockedCount = items.filter((item) => item.status === "blocked").length;

    if (!items.length) {
      return "No plan items";
    }

    if (blockedCount) {
      return `${items.length} item${items.length === 1 ? "" : "s"}; ${blockedCount} blocked`;
    }

    return `${items.length} item${items.length === 1 ? "" : "s"}`;
  }

  function readWorkspaceArray(workspaceId, collection) {
    const value = readWorkspaceJson(workspaceId, collection, []);
    return Array.isArray(value) ? value : [];
  }

  function readWorkspaceJson(workspaceId, collection, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`rfpWorkspace:${workspaceId}:${collection}`)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function isOpenRiskNote(note) {
    const status = note.status || "open";
    return !["dismissed", "addressed", "resolved", "closed", "complete", "completed", "converted_to_follow_up"].includes(status);
  }

  function renderProjectRoadmapEditor() {
    if (!roadmapEditor) {
      return;
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const roadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const selectedCount = roadmap.buckets.filter(
      (bucket) => bucket.selected && bucket.status !== "not_applicable"
    ).length;
    const completeCount = roadmap.buckets.filter(
      (bucket) => bucket.selected && bucket.status === "complete"
    ).length;
    const currentBucket = roadmap.buckets.find((bucket) => bucket.id === roadmap.currentBucketId);

    if (roadmapSummary) {
      roadmapSummary.classList.add("project-roadmap-editor-summary");
      roadmapSummary.innerHTML = `
        <span><strong>${escapeHtml(selectedCount)}</strong> selected</span>
        <span><strong>${escapeHtml(completeCount)}</strong> complete</span>
        <span><strong>Current:</strong> ${escapeHtml(currentBucket ? currentBucket.label : "Not set")}</span>
      `;
    }

    roadmapEditor.innerHTML = `
      <div class="project-roadmap-editor-table" role="table" aria-label="Editable project roadmap buckets">
        <div class="project-roadmap-editor-heading" role="row">
          <span>Bucket</span>
          <span>Status</span>
          <span>Notes</span>
        </div>
        <div class="project-roadmap-editor-list" role="rowgroup">
        ${roadmap.buckets.map(renderRoadmapBucketEditor).join("")}
        </div>
      </div>
    `;
  }

  function renderRoadmapBucketEditor(bucket) {
    const statuses = bucket.selected
      ? window.RfpWorkspaces
          .getProjectRoadmapStatuses()
          .filter((status) => status !== "not_applicable")
      : ["not_applicable"];
    const statusOptions = statuses
      .map((status) => {
        const selected = bucket.status === status ? "selected" : "";
        return `<option value="${escapeHtml(status)}" ${selected}>${escapeHtml(formatStatus(status))}</option>`;
      })
      .join("");
    const disabled = bucket.selected ? "" : "disabled";
    const selectedClass = bucket.selected ? " is-selected" : " is-unselected";
    const currentClass = bucket.status === "in_progress" ? " is-current" : "";

    return `
      <article
        class="project-roadmap-editor-row status-${escapeHtml(bucket.status)}${selectedClass}${currentClass}"
        data-roadmap-bucket-id="${escapeHtml(bucket.id)}"
        role="row"
      >
        <label class="project-roadmap-bucket-toggle">
          <input
            type="checkbox"
            data-roadmap-field="selected"
            ${bucket.selected ? "checked" : ""}
          />
          <span>
            <strong>${escapeHtml(bucket.label)}</strong>
            <small>${escapeHtml(bucket.selected ? "Included" : "Not applicable")}</small>
          </span>
        </label>
        <label class="project-roadmap-status-control">
          <span>Status</span>
          <select data-roadmap-field="status" ${disabled}>
            ${statusOptions}
          </select>
        </label>
        <label class="project-roadmap-notes-control">
          <span>Notes</span>
          <textarea data-roadmap-field="notes" rows="2" ${disabled}>${escapeHtml(bucket.notes || "")}</textarea>
        </label>
      </article>
    `;
  }

  function handleRoadmapChange() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const currentRoadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const bucketRows = Array.from(roadmapEditor.querySelectorAll("[data-roadmap-bucket-id]"));
    const nextBuckets = currentRoadmap.buckets.map((bucket) => {
      const row = bucketRows.find((item) => item.getAttribute("data-roadmap-bucket-id") === bucket.id);

      if (!row) {
        return bucket;
      }

      const selectedControl = row.querySelector('[data-roadmap-field="selected"]');
      const statusControl = row.querySelector('[data-roadmap-field="status"]');
      const notesControl = row.querySelector('[data-roadmap-field="notes"]');
      const selected = Boolean(selectedControl && selectedControl.checked);
      const statusValue = statusControl && statusControl.value;
      const status = selected
        ? statusValue && statusValue !== "not_applicable" ? statusValue : "not_started"
        : "not_applicable";

      return {
        ...bucket,
        selected,
        status,
        notes: notesControl ? notesControl.value.trim() : ""
      };
    });
    const firstInProgress = nextBuckets.find(
      (bucket) => bucket.selected && bucket.status === "in_progress"
    );
    const previousCurrent = nextBuckets.find(
      (bucket) => bucket.selected && bucket.id === currentRoadmap.currentBucketId
    );
    const firstSelected = nextBuckets.find((bucket) => bucket.selected);
    const nextRoadmap = {
      ...currentRoadmap,
      currentBucketId:
        (firstInProgress && firstInProgress.id) ||
        (previousCurrent && previousCurrent.id) ||
        (firstSelected && firstSelected.id) ||
        "",
      buckets: nextBuckets
    };

    window.RfpWorkspaces.saveProjectRoadmap(workspace.id, nextRoadmap);
    setRoadmapStatus("Roadmap saved.", false);
    renderProjectRoadmapEditor();
    renderWorkspaces();
  }

  function renderProfileItem([label, value]) {
    return `
      <div class="profile-item">
        <span class="profile-label">${escapeHtml(label)}</span>
        <span class="profile-value">${escapeHtml(value || "Not selected")}</span>
      </div>
    `;
  }

  function handleWorkspaceAction(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const card = button.closest("[data-workspace-id]");
    const workspaceId = card ? card.getAttribute("data-workspace-id") : "";
    const workspace = window.RfpWorkspaces
      .listWorkspaces()
      .find((item) => item.id === workspaceId);

    if (!workspace) {
      return;
    }

    const action = button.getAttribute("data-action");

    if (action === "open") {
      openWorkspace(workspace);
    } else if (action === "rename") {
      renameWorkspace(workspace);
    } else if (action === "duplicate") {
      duplicateWorkspace(workspace);
    } else if (action === "delete") {
      deleteWorkspace(workspace);
    }
  }

  function openWorkspace(workspace) {
    window.RfpWorkspaces.setActiveWorkspace(workspace.id);
    window.location.href = "interview.html";
  }

  function renameWorkspace(workspace) {
    const nextName = window.prompt("Rename workspace", workspace.name);

    if (nextName === null) {
      return;
    }

    const renamed = window.RfpWorkspaces.renameWorkspace(workspace.id, nextName);

    if (!renamed) {
      window.alert("Enter a workspace name before saving.");
      return;
    }

    refreshWorkspaceViews();
  }

  function duplicateWorkspace(workspace) {
    const defaultName = `${workspace.name} Copy`;
    const duplicateName = window.prompt("Duplicate workspace as", defaultName);

    if (duplicateName === null) {
      return;
    }

    const duplicated = window.RfpWorkspaces.duplicateWorkspace(workspace.id, duplicateName);

    if (!duplicated) {
      window.alert("The workspace could not be duplicated.");
      return;
    }

    refreshWorkspaceViews();
  }

  function deleteWorkspace(workspace) {
    const confirmed = window.confirm(
      `Delete "${workspace.name}"? This removes its saved answers and review decisions from this browser.`
    );

    if (!confirmed) {
      return;
    }

    window.RfpWorkspaces.deleteWorkspace(workspace.id);
    refreshWorkspaceViews();
  }

  function createWorkspace() {
    window.RfpWorkspaces.openCreateWorkspaceModal({
      onCreated: refreshWorkspaceViews
    });
  }

  function refreshWorkspaceViews() {
    renderWorkspaces();
    renderProjectRoadmapEditor();
    window.RfpWorkspaces.renderWorkspaceControls();
    window.RfpWorkspaces.renderProjectRoadmapStrip();
  }

  function countSavedAnswers(answers) {
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

  function labelFor(fieldId, value) {
    if (!value) {
      return "Not set";
    }

    const lookup = taxonomyLookups[fieldId] || new Map();
    return lookup.get(value) || value;
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

  function compareDateDesc(a, b) {
    return dateValue(b) - dateValue(a);
  }

  function dateValue(value) {
    const timestamp = Date.parse(value || "");
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      sensitivity: "base",
      numeric: true
    });
  }

  function formatStatus(status) {
    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      blocked: "Blocked",
      complete: "Complete",
      not_applicable: "Not Applicable"
    };

    return labels[status] || status;
  }

  function setRoadmapStatus(message, isError) {
    if (!roadmapStatus) {
      return;
    }

    roadmapStatus.textContent = message;
    roadmapStatus.classList.toggle("error", Boolean(isError));
  }

  function renderError(message) {
    if (summary) {
      summary.textContent = message;
    }

    if (listRoot) {
      listRoot.innerHTML = `<section class="empty-state"><h2>Unable to load workspaces</h2><p>${escapeHtml(message)}</p></section>`;
    }
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
