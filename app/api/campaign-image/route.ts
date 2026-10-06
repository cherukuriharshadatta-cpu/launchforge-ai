import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

let generationUnavailableUntil = 0;

function transformFallback(url: string, ratio: string) {
  if (!url.includes("/image/upload/")) return url;
  const safeRatio = /^(1:1|4:5|9:16|16:9|3:4|4:3)$/.test(ratio) ? ratio : "1:1";
  const transform = `c_fill,ar_${safeRatio},g_auto,e_improve,e_sharpen:35,q_auto:good,f_auto`;
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

async function resolveAssetUrl(cloud: string, auth: string, assetId: string) {
  try {
    const byId = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/by_asset_ids?asset_ids[]=${encodeURIComponent(assetId)}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });
    if (byId.ok) {
      const data = await byId.json();
      const resource = data?.resources?.[0];
      if (resource?.secure_url) return String(resource.secure_url);
    }
  } catch {}

  try {
    const search = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ expression: `asset_id=${assetId}`, max_results: 1 }),
      cache: "no-store",
    });
    if (search.ok) {
      const data = await search.json();
      const resource = data?.resources?.[0];
      if (resource?.secure_url) return String(resource.secure_url);
    }
  } catch {}

  return "";
}

async function cachedAsset(cloud:string, auth:string, publicId:string) {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(publicId)}`, {
      headers:{ Authorization:`Basic ${auth}` },
      cache:"no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.secure_url) return null;
    return { url:String(data.secure_url), assetId:data.asset_id, publicId:data.public_id, model:"cached Cloudinary generation", cached:true };
  } catch { return null; }
}

function quotaLike(status:number, msg:string) {
  return status === 429 || status === 402 || status === 403 || /quota|limit|addon|add-on|subscription|entitle|credits|usage/i.test(msg);
}

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
    const aspectRatio = String(body.aspectRatio || "16:9");
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const cacheKey = createHash("sha1").update(JSON.stringify({assetIds,prompt,aspectRatio})).digest("hex").slice(0,20);
    const publicId = `launchforge/campaign-cache/${cacheKey}`;

    const cached = await cachedAsset(cloud, auth, publicId);
    if (cached) return NextResponse.json({ image:cached, cached:true });

    let fallbackSource = String(body.fallbackUrl || "");
    if (!fallbackSource && assetIds[0]) fallbackSource = await resolveAssetUrl(cloud, auth, String(assetIds[0]));

    if (Date.now() < generationUnavailableUntil && fallbackSource) {
      return NextResponse.json({
        image:{ url:transformFallback(fallbackSource,aspectRatio), model:"Cloudinary delivery fallback", fallback:true },
        warning:"Cloudinary AI Image Generation quota is currently exhausted. LaunchForge used a reversible Cloudinary crop/improve/sharpen delivery transform instead of failing."
      });
    }

    const res = await fetch(`https://api.cloudinary.com/v2/generate/${cloud}/image_to_image`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Basic ${auth}` },
      body: JSON.stringify({
        prompt,
        reference_images: assetIds.map((asset_id:string)=>({ source_type:"managed_asset", asset_id })),
        model:{ mode:"auto", preference:"quality" },
        image_size:{ aspect_ratio:aspectRatio, resolution:"1K" },
        format:"png",
        target:{ target_type:"managed_asset", public_id:publicId }
      })
    });

    const text = await res.text();
    let data:any={};
    try{data=JSON.parse(text)}catch{}
    const msg = data?.error?.message || data?.message || text.slice(0,300) || `HTTP ${res.status}`;

    if (!res.ok) {
      if (quotaLike(res.status,msg)) {
        generationUnavailableUntil = Date.now() + 15 * 60 * 1000;
        if (fallbackSource) {
          return NextResponse.json({
            image:{ url:transformFallback(fallbackSource,aspectRatio), model:"Cloudinary delivery fallback", fallback:true },
            warning:"Cloudinary AI Image Generation free quota has been reached. LaunchForge returned a quota-safe Cloudinary derivative so the workflow remains usable."
          });
        }
        return NextResponse.json({ error:`Cloudinary AI Image Generation quota is exhausted. No source URL was available for a safe fallback. ${msg}` }, { status:429 });
      }
      throw new Error(msg);
    }

    const asset = data?.data?.assets?.[0] || data?.assets?.[0] || {};
    const storage = asset.storage || asset;
    const url = storage.secure_url || asset.secure_url;
    if (!url) throw new Error("Image Generation completed without a media URL.");
    return NextResponse.json({ image:{ url, assetId:storage.asset_id || asset.asset_id, publicId:storage.public_id || asset.public_id, model:asset.model?.id || "auto" } });
  } catch (error:any) {
    const msg = error?.message || "Campaign image generation failed.";
    const friendly = /addon|subscription|entitle|403/i.test(msg) ? `Cloudinary Image Generation add-on is unavailable. ${msg}` : msg;
    console.error(error);
    return NextResponse.json({ error:friendly }, { status:500 });
  }
}
