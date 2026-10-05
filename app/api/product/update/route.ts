import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { ensureCommerceMetadata, livingCreativeUrl } from "@/lib/commerceMetadata";

export const runtime = "nodejs";

function clean(v: unknown, max = 900) { return String(v ?? "").replace(/[|=]/g, " ").slice(0, max); }
function cleanTag(v: string) { return v.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0,80); }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publicId = String(body.publicId || "");
    if (!publicId) return NextResponse.json({ error: "Missing publicId." }, { status: 400 });
    const stockNumber = Math.max(0, Number.parseInt(String(body.stock || "0"), 10) || 0);
    await ensureCommerceMetadata();
    await cloudinary.uploader.update_metadata({
      ss_name: clean(body.name, 300),
      ss_price: clean(body.price, 120),
      ss_stock: stockNumber,
      ss_description: clean(body.description, 1500),
    } as any, [publicId], { resource_type: "image", clear_invalid: true });
    const context = [
      `product_name=${clean(body.name,300)}`,
      `category=${clean(body.category,200)}`,
      `color=${clean(body.color,120)}`,
      `material=${clean(body.material,120)}`,
      `style=${clean(body.style,120)}`,
      `description=${clean(body.description,900)}`,
      `price=${clean(body.price,120)}`,
      `stock=${stockNumber}`,
    ].join("|");
    await cloudinary.uploader.add_context(context, [publicId], { resource_type:"image" });
    const tags = Array.from(new Set(["launchforge","inventory", cleanTag(String(body.category||"")), ...(Array.isArray(body.tags)?body.tags:[]).map((x:any)=>cleanTag(String(x))).filter(Boolean)]));
    await cloudinary.uploader.add_tag(tags.join(","), [publicId], { resource_type:"image" });
    return NextResponse.json({ ok:true, livingCreative: livingCreativeUrl(publicId), stock: stockNumber });
  } catch (error:any) {
    const msg = error?.error?.message || error?.message || "Could not update product metadata.";
    console.error(error);
    return NextResponse.json({ error: msg }, { status:500 });
  }
}

