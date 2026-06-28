// ponytail: inline verify, no test framework needed for infra check
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const tables = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
console.log('Tables:', tables.rows.map(r => r.table_name));

const enums = await client.query(
  "select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='entry_kind' order by e.enumsortorder"
);
console.log('entry_kind values:', enums.rows.map(r => r.enumlabel));

const indexes = await client.query(
  "select indexname, indexdef from pg_indexes where schemaname='public' and indexname in ('bullets_tags_gin','bullets_entry_idx','entries_user_kind_idx') order by indexname"
);
console.log('Indexes:');
indexes.rows.forEach(r => console.log(' ', r.indexname, '->', r.indexdef));

await client.end();
