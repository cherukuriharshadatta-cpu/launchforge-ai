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
  if(step===1)return transform(p.original,"c_pad,w_1200,h_1200,b_auto:border,g_center");
  if(step===2)return transform(p.original,"e_improve,c_pad,w_1200,h_1200,b_auto:border,g_center");
  if(step===3)return transform(p.original,"e_improve,e_sharpen:35,c_pad,w_1200,h_1200,b_auto:border,g_center");
  return transform(p.original,"e_improve,e_sharpen:35,c_pad,w_1200,h_1200,b_auto:border,g_center,q_auto:good,f_auto");
}
function packUrl(p:ProductAsset,w:number,h:number){return transform(p.original,`e_improve,e_sharpen:30,c_pad,w_${w},h_${h},b_auto:border,g_center,q_auto:good,f_auto`)}

function ProductReconstruction({products}:{products:ProductAsset[]}){
  const data=useMemo(()=>groups(products),[products]);
  const [key,setKey]=useState("");
  const g=data.find(x=>x.key===key)||data[0];
  useEffect(()=>{if(!key&&data[0])setKey(data[0].key)},[key,data]);
  if(!g)return null;
  return <section className="demoGraphStudio">
    <div className="demoGraphTop">
      <div><span>PRODUCT RECONSTRUCTION</span><h3>See the folder become a product.</h3></div>
      <div className="familyTabs">{data.map(x=><button key={x.key} className={x.key===g.key?"active":""} onClick={()=>setKey(x.key)}>{x.items.length>1?`${x.items.length} views`:"1 view"} · {x.items[0].ai.category}</button>)}</div>
    </div>
    <div className="reconStage">
      <aside className="rawRail"><small>RAW MEDIA</small>{g.items.map(p=><article key={p.publicId}><div><img src={p.original} alt=""/></div><b>{viewName(p)}</b></article>)}</aside>
      <div className="reconCenter">
        <div className="scanLine"/>
        <div className="reconNode"><b>{g.items.length}</b><span>source media</span><i>→</i><b>1</b><span>SKU</span></div>
        <div className="proofChips"><span>AI identity</span><span>pHash</span><span>ETag</span></div>
      </div>
      <article className="recoveredCard"><small>RECOVERED PRODUCT</small><div className="recoveredHero"><img src={g.hero.original} alt={g.label}/></div><h4>{g.items[0].ai.name}</h4><div className="viewStrip">{g.items.map(p=><div key={p.publicId}><img src={p.original} alt=""/><span>{viewName(p)}</span></div>)}</div></article>
    </div>
    <div className="reconFooter"><span><b>{g.items.length}</b> source files</span><span><b>{g.items.length}</b> verified views</span><span><b>1</b> sellable SKU</span></div>
  </section>
}

const steps=[
  ["Inspect","Source photo"],
  ["Reframe","Keep the full product visible"],
  ["Improve","Balance exposure and clarity"],
  ["Sharpen","Recover edge detail"],
  ["Pack","Optimize for delivery"],
] as const;

function MediaDoctor({products}:{products:ProductAsset[]}){
  const [id,setId]=useState("");
  const [step,setStep]=useState(0);
  const [running,setRunning]=useState(false);
  const selected=products.find(p=>p.publicId===id)||products[0];
  useEffect(()=>{if(!id&&products[0])setId(products[0].publicId)},[id,products]);
  if(!selected)return null;
  async function run(){if(running)return;setRunning(true);for(let i=0;i<steps.length;i++){setStep(i);await new Promise(r=>setTimeout(r,i?550:250))}setRunning(false)}
  const result=cleanUrl(selected,step);
  const outputs=[["1:1",800,800],["4:5",800,1000],["9:16",720,1280],["16:9",1280,720]] as const;
  return <section className="demoDoctorStudio">
    <div className="doctorHeader"><div><span>MEDIA DOCTOR</span><h3>Fix the photo, then ship the formats.</h3></div><div><select value={selected.publicId} onChange={e=>{setId(e.target.value);setStep(0)}}>{products.map(p=><option value={p.publicId} key={p.publicId}>{p.ai.name} · {viewName(p)}</option>)}</select><button onClick={run} disabled={running}>{running?"Fixing…":"Auto-fix photo"}</button></div></div>
    <div className="doctorSteps">{steps.map((s,i)=><button key={s[0]} className={`${i===step?"active":""} ${i<step?"done":""}`} onClick={()=>setStep(i)}><span>{i<step?"✓":i+1}</span><b>{s[0]}</b><small>{s[1]}</small></button>)}</div>
    <div className="doctorMain">
      <div className="beforeAfter"><article><small>ORIGINAL</small><div><img src={selected.original} alt="Original"/></div></article><i>→</i><article><small>{steps[step][0].toUpperCase()}</small><div><img src={result} alt="Fixed"/></div></article></div>
      <aside className="doctorSide"><div><small>WORKING ON</small><b>{selected.ai.name}</b><span>{viewName(selected)}</span></div><div className="applied"><small>APPLIED</small>{steps.slice(0,step+1).map(s=><span key={s[0]}>✓ {s[0]}</span>)}</div><div className="quotaSafe"><b>Cloudinary transforms only</b><span>No AI Image Generation quota used.</span></div><a href={result} target="_blank" rel="noreferrer">Open current result ↗</a></aside>
    </div>
    <div className="channelPack"><div><span>CHANNEL PACK</span><b>Full product preserved in every format.</b></div>{outputs.map(([label,w,h])=><a href={packUrl(selected,w,h)} target="_blank" rel="noreferrer" key={label}><div><img src={packUrl(selected,w,h)} alt=""/></div><span>{label}</span></a>)}</div>
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

export default function DemoMatchExperience(){
  const products=useProducts();
  const [graphHost,setGraphHost]=useState<Element|null>(null);
  const [doctorHost,setDoctorHost]=useState<Element|null>(null);
  useEffect(()=>{
    document.body.classList.add("demoMatchActive");
    const sync=()=>{
      repairEncoding();
      document.querySelectorAll<HTMLElement>(".catalogView .productCard").forEach(card=>{const name=card.querySelector("h3")?.textContent?.trim();const p=products.find(x=>x.ai.name===name);const img=card.querySelector<HTMLImageElement>(".productImage img");if(p&&img&&img.src!==p.original)img.src=p.original});
      const graph=document.querySelector<HTMLElement>("#product-graph");
      if(graph){let m=graph.querySelector<HTMLElement>(".demoGraphMount");if(!m){m=document.createElement("div");m.className="demoGraphMount";graph.appendChild(m)}setGraphHost(m)}
      const doctor=document.querySelector<HTMLElement>("#media-doctor");
      if(doctor){let m=doctor.querySelector<HTMLElement>(".demoDoctorMount");if(!m){m=document.createElement("div");m.className="demoDoctorMount";doctor.appendChild(m)}setDoctorHost(m)}
    };
    sync();const ob=new MutationObserver(sync);ob.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>{ob.disconnect();document.body.classList.remove("demoMatchActive")};
  },[products]);
  return <>{graphHost&&createPortal(<ProductReconstruction products={products}/>,graphHost)}{doctorHost&&createPortal(<MediaDoctor products={products}/>,doctorHost)}</>
}
