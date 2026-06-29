/// <reference types="vite/client" />

interface CampScoutRuntimeConfig {
  apiToken?: string
}

interface Window {
  __CAMP_SCOUT_RUNTIME__?: CampScoutRuntimeConfig
}
