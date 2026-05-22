import Database from 'better-sqlite3';
import path from 'path';

// Locate the SQLite database file
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, '')
  : path.join(process.cwd(), 'dev.db');

// Database type declarations for better TypeScript support
export interface User {
  id: string;
  username: string;
  password?: string;
  defaultExpirationDays: number;
  role: string;
  storageLimit: number;
  planName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  originalName: string;
  s3Key: string;
  size: number;
  mimetype: string;
  expiresAt: string;
  createdAt: string;
  userId: string;
}

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

// Create or reuse singleton database connection
export const db = globalForDb.db ?? new Database(dbPath);

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Enable WAL journal mode for Next.js concurrent request efficiency
db.pragma('journal_mode = WAL');

// Ensure tables exist matching our original schema
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    defaultExpirationDays INTEGER DEFAULT 7,
    role TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS FileRecord (
    id TEXT PRIMARY KEY,
    originalName TEXT NOT NULL,
    s3Key TEXT UNIQUE NOT NULL,
    size INTEGER NOT NULL,
    mimetype TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  );
`);

// Idempotent column migrations for storage limits
try {
  db.exec(`ALTER TABLE User ADD COLUMN storageLimit INTEGER DEFAULT 1073741824;`);
} catch (err) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE User ADD COLUMN planName TEXT DEFAULT 'Free';`);
} catch (err) {
  // Column already exists, ignore
}

// Seeding: Auto-promote the oldest registered user to 'admin' if no admins currently exist
try {
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM User WHERE role = 'admin'").get() as { count: number } | undefined;
  if (adminCount && adminCount.count === 0) {
    const oldestUser = db.prepare("SELECT id, username FROM User ORDER BY createdAt ASC LIMIT 1").get() as { id: string; username: string } | undefined;
    if (oldestUser) {
      db.prepare("UPDATE User SET role = 'admin' WHERE id = ?").run(oldestUser.id);
      console.log(`[Database Seed] Promoted oldest user '${oldestUser.username}' to admin role.`);
    }
  }
} catch (err) {
  console.error('[Database Seed Error]:', err);
}
