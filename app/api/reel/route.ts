import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReelProduct = {
  publicId: string;
  sourceUrl?: string;
  name: string;
  category?: string;
  color?: string;
  style?: string;
};

function cloudNameFromSource(sourceUrl?: string) {
  if (!sourceUrl) return "";
  try {
    const url = new URL(sourceUrl);
    const match = url.pathname.match(/^\/([^/]+)\//);
    if (url.hostname === "res.cloudinary.com" && match) return match[1];
  } catch {}
  return "";
}

function encodePublicId(publicId: string) {
  return publicId.split("/").map(part => encodeURIComponent(part)).join("/");
}

function singleProductVideo(product: ReelProduct, style: string, duration: number) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || cloudNameFromSource(product.sourceUrl);
  if (!cloudName) throw new Error("Cloudinary cloud name is missing. Copy .env.local into this V7.6 project folder and restart the server.");

  const du = Math.max(4, Math.min(12, Math.round(duration)));
  // Cloudinary documents zoompan using URL syntax on an image delivery and an .mp4 extension.
  // We crop first so the motion always starts from a social-ready 9:16 composition.
  const motion = style === "luxe"
    ? `e_zoompan:du_${du};fps_30;from_(x_0.5;y_0.5;zoom_1.16);to_(x_0.5;y_0.5;zoom_1.01)`
    : style === "punch"
      ? `e_zoompan:du_${du};fps_30;from_(x_0.50;y_0.50;zoom_1.02);to_(x_0.54;y_0.46;zoom_1.34)`
      : `e_zoompan:du_${du};fps_30;from_(x_0.50;y_0.50;zoom_1.01);to_(x_0.50;y_0.46;zoom_1.22)`;

  const publicId = encodePublicId(product.publicId);
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/c_fill,g_auto,h_1600,w_900/${motion}/c_fill,h_1280,w_720/${publicId}.mp4`;
}

function campaignFrameUrl(publicId: string, zoom = 1) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: Math.round(720 * zoom), height: Math.round(1280 * zoom), crop: "fill", gravity: "auto" },
      { width: 720, height: 1280, crop: "crop", gravity: "auto" },
      { quality: "auto:good", fetch_format: "jpg" },
    ],
  });
}

async function verifyVideo(url: string) {
  // Trigger Cloudinary's derived asset generation and make sure the URL is actually usable.
  // HEAD is not always sufficient for a first-time derivative, so use a tiny ranged GET.
  const res = await fetch(url, {
    method: "GET",
    headers: { Range: "bytes=0-2047" },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 206) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary could not render the single-product MP4 (${res.status})${text ? `: ${text.slice(0, 160)}` : ""}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode = body?.mode === "campaign" ? "campaign" : "single";
    const style = ["cinematic", "punch", "luxe"].includes(body?.style) ? body.style : "cinematic";
    const duration = Number(body?.duration) || 8;
    const products = (Array.isArray(body?.products) ? body.products : []).slice(0, 5) as ReelProduct[];

    if (!products.length || products.some((p) => !p?.publicId)) {
      return NextResponse.json({ error: "Choose at least one product first." }, { status: 400 });
    }

    if (mode === "single") {
      const product = products[0];
      const url = singleProductVideo(product, style, duration);
      await verifyVideo(url);
      return NextResponse.json({
        reel: {
          url,
          publicId: product.publicId,
          format: "mp4",
          frames: 1,
          durationEstimate: duration,
          style,
          mode,
        },
      });
    }

    const reelId = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const reelTag = `launchforge_${reelId}`;
    const urls: string[] = [];

    for (const product of products) {
      urls.push(campaignFrameUrl(product.publicId, 1));
      if (style !== "luxe") urls.push(campaignFrameUrl(product.publicId, style === "punch" ? 1.12 : 1.07));
    }

    for (let i = 0; i < urls.length; i++) {
      await cloudinary.uploader.upload(urls[i], {
        resource_type: "image",
        folder: `launchforge/reel-frames/${reelId}`,
        public_id: `frame_${String(i).padStart(2, "0")}`,
        tags: [reelTag, "launchforge-reel-frame"],
        overwrite: true,
      });
    }

    const delay = style === "luxe" ? 1100 : style === "punch" ? 520 : 760;
    const result: any = await cloudinary.uploader.multi(reelTag, { format: "mp4", delay });
    const url = result.secure_url || result.url;
    if (!url) throw new Error("Cloudinary did not return a campaign video URL.");

    return NextResponse.json({
      reel: {
        url,
        publicId: result.public_id,
        format: "mp4",
        frames: urls.length,
        durationEstimate: Math.round((urls.length * delay) / 100) / 10,
        style,
        mode,
      },
    });
  } catch (error: any) {
    const message = error?.error?.message || error?.message || "Could not generate the video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
