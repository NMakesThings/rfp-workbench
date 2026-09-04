// js/auth-guard.js
// Minimal auth guard: if Supabase client is initialized and user is not authenticated,
// redirect to auth.html with a relative redirect back to the current path.
// Fail-open: if Supabase is not configured or the client isn't initialized, do not redirect.
// Localhost-only testing bypass: allow ?no-auth=1 only when hostname is localhost or 127.0.0.1
(function () {
  function isLocalhost() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function getCurrentRelativePath() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function runGuard() {
    try {
      // Avoid running on the auth page itself (prevent redirect loop).
      if (window.location.pathname.endsWith('/auth.html') || window.location.pathname === '/auth.html') {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (isLocalhost() && params.get('no-auth') === '1') {
        // Local testing bypass (explicitly allowed only on localhost).
        return;
      }

      // Wait briefly for the repo's RfpSupabase initializer to become available.
      // If it's not available quickly, do not block the page — fail-open.
      let attempts = 0;
      const maxAttempts = 5;
      while (attempts < maxAttempts && !(window.RfpSupabase && typeof window.RfpSupabase.getStatus === 'function')) {
        // If the Supabase UMD and config are clearly missing, give up early.
        if (!window.supabase && !window.SUPABASE_CONFIG && attempts > 0) break;
        await sleep(150);
        attempts++;
      }

      if (!window.RfpSupabase || typeof window.RfpSupabase.getStatus !== 'function') {
        // Fail-open: preserve existing prototype behavior when Supabase not configured or initializer not present.
        console.warn('Auth guard: Supabase initializer not available — allowing access (fail-open).');
        return;
      }

      const status = window.RfpSupabase.getStatus();
      if (!status.isInitialized) {
        // Initialization failed (likely missing config) — fail-open.
        console.warn('Auth guard: Supabase client not initialized (' + (status.error || 'unknown') + ') — allowing access.');
        return;
      }

      // Client initialized — check session.
      let session = null;
      if (typeof window.RfpSupabase.getCurrentSession === 'function') {
        session = await window.RfpSupabase.getCurrentSession();
      } else {
        const client = window.RfpSupabase.getSupabaseClient();
        try {
          const res = await client.auth.getSession();
          session = res && res.data ? res.data.session : null;
        } catch (e) {
          // If checking session fails, fail-open to avoid breaking dev flow.
          console.warn('Auth guard: session check error — allowing access.', e && e.message);
          return;
        }
      }

      if (!session) {
        // Redirect to auth.html with a safe relative redirect back to this path.
        const redirectTo = 'auth.html?redirect=' + encodeURIComponent(getCurrentRelativePath());
        window.location.replace(redirectTo);
      }
    } catch (e) {
      // On any unexpected error, fail-open.
      console.warn('Auth guard: unexpected error — allowing access.', e && e.message);
      return;
    }
  }

  // Run guard immediately.
  runGuard();
})();
