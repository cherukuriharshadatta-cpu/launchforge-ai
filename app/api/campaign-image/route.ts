import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) return NextResponse.json({ error:"Cloudinary credentials are missing." }, { status:500 });
    const assetIds = (Array.isArray(body.assetIds) ? body.assetIds : []).filter(Boolean).slice(0,4);
    if (!assetIds.length) return NextResponse.json({ error:"Choose at least one product reference." }, { status:400 });
    const prompt = String(body.prompt || "Premium commercial campaign photograph using the exact product from [1], clean art direction, realistic lighting, preserve product identity.").slice(0,1800);
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const res = await fetch(`https://api.cloudinary.com/v2/generate/${cloud}/image_to_image`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Basic ${auth}` },
      body: JSON.stringify({
        prompt,
        reference_images: assetIds.map((asset_id:string)=>({ source_type:"managed_asset", asset_id })),
        model:{ mode:"auto", preference:"quality" },
        image_size:{ aspect_ratio:String(body.aspectRatio || "16:9"), resolution:"1K" },
        format:"png",
        target:{ target_type:"managed_asset", public_id:`launchforge/campaigns/campaign_${Date.now()}` }
      })
    });
    const text = await res.text(); let data:any={}; try{data=JSON.parse(text)}catch{}
    if (!res.ok) throw new Error(data?.error?.message || data?.message || text.slice(0,250) || `HTTP ${res.status}`);
    const asset = data?.data?.assets?.[0] || data?.assets?.[0] || {};
    const storage = asset.storage || asset;
    const url = storage.secure_url || asset.secure_url;
    if (!url) throw new Error("Image Generation completed without a media URL.");
    return NextResponse.json({ image:{ url, assetId:storage.asset_id || asset.asset_id, publicId:storage.public_id || asset.public_id, model:asset.model?.id || "auto" } });
  } catch (error:any) {
    const msg = error?.message || "Campaign image generation failed.";
    const friendly = /addon|subscription|entitle|403/i.test(msg) ? `Cloudinary Image Generation add-on is not enabled yet. ${msg}` : msg;
    console.error(error); return NextResponse.json({ error:friendly }, { status:500 });
  }
}
