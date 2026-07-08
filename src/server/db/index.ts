/**
 * SQLite (better-sqlite3) + Drizzle client for Camp Scout AI.
 *
 * Opened lazily on first use. In prod DATABASE_PATH points at a file on the
 * Fly volume (/data); in dev it defaults to a local, gitignored file. Runs on
 * a single instance (SQLite is a single-writer store).
 */
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from './schema.js'

export type Db = BetterSQLite3Database<typeof schema>

const DEFAULT_DB_PATH = './campscout.sqlite'
// Resolved from cwd so it works under jest (CommonJS, no import.meta), dev, and
// the Docker runtime (WORKDIR /app, where src/server/db/migrations is copied).
const MIGRATIONS_DIR = join(process.cwd(), 'src', 'server', 'db', 'migrations')

let dbInstance: Db | null = null

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim()
  return configured && configured.length > 0 ? configured : DEFAULT_DB_PATH
}

/** Lazily open + migrate the database, returning a shared Drizzle client. */
export function getDb(): Db {
  if (dbInstance) {
    return dbInstance
  }

  const path = resolveDatabasePath()
  if (path !== ':memory:') {
    const dir = dirname(path)
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS_DIR })

  dbInstance = db
  return db
}

/** Test helper: point at an in-memory DB and reset the shared instance. */
export function __resetDbForTests(db: Db | null = null): void {
  dbInstance = db
}
