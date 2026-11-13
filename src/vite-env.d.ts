/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Jobyn API. Defaults to the deployed backend. */
  readonly VITE_API_BASE_URL?: string;
  /** Supabase project URL and public anon/publishable key. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
