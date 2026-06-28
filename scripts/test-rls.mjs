// RLS isolation test — uses pg + SET LOCAL ROLE to replicate PostgREST session model.
// Runs entirely in a single transaction, rolled back at end so no data persists.
// ponytail: no test framework — assert() is enough for a security gate check.
import pg from 'pg';
const { Client } = pg;

const SUB_A = 'rls_test_user_a';
const SUB_B = 'rls_test_user_b';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query('BEGIN');

  // PostgREST pattern: switch to authenticated role + set JWT claims
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: SUB_A }),
  ]);

  // ── As user A: insert user + entry (must succeed WITH CHECK) ──────────────
  await client.query('insert into users (id) values ($1)', [SUB_A]);
  await client.query(
    "insert into entries (user_id, kind, title) values ($1, 'experience', 'A-owned')",
    [SUB_A]
  );
  console.log('Setup: user A and entry inserted.');

  // ── Switch to user B ───────────────────────────────────────────────────────
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: SUB_B }),
  ]);

  // ASSERT 1: user B sees 0 rows from entries (USING blocks cross-user read)
  const { rows: visibleToB } = await client.query(
    "select count(*) as n from entries where title='A-owned'"
  );
  assert(visibleToB[0].n === '0', `cross-user read returns 0 rows (got ${visibleToB[0].n})`);

  // ASSERT 2: user B cannot insert a row owned by A (WITH CHECK rejects)
  let forgedInsertThrew = false;
  await client.query('SAVEPOINT rls_test');
  try {
    await client.query(
      "insert into entries (user_id, kind, title) values ($1, 'experience', 'forged')",
      [SUB_A]
    );
  } catch {
    forgedInsertThrew = true;
    await client.query('ROLLBACK TO SAVEPOINT rls_test');
  }
  assert(forgedInsertThrew, 'cross-user insert throws (RLS WITH CHECK enforced)');

  // ── Storage bucket check (existence only, no real upload) ─────────────────
  // Switch back to superuser context for the meta-check
  await client.query('reset role');
  const { rows: buckets } = await client.query(
    "select id from storage.buckets where id = 'profile-photos'"
  );
  assert(buckets.length === 1, "storage bucket 'profile-photos' exists");

  const { rows: policies } = await client.query(
    "select count(*) as n from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'profile_photos%'"
  );
  assert(Number(policies[0].n) >= 1, `storage.objects has ${policies[0].n} profile-photos polic(ies)`);

  await client.query('ROLLBACK'); // no test data persists
  console.log('\nAll RLS assertions passed.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Test error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
