import assert from 'node:assert';

globalThis.directories = [];
await import('./dist/a.js');
await import('./dist/b.js');

assert.strictEqual(globalThis.directories.length, 2);
assert.ok(
  globalThis.directories[0].endsWith('/dist/'),
  `the shared module's import.meta.url is in the output directory: ${globalThis.directories[0]}`,
);
assert.strictEqual(
  globalThis.directories[1],
  globalThis.directories[0],
  'both entries read the same directory, whether the chunk is a file or a record',
);
