(function () {
  const PAGE_VERSION = "data-health-v1";
  const WORKSPACES_KEY = "rfpClientWorkspaces";
  const ACTIVE_WORKSPACE_KEY = "rfpActiveClientWorkspaceId";
  const WORKSPACE_KEY_PATTERN = /^rfpWorkspace:([^:]+):(.+)$/;
  const SIDEBAR_SECTION_STATE_KEY = "rfpSidebarSectionState";
  const LARGE_STORAGE_REVIEW_BYTES = 2 * 1024 * 1024;
  const LARGE_STORAGE_WARNING_BYTES = 4 * 1024 * 1024;

  const GLOBAL_KEY_DEFINITIONS = new Map([
    [WORKSPACES_KEY, { category: "workspace registry", json: true }],
    [ACTIVE_WORKSPACE_KEY, { category: "active workspace", json: false }],
    ["rfpInterviewAnswers", { category: "legacy intake answers", json: true }],
    ["rfpRequirementReviewDecisions", { category: "legacy review decisions", json: true }],
    ["rfpSidebarCollapsed", { category: "display preference", json: false }],
    ["rfpSidebarSectionState", { category: "display preference", json: true }],
    ["rfpDefaultProfiles", { category: "default profiles", json: true }],
    ["rfpDefaultProfilesStarterSeed:v1", { category: "default profile seed marker", json: false }],
    ["rfpRequirementsLibraryEdits", { category: "requirements library overlay", json: true }],
    ["rfpRequirementsLibraryAdds", { category: "requirements library overlay", json: true }],
    ["rfpRequirementsLibraryRetirements", { category: "requirements library overlay", json: true }],
    ["rfpStagedReviewEdits:court-cms-functional-pilot", { category: "content staging overlay", json: true }]
  ]);

  const SCOPED_KEY_DEFINITIONS = new Map([
    ["answers", { category: "project intake", json: true }],
    ["reviewDecisions", { category: "requirements review decisions", json: true }],
    ["requirementReviewNotes", { category: "requirements review notes", json: true }],
    ["projectSpecificRequirements", { category: "project-specific requirements", json: true }],
    ["clientSourceDocuments", { category: "client source intake", json: true }],
    ["extractedClientFacts", { category: "client source intake", json: true }],
    ["suggestedInterviewAnswers", { category: "source suggestions", json: true }],
    ["openQuestions", { category: "source follow-ups", json: true }],
    ["clientRiskGapNotes", { category: "source risks", json: true }],
    ["publicInfoSources", { category: "public research", json: true }],
    ["publicInfoFacts", { category: "public research", json: true }],
    ["publicInfoSuggestions", { category: "public research", json: true }],
    ["publicInfoFollowUps", { category: "public research", json: true }],
    ["publicInfoRiskNotes", { category: "public research", json: true }],
    ["publicInfoDisplayState", { category: "public research display state", json: true }],
    ["projectRoadmap", { category: "project roadmap", json: true }],
    ["projectPlanItems", { category: "project plan", json: true }],
    ["projectPlanSort", { category: "project plan display preference", json: true }]
  ]);

  const VALID_REQUIREMENT_DECISIONS = new Set(["include", "exclude", "revise", "clarify", "no_decision"]);
  const VALID_PUBLIC_STATUSES = new Set([
    "pending",
    "pending_review",
    "accepted",
    "rejected",
    "dismissed",
    "addressed",
    "resolved",
    "processed",
    "converted_to_follow_up",
    "open",
    "closed",
    "complete",
    "completed"
  ]);

  const elements = {};
  let latestDiagnostics = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initializeReadOnlySidebarControls();
    bindElements();
    bindActions();
    render();
  }

  function initializeReadOnlySidebarControls() {
    hydrateSidebarNavigationLabels();
    renderReadOnlySidebarSectionControls();
    renderReadOnlySidebarToggle();
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

  function renderReadOnlySidebarToggle() {
    const toggle = document.getElementById("sidebar-toggle");

    if (!toggle) {
      return;
    }

    applySidebarCollapsedState(false);
    toggle.onclick = () => {
      applySidebarCollapsedState(!document.body.classList.contains("sidebar-collapsed"));
    };
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

  function renderReadOnlySidebarSectionControls() {
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
        applySidebarSectionState(section, section.container.classList.contains("sidebar-section-collapsed"));
      };

      label.onkeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        applySidebarSectionState(section, section.container.classList.contains("sidebar-section-collapsed"));
      };
    });
  }

  function getSidebarSectionState() {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_SECTION_STATE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function getSidebarSections() {
    return Array.from(document.querySelectorAll(".app-sidebar [data-sidebar-section-key]"))
      .map((container) => ({
        key: container.getAttribute("data-sidebar-section-key"),
        container
      }))
      .filter((section) => section.key && section.container);
  }

  function applySidebarSectionState(section, expanded) {
    const label = section.container.querySelector(".sidebar-group-label");

    section.container.classList.toggle("sidebar-section-collapsed", !expanded);
    section.container.setAttribute("aria-expanded", String(expanded));

    if (label) {
      label.setAttribute("aria-expanded", String(expanded));
    }
  }
  function bindElements() {
    elements.generatedAt = document.getElementById("data-health-generated-at");
    elements.summary = document.getElementById("data-health-summary");
    elements.workspaceInventory = document.getElementById("data-health-workspace-inventory");
    elements.checks = document.getElementById("data-health-checks");
    elements.keyInventory = document.getElementById("data-health-key-inventory");
    elements.copySummary = document.getElementById("data-health-copy-summary");
    elements.downloadSummary = document.getElementById("data-health-download-summary");
    elements.actionStatus = document.getElementById("data-health-action-status");
    elements.headerActiveWorkspace = document.getElementById("data-health-header-active-workspace");
  }

  function bindActions() {
    if (elements.copySummary) {
      elements.copySummary.addEventListener("click", copyDiagnosticSummary);
    }

    if (elements.downloadSummary) {
      elements.downloadSummary.addEventListener("click", downloadDiagnosticSummary);
    }
  }

  function render() {
    latestDiagnostics = buildDiagnostics();
    if (elements.headerActiveWorkspace) {
      elements.headerActiveWorkspace.textContent = latestDiagnostics.activeWorkspace
        ? latestDiagnostics.activeWorkspace.name
        : "None selected";
    }
    elements.generatedAt.textContent = `Generated ${formatDate(latestDiagnostics.generatedAt)}.`;
    renderSummary(latestDiagnostics);
    renderWorkspaceInventory(latestDiagnostics.workspaces);
    renderChecks(latestDiagnostics.checks);
    renderKeyInventory(latestDiagnostics.keyInventory);
  }

  function buildDiagnostics() {
    const generatedAt = new Date().toISOString();
    const keys = listStorageKeys();
    const keyInventory = keys.map(buildKeyInfo).sort((a, b) => a.key.localeCompare(b.key));
    const workspaceRegistry = parseKnownJson(localStorage.getItem(WORKSPACES_KEY), []);
    const workspaces = Array.isArray(workspaceRegistry.value)
      ? workspaceRegistry.value.filter((workspace) => workspace && workspace.id)
      : [];
    const activeWorkspaceId = localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "";
    const workspaceIds = new Set(workspaces.map((workspace) => String(workspace.id)));
    const workspaceNameById = new Map(workspaces.map((workspace) => [
      String(workspace.id),
      String(workspace.name || "Unnamed workspace")
    ]));

    keyInventory.forEach((item) => {
      if (item.scope === "workspace") {
        item.workspaceName = workspaceNameById.get(item.workspaceId) || "";
      }
    });

    const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null;
    const scopedKeys = keyInventory.filter((item) => item.scope === "workspace");
    const orphanedKeys = scopedKeys.filter((item) => !workspaceIds.has(item.workspaceId));
    const malformedKeys = keyInventory.filter((item) => item.expectedJson && !item.jsonReadable);
    const workspaceRecords = workspaces.map((workspace) => buildWorkspaceInventory(workspace, activeWorkspaceId, keyInventory));
    const checks = buildChecks({
      activeWorkspace,
      activeWorkspaceId,
      keyInventory,
      malformedKeys,
      orphanedKeys,
      workspaceIds,
      workspaces,
      workspaceRecords
    });
    const totalBytes = keyInventory.reduce((total, item) => total + item.approxBytes, 0);
    const globalAppKeys = keyInventory.filter((item) => item.scope === "global" && item.isKnownAppKey);

    return {
      pageVersion: PAGE_VERSION,
      generatedAt,
      activeWorkspace,
      activeWorkspaceId,
      workspaces: workspaceRecords,
      keyInventory,
      checks,
      summary: {
        workspaceCount: workspaces.length,
        workspaceScopedKeyCount: scopedKeys.length,
        globalAppKeyCount: globalAppKeys.length,
        orphanedKeyCount: orphanedKeys.length,
        malformedJsonCount: malformedKeys.length,
        approximateStorageBytes: totalBytes
      }
    };
  }

  function listStorageKeys() {
    const keys = [];

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (key) {
          keys.push(key);
        }
      }
    } catch (error) {
      return [];
    }

    return keys;
  }

  function buildKeyInfo(key) {
    const value = localStorage.getItem(key) || "";
    const scopedMatch = key.match(WORKSPACE_KEY_PATTERN);
    const approxBytes = (key.length + value.length) * 2;
    const looksJson = /^[\[{]/.test(value.trim());

    if (scopedMatch) {
      const collection = scopedMatch[2];
      const definition = SCOPED_KEY_DEFINITIONS.get(collection) || {
        category: "workspace scoped",
        json: true
      };
      const parsed = definition.json ? parseKnownJson(value, null) : { ok: false, value: null };

      return {
        key,
        safeKey: truncateMiddle(key, 96),
        scope: "workspace",
        workspaceId: scopedMatch[1],
        workspaceName: "",
        collection,
        category: definition.category,
        approxBytes,
        expectedJson: Boolean(definition.json),
        jsonReadable: definition.json ? parsed.ok : false,
        malformedReason: parsed.ok ? "" : parsed.error,
        isKnownAppKey: SCOPED_KEY_DEFINITIONS.has(collection)
      };
    }

    const definition = GLOBAL_KEY_DEFINITIONS.get(key);
    const expectedJson = definition ? definition.json : looksJson;
    const parsed = expectedJson ? parseKnownJson(value, null) : { ok: false, value: null };

    return {
      key,
      safeKey: truncateMiddle(key, 96),
      scope: "global",
      workspaceId: "",
      workspaceName: "",
      collection: "",
      category: definition ? definition.category : key.startsWith("rfp") ? "unclassified app key" : "other browser key",
      approxBytes,
      expectedJson,
      jsonReadable: expectedJson ? parsed.ok : false,
      malformedReason: expectedJson && !parsed.ok ? parsed.error : "",
      isKnownAppKey: Boolean(definition)
    };
  }

  function buildWorkspaceInventory(workspace, activeWorkspaceId, keyInventory) {
    const workspaceId = String(workspace.id);
    const answers = readScopedJson(workspaceId, "answers", {});
    const roadmap = readScopedJson(workspaceId, "projectRoadmap", null);
    const projectPlan = readScopedJson(workspaceId, "projectPlanItems", null);
    const reviewDecisions = readScopedJson(workspaceId, "reviewDecisions", {});
    const projectSpecific = readScopedJson(workspaceId, "projectSpecificRequirements", null);
    const clientSourceCount = countClientSourceRecords(workspaceId);
    const publicResearchCount = countPublicResearchRecords(workspaceId);
    const projectPlanItems = Array.isArray(projectPlan?.items) ? projectPlan.items : [];
    const projectSpecificCount = Array.isArray(projectSpecific?.requirements)
      ? projectSpecific.requirements.length
      : 0;
    const warnings = getWorkspaceWarnings(workspace, keyInventory);

    return {
      id: workspaceId,
      name: String(workspace.name || "Unnamed workspace"),
      isActive: workspaceId === activeWorkspaceId,
      createdAt: workspace.createdAt || "",
      updatedAt: workspace.updatedAt || answers.savedAt || "",
      procurementType: formatStoredLabel(answers.procurement_type) || "Not set",
      justiceDomain: formatStoredLabel(answers.justice_domain) || "Not set",
      currentPhase: getCurrentRoadmapPhase(roadmap),
      intakeAnswerCount: countAnswers(answers),
      clientSourceCount,
      publicResearchCount,
      reviewDecisionCount: reviewDecisions && typeof reviewDecisions === "object" && !Array.isArray(reviewDecisions)
        ? Object.keys(reviewDecisions).length
        : 0,
      projectSpecificCount,
      projectPlanItemCount: projectPlanItems.length,
      openRiskCount: countOpenRisks(workspaceId, projectPlanItems),
      warningCount: warnings.length,
      warnings
    };
  }

  function buildChecks(context) {
    const checks = [];
    const {
      activeWorkspace,
      activeWorkspaceId,
      keyInventory,
      malformedKeys,
      orphanedKeys,
      workspaceIds,
      workspaces,
      workspaceRecords
    } = context;

    addCheck(
      checks,
      activeWorkspaceId && !activeWorkspace ? "Warning" : "OK",
      "Active workspace registry",
      activeWorkspaceId && !activeWorkspace
        ? `Active workspace ID "${activeWorkspaceId}" does not match a saved workspace.`
        : "Active workspace selection is valid or no workspace is selected.",
      activeWorkspaceId || "No active workspace selected",
      activeWorkspaceId && !activeWorkspace ? "Select a valid workspace from the global header." : "No action needed."
    );

    addCheck(
      checks,
      orphanedKeys.length ? "Warning" : "OK",
      "Workspace-scoped key ownership",
      orphanedKeys.length
        ? `${orphanedKeys.length} workspace-scoped key${orphanedKeys.length === 1 ? "" : "s"} reference missing workspaces.`
        : "No orphaned workspace-scoped keys were detected.",
      orphanedKeys.slice(0, 5).map((item) => item.safeKey).join(", "),
      orphanedKeys.length ? "Review workspace history before deciding whether any test data should be reset later." : "No action needed."
    );

    addCheck(
      checks,
      malformedKeys.length ? "Warning" : "OK",
      "Known JSON readability",
      malformedKeys.length
        ? `${malformedKeys.length} known app key${malformedKeys.length === 1 ? "" : "s"} could not be parsed as JSON.`
        : "Known JSON-backed app keys are readable.",
      malformedKeys.slice(0, 5).map((item) => item.safeKey).join(", "),
      malformedKeys.length ? "Open the affected page carefully and preserve data before any manual cleanup." : "No action needed."
    );

    const duplicateNames = findDuplicateWorkspaceNames(workspaces);
    addCheck(
      checks,
      duplicateNames.length ? "Review" : "OK",
      "Duplicate workspace names",
      duplicateNames.length
        ? `Duplicate workspace names found: ${duplicateNames.join(", ")}.`
        : "No duplicate workspace names were detected.",
      duplicateNames.join(", "),
      duplicateNames.length ? "Rename workspaces if testers need clearer separation." : "No action needed."
    );

    addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, "Public Research records", "publicResearchCount");
    addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, "Client Source Intake records", "clientSourceCount");
    addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, "Requirements Review decisions", "reviewDecisionCount");
    addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, "Project Plan items", "projectPlanItemCount");
    addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, "Project-specific requirements", "projectSpecificCount");

    const staleDisplayState = countStaleDisplayStateKeys(workspaceIds);
    addCheck(
      checks,
      staleDisplayState ? "Review" : "OK",
      "Public Research display state references",
      staleDisplayState
        ? `${staleDisplayState} minimized display-state reference${staleDisplayState === 1 ? "" : "s"} point to missing public research records.`
        : "Public Research display-state references match existing records where checked.",
      staleDisplayState ? "publicInfoDisplayState" : "",
      staleDisplayState ? "No immediate action required; display-state cleanup can remain a future support tool." : "No action needed."
    );

    const unknownPublicStatuses = findUnknownPublicStatuses(workspaceIds);
    addCheck(
      checks,
      unknownPublicStatuses.length ? "Review" : "OK",
      "Public Research status values",
      unknownPublicStatuses.length
        ? `${unknownPublicStatuses.length} unexpected Public Research status value${unknownPublicStatuses.length === 1 ? "" : "s"} found.`
        : "Public Research status values are within the known prototype set.",
      unknownPublicStatuses.slice(0, 5).map((item) => `${item.workspaceId}:${item.status}`).join(", "),
      unknownPublicStatuses.length ? "Open Public Research for the affected workspace and inspect records." : "No action needed."
    );

    const unknownRequirementDecisions = findUnknownRequirementDecisions(workspaceIds);
    addCheck(
      checks,
      unknownRequirementDecisions.length ? "Review" : "OK",
      "Requirements Review decision values",
      unknownRequirementDecisions.length
        ? `${unknownRequirementDecisions.length} unexpected requirement decision value${unknownRequirementDecisions.length === 1 ? "" : "s"} found.`
        : "Requirement decision values are within the known prototype set.",
      unknownRequirementDecisions.slice(0, 5).map((item) => `${item.workspaceId}:${item.value}`).join(", "),
      unknownRequirementDecisions.length ? "Open Requirements Review for the affected workspace and inspect decisions." : "No action needed."
    );

    const totalBytes = keyInventory.reduce((total, item) => total + item.approxBytes, 0);
    addCheck(
      checks,
      totalBytes >= LARGE_STORAGE_WARNING_BYTES ? "Warning" : totalBytes >= LARGE_STORAGE_REVIEW_BYTES ? "Review" : "OK",
      "Approximate localStorage usage",
      `Approximate stored size is ${formatBytes(totalBytes)}.`,
      "",
      totalBytes >= LARGE_STORAGE_REVIEW_BYTES ? "If performance slows, export notes manually and consider cleaning obsolete test workspaces later." : "No action needed."
    );

    return checks;
  }

  function renderSummary(diagnostics) {
    elements.summary.innerHTML = [
      renderSummaryCard("Active workspace", diagnostics.activeWorkspace ? diagnostics.activeWorkspace.name : "None selected"),
      renderSummaryCard("Workspaces", diagnostics.summary.workspaceCount),
      renderSummaryCard("Workspace keys", diagnostics.summary.workspaceScopedKeyCount),
      renderSummaryCard("Global app keys", diagnostics.summary.globalAppKeyCount),
      renderSummaryCard("Orphaned keys", diagnostics.summary.orphanedKeyCount),
      renderSummaryCard("Malformed JSON", diagnostics.summary.malformedJsonCount),
      renderSummaryCard("Approx. storage", formatBytes(diagnostics.summary.approximateStorageBytes)),
      renderSummaryCard("Diagnostic mode", "Read only")
    ].join("");
  }

  function renderSummaryCard(label, value) {
    return `
      <article class="summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function renderWorkspaceInventory(workspaces) {
    if (!workspaces.length) {
      elements.workspaceInventory.innerHTML = `
        <section class="empty-state">
          <h2>No saved workspaces found</h2>
          <p>This browser does not currently have saved Procurement Workbench workspaces.</p>
        </section>
      `;
      return;
    }

    elements.workspaceInventory.innerHTML = `
      <div class="data-health-table-wrap">
        <table class="data-health-table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Project Context</th>
              <th>Records</th>
              <th>Plan / Review</th>
              <th>Dates</th>
              <th>Warnings</th>
            </tr>
          </thead>
          <tbody>
            ${workspaces.map(renderWorkspaceRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderWorkspaceRow(workspace) {
    return `
      <tr>
        <td>
          <strong>${escapeHtml(workspace.name)}</strong>
          <small>${escapeHtml(workspace.isActive ? "Active workspace" : workspace.id)}</small>
        </td>
        <td>
          ${renderInlineMeta("Procurement", workspace.procurementType)}
          ${renderInlineMeta("Justice domain", workspace.justiceDomain)}
          ${renderInlineMeta("Current phase", workspace.currentPhase)}
        </td>
        <td>
          ${renderInlineMeta("Intake answers", workspace.intakeAnswerCount || "No intake yet")}
          ${renderInlineMeta("Client source", workspace.clientSourceCount || "None found")}
          ${renderInlineMeta("Public research", workspace.publicResearchCount || "None found")}
        </td>
        <td>
          ${renderInlineMeta("Review decisions", workspace.reviewDecisionCount || "None found")}
          ${renderInlineMeta("Project-specific reqs", workspace.projectSpecificCount || "None found")}
          ${renderInlineMeta("Plan items", workspace.projectPlanItemCount || "None found")}
          ${renderInlineMeta("Risks/blockers", workspace.openRiskCount || "None found")}
        </td>
        <td>
          ${renderInlineMeta("Created", formatDate(workspace.createdAt))}
          ${renderInlineMeta("Updated", formatDate(workspace.updatedAt))}
        </td>
        <td>
          <span class="staged-badge ${workspace.warningCount ? "staged-badge-warning" : ""}">${escapeHtml(workspace.warningCount ? `${workspace.warningCount} review` : "OK")}</span>
        </td>
      </tr>
    `;
  }

  function renderChecks(checks) {
    elements.checks.innerHTML = checks.map((check) => `
      <article class="data-health-check data-health-check-${escapeHtml(check.status.toLowerCase())}">
        <div>
          <span class="staged-badge ${check.status === "OK" ? "staged-badge-info" : "staged-badge-warning"}">${escapeHtml(check.status)}</span>
          <h3>${escapeHtml(check.title)}</h3>
          <p>${escapeHtml(check.message)}</p>
          ${check.affected ? `<p class="staged-muted">Affected: ${escapeHtml(check.affected)}</p>` : ""}
        </div>
        <p><strong>Next step:</strong> ${escapeHtml(check.nextStep)}</p>
      </article>
    `).join("");
  }

  function renderKeyInventory(keyInventory) {
    if (!keyInventory.length) {
      elements.keyInventory.innerHTML = '<p class="staged-muted">No localStorage keys are available to inspect.</p>';
      return;
    }

    elements.keyInventory.innerHTML = `
      <div class="data-health-table-wrap">
        <table class="data-health-table data-health-key-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Scope</th>
              <th>Workspace</th>
              <th>Category</th>
              <th>Approx. size</th>
              <th>JSON readable</th>
            </tr>
          </thead>
          <tbody>
            ${keyInventory.map(renderKeyRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderKeyRow(item) {
    return `
      <tr>
        <td><code>${escapeHtml(item.safeKey)}</code></td>
        <td>${escapeHtml(formatDisplayLabel(item.scope))}</td>
        <td>${escapeHtml(item.workspaceName || item.workspaceId || "Not applicable")}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(formatBytes(item.approxBytes))}</td>
        <td>
          <span class="staged-badge ${item.expectedJson && !item.jsonReadable ? "staged-badge-warning" : ""}">
            ${escapeHtml(item.expectedJson ? item.jsonReadable ? "Yes" : "No" : "Not JSON")}
          </span>
        </td>
      </tr>
    `;
  }

  async function copyDiagnosticSummary() {
    const summary = getExportSummary();

    try {
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
      setActionStatus("Diagnostic summary copied. It contains metadata and counts only.", false);
    } catch (error) {
      setActionStatus("Copy failed. Use Download Diagnostic Summary JSON instead.", true);
    }
  }

  function downloadDiagnosticSummary() {
    const summary = getExportSummary();
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `procurement-workbench-data-health-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setActionStatus("Diagnostic summary JSON downloaded. It contains metadata and counts only.", false);
  }

  function getExportSummary() {
    const diagnostics = latestDiagnostics || buildDiagnostics();

    return {
      pageVersion: diagnostics.pageVersion,
      generatedAt: diagnostics.generatedAt,
      activeWorkspace: {
        id: diagnostics.activeWorkspaceId || "",
        name: diagnostics.activeWorkspace ? diagnostics.activeWorkspace.name : ""
      },
      summary: diagnostics.summary,
      workspaces: diagnostics.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        active: workspace.isActive,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        procurementType: workspace.procurementType,
        justiceDomain: workspace.justiceDomain,
        currentPhase: workspace.currentPhase,
        counts: {
          intakeAnswers: workspace.intakeAnswerCount,
          clientSourceRecords: workspace.clientSourceCount,
          publicResearchRecords: workspace.publicResearchCount,
          requirementReviewDecisions: workspace.reviewDecisionCount,
          projectSpecificRequirements: workspace.projectSpecificCount,
          projectPlanItems: workspace.projectPlanItemCount,
          openRisksOrBlockers: workspace.openRiskCount,
          diagnosticWarnings: workspace.warningCount
        }
      })),
      checks: diagnostics.checks,
      keyInventory: diagnostics.keyInventory.map((item) => ({
        key: item.key,
        scope: item.scope,
        workspaceId: item.workspaceId,
        collection: item.collection,
        category: item.category,
        approxBytes: item.approxBytes,
        expectedJson: item.expectedJson,
        jsonReadable: item.jsonReadable
      }))
    };
  }

  function addNoActiveWorkspaceRecordCheck(checks, activeWorkspaceId, workspaceRecords, label, countKey) {
    const total = workspaceRecords.reduce((sum, workspace) => sum + Number(workspace[countKey] || 0), 0);
    const needsSelection = !activeWorkspaceId && total > 0;

    addCheck(
      checks,
      needsSelection ? "Review" : "OK",
      `${label} workspace context`,
      needsSelection
        ? `${total} ${label.toLowerCase()} exist, but no workspace is selected.`
        : `${label} are workspace-scoped or no records were found.`,
      needsSelection ? "No active workspace selected" : "",
      needsSelection ? "Select a workspace before reviewing or acting on these records." : "No action needed."
    );
  }

  function addCheck(checks, status, title, message, affected, nextStep) {
    checks.push({
      status,
      title,
      message,
      affected,
      nextStep
    });
  }

  function getWorkspaceWarnings(workspace, keyInventory) {
    const workspaceId = String(workspace.id);
    const warnings = [];
    const workspaceKeys = keyInventory.filter((item) => item.workspaceId === workspaceId);

    workspaceKeys.forEach((item) => {
      if (item.expectedJson && !item.jsonReadable) {
        warnings.push(`Malformed JSON: ${item.collection || item.key}`);
      }
    });

    const unknownDecisions = findUnknownRequirementDecisions(new Set([workspaceId]));
    unknownDecisions.forEach((item) => warnings.push(`Unknown decision: ${item.value}`));

    const unknownPublicStatuses = findUnknownPublicStatuses(new Set([workspaceId]));
    unknownPublicStatuses.forEach((item) => warnings.push(`Unknown public status: ${item.status}`));

    return warnings;
  }

  function countClientSourceRecords(workspaceId) {
    return [
      "clientSourceDocuments",
      "extractedClientFacts",
      "suggestedInterviewAnswers",
      "openQuestions",
      "clientRiskGapNotes"
    ].reduce((total, collection) => total + readScopedArray(workspaceId, collection).length, 0);
  }

  function countPublicResearchRecords(workspaceId) {
    return [
      "publicInfoSources",
      "publicInfoFacts",
      "publicInfoSuggestions",
      "publicInfoFollowUps",
      "publicInfoRiskNotes"
    ].reduce((total, collection) => total + readScopedArray(workspaceId, collection).length, 0);
  }

  function countOpenRisks(workspaceId, projectPlanItems) {
    const clientRisks = readScopedArray(workspaceId, "clientRiskGapNotes").filter(isOpenRisk).length;
    const publicRisks = readScopedArray(workspaceId, "publicInfoRiskNotes").filter(isOpenRisk).length;
    const planRisks = projectPlanItems.filter((item) => item.type === "risk" || item.status === "blocked").length;

    return clientRisks + publicRisks + planRisks;
  }

  function findDuplicateWorkspaceNames(workspaces) {
    const byName = new Map();

    workspaces.forEach((workspace) => {
      const name = String(workspace.name || "").trim().toLowerCase();

      if (!name) {
        return;
      }

      const values = byName.get(name) || [];
      values.push(workspace.name);
      byName.set(name, values);
    });

    return Array.from(byName.values())
      .filter((names) => names.length > 1)
      .map((names) => names[0]);
  }

  function countStaleDisplayStateKeys(workspaceIds) {
    let staleCount = 0;

    workspaceIds.forEach((workspaceId) => {
      const displayState = readScopedJson(workspaceId, "publicInfoDisplayState", {});
      const minimized = displayState && typeof displayState.minimized === "object" ? displayState.minimized : {};
      const knownIds = getPublicInfoIds(workspaceId);

      Object.keys(minimized).forEach((key) => {
        if (!knownIds.has(key)) {
          staleCount += 1;
        }
      });
    });

    return staleCount;
  }

  function getPublicInfoIds(workspaceId) {
    const ids = new Set();

    readScopedArray(workspaceId, "publicInfoSources").forEach((record) => ids.add(`source:${record.id}`));
    readScopedArray(workspaceId, "publicInfoFacts").forEach((record) => ids.add(`fact:${record.id}`));
    readScopedArray(workspaceId, "publicInfoSuggestions").forEach((record) => ids.add(`suggestion:${record.id}`));
    readScopedArray(workspaceId, "publicInfoFollowUps").forEach((record) => ids.add(`follow_up:${record.id}`));
    readScopedArray(workspaceId, "publicInfoRiskNotes").forEach((record) => {
      ids.add(`${record.noteType === "research_limitation" ? "limitation" : "issue"}:${record.id}`);
    });

    return ids;
  }

  function findUnknownPublicStatuses(workspaceIds) {
    const issues = [];

    workspaceIds.forEach((workspaceId) => {
      [
        ["publicInfoFacts", ["reviewStatus", "status"]],
        ["publicInfoSuggestions", ["status", "reviewStatus"]],
        ["publicInfoFollowUps", ["status"]],
        ["publicInfoRiskNotes", ["status"]]
      ].forEach(([collection, fields]) => {
        readScopedArray(workspaceId, collection).forEach((record) => {
          fields.forEach((field) => {
            if (!record[field]) {
              return;
            }

            const status = String(record[field]).toLowerCase();

            if (!VALID_PUBLIC_STATUSES.has(status)) {
              issues.push({
                workspaceId,
                collection,
                status
              });
            }
          });
        });
      });
    });

    return issues;
  }

  function findUnknownRequirementDecisions(workspaceIds) {
    const issues = [];

    workspaceIds.forEach((workspaceId) => {
      const decisions = readScopedJson(workspaceId, "reviewDecisions", {});

      if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
        return;
      }

      Object.values(decisions).forEach((decision) => {
        const value = String(decision || "").toLowerCase();

        if (value && !VALID_REQUIREMENT_DECISIONS.has(value)) {
          issues.push({
            workspaceId,
            value
          });
        }
      });
    });

    return issues;
  }

  function readScopedArray(workspaceId, collection) {
    const value = readScopedJson(workspaceId, collection, []);
    return Array.isArray(value) ? value : [];
  }

  function readScopedJson(workspaceId, collection, fallback) {
    const value = localStorage.getItem(`rfpWorkspace:${workspaceId}:${collection}`);
    const parsed = parseKnownJson(value, fallback);
    return parsed.ok ? parsed.value : fallback;
  }

  function parseKnownJson(value, fallback) {
    if (!value) {
      return {
        ok: true,
        value: fallback,
        error: ""
      };
    }

    try {
      return {
        ok: true,
        value: JSON.parse(value),
        error: ""
      };
    } catch (error) {
      return {
        ok: false,
        value: fallback,
        error: error.message
      };
    }
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

  function isOpenRisk(record) {
    const status = String(record.status || "open").toLowerCase();
    return !["dismissed", "addressed", "resolved", "closed", "complete", "completed", "converted_to_follow_up"].includes(status);
  }

  function renderInlineMeta(label, value) {
    return `<span class="data-health-inline-meta"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "Not available")}</span>`;
  }

  function setActionStatus(message, isError) {
    if (!elements.actionStatus) {
      return;
    }

    elements.actionStatus.textContent = message;
    elements.actionStatus.classList.toggle("error", Boolean(isError));
  }

  function formatStoredLabel(value) {
    if (!value) {
      return "";
    }

    if (Array.isArray(value)) {
      return value.length ? value.map(formatDisplayLabel).join(", ") : "";
    }

    return formatDisplayLabel(value);
  }

  function formatDisplayLabel(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bCms\b/g, "CMS")
      .replace(/\bRfp\b/g, "RFP")
      .replace(/\bCjis\b/g, "CJIS");
  }

  function formatDate(value) {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${bytes} B`;
  }

  function truncateMiddle(value, maxLength) {
    const text = String(value || "");

    if (text.length <= maxLength) {
      return text;
    }

    const prefixLength = Math.floor((maxLength - 3) / 2);
    const suffixLength = maxLength - 3 - prefixLength;
    return `${text.slice(0, prefixLength)}...${text.slice(text.length - suffixLength)}`;
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
