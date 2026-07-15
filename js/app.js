(function () {
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const DEFAULT_PROFILES_KEY = "rfpDefaultProfiles";
  const DEFAULT_PROFILES_STARTER_SEED_KEY = "rfpDefaultProfilesStarterSeed:v1";
  const PROFILE_MATCH_KEYS = ["justice_domain", "system_type", "client_type", "procurement_type"];
  const STARTER_DEFAULT_PROFILES = [
    {
      id: "starter_court_clerk_cms_rfp",
      name: "Court / Clerk CMS RFP",
      description: "Starter defaults for a court or clerk case management RFP or modernization effort. Keeps client-specific facts blank.",
      matchCriteria: {
        justice_domain: "courts",
        system_type: "court_cms",
        client_type: "court_agency",
        procurement_type: "replacement"
      },
      defaultAnswers: {
        justice_domain: "courts",
        system_type: "court_cms",
        procurement_type: "replacement",
        client_type: "court_agency",
        integration_partners: ["prosecution", "law_enforcement", "jail", "state_criminal_history", "payments", "public_portal"],
        project_type: "software_platform",
        procurement_stage: "rfp_ready",
        integrations: ["sso", "payment", "email", "data_warehouse"],
        reporting_needs: ["dashboards", "scheduled_reports", "ad_hoc", "api_exports"],
        data_sensitivity: "high",
        compliance: ["cjis", "wcag_2_2_aa", "records_retention"],
        implementation_support: ["migration", "training", "change_management", "phased_rollout"],
        vendor_priorities: ["experience", "security", "references", "implementation_capacity"]
      }
    },
    {
      id: "starter_prosecutor_da_cms_rfp",
      name: "Prosecutor / District Attorney CMS RFP",
      description: "Starter defaults for prosecutor or district attorney case management procurement. Keeps agency-specific details blank.",
      matchCriteria: {
        justice_domain: "prosecution",
        system_type: "prosecutor_cms",
        client_type: "prosecutorial_agency",
        procurement_type: "replacement"
      },
      defaultAnswers: {
        justice_domain: "prosecution",
        system_type: "prosecutor_cms",
        procurement_type: "replacement",
        client_type: "prosecutorial_agency",
        integration_partners: ["courts", "law_enforcement", "jail", "state_criminal_history", "digital_evidence", "probation"],
        project_type: "software_platform",
        procurement_stage: "rfp_ready",
        integrations: ["sso", "email", "data_warehouse"],
        reporting_needs: ["dashboards", "scheduled_reports", "ad_hoc", "api_exports"],
        data_sensitivity: "high",
        compliance: ["cjis", "wcag_2_2_aa", "records_retention"],
        implementation_support: ["migration", "training", "change_management", "phased_rollout"],
        vendor_priorities: ["experience", "security", "references", "implementation_capacity"]
      }
    },
    {
      id: "starter_jail_management_system_rfp",
      name: "Jail Management System RFP",
      description: "Starter defaults for a jail management system procurement or modernization effort. Keeps facility-specific facts blank.",
      matchCriteria: {
        justice_domain: "corrections_jail",
        system_type: "jail_management_system",
        client_type: "county_agency",
        procurement_type: "replacement"
      },
      defaultAnswers: {
        justice_domain: "corrections_jail",
        system_type: "jail_management_system",
        procurement_type: "replacement",
        client_type: "county_agency",
        integration_partners: ["courts", "prosecution", "law_enforcement", "state_criminal_history", "payments"],
        project_type: "software_platform",
        procurement_stage: "rfp_ready",
        integrations: ["sso", "payment", "email", "data_warehouse"],
        reporting_needs: ["dashboards", "scheduled_reports", "ad_hoc", "api_exports"],
        data_sensitivity: "high",
        compliance: ["cjis", "wcag_2_2_aa", "records_retention"],
        implementation_support: ["migration", "training", "change_management", "phased_rollout"],
        vendor_priorities: ["experience", "security", "references", "implementation_capacity"]
      }
    },
    {
      id: "starter_justice_integration_data_exchange",
      name: "Justice Integration / Data Exchange",
      description: "Starter defaults for cross-agency justice integration, data exchange, or interoperability projects.",
      matchCriteria: {
        justice_domain: "justice_integration",
        system_type: "justice_integration_platform",
        client_type: "multi_agency_program",
        procurement_type: "integration_project"
      },
      defaultAnswers: {
        justice_domain: "justice_integration",
        system_type: "justice_integration_platform",
        procurement_type: "integration_project",
        client_type: "multi_agency_program",
        integration_partners: ["courts", "prosecution", "law_enforcement", "jail", "probation", "state_criminal_history", "digital_evidence", "identity_access", "data_warehouse", "public_portal"],
        project_type: "software_platform",
        procurement_stage: "rfp_ready",
        integrations: ["sso", "email", "data_warehouse"],
        reporting_needs: ["dashboards", "scheduled_reports", "api_exports"],
        data_sensitivity: "high",
        compliance: ["cjis", "records_retention"],
        implementation_support: ["training", "change_management", "phased_rollout"],
        vendor_priorities: ["experience", "roadmap", "security", "implementation_capacity"]
      }
    },
    {
      id: "starter_justice_technology_assessment",
      name: "Justice Technology Assessment",
      description: "Starter defaults for a justice technology assessment, planning, or advisory engagement. Keeps system-specific assumptions light.",
      matchCriteria: {
        justice_domain: "multi_agency_justice",
        client_type: "multi_agency_program",
        procurement_type: "assessment_planning"
      },
      defaultAnswers: {
        justice_domain: "multi_agency_justice",
        procurement_type: "assessment_planning",
        client_type: "multi_agency_program",
        integration_partners: ["courts", "prosecution", "law_enforcement", "jail", "probation", "data_warehouse"],
        project_type: "professional_services",
        procurement_stage: "discovery",
        reporting_needs: ["dashboards", "ad_hoc"],
        data_sensitivity: "high",
        compliance: ["cjis", "records_retention"],
        implementation_support: ["change_management"],
        vendor_priorities: ["experience", "references", "implementation_capacity"]
      }
    }
  ];
  const root = document.getElementById("questions-root");
  const form = document.getElementById("interview-form");
  const clearButton = document.getElementById("clear-answers");
  const validationSummary = document.getElementById("validation-summary");
  const saveStatus = document.getElementById("interview-save-status");
  const defaultProfileElements = {
    matches: document.getElementById("default-profile-matches"),
    select: document.getElementById("default-profile-select"),
    replace: document.getElementById("default-profile-replace"),
    previewButton: document.getElementById("preview-default-profile"),
    applyButton: document.getElementById("apply-default-profile"),
    preview: document.getElementById("default-profile-preview"),
    status: document.getElementById("default-profile-status")
  };

  let questionsConfig = null;
  let taxonomyConfig = null;
  let defaultProfilePanelBound = false;
  let autosaveTimer = null;
  let hasUnsavedChanges = false;

  function getSavedAnswers() {
    return window.RfpWorkspaces.getAnswers() || {};
  }

  function saveAnswers(answers) {
    window.RfpWorkspaces.saveAnswers(answers);
  }

  function formatSaveTime(date = new Date()) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function setSaveStatus(message, state = "") {
    if (!saveStatus) {
      return;
    }

    saveStatus.textContent = message;
    saveStatus.dataset.state = state;
    saveStatus.classList.toggle("error", state === "error");
  }

  function flushAutosave() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }

    if (!questionsConfig || root.classList.contains("loading-state")) {
      return;
    }

    setSaveStatus("Saving...", "saving");
    saveAnswers(collectAnswers());
    hasUnsavedChanges = false;
    setSaveStatus(`Saved at ${formatSaveTime()}`, "saved");
  }

  function scheduleAutosave() {
    if (!questionsConfig || root.classList.contains("loading-state")) {
      return;
    }

    hasUnsavedChanges = true;
    setSaveStatus("Unsaved changes", "unsaved");

    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    autosaveTimer = setTimeout(flushAutosave, 650);
  }

  function renderInitialSaveStatus() {
    const savedAnswers = getSavedAnswers();

    if (savedAnswers && savedAnswers.savedAt) {
      const savedAt = new Date(savedAnswers.savedAt);
      const label = Number.isNaN(savedAt.getTime()) ? "" : ` at ${formatSaveTime(savedAt)}`;
      setSaveStatus(`Saved${label}`, "saved");
      return;
    }

    setSaveStatus("Answers autosave as you work.", "");
  }

  function createHelpText(question) {
    if (!question.help) {
      return "";
    }

    return `<p class="question-help">${escapeHtml(question.help)}</p>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isChecked(savedValue, optionValue) {
    return Array.isArray(savedValue) && savedValue.includes(optionValue);
  }

  function getSourceOptions(optionSource) {
    if (!optionSource || !taxonomyConfig || !Array.isArray(taxonomyConfig[optionSource])) {
      return [];
    }

    return taxonomyConfig[optionSource].map((option) => ({
      value: option.id,
      label: option.label
    }));
  }

  function resolveQuestionOptions(question) {
    if (!question.optionSource) {
      return question;
    }

    return {
      ...question,
      options: getSourceOptions(question.optionSource)
    };
  }

  function resolveConfigOptions(config) {
    return {
      ...config,
      sections: config.sections.map((section) => ({
        ...section,
        questions: section.questions.map(resolveQuestionOptions)
      }))
    };
  }

  function renderSelect(question, savedAnswers) {
    const savedValue = savedAnswers[question.id] || "";
    const required = question.required ? "required" : "";
    const ariaRequired = question.required ? "aria-required=\"true\"" : "";
    const options = question.options
      .map((option) => {
        const selected = savedValue === option.value ? "selected" : "";
        return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
      })
      .join("");

    return `
      <label for="${escapeHtml(question.id)}">${escapeHtml(question.label)}</label>
      ${createHelpText(question)}
      <select id="${escapeHtml(question.id)}" name="${escapeHtml(question.id)}" ${required} ${ariaRequired}>
        <option value="">Select one</option>
        ${options}
      </select>
    `;
  }

  function renderText(question, savedAnswers) {
    const savedValue = savedAnswers[question.id] || "";
    const required = question.required ? "required" : "";
    const ariaRequired = question.required ? "aria-required=\"true\"" : "";

    if (question.type === "textarea") {
      return `
        <label for="${escapeHtml(question.id)}">${escapeHtml(question.label)}</label>
        ${createHelpText(question)}
        <textarea id="${escapeHtml(question.id)}" name="${escapeHtml(question.id)}" ${required} ${ariaRequired}>${escapeHtml(savedValue)}</textarea>
      `;
    }

    return `
      <label for="${escapeHtml(question.id)}">${escapeHtml(question.label)}</label>
      ${createHelpText(question)}
      <input id="${escapeHtml(question.id)}" name="${escapeHtml(question.id)}" type="text" value="${escapeHtml(savedValue)}" ${required} ${ariaRequired} />
    `;
  }

  function renderChoices(question, savedAnswers) {
    const savedValue = savedAnswers[question.id];
    const inputType = question.type === "radio" ? "radio" : "checkbox";
    const required = question.required && inputType === "radio" ? "required" : "";
    const choices = question.options
      .map((option) => {
        const checked =
          inputType === "radio"
            ? savedValue === option.value
            : isChecked(savedValue, option.value);

        return `
          <label class="choice-item">
            <input
              type="${inputType}"
              name="${escapeHtml(question.id)}"
              value="${escapeHtml(option.value)}"
              ${checked ? "checked" : ""}
              ${required}
              ${question.required ? "aria-required=\"true\"" : ""}
            />
            <span>${escapeHtml(option.label)}</span>
          </label>
        `;
      })
      .join("");

    return `
      <div class="field-label">${escapeHtml(question.label)}</div>
      ${createHelpText(question)}
      <div class="choice-list">${choices}</div>
    `;
  }

  function renderQuestion(question, savedAnswers) {
    const wideClass = question.type === "checkboxes" || question.type === "textarea" ? " full-width" : "";
    let content = "";

    if (question.type === "select") {
      content = renderSelect(question, savedAnswers);
    } else if (question.type === "radio" || question.type === "checkboxes") {
      content = renderChoices(question, savedAnswers);
    } else {
      content = renderText(question, savedAnswers);
    }

    return `<div class="question-field${wideClass}" data-question-id="${escapeHtml(question.id)}">${content}</div>`;
  }

  function renderSections(config) {
    const savedAnswers = getSavedAnswers();
    root.classList.remove("loading-state");
    root.innerHTML = config.sections
      .map((section) => {
        const questions = section.questions
          .map((question) => renderQuestion(question, savedAnswers))
          .join("");

        return `
          <section class="question-section">
            <h2>${escapeHtml(section.title)}</h2>
            <div class="question-grid">${questions}</div>
          </section>
        `;
      })
      .join("");
  }

  function collectAnswers() {
    const answers = {};

    questionsConfig.sections.forEach((section) => {
      section.questions.forEach((question) => {
        const elements = form.elements[question.id];

        if (!elements) {
          return;
        }

        if (question.type === "checkboxes") {
          const boxes = Array.from(elements.length ? elements : [elements]);
          answers[question.id] = boxes
            .filter((item) => item.checked)
            .map((item) => item.value);
          return;
        }

        if (question.type === "radio") {
          const radios = Array.from(elements.length ? elements : [elements]);
          const selected = radios.find((item) => item.checked);
          answers[question.id] = selected ? selected.value : "";
          return;
        }

        answers[question.id] = elements.value.trim();
      });
    });

    return answers;
  }

  function getQuestionList() {
    if (!questionsConfig) {
      return [];
    }

    return questionsConfig.sections.flatMap((section) => section.questions);
  }

  function getQuestionById(questionId) {
    return getQuestionList().find((question) => question.id === questionId);
  }

  function getQuestionLabel(questionId) {
    const question = getQuestionById(questionId);
    return question ? getQuestionDisplayLabel(question) : questionId;
  }

  function getQuestionDisplayLabel(question) {
    if (question && question.id === "integration_partners") {
      return "Integration Partners";
    }

    return question ? question.label : "";
  }

  function hasOptions(question) {
    return Array.isArray(question.options) && question.options.length > 0;
  }

  function isMultiValueQuestion(question) {
    return question && question.type === "checkboxes";
  }

  function isEmptyProfileValue(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || String(value).trim() === "";
  }

  function isValidProfileValue(questionId, value) {
    const question = getQuestionById(questionId);

    if (!question || isEmptyProfileValue(value)) {
      return false;
    }

    if (!hasOptions(question)) {
      return typeof value === "string" || typeof value === "number";
    }

    return question.options.some((option) => option.value === value);
  }

  function labelForValue(questionId, value) {
    const question = getQuestionById(questionId);
    const option = question && question.options
      ? question.options.find((item) => item.value === value)
      : null;

    return option ? option.label : value;
  }

  function formatProfileValue(questionId, value) {
    if (Array.isArray(value)) {
      return value.map((item) => labelForValue(questionId, item)).join(", ");
    }

    return labelForValue(questionId, value);
  }

  function readDefaultProfiles() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEFAULT_PROFILES_KEY)) || [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function seedStarterDefaultProfiles() {
    if (localStorage.getItem(DEFAULT_PROFILES_STARTER_SEED_KEY)) {
      return;
    }

    const existingProfiles = readDefaultProfiles();
    const existingIds = new Set(existingProfiles.map((profile) => profile.id));
    const now = new Date().toISOString();
    const profilesToAdd = STARTER_DEFAULT_PROFILES
      .filter((profile) => !existingIds.has(profile.id))
      .map((profile) => {
        const result = sanitizeDefaultProfile(profile);
        return {
          ...result.profile,
          id: profile.id,
          createdAt: now,
          updatedAt: now
        };
      });
    const nextProfiles = profilesToAdd.length ? [...existingProfiles, ...profilesToAdd] : existingProfiles;

    localStorage.setItem(DEFAULT_PROFILES_KEY, JSON.stringify(nextProfiles));
    localStorage.setItem(
      DEFAULT_PROFILES_STARTER_SEED_KEY,
      JSON.stringify({
        version: 1,
        seededAt: now,
        profileIds: STARTER_DEFAULT_PROFILES.map((profile) => profile.id)
      })
    );
  }

  function sanitizeDefaultProfile(profile) {
    const warnings = [];
    const matchCriteria = {};
    const defaultAnswers = {};

    PROFILE_MATCH_KEYS.forEach((key) => {
      const value = profile.matchCriteria && profile.matchCriteria[key];

      if (!value) {
        return;
      }

      if (isValidProfileValue(key, value)) {
        matchCriteria[key] = value;
      } else {
        warnings.push(`${getQuestionLabel(key)} has an invalid matching value: ${value}`);
      }
    });

    Object.entries(profile.defaultAnswers || {}).forEach(([key, value]) => {
      const question = getQuestionById(key);

      if (!question) {
        warnings.push(`Unknown project intake answer key skipped: ${key}`);
        return;
      }

      if (isMultiValueQuestion(question)) {
        const values = Array.isArray(value) ? value : [value];
        const validValues = values.filter((item) => isValidProfileValue(key, item));
        const invalidValues = values.filter((item) => !isValidProfileValue(key, item));

        invalidValues.forEach((item) => {
          warnings.push(`${getQuestionDisplayLabel(question)} has an invalid value: ${item}`);
        });

        if (validValues.length) {
          defaultAnswers[key] = Array.from(new Set(validValues));
        }
        return;
      }

      const normalizedValue = String(value || "").trim();

      if (!normalizedValue) {
        return;
      }

      if (hasOptions(question) && !isValidProfileValue(key, normalizedValue)) {
        warnings.push(`${getQuestionDisplayLabel(question)} has an invalid value: ${normalizedValue}`);
        return;
      }

      defaultAnswers[key] = normalizedValue;
    });

    return {
      profile: {
        ...profile,
        matchCriteria,
        defaultAnswers
      },
      warnings
    };
  }

  function getCurrentInterviewAnswers() {
    if (!questionsConfig || root.classList.contains("loading-state")) {
      return getSavedAnswers();
    }

    return collectAnswers();
  }

  function getDefaultProfileMatch(profile, answers) {
    const result = sanitizeDefaultProfile(profile);
    const criteriaEntries = Object.entries(result.profile.matchCriteria || {});
    let matched = 0;
    let pending = 0;

    for (const [key, value] of criteriaEntries) {
      const answer = answers[key];

      if (isEmptyProfileValue(answer)) {
        pending += 1;
      } else if (answer === value) {
        matched += 1;
      } else {
        return null;
      }
    }

    const criteriaCount = criteriaEntries.length;
    let label = "General profile";

    if (criteriaCount && matched === criteriaCount) {
      label = "Best match";
    } else if (criteriaCount) {
      label = "Partial match";
    }

    return {
      profile,
      sanitizedProfile: result.profile,
      warnings: result.warnings,
      matched,
      pending,
      criteriaCount,
      label,
      score: matched * 10 + criteriaCount - pending
    };
  }

  function getMatchingDefaultProfiles() {
    const answers = getCurrentInterviewAnswers();
    return readDefaultProfiles()
      .map((profile) => getDefaultProfileMatch(profile, answers))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return String(b.profile.updatedAt || "").localeCompare(String(a.profile.updatedAt || ""));
      });
  }

  function buildDefaultProfilePreview(profile, answers, replaceExisting) {
    const result = sanitizeDefaultProfile(profile);
    const preview = {
      added: [],
      already: [],
      conflicts: [],
      invalid: result.warnings.map((warning) => ({ label: warning, value: "Skipped" }))
    };

    Object.entries(result.profile.defaultAnswers).forEach(([key, value]) => {
      const question = getQuestionById(key);

      if (isMultiValueQuestion(question)) {
        const currentValues = Array.isArray(answers[key]) ? answers[key] : [];

        value.forEach((item) => {
          const previewItem = {
            key,
            label: getQuestionDisplayLabel(question),
            value: labelForValue(key, item)
          };

          if (currentValues.includes(item)) {
            preview.already.push(previewItem);
          } else {
            preview.added.push(previewItem);
          }
        });
        return;
      }

      const previewItem = {
        key,
        label: getQuestionDisplayLabel(question),
        value: formatProfileValue(key, value),
        currentValue: formatProfileValue(key, answers[key] || "")
      };

      if (isEmptyProfileValue(answers[key])) {
        preview.added.push(previewItem);
      } else if (answers[key] === value) {
        preview.already.push(previewItem);
      } else {
        preview.conflicts.push({
          ...previewItem,
          value: replaceExisting
            ? `${previewItem.currentValue} -> ${previewItem.value}`
            : `${previewItem.value} (current answer preserved)`
        });
      }
    });

    return preview;
  }

  function renderDefaultProfilePanel(statusMessage, isError) {
    if (!defaultProfileElements.matches || !questionsConfig) {
      return;
    }

    const matches = getMatchingDefaultProfiles();
    const previousSelection = defaultProfileElements.select.value;
    const selectedId = matches.some((match) => match.profile.id === previousSelection)
      ? previousSelection
      : matches[0] && matches[0].profile.id;

    defaultProfileElements.matches.innerHTML = matches.length
      ? matches
          .slice(0, 4)
          .map((match) => `
            <span class="default-profile-match-pill">
              <strong>${escapeHtml(match.profile.name || "Untitled profile")}</strong>
              ${escapeHtml(match.label)}
            </span>
          `)
          .join("")
      : '<p class="staged-muted">No matching default profiles. Create one from the Default Profiles page.</p>';

    defaultProfileElements.select.innerHTML = matches.length
      ? matches
          .map((match) => `
            <option value="${escapeHtml(match.profile.id)}" ${match.profile.id === selectedId ? "selected" : ""}>
              ${escapeHtml(match.profile.name || "Untitled profile")} - ${escapeHtml(match.label)}
            </option>
          `)
          .join("")
      : '<option value="">No matching profiles</option>';

    const disabled = !matches.length;
    defaultProfileElements.select.disabled = disabled;
    defaultProfileElements.replace.disabled = disabled;
    defaultProfileElements.previewButton.disabled = disabled;
    defaultProfileElements.applyButton.disabled = disabled;

    renderDefaultProfilePreview();
    setDefaultProfileStatus(statusMessage || "", Boolean(isError));
  }

  function renderDefaultProfilePreview() {
    if (!defaultProfileElements.preview || !questionsConfig) {
      return;
    }

    const profile = readDefaultProfiles().find(
      (item) => item.id === defaultProfileElements.select.value
    );

    if (!profile) {
      defaultProfileElements.preview.innerHTML = "";
      return;
    }

    const preview = buildDefaultProfilePreview(
      profile,
      getCurrentInterviewAnswers(),
      defaultProfileElements.replace.checked
    );

    defaultProfileElements.preview.innerHTML = `
      ${renderDefaultProfilePreviewGroup("Will be added", preview.added)}
      ${renderDefaultProfilePreviewGroup("Already present", preview.already)}
      ${renderDefaultProfilePreviewGroup(
        defaultProfileElements.replace.checked ? "Will replace existing answers" : "Conflicts preserved",
        preview.conflicts
      )}
      ${renderDefaultProfilePreviewGroup("Invalid / skipped", preview.invalid)}
    `;
  }

  function renderDefaultProfilePreviewGroup(label, items) {
    if (!items.length) {
      return "";
    }

    return `
      <section class="default-profile-preview-group">
        <h3>${escapeHtml(label)}</h3>
        <ul>
          ${items
            .map((item) => `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.value)}</li>`)
            .join("")}
        </ul>
      </section>
    `;
  }

  function applySelectedDefaultProfile() {
    const profile = readDefaultProfiles().find(
      (item) => item.id === defaultProfileElements.select.value
    );

    if (!profile) {
      setDefaultProfileStatus("Choose a default profile before applying.", true);
      return;
    }

    const replaceExisting = defaultProfileElements.replace.checked;
    const result = sanitizeDefaultProfile(profile);
    const currentAnswers = getCurrentInterviewAnswers();
    const nextAnswers = { ...currentAnswers };
    let changedCount = 0;

    Object.entries(result.profile.defaultAnswers).forEach(([key, value]) => {
      const question = getQuestionById(key);

      if (isMultiValueQuestion(question)) {
        const currentValues = Array.isArray(nextAnswers[key]) ? [...nextAnswers[key]] : [];

        value.forEach((item) => {
          if (!currentValues.includes(item)) {
            currentValues.push(item);
            changedCount += 1;
          }
        });

        nextAnswers[key] = currentValues;
        return;
      }

      if (isEmptyProfileValue(nextAnswers[key])) {
        nextAnswers[key] = value;
        changedCount += 1;
      } else if (replaceExisting && nextAnswers[key] !== value) {
        nextAnswers[key] = value;
        changedCount += 1;
      }
    });

    saveAnswers(nextAnswers);
    hasUnsavedChanges = false;
    setSaveStatus(`Saved at ${formatSaveTime()}`, "saved");
    renderSections(questionsConfig);
    clearValidationState();
    renderDefaultProfilePanel(
      `Applied ${profile.name || "default profile"}; ${changedCount} value${changedCount === 1 ? "" : "s"} updated.${result.warnings.length ? ` ${result.warnings.length} invalid or stale value${result.warnings.length === 1 ? "" : "s"} skipped.` : ""}`,
      Boolean(result.warnings.length)
    );
  }

  function bindDefaultProfilePanel() {
    if (defaultProfilePanelBound || !defaultProfileElements.select) {
      return;
    }

    defaultProfilePanelBound = true;
    defaultProfileElements.select.addEventListener("change", renderDefaultProfilePreview);
    defaultProfileElements.replace.addEventListener("change", renderDefaultProfilePreview);
    defaultProfileElements.previewButton.addEventListener("click", renderDefaultProfilePreview);
    defaultProfileElements.applyButton.addEventListener("click", applySelectedDefaultProfile);
    form.addEventListener("change", () => renderDefaultProfilePanel());
    form.addEventListener("input", () => renderDefaultProfilePanel());
  }

  function setDefaultProfileStatus(message, isError) {
    if (!defaultProfileElements.status) {
      return;
    }

    defaultProfileElements.status.textContent = message;
    defaultProfileElements.status.classList.toggle("error", Boolean(isError));
  }

  function getControlElements(question) {
    const elements = form.elements[question.id];

    if (!elements) {
      return [];
    }

    return Array.from(elements.length ? elements : [elements]);
  }

  function hasRequiredAnswer(question) {
    const elements = getControlElements(question);

    if (!question.required || !elements.length) {
      return true;
    }

    if (question.type === "checkboxes" || question.type === "radio") {
      return elements.some((element) => element.checked);
    }

    return elements.some((element) => element.value.trim() !== "");
  }

  function getQuestionField(questionId) {
    return Array.from(root.querySelectorAll("[data-question-id]")).find(
      (field) => field.dataset.questionId === questionId
    );
  }

  function clearValidationState() {
    root.querySelectorAll(".field-error").forEach((field) => {
      field.classList.remove("field-error");
    });
    root.querySelectorAll(".field-error-message").forEach((message) => {
      message.remove();
    });
    root.querySelectorAll("[aria-invalid='true']").forEach((control) => {
      control.removeAttribute("aria-invalid");
    });

    if (validationSummary) {
      validationSummary.classList.add("hidden");
      validationSummary.innerHTML = "";
    }
  }

  function markMissingField(question) {
    const field = getQuestionField(question.id);
    const controls = getControlElements(question);

    controls.forEach((control) => {
      control.setAttribute("aria-invalid", "true");
    });

    if (field) {
      field.classList.add("field-error");
      field.insertAdjacentHTML(
        "beforeend",
        `<p class="field-error-message">Required: ${escapeHtml(question.label)}</p>`
      );
    }
  }

  function getMissingRequiredQuestions() {
    const missing = [];

    questionsConfig.sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (question.required && !hasRequiredAnswer(question)) {
          missing.push(question);
        }
      });
    });

    return missing;
  }

  function focusFirstMissingQuestion(question) {
    const field = getQuestionField(question.id);
    const control = getControlElements(question)[0];

    if (field) {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (control && typeof control.focus === "function") {
      control.focus({ preventScroll: true });
    } else if (validationSummary) {
      validationSummary.focus({ preventScroll: true });
    }
  }

  function showValidationSummary(missingQuestions) {
    if (!validationSummary) {
      return;
    }

    const plural = missingQuestions.length === 1 ? "field" : "fields";
    validationSummary.classList.remove("hidden");
    validationSummary.innerHTML = `
      <h2>Complete ${missingQuestions.length} required ${plural}</h2>
      <ul>
        ${missingQuestions
          .map((question) => `<li>${escapeHtml(question.label)}</li>`)
          .join("")}
      </ul>
    `;
  }

  function validateInterview() {
    clearValidationState();

    const missingQuestions = getMissingRequiredQuestions();

    if (!missingQuestions.length) {
      return true;
    }

    missingQuestions.forEach(markMissingField);
    showValidationSummary(missingQuestions);
    focusFirstMissingQuestion(missingQuestions[0]);
    return false;
  }

  async function loadQuestions() {
    try {
      const [questionsResponse, taxonomyResponse] = await Promise.all([
        fetch(QUESTIONS_URL),
        fetch(TAXONOMY_URL)
      ]);

      if (!questionsResponse.ok) {
        throw new Error(`Unable to load questions: ${questionsResponse.status}`);
      }

      if (!taxonomyResponse.ok) {
        throw new Error(`Unable to load taxonomy: ${taxonomyResponse.status}`);
      }

      taxonomyConfig = await taxonomyResponse.json();
      questionsConfig = resolveConfigOptions(await questionsResponse.json());
      seedStarterDefaultProfiles();
      renderSections(questionsConfig);
      renderInitialSaveStatus();
      bindDefaultProfilePanel();
      renderDefaultProfilePanel();
    } catch (error) {
      root.classList.add("status-message", "error");
      root.textContent =
        "The project intake configuration could not be loaded. Serve this folder over HTTP and try again.";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!questionsConfig || !validateInterview()) {
      return;
    }

    flushAutosave();
    window.location.href = "preview.html";
  });

  clearButton.addEventListener("click", () => {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }

    hasUnsavedChanges = false;
    window.RfpWorkspaces.clearAnswers();
    if (questionsConfig) {
      renderSections(questionsConfig);
      setSaveStatus("Answers cleared.", "saved");
      renderDefaultProfilePanel("Project intake answers cleared.", false);
    }
  });

  form.addEventListener("input", () => {
    scheduleAutosave();
  });

  form.addEventListener("change", () => {
    scheduleAutosave();
  });

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedChanges && !autosaveTimer) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  loadQuestions();
})();
