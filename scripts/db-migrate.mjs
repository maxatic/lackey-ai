// ponytail: simple sequential SQL runner with applied-migration tracking
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

  // Ensure tracking table exists
  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  // deny-all to non-owner roles; postgres/owner bypasses RLS so migrations still run
  await client.query('alter table schema_migrations enable row level security');

  // Backfill: if 0001_schema not recorded but users table already exists, record it
  const { rows: recorded } = await client.query(
    "select version from schema_migrations where version = '0001_schema'"
  );
  if (recorded.length === 0) {
    const { rows: tables } = await client.query(
      "select 1 from information_schema.tables where table_schema='public' and table_name='users'"
    );
    if (tables.length > 0) {
      await client.query(
        "insert into schema_migrations (version) values ('0001_schema') on conflict do nothing"
      );
      console.log('Backfilled 0001_schema (users table already exists).');
    }
  }

  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');

    const { rows } = await client.query(
      'select 1 from schema_migrations where version = $1',
      [version]
    );
    if (rows.length > 0) {
      console.log(`Skipping ${file} (already applied).`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'insert into schema_migrations (version) values ($1)',
        [version]
      );
      await client.query('COMMIT');
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log('Migration complete.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
