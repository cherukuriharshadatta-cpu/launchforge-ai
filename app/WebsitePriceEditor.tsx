"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductAsset } from "@/lib/types";

type Workspace = { products?: ProductAsset[] };

export default function WebsitePriceEditor() {
  const [mount, setMount] = useState<Element | null>(null);
  const [products, setProducts] = useState<ProductAsset[]>([]);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    const sync = () => {
      setMount(document.querySelector(".merchDepth"));
      try {
        const ws = JSON.parse(localStorage.getItem("launchforge_workspace_v75") || "{}") as Workspace;
        const list = Array.isArray(ws.products) ? ws.products : [];
        setProducts(list);
        if (!productId && list[0]) {
          setProductId(list[0].publicId);
          setPrice(list[0].price || "");
        }
      } catch {}
    };
    sync();
    const timer = window.setInterval(sync, 900);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.clearInterval(timer); observer.disconnect(); };
  }, [productId]);

  if (!mount || !products.length) return null;
  const selected = products.find(p => p.publicId === productId) || products[0];

  function choose(id: string) {
    const p = products.find(x => x.publicId === id);
    setProductId(id);
    setPrice(p?.price || "");
  }

  function applyPrice() {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".storeProducts article"));
    const card = cards.find(el => el.querySelector("b")?.textContent?.trim() === selected.ai.name.trim());
    const priceNode = card?.querySelector<HTMLElement>(":scope > span");
    if (priceNode) priceNode.textContent = price.trim() || "Add price";
  }

  return createPortal(<div className="priceDepthInline">
    <span className="controlLabel">LIVE PRODUCT CARD</span>
    <label>Product<select value={selected.publicId} onChange={e=>choose(e.target.value)}>{products.map(p=><option value={p.publicId} key={p.publicId}>{p.ai.name}</option>)}</select></label>
    <label>Price tag<input value={price} onChange={e=>setPrice(e.target.value)} placeholder="₹2,499"/></label>
    <button type="button" onClick={applyPrice}>Apply price to preview</button>
    <small>Preview-only merchandising control. Catalog remains the source of truth until you save inventory there.</small>
  </div>, mount);
}
