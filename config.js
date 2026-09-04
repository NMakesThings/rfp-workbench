/**
 * Supabase Configuration (Version 2)
 * 
 * This file stores configuration for the Supabase client initialization.
 * 
 * IMPORTANT:
 * - Do NOT commit real credentials to this file or the repository.
 * - Copy these values from your Supabase project settings:
 *   https://app.supabase.com/project/_/settings/api
 * - For local development, update the values below.
 * - For production deployment, set these via environment variables at deployment time.
 * 
 * Never add:
 * - Service Role Key (secret)
 * - Database password
 * - Any other private credentials
 */

window.SUPABASE_CONFIG = {
  // Your Supabase project URL
  // Format: https://your-project-id.supabase.co
  SUPABASE_URL: 'https://your-project-id.supabase.co',

  // Your Supabase publishable (anon) key
  // This is safe to expose publicly in client-side code.
  // Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  SUPABASE_PUBLISHABLE_KEY: 'your-publishable-key-here'
};
