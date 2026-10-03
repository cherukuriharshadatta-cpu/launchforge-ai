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

function singleProductVideoCandidates(product: ReelProduct, style: string, duration: number) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || cloudNameFromSource(product.sourceUrl);
  if (!cloudName) {
    throw new Error("Cloudinary cloud name is missing. Copy .env.local into this project folder and restart the server.");
  }

  const du = Math.max(4, Math.min(12, Math.round(duration)));
  const publicId = encodePublicId(product.publicId);
  const base = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload`;

  // IMPORTANT: Cloudinary warns against chaining g_auto outside zoompan.
  // Motion happens on the source image first; vertical social framing happens AFTER.
  const motion = style === "luxe"
    ? `e_zoompan:du_${du};fps_24;from_(x_0.5;y_0.5;zoom_1.22);to_(x_0.5;y_0.5;zoom_1.02)`
    : style === "punch"
      ? `e_zoompan:du_${du};fps_30;from_(x_0.44;y_0.50;zoom_1.02);to_(x_0.56;y_0.48;zoom_1.28)`
      : `e_zoompan:du_${du};fps_24;from_(x_0.50;y_0.50;zoom_1.02);to_(x_0.50;y_0.48;zoom_1.18)`;

  // c_pad preserves the complete product instead of cropping it out of frame.
  const finish = `c_pad,w_720,h_1280,b_rgb:f4f3ef/q_auto`;

  const styled = `${base}/${motion}/${finish}/${publicId}.mp4`;
  // Very conservative documented fallback if a particular source image rejects custom start/end motion.
  const basic = `${base}/e_zoompan:du_${du};fps_24/${finish}/${publicId}.mp4`;

  return [styled, basic];
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

async function videoWorks(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-2047" },
      cache: "no-store",
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
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
      const candidates = singleProductVideoCandidates(product, style, duration);
      let workingUrl = "";

      for (const candidate of candidates) {
        if (await videoWorks(candidate)) {
          workingUrl = candidate;
          break;
        }
      }

      if (!workingUrl) {
        throw new Error("Cloudinary could not render this product video. Try another source image or a shorter duration.");
      }

      return NextResponse.json({
        reel: {
          url: workingUrl,
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
