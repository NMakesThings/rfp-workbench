(function () {
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const COLLECTIONS = {
    sources: "publicInfoSources",
    facts: "publicInfoFacts",
    suggestions: "publicInfoSuggestions",
    followUps: "publicInfoFollowUps",
    riskNotes: "publicInfoRiskNotes",
    displayState: "publicInfoDisplayState"
  };
  const PUBLIC_INFO_DISPLAY_STATE_VERSION = 1;
  const ALLOWED_ANSWER_KEYS = [
    "justice_domain",
    "system_type",
    "procurement_type",
    "client_type",
    "integration_partners",
    "deployment_model",
    "compliance",
    "implementation_support",
    "vendor_priorities",
    "user_count",
    "timeline"
  ];
  const ARRAY_ANSWER_KEYS = new Set([
    "integration_partners",
    "deployment_model",
    "compliance",
    "implementation_support",
    "vendor_priorities",
    "user_count",
    "timeline"
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
    vendor_priorities: "Vendor priorities",
    user_count: "Expected number of users",
    timeline: "Target implementation timeline"
  };
  const OPTION_SOURCES = {
    domains: "justice_domain",
    systemTypes: "system_type",
    procurementTypes: "procurement_type",
    clientTypes: "client_type",
    integrationPartners: "integration_partners"
  };
  const DEFAULT_OPTIONS = {
    justice_domain: [
      ["courts", "Courts"],
      ["prosecution", "Prosecution / District Attorney"],
      ["law_enforcement", "Law Enforcement"],
      ["corrections_jail", "Corrections / Jail"],
      ["dispatch_cad", "CAD / Dispatch"],
      ["justice_integration", "Justice Integration"],
      ["digital_evidence", "Digital Evidence"]
    ],
    system_type: [
      ["court_cms", "Court Case Management System"],
      ["prosecutor_cms", "Prosecutor / DA Case Management System"],
      ["law_enforcement_rms", "Law Enforcement RMS"],
      ["jail_management_system", "Jail Management System"],
      ["cad_dispatch", "CAD / Dispatch"],
      ["justice_integration_platform", "Justice Integration Platform"],
      ["digital_evidence_management", "Digital Evidence Management"]
    ],
    procurement_type: [
      ["new_system", "New system"],
      ["replacement", "Replacement / modernization"],
      ["implementation_services", "Implementation services"],
      ["integration_project", "Integration project"],
      ["support_maintenance", "Support / maintenance renewal"],
      ["assessment_planning", "Assessment / planning"]
    ],
    client_type: [
      ["county_agency", "County agency"],
      ["city_agency", "City agency"],
      ["state_agency", "State agency"],
      ["court_agency", "Court agency"],
      ["prosecutorial_agency", "Prosecutorial agency"],
      ["law_enforcement_agency", "Law enforcement agency"],
      ["regional_consortium", "Regional consortium"],
      ["multi_agency_program", "Multi-agency program"]
    ],
    integration_partners: [
      ["courts", "Courts"],
      ["prosecution", "Prosecution / DA"],
      ["law_enforcement", "Law enforcement agencies"],
      ["jail", "Jail / corrections"],
      ["cad_dispatch", "CAD / dispatch"],
      ["probation", "Probation / supervision"],
      ["state_criminal_history", "State criminal history"],
      ["digital_evidence", "Digital evidence"],
      ["identity_access", "Identity / access provider"],
      ["data_warehouse", "Data warehouse / analytics"],
      ["payments", "Payments"],
      ["public_portal", "Public portal"]
    ],
    deployment_model: [
      ["saas", "SaaS"],
      ["cloud_hosted", "Cloud hosted"],
      ["on_premise", "On premise"],
      ["hybrid", "Hybrid"],
      ["mobile", "Mobile access"]
    ],
    compliance: [
      ["cjis", "CJIS"],
      ["wcag_2_2_aa", "WCAG 2.2 AA"],
      ["records_retention", "Records retention"],
      ["nibrs", "NIBRS"],
      ["soc2", "SOC 2"],
      ["hipaa", "HIPAA"],
      ["pci", "PCI"],
      ["gdpr", "GDPR"],
      ["fedramp", "FedRAMP"]
    ],
    implementation_support: [
      ["migration", "Data migration"],
      ["training", "Training"],
      ["change_management", "Change management"],
      ["phased_rollout", "Phased rollout"]
    ],
    vendor_priorities: [
      ["price", "Price"],
      ["experience", "Relevant experience"],
      ["roadmap", "Product roadmap"],
      ["security", "Security"],
      ["references", "References"],
      ["implementation_capacity", "Implementation capacity"]
    ],
    user_count: [
      ["under_50", "Under 50"],
      ["50_250", "50-250"],
      ["250_1000", "250-1,000"],
      ["over_1000", "Over 1,000"]
    ],
    timeline: [
      ["under_3_months", "Under 3 months"],
      ["3_6_months", "3-6 months"],
      ["6_12_months", "6-12 months"],
      ["flexible", "Flexible / TBD"]
    ]
  };
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const PROCESSED_PUBLIC_STATUSES = new Set([
    "accepted",
    "rejected",
    "dismissed",
    "addressed",
    "resolved",
    "processed",
    "converted_to_follow_up"
  ]);
  const TRIAGE_TIERS = {
    suggested_accept: "Suggested Accept",
    review_recommended: "Review Recommended",
    requires_review: "Requires Review",
    conflict: "Conflict",
    unsupported_limitation: "Unsupported"
  };
  const TRIAGE_ORDER = [
    "suggested_accept",
    "review_recommended",
    "requires_review",
    "conflict",
    "unsupported_limitation"
  ];
  const optionLists = {};
  const optionLookups = {};
  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindElements();

    if (!window.RfpWorkspaces) {
      setSetupStatus("Workspace storage is unavailable.", true);
      return;
    }

    setDefaultOptions();
    await loadOptions();
    bindActions();
    render();
  }

  function bindElements() {
    elements.workspaceName = document.getElementById("public-info-workspace-name");
    elements.summary = document.getElementById("public-info-summary");
    elements.metrics = document.getElementById("public-info-metrics");
    elements.agencyName = document.getElementById("public-agency-name");
    elements.agencyType = document.getElementById("public-agency-type");
    elements.location = document.getElementById("public-location");
    elements.officialUrl = document.getElementById("public-official-url");
    elements.knownUrls = document.getElementById("public-known-urls");
    elements.focusNotes = document.getElementById("public-focus-notes");
    elements.dateRange = document.getElementById("public-date-range");
    elements.generatePrompt = document.getElementById("generate-public-prompt");
    elements.setupStatus = document.getElementById("public-setup-status");
    elements.copyPrompt = document.getElementById("copy-public-prompt");
    elements.selectPrompt = document.getElementById("select-public-prompt");
    elements.openChatGPT = document.getElementById("open-public-chatgpt");
    elements.promptPreview = document.getElementById("public-prompt-preview");
    elements.aiAssistDetails = document.querySelector(".public-ai-panel .ai-assist-details");
    elements.promptDetails = document.querySelector(".public-ai-panel .ai-prompt-details");
    elements.promptStatus = document.getElementById("public-prompt-status");
    elements.aiResponse = document.getElementById("public-ai-response-json");
    elements.importResponse = document.getElementById("import-public-ai-response");
    elements.importStatus = document.getElementById("public-import-status");
    elements.sources = document.getElementById("public-info-sources");
    elements.facts = document.getElementById("public-info-facts");
    elements.suggestions = document.getElementById("public-info-suggestions");
    elements.followUps = document.getElementById("public-info-followups");
    elements.riskNotes = document.getElementById("public-info-risk-notes");
    elements.limitations = document.getElementById("public-info-limitations");
    elements.triageCounts = document.getElementById("public-info-triage-counts");
    elements.triageFilter = document.getElementById("public-info-triage-filter");
    elements.showReviewed = document.getElementById("public-info-show-reviewed");
  }

  function bindActions() {
    elements.generatePrompt.addEventListener("click", generatePromptPreview);
    elements.copyPrompt.addEventListener("click", copyPrompt);
    elements.selectPrompt.addEventListener("click", selectPrompt);
    elements.openChatGPT.addEventListener("click", openChatGPT);
    elements.importResponse.addEventListener("click", importAIResponse);
    elements.sources.addEventListener("click", handleDisplayAction);
    elements.sources.addEventListener("click", handleSectionDisplayAction);
    elements.facts.addEventListener("click", handleFactAction);
    elements.facts.addEventListener("click", handleDisplayAction);
    elements.facts.addEventListener("click", handleSectionDisplayAction);
    elements.suggestions.addEventListener("click", handleSuggestionAction);
    elements.suggestions.addEventListener("click", handleDisplayAction);
    elements.suggestions.addEventListener("click", handleSectionDisplayAction);
    elements.followUps.addEventListener("click", handleFollowUpAction);
    elements.followUps.addEventListener("click", handleDisplayAction);
    elements.followUps.addEventListener("click", handleSectionDisplayAction);
    elements.riskNotes.addEventListener("click", handleRiskAction);
    elements.riskNotes.addEventListener("click", handleDisplayAction);
    elements.riskNotes.addEventListener("click", handleSectionDisplayAction);
    elements.limitations.addEventListener("click", handleRiskAction);
    elements.limitations.addEventListener("click", handleDisplayAction);
    elements.limitations.addEventListener("click", handleSectionDisplayAction);

    if (elements.triageFilter) {
      elements.triageFilter.addEventListener("change", render);
    }

    if (elements.showReviewed) {
      elements.showReviewed.addEventListener("change", render);
    }

    if (elements.triageCounts) {
      elements.triageCounts.addEventListener("click", handleTriageCountClick);
    }

    document.addEventListener("click", handleApplyConfirmationClick);
    document.addEventListener("keydown", handleApplyConfirmationKeydown);
  }

  function setDefaultOptions() {
    Object.entries(DEFAULT_OPTIONS).forEach(([answerKey, options]) => {
      setOptions(
        answerKey,
        options.map(([value, label]) => ({ value, label }))
      );
    });
  }

  async function loadOptions() {
    try {
      const [questionsResponse, taxonomyResponse] = await Promise.all([
        fetch(QUESTIONS_URL),
        fetch(TAXONOMY_URL)
      ]);
      const questions = questionsResponse.ok ? await questionsResponse.json() : null;
      const taxonomy = taxonomyResponse.ok ? await taxonomyResponse.json() : null;

      if (taxonomy) {
        Object.entries(OPTION_SOURCES).forEach(([sourceKey, answerKey]) => {
          setOptions(answerKey, sourceOptions(taxonomy[sourceKey]));
        });
      }

      if (questions) {
        questions.sections.forEach((section) => {
          section.questions.forEach((question) => {
            if (!ANSWER_LABELS[question.id]) {
              return;
            }

            if (question.options) {
              setOptions(question.id, sourceOptions(question.options));
            } else if (question.optionSource && taxonomy) {
              setOptions(question.id, sourceOptions(taxonomy[question.optionSource]));
            }
          });
        });
      }
    } catch (error) {
      setSetupStatus("Option labels could not be refreshed; default labels will still work.", true);
    }
  }

  function sourceOptions(options) {
    return (options || [])
      .map((option) => ({
        value: option.id || option.value,
        label: option.label || option.name || option.id || option.value
      }))
      .filter((option) => option.value);
  }

  function setOptions(answerKey, options) {
    optionLists[answerKey] = options || [];
    optionLookups[answerKey] = new Map(
      optionLists[answerKey].map((option) => [option.value, option.label])
    );
  }

  function generatePromptPreview() {
    const prompt = buildPrompt();

    if (!prompt) {
      return;
    }

    setPromptPreview(prompt);
    openPromptPanel();
    setSetupStatus("Prompt generated. Review or copy it from the prompt panel.", false);
  }

  function openPromptPanel() {
    if (elements.aiAssistDetails) {
      elements.aiAssistDetails.open = true;
    }

    if (elements.promptDetails) {
      elements.promptDetails.open = true;
    }
  }

  async function copyPrompt() {
    const prompt = elements.promptPreview.value || buildPrompt();

    if (!prompt) {
      return;
    }

    setPromptPreview(prompt);

    try {
      await copyTextToClipboard(prompt);
      setPromptStatus("Public information prompt copied. Paste it into your chosen AI research tool.", false);
    } catch (error) {
      selectPrompt();
      setPromptStatus("Clipboard access was blocked. Use Ctrl+C / Cmd+C to copy the selected prompt text.", true);
    }
  }

  function selectPrompt() {
    const prompt = elements.promptPreview.value || buildPrompt();

    if (!prompt) {
      return;
    }

    setPromptPreview(prompt);
    elements.promptPreview.focus();

    if (typeof elements.promptPreview.select === "function") {
      elements.promptPreview.select();
    }

    setPromptStatus("Prompt text selected. Use Ctrl+C / Cmd+C if it is not already on the clipboard.", false);
  }

  function openChatGPT() {
    window.open("https://chatgpt.com/", "_blank", "noopener");
    setPromptStatus("Opened ChatGPT in a new tab. Paste the prompt there manually.", false);
  }

  function buildPrompt() {
    const setup = getSetup();

    if (!setup.agencyName && !setup.officialWebsiteUrl) {
      setSetupStatus("Enter at least an agency/client name or official website URL before generating a prompt.", true);
      return "";
    }

    const promptPayload = {
      researchSetup: setup,
      currentConfirmedInterviewAnswers: getAnswers(),
      allowedInterviewAnswerKeys: ALLOWED_ANSWER_KEYS,
      allowedOptionValues: getAllowedOptionValues(),
      requiredJsonResponseSchema: getAIResponseSchema()
    };

    return [
      "You are assisting with public information research for an RFP planning workbench.",
      "",
      "Research objective:",
      "Identify public-source information that can help a consultant prepare for an RFP/procurement planning conversation, including agency profile, likely justice domain, public services, known technology/procurement context, potential integrations, compliance considerations, risks, and unresolved planning questions.",
      "",
      "Research approach:",
      "First identify reliable public sources. Then extract only directly supported public facts. Then make conservative RFP-planning suggestions or open questions based on those facts.",
      "Use a small set of high-value sources rather than many weak sources. Prefer current official sources. If a source appears outdated, note that in reliabilityNotes and avoid using it for current-state claims unless no better source is available.",
      "Avoid vendor marketing sources unless they are the only public source for a specific technology relationship. If used, mark sourceType as other and explain the limitation in reliabilityNotes.",
      "Only suggest interview answers when the public information directly supports the value. Do not infer procurement type, deployment model, implementation support needs, or vendor priorities unless there is specific public evidence. When evidence is weak, use openQuestions instead of suggestedInterviewAnswers.",
      "Blank currentConfirmedInterviewAnswers do not mean the answer should be inferred. Only suggest values supported by public evidence.",
      "For suggestedInterviewAnswers, suggestedValue must exactly match one of the allowed option value strings. For multi-value keys, return an array of exact allowed value strings. Do not return labels as values.",
      "",
      "Confidence guidance:",
      "- high: directly stated by an official or authoritative source.",
      "- medium: reasonably supported by a public source but requires light interpretation.",
      "- low: weak, indirect, dated, or incomplete support.",
      "Use low confidence sparingly and prefer openQuestions when evidence is not strong enough for a suggestion.",
      "",
      "Do not duplicate the same fact, issue, or open question across multiple entries. Consolidate overlapping findings.",
      "",
      "Return no more than:",
      "- 8 publicSources",
      "- 12 publicFacts",
      "- 6 suggestedInterviewAnswers",
      "- 8 openQuestions",
      "- 6 potentialIssues",
      "- 5 researchLimitations",
      "Prioritize the most useful items for RFP planning.",
      "",
      "Use public sources only. Prioritize official agency, jurisdiction, budget, procurement, strategic plan, organization chart, service description, and public report sources.",
      "Do not browse private systems. Do not use private, personal, confidential, or sensitive data.",
      "Do not make legal conclusions. Do not invent facts. Do not include unsupported claims.",
      "Distinguish facts from inferences. Flag uncertainty. Include source URLs for every public fact.",
      "If a fact is not supported by a public URL or citation, omit it or make it an open question.",
      "Suggestions are advisory and must remain pending until a consultant reviews them.",
      "Use only the allowed project intake answer keys and allowed option values supplied in the input package.",
      "",
      "Return exactly one strict valid JSON object only. The response must start with { and end with }.",
      "Do not include markdown code fences, comments, explanatory prose, footnotes, reference definitions such as [1]: URL, citation/reference lists after the JSON, text before or after the JSON object, or trailing commas.",
      "Use raw URLs only in sourceUrl and other URL fields. Do not use markdown link format in any JSON value.",
      "",
      "Input package:",
      JSON.stringify(promptPayload, null, 2)
    ].join("\n");
  }

  function getSetup() {
    return {
      agencyName: valueOf(elements.agencyName),
      agencyType: valueOf(elements.agencyType),
      jurisdictionLocation: valueOf(elements.location),
      officialWebsiteUrl: valueOf(elements.officialUrl),
      optionalKnownUrls: parseLines(elements.knownUrls.value),
      researchFocusNotes: valueOf(elements.focusNotes),
      publicInformationDateRange: valueOf(elements.dateRange)
    };
  }

  function getAllowedOptionValues() {
    return ALLOWED_ANSWER_KEYS.reduce((options, answerKey) => {
      options[answerKey] = (optionLists[answerKey] || []).map((option) => ({
        value: option.value,
        label: option.label
      }));
      return options;
    }, {});
  }

  function getAIResponseSchema() {
    return {
      analysisSummary: "Short summary of what was researched and what was found.",
      publicSources: [
        {
          sourceTitle: "Public source title.",
          sourceUrl: "Public URL.",
          sourceType: "official_website | public_report | budget | procurement_page | org_chart | service_description | strategic_plan | other",
          publisher: "Publishing agency or jurisdiction.",
          publicationDate: "Publication date if available.",
          accessedDate: "Date accessed if available.",
          summary: "Short source summary.",
          reliabilityNotes: "Notes about source quality, recency, or limitations."
        }
      ],
      publicFacts: [
        {
          factType: "agency_profile | services | systems | procurement | budget | organization | strategic_priority | integration | risk | other",
          factText: "Publicly supported client-specific fact.",
          sourceUrl: "Required public source URL.",
          sourceTitle: "Source title.",
          quoteOrExcerpt: "Short excerpt if available.",
          confidence: "low | medium | high",
          isInference: false
        }
      ],
      suggestedInterviewAnswers: [
        {
          answerKey: "one allowed project intake answer key",
          suggestedValue: "one allowed option value, or an array of allowed values for multi-value keys",
          suggestedLabel: "Human-readable label.",
          rationale: "Why the public information supports this suggestion.",
          sourceUrl: "Public source URL.",
          confidence: "low | medium | high"
        }
      ],
      openQuestions: [
        {
          question: "Question for the consultant or client to resolve.",
          reason: "Why the public information leaves this unresolved.",
          priority: "low | medium | high",
          sourceUrl: "Public source URL if applicable.",
          relatedAnswerKeys: ["one or more allowed answer keys"]
        }
      ],
      potentialIssues: [
        {
          issue: "Potential issue title.",
          whyItMatters: "Why this may affect RFP planning.",
          severity: "low | medium | high",
          sourceUrl: "Public source URL if applicable.",
          recommendedAction: "Recommended consultant action."
        }
      ],
      researchLimitations: [
        {
          limitation: "What could not be confirmed from public sources.",
          sourceUrl: "Optional URL related to the limitation.",
          recommendedAction: "Recommended follow-up."
        }
      ]
    };
  }

  function importAIResponse() {
    const rawResponse = elements.aiResponse.value.trim();

    if (!rawResponse) {
      setImportStatus("Paste an AI JSON response before importing.", true);
      elements.aiResponse.focus();
      return;
    }

    let response = null;

    try {
      response = parseAIJsonObject(rawResponse);
    } catch (error) {
      setImportStatus(`Invalid JSON: ${error.message}`, true);
      return;
    }

    const validationError = validateResponse(response);

    if (validationError) {
      setImportStatus(validationError, true);
      return;
    }

    const workspace = getWorkspace();
    const now = new Date().toISOString();
    const importBatchId = createId("publicImport");
    const answers = getAnswers();
    const skipped = [];
    const sourceRecords = createSourceRecords(response.publicSources || [], workspace, now, importBatchId);
    const factConversion = createFactRecords(response.publicFacts || [], workspace, now, importBatchId, sourceRecords);
    const factRecords = factConversion.records;
    const suggestionRecords = createSuggestionRecords(response.suggestedInterviewAnswers || [], workspace, answers, now, importBatchId, skipped);
    const followUpRecords = createFollowUpRecords(response.openQuestions || [], workspace, now, importBatchId);
    const riskRecords = createRiskRecords(response.potentialIssues || [], workspace, now, importBatchId);
    const limitationRecords = [
      ...createLimitationRecords(response.researchLimitations || [], workspace, now, importBatchId),
      ...factConversion.limitations
    ];

    if (!sourceRecords.length && !factRecords.length && !suggestionRecords.length && !followUpRecords.length && !riskRecords.length && !limitationRecords.length) {
      setImportStatus("JSON parsed, but no importable public information records were found.", true);
      return;
    }

    prependCollection(COLLECTIONS.sources, sourceRecords);
    prependCollection(COLLECTIONS.facts, factRecords);
    prependCollection(COLLECTIONS.suggestions, suggestionRecords);
    prependCollection(COLLECTIONS.followUps, followUpRecords);
    prependCollection(COLLECTIONS.riskNotes, [...riskRecords, ...limitationRecords]);

    const skippedMessage = skipped.length ? ` ${skipped.length} suggested answer${skipped.length === 1 ? "" : "s"} skipped: ${skipped.join("; ")}.` : "";
    const convertedFactMessage = factConversion.convertedCount
      ? ` ${factConversion.convertedCount} unsourced public fact${factConversion.convertedCount === 1 ? "" : "s"} converted to research limitations because ${factConversion.convertedCount === 1 ? "it lacked" : "they lacked"} a usable public source URL.`
      : "";
    setImportStatus(
      `Imported ${sourceRecords.length} sources, ${factRecords.length} facts, ${suggestionRecords.length} pending suggestions, ${followUpRecords.length} follow-ups, ${riskRecords.length} potential issues, and ${limitationRecords.length} limitations.${convertedFactMessage}${skippedMessage}`,
      skipped.length || factConversion.convertedCount ? "warning" : "success"
    );
    elements.aiResponse.value = "";
    render();
  }

  function validateResponse(response) {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return "AI response must be a JSON object.";
    }

    const arrayKeys = [
      "publicSources",
      "publicFacts",
      "suggestedInterviewAnswers",
      "openQuestions",
      "potentialIssues",
      "researchLimitations"
    ];
    const badArray = arrayKeys.find((key) => response[key] !== undefined && !Array.isArray(response[key]));

    if (badArray) {
      return `${badArray} must be an array.`;
    }

    return "";
  }

  function parseAIJsonObject(rawResponse) {
    const cleaned = normalizeJsonResponseText(rawResponse);

    if (!cleaned) {
      throw new Error("Paste a JSON object before importing.");
    }

    try {
      return JSON.parse(cleaned);
    } catch (directError) {
      const extraction = extractSingleJsonObject(cleaned);

      if (extraction.error) {
        throw new Error(extraction.error);
      }

      if (extraction.jsonText) {
        return parseExtractedJsonObject(extraction.jsonText);
      }

      throw new Error(getJsonImportErrorMessage(directError.message));
    }
  }

  function normalizeJsonResponseText(value) {
    return stripMarkdownFence(
      String(value || "")
        .replace(/^\uFEFF/, "")
        .replace(/^[\u200B-\u200D\u2060]+/, "")
        .trim()
    ).trim();
  }

  function stripMarkdownFence(value) {
    const text = String(value || "").trim();
    const exactFence = text.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);

    if (exactFence) {
      return exactFence[1].trim();
    }

    const fencedObject = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);

    if (fencedObject && fencedObject[1] && fencedObject[1].includes("{")) {
      const before = text.slice(0, fencedObject.index).trim();
      const after = text.slice(fencedObject.index + fencedObject[0].length).trim();

      if (isAllowedJsonWrapperText(before) && isAllowedJsonWrapperText(after)) {
        return fencedObject[1].trim();
      }
    }

    return text;
  }

  function extractSingleJsonObject(value) {
    const text = String(value || "");
    const start = text.indexOf("{");

    if (start < 0) {
      return { error: getJsonImportErrorMessage("No JSON object was found.") };
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }

    if (end < 0) {
      return { error: getJsonImportErrorMessage("No complete top-level JSON object was found.") };
    }

    const before = text.slice(0, start).trim();
    const after = text.slice(end).trim();

    if (hasTopLevelJsonObject(after)) {
      return { error: "Multiple top-level JSON objects were found. Paste exactly one JSON object." };
    }

    if (!isAllowedJsonWrapperText(before) || !isAllowedJsonWrapperText(after)) {
      return { error: getJsonImportErrorMessage("Unexpected text was found outside the JSON object.") };
    }

    return { jsonText: text.slice(start, end).trim() };
  }

  function parseExtractedJsonObject(jsonText) {
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`${error.message}. ${getJsonImportErrorMessage()}`);
    }
  }

  function getJsonImportErrorMessage(detail) {
    const base = "The response could not be imported as JSON. The importer can handle markdown fences and trailing citation references, but it could not find one complete valid JSON object.";
    return detail ? `${detail} ${base}` : base;
  }

  function isAllowedJsonWrapperText(text) {
    const cleaned = String(text || "").trim();

    if (!cleaned) {
      return true;
    }

    return cleaned
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .every((line) => /^\[\d+\]:\s*https?:\/\/\S+$/i.test(line));
  }

  function hasTopLevelJsonObject(text) {
    const cleaned = String(text || "").trim();
    return cleaned.includes("{") && Boolean(extractBalancedObjectLenient(cleaned));
  }

  function extractBalancedObjectLenient(text) {
    const start = String(text || "").indexOf("{");

    if (start < 0) {
      return "";
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }

    return "";
  }

  function createSourceRecords(sources, workspace, createdAt, importBatchId) {
    return sources
      .filter((source) => source && typeof source === "object")
      .map((source) => ({
        id: createId("publicSource"),
        workspaceId: workspace.id,
        sourceTitle: clean(source.sourceTitle || source.title || "Untitled public source"),
        sourceUrl: getRecordUrl(source),
        sourceType: clean(source.sourceType || "other"),
        publisher: clean(source.publisher),
        publicationDate: clean(source.publicationDate),
        accessedDate: clean(source.accessedDate),
        summary: clean(source.summary),
        reliabilityNotes: clean(source.reliabilityNotes),
        importBatchId,
        createdAt
      }))
      .filter((source) => source.sourceTitle || source.sourceUrl);
  }

  function createFactRecords(facts, workspace, createdAt, importBatchId, sourceRecords = []) {
    const converted = [];
    const records = facts
      .filter((fact) => fact && typeof fact === "object")
      .map((fact) => {
        const factText = clean(fact.factText);
        const sourceUrl = getRecordUrl(fact) || findUrlBySourceTitle(fact, sourceRecords);

        if (factText && !sourceUrl) {
          converted.push(createUnsupportedFactLimitation(fact, workspace, createdAt, importBatchId));
        }

        return {
          id: createId("publicFact"),
          workspaceId: workspace.id,
          factType: clean(fact.factType || "other"),
          factText,
          sourceUrl,
          sourceTitle: clean(fact.sourceTitle),
          quoteOrExcerpt: clean(fact.quoteOrExcerpt || fact.excerpt),
          confidence: normalizeConfidence(fact.confidence),
          isInference: Boolean(fact.isInference),
          reviewStatus: "pending",
          importBatchId,
          createdAt
        };
      })
      .filter((fact) => fact.factText && fact.sourceUrl);

    return {
      records,
      limitations: converted.filter((limitation) => limitation.limitation),
      convertedCount: converted.length
    };
  }

  function createUnsupportedFactLimitation(fact, workspace, createdAt, importBatchId) {
    const factText = clean(fact.factText);
    const sourceTitle = clean(fact.sourceTitle || fact.source || fact.citation);

    return {
      id: createId("publicLimit"),
      workspaceId: workspace.id,
      noteType: "research_limitation",
      limitation: `Unsupported public fact could not be imported because it lacked a public source URL: ${factText}`,
      whyItMatters: "Public facts need a usable public source URL before they can be treated as supported client-specific facts.",
      sourceUrl: "",
      recommendedAction: sourceTitle
        ? `Find a usable public URL for the source titled "${sourceTitle}", then re-import or add this as a follow-up.`
        : "Find a usable public source URL, then re-import or add this as a follow-up.",
      relatedAnswerKeys: normalizeAnswerKeys(fact.relatedAnswerKeys),
      severity: "low",
      status: "open",
      importBatchId,
      createdAt
    };
  }

  function createSuggestionRecords(suggestions, workspace, answers, createdAt, importBatchId, skipped) {
    return suggestions.flatMap((suggestion, index) => {
      if (!suggestion || typeof suggestion !== "object") {
        return [];
      }

      if (!ALLOWED_ANSWER_KEYS.includes(suggestion.answerKey)) {
        skipped.push(`item ${index + 1} used unsupported answerKey ${clean(suggestion.answerKey) || "blank"}`);
        return [];
      }

      return normalizeSuggestedValues(suggestion)
        .flatMap((value) => {
          if (!isAllowedAnswerValue(suggestion.answerKey, value)) {
            skipped.push(`${ANSWER_LABELS[suggestion.answerKey]} value ${value || "blank"} is not allowed`);
            return [];
          }

          return [{
            id: createId("publicSuggestion"),
            workspaceId: workspace.id,
            answerKey: suggestion.answerKey,
            suggestedValue: value,
            suggestedLabel: labelFor(suggestion.answerKey, value) || clean(suggestion.suggestedLabel) || value,
            rationale: clean(suggestion.rationale || suggestion.reason),
            sourceUrl: getRecordUrl(suggestion),
            sourceTitle: clean(suggestion.sourceTitle),
            confidence: normalizeConfidence(suggestion.confidence),
            reviewStatus: "pending",
            status: "pending_review",
            reviewDecision: null,
            conflictState: getConflictState(suggestion.answerKey, value, answers),
            existingValue: answers[suggestion.answerKey] || "",
            importBatchId,
            createdAt
          }];
        });
    });
  }

  function createFollowUpRecords(questions, workspace, createdAt, importBatchId) {
    return questions
      .filter((question) => question && typeof question === "object")
      .map((question) => ({
        id: createId("publicFollowUp"),
        workspaceId: workspace.id,
        question: clean(question.question || question.questionText),
        reason: clean(question.reason),
        priority: normalizePriority(question.priority),
        sourceUrl: getRecordUrl(question),
        relatedAnswerKeys: normalizeAnswerKeys(question.relatedAnswerKeys),
        status: "open",
        importBatchId,
        createdAt
      }))
      .filter((question) => question.question);
  }

  function createRiskRecords(issues, workspace, createdAt, importBatchId) {
    return issues
      .filter((issue) => issue && typeof issue === "object")
      .map((issue) => ({
        id: createId("publicRisk"),
        workspaceId: workspace.id,
        noteType: "potential_issue",
        issue: clean(issue.issue || issue.title || "Untitled potential issue"),
        whyItMatters: clean(issue.whyItMatters || issue.description),
        severity: normalizePriority(issue.severity),
        sourceUrl: getRecordUrl(issue),
        recommendedAction: clean(issue.recommendedAction),
        status: "open",
        importBatchId,
        createdAt
      }))
      .filter((issue) => issue.issue || issue.whyItMatters);
  }

  function createLimitationRecords(limitations, workspace, createdAt, importBatchId) {
    return limitations
      .filter((limitation) => limitation)
      .map((limitation) => {
        const record = typeof limitation === "string" ? { limitation } : limitation;
        return {
          id: createId("publicLimit"),
          workspaceId: workspace.id,
          noteType: "research_limitation",
          limitation: clean(record.limitation || record.text || record.description),
          whyItMatters: clean(record.whyItMatters || record.reason),
          sourceUrl: getRecordUrl(record),
          recommendedAction: clean(record.recommendedAction),
          relatedAnswerKeys: normalizeAnswerKeys(record.relatedAnswerKeys),
          severity: "low",
          status: "open",
          importBatchId,
          createdAt
        };
      })
      .filter((limitation) => limitation.limitation);
  }

  function handleFactAction(event) {
    const button = event.target.closest("[data-fact-action]");

    if (!button) {
      return;
    }

    updateRecord(COLLECTIONS.facts, button.getAttribute("data-record-id"), (fact) => ({
      ...fact,
      reviewStatus: button.getAttribute("data-fact-action"),
      reviewedAt: new Date().toISOString()
    }));
    setImportStatus("Public fact review status updated.", false);
  }

  function handleSuggestionAction(event) {
    const button = event.target.closest("[data-suggestion-action]");

    if (!button) {
      return;
    }

    const id = button.getAttribute("data-record-id");
    const action = button.getAttribute("data-suggestion-action");
    const suggestions = readCollection(COLLECTIONS.suggestions);
    const suggestion = suggestions.find((item) => item.id === id);

    if (!suggestion) {
      return;
    }

    if (action === "reject") {
      if (suggestion.status !== "pending_review") {
        setImportStatus("Only pending suggestions can be rejected.", true);
        return;
      }

      updateRecord(COLLECTIONS.suggestions, id, (record) => ({
        ...record,
        status: "rejected",
        reviewStatus: "dismissed",
        reviewDecision: "rejected",
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      setImportStatus("Suggestion rejected and kept for traceability.", false);
      return;
    }

    if (action === "review_apply") {
      openSuggestionApplyConfirmation(suggestion);
      return;
    }

    if (action === "apply" || action === "mark_applied") {
      applySuggestion(suggestion);
    }
  }
  function handleFollowUpAction(event) {
    const button = event.target.closest("[data-followup-action]");

    if (!button) {
      return;
    }

    const action = button.getAttribute("data-followup-action");

    updateRecord(COLLECTIONS.followUps, button.getAttribute("data-record-id"), (followUp) => ({
      ...followUp,
      status: action,
      updatedAt: new Date().toISOString()
    }));
    setImportStatus("Follow-up status updated.", false);
  }

  function handleRiskAction(event) {
    const button = event.target.closest("[data-risk-action]");

    if (!button) {
      return;
    }

    const id = button.getAttribute("data-record-id");
    const action = button.getAttribute("data-risk-action");
    const riskNotes = readCollection(COLLECTIONS.riskNotes);
    const note = riskNotes.find((item) => item.id === id);

    if (!note) {
      return;
    }

    if (action === "create_follow_up") {
      createFollowUpFromReviewItem(note);
      updateRecord(COLLECTIONS.riskNotes, id, (record) => ({
        ...record,
        updatedAt: new Date().toISOString()
      }));
      setImportStatus("Follow-up created from the research limitation.", false);
      return;
    }

    if (action === "create_potential_issue") {
      createPotentialIssueFromLimitation(note);
      updateRecord(COLLECTIONS.riskNotes, id, (record) => ({
        ...record,
        updatedAt: new Date().toISOString()
      }));
      setImportStatus("Potential issue created from the research limitation.", false);
      return;
    }

    if (action === "converted_to_follow_up" && note.noteType === "potential_issue") {
      createFollowUpFromReviewItem(note);
    }

    updateRecord(COLLECTIONS.riskNotes, id, (record) => ({
      ...record,
      status: action,
      updatedAt: new Date().toISOString()
    }));
    setImportStatus(action === "converted_to_follow_up" ? "Potential issue converted to a follow-up." : "Potential issue status updated.", false);
  }

  function handleDisplayAction(event) {
    const button = event.target.closest("[data-public-display-action]");

    if (!button) {
      return;
    }

    const id = button.getAttribute("data-record-id");
    const type = button.getAttribute("data-public-display-type");
    const action = button.getAttribute("data-public-display-action");

    if (!id || !type) {
      return;
    }

    setPublicInfoItemMinimized(type, id, action === "minimize");
    render();
  }

  function handleSectionDisplayAction(event) {
    const button = event.target.closest("[data-public-section-display-action]");

    if (!button) {
      return;
    }

    const type = button.getAttribute("data-public-display-type");
    const action = button.getAttribute("data-public-section-display-action");

    if (!type) {
      return;
    }

    const records = getSectionRecordsForDisplayType(type);
    setPublicInfoItemsMinimized(type, records, action === "minimize");
    render();
  }

  function createFollowUpFromReviewItem(item) {
    const isLimitation = item.noteType === "research_limitation";
    const title = isLimitation
      ? item.limitation || "Research limitation"
      : item.issue || "Untitled issue";
    const reason = isLimitation
      ? item.recommendedAction || item.whyItMatters || "Research limitation from public source review."
      : item.whyItMatters || "Potential issue from public source review.";

    prependCollection(COLLECTIONS.followUps, [{
      id: createId("publicFollowUp"),
      workspaceId: getWorkspace().id,
      question: isLimitation
        ? `Resolve public research limitation: ${title}`
        : `Resolve public-source issue: ${title}`,
      reason,
      priority: normalizePriority(item.priority || item.severity),
      sourceUrl: item.sourceUrl || "",
      relatedAnswerKeys: normalizeAnswerKeys(item.relatedAnswerKeys || []),
      status: "open",
      createdAt: new Date().toISOString()
    }]);
  }

  function createPotentialIssueFromLimitation(limitation) {
    prependCollection(COLLECTIONS.riskNotes, [{
      id: createId("publicRisk"),
      workspaceId: getWorkspace().id,
      noteType: "potential_issue",
      issue: `Resolve research uncertainty: ${limitation.limitation || "Research limitation"}`,
      whyItMatters: limitation.whyItMatters || limitation.recommendedAction || "Public research left this point unresolved.",
      severity: normalizePriority(limitation.severity || "medium"),
      sourceUrl: limitation.sourceUrl || "",
      recommendedAction: limitation.recommendedAction || "Review the limitation and confirm what additional source material is needed.",
      status: "open",
      importBatchId: limitation.importBatchId,
      createdAt: new Date().toISOString()
    }]);
  }

  function applySuggestion(suggestion, options = {}) {
    const state = getSuggestionApplyState(suggestion, getAnswers());

    if (!state.eligible) {
      setImportStatus(state.reason || "This public research suggestion cannot be applied to Project Intake.", true);
      return false;
    }

    if (state.requiresConfirmation && !options.confirmed) {
      openSuggestionApplyConfirmation(suggestion);
      return false;
    }

    return commitSuggestionApply(suggestion, state);
  }

  function commitSuggestionApply(suggestion, state) {
    const answers = getAnswers();
    const currentState = getSuggestionApplyState(suggestion, answers);

    if (!currentState.eligible) {
      setImportStatus(currentState.reason || "This public research suggestion cannot be applied to Project Intake.", true);
      return false;
    }

    const now = new Date().toISOString();
    const previousValue = cloneAnswerValue(currentState.currentValue);
    let projectIntakeSavedAt = answers.savedAt || now;

    if (currentState.action !== "already_present") {
      const nextAnswers = { ...answers };

      if (currentState.isMultiValue) {
        const nextValues = [...currentState.currentValues];
        if (!nextValues.includes(currentState.suggestedValue)) {
          nextValues.push(currentState.suggestedValue);
        }
        nextAnswers[currentState.answerKey] = nextValues;
      } else {
        nextAnswers[currentState.answerKey] = currentState.suggestedValue;
      }

      const saved = window.RfpWorkspaces.saveAnswers(nextAnswers);
      if (!saved) {
        setImportStatus("Project Intake answer could not be saved. Confirm an active workspace is selected.", true);
        return false;
      }

      projectIntakeSavedAt = (getAnswers() || {}).savedAt || now;
    }

    updateRecord(COLLECTIONS.suggestions, suggestion.id, (record) => ({
      ...record,
      status: "accepted",
      reviewStatus: "accepted",
      reviewDecision: "accepted",
      acceptedValue: currentState.suggestedValue,
      acceptedLabel: labelFor(currentState.answerKey, currentState.suggestedValue),
      reviewedAt: now,
      updatedAt: now,
      appliedToProjectIntake: {
        targetAnswerKey: currentState.answerKey,
        appliedValue: currentState.suggestedValue,
        previousValue,
        applyAction: currentState.action,
        appliedAt: now,
        sourceUrl: getRecordUrl(record),
        sourceTitle: clean(record.sourceTitle),
        projectIntakeSavedAt
      }
    }));

    closeSuggestionApplyConfirmation();
    setImportStatus(getApplySuccessMessage(currentState), false);
    return true;
  }

  function getApplySuccessMessage(state) {
    const fieldLabel = state.targetLabel;
    const valueLabel = formatAnswerValue(state.answerKey, state.suggestedValue);

    if (state.action === "already_present") {
      return `${fieldLabel} already matched ${valueLabel}; the public research suggestion was marked applied.`;
    }

    if (state.action === "add_multi_value") {
      return `${fieldLabel} updated with ${valueLabel} from Public Research.`;
    }

    return `${fieldLabel} updated from Public Research.`;
  }

  function getSuggestionApplyState(suggestion, answers = getAnswers()) {
    const answerKey = clean(suggestion && suggestion.answerKey);
    const suggestedValue = normalizeApplySuggestedValue(suggestion && suggestion.suggestedValue);

    if (!suggestion || typeof suggestion !== "object") {
      return createIneligibleApplyState("Public research suggestion was not found.");
    }

    if (!answerKey || suggestedValue === "") {
      return createIneligibleApplyState("This suggestion does not include an explicit Project Intake field and value.");
    }

    if (!ALLOWED_ANSWER_KEYS.includes(answerKey) || !ANSWER_LABELS[answerKey]) {
      return createIneligibleApplyState("This suggestion targets a Project Intake field that is not supported for direct apply.");
    }

    if (!isAllowedAnswerValue(answerKey, suggestedValue)) {
      return createIneligibleApplyState("This suggestion uses a value that is no longer valid for the mapped Project Intake field.");
    }

    const currentValue = answers ? answers[answerKey] : "";
    const isMultiValue = ARRAY_ANSWER_KEYS.has(answerKey);
    const currentValues = getAnswerValues(answerKey, currentValue);
    const currentHasValue = isMultiValue ? currentValues.length > 0 : !isEmptyAnswer(currentValue);
    const alreadyPresent = answerContainsValue(answerKey, currentValue, suggestedValue);
    const confidence = normalizeConfidence(suggestion.confidence);
    let action = "set_blank_answer";

    if (alreadyPresent) {
      action = "already_present";
    } else if (isMultiValue) {
      action = "add_multi_value";
    } else if (currentHasValue) {
      action = "replace_answer";
    }

    const requiresConfirmation = action === "replace_answer" ||
      (action === "set_blank_answer" && confidence !== "high") ||
      (action === "add_multi_value" && (currentValues.length > 0 || confidence !== "high"));

    return {
      eligible: true,
      answerKey,
      suggestedValue,
      targetLabel: ANSWER_LABELS[answerKey] || formatDisplayLabel(answerKey),
      currentValue,
      currentValues,
      currentHasValue,
      isMultiValue,
      confidence,
      action,
      requiresConfirmation,
      primaryActionLabel: getSuggestionPrimaryActionLabel(action, requiresConfirmation),
      confirmActionLabel: getSuggestionConfirmActionLabel(action)
    };
  }

  function createIneligibleApplyState(reason) {
    return {
      eligible: false,
      reason,
      primaryActionLabel: "Review / Apply",
      confirmActionLabel: "Apply answer"
    };
  }

  function normalizeApplySuggestedValue(value) {
    if (Array.isArray(value)) {
      return "";
    }

    return clean(value);
  }

  function getSuggestionPrimaryActionLabel(action, requiresConfirmation) {
    if (action === "already_present") {
      return "Mark applied";
    }

    return requiresConfirmation ? "Review / Apply" : "Apply to Project Intake";
  }

  function getSuggestionConfirmActionLabel(action) {
    if (action === "replace_answer") {
      return "Replace answer";
    }

    if (action === "add_multi_value") {
      return "Add value";
    }

    if (action === "already_present") {
      return "Mark applied";
    }

    return "Apply answer";
  }

  function getSuggestionAppliedState(suggestion, answers = getAnswers()) {
    const applied = suggestion && suggestion.appliedToProjectIntake;

    if (!applied || typeof applied !== "object") {
      return null;
    }

    const answerKey = clean(applied.targetAnswerKey || suggestion.answerKey);
    const appliedValue = normalizeApplySuggestedValue(applied.appliedValue || suggestion.acceptedValue || suggestion.suggestedValue);
    const currentValue = answers ? answers[answerKey] : "";

    return {
      targetAnswerKey: answerKey,
      targetLabel: ANSWER_LABELS[answerKey] || formatDisplayLabel(answerKey),
      appliedValue,
      appliedValueLabel: formatAnswerValue(answerKey, appliedValue),
      currentValueLabel: formatAnswerValue(answerKey, currentValue),
      appliedAt: applied.appliedAt || suggestion.reviewedAt || "",
      matchesCurrent: answerContainsValue(answerKey, currentValue, appliedValue)
    };
  }

  function openSuggestionApplyConfirmation(suggestion) {
    const state = getSuggestionApplyState(suggestion, getAnswers());

    if (!state.eligible) {
      setImportStatus(state.reason || "This public research suggestion cannot be applied to Project Intake.", true);
      return;
    }

    const warning = state.action === "replace_answer"
      ? "This will replace an existing Project Intake answer. Confirm that the public-source value is more accurate before replacing it."
      : "Review the source-supported value before updating Project Intake.";

    closeSuggestionApplyConfirmation();

    const modalHtml = `
      <div id="public-suggestion-apply-modal" class="modal-overlay public-apply-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="public-apply-title">
        <div class="modal-panel public-apply-modal-panel">
          <div class="modal-header">
            <div>
              <p class="section-kicker">Project Intake update</p>
              <h2 id="public-apply-title">Apply public research suggestion</h2>
              <p>Project Intake remains the owner of confirmed answers. Public Research keeps the source attribution.</p>
            </div>
            <button type="button" class="modal-close-button" data-public-apply-cancel aria-label="Cancel">&times;</button>
          </div>
          <div class="public-apply-modal-body">
            ${renderMetaRows([
              ["Project Intake field", state.targetLabel],
              ["Current answer", formatAnswerValue(state.answerKey, state.currentValue)],
              ["Proposed answer", formatAnswerValue(state.answerKey, state.suggestedValue)],
              ["Confidence", formatDisplayLabel(state.confidence)],
              ["Source title", suggestion.sourceTitle || "Not provided"],
              ["Source URL", getRecordUrl(suggestion)],
              ["Rationale", suggestion.rationale || "Public information suggested this project intake answer."]
            ])}
            <p class="public-apply-warning">${escapeHtml(warning)}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="button secondary" data-public-apply-cancel>Cancel</button>
            <button type="button" class="button secondary" data-public-apply-copy data-record-id="${escapeHtml(suggestion.id)}">Copy proposed answer</button>
            <button type="button" class="button primary" data-public-apply-confirm data-record-id="${escapeHtml(suggestion.id)}">${escapeHtml(state.confirmActionLabel)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    document.body.classList.add("modal-open");
    const primaryButton = document.querySelector("[data-public-apply-confirm]");
    if (primaryButton) {
      primaryButton.focus();
    }
  }

  function closeSuggestionApplyConfirmation() {
    const modal = document.getElementById("public-suggestion-apply-modal");

    if (modal) {
      modal.remove();
    }

    document.body.classList.remove("modal-open");
  }

  function handleApplyConfirmationClick(event) {
    const confirmButton = event.target.closest("[data-public-apply-confirm]");
    const copyButton = event.target.closest("[data-public-apply-copy]");
    const cancelButton = event.target.closest("[data-public-apply-cancel]");
    const modal = document.getElementById("public-suggestion-apply-modal");

    if (confirmButton) {
      const suggestion = readCollection(COLLECTIONS.suggestions).find((item) => item.id === confirmButton.getAttribute("data-record-id"));
      if (suggestion) {
        applySuggestion(suggestion, { confirmed: true });
      }
      return;
    }

    if (copyButton) {
      copySuggestionProposedAnswer(copyButton.getAttribute("data-record-id"));
      return;
    }

    if (cancelButton || (modal && event.target === modal)) {
      closeSuggestionApplyConfirmation();
    }
  }

  function handleApplyConfirmationKeydown(event) {
    if (event.key === "Escape" && document.getElementById("public-suggestion-apply-modal")) {
      closeSuggestionApplyConfirmation();
    }
  }

  async function copySuggestionProposedAnswer(suggestionId) {
    const suggestion = readCollection(COLLECTIONS.suggestions).find((item) => item.id === suggestionId);
    const state = getSuggestionApplyState(suggestion, getAnswers());

    if (!state.eligible) {
      setImportStatus("No valid proposed answer is available to copy.", true);
      return;
    }

    try {
      await copyTextToClipboard(formatAnswerValue(state.answerKey, state.suggestedValue));
      setImportStatus("Proposed answer copied.", false);
    } catch (error) {
      setImportStatus("Clipboard access was blocked. Copy the proposed answer from the confirmation panel.", true);
    }
  }

  function getAnswerValues(answerKey, value) {
    if (ARRAY_ANSWER_KEYS.has(answerKey)) {
      if (Array.isArray(value)) {
        return value.map((item) => clean(item)).filter(Boolean);
      }

      return isEmptyAnswer(value) ? [] : [clean(value)];
    }

    return isEmptyAnswer(value) ? [] : [clean(value)];
  }

  function answerContainsValue(answerKey, currentValue, targetValue) {
    const cleanedTarget = clean(targetValue);

    if (!cleanedTarget) {
      return false;
    }

    return getAnswerValues(answerKey, currentValue).includes(cleanedTarget);
  }

  function isEmptyAnswer(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || String(value).trim() === "";
  }

  function cloneAnswerValue(value) {
    return Array.isArray(value) ? [...value] : value || "";
  }
  function render() {
    const workspace = getWorkspace();
    const sources = readCollection(COLLECTIONS.sources);
    const facts = readCollection(COLLECTIONS.facts);
    const suggestions = readCollection(COLLECTIONS.suggestions);
    const followUps = readCollection(COLLECTIONS.followUps);
    const riskNotes = readCollection(COLLECTIONS.riskNotes);
    const issues = riskNotes.filter((note) => note.noteType !== "research_limitation");
    const limitations = riskNotes.filter((note) => note.noteType === "research_limitation");
    const displayState = getPublicInfoDisplayState();
    const needsReview = countPublicResearchNeedingReview({
      facts,
      suggestions,
      followUps,
      issues,
      limitations
    });
    const minimizedItems = countMinimizedPublicResearchItems(displayState, {
      sources,
      facts,
      suggestions,
      followUps,
      issues,
      limitations
    });
    const triageRecords = getPublicTriageRecords({
      facts: filterByReviewVisibility(facts, "fact"),
      suggestions: filterByReviewVisibility(suggestions, "suggestion"),
      followUps: filterByReviewVisibility(followUps, "follow_up"),
      issues: filterByReviewVisibility(issues, "issue"),
      limitations: filterByReviewVisibility(limitations, "limitation")
    });

    elements.workspaceName.textContent = workspace.name;
    elements.summary.textContent = `${sources.length} public source${sources.length === 1 ? "" : "s"}, ${facts.length} public fact${facts.length === 1 ? "" : "s"}, ${suggestions.length} suggested answer${suggestions.length === 1 ? "" : "s"}, and ${needsReview} item${needsReview === 1 ? "" : "s"} needing review.`;
    elements.metrics.innerHTML = [
      renderMetric("Public sources", sources.length),
      renderMetric("Public facts", facts.length),
      renderMetric("Suggested answers", suggestions.length),
      renderMetric("Open follow-ups", openCount(followUps)),
      renderMetric("Potential issues", openCount(issues)),
      renderMetric("Limitations", limitations.length),
      renderMetric("Needs review", needsReview),
      renderMetric("Minimized", minimizedItems)
    ].join("");
    renderTriageControls(triageRecords);
    elements.sources.innerHTML = renderSources(sources);
    elements.facts.innerHTML = renderFacts(facts);
    elements.suggestions.innerHTML = renderSuggestions(suggestions);
    elements.followUps.innerHTML = renderFollowUps(followUps);
    elements.riskNotes.innerHTML = renderRiskNotes(issues);
    elements.limitations.innerHTML = renderLimitations(limitations);
  }

  function renderMetric(label, value) {
    return `
      <div class="home-metric">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderFilteredEmptyState(label) {
    const visibilityDetail = shouldShowReviewedItems()
      ? "the current triage filter"
      : "the current triage filter and reviewed-item visibility setting";

    return `<p class="staged-muted">No ${escapeHtml(label)} match ${escapeHtml(visibilityDetail)}.</p>`;
  }

  function countPublicResearchNeedingReview(groups) {
    return pendingCount(groups.facts) +
      pendingSuggestions(groups.suggestions).length +
      openCount(groups.followUps) +
      openCount(groups.issues) +
      openCount(groups.limitations);
  }

  function countMinimizedPublicResearchItems(displayState, groups) {
    return [
      ["source", groups.sources],
      ["fact", groups.facts],
      ["suggestion", groups.suggestions],
      ["follow_up", groups.followUps],
      ["issue", groups.issues],
      ["limitation", groups.limitations]
    ].reduce((count, [type, records]) => count + records.filter((record) => (
      record.id && isPublicInfoItemMinimized(displayState, type, record.id)
    )).length, 0);
  }

  function getPublicTriageRecords(groups) {
    return [
      ...groups.facts.map((record) => ({ record, type: "fact" })),
      ...groups.suggestions.map((record) => ({ record, type: "suggestion" })),
      ...groups.followUps.map((record) => ({ record, type: "follow_up" })),
      ...groups.issues.map((record) => ({ record, type: "issue" })),
      ...groups.limitations.map((record) => ({ record, type: "limitation" }))
    ];
  }

  function renderTriageControls(items) {
    if (!elements.triageCounts) {
      return;
    }

    const activeFilter = getActiveTriageFilter();
    const counts = items.reduce((accumulator, item) => {
      const triage = getPublicTriage(item.record, item.type);
      accumulator[triage.tier] = (accumulator[triage.tier] || 0) + 1;
      return accumulator;
    }, {});

    const total = items.length;
    const countItems = [
      ["", "All", total],
      ...TRIAGE_ORDER.map((tier) => [tier, TRIAGE_TIERS[tier], counts[tier] || 0])
    ];

    elements.triageCounts.innerHTML = countItems
      .map(([tier, label, value]) => `
        <button
          type="button"
          class="triage-count-chip ${activeFilter === tier ? "triage-count-chip-active" : ""}"
          data-triage-filter="${escapeHtml(tier)}"
        >
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </button>
      `)
      .join("");
  }

  function handleTriageCountClick(event) {
    const button = event.target.closest("[data-triage-filter]");

    if (!button || !elements.triageFilter) {
      return;
    }

    elements.triageFilter.value = button.getAttribute("data-triage-filter") || "";
    render();
  }

  function getActiveTriageFilter() {
    return elements.triageFilter ? elements.triageFilter.value : "";
  }

  function filterByActiveTriage(records, type) {
    const activeFilter = getActiveTriageFilter();

    if (!activeFilter) {
      return records;
    }

    return records.filter((record) => getPublicTriage(record, type).tier === activeFilter);
  }

  function filterByReviewVisibility(records, type) {
    if (shouldShowReviewedItems()) {
      return records;
    }

    return records.filter((record) => !isProcessedPublicInfoRecord(record, type));
  }

  function getVisiblePublicInfoRecords(records, type) {
    return filterByActiveTriage(filterByReviewVisibility(records, type), type);
  }

  function shouldShowReviewedItems() {
    return !elements.showReviewed || elements.showReviewed.checked;
  }

  function getSectionRecordsForDisplayType(type) {
    if (type === "source") {
      return readCollection(COLLECTIONS.sources).slice(0, 20);
    }

    if (type === "fact") {
      return getVisiblePublicInfoRecords(readCollection(COLLECTIONS.facts), "fact");
    }

    if (type === "suggestion") {
      return getVisiblePublicInfoRecords(readCollection(COLLECTIONS.suggestions), "suggestion");
    }

    if (type === "follow_up") {
      return getVisiblePublicInfoRecords(readCollection(COLLECTIONS.followUps), "follow_up");
    }

    if (type === "issue" || type === "limitation") {
      const riskNotes = readCollection(COLLECTIONS.riskNotes);
      const records = type === "limitation"
        ? riskNotes.filter((note) => note.noteType === "research_limitation")
        : riskNotes.filter((note) => note.noteType !== "research_limitation");

      return getVisiblePublicInfoRecords(records, type);
    }

    return [];
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

  function renderSources(sources) {
    if (!sources.length) {
      return '<p class="staged-muted">No public source records imported yet.</p>';
    }

    const visibleSources = sources.slice(0, 20);
    const displayState = getPublicInfoDisplayState();

    return [
      renderSectionDisplayControls("source", visibleSources),
      ...visibleSources.map((source) => isPublicInfoItemMinimized(displayState, "source", source.id)
        ? renderMinimizedPublicInfoItem(source, "source")
        : `
        <article class="review-queue-item public-info-item">
          <div>
            <div class="staged-badge-row">
              <span class="staged-badge">${escapeHtml(formatDisplayLabel(source.sourceType || "public_source"))}</span>
            </div>
            <h3>${renderSourceTitle(source)}</h3>
            <p>${escapeHtml(source.summary || "No summary provided.")}</p>
            ${renderMetaRows([
              ["Source URL", getRecordUrl(source)],
              ["Publisher", source.publisher],
              ["Publication date", source.publicationDate],
              ["Accessed", source.accessedDate],
              ["Reliability notes", source.reliabilityNotes]
            ])}
          </div>
          <div class="review-action-stack">
            ${renderDisplayToggle("source", source.id, false)}
          </div>
        </article>
      `)
    ].join("");
  }

  function renderMinimizedPublicInfoItem(record, type) {
    const sourceTitle = type === "source" ? record.publisher || "" : record.sourceTitle || "";
    const triageChip = type === "source" ? "" : renderTriageChip(getPublicTriage(record, type));

    return `
      <article class="review-queue-item public-info-item public-info-item-minimized status-${escapeHtml(publicInfoItemStatus(record, type))}">
        <div>
          <div class="staged-badge-row">
            ${triageChip}
            <span class="staged-badge">${escapeHtml(publicInfoItemTypeLabel(type))}</span>
            <span class="staged-badge">${escapeHtml(statusText(publicInfoItemStatus(record, type)))}</span>
          </div>
          <h3>${escapeHtml(publicInfoItemTitle(record, type))}</h3>
          ${sourceTitle ? `<p>Source: ${escapeHtml(sourceTitle)}</p>` : ""}
        </div>
        <div class="review-action-stack">
          ${renderDisplayToggle(type, record.id, true)}
        </div>
      </article>
    `;
  }

  function renderDisplayToggle(type, id, isMinimized) {
    if (!id) {
      return "";
    }

    return `
      <button
        type="button"
        class="button secondary"
        data-public-display-action="${isMinimized ? "expand" : "minimize"}"
        data-public-display-type="${escapeHtml(type)}"
        data-record-id="${escapeHtml(id)}"
      >${isMinimized ? "Expand" : "Minimize"}</button>
    `;
  }

  function renderSectionDisplayControls(type, records) {
    const itemCount = records.filter((record) => record.id).length;

    if (!itemCount) {
      return "";
    }

    const displayState = getPublicInfoDisplayState();
    const minimizedCount = records.filter((record) => (
      record.id && isPublicInfoItemMinimized(displayState, type, record.id)
    )).length;

    return `
      <div class="public-section-display-actions" aria-label="${escapeHtml(publicInfoItemTypeLabel(type))} display controls">
        <span>${escapeHtml(minimizedCount ? `${minimizedCount} of ${itemCount} minimized` : `${itemCount} item${itemCount === 1 ? "" : "s"}`)}</span>
        <div>
          <button
            type="button"
            class="button secondary"
            data-public-section-display-action="minimize"
            data-public-display-type="${escapeHtml(type)}"
            ${minimizedCount === itemCount ? "disabled" : ""}
          >Minimize All</button>
          <button
            type="button"
            class="button secondary"
            data-public-section-display-action="expand"
            data-public-display-type="${escapeHtml(type)}"
            ${minimizedCount === 0 ? "disabled" : ""}
          >Expand All</button>
        </div>
      </div>
    `;
  }

  function publicInfoItemTypeLabel(type) {
    const labels = {
      source: "Public Source",
      fact: "Public Fact",
      suggestion: "Suggested Answer",
      follow_up: "Follow-Up",
      issue: "Potential Issue",
      limitation: "Research Limitation"
    };

    return labels[type] || "Public Research Item";
  }

  function publicInfoItemTitle(record, type) {
    if (type === "source") {
      return record.title || record.sourceTitle || getRecordUrl(record) || "Public source";
    }

    if (type === "fact") {
      return formatDisplayLabel(record.factType || "Public fact");
    }

    if (type === "suggestion") {
      return record.suggestedLabel || labelFor(record.answerKey, record.suggestedValue);
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

  function publicInfoItemStatus(record, type) {
    if (type === "source") {
      return record.status || "imported";
    }

    if (type === "fact") {
      return record.reviewStatus || record.status || "pending";
    }

    if (type === "suggestion") {
      return record.status || record.reviewStatus || "pending_review";
    }

    return record.status || "open";
  }

  function renderFacts(facts) {
    if (!facts.length) {
      return '<p class="staged-muted">No public facts imported yet.</p>';
    }

    const filteredFacts = getVisiblePublicInfoRecords(facts, "fact");
    const displayState = getPublicInfoDisplayState();

    if (!filteredFacts.length) {
      return renderFilteredEmptyState("public facts");
    }

    return [
      renderSectionDisplayControls("fact", filteredFacts),
      ...filteredFacts
      .sort(sortByStatusThenNewest)
      .map((fact) => isPublicInfoItemMinimized(displayState, "fact", fact.id)
        ? renderMinimizedPublicInfoItem(fact, "fact")
        : `
        <article class="review-queue-item public-info-item status-${escapeHtml(fact.reviewStatus || "pending")}">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getPublicTriage(fact, "fact"))}
              <span class="staged-badge">${escapeHtml(statusText(fact.reviewStatus || "pending"))}</span>
              <span class="staged-badge ${fact.isInference ? "staged-badge-info" : ""}">${escapeHtml(fact.isInference ? "Inference" : "Fact")}</span>
              <span class="staged-badge">${escapeHtml(formatDisplayLabel(fact.confidence || "medium"))}</span>
            </div>
            <h3>${escapeHtml(formatDisplayLabel(fact.factType || "Public fact"))}</h3>
            <p>${escapeHtml(fact.factText)}</p>
            ${fact.quoteOrExcerpt ? `<blockquote class="public-info-excerpt">${escapeHtml(fact.quoteOrExcerpt)}</blockquote>` : ""}
            ${renderMetaRows([
              ["Source URL", getRecordUrl(fact)],
              ["Source title", fact.sourceTitle]
            ])}
          </div>
          <div class="review-action-stack">
            ${renderDisplayToggle("fact", fact.id, false)}
            ${fact.reviewStatus === "pending" ? `
              <button type="button" class="button secondary" data-fact-action="accepted" data-record-id="${escapeHtml(fact.id)}">Accept Fact</button>
              <button type="button" class="button secondary button-danger" data-fact-action="dismissed" data-record-id="${escapeHtml(fact.id)}">Dismiss</button>
            ` : ""}
          </div>
        </article>
      `)
    ].join("");
  }

  function renderSuggestions(suggestions) {
    if (!suggestions.length) {
      return '<p class="staged-muted">No public-info project intake suggestions imported yet.</p>';
    }

    const filteredSuggestions = getVisiblePublicInfoRecords(suggestions, "suggestion");
    const displayState = getPublicInfoDisplayState();
    const answers = getAnswers();

    if (!filteredSuggestions.length) {
      return renderFilteredEmptyState("public-info project intake suggestions");
    }

    return [
      renderSectionDisplayControls("suggestion", filteredSuggestions),
      ...filteredSuggestions
      .sort(sortByStatusThenNewest)
      .map((suggestion) => isPublicInfoItemMinimized(displayState, "suggestion", suggestion.id)
        ? renderMinimizedPublicInfoItem(suggestion, "suggestion")
        : renderSuggestionCard(suggestion, answers))
    ].join("");
  }

  function renderSuggestionCard(suggestion, answers) {
    const applyState = getSuggestionApplyState(suggestion, answers);
    const appliedState = getSuggestionAppliedState(suggestion, answers);
    const currentValue = applyState.eligible ? applyState.currentValue : suggestion.existingValue;

    return `
      <article class="review-queue-item public-info-item status-${escapeHtml(suggestion.status || "pending_review")}">
        <div>
          <div class="staged-badge-row">
            ${renderTriageChip(getPublicTriage(suggestion, "suggestion"))}
            <span class="staged-badge">${escapeHtml(statusText(suggestion.status || "pending_review"))}</span>
            ${applyState.action === "replace_answer" ? '<span class="staged-badge staged-badge-warning">Replacement review</span>' : ""}
            ${renderAppliedBadge(appliedState)}
            <span class="staged-badge">${escapeHtml(formatDisplayLabel(suggestion.confidence || "medium"))}</span>
          </div>
          <h3>${escapeHtml(suggestion.suggestedLabel || labelFor(suggestion.answerKey, suggestion.suggestedValue))}</h3>
          <p>${escapeHtml(suggestion.rationale || "Public information suggested this project intake answer.")}</p>
          ${renderMetaRows([
            ["Answer", ANSWER_LABELS[suggestion.answerKey] || suggestion.answerKey],
            ["AI-suggested value", formatAnswerValue(suggestion.answerKey, suggestion.suggestedValue)],
            ["Current value", formatAnswerValue(suggestion.answerKey, currentValue)],
            ["Source title", suggestion.sourceTitle || "Not provided"],
            ["Source URL", getRecordUrl(suggestion)]
          ])}
          ${renderSuggestionApplyState(suggestion, applyState, appliedState)}
        </div>
        <div class="review-action-stack">
          ${renderDisplayToggle("suggestion", suggestion.id, false)}
          ${renderSuggestionApplyActions(suggestion, applyState, appliedState)}
        </div>
      </article>
    `;
  }

  function renderAppliedBadge(appliedState) {
    if (!appliedState) {
      return "";
    }

    return appliedState.matchesCurrent
      ? '<span class="staged-badge staged-badge-info">Applied to Project Intake</span>'
      : '<span class="staged-badge staged-badge-warning">Project Intake differs</span>';
  }

  function renderSuggestionApplyState(suggestion, applyState, appliedState) {
    const messages = [];

    if (appliedState) {
      const className = appliedState.matchesCurrent ? "public-apply-state-applied" : "public-apply-state-mismatch";
      const heading = appliedState.matchesCurrent ? "Applied to Project Intake" : "Applied earlier; Project Intake now differs";
      messages.push(`
        <div class="public-apply-state ${className}">
          <strong>${escapeHtml(heading)}</strong>
          <span>${escapeHtml(appliedState.targetLabel)} was marked with ${escapeHtml(appliedState.appliedValueLabel)}${appliedState.appliedAt ? ` on ${escapeHtml(formatDateTime(appliedState.appliedAt))}` : ""}.</span>
          ${appliedState.matchesCurrent ? "" : `<span>Current Project Intake value: ${escapeHtml(appliedState.currentValueLabel)}.</span>`}
        </div>
      `);
    }

    if (!applyState.eligible) {
      messages.push(`<p class="public-action-help public-apply-note">Direct apply unavailable: ${escapeHtml(applyState.reason)}</p>`);
    } else if (applyState.requiresConfirmation) {
      messages.push('<p class="public-action-help public-apply-note">Review this source-supported value before updating Project Intake.</p>');
    } else if (applyState.action !== "already_present") {
      messages.push('<p class="public-action-help public-apply-note">High-confidence mapped suggestion can be applied directly because the target Project Intake answer is blank.</p>');
    }

    return messages.join("");
  }

  function renderSuggestionApplyActions(suggestion, applyState, appliedState) {
    const status = suggestion.status || "pending_review";
    const actions = [];

    if ((status === "pending_review" || status === "accepted") && applyState.eligible) {
      if (!appliedState || !appliedState.matchesCurrent || applyState.action === "already_present") {
        const action = applyState.requiresConfirmation ? "review_apply" : applyState.action === "already_present" ? "mark_applied" : "apply";
        actions.push(`
          <button type="button" class="button ${applyState.requiresConfirmation ? "secondary" : "primary"}" data-suggestion-action="${escapeHtml(action)}" data-record-id="${escapeHtml(suggestion.id)}">
            ${escapeHtml(applyState.primaryActionLabel)}
          </button>
        `);
      }
    }

    if (status === "pending_review") {
      actions.push(`<button type="button" class="button secondary button-danger" data-suggestion-action="reject" data-record-id="${escapeHtml(suggestion.id)}" title="Dismiss this suggestion and keep it for traceability.">Reject</button>`);
    }

    return actions.join("");
  }
  function renderFollowUps(followUps) {
    if (!followUps.length) {
      return '<p class="staged-muted">No public-info follow-up questions imported yet.</p>';
    }

    const filteredFollowUps = getVisiblePublicInfoRecords(followUps, "follow_up");
    const displayState = getPublicInfoDisplayState();

    if (!filteredFollowUps.length) {
      return renderFilteredEmptyState("public-info follow-up questions");
    }

    return [
      renderSectionDisplayControls("follow_up", filteredFollowUps),
      ...filteredFollowUps
      .sort(sortByPriorityThenNewest)
      .map((followUp) => isPublicInfoItemMinimized(displayState, "follow_up", followUp.id)
        ? renderMinimizedPublicInfoItem(followUp, "follow_up")
        : `
        <article class="review-queue-item public-info-item status-${escapeHtml(followUp.status || "open")}">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getPublicTriage(followUp, "follow_up"))}
              <span class="staged-badge ${followUp.priority === "high" ? "staged-badge-warning" : ""}">${escapeHtml(formatDisplayLabel(followUp.priority || "medium"))}</span>
              <span class="staged-badge">${escapeHtml(statusText(followUp.status || "open"))}</span>
            </div>
            <h3>${escapeHtml(followUp.question || "Untitled follow-up")}</h3>
            <p>${escapeHtml(followUp.reason || "No reason provided.")}</p>
            ${renderMetaRows([
              ["Related answers", relatedAnswerLabels(followUp.relatedAnswerKeys || [])],
              ["Source URL", getRecordUrl(followUp)]
            ])}
            ${renderFollowUpManagePanel(followUp)}
          </div>
          <div class="review-action-stack">
            ${renderDisplayToggle("follow_up", followUp.id, false)}
            ${followUp.status === "open" ? `
              <button type="button" class="button secondary" data-followup-action="open" data-record-id="${escapeHtml(followUp.id)}" title="Leave this item unresolved for later review.">Keep Open</button>
              <button type="button" class="button secondary" data-followup-action="addressed" data-record-id="${escapeHtml(followUp.id)}" title="Mark that the consultant handled this outside the system or elsewhere.">Mark Addressed</button>
              <button type="button" class="button secondary button-danger" data-followup-action="dismissed" data-record-id="${escapeHtml(followUp.id)}" title="Remove this item from active attention because it is not relevant or needed.">Dismiss</button>
            ` : ""}
          </div>
        </article>
      `)
    ].join("");
  }

  function renderFollowUpManagePanel(followUp) {
    const hasRelatedAnswers = Array.isArray(followUp.relatedAnswerKeys) && followUp.relatedAnswerKeys.length;

    return `
      <details class="public-manage-panel">
        <summary>Manage</summary>
        <div class="public-manage-content">
          <p class="public-action-help">Manage opens details and next-step actions without changing confirmed project intake answers.</p>
          ${renderMetaRows([
            ["Question", followUp.question || "Untitled follow-up"],
            ["Reason", followUp.reason || "No reason provided."],
            ["Priority", formatDisplayLabel(followUp.priority || "medium")],
            ["Status", statusText(followUp.status || "open")],
            ["Related answers", relatedAnswerLabels(followUp.relatedAnswerKeys || [])],
            ["Source URL", getRecordUrl(followUp)],
            ["Recommended next action", hasRelatedAnswers ? "Review the related project intake answer and confirm whether the answer should change." : "Resolve this question through client discussion or additional source review, then mark it addressed or dismiss it."]
          ])}
          <div class="public-manage-actions">
            ${hasRelatedAnswers ? '<a class="button secondary inline-button" href="interview.html">Open Project Intake</a>' : ""}
            <a class="button secondary inline-button" href="client-source-intake.html">Open Client Source Intake</a>
          </div>
        </div>
      </details>
    `;
  }

  function renderRiskNotes(notes) {
    if (!notes.length) {
      return '<p class="staged-muted">No public-source potential issues imported yet.</p>';
    }

    const filteredNotes = getVisiblePublicInfoRecords(notes, "issue");
    const displayState = getPublicInfoDisplayState();

    if (!filteredNotes.length) {
      return renderFilteredEmptyState("public-source potential issues");
    }

    return [
      renderSectionDisplayControls("issue", filteredNotes),
      ...filteredNotes
      .sort(sortByPriorityThenNewest)
      .map((note) => isPublicInfoItemMinimized(displayState, "issue", note.id)
        ? renderMinimizedPublicInfoItem(note, "issue")
        : `
        <article class="review-queue-item public-info-item status-${escapeHtml(note.status || "open")}">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getPublicTriage(note, "issue"))}
              <span class="staged-badge ${note.severity === "high" ? "staged-badge-warning" : ""}">${escapeHtml(formatDisplayLabel(note.severity || "medium"))}</span>
              <span class="staged-badge">${escapeHtml(statusText(note.status || "open"))}</span>
            </div>
            <h3>${escapeHtml(note.issue || "Untitled potential issue")}</h3>
            <p>${escapeHtml(note.whyItMatters || "No issue detail provided.")}</p>
            ${renderMetaRows([
              ["Recommended action", note.recommendedAction],
              ["Source URL", getRecordUrl(note)]
            ])}
            ${renderRiskManagePanel(note)}
          </div>
          <div class="review-action-stack">
            ${renderDisplayToggle("issue", note.id, false)}
            ${note.status === "open" ? `
              <button type="button" class="button secondary" data-risk-action="open" data-record-id="${escapeHtml(note.id)}" title="Leave this item unresolved for later review.">Keep Open</button>
              <button type="button" class="button secondary" data-risk-action="addressed" data-record-id="${escapeHtml(note.id)}" title="Mark that the consultant handled this outside the system or elsewhere.">Mark Addressed</button>
              <button type="button" class="button secondary" data-risk-action="converted_to_follow_up" data-record-id="${escapeHtml(note.id)}" title="Create a follow-up question from this potential issue.">Convert to Follow-Up</button>
              <button type="button" class="button secondary button-danger" data-risk-action="dismissed" data-record-id="${escapeHtml(note.id)}" title="Remove this item from active attention because it is not relevant or needed.">Dismiss</button>
            ` : ""}
          </div>
        </article>
      `)
    ].join("");
  }

  function renderRiskManagePanel(note) {
    return `
      <details class="public-manage-panel">
        <summary>Manage</summary>
        <div class="public-manage-content">
          <p class="public-action-help">Manage opens details and next-step actions for this public-source issue.</p>
          ${renderMetaRows([
            ["Issue", note.issue || "Untitled potential issue"],
            ["Why it matters", note.whyItMatters || "No issue detail provided."],
            ["Severity", formatDisplayLabel(note.severity || "medium")],
            ["Status", statusText(note.status || "open")],
            ["Recommended action", note.recommendedAction || "Review the issue and decide whether it needs follow-up."],
            ["Source URL", getRecordUrl(note)]
          ])}
          <div class="public-manage-actions">
            ${note.status === "open" ? `<button type="button" class="button secondary inline-button" data-risk-action="converted_to_follow_up" data-record-id="${escapeHtml(note.id)}">Convert to Follow-Up</button>` : ""}
            <a class="button secondary inline-button" href="review-queue.html">Open Review Queue</a>
            <a class="button secondary inline-button" href="interview.html">Open Project Intake</a>
          </div>
        </div>
      </details>
    `;
  }

  function renderLimitations(limitations) {
    if (!limitations.length) {
      return '<p class="staged-muted">No research limitations imported yet.</p>';
    }

    const filteredLimitations = getVisiblePublicInfoRecords(limitations, "limitation");
    const displayState = getPublicInfoDisplayState();

    if (!filteredLimitations.length) {
      return renderFilteredEmptyState("research limitations");
    }

    return [
      renderSectionDisplayControls("limitation", filteredLimitations),
      ...filteredLimitations
      .sort(sortByPriorityThenNewest)
      .map((limitation) => isPublicInfoItemMinimized(displayState, "limitation", limitation.id)
        ? renderMinimizedPublicInfoItem(limitation, "limitation")
        : `
        <article class="review-queue-item public-info-item status-${escapeHtml(limitation.status || "open")}">
          <div>
            <div class="staged-badge-row">
              ${renderTriageChip(getPublicTriage(limitation, "limitation"))}
              <span class="staged-badge">${escapeHtml(statusText(limitation.status || "open"))}</span>
            </div>
            <h3>${escapeHtml(limitation.limitation || "Research limitation")}</h3>
            ${limitation.whyItMatters ? `<p>${escapeHtml(limitation.whyItMatters)}</p>` : ""}
            ${renderMetaRows([
              ["Recommended action", limitation.recommendedAction],
              ["Related answers", relatedAnswerLabels(limitation.relatedAnswerKeys || [])],
              ["Source URL", getRecordUrl(limitation)]
            ])}
            ${renderLimitationManagePanel(limitation)}
          </div>
          <div class="review-action-stack">
            ${renderDisplayToggle("limitation", limitation.id, false)}
            ${renderLimitationStatusActions(limitation)}
          </div>
        </article>
      `)
    ].join("");
  }

  function renderLimitationStatusActions(limitation) {
    const status = limitation.status || "open";

    if (status === "open") {
      return `
        <button type="button" class="button secondary" data-risk-action="open" data-record-id="${escapeHtml(limitation.id)}" title="Leave this item unresolved for later review.">Keep Open</button>
        <button type="button" class="button secondary" data-risk-action="addressed" data-record-id="${escapeHtml(limitation.id)}" title="Mark that the consultant handled this outside the system or elsewhere.">Mark Addressed</button>
        <button type="button" class="button secondary button-danger" data-risk-action="dismissed" data-record-id="${escapeHtml(limitation.id)}" title="Remove this item from active attention because it is not relevant or needed.">Dismiss</button>
      `;
    }

    return `
      <button type="button" class="button secondary" data-risk-action="open" data-record-id="${escapeHtml(limitation.id)}" title="Reopen this research limitation for later review.">Reopen</button>
      ${status !== "addressed" ? `<button type="button" class="button secondary" data-risk-action="addressed" data-record-id="${escapeHtml(limitation.id)}">Mark Addressed</button>` : ""}
      ${status !== "dismissed" ? `<button type="button" class="button secondary button-danger" data-risk-action="dismissed" data-record-id="${escapeHtml(limitation.id)}">Dismiss</button>` : ""}
    `;
  }

  function renderLimitationManagePanel(limitation) {
    const hasRelatedAnswers = Array.isArray(limitation.relatedAnswerKeys) && limitation.relatedAnswerKeys.length;

    return `
      <details class="public-manage-panel">
        <summary>Manage</summary>
        <div class="public-manage-content">
          <p class="public-action-help">Manage opens details and next-step actions for this research limitation.</p>
          ${renderMetaRows([
            ["Limitation", limitation.limitation || "Research limitation"],
            ["Why it matters", limitation.whyItMatters || "Not provided"],
            ["Status", statusText(limitation.status || "open")],
            ["Recommended action", limitation.recommendedAction || "Confirm what additional research or source material is needed."],
            ["Related answers", relatedAnswerLabels(limitation.relatedAnswerKeys || [])],
            ["Source URL", getRecordUrl(limitation)]
          ])}
          <div class="public-manage-actions">
            ${(limitation.status || "open") === "open" ? `
              <button type="button" class="button secondary inline-button" data-risk-action="create_follow_up" data-record-id="${escapeHtml(limitation.id)}">Create Follow-Up</button>
              <button type="button" class="button secondary inline-button" data-risk-action="create_potential_issue" data-record-id="${escapeHtml(limitation.id)}">Create Potential Issue</button>
            ` : `<button type="button" class="button secondary inline-button" data-risk-action="open" data-record-id="${escapeHtml(limitation.id)}">Reopen</button>`}
            <a class="button secondary inline-button" href="client-source-intake.html">Open Client Source Intake</a>
            ${hasRelatedAnswers ? '<a class="button secondary inline-button" href="interview.html">Open Project Intake</a>' : ""}
          </div>
        </div>
      </details>
    `;
  }

  function renderMetaRows(rows) {
    return `
      <dl class="review-queue-meta">
        ${rows
          .map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${renderMetaValue(label, value)}</dd>
            </div>
          `)
          .join("")}
      </dl>
    `;
  }

  function updateRecord(collection, id, updater) {
    const records = readCollection(collection);
    saveCollection(
      collection,
      records.map((record) => record.id === id ? updater(record) : record)
    );
    render();
  }

  function prependCollection(collection, records) {
    if (!records.length) {
      return;
    }

    saveCollection(collection, [...records, ...readCollection(collection)]);
  }

  function readCollection(collection) {
    try {
      const workspace = getWorkspace();
      return JSON.parse(localStorage.getItem(scopedKey(workspace.id, collection))) || [];
    } catch (error) {
      return [];
    }
  }

  function saveCollection(collection, records) {
    const workspace = getWorkspace();
    localStorage.setItem(scopedKey(workspace.id, collection), JSON.stringify(records));
  }

  function getPublicInfoDisplayState() {
    const workspace = getWorkspace();
    const savedState = readDisplayState(workspace.id);
    return normalizePublicInfoDisplayState(workspace.id, savedState);
  }

  function readDisplayState(workspaceId) {
    try {
      return JSON.parse(localStorage.getItem(scopedKey(workspaceId, COLLECTIONS.displayState))) || null;
    } catch (error) {
      return null;
    }
  }

  function normalizePublicInfoDisplayState(workspaceId, displayState) {
    if (!displayState || typeof displayState !== "object" || Array.isArray(displayState)) {
      return createDefaultPublicInfoDisplayState(workspaceId);
    }

    const minimized = {};
    const savedMinimized = displayState.minimized && typeof displayState.minimized === "object"
      ? displayState.minimized
      : {};

    Object.entries(savedMinimized).forEach(([key, value]) => {
      if (value) {
        minimized[key] = true;
      }
    });

    return {
      version: PUBLIC_INFO_DISPLAY_STATE_VERSION,
      workspaceId,
      updatedAt: displayState.updatedAt || "",
      minimized
    };
  }

  function createDefaultPublicInfoDisplayState(workspaceId) {
    return {
      version: PUBLIC_INFO_DISPLAY_STATE_VERSION,
      workspaceId,
      updatedAt: "",
      minimized: {}
    };
  }

  function savePublicInfoDisplayState(displayState) {
    const workspace = getWorkspace();
    const normalized = normalizePublicInfoDisplayState(workspace.id, displayState);
    normalized.updatedAt = new Date().toISOString();
    localStorage.setItem(scopedKey(workspace.id, COLLECTIONS.displayState), JSON.stringify(normalized));
  }

  function setPublicInfoItemMinimized(type, id, isMinimized) {
    const displayState = getPublicInfoDisplayState();
    const key = publicInfoDisplayKey(type, id);

    if (isMinimized) {
      displayState.minimized[key] = true;
    } else {
      delete displayState.minimized[key];
    }

    savePublicInfoDisplayState(displayState);
  }

  function setPublicInfoItemsMinimized(type, records, isMinimized) {
    const displayState = getPublicInfoDisplayState();

    records.forEach((record) => {
      if (!record.id) {
        return;
      }

      const key = publicInfoDisplayKey(type, record.id);

      if (isMinimized) {
        displayState.minimized[key] = true;
      } else {
        delete displayState.minimized[key];
      }
    });

    savePublicInfoDisplayState(displayState);
  }

  function isPublicInfoItemMinimized(displayState, type, id) {
    return Boolean(displayState?.minimized?.[publicInfoDisplayKey(type, id)]);
  }

  function publicInfoDisplayKey(type, id) {
    return `${type}:${id}`;
  }

  function scopedKey(workspaceId, collection) {
    return `rfpWorkspace:${workspaceId}:${collection}`;
  }

  function getWorkspace() {
    return window.RfpWorkspaces.getActiveWorkspace();
  }

  function getAnswers() {
    return window.RfpWorkspaces.getAnswers() || {};
  }

  function pendingCount(records) {
    return records.filter((record) => (record.reviewStatus || record.status || "pending") === "pending").length;
  }

  function pendingSuggestions(suggestions) {
    return suggestions.filter((suggestion) => suggestion.status === "pending_review");
  }

  function openCount(records) {
    return records.filter((record) => (record.status || "open") === "open").length;
  }

  function isProcessedPublicInfoRecord(record, type) {
    if (type === "source") {
      return false;
    }

    const status = type === "fact"
      ? record.reviewStatus || record.status || "pending"
      : record.status || record.reviewStatus || "open";

    return PROCESSED_PUBLIC_STATUSES.has(String(status).toLowerCase());
  }

  function sortByStatusThenNewest(a, b) {
    const statusDelta = statusRank(a) - statusRank(b);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return getTime(b) - getTime(a);
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

  function statusRank(record) {
    const status = record.reviewStatus || record.status || "pending";
    const ranks = { pending: 0, pending_review: 0, open: 0, accepted: 1, addressed: 1, dismissed: 2, rejected: 2 };
    return ranks[status] ?? 3;
  }

  function getTime(record) {
    const time = Date.parse(record.updatedAt || record.reviewedAt || record.createdAt || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function normalizeSuggestedValues(suggestion) {
    const value = suggestion.suggestedValue;

    if (Array.isArray(value)) {
      return value.map((item) => clean(item)).filter(Boolean);
    }

    return [clean(value)].filter(Boolean);
  }

  function isAllowedAnswerValue(answerKey, value) {
    const options = optionLists[answerKey] || [];

    if (!options.length) {
      return true;
    }

    return options.some((option) => option.value === value);
  }

  function getConflictState(answerKey, value, answers) {
    const existing = answers[answerKey];

    if (ARRAY_ANSWER_KEYS.has(answerKey)) {
      return Array.isArray(existing) && existing.includes(value) ? "already_present" : "can_merge";
    }

    if (!existing) {
      return "none";
    }

    return existing === value ? "already_present" : "conflicts_existing_answer";
  }

  function normalizeAnswerKeys(keys) {
    if (!Array.isArray(keys)) {
      return [];
    }

    return keys.filter((key) => ALLOWED_ANSWER_KEYS.includes(key));
  }

  function normalizeConfidence(value) {
    return ["low", "medium", "high"].includes(value) ? value : "medium";
  }

  function normalizePriority(value) {
    return ["low", "medium", "high"].includes(value) ? value : "medium";
  }

  function labelFor(answerKey, value) {
    return optionLookups[answerKey] && optionLookups[answerKey].get(value)
      ? optionLookups[answerKey].get(value)
      : formatDisplayLabel(value);
  }

  function relatedAnswerLabels(keys) {
    const labels = (keys || [])
      .filter((key) => ANSWER_LABELS[key])
      .map((key) => ANSWER_LABELS[key]);

    return labels.length ? labels.join(", ") : "Not linked";
  }

  function formatAnswerValue(answerKey, value) {
    if (Array.isArray(value)) {
      return value.map((item) => labelFor(answerKey, item)).join(", ");
    }

    return value ? labelFor(answerKey, value) : "Not provided";
  }

  function formatMetaValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "Not provided";
    }

    return value || "Not provided";
  }

  function getRecordUrl(record) {
    if (!record || typeof record !== "object") {
      return "";
    }

    const directUrl = getUrlCandidateValues(record)
      .map(extractSafeUrl)
      .find(Boolean);

    if (directUrl) {
      return directUrl;
    }

    const collectionUrl = getUrlCollectionValues(record)
      .map(firstUrlFromCollection)
      .find(Boolean);

    if (collectionUrl) {
      return collectionUrl;
    }

    return getEmbeddedUrlFallback(record);
  }

  function getUrlCandidateValues(record) {
    const approvedKeys = new Set([
      "sourceurl",
      "url",
      "citationurl",
      "sourcelink",
      "referenceurl",
      "link",
      "evidenceurl",
      "href"
    ]);

    return Object.entries(record)
      .filter(([key]) => approvedKeys.has(normalizeUrlKey(key)))
      .map(([, value]) => value);
  }

  function getUrlCollectionValues(record) {
    const approvedKeys = new Set([
      "sourcelinks",
      "sourceurls",
      "citations",
      "citation",
      "sources",
      "source",
      "references",
      "referenceurls",
      "links",
      "evidencelinks"
    ]);

    return Object.entries(record)
      .filter(([key]) => approvedKeys.has(normalizeUrlKey(key)))
      .map(([, value]) => value);
  }

  function normalizeUrlKey(key) {
    return String(key || "")
      .trim()
      .replace(/[\s_-]+/g, "")
      .toLowerCase();
  }

  function firstUrlFromCollection(items) {
    if (!items) {
      return "";
    }

    const values = Array.isArray(items) ? items : [items];

    return values
      .map((item) => {
        if (typeof item === "string") {
          return extractSafeUrl(item);
        }

        if (item && typeof item === "object") {
          return getRecordUrl(item);
        }

        return "";
      })
      .find(Boolean) || "";
  }

  function getEmbeddedUrlFallback(record) {
    return [
      record.sourceTitle,
      record.quoteOrExcerpt
    ].map(extractSafeUrl).find(Boolean) || "";
  }

  function findUrlBySourceTitle(record, sourceRecords) {
    const sourceTitle = normalizeTitleForMatch(record.sourceTitle);

    if (!sourceTitle) {
      return "";
    }

    const matches = sourceRecords.filter((source) =>
      normalizeTitleForMatch(source.sourceTitle) === sourceTitle && getRecordUrl(source)
    );

    if (matches.length !== 1) {
      return "";
    }

    return getRecordUrl(matches[0]);
  }

  function normalizeTitleForMatch(value) {
    return clean(value)
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function renderSourceTitle(source) {
    const title = source.sourceTitle || "Untitled public source";
    const sourceUrl = getRecordUrl(source);

    if (!isSafeExternalUrl(sourceUrl)) {
      return escapeHtml(title);
    }

    return `<a class="external-source-link public-source-title-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`;
  }

  function renderMetaValue(label, value) {
    if (isUrlLabel(label)) {
      return renderExternalLink(value);
    }

    return escapeHtml(formatMetaValue(value));
  }

  function isUrlLabel(label) {
    return /\burl\b/i.test(String(label || ""));
  }

  function renderExternalLink(value) {
    const url = extractSafeUrl(value);

    if (!url) {
      return escapeHtml(formatMetaValue(url));
    }

    return `<a class="external-source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
  }

  function extractSafeUrl(value) {
    if (Array.isArray(value)) {
      return firstUrlFromCollection(value);
    }

    if (value && typeof value === "object") {
      return getRecordUrl(value);
    }

    const text = clean(value);

    if (!text) {
      return "";
    }

    const candidates = [
      ...Array.from(text.matchAll(/\[[^\]]*]\(\s*(https?:\/\/[^)\s]+)\s*\)/gi), (match) => match[1]),
      ...Array.from(text.matchAll(/\((https?:\/\/[^)\s]+)\)/gi), (match) => match[1]),
      ...Array.from(text.matchAll(/<\s*(https?:\/\/[^>\s]+)\s*>/gi), (match) => match[1]),
      ...Array.from(text.matchAll(/https?:\/\/[^\s<>)\]]+/gi), (match) => match[0]),
      text
    ];

    return candidates
      .map(cleanUrlCandidate)
      .find(isSafeExternalUrl) || "";
  }

  function cleanUrlCandidate(value) {
    let url = clean(value);

    url = url.replace(/^<+|>+$/g, "");
    url = url.replace(/^["'`]+|["'`]+$/g, "");
    url = url.replace(/[),.;:!?]+$/g, "");

    return url;
  }

  function isSafeExternalUrl(value) {
    if (!/^https?:\/\//i.test(value)) {
      return false;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function parseLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function valueOf(element) {
    return element ? element.value.trim() : "";
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    throw new Error("Clipboard API unavailable.");
  }

  function setPromptPreview(prompt) {
    elements.promptPreview.value = prompt;
  }

  function setSetupStatus(message, isError) {
    setStatus(elements.setupStatus, message, isError);
  }

  function setPromptStatus(message, isError) {
    setStatus(elements.promptStatus, message, isError);
  }

  function setImportStatus(message, status) {
    setStatus(elements.importStatus, message, status);
  }

  function setStatus(element, message, status) {
    if (!element) {
      return;
    }

    const isError = status === true || status === "error";
    const isWarning = status === "warning";

    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.toggle("warning", isWarning);
  }

  function createId(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function statusText(value) {
    return formatDisplayLabel(value || "open");
  }

  function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "date not available";
    }

    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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
      .replace(/\bRfp\b/g, "RFP")
      .replace(/\bDa\b/g, "DA")
      .replace(/\bCjis\b/g, "CJIS");
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

