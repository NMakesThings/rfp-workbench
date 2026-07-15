(function () {
  const TEMPLATES_URL = "data/project-plan-templates.json";
  const ALLOWED_TYPES = new Set(["deliverable", "checkpoint", "decision", "dependency", "risk"]);
  const ALLOWED_OWNERS = new Set(["MCP", "Client", "Joint"]);
  const ALLOWED_STATUSES = new Set(["not_started", "in_progress", "blocked", "complete", "not_applicable"]);

  const elements = {};
  let roadmapCatalog = [];
  let templates = [];
  let validationWarnings = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindElements();

    if (!window.RfpWorkspaces) {
      renderError("Workspace helpers could not be loaded. Serve this folder over HTTP and try again.");
      return;
    }

    roadmapCatalog = window.RfpWorkspaces.getProjectRoadmapBucketCatalog();

    try {
      const response = await fetch(TEMPLATES_URL);

      if (!response.ok) {
        throw new Error(`Template configuration could not be loaded: ${response.status}`);
      }

      const data = await response.json();
      templates = Array.isArray(data.templates) ? data.templates.map(normalizeTemplate) : [];
      validationWarnings = validateTemplates(templates);
      render();
    } catch (error) {
      renderError("Project plan templates could not be loaded. Serve this folder over HTTP and try again.");
    }
  }

  function bindElements() {
    elements.summary = document.getElementById("project-config-summary");
    elements.stageCatalog = document.getElementById("project-config-stage-catalog");
    elements.templateCards = document.getElementById("project-config-template-cards");
    elements.templateGrid = document.getElementById("project-config-template-grid");
    elements.validation = document.getElementById("project-config-validation");
  }

  function normalizeTemplate(template) {
    return {
      id: String(template && template.id ? template.id : ""),
      name: String(template && template.name ? template.name : ""),
      description: String(template && template.description ? template.description : ""),
      engagementType: String(template && template.engagementType ? template.engagementType : ""),
      roadmapStages: Array.isArray(template && template.roadmapStages)
        ? template.roadmapStages.map(normalizeStage)
        : [],
      projectPlanItems: Array.isArray(template && template.projectPlanItems)
        ? template.projectPlanItems.map(normalizeItem)
        : []
    };
  }

  function normalizeStage(stage) {
    return {
      id: String(stage && stage.id ? stage.id : ""),
      label: String(stage && stage.label ? stage.label : ""),
      description: String(stage && stage.description ? stage.description : "")
    };
  }

  function normalizeItem(item) {
    return {
      type: String(item && item.type ? item.type : ""),
      title: String(item && item.title ? item.title : ""),
      roadmapBucketId: String(item && item.roadmapBucketId ? item.roadmapBucketId : ""),
      owner: String(item && item.owner ? item.owner : ""),
      status: String(item && item.status ? item.status : ""),
      dueDate: String(item && item.dueDate ? item.dueDate : ""),
      estimatedDuration: String(item && item.estimatedDuration ? item.estimatedDuration : ""),
      notes: String(item && item.notes ? item.notes : "")
    };
  }

  function render() {
    renderSummary();
    renderStageCatalog();
    renderTemplateCards();
    renderTemplateGrid();
    renderValidation();
  }

  function renderSummary() {
    const itemCount = templates.reduce((total, template) => total + template.projectPlanItems.length, 0);
    const stageCount = templates.reduce((total, template) => total + template.roadmapStages.length, 0);
    const typeCounts = countBy(templates.flatMap((template) => template.projectPlanItems), "type");

    elements.summary.innerHTML = [
      renderSummaryCard("Roadmap stages", roadmapCatalog.length),
      renderSummaryCard("Templates", templates.length),
      renderSummaryCard("Template stages", stageCount),
      renderSummaryCard("Plan items", itemCount),
      renderSummaryCard("Validation warnings", validationWarnings.length),
      renderSummaryCard("Deliverables", typeCounts.deliverable || 0),
      renderSummaryCard("Checkpoints", typeCounts.checkpoint || 0),
      renderSummaryCard("Decisions", typeCounts.decision || 0),
      renderSummaryCard("Dependencies", typeCounts.dependency || 0),
      renderSummaryCard("Risks", typeCounts.risk || 0)
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

  function renderStageCatalog() {
    if (!roadmapCatalog.length) {
      elements.stageCatalog.innerHTML = '<p class="staged-muted">No roadmap stage catalog is available.</p>';
      return;
    }

    elements.stageCatalog.innerHTML = roadmapCatalog
      .map((stage, index) => `
        <article class="project-config-stage-card">
          <p class="section-kicker">Order ${escapeHtml(index + 1)}</p>
          <h3>${escapeHtml(stage.label)}</h3>
          <dl class="review-queue-meta">
            ${renderMetaRow("Stage ID", stage.id)}
            ${renderMetaRow("Purpose", stage.description || "No description provided.")}
          </dl>
        </article>
      `)
      .join("");
  }

  function renderTemplateCards() {
    if (!templates.length) {
      elements.templateCards.innerHTML = '<p class="staged-muted">No project plan templates are available.</p>';
      return;
    }

    elements.templateCards.innerHTML = templates.map(renderTemplateCard).join("");
  }

  function renderTemplateCard(template) {
    const typeCounts = countBy(template.projectPlanItems, "type");
    const ownerCounts = countBy(template.projectPlanItems, "owner");
    const statusCounts = countBy(template.projectPlanItems, "status");

    return `
      <article class="project-config-template-card">
        <div>
          <p class="section-kicker">${escapeHtml(template.id || "missing-id")}</p>
          <h3>${escapeHtml(template.name || "Unnamed template")}</h3>
          <p>${escapeHtml(template.description || "No description provided.")}</p>
        </div>
        <div class="project-template-meta">
          <span>${escapeHtml(template.roadmapStages.length)} stages</span>
          <span>${escapeHtml(template.projectPlanItems.length)} plan items</span>
          ${Object.entries(typeCounts).map(([type, count]) => `<span>${escapeHtml(formatLabel(type))}: ${escapeHtml(count)}</span>`).join("")}
        </div>
        <div class="project-config-count-grid">
          <div>
            <strong>Owners</strong>
            <p>${escapeHtml(formatCountList(ownerCounts) || "None")}</p>
          </div>
          <div>
            <strong>Statuses</strong>
            <p>${escapeHtml(formatCountList(statusCounts) || "None")}</p>
          </div>
        </div>
      </article>
    `;
  }

  function renderTemplateGrid() {
    if (!templates.length) {
      elements.templateGrid.innerHTML = '<p class="staged-muted">No template mappings are available.</p>';
      return;
    }

    elements.templateGrid.innerHTML = templates.map(renderTemplateMapping).join("");
  }

  function renderTemplateMapping(template) {
    const stageById = new Map(template.roadmapStages.map((stage) => [stage.id, stage]));
    const groupedItems = groupItemsByStage(template);

    return `
      <details class="project-config-template-section" open>
        <summary>
          <span>
            <strong>${escapeHtml(template.name || "Unnamed template")}</strong>
            <small>${escapeHtml(template.id || "missing-id")} | ${escapeHtml(template.projectPlanItems.length)} plan items</small>
          </span>
        </summary>
        <div class="project-config-stage-mapping-list">
          ${template.roadmapStages.map((stage) => renderStageMapping(template, stage, groupedItems.get(stage.id) || [], stageById)).join("")}
          ${renderUnmappedItems(template, groupedItems, stageById)}
        </div>
      </details>
    `;
  }

  function groupItemsByStage(template) {
    const groupedItems = new Map();

    template.projectPlanItems.forEach((item) => {
      const key = item.roadmapBucketId || "";
      const group = groupedItems.get(key) || [];
      group.push(item);
      groupedItems.set(key, group);
    });

    return groupedItems;
  }

  function renderStageMapping(template, stage, items, stageById) {
    return `
      <section class="project-config-stage-mapping">
        <div class="project-config-stage-heading">
          <div>
            <p class="section-kicker">${escapeHtml(stage.id || "missing-stage-id")}</p>
            <h3>${escapeHtml(stage.label || "Unnamed stage")}</h3>
          </div>
          <span class="review-count-chip review-count-chip-static"><strong>${escapeHtml(items.length)}</strong><span>items</span></span>
        </div>
        ${items.length ? renderItemsTable(template, items, stageById) : '<p class="staged-muted">No plan items mapped to this stage.</p>'}
      </section>
    `;
  }

  function renderUnmappedItems(template, groupedItems, stageById) {
    const unmappedItems = Array.from(groupedItems.entries())
      .filter(([stageId]) => stageId && !stageById.has(stageId))
      .flatMap(([, items]) => items);

    if (!unmappedItems.length) {
      return "";
    }

    return `
      <section class="project-config-stage-mapping project-config-stage-mapping-warning">
        <div class="project-config-stage-heading">
          <div>
            <p class="section-kicker">Unmapped</p>
            <h3>Items With Invalid Stage References</h3>
          </div>
          <span class="review-count-chip review-count-chip-static"><strong>${escapeHtml(unmappedItems.length)}</strong><span>items</span></span>
        </div>
        ${renderItemsTable(template, unmappedItems, stageById)}
      </section>
    `;
  }

  function renderItemsTable(template, items, stageById) {
    const showIssuesColumn = items.some((item) =>
      getMappingStatuses(item, stageById).some((status) => !status.ok)
    );

    return `
      <div class="project-config-table-wrap">
        <table class="project-config-table">
          <thead>
            <tr>
              <th>Plan Item Title</th>
              <th>Item Type</th>
              <th>Template</th>
              <th>Stage / Bucket</th>
              <th>Owner</th>
              <th>Estimated Duration</th>
              <th>Notes / Purpose</th>
              ${showIssuesColumn ? "<th>Issues</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => renderItemRow(template, item, stageById, showIssuesColumn)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderItemRow(template, item, stageById, showIssuesColumn) {
    const stage = stageById.get(item.roadmapBucketId);
    const statuses = getMappingStatuses(item, stageById);

    return `
      <tr>
        <td>${escapeHtml(item.title || "Untitled item")}</td>
        <td>${renderStatusPill(item.type, ALLOWED_TYPES.has(item.type))}</td>
        <td>${escapeHtml(template.name || template.id || "Template")}</td>
        <td>
          <strong>${escapeHtml(stage ? stage.label : item.roadmapBucketId || "Unmapped")}</strong>
          <small>${escapeHtml(item.roadmapBucketId || "No roadmapBucketId")}</small>
        </td>
        <td>${renderStatusPill(item.owner || "Missing", ALLOWED_OWNERS.has(item.owner))}</td>
        <td>${escapeHtml(item.estimatedDuration || "Not estimated")}</td>
        <td>${escapeHtml(item.notes || "No notes provided.")}</td>
        ${showIssuesColumn ? `<td>${renderWarningStatuses(statuses)}</td>` : ""}
      </tr>
    `;
  }

  function getMappingStatuses(item, stageById) {
    const statuses = [];

    statuses.push({
      label: stageById.has(item.roadmapBucketId) ? "Mapped" : item.roadmapBucketId ? "Invalid Stage" : "Unmapped",
      ok: stageById.has(item.roadmapBucketId)
    });

    if (!ALLOWED_TYPES.has(item.type)) {
      statuses.push({ label: "Invalid Type", ok: false });
    }

    if (!ALLOWED_OWNERS.has(item.owner)) {
      statuses.push({ label: "Invalid Owner", ok: false });
    }

    if (!ALLOWED_STATUSES.has(item.status)) {
      statuses.push({ label: "Invalid Status", ok: false });
    }

    return statuses;
  }

  function renderValidation() {
    if (!validationWarnings.length) {
      elements.validation.innerHTML = '<p class="staged-muted">No template validation warnings found.</p>';
      return;
    }

    elements.validation.innerHTML = validationWarnings
      .map((warning) => `
        <article class="library-validation-item">
          <strong>${escapeHtml(warning.title)}</strong>
          <p>${escapeHtml(warning.message)}</p>
        </article>
      `)
      .join("");
  }

  function validateTemplates(nextTemplates) {
    const warnings = [];

    nextTemplates.forEach((template) => {
      if (!template.name.trim()) {
        warnings.push(warning("Blank template name", `Template ${template.id || "(missing ID)"} has no name.`));
      }

      if (!template.roadmapStages.length) {
        warnings.push(warning("Template has zero stages", `${template.name || template.id || "Unnamed template"} has no roadmap stages.`));
      }

      if (!template.projectPlanItems.length) {
        warnings.push(warning("Template has zero plan items", `${template.name || template.id || "Unnamed template"} has no project plan items.`));
      }

      const stageIds = new Set();
      template.roadmapStages.forEach((stage) => {
        if (!stage.label.trim()) {
          warnings.push(warning("Blank stage label", `${template.name || template.id || "Template"} has a stage with ID ${stage.id || "(missing ID)"} and no label.`));
        }

        if (stage.id && stageIds.has(stage.id)) {
          warnings.push(warning("Duplicate roadmap stage ID", `${template.name || template.id || "Template"} repeats stage ID ${stage.id}.`));
        }

        if (stage.id) {
          stageIds.add(stage.id);
        }
      });

      const titleCounts = countBy(template.projectPlanItems, "title");
      Object.entries(titleCounts)
        .filter(([title, count]) => title.trim() && count > 1)
        .forEach(([title, count]) => {
          warnings.push(warning("Duplicate plan item title", `${template.name || template.id || "Template"} repeats "${title}" ${count} times.`));
        });

      template.projectPlanItems.forEach((item) => {
        if (!item.title.trim()) {
          warnings.push(warning("Blank plan item title", `${template.name || template.id || "Template"} has a plan item without a title.`));
        }

        if (!stageIds.has(item.roadmapBucketId)) {
          warnings.push(warning("Invalid roadmapBucketId", `${template.name || template.id || "Template"} item "${item.title || "(untitled)"} maps to ${item.roadmapBucketId || "(blank)"}.`));
        }

        if (!ALLOWED_TYPES.has(item.type)) {
          warnings.push(warning("Invalid item type", `${template.name || template.id || "Template"} item "${item.title || "(untitled)"} uses type ${item.type || "(blank)"}.`));
        }

        if (!ALLOWED_OWNERS.has(item.owner)) {
          warnings.push(warning("Invalid owner", `${template.name || template.id || "Template"} item "${item.title || "(untitled)"} uses owner ${item.owner || "(blank)"}.`));
        }

        if (!ALLOWED_STATUSES.has(item.status)) {
          warnings.push(warning("Invalid status", `${template.name || template.id || "Template"} item "${item.title || "(untitled)"} uses status ${item.status || "(blank)"}.`));
        }
      });
    });

    return warnings;
  }

  function warning(title, message) {
    return { title, message };
  }

  function renderError(message) {
    const html = `<section class="empty-state"><h2>Project configuration could not be loaded</h2><p>${escapeHtml(message)}</p></section>`;

    if (elements.summary) {
      elements.summary.innerHTML = html;
    }

    [elements.stageCatalog, elements.templateCards, elements.templateGrid, elements.validation]
      .filter(Boolean)
      .forEach((element) => {
        element.innerHTML = "";
      });
  }

  function renderMetaRow(label, value) {
    return `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value || "Not set")}</dd>
      </div>
    `;
  }

  function renderStatusPill(label, isValid) {
    return `<span class="staged-badge ${isValid ? "" : "staged-badge-warning"}">${escapeHtml(label || "Missing")}</span>`;
  }

  function renderMappingStatus(label, ok) {
    return `<span class="project-config-mapping-status ${ok ? "is-ok" : "is-warning"}">${escapeHtml(label)}</span>`;
  }

  function renderWarningStatuses(statuses) {
    const warnings = statuses.filter((status) => !status.ok);

    if (!warnings.length) {
      return "";
    }

    return warnings.map((status) => renderMappingStatus(status.label, false)).join("");
  }

  function countBy(items, field) {
    return items.reduce((counts, item) => {
      const value = item && item[field] ? String(item[field]) : "";

      if (!value) {
        return counts;
      }

      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
  }

  function formatCountList(counts) {
    return Object.entries(counts)
      .map(([label, count]) => `${formatLabel(label)}: ${count}`)
      .join(", ");
  }

  function formatLabel(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
