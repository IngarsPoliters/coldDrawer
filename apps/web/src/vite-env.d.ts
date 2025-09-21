/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_CONTRACT_ADDRESS: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}