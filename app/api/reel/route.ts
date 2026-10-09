import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReelProduct = {
  publicId: string;
  name?: string;
  category?: string;
  headline?: string;
  caption?: string;
  cta?: string;
};

function assertCloudName() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is missing from .env.local");
  return cloudName;
}

function encPublicId(publicId: string) {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

function layerId(publicId: string) {
  return publicId.replace(/\//g, ":");
}

function safeText(value?: string, fallback = "") {
  return encodeURIComponent(String(value || fallback).replace(/[,%/]/g, " ").slice(0, 62));
}

function shotMotion(style: string, shot: number, duration: number) {
  const du = Math.max(1.8, Math.min(3.2, duration));
  if (style === "punch") {
    return shot === 0
      ? `e_zoompan:du_${du};from_(x_0.50;y_0.50;zoom_1.00);to_(x_0.50;y_0.48;zoom_1.70)`
      : shot === 1
        ? `e_zoompan:du_${du};from_(x_0.54;y_0.48;zoom_1.30);to_(x_0.46;y_0.52;zoom_2.15)`
        : `e_zoompan:du_${du};from_(x_0.48;y_0.52;zoom_1.45);to_(x_0.52;y_0.48;zoom_1.05)`;
  }
  if (style === "luxe") {
    return shot === 0
      ? `e_zoompan:du_${du};from_(x_0.44;y_0.50;zoom_1.04);to_(x_0.50;y_0.50;zoom_1.32)`
      : shot === 1
        ? `e_zoompan:du_${du};from_(x_0.48;y_0.48;zoom_1.25);to_(x_0.55;y_0.50;zoom_1.58)`
        : `e_zoompan:du_${du};from_(x_0.55;y_0.50;zoom_1.40);to_(x_0.48;y_0.50;zoom_1.10)`;
  }
  return shot === 0
    ? `e_zoompan:du_${du};from_(x_0.48;y_0.50;zoom_1.00);to_(x_0.52;y_0.48;zoom_1.42)`
    : shot === 1
      ? `e_zoompan:du_${du};from_(x_0.52;y_0.48;zoom_1.28);to_(x_0.47;y_0.52;zoom_1.72)`
      : `e_zoompan:du_${du};from_(x_0.46;y_0.52;zoom_1.35);to_(x_0.54;y_0.48;zoom_1.08)`;
}

function buildShotUrl(publicId: string, style: string, shot: number, duration: number) {
  const cloud = assertCloudName();
  const bg = style === "luxe" ? "f3eee6" : style === "punch" ? "10131a" : "111318";
  const motion = shotMotion(style, shot, duration);
  const trim = publicId.startsWith("launchforge/demo-catalog/") ? "e_trim:10/" : "";
  return `https://res.cloudinary.com/${cloud}/image/upload/${trim}${motion}/c_pad,w_720,h_1280,b_rgb:${bg}/${encPublicId(publicId)}.mp4`;
}

async function verifyVideo(url: string) {
  const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" }, cache: "no-store" });
  if (!response.ok && response.status !== 206) {
    const cldError = response.headers.get("x-cld-error");
    throw new Error(cldError ? `Cloudinary video error: ${cldError}` : `Cloudinary video returned HTTP ${response.status}`);
  }
}

async function uploadDerivedClip(url: string, reelId: string, index: number) {
  const uploaded: any = await cloudinary.uploader.upload(url, {
    resource_type: "video",
    folder: `launchforge/reels/${reelId}`,
    public_id: `shot-${index + 1}`,
    overwrite: true,
    tags: "launchforge,reel,storyboard",
  });
  return uploaded.public_id as string;
}

function finalStoryboardUrl(base: string, second: string, third: string, product: ReelProduct, style: string) {
  const cloud = assertCloudName();
  const transition = style === "punch" ? "wipeleft" : "fade";
  const td = style === "punch" ? "0.18" : style === "luxe" ? "0.55" : "0.35";
  const name = safeText(product.name, "New arrival");
  const headline = safeText(product.headline, style === "luxe" ? "Designed to be noticed" : "NEW ARRIVAL");
  const cta = safeText(product.cta, "Shop now");
  const transforms = [
    "c_fill,w_720,h_1280",
    `fl_splice:transition_(name_${transition};du_${td}),l_video:${layerId(second)}`,
    "c_fill,w_720,h_1280",
    "fl_layer_apply",
    `fl_splice:transition_(name_${transition};du_${td}),l_video:${layerId(third)}`,
    "c_fill,w_720,h_1280",
    "fl_layer_apply",
    `l_text:Arial_28_bold:${headline}/co_white/o_92/fl_layer_apply,g_north_west,x_48,y_76`,
    `l_text:Arial_42_bold:${name}/co_white/fl_layer_apply,g_south_west,x_48,y_118`,
    `l_text:Arial_24_bold:${cta}/co_white/o_95/fl_layer_apply,g_south_west,x_50,y_70`,
    "q_auto:good",
  ];
  return `https://res.cloudinary.com/${cloud}/video/upload/${transforms.join("/")}/${encPublicId(base)}.mp4`;
}

async function buildStoryboard(product: ReelProduct, style: string, duration: number) {
  const total = Math.max(6, Math.min(10, Math.round(duration || 6)));
  const shotDuration = Math.max(2, Math.min(3.2, total / 3 + 0.25));
  const reelId = `storyboard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sourceUrls = [0, 1, 2].map(i => buildShotUrl(product.publicId, style, i, shotDuration));
  for (const url of sourceUrls) await verifyVideo(url);

  try {
    const uploaded: string[] = [];
    for (let i = 0; i < sourceUrls.length; i++) uploaded.push(await uploadDerivedClip(sourceUrls[i], reelId, i));
    const finalUrl = finalStoryboardUrl(uploaded[0], uploaded[1], uploaded[2], product, style);
    await verifyVideo(finalUrl);
    return { url: finalUrl, shots: 3, engine: "cloudinary-storyboard", fallback: false };
  } catch (storyboardError) {
    console.warn("Storyboard composition fallback:", storyboardError);
    // Never break judging: the middle hero shot is still a real Cloudinary MP4.
    return { url: sourceUrls[1], shots: 1, engine: "cloudinary-zoompan", fallback: true };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode = body?.mode === "campaign" ? "campaign" : "single";
    const style = ["cinematic", "punch", "luxe"].includes(body?.style) ? body.style : "cinematic";
    const duration = Number(body?.duration) || 6;
    const products = (Array.isArray(body?.products) ? body.products : []) as ReelProduct[];
    if (!products.length || !products[0]?.publicId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });

    if (mode === "campaign") {
      const selected = products.filter(p => p?.publicId).slice(0, 4);
      const clips = [];
      for (const product of selected) {
        const built = await buildStoryboard(product, style, duration);
        clips.push({ ...built, publicId: product.publicId, name: product.name || "Product", style, durationEstimate: duration, mode: "single" });
      }
      return NextResponse.json({ clips, reel: clips[0] || null });
    }

    const product = products[0];
    const built = await buildStoryboard(product, style, duration);
    return NextResponse.json({ reel: { ...built, publicId: product.publicId, name: product.name || "Product", format: "mp4", durationEstimate: duration, style, mode: "single" } });
  } catch (error: any) {
    console.error("LaunchForge reel generation failed:", error);
    return NextResponse.json({ error: error?.error?.message || error?.message || "Could not generate the product video." }, { status: 500 });
  }
}
