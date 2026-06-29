import { describe, it, expect, expectTypeOf } from 'vitest';
import * as db from '@/lib/db';
import type { Database } from '@/lib/db';

describe('db index', () => {
  it('imports the db barrel without throwing', () => {
    expect(db).toBeTypeOf('object');
  });

  it('re-exports the generated Database type', () => {
    expectTypeOf<Database['public']['Tables']['personal_profile']['Row']>().toBeObject();
    expectTypeOf<Database['public']['Tables']['entries']['Row']>().toBeObject();
  });
});
