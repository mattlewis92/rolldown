// Names and versions `packages/rolldown` for a publish of the ClickUp fork to GitHub Packages.
//
// A release branch `clickup/v<upstream>` publishes `<upstream>-clickup.<n>`, `n` counting the
// releases made from that branch from 0, under the dist-tags `v<upstream>` and `latest`. The
// branch must sit on the upstream release it is named after. Any other `clickup/*` branch
// publishes `<upstream>-clickup.<branch>.<run>` under the branch name as its dist-tag.
//
// Run from `packages/rolldown` with BRANCH (the branch name), RUN_NUMBER and GITHUB_OUTPUT set;
// `--dry-run` prints the version and tags without touching package.json.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const PACKAGE = '@time-loop/rolldown';
const RELEASE_BRANCH = /^clickup\/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;

const dryRun = process.argv.includes('--dry-run');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const branch = process.env.BRANCH ?? '';

const npm = (args) =>
  execFileSync('npm', [...args, '--loglevel', 'error'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const isPublished = (version) => {
  try {
    return npm(['view', `${PACKAGE}@${version}`, 'version']) === version;
  } catch {
    return false;
  }
};
const taggedVersion = (tag) => {
  try {
    const line = npm(['dist-tag', 'ls', PACKAGE])
      .split('\n')
      .find((entry) => entry.startsWith(`${tag}: `));
    return line ? line.slice(tag.length + 2).trim() : null;
  } catch {
    return null;
  }
};

let version;
let tags;
const release = RELEASE_BRANCH.exec(branch);
if (release) {
  const upstream = release[1];
  if (upstream !== pkg.version) {
    console.error(
      `${branch} must sit on rolldown ${upstream}, but packages/rolldown/package.json says ${pkg.version}: rebase the ClickUp commits onto the v${pkg.version} tag and name the branch clickup/v${pkg.version}.`,
    );
    process.exit(1);
  }
  const prefix = `${upstream}-clickup.`;
  const tag = `v${upstream}`;
  // The tag names the last release from this branch; the probe covers a publish whose tag
  // update failed.
  const last = taggedVersion(tag);
  const lastN = last?.startsWith(prefix) ? last.slice(prefix.length) : null;
  let n = lastN !== null && /^\d+$/.test(lastN) ? Number(lastN) + 1 : 0;
  while (isPublished(`${prefix}${n}`)) {
    n++;
  }
  version = `${prefix}${n}`;
  tags = [tag, 'latest'];
} else {
  const tag = branch.replace(/^clickup\//, '').replace(/[^a-zA-Z0-9-]/g, '-');
  version = `${pkg.version}-clickup.${tag}.${process.env.RUN_NUMBER}`;
  tags = [tag];
}
console.log(`${PACKAGE}@${version} (dist-tags: ${tags.join(', ')})`);
if (dryRun) {
  process.exit(0);
}

pkg.name = PACKAGE;
pkg.version = version;
pkg.repository = {
  type: 'git',
  url: 'git+https://github.com/time-loop/rolldown.git',
  directory: 'packages/rolldown',
};
pkg.files = pkg.files.filter((entry) => entry !== '!dist/*.node');
pkg.publishConfig = {
  ...pkg.publishConfig,
  registry: 'https://npm.pkg.github.com',
  access: 'restricted',
};
delete pkg.optionalDependencies;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
fs.appendFileSync(
  process.env.GITHUB_OUTPUT,
  `version=${version}\ntag=${tags[0]}\nextra_tags=${tags.slice(1).join(' ')}\n`,
);
