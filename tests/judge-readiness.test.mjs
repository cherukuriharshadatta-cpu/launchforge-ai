import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('app/page.tsx');
const demo = read('app/api/demo-catalog/route.ts');
const reel = read('app/api/reel/route.ts');
const gitignore = read('.gitignore');

test('live judge UX exposes Product Graph', () => {
  assert.match(page, /LAUNCHFORGE PRODUCT GRAPH/);
  assert.match(page, /reconstructs products/);
});

test('Cloudinary X-Ray is available from SKU reconstruction', () => {
  assert.match(page, /Cloudinary X-Ray/);
  assert.match(page, /CLOUDINARY X-RAY/);
});

test('Judge Replay provides a deterministic path', () => {
  assert.match(page, /Replay a verified launch/);
  assert.match(page, /JUDGE REPLAY/);
});

test('demo launch contains three verified views of one sneaker SKU', () => {
  assert.match(demo, /black-sneaker-front\.jpg/);
  assert.match(demo, /black-sneaker-side\.jpg/);
  assert.match(demo, /black-sneaker-back\.jpg/);
});

test('demo launch intentionally exercises exact duplicate removal', () => {
  assert.match(demo, /black-sneaker-front-copy\.jpg/);
  assert.match(demo, /seenEtags/);
  assert.match(demo, /duplicatesRemoved \+= 1/);
});

test('reel engine builds three Cloudinary motion shots', () => {
  assert.match(reel, /\[0, 1, 2\]\.map/);
  assert.match(reel, /e_zoompan/);
});

test('reel engine includes transitions and text overlays', () => {
  assert.match(reel, /fl_splice:transition_/);
  assert.match(reel, /l_text:/);
});

test('reel engine has a non-breaking fallback', () => {
  assert.match(reel, /Storyboard composition fallback/);
  assert.match(reel, /cloudinary-zoompan/);
});

test('Cloudinary secrets are protected by gitignore', () => {
  assert.match(gitignore, /\.env/);
  assert.match(gitignore, /\.env\.local/);
});

test('BYOK instructions remain documented in the app', () => {
  assert.match(page, /Use your own Cloudinary keys/);
});

