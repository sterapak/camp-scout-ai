import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  // Local dev DB; prod uses DATABASE_PATH on the Fly volume.
  dbCredentials: { url: process.env.DATABASE_PATH ?? './campscout.sqlite' },
})
