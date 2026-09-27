/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STORE_SLUG?: string;
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_BACKEND_ORIGIN?: string;
  /** Production cPanel: set true if /api 404s (use /index.php/api). Auto true in prod builds. */
  readonly VITE_LARAVEL_INDEX_PHP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
