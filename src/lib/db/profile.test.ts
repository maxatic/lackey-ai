// src/lib/db/profile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'user_clerk_123';
let store: Record<string, unknown> | null = null;

// In-memory stand-in for the supabase client's personal_profile table.
const fakeClient = {
  from(table: string) {
    if (table !== 'personal_profile') throw new Error(`unexpected table ${table}`);
    return {
      upsert(row: Record<string, unknown>) {
        store = { ...row, updated_at: '2026-06-28T00:00:00Z' };
        return {
          select: () => ({
            single: async () => ({ data: store, error: null }),
          }),
        };
      },
      select() {
        return {
          eq: (_col: string, _val: string) => ({
            maybeSingle: async () => ({ data: store, error: null }),
          }),
        };
      },
    };
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => fakeClient,
}));
vi.mock('@/lib/auth/ensure-user', () => ({ ensureUser: async () => {} }));
vi.mock('@/lib/auth/local-user', () => ({
  getUserId: () => USER_ID,
  LOCAL_USER_NAME: 'Maxat Issaliyev',
}));

import { getProfile, upsertProfile } from './profile';

beforeEach(() => {
  store = null;
});

describe('profile db helper', () => {
  it('round-trips a full profile through upsert + get, injecting user_id', async () => {
    const input = {
      full_name: 'Ada Lovelace',
      headline: 'Analytical Engineer',
      email: 'ada@example.com',
      phone: '+44 20 7946 0000',
      location: 'London, UK',
      links: [
        { label: 'GitHub', url: 'https://github.com/ada' },
        { label: 'Site', url: 'https://ada.dev' },
      ],
      photo_url: 'user_clerk_123/avatar',
      date_of_birth: '1815-12-10',
      nationality: 'British',
      marital_status: 'single',
      gender: 'female',
      driving_license: 'B',
    };

    const saved = await upsertProfile(input);
    expect(saved.user_id).toBe(USER_ID);
    expect(saved.full_name).toBe('Ada Lovelace');
    expect(saved.links).toEqual(input.links);
    expect(saved.driving_license).toBe('B');

    const fetched = await getProfile();
    expect(fetched).not.toBeNull();
    expect(fetched!.email).toBe('ada@example.com');
    expect(fetched!.photo_url).toBe('user_clerk_123/avatar');
    expect(fetched!.date_of_birth).toBe('1815-12-10');
  });

  it('returns null when no profile row exists', async () => {
    expect(await getProfile()).toBeNull();
  });
});
