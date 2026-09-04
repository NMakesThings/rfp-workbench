(function () {
  const form = document.getElementById('signin-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('signin-submit');
  const signoutBtn = document.getElementById('signout-button');
  const statusEl = document.getElementById('auth-status');

  function setStatus(message, type) {
    statusEl.textContent = message || '';
    statusEl.className = 'auth-status' + (type ? ' ' + type : '');
  }

  function disableForm(disabled) {
    emailInput.disabled = disabled;
    passwordInput.disabled = disabled;
    submitBtn.disabled = disabled;
    // leave signoutBtn alone here; session logic will control it
  }

  function safeClient() {
    if (!window.RfpSupabase || typeof window.RfpSupabase.getSupabaseClient !== 'function') {
      setStatus('Supabase initializer not available. Ensure config.js and js/supabase-client.js are loaded.', 'error');
      return null;
    }
    const client = window.RfpSupabase.getSupabaseClient();
    if (!client) {
      const st = window.RfpSupabase.getStatus ? window.RfpSupabase.getStatus() : null;
      const msg = st && st.error ? st.error : 'Supabase client is not initialized. Check config.';
      setStatus(msg, 'error');
      return null;
    }
    return client;
  }

  /**
   * Validate a redirect target is a safe, same-origin, relative path.
   * Returns true only for same-origin relative URLs (e.g., /index.html, /foo/bar).
   */
  function isSafeRedirectTarget(target) {
    if (!target || typeof target !== 'string') return false;
    // Disallow protocol-relative and absolute URLs that include an origin.
    // Only allow paths that start with a single slash.
    if (!target.startsWith('/')) return false;
    if (target.startsWith('//')) return false;
    try {
      // Construct a URL relative to current origin and verify origin match.
      const resolved = new URL(target, window.location.origin);
      return resolved.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  async function showSession(session) {
    if (!session) {
      setStatus('Not signed in.');
      signoutBtn.hidden = true;
      signoutBtn.disabled = true;
      submitBtn.hidden = false;
      disableForm(false);
      return;
    }
    const user = session.user || {};
    setStatus('Signed in as ' + (user.email || user.id), 'success');
    signoutBtn.hidden = false;
    signoutBtn.disabled = false;
    submitBtn.hidden = true;
    disableForm(true);
  }

  async function init() {
    const client = safeClient();
    if (!client) return;

    if (window.RfpSupabase && typeof window.RfpSupabase.getCurrentSession === 'function') {
      const existing = await window.RfpSupabase.getCurrentSession();
      await showSession(existing);
    } else {
      try {
        const res = await client.auth.getSession();
        await showSession(res.data ? res.data.session : null);
      } catch (err) {
        // ignore
      }
    }

    try {
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        showSession(session);
      });
      window.addEventListener('unload', () => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setStatus('');
    const client = safeClient();
    if (!client) return;

    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';

    if (!email || !password) {
      setStatus('Please provide both email and password.', 'error');
      return;
    }

    disableForm(true);
    setStatus('Signing in…');

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus(error.message || 'Sign-in failed.', 'error');
        disableForm(false);
        return;
      }
      const session = data ? data.session : null;
      if (session) {
        setStatus('Sign-in successful.', 'success');
        await showSession(session);
        // If a safe relative redirect was provided, return the user there.
        try {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect');
          if (redirect && isSafeRedirectTarget(redirect)) {
            // Clear sensitive values before navigating away.
            passwordInput.value = '';
            // Use replace() to avoid leaving the auth page in history.
            window.location.replace(redirect);
            return;
          }
        } catch (e) {
          // If parsing fails, do nothing and stay on this page.
        }
      } else {
        setStatus('Sign-in complete (no session returned).', 'success');
        await showSession(null);
      }
    } catch (err) {
      setStatus(err.message || 'Sign-in error', 'error');
      disableForm(false);
    } finally {
      passwordInput.value = '';
    }
  });

  signoutBtn.addEventListener('click', async () => {
    setStatus('Signing out…');
    const client = safeClient();
    if (!client) return;

    try {
      const { error } = await client.auth.signOut();
      if (error) {
        setStatus(error.message || 'Sign-out failed.', 'error');
        return;
      }
      setStatus('Signed out.');
      await showSession(null);
      disableForm(false);
      submitBtn.hidden = false;
    } catch (err) {
      setStatus(err.message || 'Sign-out error', 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
