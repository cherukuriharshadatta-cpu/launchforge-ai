"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductAsset } from "@/lib/types";

type Workspace = { products: ProductAsset[] };
type Sku = { key:string; label:string; category:string; color:string; items:ProductAsset[]; hero:ProductAsset; views:string[]; missing:string[]; evidence:string[] };
type GenerationResult = { url:string; model?:string; fallback?:boolean; warning?:string } | null;

function readWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem("launchforge_workspace_v75") || "{}") as Partial<Workspace>;
    return { products: Array.isArray(parsed.products) ? parsed.products : [] };
  } catch { return { products: [] }; }
}

function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>({ products: [] });
  useEffect(() => {
    let last = "";
    const sync = () => {
      const raw = localStorage.getItem("launchforge_workspace_v75") || "";
      if (raw !== last) { last = raw; setWorkspace(readWorkspace()); }
    };
    sync();
    const timer = window.setInterval(sync, 600);
    window.addEventListener("storage", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", sync); };
  }, []);
  return workspace;
}

function norm(v?: string) {
  return String(v || "").toLowerCase().replace(/hook[- ]?and[- ]?loop/g,"hook loop").replace(/[^a-z0-9]+/g," ").trim();
}

function familyLabel(p: ProductAsset) {
  const raw = norm(p.ai.productFamily || p.ai.name)
    .replace(/\b(front|rear|back|side|left|right|detail|close up|closeup|angle|view|photo|image)\b/g," ")
    .replace(/\s+/g," ").trim();
  return raw || norm(p.ai.name) || p.publicId;
}

function groupKey(p: ProductAsset) {
  return `${norm(p.ai.category)}::${norm(p.ai.color)}::${familyLabel(p)}`;
}

function viewName(p: ProductAsset) {
  const direct = norm(p.ai.view);
  if (direct && direct !== "unknown") return direct;
  const text = `${norm(p.ai.name)} ${norm(p.ai.description)} ${p.ai.tags.map(norm).join(" ")}`;
  if (/\bfront\b/.test(text)) return "front";
  if (/\b(rear|back)\b/.test(text)) return "rear";
  if (/\b(side|profile|left|right)\b/.test(text)) return "side";
  if (/\b(detail|close up|closeup|macro)\b/.test(text)) return "detail";
  if (/\b(lifestyle|outdoor|model|scene)\b/.test(text)) return "lifestyle";
  return "product view";
}

function heroScore(p: ProductAsset) {
  const view = viewName(p);
  const viewWeight = /three|quarter/.test(view) ? 130 : /side|profile/.test(view) ? 120 : /lifestyle/.test(view) ? 115 : /front/.test(view) ? 100 : /rear|back/.test(view) ? 75 : /detail/.test(view) ? 55 : 85;
  const focus = Math.round((p.focusScore ?? .75) * 20);
  const area = Math.min(15, Math.round(Math.sqrt(Math.max(1,(p.width||1000)*(p.height||1000))) / 150));
  return viewWeight + focus + area;
}

function buildSkus(products: ProductAsset[]): Sku[] {
  const deduped: ProductAsset[] = [];
  const seenEtag = new Set<string>();
  for (const p of products) {
    if (p.etag && seenEtag.has(p.etag)) continue;
    if (p.etag) seenEtag.add(p.etag);
    deduped.push(p);
  }
  const map = new Map<string, ProductAsset[]>();
  for (const p of deduped) {
    const key = groupKey(p);
    map.set(key, [...(map.get(key) || []), p]);
  }
  return Array.from(map.entries()).map(([key,items]) => {
    const hero = [...items].sort((a,b)=>heroScore(b)-heroScore(a))[0];
    const views = Array.from(new Set(items.map(viewName)));
    const coverageText = views.join(" ");
    const missing = [
      ["Detail", /detail|close up|macro/],
      ["Lifestyle", /lifestyle|outdoor|model|scene/],
    ].filter(([,rx])=>!(rx as RegExp).test(coverageText)).map(([name])=>name as string);
    const evidence = [
      items.length > 1 ? `${items.length} media files describe the same product family` : "Single verified source media file",
      hero.ai.color ? `Color evidence agrees: ${hero.ai.color}` : "Color evidence unavailable",
      items.every(x=>Boolean(x.etag)) ? "ETag duplicate checks completed" : "ETag evidence partially available",
      items.some(x=>Boolean(x.phash)) ? "pHash similarity evidence available" : "pHash evidence unavailable",
    ];
    return { key, label:hero.ai.productFamily || hero.ai.name, category:hero.ai.category, color:hero.ai.color, items, hero, views, missing, evidence };
  }).sort((a,b)=>b.items.length-a.items.length);
}

function cloudinary(url:string|undefined, transform:string) {
  if (!url) return "";
  if (url.includes("/image/upload/")) return url.replace("/image/upload/",`/image/upload/${transform}/`);
  return url;
}

function heroUrl(p:ProductAsset) {
  return cloudinary(p.original || p.catalog, "c_fill,g_auto,w_1100,h_760,e_improve,q_auto:good,f_auto");
}
function thumbUrl(p:ProductAsset) {
  return cloudinary(p.original || p.square, "c_fill,g_auto,w_220,h_220,q_auto:good,f_auto");
}
function repairUrl(p:ProductAsset) {
  return cloudinary(p.original || p.catalog, "c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35,q_auto:good,f_auto");
}

function clickOriginalAction(product:ProductAsset, action:"Edit"|"Market") {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".catalogView .productGrid .productCard"));
  const card = cards.find(c => c.querySelector("h3")?.textContent?.trim() === product.ai.name.trim()) || cards[0];
  if (!card) return;
  const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>("button"));
  const target = action === "Edit" ? buttons.find(b=>/edit/i.test(b.textContent||"")) : buttons.find(b=>/market price/i.test(b.textContent||""));
  target?.click();
}

function CatalogSkuView({ skus, showSource, setShowSource }: { skus:Sku[]; showSource:boolean; setShowSource:(v:boolean)=>void }) {
  if (!skus.length) return null;
  return <section className="skuCatalogLayer">
    <div className="skuCatalogHead">
      <div><span>RECONSTRUCTED CATALOG</span><h3>{skus.length} sellable product{skus.length===1?"":"s"}, not {skus.reduce((n,s)=>n+s.items.length,0)} loose media cards.</h3><p>LaunchForge picks the best hero angle for each SKU and keeps alternate views attached to the same product.</p></div>
      <button onClick={()=>setShowSource(!showSource)}>{showSource?"Hide source media":"View source media"}</button>
    </div>
    <div className="skuCatalogGrid">
      {skus.map(sku => <article className="skuCatalogCard" key={sku.key}>
        <div className="skuHeroWrap">
          <img className="skuHeroImage" src={heroUrl(sku.hero)} alt={sku.label}/>
          <span className="skuCount">1 sellable SKU · {sku.items.length} verified view{sku.items.length===1?"":"s"}</span>
          <a href={sku.hero.original} target="_blank" rel="noreferrer">↗</a>
        </div>
        <div className="skuAngleStrip">{sku.items.slice(0,5).map((item,i)=><div key={item.publicId} title={viewName(item)} className={item.publicId===sku.hero.publicId?"heroThumb":""}><img src={thumbUrl(item)}/><small>{viewName(item)}</small>{i===0&&<i/>}</div>)}</div>
        <div className="skuCatalogInfo">
          <span className="skuCategory">{sku.category}</span><h3>{sku.label}</h3><p>{sku.hero.ai.description}</p>
          <div className="skuCoverage"><b>Views</b><span>{sku.views.join(" · ")}</span></div>
          <div className="skuCommerce"><div><b>{sku.hero.price || "No price"}</b><small>{sku.hero.stock ? `${sku.hero.stock} in stock` : "Stock not set"}</small></div><div><button onClick={()=>clickOriginalAction(sku.hero,"Market")}>Market price ↗</button><button onClick={()=>clickOriginalAction(sku.hero,"Edit")}>Edit</button></div></div>
        </div>
      </article>)}
    </div>
  </section>;
}

function SkuReconstructionPanel({ skus }: { skus:Sku[] }) {
  const [selectedKey,setSelectedKey] = useState("");
  const [busy,setBusy] = useState("");
  const [result,setResult] = useState<GenerationResult>(null);
  const [error,setError] = useState("");
  const [galleryOpen,setGalleryOpen] = useState(false);
  const selected = skus.find(s=>s.key===selectedKey) || skus[0];
  useEffect(()=>{ if (!selectedKey && skus[0]) setSelectedKey(skus[0].key); },[selectedKey,skus]);
  if (!selected) return null;

  async function generateMissing(kind:string) {
    if (!selected.hero.assetId) { setError("This demo asset has no Cloudinary asset ID, so generation is unavailable for this SKU."); return; }
    setBusy(kind); setResult(null); setError("");
    try {
      const prompt = `Create a faithful ecommerce ${kind.toLowerCase()} photograph of the exact product from [1]. Preserve identity, shape, proportions, logo, color, materials and construction. No redesign. Clean commercial lighting. No text.`;
      const res = await fetch("/api/campaign-image", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ assetIds:[selected.hero.assetId], prompt, aspectRatio:"1:1", fallbackUrl:selected.hero.original || selected.hero.catalog }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation unavailable.");
      setResult({ ...(data.image || {}), warning:data.warning });
    } catch(err){ setError(err instanceof Error ? err.message : "Generation unavailable."); }
    finally{ setBusy(""); }
  }

  return <section className="skuReconstructionPanel">
    <div className="skuIntelTop"><div><span>SKU RECONSTRUCTION & COVERAGE</span><h3>What LaunchForge actually did</h3><p>This is the decision layer behind the catalog: group source media, choose the strongest hero, preserve alternate angles, identify missing launch media, then recommend the next action.</p></div><select value={selected.key} onChange={e=>{setSelectedKey(e.target.value);setResult(null);setError("")}}>{skus.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
    <div className="skuIntelSummary">
      <div className="skuIntelHero"><img src={heroUrl(selected.hero)}/><span>Chosen hero · {viewName(selected.hero)}</span></div>
      <div className="skuIntelStory">
        <div className="storyEquation"><b>{selected.items.length}</b><span>supplier media</span><i>→</i><b>1</b><span>sellable SKU</span></div>
        <ul>
          <li><b>Grouped:</b> {selected.items.length>1?`${selected.items.length} files belong to the same product family.`:"This SKU currently has one verified source asset."}</li>
          <li><b>Hero choice:</b> {viewName(selected.hero)} view scored highest for product visibility and storefront use.</li>
          <li><b>Coverage:</b> {selected.views.join(", ")}.</li>
          <li><b>Missing:</b> {selected.missing.length?selected.missing.join(" + "):"No critical launch shots detected."}</li>
        </ul>
      </div>
    </div>
    <div className="skuProofActions">
      <div><small>WHY THESE FILES WERE GROUPED</small>{selected.evidence.map(e=><span key={e}>✓ {e}</span>)}</div>
      <div><small>NEXT ACTION</small><b>{selected.missing.length?`Complete ${selected.missing.length} missing launch asset${selected.missing.length===1?"":"s"}`:"SKU coverage is ready"}</b><p>Cloudinary delivery fixes are quota-light. Generative shots are optional and automatically fall back to a transformed product derivative if the add-on quota is exhausted.</p></div>
    </div>
    <div className="skuActionRow">
      <button onClick={()=>setGalleryOpen(true)}>Open {selected.items.length} source view{selected.items.length===1?"":"s"}</button>
      <a href={repairUrl(selected.hero)} target="_blank" rel="noreferrer">Repair hero with transforms ↗</a>
      {selected.missing.map(kind=><button className="primarySkuAction" disabled={!!busy} onClick={()=>generateMissing(kind)} key={kind}>{busy===kind?"Working…":`Generate ${kind}`}</button>)}
    </div>
    {error&&<div className="skuNotice error">{error}</div>}
    {result?.url&&<div className="skuGenerationResult"><img src={result.url}/><div><small>{result.fallback?"QUOTA-SAFE FALLBACK":"AI-GENERATED ASSET"}</small><b>{result.fallback?"Cloudinary transformed the source instead of failing":"New missing-shot asset created"}</b><span>{result.warning || result.model || "Cloudinary"}</span><a href={result.url} target="_blank" rel="noreferrer">Open result ↗</a></div></div>}
    {galleryOpen&&<div className="skuGalleryShade" onMouseDown={e=>{if(e.target===e.currentTarget)setGalleryOpen(false)}}><div className="skuGalleryModal"><header><div><span>VERIFIED SOURCE MEDIA</span><h3>{selected.label}</h3></div><button onClick={()=>setGalleryOpen(false)}>×</button></header><div>{selected.items.map(item=><article key={item.publicId}><img src={heroUrl(item)}/><b>{viewName(item)}</b><small>{item.ai.name}</small></article>)}</div></div></div>}
  </section>;
}

export default function CommerceDepthFix() {
  const { products } = useWorkspace();
  const skus = useMemo(()=>buildSkus(products),[products]);
  const [catalogHost,setCatalogHost] = useState<Element|null>(null);
  const [intelHost,setIntelHost] = useState<Element|null>(null);
  const [showSource,setShowSource] = useState(false);

  useEffect(()=>{
    const sync = () => {
      const grid = document.querySelector<HTMLElement>(".catalogView .productGrid");
      if (grid?.parentElement) {
        let host = grid.parentElement.querySelector<HTMLElement>(".skuCatalogMount");
        if (!host) { host=document.createElement("div"); host.className="skuCatalogMount"; grid.parentElement.insertBefore(host,grid); }
        setCatalogHost(host);
      } else setCatalogHost(null);

      const graph = document.querySelector<HTMLElement>("#product-graph");
      if (graph) {
        let host = graph.querySelector<HTMLElement>(".skuIntelMount");
        if (!host) {
          host=document.createElement("div"); host.className="skuIntelMount";
          const proof=graph.querySelector(".graphProofStrip");
          if (proof?.nextSibling) graph.insertBefore(host,proof.nextSibling); else graph.appendChild(host);
        }
        setIntelHost(host);
      } else setIntelHost(null);
    };
    sync();
    const obs=new MutationObserver(sync); obs.observe(document.body,{childList:true,subtree:true});
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    const grid=document.querySelector<HTMLElement>(".catalogView .productGrid");
    if (grid) grid.style.display = showSource ? "grid" : "none";
  },[showSource,catalogHost,products.length]);

  return <>
    {catalogHost&&createPortal(<CatalogSkuView skus={skus} showSource={showSource} setShowSource={setShowSource}/>,catalogHost)}
    {intelHost&&createPortal(<SkuReconstructionPanel skus={skus}/>,intelHost)}
  </>;
}
