/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the .NET API (e.g., http://localhost:5000). Empty = same origin. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
