// js/workspace-supabase.js
// Standalone client-side logic for the Workspace Landing page.
// Uses the existing repo's window.RfpSupabase (js/supabase-client.js).
// Query order (separate queries):
// 1) load session
// 2) load profiles by id (profiles.id matches session.user.id)
// 3) load organization_members by user_id
// 4) load organizations by returned organization IDs
// 5) load clients by those organization IDs
// 6) load workspace_members by user_id
// 7) load workspaces by returned workspace IDs
//
// Safeguards:
// - If RfpSupabase is not present or not initialized => fail-open: show banner and do not block local prototype.
// - If client initialized but no session => redirect to auth.html?redirect=<relative-path>
// - All selects select minimal columns; no changes to localStorage.

(function () {
  const statusEl = document.getElementById('wl-status');
  const profileSection = document.getElementById('wl-profile');
  const profileInfo = document.getElementById('wl-profile-info');
  const orgsSection = document.getElementById('wl-orgs');
  const orgList = document.getElementById('wl-org-list');
  const clientsSection = document.getElementById('wl-clients');
  const clientList = document.getElementById('wl-client-list');
  const workspacesSection = document.getElementById('wl-workspaces');
  const workspaceList = document.getElementById('wl-workspace-list');

  function setStatus(msg, tone) {
    statusEl.textContent = msg || '';
    statusEl.className = tone ? 'wl-status ' + tone : 'wl-status';
  }

  function showError(msg) {
    statusEl.innerHTML = '<div class="wl-error">' + (msg || 'An error occurred') + '</div>';
  }

  function safeRedirectToAuth() {
    const current = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace('auth.html?redirect=' + encodeURIComponent(current));
  }

  async function getClientAndSession() {
    if (!window.RfpSupabase || typeof window.RfpSupabase.getStatus !== 'function') {
      // Fail-open: Supabase initializer not present. Let the page show local-only message.
      setStatus('Supabase client not available (prototype local-only). Showing local data.', 'muted');
      return { client: null, session: null, initialized: false };
    }

    const status = window.RfpSupabase.getStatus();
    const initialized = Boolean(status && status.isInitialized);

    if (!initialized) {
      // Fail-open: Supabase configured incorrectly or not set; do not block.
      setStatus('Supabase not initialized (' + (status.error || 'no config') + '). Showing local prototype data.', 'muted');
      return { client: null, session: null, initialized: false };
    }

    const client = window.RfpSupabase.getSupabaseClient();
    if (!client) {
      setStatus('Supabase client initialization failed. Showing local prototype data.', 'muted');
      return { client: null, session: null, initialized: false };
    }

    // Get session
    let session = null;
    try {
      if (typeof window.RfpSupabase.getCurrentSession === 'function') {
        session = await window.RfpSupabase.getCurrentSession();
      } else {
        const res = await client.auth.getSession();
        session = res && res.data ? res.data.session : null;
      }
    } catch (e) {
      // treat as no session; will redirect below if necessary
      console.warn('workspace-supabase: error checking session', e && e.message);
      session = null;
    }

    return { client, session, initialized: true };
  }

  // utility: map array of rows by id
  function toIdMap(rows, idKey = 'id') {
    const m = {};
    (rows || []).forEach((r) => {
      if (r && r[idKey] != null) m[r[idKey]] = r;
    });
    return m;
  }

  function renderProfile(profileRow, session) {
    profileSection.hidden = false;
    const name = (profileRow && profileRow.full_name) || '—';
    const userId = (profileRow && profileRow.id) || (session && session.user && session.user.id) || '—';
    const email = (session && session.user && session.user.email) || '—';
    profileInfo.innerHTML = `
      <div><strong>${escapeHtml(name)}</strong> <span class="meta">(${escapeHtml(email)})</span></div>
      <div class="meta">User ID: ${escapeHtml(String(userId))}</div>
    `;
  }

  function renderOrgs(orgRows, orgMembersRows) {
    orgsSection.hidden = false;
    orgList.innerHTML = '';
    if (!orgRows || orgRows.length === 0) {
      orgList.innerHTML = '<div class="wl-item">No organizations found</div>';
      return;
    }
    const memberByOrg = {};
    (orgMembersRows || []).forEach((m) => {
      if (!m) return;
      memberByOrg[String(m.organization_id)] = m.role || null;
    });
    orgRows.forEach((org) => {
      const role = memberByOrg[String(org.id)] || '';
      const el = document.createElement('div');
      el.className = 'wl-item';
      el.innerHTML = `<div><strong>${escapeHtml(org.name)}</strong></div><div class="meta">${escapeHtml(role)}</div>`;
      orgList.appendChild(el);
    });
  }

  function renderClients(clientRows) {
    clientsSection.hidden = false;
    clientList.innerHTML = '';
    if (!clientRows || clientRows.length === 0) {
      clientList.innerHTML = '<div class="wl-item">No clients found</div>';
      return;
    }
    clientRows.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'wl-item';
      el.innerHTML = `<div>${escapeHtml(c.name)}</div><div class="meta">Org: ${escapeHtml(String(c.organization_id))}</div>`;
      clientList.appendChild(el);
    });
  }

  function renderWorkspaces(workspaceRows, workspaceMembersRows) {
    workspacesSection.hidden = false;
    workspaceList.innerHTML = '';
    if (!workspaceRows || workspaceRows.length === 0) {
      workspaceList.innerHTML = '<div class="wl-item">No workspaces found</div>';
      return;
    }
    const roleByWorkspace = {};
    (workspaceMembersRows || []).forEach((m) => {
      if (!m) return;
      roleByWorkspace[String(m.workspace_id)] = m.role || '';
    });
    workspaceRows.forEach((w) => {
      const role = roleByWorkspace[String(w.id)] || '';
      const el = document.createElement('div');
      el.className = 'wl-item';
      el.innerHTML = `<div>
          <div><strong>${escapeHtml(w.name)}</strong></div>
          <div class="meta">${escapeHtml(w.description || '')}</div>
        </div>
        <div class="meta">${escapeHtml(role)}${w.client_id ? ' • client ' + escapeHtml(String(w.client_id)) : ''}</div>
        <div class="wl-actions">
          <a class="button primary wl-open" href="index.html?workspace_id=${encodeURIComponent(w.id)}">Open workspace</a>
        </div>`;
      workspaceList.appendChild(el);
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  async function loadAndRender() {
    setStatus('Checking authentication...');
    const { client, session, initialized } = await getClientAndSession();

    if (!initialized) {
      // Fail-open: show local-only banner; do not attempt server queries
      setStatus('Supabase not initialized — showing local-only view. No server data was requested.', null);
      return;
    }

    if (!session) {
      // client initialized but no session -> redirect to auth
      safeRedirectToAuth();
      return;
    }

    setStatus('Loading server workspace data...');

    const userId = session.user && session.user.id;
    try {
      // 1) profiles: select id, full_name by id matching session user id
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id,full_name')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) {
        showError('Failed to load profile.');
        console.warn('workspace-supabase profileError', profileError.message);
        return;
      }
      renderProfile(profile, session);

      // 2) organization_members by user_id
      const { data: orgMembers, error: orgMembersError } = await client
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId);
      if (orgMembersError) {
        showError('Failed to load organization memberships.');
        console.warn('workspace-supabase orgMembersError', orgMembersError.message);
        return;
      }
      const orgIds = Array.from(new Set((orgMembers || []).map((r) => r.organization_id).filter(Boolean)));

      // 3) organizations by those org ids
      let orgRows = [];
      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await client
          .from('organizations')
          .select('id,name')
          .in('id', orgIds);
        if (orgsError) {
          showError('Failed to load organizations.');
          console.warn('workspace-supabase orgsError', orgsError.message);
          return;
        }
        orgRows = orgsData || [];
      }
      renderOrgs(orgRows, orgMembers);

      // 4) clients by organization_ids
      let clientRows = [];
      if (orgIds.length > 0) {
        const { data: clientsData, error: clientsError } = await client
          .from('clients')
          .select('id,organization_id,name')
          .in('organization_id', orgIds);
        if (clientsError) {
          showError('Failed to load clients.');
          console.warn('workspace-supabase clientsError', clientsError.message);
          return;
        }
        clientRows = clientsData || [];
      }
      renderClients(clientRows);

      // 5) workspace_members by user_id
      const { data: wMembers, error: wMembersError } = await client
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId);
      if (wMembersError) {
        showError('Failed to load workspace memberships.');
        console.warn('workspace-supabase wMembersError', wMembersError.message);
        return;
      }
      const workspaceIds = Array.from(new Set((wMembers || []).map((r) => r.workspace_id).filter(Boolean)));

      // 6) workspaces by returned workspace IDs
      let workspaceRows = [];
      if (workspaceIds.length > 0) {
        const { data: workspacesData, error: workspacesError } = await client
          .from('workspaces')
          .select('id,organization_id,client_id,name,description,status')
          .in('id', workspaceIds);
        if (workspacesError) {
          showError('Failed to load workspaces.');
          console.warn('workspace-supabase workspacesError', workspacesError.message);
          return;
        }
        workspaceRows = workspacesData || [];
      }
      renderWorkspaces(workspaceRows, wMembers);

      setStatus('Loaded server workspace data.');
    } catch (e) {
      showError('Unexpected error loading workspace data.');
      console.warn('workspace-supabase unexpected', e && e.message);
    }
  }

  // initialize on load
  document.addEventListener('DOMContentLoaded', function () {
    loadAndRender();
  });
})();
