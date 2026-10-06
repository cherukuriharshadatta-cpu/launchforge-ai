"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductAsset } from "@/lib/types";

type Workspace = { products: ProductAsset[] };
type Sku = { key:string; label:string; items:ProductAsset[]; hero:ProductAsset; views:string[]; missing:string[] };
type Step = { id:string; label:string; short:string; transform:string; note:string };

const STEPS: Step[] = [
  { id:"inspect", label:"Inspect", short:"Source", transform:"", note:"Read source quality, dimensions and framing." },
  { id:"reframe", label:"Reframe", short:"g_auto", transform:"c_fill,g_auto,w_1200,h_1200", note:"Center the product automatically for commerce." },
  { id:"improve", label:"Improve", short:"e_improve", transform:"c_fill,g_auto,w_1200,h_1200,e_improve", note:"Balance the source without generative editing." },
  { id:"sharpen", label:"Sharpen", short:"e_sharpen", transform:"c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35", note:"Add controlled clarity to soft catalog media." },
  { id:"optimize", label:"Optimize", short:"q_auto", transform:"c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35,q_auto:good,f_auto", note:"Ship an efficient browser-ready derivative." },
  { id:"verify", label:"Verify", short:"Ready", transform:"c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35,q_auto:good,f_auto", note:"Compare source and final output before launch." },
];

function readWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem("launchforge_workspace_v75") || "{}") as Partial<Workspace>;
    return { products:Array.isArray(parsed.products) ? parsed.products : [] };
  } catch { return { products:[] }; }
}

function useWorkspace() {
  const [workspace,setWorkspace] = useState<Workspace>({products:[]});
  useEffect(()=>{
    let last="";
    const sync=()=>{ const raw=localStorage.getItem("launchforge_workspace_v75")||""; if(raw!==last){last=raw;setWorkspace(readWorkspace());} };
    sync();
    const timer=window.setInterval(sync,600);
    window.addEventListener("storage",sync);
    return()=>{window.clearInterval(timer);window.removeEventListener("storage",sync)};
  },[]);
  return workspace;
}

function norm(v?:string){return String(v||"").toLowerCase().replace(/hook[- ]?and[- ]?loop/g,"hook loop").replace(/[^a-z0-9]+/g," ").trim()}
function familyLabel(p:ProductAsset){return norm(p.ai.productFamily||p.ai.name).replace(/\b(front|rear|back|side|left|right|detail|close up|closeup|angle|view|photo|image)\b/g," ").replace(/\s+/g," ").trim()||norm(p.ai.name)||p.publicId}
function groupKey(p:ProductAsset){return `${norm(p.ai.category)}::${norm(p.ai.color)}::${familyLabel(p)}`}
function viewName(p:ProductAsset){
  const direct=norm(p.ai.view); if(direct&&direct!=="unknown")return direct;
  const text=`${norm(p.ai.name)} ${norm(p.ai.description)} ${p.ai.tags.map(norm).join(" ")}`;
  if(/\bfront\b/.test(text))return"front"; if(/\b(rear|back)\b/.test(text))return"rear"; if(/\b(side|profile|left|right)\b/.test(text))return"side"; if(/\b(detail|close up|closeup|macro)\b/.test(text))return"detail"; if(/\b(lifestyle|outdoor|model|scene)\b/.test(text))return"lifestyle"; return"product view";
}
function heroScore(p:ProductAsset){const v=viewName(p);const w=/three|quarter/.test(v)?130:/side|profile/.test(v)?120:/lifestyle/.test(v)?115:/front/.test(v)?100:/rear|back/.test(v)?75:/detail/.test(v)?55:85;return w+Math.round((p.focusScore??.75)*20)}
function buildSkus(products:ProductAsset[]):Sku[]{
  const deduped:ProductAsset[]=[];const etags=new Set<string>();
  for(const p of products){if(p.etag&&etags.has(p.etag))continue;if(p.etag)etags.add(p.etag);deduped.push(p)}
  const map=new Map<string,ProductAsset[]>();
  for(const p of deduped){const k=groupKey(p);map.set(k,[...(map.get(k)||[]),p])}
  return Array.from(map.entries()).map(([key,items])=>{const hero=[...items].sort((a,b)=>heroScore(b)-heroScore(a))[0];const views=Array.from(new Set(items.map(viewName)));const coverage=views.join(" ");const missing=[["Detail",/detail|close up|macro/],["Lifestyle",/lifestyle|outdoor|model|scene/]].filter(([,rx])=>!(rx as RegExp).test(coverage)).map(([x])=>x as string);return{key,label:hero.ai.productFamily||hero.ai.name,items,hero,views,missing}}).sort((a,b)=>b.items.length-a.items.length)
}
function cloudinary(url:string|undefined,transform:string){if(!url)return"";if(!transform)return url;if(url.includes("/image/upload/"))return url.replace("/image/upload/",`/image/upload/${transform}/`);return url}
function sourceUrl(p:ProductAsset){return p.original||p.catalog||p.square}
function squareUrl(p:ProductAsset){return cloudinary(sourceUrl(p),"c_fill,g_auto,w_700,h_700,q_auto:good,f_auto")}
function stepUrl(p:ProductAsset,step:number,ratio="1:1"){
  if(step<=0)return sourceUrl(p);
  const dims=ratio==="4:5"?"w_1080,h_1350":ratio==="9:16"?"w_1080,h_1920":ratio==="16:9"?"w_1600,h_900":"w_1200,h_1200";
  const base=STEPS[Math.min(step,STEPS.length-1)].transform.replace("w_1200,h_1200",dims);
  return cloudinary(sourceUrl(p),base)
}

function ReconstructionBoard({skus}:{skus:Sku[]}){
  const [selectedKey,setSelectedKey]=useState("");
  const sku=skus.find(s=>s.key===selectedKey)||skus[0];
  useEffect(()=>{if(!selectedKey&&skus[0])setSelectedKey(skus[0].key)},[selectedKey,skus]);
  if(!sku)return null;
  return <section className="visualIntelBoard">
    <div className="visualIntelBar"><div><span>LIVE RECONSTRUCTION</span><h3>Watch raw media become one product.</h3></div><select value={sku.key} onChange={e=>setSelectedKey(e.target.value)}>{skus.map(s=><option value={s.key} key={s.key}>{s.label}</option>)}</select></div>
    <div className="reconstructionStage">
      <div className="rawMediaColumn">
        <small>RAW MEDIA</small>
        <div className="rawMediaStack">{sku.items.slice(0,4).map((p,i)=><article key={p.publicId} style={{transform:`translateX(${i%2?10:0}px)`}}><img src={squareUrl(p)} alt=""/><span>{viewName(p)}</span></article>)}</div>
      </div>
      <div className="mergeZone">
        <div className="mergeLines"><i/><i/><i/></div>
        <div className="mergeCore"><span>{sku.items.length}</span><b>media</b><em>→</em><span>1</span><b>SKU</b></div>
        <div className="mergeBadges"><span>ETag</span><span>pHash</span><span>AI identity</span></div>
      </div>
      <div className="reconstructedSkuCard">
        <small>RECONSTRUCTED SKU</small>
        <img src={squareUrl(sku.hero)} alt={sku.label}/>
        <h4>{sku.label}</h4>
        <div className="viewDots">{sku.views.map(v=><span key={v}>✓ {v}</span>)}</div>
        <div className="missingSlots">{sku.missing.length?sku.missing.map(m=><button key={m} onClick={()=>document.getElementById("media-doctor")?.scrollIntoView({behavior:"smooth"})}>+ {m}</button>):<span className="allCovered">Coverage ready</span>}</div>
      </div>
    </div>
    <div className="intelActionStrip">
      <article><b>{sku.items.length}</b><span>source files merged</span></article>
      <article><b>{sku.views.length}</b><span>views retained</span></article>
      <article><b>{sku.missing.length}</b><span>launch gaps</span></article>
      <button onClick={()=>document.getElementById("media-doctor")?.scrollIntoView({behavior:"smooth"})}>Repair media →</button>
    </div>
  </section>
}

function MediaDoctorStudio({products}:{products:ProductAsset[]}){
  const [selectedId,setSelectedId]=useState("");
  const [active,setActive]=useState(0);
  const [running,setRunning]=useState(false);
  const [compare,setCompare]=useState(58);
  const [ratio,setRatio]=useState("1:1");
  const selected=products.find(p=>p.publicId===selectedId)||products[0];
  useEffect(()=>{if(!selectedId&&products[0])setSelectedId(products[0].publicId)},[selectedId,products]);
  if(!selected)return null;

  const focus=Math.round((selected.focusScore??.75)*100);
  const minDim=Math.min(selected.width||1200,selected.height||1200);
  const issue=focus<28?"Soft / weak source detail":minDim<420?"Low source resolution":focus<48?"Needs clarity + framing":"Delivery cleanup recommended";
  const after=stepUrl(selected,active,ratio);
  const final=stepUrl(selected,STEPS.length-1,ratio);

  async function run(){
    if(running)return;setRunning(true);setActive(0);
    for(let i=0;i<STEPS.length;i++){setActive(i);await new Promise(r=>setTimeout(r,i===0?450:700))}
    setRunning(false);
  }

  return <section className="visualDoctorStudio">
    <div className="doctorTopbar"><div><span>MEDIA DOCTOR</span><h3>Repair one asset, step by step.</h3></div><div className="doctorSelectors"><select value={selected.publicId} onChange={e=>{setSelectedId(e.target.value);setActive(0)}}>{products.map(p=><option key={p.publicId} value={p.publicId}>{p.ai.name}</option>)}</select><button onClick={run} disabled={running}>{running?"Repairing…":"Run repair pipeline"}</button></div></div>

    <div className="doctorRail">
      {STEPS.map((s,i)=><button key={s.id} className={`${i<active?"done":""} ${i===active?"active":""}`} onClick={()=>setActive(i)}><span>{i<active?"✓":i+1}</span><b>{s.label}</b><small>{s.short}</small></button>)}
      <div className="doctorRailLine"><i style={{width:`${(active/(STEPS.length-1))*100}%`}}/></div>
    </div>

    <div className="doctorWorkspace">
      <div className="doctorCompare">
        <div className="compareCanvas ratioSquare" data-ratio={ratio}>
          <img className="compareSource" src={sourceUrl(selected)} alt="Source"/>
          {active>0&&<div className="compareResult" style={{clipPath:`inset(0 ${100-compare}% 0 0)`}}><img src={after} alt="Processed"/></div>}
          {active>0&&<div className="compareDivider" style={{left:`${compare}%`}}><i/></div>}
          <span className="beforeLabel">BEFORE</span><span className="afterLabel">{active===0?"SOURCE":STEPS[active].label.toUpperCase()}</span>
        </div>
        <input aria-label="Before after comparison" type="range" min="5" max="95" value={compare} onChange={e=>setCompare(Number(e.target.value))}/>
      </div>

      <aside className="doctorInspector">
        <div className="caughtIssue"><small>CAUGHT</small><b>{issue}</b><span>{selected.width||"?"}×{selected.height||"?"} · focus signal {focus}%</span></div>
        <div className="activeRecipe"><small>NOW RUNNING</small><b>{STEPS[active].label}</b><p>{STEPS[active].note}</p><code>{STEPS[active].transform||"source asset"}</code></div>
        <div className="ratioButtons"><small>OUTPUT</small>{["1:1","4:5","9:16","16:9"].map(r=><button className={ratio===r?"active":""} onClick={()=>setRatio(r)} key={r}>{r}</button>)}</div>
        <div className="quotaBadge"><b>0 generative calls</b><span>This repair path uses Cloudinary delivery transformations only.</span></div>
        <a className="finalDerivative" href={final} target="_blank" rel="noreferrer">Open final derivative ↗</a>
      </aside>
    </div>

    <div className="doctorOutputs">
      {["1:1","4:5","9:16","16:9"].map(r=><a href={stepUrl(selected,STEPS.length-1,r)} target="_blank" rel="noreferrer" key={r}><img src={stepUrl(selected,STEPS.length-1,r)}/><span>{r}</span></a>)}
    </div>
  </section>
}

export default function JudgeVisualStudio(){
  const {products}=useWorkspace();
  const skus=useMemo(()=>buildSkus(products),[products]);
  const [intelHost,setIntelHost]=useState<Element|null>(null);
  const [doctorHost,setDoctorHost]=useState<Element|null>(null);

  useEffect(()=>{
    const sync=()=>{
      const graph=document.querySelector<HTMLElement>("#product-graph");
      if(graph){let host=graph.querySelector<HTMLElement>(".visualIntelMount");if(!host){host=document.createElement("div");host.className="visualIntelMount";const head=graph.querySelector(".intelHead");if(head?.nextSibling)graph.insertBefore(host,head.nextSibling);else graph.appendChild(host)}setIntelHost(host)}else setIntelHost(null);
      const doctor=document.querySelector<HTMLElement>("#media-doctor");
      if(doctor){let host=doctor.querySelector<HTMLElement>(".visualDoctorMount");if(!host){host=document.createElement("div");host.className="visualDoctorMount";const head=doctor.querySelector(".intelHead");if(head?.nextSibling)doctor.insertBefore(host,head.nextSibling);else doctor.appendChild(host)}setDoctorHost(host)}else setDoctorHost(null);
    };
    sync();const ob=new MutationObserver(sync);ob.observe(document.body,{childList:true,subtree:true});return()=>ob.disconnect();
  },[]);

  return <>{intelHost&&createPortal(<ReconstructionBoard skus={skus}/>,intelHost)}{doctorHost&&createPortal(<MediaDoctorStudio products={products}/>,doctorHost)}</>;
}
