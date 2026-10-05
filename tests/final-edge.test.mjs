import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const url = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => readFileSync(url(p), 'utf8');
const bytes = (p) => readFileSync(url(p));
const sha = (p) => createHash('sha256').update(bytes(p)).digest('hex');

const page = read('app/page.tsx');
const demo = read('app/api/demo-catalog/route.ts');
const product = read('app/api/product/route.ts');
const aiVision = read('lib/aiVision.ts');
const update = read('app/api/product/update/route.ts');
const reel = read('app/api/reel/route.ts');
const readme = read('README.md');
const gitignore = read('.gitignore');

const fixtures = [
  'public/demo/black-sneaker-side.jpg',
  'public/demo/black-sneaker-front.jpg',
  'public/demo/black-sneaker-back.jpg',
  'public/demo/black-sneaker-front-copy.jpg',
  'public/demo/graphic-sneakers.jpg',
  'public/demo/gold-watch.jpg',
];

test('judge demo ships all six supplier fixtures', () => {
  for (const f of fixtures) assert.equal(existsSync(url(f)), true, `Missing ${f}`);
});

test('duplicate fixture is byte-identical to the original supplier photo', () => {
  assert.equal(sha('public/demo/black-sneaker-front.jpg'), sha('public/demo/black-sneaker-front-copy.jpg'));
});

test('front, side and back fixtures are genuinely different media files', () => {
  const hashes = new Set([
    sha('public/demo/black-sneaker-front.jpg'),
    sha('public/demo/black-sneaker-side.jpg'),
    sha('public/demo/black-sneaker-back.jpg'),
  ]);
  assert.equal(hashes.size, 3);
});

test('three sneaker views intentionally share one stable productFamily', () => {
  const family = 'low-top hook-and-loop sneaker with thick sole';
  assert.ok((demo.match(new RegExp(family, 'g')) || []).length >= 4);
  assert.match(demo, /view: "front"/);
  assert.match(demo, /view: "back"/);
  assert.match(demo, /view: "left side"/);
});

test('Cloudinary upload requests pHash and quality analysis', () => {
  assert.match(product, /phash:\s*true/);
  assert.match(product, /quality_analysis:\s*true/);
  assert.match(demo, /phash:\s*true/);
  assert.match(demo, /quality_analysis:\s*true/);
});

test('AI Vision analyzes the immutable Cloudinary asset and asks for SKU identity + view', () => {
  assert.match(product, /analyzeProduct\(\{ assetId: uploaded\.asset_id/);
  assert.match(aiVision, /ai_vision_general/);
  assert.match(aiVision, /productFamily is especially important/);
  assert.match(aiVision, /view must describe the visible camera angle/);
});

test('demo metadata preserves identity, view, price and stock on managed assets', () => {
  for (const field of ['product_family=', 'view=', 'price=', 'stock=', 'demo_mode=judge-safe']) {
    assert.ok(demo.includes(field), `Missing ${field}`);
  }
});

test('exact duplicates are detected with ETag and deleted from Cloudinary', () => {
  assert.match(demo, /seenEtags\.has\(uploaded\.etag\)/);
  assert.match(demo, /duplicatesRemoved \+= 1/);
  assert.match(demo, /cloudinary\.uploader\.destroy\(uploaded\.public_id/);
});

test('judge replay contract exposes 6 raw files → 5 unique assets → 3 SKU families', () => {
  assert.equal((demo.match(/file:\s*"/g) || []).length, 6);
  assert.match(demo, /skuFamilies:\s*3/);
  assert.match(demo, /multiAngleFamilies:\s*1/);
  assert.match(page, /rawAssets:\s*demoRunMetrics\?\.rawAssets/);
  assert.match(page, /uniqueAssets:\s*products\.length/);
});

test('Product Graph refuses cross-category merges', () => {
  assert.match(page, /if \(categoryBucket\(a\) !== categoryBucket\(b\)\) return false/);
});

test('Product Graph rejects incompatible closure evidence', () => {
  assert.match(page, /A\.closure && B\.closure && A\.closure !== B\.closure/);
});

test('pHash is supporting evidence, never the sole SKU decision', () => {
  assert.match(page, /pHash may support the decision/);
  assert.match(page, /hashDistance <= 12 && shared >= 2 && overlap >= 0\.62/);
});

test('reconstruction confidence is backed by family, color, view, pHash and ETag evidence', () => {
  for (const phrase of [
    'AI family identity agrees',
    'Color evidence is consistent',
    'distinct camera views',
    'pHash supports visual similarity',
    'ETag duplicate-safe',
  ]) assert.ok(page.includes(phrase), `Missing evidence: ${phrase}`);
  assert.match(page, /const confidence = Math\.min\(99/);
});

test('Cloudinary X-Ray exposes source, transformed asset and Reel links', () => {
  assert.match(page, /Open source asset/);
  assert.match(page, /Open transformed catalog asset/);
  assert.match(page, /Open generated Reel/);
});

test('Cloudinary X-Ray maps the core pipeline rather than a generic feature list', () => {
  for (const label of ['Upload API', 'AI Vision', 'ETag', 'pHash', 'Product Graph', 'Structured metadata', 'Video pipeline']) {
    assert.ok(page.includes(`["${label}"`) || page.includes(`"${label}"`), `Missing X-Ray row: ${label}`);
  }
});

test('Judge Replay is a deterministic five-step path into Product Graph, catalog, website and video', () => {
  assert.match(page, /const steps = \[/);
  for (const name of ['Chaos', 'Reconstruct', 'Catalog', 'Launch', 'Promote']) assert.ok(page.includes(`["${name}"`));
  assert.match(page, /getElementById\("product-graph"\)/);
  assert.match(page, /if \(step === 4\) setStage\("video"\)/);
});

test('AI Vision quota failure deletes the failed upload and switches to judge demo', () => {
  assert.match(page, /quotaLimited/);
  assert.match(page, /\/api\/product\/delete/);
  assert.match(page, /\/api\/demo-catalog/);
  assert.match(aiVision, /status === 429/);
});

test('Reel engine verifies all three source clips and the final composed MP4', () => {
  assert.match(reel, /\[0, 1, 2\]\.map/);
  assert.match(reel, /for \(const url of sourceUrls\) await verifyVideo\(url\)/);
  assert.match(reel, /await verifyVideo\(finalUrl\)/);
});

test('Reel composition includes transitions, text overlays and a judge-safe fallback', () => {
  assert.match(reel, /fl_splice:transition_/);
  assert.match(reel, /l_text:Arial_28_bold/);
  assert.match(reel, /l_text:Arial_42_bold/);
  assert.match(reel, /Storyboard composition fallback/);
  assert.match(reel, /url: sourceUrls\[1\]/);
});

test('commerce metadata stays attached to the Cloudinary asset and secrets stay server-side', () => {
  assert.match(update, /update_metadata/);
  assert.match(update, /ss_price/);
  assert.match(update, /ss_stock/);
  assert.match(update, /add_context/);
  assert.match(gitignore, /\.env\.local/);
  assert.match(readme, /Bring Your Own Cloudinary Keys/);
  assert.match(readme, /never asks a judge to paste/i);
});
