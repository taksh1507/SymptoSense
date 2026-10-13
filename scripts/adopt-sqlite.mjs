/** Adopt the SQLite baseline using only additive changes, with a consistent backup. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, backup as sqliteBackup } from 'node:sqlite';
const root = fileURLToPath(new URL('../', import.meta.url));
const nextEnv = await import('@next/env'); (nextEnv.loadEnvConfig ?? nextEnv.default.loadEnvConfig)(root);
const connection = process.env.DATABASE_URL ?? 'file:./dev.db';
if (!connection.startsWith('file:')) throw new Error('SQLite DATABASE_URL required');
const dbPath = path.resolve(root, 'prisma', connection.slice(5).split('?')[0]);
if (!dbPath.startsWith(path.resolve(root) + path.sep)) throw new Error('Database must be inside this workspace');
const cli = path.join(root, 'node_modules/prisma/build/index.js');
const options = { cwd: root, env: { ...process.env, DATABASE_URL: connection }, encoding: 'utf8', stdio: 'pipe', windowsHide: true };
const prisma = (...args) => execFileSync(process.execPath, [cli, ...args], options);
if (!existsSync(dbPath)) { console.log(prisma('migrate', 'deploy')); process.exit(0); }
const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
if (tables.includes('_prisma_migrations')) { db.close(); console.log(prisma('migrate', 'deploy')); process.exit(0); }
const backupDir = path.join(root, '.local/db-backups'); mkdirSync(backupDir, { recursive: true });
await sqliteBackup(db, path.join(backupDir, path.basename(dbPath) + '.' + Date.now() + '.bak'));
console.log('Created a consistent local backup.');
const baseline = readFileSync(path.join(root, 'prisma/migrations/20260414051124_init/migration.sql'), 'utf8');
const statements = [];
for (const match of baseline.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g)) {
  const [, name, body] = match;
  if (!tables.includes(name)) { statements.push(match[0]); continue; }
  const columns = new Set(db.prepare('PRAGMA table_info("' + name + '")').all().map(c => c.name));
  for (const line of body.split('\n')) {
    const definition = line.trim().replace(/,$/, '');
    const column = definition.match(/^"([^"]+)" /)?.[1];
    if (!column || columns.has(column)) continue;
    if (/PRIMARY KEY|UNIQUE|REFERENCES/.test(definition) || (/NOT NULL/.test(definition) && !/DEFAULT/.test(definition))) throw new Error('Required structural change needs manual review; backup retained.');
    statements.push('ALTER TABLE "' + name + '" ADD COLUMN ' + definition + ';');
  }
}
for (const match of baseline.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"[^;]+;/g)) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?").get(match[1])) statements.push(match[0]);
}
const counts = Object.fromEntries(tables.map(t => [t, db.prepare('SELECT COUNT(*) AS n FROM "' + t.replaceAll('"', '""') + '"').get().n]));
db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
try {
  for (const statement of statements) db.exec(statement);
  for (const [table, count] of Object.entries(counts)) if (db.prepare('SELECT COUNT(*) AS n FROM "' + table.replaceAll('"', '""') + '"').get().n !== count) throw new Error('Record count changed');
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Existing foreign key inconsistency needs review');
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; } finally { db.close(); }
// Refuse to mark history adopted unless Prisma sees the exact current schema.
prisma('migrate', 'diff', '--from-url', 'file:' + dbPath.replaceAll('\\', '/'), '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code');
for (const migration of ['20260414051124_init', '20260414190108_add_confidence_fields', '20260414195100_add_reasoning_fields_v2']) console.log(prisma('migrate', 'resolve', '--applied', migration));
console.log('All existing records preserved; SQLite baseline adopted.');
