// Re-export-only barrel. This file declares NO types of its own — each entity
// module owns its Row/Input types and they are surfaced here via `export *`.
// Re-exporting `Database` here is the single shared type the barrel forwards.
export type { Database } from './database.types';

// Entity modules are re-exported as they land in later tasks. Uncomment each
// line when its module is created (a re-export of a missing module breaks the
// build, so they are commented until then):
export * from './profile'; // Task 2
export * from './entries'; // Task 3
export * from './bullets'; // Task 4
export * from './skills';    // Task 5
export * from './languages'; // Task 5
export * from './tracks';    // Task 6
//   export * from './curation'   // Task 7
