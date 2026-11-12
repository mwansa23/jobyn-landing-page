/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Jobyn FastAPI backend. Defaults to http://127.0.0.1:8000. */
  readonly VITE_API_BASE_URL?: string;
  /** Firebase Web SDK configuration. All six are required for Firebase Auth. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Auth emulator is only connected in test mode with a demo Firebase project. */
  readonly VITE_FIREBASE_AUTH_EMULATOR_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
