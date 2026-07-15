const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const http = require("http");

const root = process.cwd();

const requiredFiles = [
  "index.html",
  "workspace-management.html",
  "interview.html",
  "client-source-intake.html",
  "public-information-ai-assist.html",
  "review-queue.html",
  "rfp-package.html",
  "client-template-intake.html",
  "assessment-findings.html",
  "preview.html",
  "project-plan.html",
  "default-profiles.html",
  "project-configuration.html",
  "requirements-library-manager.html",
  "staged-review.html",
  "data-health.html",
  "css/styles.css",
  "js/workspaces.js",
  "js/home.js",
  "js/workspace-management.js",
  "js/review-queue.js",
  "js/rfp-package.js",
  "js/client-template-intake.js",
  "js/assessment-findings.js",
  "js/public-information-ai-assist.js",
  "js/client-source-intake.js",
  "js/requirements-engine.js",
  "js/project-plan.js",
  "js/data-health.js",
  "data/deliverable-templates.json"
];

const mainHtmlFiles = [
  "index.html",
  "workspace-management.html",
  "interview.html",
  "client-source-intake.html",
  "public-information-ai-assist.html",
  "review-queue.html",
  "rfp-package.html",
  "client-template-intake.html",
  "assessment-findings.html",
  "preview.html",
  "project-plan.html",
  "default-profiles.html",
  "project-configuration.html",
  "requirements-library-manager.html",
  "staged-review.html",
  "data-health.html"
];

const visibleRouteLabels = {
  "rfp-package.html": "Deliverable Builder",
  "client-template-intake.html": "Client Template Intake",
  "assessment-findings.html": "Assessment Findings"
};

const deliverableBuilderLabels = [
  "RFP Package",
  "Assessment Report",
  "Executive Briefing",
  "Implementation Plan",
  "Requirements Matrix",
  "Evaluation / Scoring Package",
  "Outline only",
  "MCP standard template",
  "Client-provided template",
  "Ad hoc / custom"
];

const workflowNavOrder = [
  { label: "Home", route: "index.html" },
  { label: "Clients & Workspaces", route: "workspace-management.html" },
  { label: "Project Plan", route: "project-plan.html" },
  { label: "Project Intake", route: "interview.html" },
  { label: "Client Source Intake", route: "client-source-intake.html" },
  { label: "Public Research", route: "public-information-ai-assist.html" },
  { label: "Client Template Intake", route: "client-template-intake.html" },
  { label: "Requirements Review", route: "preview.html" },
  { label: "Assessment Findings", route: "assessment-findings.html" },
  { label: "Review Queue", route: "review-queue.html" },
  { label: "Deliverable Builder", route: "rfp-package.html" }
];

const workflowNavGroups = [
  {
    label: "Workspace",
    key: "workspace",
    routes: ["workspace-management.html", "project-plan.html"]
  },
  {
    label: "Discovery",
    key: "discovery",
    routes: ["interview.html", "client-source-intake.html", "public-information-ai-assist.html", "client-template-intake.html"]
  },
  {
    label: "Analysis",
    key: "analysis",
    routes: ["preview.html", "assessment-findings.html", "review-queue.html"]
  },
  {
    label: "Outputs",
    key: "outputs",
    routes: ["rfp-package.html"]
  },
  {
    label: "Admin",
    key: "admin",
    routes: ["default-profiles.html", "project-configuration.html", "requirements-library-manager.html", "staged-review.html", "data-health.html"]
  }
];

const adminNavOrder = [
  { label: "Default Profiles", route: "default-profiles.html" },
  { label: "Project Configuration", route: "project-configuration.html" },
  { label: "Requirements Library", route: "requirements-library-manager.html" },
  { label: "Content Staging", route: "staged-review.html" },
  { label: "Data Health & Support", route: "data-health.html" }
];

const protectedPaths = [
  "data/requirements-library.json",
  "data/import-staging/",
  "source-rfps/"
];

const checks = [];

function addCheck(section, status, message, details) {
  checks.push({
    section,
    status,
    message,
    details: details || []
  });
}

function existsProjectPath(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFilesRecursive(relativeDir, predicate) {
  const start = path.join(root, relativeDir);
  const files = [];

  if (!fs.existsSync(start)) {
    return files;
  }

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (!predicate || predicate(absolute)) {
        files.push(path.relative(root, absolute).replace(/\\/g, "/"));
      }
    }
  }

  walk(start);
  return files.sort();
}

function stripQueryAndHash(value) {
  return value.split("#")[0].split("?")[0];
}

function isExternalReference(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value) ||
    /^(?:mailto|tel|javascript|data):/i.test(value) ||
    value.startsWith("#") ||
    value.trim() === "";
}

function resolveLocalReference(fromFile, rawReference) {
  const clean = stripQueryAndHash(rawReference.trim());

  if (!clean || isExternalReference(clean)) {
    return "";
  }

  const normalized = clean.startsWith("/")
    ? clean.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile.replace(/\\/g, "/")), clean));

  if (normalized.startsWith("../")) {
    return normalized;
  }

  return normalized;
}

function extractAttributeReferences(html, attributeName) {
  const refs = [];
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, "gi");
  let match;

  while ((match = pattern.exec(html)) !== null) {
    refs.push(match[1]);
  }

  return refs;
}

function extractAdminNavBlock(html) {
  const start = html.search(/<section[^>]*data-sidebar-section-key=["']admin["'][^>]*>/i);

  if (start < 0) {
    return "";
  }

  const close = html.indexOf("</section>", start);
  return close >= 0 ? html.slice(start, close + "</section>".length) : html.slice(start);
}

function runRequiredFileCheck() {
  const missing = requiredFiles.filter((file) => !existsProjectPath(file));

  if (missing.length > 0) {
    addCheck("Required files", "fail", `${missing.length} required file(s) missing.`, missing);
    return;
  }

  addCheck("Required files", "pass", `${requiredFiles.length} required files exist.`);
}

function runJavaScriptSyntaxChecks() {
  const jsFiles = listFilesRecursive("js", (file) => file.endsWith(".js"));

  if (jsFiles.length === 0) {
    addCheck("JavaScript syntax", "warn", "No JS files found under js/.");
    return;
  }

  for (const file of jsFiles) {
    const result = childProcess.spawnSync(process.execPath, ["--check", file], {
      cwd: root,
      encoding: "utf8"
    });

    if (result.status === 0) {
      addCheck("JavaScript syntax", "pass", `${file} passed node --check.`);
    } else {
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      addCheck("JavaScript syntax", "fail", `${file} failed node --check.`, output ? [output] : []);
    }
  }
}

function runHtmlReferenceChecks() {
  const brokenRefs = [];

  for (const htmlFile of mainHtmlFiles) {
    if (!existsProjectPath(htmlFile)) {
      continue;
    }

    const html = readText(htmlFile);
    const scriptRefs = extractAttributeReferences(html, "src")
      .map((ref) => resolveLocalReference(htmlFile, ref))
      .filter((ref) => ref.endsWith(".js"));
    const stylesheetRefs = extractAttributeReferences(html, "href")
      .map((ref) => resolveLocalReference(htmlFile, ref))
      .filter((ref) => ref.endsWith(".css"));
    const routeRefs = extractAttributeReferences(html, "href")
      .map((ref) => resolveLocalReference(htmlFile, ref))
      .filter((ref) => ref.endsWith(".html"));

    for (const ref of scriptRefs) {
      if (!existsProjectPath(ref)) {
        brokenRefs.push(`${htmlFile} references missing JS: ${ref}`);
      }
    }

    for (const ref of stylesheetRefs) {
      if (!existsProjectPath(ref)) {
        brokenRefs.push(`${htmlFile} references missing CSS: ${ref}`);
      }
    }

    for (const ref of routeRefs) {
      if (!existsProjectPath(ref)) {
        brokenRefs.push(`${htmlFile} links to missing route: ${ref}`);
      }
    }
  }

  if (brokenRefs.length > 0) {
    addCheck("HTML route/link sanity", "fail", `${brokenRefs.length} broken local reference(s) found.`, brokenRefs);
    return;
  }

  addCheck("HTML route/link sanity", "pass", "Local JS, CSS, and HTML route references resolve.");
}

function runVisibleRouteLabelCheck() {
  const missingLabels = [];

  for (const [route, expectedLabel] of Object.entries(visibleRouteLabels)) {
    if (!existsProjectPath(route)) {
      continue;
    }

    const html = readText(route);
    if (!html.includes(expectedLabel)) {
      missingLabels.push(route + " is missing visible label " + expectedLabel + ".");
    }
  }

  if (missingLabels.length) {
    addCheck("Visible route labels", "fail", missingLabels.length + " visible label expectation(s) failed.", missingLabels);
    return;
  }

  addCheck("Visible route labels", "pass", "Configured visible route labels are present.");
}

function runWorkflowNavigationConsistencyCheck() {
  const failures = [];
  const staleLabels = [];

  if (existsProjectPath("deliverable-builder.html")) {
    failures.push("Unexpected deliverable-builder.html route exists.");
  }

  for (const htmlFile of mainHtmlFiles) {
    if (!existsProjectPath(htmlFile)) continue;
    const html = readText(htmlFile);
    const sidebarStart = html.indexOf('<aside class="app-sidebar"');
    const sidebarEnd = html.indexOf('<section class="sidebar-note"', sidebarStart);
    const navHtml = sidebarStart >= 0 && sidebarEnd > sidebarStart ? html.slice(sidebarStart, sidebarEnd) : html;
    if (/RFP Package Builder|RFP Builder Home/i.test(html)) staleLabels.push(htmlFile);

    for (const staleGroup of ["Client / Project", "Intake &amp; Research", "Intake & Research"]) {
      if (navHtml.includes(`<p class="sidebar-group-label">${staleGroup}</p>`)) {
        failures.push(`${htmlFile} still contains old sidebar group label: ${staleGroup}`);
      }
    }
    if (navHtml.includes('data-sidebar-section-key="client-project"') || navHtml.includes('data-sidebar-section-key="intake-research"') || navHtml.includes('data-sidebar-section-key="requirements"')) {
      failures.push(`${htmlFile} still contains an old sidebar section key.`);
    }

    const groupPositions = workflowNavGroups.map((group) => {
      const labelPosition = navHtml.indexOf(`<p class="sidebar-group-label">${group.label}</p>`);
      const keyPosition = navHtml.indexOf(`data-sidebar-section-key="${group.key}"`);
      return {
        ...group,
        position: labelPosition >= 0 ? labelPosition : keyPosition
      };
    });
    const missingGroups = groupPositions.filter((group) => group.position < 0).map((group) => group.label);
    const groupOrderValid = groupPositions
      .filter((group) => group.position >= 0)
      .every((group, index, groups) => index === 0 || group.position > groups[index - 1].position);

    if (missingGroups.length || !groupOrderValid) {
      failures.push(`${htmlFile}${missingGroups.length ? " missing sidebar groups: " + missingGroups.join(", ") : ""}${!groupOrderValid ? " sidebar group order inconsistent" : ""}`);
    }

    groupPositions.forEach((group, index) => {
      if (group.position < 0) return;
      const nextGroup = groupPositions.slice(index + 1).find((candidate) => candidate.position > group.position);
      const end = nextGroup ? nextGroup.position : navHtml.length;
      const groupHtml = navHtml.slice(group.position, end);
      group.routes.forEach((route) => {
        if (!groupHtml.includes(route)) {
          failures.push(`${htmlFile} does not show ${route} under ${group.label}.`);
        }
      });
    });

    const positions = workflowNavOrder.map((item) => {
      const routePosition = navHtml.indexOf(item.route);
      const labelPosition = navHtml.indexOf(item.label);
      const validPositions = [routePosition, labelPosition].filter((position) => position >= 0);
      return validPositions.length ? Math.min(...validPositions) : -1;
    });
    const missing = workflowNavOrder.filter((_, index) => positions[index] < 0).map((item) => item.label);
    const presentPositions = positions.filter((position) => position >= 0);
    const ordered = presentPositions.every((position, index) => index === 0 || position > presentPositions[index - 1]);
    if (missing.length || !ordered) {
      failures.push(htmlFile + (missing.length ? " missing: " + missing.join(", ") : "") + (!ordered ? " workflow nav order inconsistent" : ""));
    }
    if (navHtml.includes("rfp-package.html") && !navHtml.includes("Deliverable Builder")) {
      failures.push(htmlFile + " links to rfp-package.html without the Deliverable Builder label.");
    }
    const activeLinks = navHtml.match(/<a class="[^"]*\bnav-link\b[^"]*\bactive\b[^"]*" href="[^"]+"/g) || [];
    if (!activeLinks.some((link) => link.includes(`href="${htmlFile}"`))) {
      failures.push(`${htmlFile} does not show active sidebar state for its own route.`);
    }
  }

  if (staleLabels.length) failures.push("Stale runtime label found in: " + staleLabels.join(", "));

  if (failures.length) {
    addCheck("Workflow navigation consistency", "fail", failures.length + " workflow navigation expectation(s) failed.", failures);
    return;
  }

  addCheck("Workflow navigation consistency", "pass", "Workflow navigation groups, routes, labels, order, active states, and stale-label guardrails are consistent.");
}
function runDeliverableBuilderCheck() {
  const route = "rfp-package.html";
  if (!existsProjectPath(route)) {
    addCheck("Deliverable Builder", "fail", "Deliverable Builder route is missing.", [route]);
    return;
  }
  const html = readText(route);
  const failures = [];
  for (const label of deliverableBuilderLabels) {
    if (!html.includes(label)) {
      failures.push(`Missing deliverable label: ${label}`);
    }
  }
  if (!html.includes('data-deliverable-type="rfp_package"')) {
    failures.push("RFP Package selector is missing.");
  }
  if (!html.includes('data-deliverable-type="assessment_report"')) {
    failures.push("Assessment Report selector is missing.");
  }
  for (const expectedCopy of [
    "Deliverable Builder Help",
    "Output Ownership",
    "outline-level Markdown",
    "Requirements Matrix CSV",
    "final client-ready DOCX or PDF",
    "Workspace, Discovery, Analysis, Outputs"
  ]) {
    if (!html.includes(expectedCopy)) failures.push(`Deliverable Builder clarification copy is missing: ${expectedCopy}`);
  }
  if (existsProjectPath("deliverable-builder.html")) {
    failures.push("Unexpected deliverable-builder.html route exists.");
  }
  if (failures.length) {
    addCheck("Deliverable Builder", "fail", `${failures.length} Deliverable Builder expectation(s) failed.`, failures);
    return;
  }
  addCheck("Deliverable Builder", "pass", "Deliverable Builder route and selectable/planned labels are present.");
}


function runTextMarkdownIntakeCheck() {
  const failures = [];
  const sourceHtml = existsProjectPath("client-source-intake.html") ? readText("client-source-intake.html") : "";
  const sourceJs = existsProjectPath("js/client-source-intake.js") ? readText("js/client-source-intake.js") : "";
  const templateHtml = existsProjectPath("client-template-intake.html") ? readText("client-template-intake.html") : "";
  const templateJs = existsProjectPath("js/client-template-intake.js") ? readText("js/client-template-intake.js") : "";

  if (!sourceHtml.includes("client-source-file-preview-panel") || !sourceHtml.includes("client-source-file-metadata") || !sourceHtml.includes("Use Loaded Text")) failures.push("Client Source Intake text/file preview controls are missing.");
  if (!sourceHtml.includes("CSV and JSON can be previewed as plain text only")) failures.push("Client Source Intake does not clearly label CSV/JSON as text-only.");
  if (!sourceJs.includes("validateLocalTextFile") || !sourceJs.includes("allowTextOnlyStructured")) failures.push("Client Source Intake text-only validation helper is missing.");
  if (!sourceJs.includes("FILE_WARN_BYTES = 500 * 1024") || !sourceJs.includes("FILE_BLOCK_BYTES = 2 * 1024 * 1024")) failures.push("Client Source Intake file size guardrails are missing.");
  if (!sourceJs.includes("pendingLoadedFile") || !sourceJs.includes("applyPendingSourceFileText")) failures.push("Client Source Intake does not require explicit use of loaded file text before saving.");
  if (/accept=[^>]*\.docx/i.test(sourceHtml) || /mammoth|readAsArrayBuffer|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i.test(sourceJs)) failures.push("Client Source Intake appears to add DOCX support before the approved Client Source slice.");

  if (!templateHtml.includes("client-template-file-preview-panel") || !templateHtml.includes("client-template-file-metadata") || !templateHtml.includes("Use Loaded Text")) failures.push("Client Template Intake text/file preview controls are missing.");
  if (!templateJs.includes("validateTemplateTextFile") || !templateJs.includes("applyPendingTemplateFileText")) failures.push("Client Template Intake text/Markdown/DOCX preview helper is missing.");
  if (!templateJs.includes("FILE_WARN_BYTES = 500 * 1024") || !templateJs.includes("FILE_BLOCK_BYTES = 2 * 1024 * 1024")) failures.push("Client Template Intake file size guardrails are missing.");
  if (!templateHtml.includes(".docx") || !templateJs.includes("mammoth.extractRawText") || !templateJs.includes("readAsArrayBuffer")) failures.push("Client Template Intake DOCX extraction hook is missing.");
  if (!templateHtml.includes("vendor/mammoth/mammoth.browser.min.js") || !existsProjectPath("vendor/mammoth/mammoth.browser.min.js")) failures.push("Client Template Intake does not load the local Mammoth vendor asset.");

  const combined = [sourceHtml, sourceJs, templateHtml, templateJs].join("\n");
  if (/https?:\/\/[^\"']*(mammoth|unpkg|cdn|jsdelivr)/i.test(combined)) failures.push("Mammoth must be loaded from the local vendor path, not a CDN.");
  if (/pdfjs|pdf\.js|XLSX|SheetJS|Tesseract|ocrad|readAsDataURL|application\/pdf/i.test([sourceJs, templateJs].join("\n"))) failures.push("Text/file intake appears to add unsupported PDF/XLSX/OCR parsing behavior.");
  if (/XMLHttpRequest|openai|navigator\.sendBeacon/i.test([sourceJs, templateJs].join("\n"))) failures.push("Text/file intake appears to add new AI, API, or beacon behavior.");
  if (/new Blob|createObjectURL|download\s*=|application\/pdf/i.test([sourceJs, templateJs].join("\n"))) failures.push("Text/file intake appears to add document generation behavior.");
  if (/Papa\.|parseCSV|parseCsv|csvParse|structured CSV/i.test([sourceJs, templateJs].join("\n"))) failures.push("Text/file intake appears to add structured CSV parsing before CSV Intake v0.");
  if (/sourceFileBytes|originalFileBytes|binaryContent|storedArrayBuffer|localStorage\.setItem\([^)]*arrayBuffer/i.test(templateJs)) failures.push("Client Template Intake appears to store original file bytes.");

  if (failures.length) {
    addCheck("Text/Markdown and DOCX intake foundation", "fail", failures.length + " text/DOCX intake expectation(s) failed.", failures);
    return;
  }

  addCheck("Text/Markdown and DOCX intake foundation", "pass", "Client Source text-only intake and Client Template text/Markdown/DOCX preview guardrails are present.");
}
function runClientTemplateIntakeCheck() {
  const route = "client-template-intake.html";
  const script = "js/client-template-intake.js";
  const failures = [];

  if (!existsProjectPath(route)) {
    failures.push("Client Template Intake route is missing.");
  }
  if (!existsProjectPath(script)) {
    failures.push("Client Template Intake script is missing.");
  }

  if (!failures.length) {
    const html = readText(route);
    const js = readText(script);
    const builderHtml = existsProjectPath("rfp-package.html") ? readText("rfp-package.html") : "";

    if (!html.includes("Client Template Intake")) failures.push("Client Template Intake visible label is missing.");
    if (!html.includes("rfp-package.html")) failures.push("Client Template Intake does not link back to Deliverable Builder.");
    if (!html.includes("js/client-template-intake.js")) failures.push("Client Template Intake script reference is missing.");
    if (!builderHtml.includes("client-template-intake.html")) failures.push("Deliverable Builder does not link to Client Template Intake.");
    if (!html.includes("Template Prep Assist") || !html.includes("Copy Template Prep Prompt")) failures.push("Template Prep Assist panel or copy control is missing.");
    if (!html.includes("client-template-raw-text")) failures.push("Template Text area is missing.");
    if (!html.includes("client-template-extract")) failures.push("Extract Suggested Sections control is missing.");
    if (!js.includes("handleCopyPrepPrompt")) failures.push("Template Prep Assist copy behavior is missing.");
    if (!js.includes("rfpWorkspace:") || !js.includes(":clientTemplates")) failures.push("Client template storage key is not workspace-scoped as expected.");
    if (/data\/[A-Za-z0-9_.\/-]+\.json/.test(js)) failures.push("Client Template Intake references data JSON files unexpectedly.");
    if (/XMLHttpRequest|openai|navigator\.sendBeacon/i.test(js)) failures.push("Client Template Intake appears to add API/AI/network behavior.");
    if (!html.includes("vendor/mammoth/mammoth.browser.min.js") || !existsProjectPath("vendor/mammoth/mammoth.browser.min.js")) failures.push("Client Template Intake local Mammoth vendor asset is missing.");
    if (!html.includes(".docx") || !js.includes("mammoth.extractRawText") || !js.includes("readAsArrayBuffer")) failures.push("Client Template Intake DOCX text extraction is missing.");
    if (/https?:\/\/[^\"']*(mammoth|unpkg|cdn|jsdelivr)/i.test(html + "\n" + js)) failures.push("Client Template Intake appears to load Mammoth from a CDN instead of the local vendor path.");
    if (/pdfjs|pdf\.js|XLSX|SheetJS|Tesseract|ocrad|readAsDataURL|application\/pdf/i.test(js)) failures.push("Client Template Intake appears to add unsupported PDF/XLSX/OCR parsing behavior.");
    if (/sourceFileBytes|originalFileBytes|binaryContent|storedArrayBuffer|localStorage\.setItem\([^)]*arrayBuffer/i.test(js)) failures.push("Client Template Intake appears to store original file bytes.");
  }

  if (failures.length) {
    addCheck("Client Template Intake", "fail", failures.length + " Client Template Intake expectation(s) failed.", failures);
    return;
  }

  addCheck("Client Template Intake", "pass", "Client Template Intake route, links, scoped storage, and guardrails are present.");
}

function runDeliverableTemplateSystemCheck() {
  const failures = [];
  const catalogPath = "data/deliverable-templates.json";

  if (!existsProjectPath(catalogPath)) {
    failures.push("MCP deliverable template catalog is missing.");
  } else {
    try {
      const catalog = JSON.parse(readText(catalogPath));
      const templates = Array.isArray(catalog.templates) ? catalog.templates : [];
      const expectedTypes = ["rfp_package", "assessment_report", "executive_briefing", "implementation_plan", "requirements_matrix", "evaluation_scoring_package"];
      for (const type of expectedTypes) {
        if (!templates.some((template) => template.deliverableType === type)) failures.push(`Missing MCP template for ${type}.`);
      }
      if (templates.some((template) => !Array.isArray(template.sections) || !template.sections.length)) failures.push("One or more MCP templates are missing sections.");
    } catch (error) {
      failures.push(`MCP deliverable template catalog is malformed: ${error.message}`);
    }
  }

  const builderHtml = existsProjectPath("rfp-package.html") ? readText("rfp-package.html") : "";
  const builderJs = existsProjectPath("js/rfp-package.js") ? readText("js/rfp-package.js") : "";
  const homeJs = existsProjectPath("js/home.js") ? readText("js/home.js") : "";
  const homeHtml = existsProjectPath("index.html") ? readText("index.html") : "";

  if (!builderHtml.includes("Deliverable Builder")) failures.push("Deliverable Builder visible label is missing.");
  if (builderHtml.includes("How This Page Works")) failures.push("Large Deliverable Builder instructional block is still visible by default.");
  if (!builderHtml.includes("deliverable-builder-help-toggle") || !builderHtml.includes("id=\"deliverable-builder-help-popout\"") || !builderHtml.includes("deliverable-help-popout hidden")) failures.push("Deliverable Builder compact Help control is missing or visible by default.");
  if (!builderJs.includes("buildDeliverableReadinessStages") || !builderJs.includes("Workspace") || !builderJs.includes("Discovery") || !builderJs.includes("Analysis") || !builderJs.includes("Outputs")) failures.push("Deliverable Builder readiness path is not aligned to staged workflow groups.");
  if (!builderJs.includes("setDeliverableHelpOpen") || !builderJs.includes("Escape")) failures.push("Deliverable Builder Help popout close behavior is missing.");
  if (!builderJs.includes("deliverablePreferences")) failures.push("Deliverable Builder does not reference workspace-scoped deliverable preferences.");
  if (!builderJs.includes("data/deliverable-templates.json")) failures.push("Deliverable Builder does not load the MCP deliverable template catalog.");
  const builderSetItemCount = (builderJs.match(/localStorage\.setItem/g) || []).length;
  if (builderSetItemCount > 1 || (builderSetItemCount === 1 && !builderJs.includes("scopedKey(workspaceId, \"deliverablePreferences\")"))) failures.push("Deliverable Builder localStorage writes are not limited to the approved workspace-scoped deliverablePreferences key.");
  if (!homeJs.includes("deliverablePreferences") || !homeHtml.includes("home-deliverable-readiness")) failures.push("Home deliverable readiness card is not wired.");
  if (!homeHtml.includes("rfp-package.html")) failures.push("Home does not link to Deliverable Builder.");
  if (existsProjectPath("deliverable-builder.html")) failures.push("Unexpected deliverable-builder.html route exists.");
  if (/docx|pdf|ocr|openai|\bapi\b/i.test(builderJs.replace(/text\/markdown/g, ""))) failures.push("Deliverable Builder appears to add prohibited parsing, AI, or API behavior.");

  if (failures.length) {
    addCheck("Deliverable Template System", "fail", failures.length + " deliverable template system expectation(s) failed.", failures);
    return;
  }

  addCheck("Deliverable Template System", "pass", "Template source selector, MCP catalog, scoped preferences, and Home readiness wiring are present.");
}

function runAssessmentFindingsCheck() {
  const route = "assessment-findings.html";
  const script = "js/assessment-findings.js";
  const failures = [];

  if (!existsProjectPath(route)) failures.push("Assessment Findings route is missing.");
  if (!existsProjectPath(script)) failures.push("Assessment Findings script is missing.");

  if (!failures.length) {
    const html = readText(route);
    const js = readText(script);
    const builderHtml = existsProjectPath("rfp-package.html") ? readText("rfp-package.html") : "";
    const builderJs = existsProjectPath("js/rfp-package.js") ? readText("js/rfp-package.js") : "";
    const homeJs = existsProjectPath("js/home.js") ? readText("js/home.js") : "";
    const workspacesJs = existsProjectPath("js/workspaces.js") ? readText("js/workspaces.js") : "";

    if (!html.includes("Assessment Findings")) failures.push("Assessment Findings visible label is missing.");
    if (!html.includes("js/assessment-findings.js")) failures.push("Assessment Findings script reference is missing.");
    if (!html.includes("rfp-package.html")) failures.push("Assessment Findings does not link to Deliverable Builder.");
    if (!readText("index.html").includes("assessment-findings.html")) failures.push("Home navigation does not link to Assessment Findings.");
    if (!builderHtml.includes("assessment-findings.html")) failures.push("Deliverable Builder does not link to Assessment Findings.");
    if (!homeJs.includes("assessmentFindings")) failures.push("Home does not read Assessment Findings for readiness context.");
    if (!builderJs.includes("assessmentFindings")) failures.push("Deliverable Builder does not read Assessment Findings for Assessment Report context.");
    if (!workspacesJs.includes('"assessmentFindings"')) failures.push("assessmentFindings is not included in workspace scoped copy/delete handling.");
    if (!js.includes("rfpWorkspace:") || !js.includes("assessmentFindings") || !js.includes("scopedKey(state.workspace.id, STORAGE_ITEM)")) failures.push("Assessment Findings storage key is not workspace-scoped as expected.");
    if (!js.includes("sourceReferences") || !js.includes("manual-note")) failures.push("Manual source references are not present.");
    if (!js.includes("needs-review") || !js.includes("critical")) failures.push("Approved status/severity values are missing.");
    if (!html.includes("Assessment Findings Assist") || !html.includes("assessment-findings-assist-json") || !html.includes("Import Draft Findings")) failures.push("Assessment Findings Assist panel or import controls are missing.");
    if (!html.includes("Paste structured findings JSON for review/import.") || !html.includes("Import draft findings from a CSV issue log, gap list, or risk register.")) failures.push("Assessment Findings compact assist/import summaries are missing.");
    const css = existsProjectPath("css/styles.css") ? readText("css/styles.css") : "";
    if (!css.includes("Global app content right gutter") || !css.includes("padding-inline: clamp")) failures.push("Global app content right gutter CSS is missing.");
    if (!css.includes("Assessment Findings right-gutter layout refinement") || !css.includes("assessment-findings-filters .field-label:first-child")) failures.push("Assessment Findings layout/filter sizing refinement CSS is missing.");
    if (!html.includes("assessment-findings-search") || !html.includes("assessment-findings-type-filter") || !html.includes("assessment-findings-status-filter") || !html.includes("assessment-findings-severity-filter") || !html.includes("assessment-findings-reset-filters")) failures.push("Assessment Findings search/filter/reset controls are missing.");
    if (!js.includes("ASSIST_PROMPT_VERSION") || !js.includes("assessment-findings-assist-v1")) failures.push("Assessment Findings Assist prompt version is missing.");
    if (!js.includes("importBatchId") || !js.includes("importedAt") || !js.includes("importSource") || !js.includes("external-ai-assist")) failures.push("Assessment Findings Assist import metadata is missing.");
    if (!js.includes("ASSIST_MAX_WARNING_COUNT = 25") || !js.includes("ASSIST_MAX_BLOCK_COUNT = 50")) failures.push("Assessment Findings Assist batch-size guardrails are missing.");
    if (!html.includes("Insert Sample JSON") || !js.includes("buildAssistSampleJson")) failures.push("Assessment Findings Assist sample JSON helper is missing.");
    if (!js.includes("is not supported for Assessment Findings import") || !js.includes("assistType is missing")) failures.push("Assessment Findings Assist schema/assistType validation is not hardened.");
    if (!js.includes("sourceReferences must be an array") || !js.includes("tags were supplied as a string")) failures.push("Assessment Findings Assist source reference/tag warnings are missing.");
    if (!js.includes("getAssistImportStatus") || !js.includes("status: record.finding.status === \"needs-review\" ? \"needs-review\" : \"draft\"")) failures.push("Assessment Findings Assist import status hardening is missing.");
    if (!js.includes("AI-provided status") || !js.includes("ignored; imported status is Draft or Needs Review only")) failures.push("Assessment Findings Assist does not visibly downgrade AI-provided statuses.");
    if (!js.includes("Possible duplicate: existing finding has the same summary") || !js.includes("Possible duplicate within this import batch: same summary")) failures.push("Assessment Findings Assist duplicate warning hardening is missing.");
    if (!html.includes("CSV Import") || !html.includes("assessment-findings-csv-text") || !html.includes("assessment-findings-import-csv")) failures.push("Assessment Findings CSV Import panel or controls are missing.");
    if (!js.includes("CSV_IMPORT_SOURCE = \"csv-import\"") || !js.includes("parseCsvRows") || !js.includes("validateCsvMappedRows") || !js.includes("handleImportCsvFindings")) failures.push("Assessment Findings CSV parser, validation, or import functions are missing.");
    if (!js.includes("CSV_MAX_WARNING_ROWS = 50") || !js.includes("CSV_MAX_BLOCK_ROWS = 200")) failures.push("Assessment Findings CSV batch-size guardrails are missing.");
    if (!js.includes("sourceRowNumber") || !js.includes("sourceFileName") || !js.includes("importSource: CSV_IMPORT_SOURCE")) failures.push("Assessment Findings CSV import metadata is missing.");
    if (!js.includes("Untitled CSV finding - row") || !js.includes("CSV status") || !js.includes("Draft or Needs Review only")) failures.push("Assessment Findings CSV default title/status downgrade guardrails are missing.");
    if (!js.includes("Formula-like value preserved as plain text")) failures.push("Assessment Findings CSV formula-like value warning is missing.");
    if (/Papa\.|Papa Parse|papaparse/i.test(js)) failures.push("Assessment Findings CSV Import appears to add Papa Parse or another CSV dependency before approval.");
    if (/XLSX|SheetJS/i.test(js)) failures.push("Assessment Findings appears to add XLSX/SheetJS parsing behavior.");
    if (/sourceFileBytes|originalFileBytes|rawCsvContent|fullRawCsv|binaryContent|storedArrayBuffer/i.test(js)) failures.push("Assessment Findings appears to store original CSV file bytes or full raw CSV content.");
    if (/fetch\s*\(|XMLHttpRequest|openai|\bapi\b/i.test(js)) failures.push("Assessment Findings appears to add network, AI, or API behavior.");
    if (/docx|pdf|ocr/i.test(js)) failures.push("Assessment Findings appears to add Word/PDF/OCR parsing behavior.");
    if (/Blob|createObjectURL|download|text\/markdown|application\/pdf/i.test(js)) failures.push("Assessment Findings appears to add document/export generation behavior.");
    const formatterStart = builderJs.indexOf("function formatAssessmentMarkdown");
    const formatterEnd = formatterStart >= 0 ? builderJs.indexOf("function setStatus", formatterStart) : -1;
    const formatter = formatterStart >= 0 && formatterEnd > formatterStart ? builderJs.slice(formatterStart, formatterEnd) : "";
    if (/assessmentFindings|Assessment Findings/.test(formatter)) failures.push("Deliverable Builder Assessment Report Markdown formatter appears to include Assessment Findings content.");
  }

  if (failures.length) {
    addCheck("Assessment Findings", "fail", failures.length + " Assessment Findings expectation(s) failed.", failures);
    return;
  }

  addCheck("Assessment Findings", "pass", "Assessment Findings route, scoped storage, links, and guardrails are present.");
}

function runAdminNavOrderCheck() {
  const incorrectPages = [];
  const skippedPages = [];

  for (const htmlFile of mainHtmlFiles) {
    if (!existsProjectPath(htmlFile)) {
      continue;
    }

    const html = readText(htmlFile);
    const adminNav = extractAdminNavBlock(html);

    if (!adminNav) {
      skippedPages.push(htmlFile);
      continue;
    }

    const positions = adminNavOrder.map((item) => {
      const labelPosition = adminNav.indexOf(item.label);
      const routePosition = adminNav.indexOf(item.route);
      const validPositions = [labelPosition, routePosition].filter((position) => position >= 0);
      return validPositions.length > 0 ? Math.min(...validPositions) : -1;
    });

    const missing = adminNavOrder
      .filter((_, index) => positions[index] < 0)
      .map((item) => item.label);
    const presentPositions = positions.filter((position) => position >= 0);
    const ordered = presentPositions.every((position, index) => index === 0 || position > presentPositions[index - 1]);

    if (missing.length > 0 || !ordered) {
      incorrectPages.push(`${htmlFile}${missing.length ? ` missing: ${missing.join(", ")}` : ""}${!ordered ? " order incorrect" : ""}`);
    }
  }

  if (incorrectPages.length > 0) {
    addCheck("Admin nav order", "fail", "Admin navigation order is missing or incorrect on one or more pages.", incorrectPages);
    return;
  }

  if (skippedPages.length === mainHtmlFiles.length) {
    addCheck("Admin nav order", "warn", "No Admin navigation references found on main pages.");
    return;
  }

  addCheck("Admin nav order", "pass", "Admin navigation order is correct where Admin navigation exists.");
}

function runProtectedDataCheck() {
  addCheck(
    "Protected data/source guardrails",
    "pass",
    "Validation is read-only; protected data/source paths are not targeted for mutation.",
    protectedPaths
  );
}

function runJsonValidityChecks() {
  const jsonFiles = listFilesRecursive("data", (file) => file.endsWith(".json"));
  const malformed = [];

  for (const file of jsonFiles) {
    try {
      JSON.parse(readText(file));
    } catch (error) {
      malformed.push(`${file}: ${error.message}`);
    }
  }

  if (malformed.length > 0) {
    addCheck("JSON validity", "fail", `${malformed.length} malformed JSON file(s) found.`, malformed);
    return;
  }

  addCheck("JSON validity", "pass", `${jsonFiles.length} JSON file(s) under data/ parsed successfully.`);
}

function runWorkspaceStorageScopeCheck() {
  const failures = [];
  const workspacesJs = existsProjectPath("js/workspaces.js") ? readText("js/workspaces.js") : "";
  const builderHtml = existsProjectPath("rfp-package.html") ? readText("rfp-package.html") : "";
  const builderJs = existsProjectPath("js/rfp-package.js") ? readText("js/rfp-package.js") : "";
  const clientTemplateJs = existsProjectPath("js/client-template-intake.js") ? readText("js/client-template-intake.js") : "";
  const assessmentJs = existsProjectPath("js/assessment-findings.js") ? readText("js/assessment-findings.js") : "";
  const scopedStart = workspacesJs.indexOf("const SCOPED_ITEMS");
  const workspaceIdStart = workspacesJs.indexOf("const WORKSPACE_ID_SCOPED_ITEMS");
  const scopedBlock = scopedStart >= 0 && workspaceIdStart > scopedStart ? workspacesJs.slice(scopedStart, workspaceIdStart) : "";
  const workspaceIdBlock = workspaceIdStart >= 0 ? workspacesJs.slice(workspaceIdStart, workspacesJs.indexOf("function readJson", workspaceIdStart)) : "";

  for (const item of ["clientTemplates", "deliverablePreferences", "assessmentFindings"]) {
    if (!scopedBlock.includes('\"' + item + '\"')) failures.push(item + " is missing from SCOPED_ITEMS copy/delete handling.");
  }
  if (workspaceIdBlock.includes('\"assessmentFindings\"')) failures.push("assessmentFindings should not be in WORKSPACE_ID_SCOPED_ITEMS for v0.");
  if (!clientTemplateJs.includes("rfpWorkspace:") || !clientTemplateJs.includes(":clientTemplates")) failures.push("clientTemplates storage is not visibly workspace-scoped.");
  if (!builderJs.includes('scopedKey(workspaceId, \"deliverablePreferences\")')) failures.push("deliverablePreferences storage is not visibly workspace-scoped.");
  if (!assessmentJs.includes("scopedKey(state.workspace.id, STORAGE_ITEM)") || !assessmentJs.includes("assessmentFindings")) failures.push("assessmentFindings storage is not visibly workspace-scoped.");

  if (failures.length) {
    addCheck("Workspace storage scope", "fail", failures.length + " workspace storage guardrail(s) failed.", failures);
    return;
  }

  addCheck("Workspace storage scope", "pass", "Client templates, deliverable preferences, and assessment findings remain workspace-scoped and copy/delete-aware.");
}

function runRequirementsReviewOutputBuilderCheck() {
  const failures = [];
  const previewHtml = existsProjectPath("preview.html") ? readText("preview.html") : "";
  const requirementsJs = existsProjectPath("js/requirements-engine.js") ? readText("js/requirements-engine.js") : "";
  const exportJs = existsProjectPath("js/export.js") ? readText("js/export.js") : "";
  const workspacesJs = existsProjectPath("js/workspaces.js") ? readText("js/workspaces.js") : "";

  for (const expected of [
    "Requirements Review Outputs",
    "Brief + enhanced CSV for client review",
    "copy-review-brief",
    "download-review-brief",
    "download-enhanced-requirements-csv",
    "requirements-output-help-toggle",
    "requirements-output-help-popout",
    "Copy Selected Requirements",
    "Download Selected Requirements",
    "Download Requirements Matrix CSV"
  ]) {
    if (!previewHtml.includes(expected)) failures.push("Compact Requirements Review output markup is missing: " + expected);
  }

  if (previewHtml.includes("requirements-output-builder-grid") || previewHtml.includes("requirements-output-card")) {
    failures.push("Large three-card Requirements Review output builder layout is still present in preview.html.");
  }
  if (!previewHtml.includes('requirements-output-help-popout hidden')) {
    failures.push("Requirements Review Outputs help popout is not hidden by default.");
  }

  for (const expected of [
    "copy-requirements",
    "download-requirements",
    "download-requirements-csv"
  ]) {
    if (!previewHtml.includes(expected)) failures.push("Existing Requirements Review export control is missing: " + expected);
  }

  for (const expected of [
    "window.rfpRequirementsReviewBriefMarkdown",
    "formatRequirementsReviewBriefMarkdown",
    "window.rfpEnhancedRequirementsMatrixCsv",
    "formatEnhancedRequirementsMatrixCsv"
  ]) {
    if (!requirementsJs.includes(expected)) failures.push("Requirements Review output generator is missing: " + expected);
  }

  for (const expected of [
    "getReviewBriefMarkdown",
    "copyReviewBrief",
    "downloadReviewBrief",
    "getEnhancedRequirementsCsv",
    "downloadEnhancedRequirementsCsv",
    "setOutputHelpOpen",
    "toggleOutputHelp",
    "requirements-output-help-toggle"
  ]) {
    if (!exportJs.includes(expected)) failures.push("Requirements Review output handler is missing: " + expected);
  }

  for (const expected of [
    "getRequirementsReviewBriefFileName",
    "getEnhancedRequirementsMatrixExportFileName",
    "Requirements Review Brief",
    "Enhanced Requirements Matrix"
  ]) {
    if (!workspacesJs.includes(expected)) failures.push("Requirements Review output filename helper is missing: " + expected);
  }

  const briefStart = requirementsJs.indexOf("function formatRequirementsReviewBriefMarkdown");
  const briefEnd = briefStart >= 0 ? requirementsJs.indexOf("function formatProjectContextLines", briefStart) : -1;
  const briefFormatter = briefStart >= 0 && briefEnd > briefStart ? requirementsJs.slice(briefStart, briefEnd) : "";
  if (!briefFormatter) {
    failures.push("Requirements Review Brief formatter body could not be inspected.");
  } else if (/formatRequirementBlock|requirement\.text|Requirement Text/i.test(briefFormatter)) {
    failures.push("Requirements Review Brief appears to include full requirement-by-requirement detail.");
  }

  const enhancedStart = requirementsJs.indexOf("function formatEnhancedRequirementsMatrixCsv");
  const enhancedEnd = enhancedStart >= 0 ? requirementsJs.indexOf("function formatRequirementText", enhancedStart) : -1;
  const enhancedFormatter = enhancedStart >= 0 && enhancedEnd > enhancedStart ? requirementsJs.slice(enhancedStart, enhancedEnd) : "";
  for (const header of [
    "Client Review Decision",
    "Client Comment",
    "Final Disposition",
    "Final Requirement Text",
    "MCP Notes"
  ]) {
    if (!enhancedFormatter.includes(header)) failures.push("Enhanced Requirements Matrix CSV header is missing: " + header);
  }
  if (!enhancedFormatter.includes(".filter(isExportable)")) {
    failures.push("Enhanced Requirements Matrix CSV does not visibly preserve exportable/excluded requirement filtering.");
  }

  if (!requirementsJs.includes("window.rfpSelectedRequirementsText") || !requirementsJs.includes("window.rfpRequirementsMatrixCsv")) {
    failures.push("Existing Requirements Review export globals are missing.");
  }

  if (/openai|XMLHttpRequest|navigator\.sendBeacon|https?:\/\//i.test([requirementsJs, exportJs].join("\n"))) {
    failures.push("Requirements Review output builder appears to add AI/API/network-style behavior.");
  }
  if (/docx|pdf|xlsx/i.test([previewHtml, exportJs].join("\n"))) {
    failures.push("Requirements Review output builder appears to add DOCX/PDF/XLSX output claims or handlers.");
  }

  if (failures.length) {
    addCheck("Requirements Review Output Builder", "fail", failures.length + " Requirements Review output expectation(s) failed.", failures);
    return;
  }

  addCheck("Requirements Review Output Builder", "pass", "Compact Review Brief Markdown and Enhanced Requirements Matrix CSV controls, Help popout, generators, and guardrails are present.");
}
function runFilenameAndDownloadGuardrailsCheck() {
  const failures = [];
  const workspacesJs = existsProjectPath("js/workspaces.js") ? readText("js/workspaces.js") : "";
  const exportJs = existsProjectPath("js/export.js") ? readText("js/export.js") : "";
  const builderHtml = existsProjectPath("rfp-package.html") ? readText("rfp-package.html") : "";
  const builderJs = existsProjectPath("js/rfp-package.js") ? readText("js/rfp-package.js") : "";

  if (!builderJs.includes("Procurement Workbench - ${workspaceName} - ${deliverableName} - ${dateStamp}.md")) failures.push("Deliverable Builder clean Markdown filename pattern is missing.");
  if (!workspacesJs.includes("Requirements Review - Selected Requirements") || !exportJs.includes("Selected Requirements")) failures.push("Selected requirements filename polish is missing.");
  if (!workspacesJs.includes("Requirements Matrix") || !exportJs.includes("Requirements Matrix")) failures.push("Requirements Matrix filename polish is missing.");
  if (!workspacesJs.includes("Requirements Review Brief") || !exportJs.includes("getRequirementsReviewBriefFileName")) failures.push("Requirements Review Brief filename polish is missing.");
  if (!workspacesJs.includes("Enhanced Requirements Matrix") || !exportJs.includes("getEnhancedRequirementsMatrixExportFileName")) failures.push("Enhanced Requirements Matrix filename polish is missing.");
  const formatterStart = builderJs.indexOf("function formatAssessmentMarkdown");
  const formatterEnd = formatterStart >= 0 ? builderJs.indexOf("function setStatus", formatterStart) : -1;
  const formatter = formatterStart >= 0 && formatterEnd > formatterStart ? builderJs.slice(formatterStart, formatterEnd) : "";
  if (/assessmentFindings|Assessment Findings/.test(formatter)) failures.push("Assessment Findings appears to alter Deliverable Builder Assessment Report Markdown output.");

  if (failures.length) {
    addCheck("Filename/download guardrails", "fail", failures.length + " filename or download guardrail(s) failed.", failures);
    return;
  }

  addCheck("Filename/download guardrails", "pass", "Filename polish remains present and Assessment Findings does not alter Deliverable Builder Markdown content.");
}


function runPublicResearchApplyGuardrailsCheck() {
  const failures = [];
  const publicJs = existsProjectPath("js/public-information-ai-assist.js") ? readText("js/public-information-ai-assist.js") : "";
  const publicHtml = existsProjectPath("public-information-ai-assist.html") ? readText("public-information-ai-assist.html") : "";
  const reviewQueueJs = existsProjectPath("js/review-queue.js") ? readText("js/review-queue.js") : "";
  const homeJs = existsProjectPath("js/home.js") ? readText("js/home.js") : "";

  if (!publicJs.includes('"user_count"') || !publicJs.includes('"timeline"')) failures.push("Public Research suggested-answer mapping does not include user_count and timeline.");
  if (!publicJs.includes("Apply to Project Intake") || !publicJs.includes("Review / Apply") || !publicJs.includes("Mark applied")) failures.push("Public Research apply action labels are missing.");
  if (!publicJs.includes("Replace answer") || !publicJs.includes("Add value")) failures.push("Public Research confirmation action labels are missing.");
  if (!publicJs.includes("appliedToProjectIntake") || !publicJs.includes("targetAnswerKey") || !publicJs.includes("projectIntakeSavedAt")) failures.push("Public Research applied attribution metadata is missing.");
  if (!publicJs.includes("getSuggestionApplyState") || !publicJs.includes("requiresConfirmation") || !publicJs.includes('action === "replace_answer"')) failures.push("Public Research apply confirmation guard is missing.");
  if (!publicJs.includes('confidence !== "high"')) failures.push("Public Research one-click apply does not appear limited to high-confidence blank/empty targets.");
  if (!publicJs.includes("window.RfpWorkspaces.saveAnswers(nextAnswers)")) failures.push("Public Research does not visibly use the workspace Project Intake save helper for apply.");
  if (!publicJs.includes('applyAction: currentState.action')) failures.push("Public Research applied action metadata is missing.");
  if (publicJs.includes("rfpWorkspace:${workspaceId}:answers") || publicJs.includes(":answers:public")) failures.push("Public Research appears to introduce a changed Project Intake answer storage key or answer attribution key.");
  if (/data-fact-action=["'][^"']*apply/i.test(publicJs) || /data-fact-action=["'][^"']*apply/i.test(publicHtml)) failures.push("Public facts appear to expose a direct apply action.");
  if (/saveAnswers|localStorage\.setItem|localStorage\.removeItem|localStorage\.clear/.test(reviewQueueJs)) failures.push("Review Queue contains write behavior after Public Research apply planning.");
  if (/saveAnswers|localStorage\.setItem|localStorage\.removeItem|localStorage\.clear/.test(homeJs)) failures.push("Home contains write behavior after Public Research apply planning.");

  if (failures.length) {
    addCheck("Public Research apply guardrails", "fail", failures.length + " Public Research apply guardrail(s) failed.", failures);
    return;
  }

  addCheck("Public Research apply guardrails", "pass", "Public Research apply-with-confirmation mapping, attribution, and read-only boundary guardrails are present.");
}
function runForbiddenBehaviorScans() {
  const scans = [
    {
      file: "js/data-health.js",
      patterns: [
        "localStorage.setItem",
        "localStorage.removeItem",
        "localStorage.clear"
      ]
    },
    {
      file: "js/review-queue.js",
      patterns: [
        "localStorage.setItem",
        "localStorage.removeItem",
        "localStorage.clear",
        "saveAnswers",
        "saveReviewDecisions",
        "saveProjectPlanItems",
        "\\bsave[A-Za-z0-9_]*\\s*\\("
      ]
    },
    {
      file: "js/rfp-package.js",
      patterns: [
        "localStorage.removeItem",
        "localStorage.clear",
        "saveAnswers",
        "saveReviewDecisions",
        "saveProjectPlanItems",
        "saveProjectRoadmap",
        "saveProjectSpecificRequirements"
      ]
    }
  ];

  for (const scan of scans) {
    if (!existsProjectPath(scan.file)) {
      addCheck("Forbidden behavior scans", "warn", `${scan.file} not found; skipped static scan.`);
      continue;
    }

    const text = readText(scan.file);
    const hits = [];

    for (const pattern of scan.patterns) {
      const regex = new RegExp(pattern, "g");
      const matches = text.match(regex);
      if (matches) {
        hits.push(`${pattern}: ${matches.length}`);
      }
    }

    if (hits.length > 0) {
      addCheck("Forbidden behavior scans", "fail", `${scan.file} contains forbidden write behavior.`, hits);
    } else {
      addCheck("Forbidden behavior scans", "pass", `${scan.file} contains no forbidden write behavior from the configured scan.`);
    }
  }
}

function httpGetStatus(pathname) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port: 8000,
        path: pathname,
        timeout: 2000
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve({ ok: true, statusCode: response.statusCode }));
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ ok: false, error: "timeout" });
    });

    request.on("error", (error) => {
      resolve({ ok: false, error: error.message });
    });
  });
}

async function runHttpChecks() {
  const base = await httpGetStatus("/");

  if (!base.ok) {
    addCheck("Local HTTP checks", "warn", "Local HTTP server not reachable; skipped HTTP checks.", [base.error || "unknown error"]);
    return;
  }

  const failures = [];

  for (const htmlFile of mainHtmlFiles) {
    const result = await httpGetStatus(`/${htmlFile}`);
    if (!result.ok || result.statusCode !== 200) {
      failures.push(`${htmlFile}: ${result.statusCode || result.error || "unreachable"}`);
    }
  }

  if (failures.length > 0) {
    addCheck("Local HTTP checks", "fail", `${failures.length} page(s) failed HTTP checks.`, failures);
    return;
  }

  addCheck("Local HTTP checks", "pass", `Local server returned HTTP 200 for ${mainHtmlFiles.length} main page(s).`);
}

function printReport() {
  const totals = checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { pass: 0, warn: 0, fail: 0 }
  );
  const overall = totals.fail > 0 ? "FAIL" : totals.warn > 0 ? "WARN" : "PASS";
  const sections = [...new Set(checks.map((check) => check.section))];

  console.log("Procurement Workbench validation");
  console.log(`Overall result: ${overall}`);
  console.log(`Pass: ${totals.pass}  Warn: ${totals.warn}  Fail: ${totals.fail}`);
  console.log("");

  for (const section of sections) {
    console.log(section);
    for (const check of checks.filter((item) => item.section === section)) {
      console.log(`  [${check.status.toUpperCase()}] ${check.message}`);
      for (const detail of check.details) {
        console.log(`    - ${detail}`);
      }
    }
    console.log("");
  }

  if (totals.fail > 0) {
    console.log("Suggested next step: fix failing validation items, then rerun `node tools/validate-workbench.js`.");
  } else {
    console.log("Suggested next step: complete the manual browser validation checklist for visual and interaction behavior.");
  }
}

async function main() {
  runRequiredFileCheck();
  runJavaScriptSyntaxChecks();
  runHtmlReferenceChecks();
  runVisibleRouteLabelCheck();
  runWorkflowNavigationConsistencyCheck();
  runDeliverableBuilderCheck();
  runTextMarkdownIntakeCheck();
  runClientTemplateIntakeCheck();
  runAssessmentFindingsCheck();
  runDeliverableTemplateSystemCheck();
  runAdminNavOrderCheck();
  runProtectedDataCheck();
  runJsonValidityChecks();
  runWorkspaceStorageScopeCheck();
  runRequirementsReviewOutputBuilderCheck();
  runFilenameAndDownloadGuardrailsCheck();
  runPublicResearchApplyGuardrailsCheck();
  runForbiddenBehaviorScans();
  await runHttpChecks();
  printReport();

  const hasFailures = checks.some((check) => check.status === "fail");
  process.exitCode = hasFailures ? 1 : 0;
}

main().catch((error) => {
  addCheck("Harness runtime", "fail", error.message || String(error));
  printReport();
  process.exitCode = 1;
});




























