// ponytail: inline verify, no test framework needed for infra check
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  const tableNames = tables.rows.map(r => r.table_name);
  console.log('Tables:', tableNames);

  const enums = await client.query(
    "select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='entry_kind' order by e.enumsortorder"
  );
  const enumValues = enums.rows.map(r => r.enumlabel);
  console.log('entry_kind values:', enumValues);

  const indexes = await client.query(
    "select indexname, indexdef from pg_indexes where schemaname='public' and indexname in ('bullets_tags_gin','bullets_entry_idx','entries_user_kind_idx') order by indexname"
  );
  console.log('Indexes:');
  indexes.rows.forEach(r => console.log(' ', r.indexname, '->', r.indexdef));

  // Assertions
  let failed = false;

  if (tableNames.length !== 9) {
    console.error(`FAIL: expected 9 public tables, got ${tableNames.length}: ${tableNames.join(', ')}`);
    failed = true;
  } else {
    console.log(`✓ 9 public tables confirmed`);
  }

  if (enumValues.length !== 7) {
    console.error(`FAIL: expected 7 entry_kind values, got ${enumValues.length}: ${enumValues.join(', ')}`);
    failed = true;
  } else {
    console.log(`✓ 7 entry_kind enum values confirmed`);
  }

  const hasGin = indexes.rows.some(r => r.indexname === 'bullets_tags_gin');
  if (!hasGin) {
    console.error('FAIL: bullets_tags_gin index not found');
    failed = true;
  } else {
    console.log(`✓ bullets_tags_gin index confirmed`);
  }

  if (failed) process.exit(1);
  console.log('Verify complete.');
} catch (err) {
  console.error('Verify failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
