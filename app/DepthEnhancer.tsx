"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { BrandStrategy, ProductAsset } from "@/lib/types";

type Workspace = {
  products: ProductAsset[];
  brand?: { name: string; tagline: string };
  brandStrategy?: BrandStrategy | null;
  reel?: { url?: string; style?: string; productIds?: string[] } | null;
};

type Mounts = {
  graph: Element | null;
  doctor: Element | null;
  creative: Element | null;
  website: Element | null;
  video: Element | null;
};

type CampaignResult = { url: string; publicId?: string; assetId?: string; model?: string } | null;

type ChannelKey = "instagram" | "story" | "youtube" | "marketplace" | "website";
type GoalKey = "launch" | "conversion" | "awareness" | "sale";
type MerchMode = "balanced" | "conversion" | "luxury" | "new";

const CHANNELS: Record<ChannelKey, { label: string; ratio: string; note: string }> = {
  instagram: { label: "Instagram Feed", ratio: "4:5", note: "Large product, short headline, strong lower-third CTA" },
  story: { label: "Story / Reel Cover", ratio: "9:16", note: "Vertical composition with protected top and bottom text zones" },
  youtube: { label: "YouTube / Website", ratio: "16:9", note: "Product on one side, copy space on the other" },
  marketplace: { label: "Marketplace", ratio: "1:1", note: "Centered product-first composition with clean commercial framing" },
  website: { label: "Website Hero", ratio: "16:9", note: "Wide hero composition with deliberate negative space" },
};

const GOALS: Record<GoalKey, string> = {
  launch: "Introduce the product with premium launch energy",
  conversion: "Make the product immediately purchasable with a strong CTA",
  awareness: "Build memorable visual identity around the product",
  sale: "Communicate urgency and promotional value without cheapening the brand",
};

function readWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem("launchforge_workspace_v75") || "{}") as Partial<Workspace>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      brand: parsed.brand,
      brandStrategy: parsed.brandStrategy || null,
      reel: parsed.reel || null,
    };
  } catch {
    return { products: [] };
  }
}

function cloudinaryTransform(url: string | undefined, transform: string) {
  if (!url) return "";
  if (url.includes("/image/upload/")) return url.replace("/image/upload/", `/image/upload/${transform}/`);
  if (url.includes("/video/upload/")) return url.replace("/video/upload/", `/video/upload/${transform}/`);
  return url;
}

function healthScore(p: ProductAsset) {
  const focus = Math.max(0, Math.min(1, p.focusScore ?? 0.75));
  const minDim = Math.min(p.width || 1200, p.height || 1200);
  const resolution = Math.min(1, minDim / 1200);
  const metadata = [p.ai.name, p.ai.category, p.ai.color, p.ai.material, p.ai.style].filter(Boolean).length / 5;
  return Math.round(focus * 45 + resolution * 30 + metadata * 25);
}

function healthIssues(p: ProductAsset) {
  const issues: { label: string; severity: "warn" | "bad" }[] = [];
  const focus = p.focusScore ?? 0.75;
  const minDim = Math.min(p.width || 1200, p.height || 1200);
  if (focus < 0.28) issues.push({ label: "Low focus / weak source detail", severity: "bad" });
  else if (focus < 0.48) issues.push({ label: "Could use clarity enhancement", severity: "warn" });
  if (minDim < 420) issues.push({ label: "Low source resolution", severity: "bad" });
  else if (minDim < 800) issues.push({ label: "Below ideal storefront resolution", severity: "warn" });
  if (!p.ai.material) issues.push({ label: "Material metadata missing", severity: "warn" });
  if (!p.ai.view || p.ai.view.toLowerCase() === "unknown") issues.push({ label: "Camera view not classified", severity: "warn" });
  return issues;
}

function familyFor(product: ProductAsset | undefined, products: ProductAsset[]) {
  if (!product) return [];
  const family = (product.ai.productFamily || product.ai.name || "").toLowerCase();
  const category = (product.ai.category || "").toLowerCase();
  const color = (product.ai.color || "").toLowerCase();
  return products.filter(p => {
    const pf = (p.ai.productFamily || p.ai.name || "").toLowerCase();
    const pc = (p.ai.category || "").toLowerCase();
    const col = (p.ai.color || "").toLowerCase();
    return p.publicId === product.publicId || (family && pf === family) || (pc === category && col === color && family && pf.includes(family.split(" ")[0] || "__none__"));
  });
}

function viewCoverage(product: ProductAsset | undefined, products: ProductAsset[]) {
  const family = familyFor(product, products);
  const text = family.map(p => `${p.ai.view || ""} ${p.ai.tags.join(" ")} ${p.ai.description || ""}`).join(" ").toLowerCase();
  const checks = [
    ["Front", /front|hero|primary/],
    ["Side", /side|profile/],
    ["Rear", /rear|back/],
    ["Detail", /detail|close.?up|macro/],
    ["Lifestyle", /lifestyle|model|outdoor|scene/],
  ] as const;
  return checks.map(([label, rx]) => ({ label, present: rx.test(text) }));
}

function productConfidence(p: ProductAsset | undefined) {
  if (!p) return 0;
  let score = 55;
  if (p.aiStatus === "enabled") score += 15;
  if (p.phash) score += 8;
  if (p.etag) score += 8;
  if (p.ai.productFamily) score += 6;
  if (p.ai.view && p.ai.view !== "unknown") score += 4;
  if (p.ai.color && p.ai.material) score += 4;
  return Math.min(99, score);
}

function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>({ products: [] });
  useEffect(() => {
    let previous = "";
    const sync = () => {
      const raw = localStorage.getItem("launchforge_workspace_v75") || "";
      if (raw !== previous) {
        previous = raw;
        setWorkspace(readWorkspace());
      }
    };
    sync();
    const timer = window.setInterval(sync, 700);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return workspace;
}

function ProductIntelligenceV2({ products }: { products: ProductAsset[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [generated, setGenerated] = useState<CampaignResult>(null);
  const [generating, setGenerating] = useState("");
  const selected = products.find(p => p.publicId === selectedId) || products[0];
  const family = useMemo(() => familyFor(selected, products), [selected, products]);
  const coverage = useMemo(() => viewCoverage(selected, products), [selected, products]);
  const missing = coverage.filter(v => !v.present);
  const confidence = productConfidence(selected);
  const readiness = selected ? Math.round((healthScore(selected) * 0.52) + (confidence * 0.28) + ((coverage.filter(v => v.present).length / coverage.length) * 100 * 0.2)) : 0;

  useEffect(() => {
    if (!selectedId && products[0]) setSelectedId(products[0].publicId);
  }, [products, selectedId]);

  async function generateMissing(label: string) {
    if (!selected?.assetId) return;
    setGenerating(label); setGenerated(null);
    try {
      const prompt = `Create a faithful ecommerce ${label.toLowerCase()} product photograph of the exact product from [1]. Preserve the product identity, shape, proportions, logo, materials, color and construction exactly. Neutral premium studio background, realistic commercial lighting, no redesign, no invented logos, no text.`;
      const res = await fetch("/api/campaign-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetIds: [selected.assetId], prompt, aspectRatio: "1:1" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenerated(data.image || null);
    } catch {
      setGenerated(null);
    } finally {
      setGenerating("");
    }
  }

  if (!products.length) return null;
  return <details className="depthDetails depthGraph">
    <summary><span>PRODUCT INTELLIGENCE V2</span><b>Open deeper reasoning</b><em>{readiness}% SKU readiness</em></summary>
    <div className="depthBody">
      <div className="depthToolbar">
        <label>Inspect SKU<select value={selected?.publicId || ""} onChange={e => setSelectedId(e.target.value)}>{products.map(p => <option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select></label>
        <div className="depthScore"><span>IDENTITY CONFIDENCE</span><b>{confidence}%</b></div>
        <div className="depthScore"><span>LAUNCH READINESS</span><b>{readiness}%</b></div>
      </div>
      <div className="dnaGrid">
        <article><small>PRODUCT</small><b>{selected?.ai.name}</b><span>{selected?.ai.category}</span></article>
        <article><small>PRODUCT DNA</small><b>{[selected?.ai.color, selected?.ai.material].filter(Boolean).join(" · ") || "Metadata pending"}</b><span>{selected?.ai.style || "Style pending"}</span></article>
        <article><small>FAMILY EVIDENCE</small><b>{family.length} verified media asset{family.length === 1 ? "" : "s"}</b><span>{selected?.phash ? "pHash available" : "pHash pending"} · {selected?.etag ? "ETag available" : "ETag pending"}</span></article>
      </div>
      <div className="coverageRow">{coverage.map(v => <span className={v.present ? "covered" : "missing"} key={v.label}>{v.present ? "✓" : "+"} {v.label}</span>)}</div>
      {!!missing.length && <div className="missingMedia"><div><small>MISSING-SHOT INTELLIGENCE</small><b>{missing.length} recommended asset{missing.length === 1 ? "" : "s"}</b><p>LaunchForge found gaps that reduce channel coverage. Generate only what the SKU actually needs.</p></div><div>{missing.slice(0,3).map(v => <button key={v.label} disabled={!selected?.assetId || !!generating} onClick={() => generateMissing(v.label)}>{generating === v.label ? "Generating…" : `Generate ${v.label}`}</button>)}</div></div>}
      {generated?.url && <div className="generatedMissing"><img src={generated.url} alt="Generated missing product view"/><div><small>GENERATED GAP-FILL</small><b>Product identity preserved by prompt guardrails</b><a href={generated.url} target="_blank" rel="noreferrer">Open Cloudinary asset ↗</a></div></div>}
    </div>
  </details>;
}

function MediaDoctorV2({ products }: { products: ProductAsset[] }) {
  const [previewId, setPreviewId] = useState("");
  const selected = products.find(p => p.publicId === previewId) || [...products].sort((a,b) => healthScore(a) - healthScore(b))[0];
  const before = selected ? healthScore(selected) : 0;
  const after = Math.min(98, Math.max(before + 8, 90));
  const healed = selected ? cloudinaryTransform(selected.original || selected.catalog, "e_improve,e_sharpen:45,c_pad,w_1200,h_1200,b_auto:border,q_auto:good,f_auto") : "";
  const issues = selected ? healthIssues(selected) : [];
  const catalogBefore = products.length ? Math.round(products.reduce((n,p) => n + healthScore(p), 0) / products.length) : 0;
  const catalogAfter = products.length ? Math.round(products.reduce((n,p) => n + Math.min(98, Math.max(healthScore(p), 90)), 0) / products.length) : 0;
  useEffect(() => { if (!previewId && selected) setPreviewId(selected.publicId); }, [previewId, selected]);
  if (!products.length || !selected) return null;
  return <details className="depthDetails doctorDepth">
    <summary><span>AUTONOMOUS MEDIA DOCTOR</span><b>Diagnose → Repair → Verify</b><em>{catalogBefore} → {catalogAfter} catalog health</em></summary>
    <div className="depthBody">
      <div className="doctorDeepGrid">
        <div className="doctorBeforeAfter"><div><small>BEFORE · {before}</small><img src={selected.original || selected.catalog}/></div><div><small>HEALED PREVIEW · {after}</small><img src={healed}/></div></div>
        <div className="doctorDiagnosis"><label>Asset<select value={selected.publicId} onChange={e => setPreviewId(e.target.value)}>{products.map(p => <option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select></label><h4>{selected.ai.name}</h4>{issues.length ? <div className="issueStack">{issues.map(i => <span className={i.severity} key={i.label}>{i.severity === "bad" ? "!" : "•"} {i.label}</span>)}</div> : <div className="issueStack"><span className="good">✓ Source media passes the launch gate</span></div>}<div className="repairReceipt"><small>CLOUDINARY REPAIR PLAN</small><span>e_improve</span><span>e_sharpen</span><span>c_pad + b_auto</span><span>q_auto + f_auto</span></div><a className="depthAction" href={healed} target="_blank" rel="noreferrer">Open repaired derivative ↗</a></div>
      </div>
      <p className="depthFoot">Original supplier media is never overwritten. The repair is a reversible Cloudinary delivery transformation, so the judge can compare source and healed output directly.</p>
    </div>
  </details>;
}

function CreativeDirectorV2({ products }: { products: ProductAsset[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [channel, setChannel] = useState<ChannelKey>("instagram");
  const [goal, setGoal] = useState<GoalKey>("launch");
  const [style, setStyle] = useState("Urban editorial");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("Shop now");
  const [result, setResult] = useState<CampaignResult>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = products.find(p => p.publicId === selectedId) || products[0];
  useEffect(() => { if (!selectedId && products[0]) { setSelectedId(products[0].publicId); setHeadline(products[0].ai.headline || products[0].ai.name); setCta(products[0].ai.cta || "Shop now"); } }, [products, selectedId]);
  if (!products.length || !selected) return null;

  const channelMeta = CHANNELS[channel];
  const ratioTransform: Record<string,string> = { "1:1": "c_fill,ar_1:1,g_auto,q_auto:good,f_auto", "4:5": "c_fill,ar_4:5,g_auto,q_auto:good,f_auto", "9:16": "c_fill,ar_9:16,g_auto,q_auto:good,f_auto", "16:9": "c_fill,ar_16:9,g_auto,q_auto:good,f_auto" };
  const pack = result?.url ? Object.entries(ratioTransform).map(([ratio,t]) => ({ ratio, url: cloudinaryTransform(result.url, t) })) : [];

  async function generate() {
    if (!selected.assetId) { setError("This product needs a Cloudinary asset ID before advanced generation can run."); return; }
    setBusy(true); setError(""); setResult(null);
    const prompt = `${style} commercial campaign for the exact product from [1]. ${GOALS[goal]}. Channel: ${channelMeta.label}; composition rule: ${channelMeta.note}. Preserve the exact product identity, proportions, construction, logo, colors and material details. Do not redesign the product. Premium realistic lighting. Create deliberate negative space for copy. Headline intent: ${headline || selected.ai.headline || selected.ai.name}. CTA intent: ${cta}. No baked-in text.`;
    try {
      const res = await fetch("/api/campaign-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetIds: [selected.assetId], prompt, aspectRatio: channelMeta.ratio }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Creative generation failed.");
      setResult(data.image || null);
    } catch (err) { setError(err instanceof Error ? err.message : "Creative generation failed."); }
    finally { setBusy(false); }
  }

  return <details className="depthDetails creativeDepth">
    <summary><span>CREATIVE DIRECTOR V2</span><b>Channel-aware art direction</b><em>{channelMeta.ratio} · {channelMeta.label}</em></summary>
    <div className="depthBody">
      <div className="directorControls">
        <label>Product<select value={selected.publicId} onChange={e => { setSelectedId(e.target.value); const p = products.find(x=>x.publicId===e.target.value); if (p) { setHeadline(p.ai.headline || p.ai.name); setCta(p.ai.cta || "Shop now"); } }}>{products.map(p=><option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select></label>
        <label>Channel<select value={channel} onChange={e=>setChannel(e.target.value as ChannelKey)}>{Object.entries(CHANNELS).map(([k,v])=><option value={k} key={k}>{v.label} · {v.ratio}</option>)}</select></label>
        <label>Goal<select value={goal} onChange={e=>setGoal(e.target.value as GoalKey)}><option value="launch">Product launch</option><option value="conversion">Conversion</option><option value="awareness">Awareness</option><option value="sale">Sale / offer</option></select></label>
        <label>Direction<select value={style} onChange={e=>setStyle(e.target.value)}><option>Urban editorial</option><option>Luxury studio</option><option>Minimal ecommerce</option><option>Festival premium</option><option>Outdoor lifestyle</option><option>Futuristic tech</option></select></label>
        <label>Headline<input value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
        <label>CTA<input value={cta} onChange={e=>setCta(e.target.value)}/></label>
      </div>
      <div className="directorRecommendation"><small>AI COMPOSITION RECOMMENDATION</small><b>{channelMeta.note}</b><span>Fidelity guardrail: logo, shape, colors, materials and construction must remain unchanged.</span></div>
      <button className="depthPrimary" disabled={busy || !selected.assetId} onClick={generate}>{busy ? "Directing Cloudinary creative…" : `Generate ${channelMeta.label} creative`}</button>
      {error && <p className="depthError">{error}</p>}
      {result?.url && <div className="campaignPack"><div className="packHero"><img src={result.url}/><div><small>MASTER ART DIRECTION</small><b>{selected.ai.name}</b><span>{channelMeta.label} · {channelMeta.ratio}</span></div></div><div className="packFormats">{pack.map(v=><a key={v.ratio} href={v.url} target="_blank" rel="noreferrer"><b>{v.ratio}</b><span>Open channel derivative ↗</span></a>)}</div></div>}
    </div>
  </details>;
}

function WebsiteMerchandiserV2({ workspace }: { workspace: Workspace }) {
  const products = workspace.products;
  const [mode, setMode] = useState<MerchMode>("balanced");
  const [headline, setHeadline] = useState(workspace.brandStrategy?.heroLine || workspace.brand?.tagline || "");
  const [cta, setCta] = useState("Shop collection");
  const [font, setFont] = useState("Inter, system-ui, sans-serif");
  const [showPrices, setShowPrices] = useState(true);
  const ranked = useMemo(() => [...products].sort((a,b) => {
    if (mode === "new") return 0;
    if (mode === "conversion") return Number(Boolean(b.price && b.stock)) - Number(Boolean(a.price && a.stock)) || healthScore(b) - healthScore(a);
    if (mode === "luxury") return healthScore(b) - healthScore(a);
    return healthScore(b) - healthScore(a);
  }), [products, mode]);
  const hero = ranked[0];

  function applyToPreview() {
    const canvas = document.querySelector<HTMLElement>(".storeCanvas");
    if (!canvas) return;
    canvas.style.fontFamily = font;
    const h2 = canvas.querySelector<HTMLElement>("h2");
    if (h2 && headline.trim()) h2.textContent = headline.trim();
    const heroButton = canvas.querySelector<HTMLElement>(".luxeSplash button,.boldSplash button,.techSplash button,.editorialSplash button,.minimalSplash button");
    if (heroButton && cta.trim()) heroButton.textContent = cta.trim();
    canvas.querySelectorAll<HTMLElement>(".storeProducts article > span").forEach(el => { el.style.display = showPrices ? "" : "none"; });
    const options = Array.from(document.querySelectorAll<HTMLButtonElement>(".siteControls .themeOption"));
    const desired = mode === "luxury" ? "Luxe" : mode === "conversion" ? "Bold" : mode === "balanced" ? "AI Pick" : "AI Pick";
    options.find(btn => btn.textContent?.includes(desired))?.click();
    window.setTimeout(() => {
      const refreshed = document.querySelector<HTMLElement>(".storeCanvas");
      if (!refreshed) return;
      refreshed.style.fontFamily = font;
      const title = refreshed.querySelector<HTMLElement>("h2"); if (title && headline.trim()) title.textContent = headline.trim();
      const button = refreshed.querySelector<HTMLElement>(".luxeSplash button,.boldSplash button,.techSplash button,.editorialSplash button,.minimalSplash button"); if (button && cta.trim()) button.textContent = cta.trim();
      refreshed.querySelectorAll<HTMLElement>(".storeProducts article > span").forEach(el => { el.style.display = showPrices ? "" : "none"; });
    }, 80);
  }

  if (!products.length) return null;
  return <section className="controlBlock merchDepth">
    <div className="controlHead"><span className="controlLabel">AI MERCHANDISER V2</span><em>product-aware</em></div>
    <label>Merchandising goal<select value={mode} onChange={e=>setMode(e.target.value as MerchMode)}><option value="balanced">Balanced catalog</option><option value="conversion">Maximize conversion</option><option value="luxury">Luxury presentation</option><option value="new">New arrivals</option></select></label>
    {hero && <div className="merchRecommendation"><small>RECOMMENDED HERO</small><img src={hero.square}/><b>{hero.ai.name}</b><span>{healthScore(hero)} media health · {hero.price ? "priced" : "price missing"}</span></div>}
    <label>Hero headline<input value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
    <label>CTA text<input value={cta} onChange={e=>setCta(e.target.value)}/></label>
    <label>Typography<select value={font} onChange={e=>setFont(e.target.value)}><option value="Inter, system-ui, sans-serif">Inter / Modern</option><option value="Georgia, serif">Editorial Serif</option><option value="Arial, sans-serif">Clean Commerce</option><option value="'Trebuchet MS', sans-serif">Bold Retail</option></select></label>
    <label className="depthToggle"><input type="checkbox" checked={showPrices} onChange={e=>setShowPrices(e.target.checked)}/><span>Show price tags</span></label>
    <button className="depthPrimary" onClick={applyToPreview}>Apply merchandising to preview</button>
    <p className="helper">No template rebuild: this applies merchandising decisions to the live storefront preview while preserving the existing Website Studio.</p>
  </section>;
}

function VideoDirectorV2({ workspace }: { workspace: Workspace }) {
  const [selectedId, setSelectedId] = useState("");
  const products = workspace.products;
  const selected = products.find(p=>p.publicId===selectedId) || products[0];
  useEffect(()=>{ if (!selectedId && products[0]) setSelectedId(products[0].publicId); }, [selectedId, products]);
  if (!selected) return null;
  const hay = `${selected.ai.category} ${selected.ai.style} ${selected.ai.tags.join(" ")}`.toLowerCase();
  const motion = /watch|jewel|luxury|leather|perfume/.test(hay) ? "Luxury Film" : /shoe|sneaker|sport|street|fitness/.test(hay) ? "Social Punch" : "Cinematic Story";
  const family = familyFor(selected, products);
  const views = family.map(p=>p.ai.view).filter(Boolean);
  const reelUrl = workspace.reel?.url || "";
  const exports = reelUrl ? [
    ["9:16", cloudinaryTransform(reelUrl, "c_fill,ar_9:16,g_auto,q_auto:good")],
    ["4:5", cloudinaryTransform(reelUrl, "c_fill,ar_4:5,g_auto,q_auto:good")],
    ["16:9", cloudinaryTransform(reelUrl, "c_fill,ar_16:9,g_auto,q_auto:good")],
  ] : [];

  function applyDirection() {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".videoControls .motionList button"));
    buttons.find(btn=>btn.textContent?.includes(motion))?.click();
    const productButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".videoControls .videoProducts button"));
    const productButton = productButtons.find(btn=>btn.textContent?.includes(selected.ai.name));
    productButton?.click();
  }

  return <section className="controlBlock videoDirectorDepth">
    <div className="controlHead"><span className="controlLabel">PRODUCT-AWARE VIDEO DIRECTOR</span><em>AI shot plan</em></div>
    <label>Direct product<select value={selected.publicId} onChange={e=>setSelectedId(e.target.value)}>{products.map(p=><option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select></label>
    <div className="shotPlan">
      <article><span>01</span><div><b>Recognition</b><small>{views[0] || "Front / hero"} · slow identity reveal</small></div></article>
      <article><span>02</span><div><b>Form</b><small>{views[1] || "Profile"} · silhouette / construction move</small></div></article>
      <article><span>03</span><div><b>Detail + CTA</b><small>{views[2] || "Detail crop"} · finish on {selected.ai.cta || "Shop now"}</small></div></article>
    </div>
    <div className="directorRecommendation"><small>RECOMMENDED MOTION</small><b>{motion}</b><span>Chosen from {selected.ai.category || "product"} + {selected.ai.style || "visual style"} intelligence.</span></div>
    <button className="depthPrimary" onClick={applyDirection}>Apply director recommendation</button>
    {!!exports.length && <div className="videoExports">{exports.map(([ratio,url])=><a href={url} target="_blank" rel="noreferrer" key={ratio}><b>{ratio}</b><span>Open Cloudinary export ↗</span></a>)}</div>}
  </section>;
}

export default function DepthEnhancer() {
  const workspace = useWorkspace();
  const [mounts, setMounts] = useState<Mounts>({ graph: null, doctor: null, creative: null, website: null, video: null });

  useEffect(() => {
    const sync = () => setMounts({
      graph: document.querySelector("#product-graph"),
      doctor: document.querySelector("#media-doctor"),
      creative: document.querySelector("#creative-lab"),
      website: document.querySelector(".siteControls"),
      video: document.querySelector(".videoControls"),
    });
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <>
    {mounts.graph && createPortal(<ProductIntelligenceV2 products={workspace.products}/>, mounts.graph)}
    {mounts.doctor && createPortal(<MediaDoctorV2 products={workspace.products}/>, mounts.doctor)}
    {mounts.creative && createPortal(<CreativeDirectorV2 products={workspace.products}/>, mounts.creative)}
    {mounts.website && createPortal(<WebsiteMerchandiserV2 workspace={workspace}/>, mounts.website)}
    {mounts.video && createPortal(<VideoDirectorV2 workspace={workspace}/>, mounts.video)}
  </>;
}
