// The end-to-end suite runs on the same Playwright release as the web tests: the version orderflow-engine-web pins for
// playwright must also be the e2e runner's @playwright/test and the tag of the image in e2e/Dockerfile. Fails when one
// of them has drifted. Run by scripts/e2e before anything is built. No dependencies; Node 18+.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const e2e = dirname(fileURLToPath(import.meta.url));
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));

const web = json(join(e2e, '..', '..', 'orderflow-engine-web', 'package.json')).devDependencies?.playwright;
const runner = json(join(e2e, 'package.json')).devDependencies?.['@playwright/test'];
const image = readFileSync(join(e2e, 'Dockerfile'), 'utf8').match(/^FROM mcr\.microsoft\.com\/playwright:v(\S+)-noble\s*$/m)?.[1];

if (!web || runner !== web || image !== web) {
  console.error(`e2e: Playwright versions differ: orderflow-engine-web ${web}, e2e/package.json ${runner}, e2e/Dockerfile ${image}`);
  process.exit(1);
}
console.log(`e2e: Playwright ${web}, as pinned by orderflow-engine-web`);
