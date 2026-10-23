import assert from 'node:assert';

globalThis.hrefs = [];
await import('./dist/a.js');
await import('./dist/b.js');

assert.strictEqual(globalThis.hrefs.length, 2);
assert.ok(
  /\/dist\/assets\/asset-[^/]+\.txt$/.test(globalThis.hrefs[0]),
  `the asset URL points into the output directory: ${globalThis.hrefs[0]}`,
);
assert.strictEqual(
  globalThis.hrefs[1],
  globalThis.hrefs[0],
  'both entries resolve the same asset URL, whether the chunk is a file or a record',
);
