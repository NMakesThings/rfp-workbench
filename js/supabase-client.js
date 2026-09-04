/**
 * Supabase Client Initialization (CDN-based)
 * 
 * This module initializes a Supabase client from the CDN-loaded @supabase/supabase-js library.
 * It reads configuration from config.js (window.SUPABASE_CONFIG).
 * 
 * No build system or import/export is required.
 */

(function () {
  let supabaseClient = null;
  let initializationError = null;

  /**
   * Get the Supabase client instance
   * @returns {Object|null} The Supabase client, or null if initialization failed
   */
  function getSupabaseClient() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (initializationError) {
      console.error('Supabase client initialization failed:', initializationError);
      return null;
    }

    // Check if Supabase library is loaded from CDN
    if (typeof window === 'undefined' || !window.supabase) {
      initializationError = 'Supabase library not loaded. Ensure supabase-js CDN script is included.';
      console.error(initializationError);
      return null;
    }

    // Check if configuration is available
    if (!window.SUPABASE_CONFIG) {
      initializationError = 'Supabase configuration not found. Ensure config.js is loaded before this module.';
      console.error(initializationError);
      return null;
    }

    try {
      const { createClient } = window.supabase;
      const config = window.SUPABASE_CONFIG;

      if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
        initializationError = 'Supabase URL and Publishable Key are required. Update config.js with your project values.';
        console.error(initializationError);
        return null;
      }

      // Initialize the Supabase client
      supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
      return supabaseClient;
    } catch (error) {
      initializationError = `Failed to initialize Supabase client: ${error.message}`;
      console.error(initializationError);
      return null;
    }
  }

  /**
   * Check if Supabase client is initialized and available
   * @returns {boolean}
   */
  function isClientInitialized() {
    return getSupabaseClient() !== null;
  }

  /**
   * Get the current user session (if authenticated)
   * @returns {Promise<Object|null>} User session object, or null if not authenticated
   */
  async function getCurrentSession() {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn('Failed to get session:', error.message);
        return null;
      }
      return data.session || null;
    } catch (error) {
      console.warn('Error checking session:', error.message);
      return null;
    }
  }

  /**
   * Get initialization status and error details
   * @returns {Object} Status object with isInitialized, error, and config info
   */
  function getStatus() {
    const client = getSupabaseClient();
    const isInitialized = client !== null;
    const config = window.SUPABASE_CONFIG || {};

    return {
      isInitialized,
      error: initializationError,
      config: {
        hasUrl: Boolean(config.SUPABASE_URL),
        hasKey: Boolean(config.SUPABASE_PUBLISHABLE_KEY),
        urlPreview: config.SUPABASE_URL ? config.SUPABASE_URL.substring(0, 30) + '...' : 'Not set',
        keyPreview: config.SUPABASE_PUBLISHABLE_KEY ? config.SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...' : 'Not set'
      }
    };
  }

  // Expose API
  window.RfpSupabase = {
    getSupabaseClient,
    isClientInitialized,
    getCurrentSession,
    getStatus
  };

  // Log initialization status on module load
  if (typeof window !== 'undefined' && window.document) {
    const status = getStatus();
    if (status.isInitialized) {
      console.log('✓ Supabase client initialized successfully');
    } else if (status.error) {
      console.warn('⚠ Supabase client initialization failed:', status.error);
    }
  }
})();
