import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isExternal = false;
let isInitialized = false;

// Password hashing utilities using PBKDF2
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return computed === hash;
}

export async function getDb(): Promise<{
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  exec: (sql: string) => Promise<void>;
  isExternal: boolean;
}> {
  if (isInitialized && (pgPool || pgliteInstance)) {
    return {
      query: runQuery,
      exec: runExec,
      isExternal,
    };
  }

  await initDatabase();
  return {
    query: runQuery,
    exec: runExec,
    isExternal,
  };
}

async function runQuery<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (pgPool) {
    const res = await pgPool.query(text, params);
    return { rows: res.rows as T[], rowCount: res.rowCount || res.rows.length };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query(text, params);
    return { rows: res.rows as T[], rowCount: res.rows.length };
  }
  throw new Error('Database is not initialized.');
}

async function runExec(sql: string): Promise<void> {
  if (pgPool) {
    await pgPool.query(sql);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(sql);
  } else {
    throw new Error('Database is not initialized.');
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!isInitialized) {
    await initDatabase();
  }
  return runQuery<T>(text, params);
}

export async function exec(sql: string): Promise<void> {
  if (!isInitialized) {
    await initDatabase();
  }
  return runExec(sql);
}

export async function initDatabase(): Promise<void> {
  if (isInitialized) return;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    try {
      console.log('🔄 Attempting connection to external PostgreSQL specified in DATABASE_URL...');
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      });

      // Quick test probe with timeout
      await pool.query('SELECT 1 as connected;');
      pgPool = pool;
      isExternal = true;
      console.log('✅ Connected to external PostgreSQL database via pg.Pool!');
    } catch (err: any) {
      console.warn('⚠️ Could not connect to external PostgreSQL server:', err.message);
      console.log('🔄 Engaging persistent local PostgreSQL engine (PGlite 18 Engine)...');
      pgPool = null;
    }
  }

  if (!pgPool) {
    const dataDir = path.resolve(process.cwd(), 'data', 'postgres_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
    isExternal = false;
    const versionRes = await pgliteInstance.query('SELECT version();');
    console.log(`✅ PostgreSQL engine active: ${(versionRes.rows[0] as any).version}`);
  }

  // Execute database migrations & dataset initialization
  await runMigrations();

  isInitialized = true;
}

async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'database', 'dataset.sql');
  if (fs.existsSync(schemaPath)) {
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');

    // Check if tables already exist
    const checkUsers = await runQuery<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"
    );

    const hasTables = parseInt(checkUsers.rows[0]?.count || '0', 10) > 0;

    if (!hasTables) {
      console.log('📦 Initializing PostgreSQL schema and dataset from database/dataset.sql...');
      await runExec(sqlContent);
      console.log('✅ PostgreSQL schema and dataset initialized successfully.');
    } else {
      // Ensure required QA columns exist via idempotent ALTER TABLE
      try {
        await runExec(`
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_status VARCHAR(20) DEFAULT 'Pending';
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ;
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_verified_by_user_id VARCHAR(50);
          ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_defect_reason TEXT;
        `);
      } catch (e: any) {
        // Ignored if already present
      }
    }

    // Check user account passwords:
    // If password_hash is NULL in users table, seed default secure PBKDF2 hash 'password123'
    // so existing employees can log in immediately, while also supporting the account activation workflow!
    const usersWithoutPass = await runQuery<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE password_hash IS NULL;"
    );

    if (usersWithoutPass.rows.length > 0) {
      console.log(`🔒 Initializing secure PBKDF2 password hashes for ${usersWithoutPass.rows.length} users...`);
      for (const u of usersWithoutPass.rows) {
        const { hash, salt } = hashPassword('password123');
        await runQuery(
          "UPDATE users SET password_hash = $1, password_salt = $2, is_active = true WHERE id = $3;",
          [hash, salt, u.id]
        );
      }
      console.log('✅ User credentials securely hashed in PostgreSQL.');
    }
  }
}

export async function getDbStats() {
  await getDb();
  try {
    const [u, t, b, p, s] = await Promise.all([
      runQuery<{ count: string }>('SELECT COUNT(*) as count FROM users;'),
      runQuery<{ count: string }>('SELECT COUNT(*) as count FROM tasks;'),
      runQuery<{ count: string }>('SELECT COUNT(*) as count FROM bug_reports;'),
      runQuery<{ count: string }>('SELECT COUNT(*) as count FROM projects;'),
      runQuery<{ count: string }>('SELECT COUNT(*) as count FROM work_sessions;'),
    ]);
    return {
      users: parseInt(u.rows[0]?.count || '0', 10),
      tasks: parseInt(t.rows[0]?.count || '0', 10),
      bugs: parseInt(b.rows[0]?.count || '0', 10),
      projects: parseInt(p.rows[0]?.count || '0', 10),
      workSessions: parseInt(s.rows[0]?.count || '0', 10),
      isExternal,
    };
  } catch (err: any) {
    return {
      users: 0,
      tasks: 0,
      bugs: 0,
      projects: 0,
      workSessions: 0,
      isExternal,
      error: err.message,
    };
  }
}
