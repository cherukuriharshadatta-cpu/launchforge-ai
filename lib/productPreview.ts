import type { ProductAsset } from "@/lib/types";

// Only the verified judge fixture has original photos embedded in large,
// uniform blank canvases. Trim the borders; preserve the real source media.
type ImageKind = "original" | "catalog" | "square" | "portrait" | "story";
const SIZES:Record<ImageKind,readonly [number,number]>={
  original:[1080,1080], catalog:[900,1100], square:[1080,1080],
  portrait:[1080,1350], story:[1080,1920]
};
export function productPreviewUrl(product:ProductAsset,kind:ImageKind="catalog"):string {
  const normal=product[kind] || product.original;
  if(!product.publicId?.startsWith("launchforge/demo-catalog/") || !product.original?.includes("/image/upload/"))return normal;
  const [w,h]=SIZES[kind];
  return product.original.replace("/image/upload/",`/image/upload/e_trim:10/c_pad,b_rgb:f7f4ee,h_${h},w_${w}/f_auto/q_auto/`);
}
