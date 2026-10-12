/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCAL_DEV_AUTH?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_MIXPANEL_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
