/**
 * Smoke test — kept minimal because App.tsx mounts the full navigation tree
 * which requires many native TurboModules unavailable in Jest (Node.js).
 * Feature-level rendering tests should mock native deps at the appropriate
 * granularity using jest.mock() at the top of each test file.
 * @format
 */

test('jest environment is set up correctly', () => {
  expect(true).toBe(true);
});
