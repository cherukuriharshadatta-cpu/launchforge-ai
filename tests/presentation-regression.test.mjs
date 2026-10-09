import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
const file=(name)=>readFileSync(new URL(`../${name}`,import.meta.url),"utf8");
test("judge fixture images are framed, other product images are unchanged",()=>{
 const helper=file("lib/productPreview.ts");
 assert.ok(helper.includes('startsWith("launchforge/demo-catalog/")'));
 assert.ok(helper.includes("e_trim:10/c_pad"));
 assert.ok(file("app/api/demo-catalog/route.ts").includes('effect: "trim:10"'));
 assert.ok(file("app/api/reel/route.ts").includes("e_trim:10"));
});
test("catalog and text no longer depend on after-render mutation fixes",()=>{
 assert.ok(!file("app/layout.tsx").includes("CatalogImageFix"));
 assert.ok(!file("app/DemoMatchExperience.tsx").includes("cleanCatalogDuplicates"));
 assert.ok(!file("app/DemoMatchExperience.tsx").includes("repairEncoding"));
 assert.ok(file("app/page.tsx").includes("visibleCatalog.map"));
 assert.ok(!/Ã|Â|â[€†œ–‚€™˜—]/.test(file("app/page.tsx")));
});
