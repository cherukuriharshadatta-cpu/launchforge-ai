"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductAsset } from "@/lib/types";

type Group = { key:string; label:string; items:ProductAsset[]; hero:ProductAsset };

function readProducts(): ProductAsset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("launchforge_workspace_v75") || "{}");
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch { return []; }
}

function useProducts() {
  const [products,setProducts] = useState<ProductAsset[]>([]);
  useEffect(()=>{
    let last="";
    const sync=()=>{const raw=localStorage.getItem("launchforge_workspace_v75")||"";if(raw!==last){last=raw;setProducts(readProducts())}};
    sync();
    const timer=window.setInterval(sync,500);
    window.addEventListener("storage",sync);
    return()=>{window.clearInterval(timer);window.removeEventListener("storage",sync)};
  },[]);
  return products;
}

function norm(v?:string){return String(v||"").toLowerCase().trim()}
function viewName(p:ProductAsset){return p.ai.view?.trim() || "product view"}
function familyKey(p:ProductAsset){return `${norm(p.ai.productFamily||p.ai.name)}::${norm(p.ai.color)}`}
function score(p:ProductAsset){const v=norm(p.ai.view);return /three|quarter|side|left|right/.test(v)?100:/front/.test(v)?90:/back|rear/.test(v)?70:80}
function groups(products:ProductAsset[]):Group[]{
  const map=new Map<string,ProductAsset[]>();
  for(const p of products){const k=familyKey(p);map.set(k,[...(map.get(k)||[]),p])}
  return Array.from(map.entries()).map(([key,items])=>({key,label:items[0].ai.productFamily||items[0].ai.name,items,hero:[...items].sort((a,b)=>score(b)-score(a))[0]})).sort((a,b)=>b.items.length-a.items.length)
}

function transform(url:string, t:string){if(!url||!url.includes("/image/upload/"))return url;return url.replace("/image/upload/",`/image/upload/${t}/`)}
function cleanUrl(p:ProductAsset, step:number){
  if(step===0)return p.original;
  if(step===1)return transform(p.original,"c_fill,g_auto,w_1200,h_1200,q_auto:good,f_auto");
  if(step===2)return transform(p.original,"c_fill,g_auto,w_1200,h_1200,e_improve,q_auto:good,f_auto");
  if(step===3)return transform(p.original,"c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35,q_auto:good,f_auto");
  return transform(p.original,"c_fill,g_auto,w_1200,h_1200,e_improve,e_sharpen:35,q_auto:good,f_auto");
}
function packUrl(p:ProductAsset,w:number,h:number){return transform(p.original,`e_improve,e_sharpen:30,c_fill,g_auto,w_${w},h_${h},q_auto:good,f_auto`)}

const steps=[
  ["Inspect","Source photo"],
  ["Reframe","Focus the product"],
  ["Improve","Balance exposure and clarity"],
  ["Sharpen","Recover edge detail"],
  ["Pack","Optimize for delivery"],
] as const;

function MediaDoctor({products}:{products:ProductAsset[]}){
  const heroes=useMemo(()=>groups(products).map(g=>g.hero),[products]);
  const [id,setId]=useState("");
  const [step,setStep]=useState(0);
  const [running,setRunning]=useState(false);
  const selected=heroes.find(p=>p.publicId===id)||heroes[0];
  useEffect(()=>{if(!id&&heroes[0])setId(heroes[0].publicId)},[id,heroes]);
  if(!selected)return null;
  async function run(){if(running)return;setRunning(true);for(let i=0;i<steps.length;i++){setStep(i);await new Promise(r=>setTimeout(r,i?550:250))}setRunning(false)}
  const result=cleanUrl(selected,step);
  const outputs=[["1:1",800,800],["4:5",800,1000],["9:16",720,1280],["16:9",1280,720]] as const;
  return <section className="demoDoctorStudio">
    <div className="doctorHeader"><div><span>MEDIA DOCTOR</span><h3>Fix the photo, then ship the formats.</h3></div><div><select value={selected.publicId} onChange={e=>{setId(e.target.value);setStep(0)}}>{heroes.map(p=><option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select><button onClick={run} disabled={running}>{running?"Fixing…":"Auto-fix photo"}</button></div></div>
    <div className="doctorSteps">{steps.map((s,i)=><button key={s[0]} className={`${i===step?"active":""} ${i<step?"done":""}`} onClick={()=>setStep(i)}><span>{i<step?"✓":i+1}</span><b>{s[0]}</b><small>{s[1]}</small></button>)}</div>
    <div className="doctorMain">
      <div className="beforeAfter"><article><small>ORIGINAL</small><div><img src={selected.original} alt="Original"/></div></article><i>→</i><article><small>{steps[step][0].toUpperCase()}</small><div><img src={result} alt="Fixed"/></div></article></div>
      <aside className="doctorSide"><div><small>WORKING ON</small><b>{selected.ai.name}</b><span>{viewName(selected)}</span></div><div className="applied"><small>APPLIED</small>{steps.slice(0,step+1).map(s=><span key={s[0]}>✓ {s[0]}</span>)}</div><div className="quotaSafe"><b>Cloudinary transforms only</b><span>No AI Image Generation quota used.</span></div><a href={result} target="_blank" rel="noreferrer">Open current result ↗</a></aside>
    </div>
    <div className="channelPack"><div><span>CHANNEL PACK</span><b>Ready-to-ship channel sizes.</b></div>{outputs.map(([label,w,h])=><a href={packUrl(selected,w,h)} target="_blank" rel="noreferrer" key={label}><div><img src={packUrl(selected,w,h)} alt=""/></div><span>{label}</span></a>)}</div>
  </section>
}

function repairEncoding(root:ParentNode=document){
  const pairs:[[string,string]]|any=[
    ["â†’","→"],["â†—","↗"],["â€¦","…"],["Â·","·"],["âœ“","✓"],["â€”","—"],["â‚¹","₹"],["â–¶","▶"],["â€™","’"],["Ã—","×"]
  ];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n;while((n=walker.nextNode())){let t=n.textContent||"";for(const [a,b] of pairs)t=t.split(a).join(b);if(t!==n.textContent)n.textContent=t}
  document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>("input[placeholder],textarea[placeholder]").forEach(el=>{let t=el.placeholder;for(const [a,b] of pairs)t=t.split(a).join(b);el.placeholder=t})
}

function cleanCatalogDuplicates() {
  const seen=new Set<string>();
  document.querySelectorAll<HTMLElement>(".catalogView .productCard").forEach(card=>{
    const name=(card.querySelector("h3")?.textContent||"").trim().toLowerCase();
    if(!name)return;
    if(seen.has(name)) card.style.display="none";
    else { seen.add(name); card.style.display=""; }
  });
}

export default function DemoMatchExperience(){
  const products=useProducts();
  const [doctorHost,setDoctorHost]=useState<Element|null>(null);
  useEffect(()=>{
    document.body.classList.add("demoMatchActive");
    const sync=()=>{
      repairEncoding();
      cleanCatalogDuplicates();
      const doctor=document.querySelector<HTMLElement>("#media-doctor");
      if(doctor){let m=doctor.querySelector<HTMLElement>(".demoDoctorMount");if(!m){m=document.createElement("div");m.className="demoDoctorMount";doctor.appendChild(m)}setDoctorHost(m)}
    };
    sync();
    const ob=new MutationObserver(sync);
    ob.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>{ob.disconnect();document.body.classList.remove("demoMatchActive")};
  },[products]);
  return <>{doctorHost&&createPortal(<MediaDoctor products={products}/>,doctorHost)}</>
}
