/** Fixed single-user identity for local (no-Clerk) mode. */

export const DEFAULT_LOCAL_USER_ID = 'local-maxat-issaliyev';
export const LOCAL_USER_NAME = 'Maxat Issaliyev';

export function getUserId(): string {
  return process.env.LOCAL_USER_ID?.trim() || DEFAULT_LOCAL_USER_ID;
}
