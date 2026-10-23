import assert from 'node:assert';

globalThis.directories = [];
await import('./dist/a.js');
await import('./dist/b.js');

assert.strictEqual(globalThis.directories.length, 2);
assert.ok(
  globalThis.directories[0].endsWith('/dist/chunks/'),
  `the shared chunk stays a file in its own directory: ${globalThis.directories[0]}`,
);
assert.strictEqual(globalThis.directories[1], globalThis.directories[0]);
