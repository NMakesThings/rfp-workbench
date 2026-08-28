/**
 * Supabase Client Initialization
 * 
 * This module provides a singleton Supabase client instance for the RFP Workbench.
 * It reads configuration from environment variables (.env file or runtime config).
 * 
 * For development:
 * 1. Copy .env.example to .env
 * 2. Add your Supabase project URL and anon key
 * 3. The client will initialize automatically on first use
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

    // Check if we have the required imports available
    if (typeof window === 'undefined' || !window.supabase) {
      initializationError = 'Supabase library not loaded. Include @supabase/supabase-js in your HTML.';
      console.error(initializationError);
      return null;
    }

    const { createClient } = window.supabase;

    try {
      const supabaseUrl = getConfigValue('SUPABASE_URL');
      const supabaseAnonKey = getConfigValue('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseAnonKey) {
        initializationError = 'Supabase URL and Anon Key are required. Check your .env file or environment configuration.';
        console.error(initializationError);
        return null;
      }

      // Initialize the Supabase client
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      return supabaseClient;
    } catch (error) {
      initializationError = `Failed to initialize Supabase client: ${error.message}`;
      console.error(initializationError);
      return null;
    }
  }

  /**
   * Get configuration values from various sources
   * Priority: environment variables > window globals > null
   * @param {string} key - Configuration key (without VITE_ prefix)
   * @returns {string|null}
   */
  function getConfigValue(key) {
    // Try environment variable format (VITE_ prefix for Vite, or direct for Node.js)
    const viteKey = `VITE_${key}`;
    if (typeof window !== 'undefined' && window.__ENV__) {
      return window.__ENV__[viteKey] || window.__ENV__[key] || null;
    }

    // Try window.location-based detection if running through Vite dev server
    if (typeof import?.meta?.env !== 'undefined') {
      const envValue = import.meta.env?.[viteKey];
      if (envValue) return envValue;
    }

    return null;
  }

  /**
   * Check Supabase connection and authentication status
   * Attempts to query the public.profiles table as a health check
   * @returns {Promise<Object>} Status object with isConnected and message properties
   */
  async function checkSupabaseConnection() {
    const client = getSupabaseClient();

    if (!client) {
      return {
        isConnected: false,
        message: 'Supabase client not initialized',
        error: initializationError
      };
    }

    try {
      // Attempt a simple query to public.profiles table
      // This assumes the table exists and is accessible to anonymous users
      const { data, error, status } = await client
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1);

      if (error) {
        return {
          isConnected: false,
          message: `Connection check failed: ${error.message}`,
          error: error
        };
      }

      return {
        isConnected: true,
        message: 'Successfully connected to Supabase',
        status: status
      };
    } catch (error) {
      return {
        isConnected: false,
        message: `Connection check error: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Fetch profiles from the public.profiles table
   * Useful for testing authenticated and unauthenticated access
   * @returns {Promise<Array>} Array of profile objects
   */
  async function fetchProfiles() {
    const client = getSupabaseClient();

    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    return data || [];
  }

  // Expose API
  window.RfpSupabase = {
    getSupabaseClient,
    checkSupabaseConnection,
    fetchProfiles,
    getConfigValue
  };

  // Auto-initialize and log status on module load
  if (typeof window !== 'undefined' && window.document) {
    document.addEventListener('DOMContentLoaded', () => {
      const client = getSupabaseClient();
      if (!client) {
        console.warn('Supabase client not available. Features requiring Supabase will be disabled.');
      } else {
        console.log('Supabase client initialized successfully');
      }
    });
  }
})();
