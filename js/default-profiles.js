(function () {
  const QUESTIONS_URL = "data/interview-questions.json";
  const TAXONOMY_URL = "data/justice-taxonomy.json";
  const STORAGE_KEY = "rfpDefaultProfiles";
  const STARTER_SEED_KEY = "rfpDefaultProfilesStarterSeed:v1";
  const MATCH_KEYS = ["justice_domain", "system_type", "client_type", "procurement_type"];
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
  const STARTER_PROFILE_IDS = new Set(STARTER_DEFAULT_PROFILES.map((profile) => profile.id));

  const elements = {
    summary: document.getElementById("default-profiles-summary"),
    list: document.getElementById("default-profile-list"),
    form: document.getElementById("default-profile-form"),
    editorTitle: document.getElementById("default-profile-editor-title"),
    profileId: document.getElementById("default-profile-id"),
    profileName: document.getElementById("default-profile-name"),
    profileDescription: document.getElementById("default-profile-description"),
    matchFields: document.getElementById("default-profile-match-fields"),
    answerFields: document.getElementById("default-profile-answer-fields"),
    formStatus: document.getElementById("default-profile-form-status"),
    newProfile: document.getElementById("new-default-profile"),
    fromAnswers: document.getElementById("create-profile-from-answers"),
    resetForm: document.getElementById("reset-default-profile-form")
  };

  let questionsConfig = null;
  let taxonomyConfig = null;
  let questions = [];
  let questionById = new Map();
  let profiles = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      await loadConfig();
      profiles = seedStarterProfiles(readProfiles());
      renderEditor();
      renderProfileList();
      bindActions();
    } catch (error) {
      setStatus("Default profile configuration could not be loaded. Serve this folder over HTTP and try again.", true);
    }
  }

  async function loadConfig() {
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
    questions = questionsConfig.sections.flatMap((section) => section.questions);
    questionById = new Map(questions.map((question) => [question.id, question]));
  }

  function bindActions() {
    elements.form.addEventListener("submit", handleFormSubmit);
    elements.list.addEventListener("click", handleListAction);
    elements.newProfile.addEventListener("click", () => {
      renderEditor();
      setStatus("Started a blank default profile.", false);
    });
    elements.resetForm.addEventListener("click", () => {
      renderEditor();
      setStatus("Profile form reset.", false);
    });
    elements.fromAnswers.addEventListener("click", createProfileFromCurrentAnswers);
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

  function resolveQuestionOptions(question) {
    if (!question.optionSource) {
      return question;
    }

    return {
      ...question,
      options: sourceOptions(taxonomyConfig[question.optionSource])
    };
  }

  function sourceOptions(options) {
    return (options || []).map((option) => ({
      value: option.id || option.value,
      label: option.label || option.id || option.value
    }));
  }

  function readProfiles() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveProfiles(nextProfiles) {
    profiles = nextProfiles;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    renderProfileList();
  }

  function seedStarterProfiles(existingProfiles) {
    if (localStorage.getItem(STARTER_SEED_KEY)) {
      return existingProfiles;
    }

    const now = new Date().toISOString();
    const existingIds = new Set(existingProfiles.map((profile) => profile.id));
    const profilesToAdd = STARTER_DEFAULT_PROFILES
      .filter((profile) => !existingIds.has(profile.id))
      .map((profile) => {
        const result = sanitizeProfile(profile);
        return {
          ...result.profile,
          id: profile.id,
          createdAt: now,
          updatedAt: now
        };
      });
    const nextProfiles = profilesToAdd.length ? [...existingProfiles, ...profilesToAdd] : existingProfiles;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfiles));
    localStorage.setItem(
      STARTER_SEED_KEY,
      JSON.stringify({
        version: 1,
        seededAt: now,
        profileIds: STARTER_DEFAULT_PROFILES.map((profile) => profile.id)
      })
    );

    return nextProfiles;
  }

  function renderEditor(profile) {
    const currentProfile = normalizeProfileForForm(profile);

    elements.profileId.value = currentProfile.id || "";
    elements.profileName.value = currentProfile.name || "";
    elements.profileDescription.value = currentProfile.description || "";
    elements.editorTitle.textContent = currentProfile.id ? "Edit Default Profile" : "New Default Profile";
    elements.matchFields.innerHTML = renderMatchFields(currentProfile.matchCriteria);
    elements.answerFields.innerHTML = renderAnswerFields(currentProfile.defaultAnswers);
    setFormStatus("", false);
  }

  function normalizeProfileForForm(profile) {
    return {
      id: profile && profile.id ? profile.id : "",
      name: profile && profile.name ? profile.name : "",
      description: profile && profile.description ? profile.description : "",
      matchCriteria: profile && profile.matchCriteria ? profile.matchCriteria : {},
      defaultAnswers: profile && profile.defaultAnswers ? profile.defaultAnswers : {}
    };
  }

  function renderMatchFields(matchCriteria) {
    return MATCH_KEYS.map((key) => {
      const question = questionById.get(key);

      if (!question) {
        return "";
      }

      return `
        <label>
          <span>${escapeHtml(getQuestionDisplayLabel(question))}</span>
          <select data-match-key="${escapeHtml(key)}">
            <option value="">Any / not used for matching</option>
            ${renderOptions(question.options || [], matchCriteria[key])}
          </select>
        </label>
      `;
    }).join("");
  }

  function renderAnswerFields(defaultAnswers) {
    return questionsConfig.sections.map((section) => {
      const fields = section.questions.map((question) => renderDefaultAnswerField(question, defaultAnswers)).join("");

      return `
        <section class="default-profile-answer-section">
          <h4>${escapeHtml(section.title)}</h4>
          <div class="default-profile-form-grid">${fields}</div>
        </section>
      `;
    }).join("");
  }

  function renderDefaultAnswerField(question, defaultAnswers) {
    const value = defaultAnswers[question.id];

    if (question.type === "checkboxes") {
      const selected = Array.isArray(value) ? value : [];
      return `
        <fieldset class="default-profile-field default-profile-field-wide">
          <legend>${escapeHtml(getQuestionDisplayLabel(question))}</legend>
          <div class="choice-list default-profile-choice-list">
            ${(question.options || [])
              .map((option) => `
                <label class="choice-item">
                  <input
                    type="checkbox"
                    data-default-key="${escapeHtml(question.id)}"
                    value="${escapeHtml(option.value)}"
                    ${selected.includes(option.value) ? "checked" : ""}
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `)
              .join("")}
          </div>
        </fieldset>
      `;
    }

    if (question.type === "select" || question.type === "radio") {
      return `
        <label class="default-profile-field">
          <span>${escapeHtml(getQuestionDisplayLabel(question))}</span>
          <select data-default-key="${escapeHtml(question.id)}">
            <option value="">No default</option>
            ${renderOptions(question.options || [], value)}
          </select>
        </label>
      `;
    }

    if (question.type === "textarea") {
      return `
        <label class="default-profile-field default-profile-field-wide">
          <span>${escapeHtml(getQuestionDisplayLabel(question))}</span>
          <textarea data-default-key="${escapeHtml(question.id)}" rows="3">${escapeHtml(value || "")}</textarea>
        </label>
      `;
    }

    return `
      <label class="default-profile-field">
        <span>${escapeHtml(getQuestionDisplayLabel(question))}</span>
        <input data-default-key="${escapeHtml(question.id)}" type="text" value="${escapeHtml(value || "")}" />
      </label>
    `;
  }

  function renderOptions(options, selectedValue) {
    return options.map((option) => {
      const selected = option.value === selectedValue ? "selected" : "";
      return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
    }).join("");
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const rawProfile = collectProfileFromForm();

    if (!rawProfile.name) {
      setFormStatus("Enter a profile name before saving.", true);
      elements.profileName.focus();
      return;
    }

    const result = sanitizeProfile(rawProfile);
    const now = new Date().toISOString();
    const existingProfile = profiles.find((profile) => profile.id === rawProfile.id);
    const nextProfile = {
      ...result.profile,
      id: rawProfile.id || createId(),
      createdAt: existingProfile ? existingProfile.createdAt : now,
      updatedAt: now
    };
    const nextProfiles = existingProfile
      ? profiles.map((profile) => (profile.id === existingProfile.id ? nextProfile : profile))
      : [nextProfile, ...profiles];

    saveProfiles(nextProfiles);
    renderEditor(nextProfile);

    const warningText = result.warnings.length
      ? ` Saved with ${result.warnings.length} invalid or stale value${result.warnings.length === 1 ? "" : "s"} skipped.`
      : "";
    setFormStatus(`Saved ${nextProfile.name}.${warningText}`, Boolean(result.warnings.length));
  }

  function collectProfileFromForm() {
    const matchCriteria = {};
    const defaultAnswers = {};

    elements.matchFields.querySelectorAll("[data-match-key]").forEach((control) => {
      if (control.value) {
        matchCriteria[control.dataset.matchKey] = control.value;
      }
    });

    questions.forEach((question) => {
      if (question.type === "checkboxes") {
        const values = Array.from(
          elements.answerFields.querySelectorAll(`[data-default-key="${cssEscape(question.id)}"]:checked`)
        ).map((control) => control.value);

        if (values.length) {
          defaultAnswers[question.id] = values;
        }
        return;
      }

      const control = elements.answerFields.querySelector(`[data-default-key="${cssEscape(question.id)}"]`);
      const value = control ? control.value.trim() : "";

      if (value) {
        defaultAnswers[question.id] = value;
      }
    });

    return {
      id: elements.profileId.value,
      name: elements.profileName.value.trim(),
      description: elements.profileDescription.value.trim(),
      matchCriteria,
      defaultAnswers
    };
  }

  function createProfileFromCurrentAnswers() {
    const answers = window.RfpWorkspaces ? window.RfpWorkspaces.getAnswers() || {} : {};
    const defaultAnswers = {};

    questions.forEach((question) => {
      const value = answers[question.id];

      if (isEmptyValue(value)) {
        return;
      }

      defaultAnswers[question.id] = value;
    });

    const result = sanitizeProfile({
      name: "",
      description: "",
      matchCriteria: MATCH_KEYS.reduce((criteria, key) => {
        if (!isEmptyValue(defaultAnswers[key])) {
          criteria[key] = defaultAnswers[key];
        }
        return criteria;
      }, {}),
      defaultAnswers
    });

    if (!Object.keys(result.profile.defaultAnswers).length) {
      setStatus("No valid current interview answers are available to turn into a profile.", true);
      return;
    }

    const workspace = window.RfpWorkspaces ? window.RfpWorkspaces.getActiveWorkspace() : null;
    const now = new Date().toISOString();
    const profile = {
      ...result.profile,
      id: createId(),
      name: workspace ? `Defaults from ${workspace.name}` : "Defaults from current answers",
      description: "Created from the active workspace's current saved interview answers.",
      createdAt: now,
      updatedAt: now
    };

    saveProfiles([profile, ...profiles]);
    renderEditor(profile);
    setStatus(`Created ${profile.name}.`, false);
  }

  function handleListAction(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const profileId = button.getAttribute("data-profile-id");
    const profile = profiles.find((item) => item.id === profileId);
    const action = button.getAttribute("data-action");

    if (!profile) {
      return;
    }

    if (action === "edit") {
      renderEditor(profile);
      elements.profileName.focus();
    } else if (action === "duplicate") {
      duplicateProfile(profile);
    } else if (action === "delete") {
      deleteProfile(profile);
    }
  }

  function duplicateProfile(profile) {
    const now = new Date().toISOString();
    const duplicated = {
      ...profile,
      id: createId(),
      name: `${profile.name} Copy`,
      createdAt: now,
      updatedAt: now
    };

    saveProfiles([duplicated, ...profiles]);
    renderEditor(duplicated);
    setStatus(`Duplicated ${profile.name}.`, false);
  }

  function deleteProfile(profile) {
    const confirmed = window.confirm(`Delete default profile "${profile.name}"?`);

    if (!confirmed) {
      return;
    }

    saveProfiles(profiles.filter((item) => item.id !== profile.id));
    renderEditor();
    setStatus(`Deleted ${profile.name}.`, false);
  }

  function renderProfileList() {
    elements.summary.textContent = `${profiles.length} default profile${profiles.length === 1 ? "" : "s"} saved in this browser.`;

    if (!profiles.length) {
      elements.list.innerHTML = `
        <section class="empty-state default-profile-empty">
          <h2>No default profiles yet</h2>
          <p>Create a blank profile or create one from current interview answers.</p>
        </section>
      `;
      return;
    }

    elements.list.innerHTML = profiles
      .map((profile) => renderProfileCard(profile))
      .join("");
  }

  function renderProfileCard(profile) {
    const result = sanitizeProfile(profile);
    const matchItems = MATCH_KEYS
      .filter((key) => result.profile.matchCriteria[key])
      .map((key) => `${getQuestionLabel(key)}: ${labelFor(key, result.profile.matchCriteria[key])}`);
    const defaultCount = Object.keys(result.profile.defaultAnswers).length;

    return `
      <article class="default-profile-card">
        <div class="workspace-card-header">
          <div>
            <h3>${escapeHtml(profile.name || "Untitled profile")}</h3>
            <p>${escapeHtml(profile.description || "No description provided.")}</p>
          </div>
          <span class="workspace-active-badge">${escapeHtml(defaultCount)} default${defaultCount === 1 ? "" : "s"}</span>
        </div>
        <div class="default-profile-card-body">
          ${isStarterProfileId(profile.id) ? `
            <div>
              <strong>Profile type</strong>
              <p>Starter profile</p>
            </div>
          ` : ""}
          <div>
            <strong>Matching</strong>
            <p>${escapeHtml(matchItems.length ? matchItems.join("; ") : "General profile")}</p>
          </div>
          <div>
            <strong>Updated</strong>
            <p>${escapeHtml(formatDate(profile.updatedAt || profile.createdAt))}</p>
          </div>
        </div>
        ${renderProfileWarnings(result.warnings)}
        <div class="workspace-card-actions">
          <button type="button" class="button secondary" data-action="edit" data-profile-id="${escapeHtml(profile.id)}">Edit</button>
          <button type="button" class="button secondary" data-action="duplicate" data-profile-id="${escapeHtml(profile.id)}">Duplicate</button>
          <button type="button" class="button secondary button-danger" data-action="delete" data-profile-id="${escapeHtml(profile.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  function renderProfileWarnings(warnings) {
    if (!warnings.length) {
      return "";
    }

    return `
      <div class="default-profile-warning">
        <strong>Invalid or stale values</strong>
        <ul>
          ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function sanitizeProfile(profile) {
    const warnings = [];
    const matchCriteria = {};
    const defaultAnswers = {};

    MATCH_KEYS.forEach((key) => {
      const value = profile.matchCriteria && profile.matchCriteria[key];

      if (!value) {
        return;
      }

      if (isValidQuestionValue(key, value)) {
        matchCriteria[key] = value;
      } else {
        warnings.push(`${getQuestionLabel(key)} has an invalid matching value: ${value}`);
      }
    });

    Object.entries(profile.defaultAnswers || {}).forEach(([key, value]) => {
      const question = questionById.get(key);

      if (!question) {
        warnings.push(`Unknown interview answer key skipped: ${key}`);
        return;
      }

      if (question.type === "checkboxes") {
        const values = Array.isArray(value) ? value : [value];
        const validValues = values.filter((item) => isValidQuestionValue(key, item));
        const invalidValues = values.filter((item) => !isValidQuestionValue(key, item));

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

      if (hasOptions(question) && !isValidQuestionValue(key, normalizedValue)) {
        warnings.push(`${getQuestionDisplayLabel(question)} has an invalid value: ${normalizedValue}`);
        return;
      }

      defaultAnswers[key] = normalizedValue;
    });

    return {
      profile: {
        name: String(profile.name || "").trim(),
        description: String(profile.description || "").trim(),
        matchCriteria,
        defaultAnswers
      },
      warnings
    };
  }

  function isValidQuestionValue(key, value) {
    const question = questionById.get(key);

    if (!question || isEmptyValue(value)) {
      return false;
    }

    if (!hasOptions(question)) {
      return typeof value === "string" || typeof value === "number";
    }

    return (question.options || []).some((option) => option.value === value);
  }

  function hasOptions(question) {
    return Array.isArray(question.options) && question.options.length > 0;
  }

  function isEmptyValue(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || String(value).trim() === "";
  }

  function getQuestionLabel(key) {
    const question = questionById.get(key);
    return question ? getQuestionDisplayLabel(question) : key;
  }

  function getQuestionDisplayLabel(question) {
    if (question && question.id === "integration_partners") {
      return "Integration Partners";
    }

    return question ? question.label : "";
  }

  function labelFor(key, value) {
    const question = questionById.get(key);
    const option = question && question.options
      ? question.options.find((item) => item.value === value)
      : null;

    return option ? option.label : value;
  }

  function createId() {
    if (window.crypto && crypto.randomUUID) {
      return `profile_${crypto.randomUUID()}`;
    }

    return `profile_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function isStarterProfileId(profileId) {
    return STARTER_PROFILE_IDS.has(profileId);
  }

  function cssEscape(value) {
    if (window.CSS && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }

    return String(value).replace(/"/g, "\\\"");
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

  function setStatus(message, isError) {
    elements.summary.textContent = message || `${profiles.length} default profile${profiles.length === 1 ? "" : "s"} saved in this browser.`;
    elements.summary.classList.toggle("error", Boolean(isError));
    elements.summary.classList.toggle("status-message", Boolean(message));
  }

  function setFormStatus(message, isError) {
    elements.formStatus.textContent = message;
    elements.formStatus.classList.toggle("error", Boolean(isError));
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
