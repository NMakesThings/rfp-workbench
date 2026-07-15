(function () {
  const copyButton = document.getElementById("copy-requirements");
  const downloadButton = document.getElementById("download-requirements");
  const downloadCsvButton = document.getElementById("download-requirements-csv");
  const copyReviewBriefButton = document.getElementById("copy-review-brief");
  const downloadReviewBriefButton = document.getElementById("download-review-brief");
  const downloadEnhancedCsvButton = document.getElementById("download-enhanced-requirements-csv");
  const outputHelpToggle = document.getElementById("requirements-output-help-toggle");
  const outputHelpPopout = document.getElementById("requirements-output-help-popout");
  const outputHelpClose = document.getElementById("requirements-output-help-close");
  const summary = document.getElementById("preview-summary");

  function getRequirementsText() {
    return window.rfpSelectedRequirementsText || "";
  }

  function setStatus(message, isError) {
    summary.textContent = message;
    summary.classList.toggle("error", Boolean(isError));
    summary.classList.add("status-message");
  }

  function setOutputHelpOpen(open) {
    if (!outputHelpToggle || !outputHelpPopout) {
      return;
    }

    outputHelpPopout.classList.toggle("hidden", !open);
    outputHelpToggle.setAttribute("aria-expanded", String(open));

    if (open && outputHelpClose) {
      outputHelpClose.focus();
    }
  }

  function isOutputHelpOpen() {
    return Boolean(outputHelpPopout && !outputHelpPopout.classList.contains("hidden"));
  }

  function toggleOutputHelp() {
    setOutputHelpOpen(!isOutputHelpOpen());
  }

  function closeOutputHelp(event) {
    if (event) {
      event.stopPropagation();
    }
    setOutputHelpOpen(false);
  }

  async function copyRequirements() {
    const text = getRequirementsText();

    if (!text) {
      setStatus("No requirements are available to copy.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied selected requirements to the clipboard.", false);
    } catch (error) {
      setStatus("Clipboard access was blocked by the browser.", true);
    }
  }

  function downloadRequirements() {
    const text = getRequirementsText();

    if (!text) {
      setStatus("No requirements are available to download.", true);
      return;
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const fileName = window.RfpWorkspaces
      ? window.RfpWorkspaces.getExportFileName()
      : `Procurement Workbench - Untitled Workspace - Requirements Review - Selected Requirements - ${new Date().toISOString().slice(0, 10)}.txt`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`, false);
  }

  function getRequirementsCsv() {
    return window.rfpRequirementsMatrixCsv || "";
  }

  function getCsvFileName() {
    if (window.RfpWorkspaces?.getRequirementsMatrixExportFileName) {
      return window.RfpWorkspaces.getRequirementsMatrixExportFileName();
    }

    return `Procurement Workbench - Untitled Workspace - Requirements Matrix - ${new Date().toISOString().slice(0, 10)}.csv`;
  }

  function downloadRequirementsCsv() {
    const csv = getRequirementsCsv();

    if (!csv) {
      setStatus("No requirements matrix is available to download.", true);
      return;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = getCsvFileName();

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`, false);
  }


  function getReviewBriefMarkdown() {
    return window.rfpRequirementsReviewBriefMarkdown || "";
  }

  function getReviewBriefFileName() {
    if (window.RfpWorkspaces?.getRequirementsReviewBriefFileName) {
      return window.RfpWorkspaces.getRequirementsReviewBriefFileName();
    }

    return `Procurement Workbench - Untitled Workspace - Requirements Review Brief - ${new Date().toISOString().slice(0, 10)}.md`;
  }

  function getEnhancedRequirementsCsv() {
    return window.rfpEnhancedRequirementsMatrixCsv || "";
  }

  function getEnhancedCsvFileName() {
    if (window.RfpWorkspaces?.getEnhancedRequirementsMatrixExportFileName) {
      return window.RfpWorkspaces.getEnhancedRequirementsMatrixExportFileName();
    }

    return `Procurement Workbench - Untitled Workspace - Enhanced Requirements Matrix - ${new Date().toISOString().slice(0, 10)}.csv`;
  }

  async function copyReviewBrief() {
    const markdown = getReviewBriefMarkdown();

    if (!markdown) {
      setStatus("No Requirements Review Brief is available to copy.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      setStatus("Copied Requirements Review Brief to the clipboard.", false);
    } catch (error) {
      setStatus("Clipboard access was blocked by the browser.", true);
    }
  }

  function downloadReviewBrief() {
    const markdown = getReviewBriefMarkdown();

    if (!markdown) {
      setStatus("No Requirements Review Brief is available to download.", true);
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = getReviewBriefFileName();

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`, false);
  }

  function downloadEnhancedRequirementsCsv() {
    const csv = getEnhancedRequirementsCsv();

    if (!csv) {
      setStatus("No enhanced requirements matrix is available to download.", true);
      return;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = getEnhancedCsvFileName();

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`, false);
  }
  copyButton.addEventListener("click", copyRequirements);
  downloadButton.addEventListener("click", downloadRequirements);
  if (downloadCsvButton) {
    downloadCsvButton.addEventListener("click", downloadRequirementsCsv);
  }
  if (copyReviewBriefButton) {
    copyReviewBriefButton.addEventListener("click", copyReviewBrief);
  }
  if (downloadReviewBriefButton) {
    downloadReviewBriefButton.addEventListener("click", downloadReviewBrief);
  }
  if (downloadEnhancedCsvButton) {
    downloadEnhancedCsvButton.addEventListener("click", downloadEnhancedRequirementsCsv);
  }
  if (outputHelpToggle && outputHelpPopout) {
    outputHelpToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOutputHelp();
    });
  }
  if (outputHelpClose) {
    outputHelpClose.addEventListener("click", closeOutputHelp);
  }
  document.addEventListener("click", (event) => {
    if (!isOutputHelpOpen() || !outputHelpPopout || !outputHelpToggle) {
      return;
    }

    const target = event.target;
    if (outputHelpPopout.contains(target) || outputHelpToggle.contains(target)) {
      return;
    }

    setOutputHelpOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOutputHelpOpen()) {
      setOutputHelpOpen(false);
      if (outputHelpToggle) {
        outputHelpToggle.focus();
      }
    }
  });
})();


