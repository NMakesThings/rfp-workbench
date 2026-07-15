(function () {
  const TEMPLATES_URL = "data/project-plan-templates.json";
  const SORT_KEY_PREFIX = "rfpWorkspace:";
  const SORT_KEY_SUFFIX = ":projectPlanSort";
  const ITEM_TYPES = [
    ["deliverable", "Deliverable"],
    ["checkpoint", "Checkpoint"],
    ["decision", "Decision"],
    ["dependency", "Dependency"],
    ["risk", "Risk / Blocker"]
  ];
  const TYPE_LABELS = Object.fromEntries(ITEM_TYPES);
  const STATUS_LABELS = {
    not_started: "Not Started",
    in_progress: "In Progress",
    blocked: "Blocked",
    complete: "Complete",
    not_applicable: "Not Applicable"
  };
  const ALLOWED_TYPES = new Set(ITEM_TYPES.map(([value]) => value));
  const ALLOWED_STATUSES = new Set(Object.keys(STATUS_LABELS));
  const ALLOWED_OWNERS = new Set(["MCP", "Client", "Joint", "TBD"]);
  const SORT_FIELDS = new Set(["default", "type", "title", "status", "phase", "owner", "dueDate"]);
  const SORT_DIRECTIONS = new Set(["asc", "desc"]);
  const DEFAULT_ROADMAP_STAGE_IDS = new Set(["setup", "initiation_setup"]);

  const elements = {};
  let templates = [];
  let templateStageLookup = new Map();

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindElements();

    if (!window.RfpWorkspaces) {
      renderUnavailable();
      return;
    }

    bindEvents();
    await loadTemplates();
    render();
  }

  function bindElements() {
    elements.summary = document.getElementById("project-plan-summary");
    elements.currentStage = document.getElementById("project-current-stage");
    elements.roadmapSummary = document.getElementById("project-plan-roadmap-summary");
    elements.roadmapEditor = document.getElementById("project-plan-roadmap-editor");
    elements.roadmapStatus = document.getElementById("project-plan-roadmap-status");
    elements.templatePanel = document.getElementById("project-template-panel");
    elements.form = document.getElementById("project-plan-item-form");
    elements.itemId = document.getElementById("plan-item-id");
    elements.type = document.getElementById("plan-item-type");
    elements.title = document.getElementById("plan-item-title");
    elements.roadmapBucket = document.getElementById("plan-item-roadmap-bucket");
    elements.owner = document.getElementById("plan-item-owner");
    elements.status = document.getElementById("plan-item-status");
    elements.dueDate = document.getElementById("plan-item-due-date");
    elements.notes = document.getElementById("plan-item-notes");
    elements.reset = document.getElementById("plan-item-reset");
    elements.save = document.getElementById("plan-item-save");
    elements.itemStatus = document.getElementById("project-plan-item-status");
    elements.sortField = document.getElementById("project-plan-sort-field");
    elements.sortDirection = document.getElementById("project-plan-sort-direction");
    elements.itemsList = document.getElementById("project-plan-items-list");
    elements.deliverables = document.getElementById("project-plan-deliverables");
    elements.decisions = document.getElementById("project-plan-decisions");
    elements.dependencies = document.getElementById("project-plan-dependencies");
    elements.risks = document.getElementById("project-plan-risks");
    elements.checkpoints = document.getElementById("project-plan-checkpoints");
  }

  function bindEvents() {
    if (elements.roadmapEditor) {
      elements.roadmapEditor.addEventListener("change", handleRoadmapChange);
    }

    if (elements.form) {
      elements.form.addEventListener("submit", handleItemSubmit);
    }

    if (elements.reset) {
      elements.reset.addEventListener("click", resetForm);
    }

    if (elements.itemsList) {
      elements.itemsList.addEventListener("click", handleItemAction);
    }

    getFocusedViewTargets().forEach((target) => {
      target.addEventListener("click", handleItemAction);
    });

    if (elements.sortField) {
      elements.sortField.addEventListener("change", handleSortChange);
    }

    if (elements.sortDirection) {
      elements.sortDirection.addEventListener("change", handleSortChange);
    }

    if (elements.templatePanel) {
      elements.templatePanel.addEventListener("click", handleTemplateAction);
    }
  }

  function getFocusedViewTargets() {
    return [
      elements.deliverables,
      elements.decisions,
      elements.dependencies,
      elements.risks,
      elements.checkpoints
    ].filter(Boolean);
  }

  function render() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const roadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const plan = window.RfpWorkspaces.getProjectPlanItems(workspace.id);

    renderSummary(workspace, roadmap, plan);
    renderCurrentStage(roadmap);
    renderRoadmapEditor(roadmap);
    renderFormOptions(roadmap, plan);
    renderTemplatePanel(plan, roadmap);
    renderSortControls(workspace.id);
    renderItems(plan.items, roadmap, workspace.id);
    renderFocusedViews(plan.items, roadmap);
  }

  async function loadTemplates() {
    try {
      const response = await fetch(TEMPLATES_URL);

      if (!response.ok) {
        throw new Error(`Template load failed: ${response.status}`);
      }

      const data = await response.json();
      templates = Array.isArray(data.templates)
        ? data.templates.map(normalizeTemplate).filter(Boolean)
        : [];
      rebuildTemplateStageLookup();
    } catch (error) {
      templates = [];
      templateStageLookup = new Map();
    }
  }

  function normalizeTemplate(template) {
    if (!template || !template.id || !template.name) {
      return null;
    }

    return {
      id: String(template.id),
      name: String(template.name),
      description: String(template.description || ""),
      engagementType: String(template.engagementType || ""),
      roadmapStages: Array.isArray(template.roadmapStages)
        ? template.roadmapStages.map(normalizeTemplateStage).filter(Boolean)
        : [],
      projectPlanItems: Array.isArray(template.projectPlanItems)
        ? template.projectPlanItems.map(normalizeTemplateItem).filter(Boolean)
        : []
    };
  }

  function normalizeTemplateStage(stage) {
    if (!stage || !stage.id || !stage.label) {
      return null;
    }

    return {
      id: String(stage.id),
      label: String(stage.label),
      description: String(stage.description || "")
    };
  }

  function normalizeTemplateItem(item) {
    if (!item || !item.title) {
      return null;
    }

    const type = ALLOWED_TYPES.has(item.type) ? item.type : "";

    if (!type) {
      return null;
    }

    return {
      type,
      title: String(item.title),
      roadmapBucketId: String(item.roadmapBucketId || ""),
      owner: ALLOWED_OWNERS.has(item.owner) ? item.owner : "TBD",
      status: ALLOWED_STATUSES.has(item.status) ? item.status : "not_started",
      notes: String(item.notes || "")
    };
  }

  function rebuildTemplateStageLookup() {
    templateStageLookup = new Map();
    templates.forEach((template) => {
      template.roadmapStages.forEach((stage) => {
        if (!templateStageLookup.has(stage.id)) {
          templateStageLookup.set(stage.id, {
            ...stage,
            templateId: template.id
          });
        }
      });
    });
  }

  function renderSummary(workspace, roadmap, plan) {
    const selectedBuckets = getSelectedBuckets(roadmap);
    const completeCount = selectedBuckets.filter((bucket) => bucket.status === "complete").length;
    const blockedCount = selectedBuckets.filter((bucket) => bucket.status === "blocked").length;
    const currentBucket = getCurrentBucket(roadmap);
    const lastUpdated = latestDate([workspace.updatedAt, roadmap.updatedAt, plan.updatedAt]);

    elements.summary.innerHTML = `
      <div>
        <p class="section-kicker">Active workspace</p>
        <h2>${escapeHtml(workspace.name)}</h2>
        <p>
          Current stage: <strong>${escapeHtml(currentBucket ? currentBucket.label : "Not set")}</strong>.
          ${escapeHtml(selectedBuckets.length)} selected stage${selectedBuckets.length === 1 ? "" : "s"},
          ${escapeHtml(completeCount)} complete, ${escapeHtml(blockedCount)} blocked.
        </p>
      </div>
      <dl class="project-plan-summary-grid">
        ${renderSummaryMetric("Selected stages", selectedBuckets.length)}
        ${renderSummaryMetric("Complete", completeCount)}
        ${renderSummaryMetric("Blocked", blockedCount)}
        ${renderSummaryMetric("Plan items", plan.items.length)}
        ${renderSummaryMetric("Last updated", formatDateTime(lastUpdated))}
      </dl>
    `;
  }

  function renderSummaryMetric(label, value) {
    return `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `;
  }

  function renderCurrentStage(roadmap) {
    const currentBucket = getCurrentBucket(roadmap);

    if (!currentBucket) {
      elements.currentStage.innerHTML = `
        <p class="section-kicker">Current stage</p>
        <h2>Not set</h2>
        <p>Select at least one roadmap stage to set the current project stage.</p>
      `;
      return;
    }

    elements.currentStage.innerHTML = `
      <p class="section-kicker">Current stage</p>
      <h2>${escapeHtml(currentBucket.label)}</h2>
      <div class="staged-badge-row">
        <span class="staged-badge status-${escapeHtml(currentBucket.status)}">${escapeHtml(formatStatus(currentBucket.status))}</span>
      </div>
      <p>${escapeHtml(currentBucket.notes || "No notes recorded for the current stage.")}</p>
    `;
  }

  function renderRoadmapEditor(roadmap) {
    const selectedBuckets = getSelectedBuckets(roadmap);
    const completeCount = selectedBuckets.filter((bucket) => bucket.status === "complete").length;
    const currentBucket = getCurrentBucket(roadmap);
    const visibleBuckets = getActiveRoadmapBuckets(roadmap);

    elements.roadmapSummary.classList.add("project-roadmap-editor-summary");
    elements.roadmapSummary.innerHTML = `
      <span><strong>${escapeHtml(selectedBuckets.length)}</strong> selected</span>
      <span><strong>${escapeHtml(completeCount)}</strong> complete</span>
      <span><strong>Current:</strong> ${escapeHtml(currentBucket ? currentBucket.label : "Not set")}</span>
    `;

    if (!visibleBuckets.length) {
      elements.roadmapEditor.innerHTML = `
        <p class="staged-muted">
          No active roadmap stages are selected. Use Clients & Workspaces to configure the roadmap.
        </p>
      `;
      return;
    }

    elements.roadmapEditor.innerHTML = `
      <div class="project-roadmap-editor-table" role="table" aria-label="Editable project roadmap buckets">
        <div class="project-roadmap-editor-heading" role="row">
          <span>Stage</span>
          <span>Status</span>
          <span>Notes</span>
        </div>
        <div class="project-roadmap-editor-list" role="rowgroup">
          ${visibleBuckets.map(renderRoadmapBucketEditor).join("")}
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

  function renderTemplatePanel(plan, roadmap) {
    if (!elements.templatePanel) {
      return;
    }

    if (plan.items.length) {
      elements.templatePanel.classList.add("hidden");
      elements.templatePanel.innerHTML = "";
      return;
    }

    elements.templatePanel.classList.remove("hidden");
    const canApplyRoadmap = isDefaultOrUnconfiguredRoadmap(roadmap);
    const roadmapOptionMarkup = canApplyRoadmap
      ? `
        <label class="project-template-roadmap-option">
          <input
            type="checkbox"
            id="project-template-apply-roadmap"
            checked
          />
          <span>
            <strong>Apply template roadmap stages</strong>
            <small>Recommended for new workspaces. Existing customized roadmaps will not be overwritten automatically.</small>
          </span>
        </label>
      `
      : `
        <div class="project-template-roadmap-option project-template-roadmap-protected" role="note">
          <span>
            <strong>Customized roadmap protected</strong>
            <small>This workspace already has customized roadmap stages. Loading a starter template will add plan items only; roadmap stages will not be overwritten automatically.</small>
          </span>
        </div>
      `;

    if (!templates.length) {
      elements.templatePanel.innerHTML = `
        <div class="project-template-panel-header">
          <div>
            <p class="section-kicker">Optional starter</p>
            <h3>Start from a template</h3>
            <p>Starter templates could not be loaded. You can still add plan items manually.</p>
          </div>
        </div>
      `;
      return;
    }

    elements.templatePanel.innerHTML = `
      <div class="project-template-panel-header">
        <div>
          <p class="section-kicker">Optional starter</p>
          <h3>Start from a template</h3>
          <p>
            Starter templates can add project plan items and, for new workspaces,
            apply matching roadmap stages.
          </p>
        </div>
      </div>
      ${roadmapOptionMarkup}
      <div class="project-template-grid">
        ${templates.map(renderTemplateCard).join("")}
      </div>
    `;
  }

  function renderTemplateCard(template) {
    const visibleStages = template.roadmapStages.slice(0, 6);
    const remainingStageCount = Math.max(template.roadmapStages.length - visibleStages.length, 0);

    return `
      <article class="project-template-card">
        <div>
          <h4>${escapeHtml(template.name)}</h4>
          <p>${escapeHtml(template.description)}</p>
          <div class="project-template-meta">
            <span>${escapeHtml(template.projectPlanItems.length)} starter items</span>
            <span>${escapeHtml(template.roadmapStages.length)} roadmap stages</span>
          </div>
        </div>
        <div class="project-template-stages" aria-label="${escapeHtml(template.name)} main stages">
          ${visibleStages.map((stage) => `<span>${escapeHtml(stage.label)}</span>`).join("")}
          ${remainingStageCount ? `<span>+${escapeHtml(remainingStageCount)} more</span>` : ""}
        </div>
        <button
          type="button"
          class="button secondary"
          data-template-load="${escapeHtml(template.id)}"
        >
          Load Starter Plan
        </button>
      </article>
    `;
  }

  function handleTemplateAction(event) {
    const button = event.target.closest("[data-template-load]");

    if (!button) {
      return;
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const plan = window.RfpWorkspaces.getProjectPlanItems(workspace.id);

    if (plan.items.length) {
      setItemStatus("Starter templates are available only when the project plan has no items.", true);
      render();
      return;
    }

    const templateId = button.getAttribute("data-template-load");
    const template = templates.find((candidate) => candidate.id === templateId);

    if (!template) {
      setItemStatus("Template not found.", true);
      return;
    }

    const now = new Date().toISOString();
    const roadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const applyRoadmapControl = document.getElementById("project-template-apply-roadmap");
    const shouldApplyRoadmap =
      Boolean(applyRoadmapControl && applyRoadmapControl.checked) &&
      isDefaultOrUnconfiguredRoadmap(roadmap) &&
      template.roadmapStages.length > 0;
    const nextItems = template.projectPlanItems.map((item) => createProjectPlanItemFromTemplate(item, workspace.id, now));

    if (shouldApplyRoadmap) {
      window.RfpWorkspaces.saveProjectRoadmap(
        workspace.id,
        createProjectRoadmapFromTemplate(template, workspace.id, now)
      );
    }

    window.RfpWorkspaces.saveProjectPlanItems(workspace.id, {
      ...plan,
      workspaceId: workspace.id,
      updatedAt: now,
      items: nextItems
    });

    resetForm();
    setItemStatus(
      shouldApplyRoadmap
        ? `${template.name} starter plan loaded with ${nextItems.length} items and ${template.roadmapStages.length} roadmap stages.`
        : `${template.name} starter plan loaded with ${nextItems.length} items. Roadmap stages were not changed.`,
      false
    );
    render();
  }

  function isDefaultOrUnconfiguredRoadmap(roadmap) {
    if (!roadmap || !Array.isArray(roadmap.buckets) || !roadmap.buckets.length) {
      return true;
    }

    const hasNonDefaultSelected = roadmap.buckets.some(
      (bucket) => !DEFAULT_ROADMAP_STAGE_IDS.has(bucket.id) && bucket.selected && bucket.status !== "not_applicable"
    );
    const hasNotes = roadmap.buckets.some((bucket) => String(bucket.notes || "").trim());
    const hasMeaningfulStatus = roadmap.buckets.some((bucket) =>
      ["in_progress", "blocked", "complete"].includes(bucket.status)
    );
    const hasCustomCurrentBucket =
      roadmap.currentBucketId && !DEFAULT_ROADMAP_STAGE_IDS.has(roadmap.currentBucketId);

    return !hasNonDefaultSelected && !hasNotes && !hasMeaningfulStatus && !hasCustomCurrentBucket;
  }

  function createProjectRoadmapFromTemplate(template, workspaceId, timestamp) {
    const seenStageIds = new Set();
    const buckets = template.roadmapStages
      .filter((stage) => {
        if (!stage.id || seenStageIds.has(stage.id)) {
          return false;
        }

        seenStageIds.add(stage.id);
        return true;
      })
      .map((stage, index) => ({
        id: stage.id,
        label: stage.label,
        sortOrder: index,
        selected: true,
        status: "not_started",
        notes: ""
      }));

    return {
      version: 1,
      workspaceId,
      currentBucketId: buckets.length ? buckets[0].id : "",
      updatedAt: timestamp,
      buckets
    };
  }

  function createProjectPlanItemFromTemplate(item, workspaceId, timestamp) {
    return {
      id: createId(),
      workspaceId,
      type: ALLOWED_TYPES.has(item.type) ? item.type : "checkpoint",
      title: item.title,
      roadmapBucketId: item.roadmapBucketId,
      owner: ALLOWED_OWNERS.has(item.owner) ? item.owner : "TBD",
      status: ALLOWED_STATUSES.has(item.status) ? item.status : "not_started",
      dueDate: "",
      notes: item.notes,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function handleRoadmapChange() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const currentRoadmap = window.RfpWorkspaces.getProjectRoadmap(workspace.id);
    const bucketRows = Array.from(elements.roadmapEditor.querySelectorAll("[data-roadmap-bucket-id]"));
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
    const nextRoadmap = {
      ...currentRoadmap,
      currentBucketId: getNextCurrentBucketId(nextBuckets, currentRoadmap.currentBucketId),
      buckets: nextBuckets
    };

    window.RfpWorkspaces.saveProjectRoadmap(workspace.id, nextRoadmap);
    setRoadmapStatus("Roadmap saved.", false);
    render();
    window.RfpWorkspaces.renderProjectRoadmapStrip();
  }

  function getNextCurrentBucketId(buckets, currentBucketId) {
    const firstInProgress = buckets.find(
      (bucket) => bucket.selected && bucket.status === "in_progress"
    );
    const previousCurrent = buckets.find(
      (bucket) => bucket.selected && bucket.id === currentBucketId
    );
    const firstSelected = buckets.find((bucket) => bucket.selected);

    return (
      (firstInProgress && firstInProgress.id) ||
      (previousCurrent && previousCurrent.id) ||
      (firstSelected && firstSelected.id) ||
      ""
    );
  }

  function renderFormOptions(roadmap, plan) {
    const phaseOptions = getPhaseOptions(roadmap, plan);
    elements.type.innerHTML = ITEM_TYPES
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join("");
    elements.status.innerHTML = window.RfpWorkspaces
      .getProjectRoadmapStatuses()
      .map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(formatStatus(status))}</option>`)
      .join("");
    elements.roadmapBucket.innerHTML = [
      '<option value="">Unlinked</option>',
      ...phaseOptions.map((option) => {
        const suffix = option.source === "template" ? " (template)" : "";
        return `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label + suffix)}</option>`;
      })
    ].join("");
  }

  function getPhaseOptions(roadmap, plan) {
    const options = roadmap.buckets
      .filter((bucket) => bucket.selected && bucket.status !== "not_applicable")
      .map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        source: "roadmap"
      }));
    const usedIds = new Set(options.map((option) => option.id));
    const linkedTemplateStageIds = new Set(
      (plan.items || [])
        .map((item) => item.roadmapBucketId)
        .filter((id) => id && templateStageLookup.has(id))
    );

    templateStageLookup.forEach((stage, id) => {
      if (!usedIds.has(id) && linkedTemplateStageIds.has(id)) {
        options.push({
          id,
          label: stage.label,
          source: "template"
        });
      }
    });

    return options;
  }

  function renderSortControls(workspaceId) {
    if (!elements.sortField || !elements.sortDirection) {
      return;
    }

    const preference = getSortPreference(workspaceId);
    elements.sortField.value = preference.field;
    elements.sortDirection.value = preference.direction;
    elements.sortDirection.disabled = preference.field === "default";
  }

  function handleSortChange() {
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const field = elements.sortField && SORT_FIELDS.has(elements.sortField.value)
      ? elements.sortField.value
      : "default";
    const direction = elements.sortDirection && SORT_DIRECTIONS.has(elements.sortDirection.value)
      ? elements.sortDirection.value
      : "asc";

    saveSortPreference(workspace.id, {
      field,
      direction
    });
    render();
  }

  function getSortPreference(workspaceId) {
    try {
      const rawPreference = window.localStorage.getItem(getSortPreferenceKey(workspaceId));
      const preference = rawPreference ? JSON.parse(rawPreference) : {};
      const field = SORT_FIELDS.has(preference.field) ? preference.field : "default";
      const direction = SORT_DIRECTIONS.has(preference.direction) ? preference.direction : "asc";

      return { field, direction };
    } catch (error) {
      return {
        field: "default",
        direction: "asc"
      };
    }
  }

  function saveSortPreference(workspaceId, preference) {
    try {
      window.localStorage.setItem(getSortPreferenceKey(workspaceId), JSON.stringify(preference));
    } catch (error) {
      // Sorting is display-only; ignore storage failures and keep rendering.
    }
  }

  function getSortPreferenceKey(workspaceId) {
    return `${SORT_KEY_PREFIX}${workspaceId}${SORT_KEY_SUFFIX}`;
  }

  function handleItemSubmit(event) {
    event.preventDefault();

    const title = elements.title.value.trim();

    if (!title) {
      setItemStatus("Enter a title before saving.", true);
      elements.title.focus();
      return;
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const plan = window.RfpWorkspaces.getProjectPlanItems(workspace.id);
    const now = new Date().toISOString();
    const itemId = elements.itemId.value;
    const existingItem = plan.items.find((item) => item.id === itemId);
    const nextItem = {
      id: itemId || createId(),
      workspaceId: workspace.id,
      type: elements.type.value,
      title,
      roadmapBucketId: elements.roadmapBucket.value,
      owner: elements.owner.value.trim(),
      status: elements.status.value,
      dueDate: elements.dueDate.value,
      notes: elements.notes.value.trim(),
      createdAt: existingItem ? existingItem.createdAt : now,
      updatedAt: now
    };
    const nextItems = existingItem
      ? plan.items.map((item) => item.id === itemId ? nextItem : item)
      : [nextItem, ...plan.items];

    window.RfpWorkspaces.saveProjectPlanItems(workspace.id, {
      ...plan,
      items: nextItems
    });
    resetForm();
    setItemStatus(existingItem ? "Plan item saved." : "Plan item added.", false);
    render();
  }

  function handleItemAction(event) {
    const button = event.target.closest("[data-plan-action]");

    if (!button) {
      return;
    }

    const itemId = button.getAttribute("data-plan-item-id");
    const action = button.getAttribute("data-plan-action");
    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    const plan = window.RfpWorkspaces.getProjectPlanItems(workspace.id);
    const item = plan.items.find((planItem) => planItem.id === itemId);

    if (!item) {
      return;
    }

    if (action === "edit") {
      editItem(item);
    } else if (action === "delete") {
      deleteItem(plan, item);
    }
  }

  function editItem(item) {
    elements.itemId.value = item.id;
    elements.type.value = item.type;
    elements.title.value = item.title;
    elements.roadmapBucket.value = item.roadmapBucketId;
    elements.owner.value = item.owner;
    elements.status.value = item.status;
    elements.dueDate.value = item.dueDate;
    elements.notes.value = item.notes;
    elements.save.textContent = "Save Plan Item";
    setItemStatus("Editing plan item.", false);
    if (elements.form && typeof elements.form.scrollIntoView === "function") {
      elements.form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
    elements.title.focus();
  }

  function deleteItem(plan, item) {
    const confirmed = window.confirm(`Delete "${item.title}" from the project plan?`);

    if (!confirmed) {
      return;
    }

    const workspace = window.RfpWorkspaces.getActiveWorkspace();
    window.RfpWorkspaces.saveProjectPlanItems(workspace.id, {
      ...plan,
      items: plan.items.filter((planItem) => planItem.id !== item.id)
    });
    resetForm();
    setItemStatus("Plan item deleted.", false);
    render();
  }

  function resetForm() {
    elements.itemId.value = "";
    elements.form.reset();
    elements.save.textContent = "Add Plan Item";
  }

  function renderItems(items, roadmap, workspaceId) {
    const sortedItems = sortItems(items, roadmap, workspaceId);

    if (!sortedItems.length) {
      elements.itemsList.innerHTML = '<p class="staged-muted">No project plan items yet. Add a deliverable, checkpoint, decision, dependency, or risk above.</p>';
      return;
    }

    elements.itemsList.innerHTML = sortedItems.map((item) => renderPlanItem(item, roadmap, "full")).join("");
  }

  function renderFocusedViews(items, roadmap) {
    renderFocusedList(elements.deliverables, items.filter((item) => item.type === "deliverable"), roadmap, "No key deliverables recorded yet.");
    renderFocusedList(elements.decisions, items.filter((item) => item.type === "decision"), roadmap, "No client decisions recorded yet.");
    renderFocusedList(elements.dependencies, items.filter((item) => item.type === "dependency"), roadmap, "No open dependencies recorded yet.");
    renderFocusedList(elements.risks, items.filter((item) => item.type === "risk"), roadmap, "No risks or blockers recorded yet.");
    renderFocusedList(
      elements.checkpoints,
      items.filter((item) => item.type === "checkpoint").sort(sortByDueDateThenUpdated),
      roadmap,
      "No upcoming checkpoints recorded yet."
    );
  }

  function renderFocusedList(target, items, roadmap, emptyMessage) {
    if (!target) {
      return;
    }

    if (!items.length) {
      target.innerHTML = `<p class="staged-muted">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    target.innerHTML = items.slice(0, 6).map((item) => renderPlanItem(item, roadmap, "edit")).join("");
  }

  function renderPlanItem(item, roadmap, actionMode) {
    const resolvedActionMode = actionMode === true ? "full" : actionMode || "none";
    const phaseLabel = getPhaseLabel(item.roadmapBucketId, roadmap);
    const dueText = item.dueDate ? formatDate(item.dueDate) : "No due date";
    const ownerText = item.owner || "Unassigned";

    return `
      <article class="project-plan-item-card status-${escapeHtml(item.status)} type-${escapeHtml(item.type)}">
        <div>
          <div class="staged-badge-row">
            <span class="staged-badge">${escapeHtml(TYPE_LABELS[item.type] || formatDisplayLabel(item.type))}</span>
            <span class="staged-badge ${item.status === "blocked" ? "staged-badge-warning" : ""}">${escapeHtml(formatStatus(item.status))}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
          <dl class="review-queue-meta">
            ${renderMetaRow("Phase", phaseLabel)}
            ${renderMetaRow("Owner", ownerText)}
            ${renderMetaRow("Due date", dueText)}
          </dl>
        </div>
        ${resolvedActionMode !== "none" ? `
          <div class="review-action-stack">
            <button type="button" class="button secondary" data-plan-action="edit" data-plan-item-id="${escapeHtml(item.id)}">Edit</button>
            ${resolvedActionMode === "full" ? `<button type="button" class="button secondary button-danger" data-plan-action="delete" data-plan-item-id="${escapeHtml(item.id)}">Delete</button>` : ""}
          </div>
        ` : ""}
      </article>
    `;
  }

  function getPhaseLabel(roadmapBucketId, roadmap) {
    if (!roadmapBucketId) {
      return "Unlinked";
    }

    const bucket = roadmap.buckets.find((roadmapBucket) => roadmapBucket.id === roadmapBucketId);

    if (bucket) {
      return bucket.label;
    }

    const templateStage = templateStageLookup.get(roadmapBucketId);

    return templateStage ? templateStage.label : "Unmapped stage";
  }

  function renderMetaRow(label, value) {
    return `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value || "Not set")}</dd>
      </div>
    `;
  }

  function getSelectedBuckets(roadmap) {
    return roadmap.buckets.filter(
      (bucket) => bucket.selected && bucket.status !== "not_applicable"
    );
  }

  function getActiveRoadmapBuckets(roadmap) {
    return getSelectedBuckets(roadmap);
  }

  function getCurrentBucket(roadmap) {
    return getSelectedBuckets(roadmap).find((bucket) => bucket.id === roadmap.currentBucketId);
  }

  function sortItems(items, roadmap, workspaceId) {
    const preference = getSortPreference(workspaceId);

    if (preference.field !== "default") {
      return [...items].sort((a, b) => compareItemsByPreference(a, b, roadmap, preference));
    }

    return [...items].sort((a, b) => {
      const statusDelta = statusRank(a.status) - statusRank(b.status);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return sortByDueDateThenUpdated(a, b);
    });
  }

  function compareItemsByPreference(a, b, roadmap, preference) {
    const direction = preference.direction === "desc" ? -1 : 1;
    let delta = 0;

    if (preference.field === "type") {
      delta = compareText(TYPE_LABELS[a.type] || a.type, TYPE_LABELS[b.type] || b.type);
    } else if (preference.field === "title") {
      delta = compareText(a.title, b.title);
    } else if (preference.field === "status") {
      delta = statusRank(a.status) - statusRank(b.status);
    } else if (preference.field === "phase") {
      delta = compareText(getPhaseLabel(a.roadmapBucketId, roadmap), getPhaseLabel(b.roadmapBucketId, roadmap));
    } else if (preference.field === "owner") {
      delta = compareText(a.owner || "Unassigned", b.owner || "Unassigned");
    } else if (preference.field === "dueDate") {
      return compareDueDateValues(a.dueDate, b.dueDate, preference.direction) || compareText(a.title, b.title);
    }

    if (delta !== 0) {
      return delta * direction;
    }

    return compareText(a.title, b.title) || sortByDueDateThenUpdated(a, b);
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      sensitivity: "base",
      numeric: true
    });
  }

  function compareDueDateValues(a, b, direction) {
    const aMissing = !a;
    const bMissing = !b;

    if (aMissing !== bMissing) {
      return aMissing ? 1 : -1;
    }

    if (aMissing && bMissing) {
      return 0;
    }

    const delta = dueTime(a) - dueTime(b);
    return direction === "desc" ? delta * -1 : delta;
  }

  function sortByDueDateThenUpdated(a, b) {
    const aDue = dueTime(a.dueDate);
    const bDue = dueTime(b.dueDate);

    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt);
  }

  function statusRank(status) {
    const ranks = {
      blocked: 0,
      in_progress: 1,
      not_started: 2,
      complete: 3,
      not_applicable: 4
    };

    return ranks[status] ?? 5;
  }

  function dueTime(value) {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const time = Date.parse(value);
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  }

  function latestDate(values) {
    const latest = values
      .map(getTime)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    return latest ? new Date(latest).toISOString() : "";
  }

  function getTime(value) {
    const time = Date.parse(value || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function createId() {
    if (window.crypto && crypto.randomUUID) {
      return `plan-item-${crypto.randomUUID()}`;
    }

    return `plan-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatStatus(status) {
    return STATUS_LABELS[status] || formatDisplayLabel(status);
  }

  function formatDateTime(value) {
    if (!value) {
      return "Not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatDate(value) {
    if (!value) {
      return "No due date";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDisplayLabel(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bRfp\b/g, "RFP");
  }

  function setRoadmapStatus(message, isError) {
    if (!elements.roadmapStatus) {
      return;
    }

    elements.roadmapStatus.textContent = message;
    elements.roadmapStatus.classList.toggle("error", Boolean(isError));
  }

  function setItemStatus(message, isError) {
    if (!elements.itemStatus) {
      return;
    }

    elements.itemStatus.textContent = message;
    elements.itemStatus.classList.toggle("error", Boolean(isError));
  }

  function renderUnavailable() {
    if (elements.summary) {
      elements.summary.innerHTML = '<h2>Project plan unavailable</h2><p>Workspace storage could not be initialized.</p>';
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
