
///<reference types="vite/client"/> 

declare module '*.png' 

declare module '*.jpg' 

declare module '*.jpeg' 
declare module '*.svg' 
declare module '*.gif' 
declare module '*.webp'


declare module '*.mp4';
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_DATABASE_URL?: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}