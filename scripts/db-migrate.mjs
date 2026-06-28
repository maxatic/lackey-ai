// ponytail: simple sequential SQL runner, no frameworks
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    // ponytail: no IF NOT EXISTS by design — re-running on a non-empty DB will fail (expected).
    await client.query(sql);
    console.log(`  ✓ ${file} applied`);
  }

  console.log('Migration complete.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
