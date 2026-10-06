"use client";

import { useEffect } from "react";

function originalCloudinaryUrl(src: string) {
  const marker = "/image/upload/";
  const markerIndex = src.indexOf(marker);
  if (markerIndex === -1) return src;

  const before = src.slice(0, markerIndex + marker.length);
  const after = src.slice(markerIndex + marker.length);
  const inventoryIndex = after.indexOf("launchforge/inventory/");

  if (inventoryIndex !== -1) {
    return `${before}f_auto,q_auto/${after.slice(inventoryIndex)}`;
  }

  const versionMatch = after.match(/(?:^|\/)(v\d+\/.+)$/);
  if (versionMatch?.[1]) {
    return `${before}f_auto,q_auto/${versionMatch[1]}`;
  }

  return src;
}

function repairCatalogImages() {
  document
    .querySelectorAll<HTMLImageElement>(".catalogView .productImage > img")
    .forEach((img) => {
      const fixed = originalCloudinaryUrl(img.getAttribute("src") || img.src);
      if (fixed && fixed !== img.getAttribute("src")) img.src = fixed;
      img.style.objectFit = "cover";
      img.style.objectPosition = "center center";
    });
}

export default function CatalogImageFix() {
  useEffect(() => {
    repairCatalogImages();
    const observer = new MutationObserver(() => repairCatalogImages());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
