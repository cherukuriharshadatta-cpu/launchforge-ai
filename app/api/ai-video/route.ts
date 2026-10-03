import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authHeader() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) throw new Error("Cloudinary API credentials are missing.");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is missing.");

    const body = await request.json();
    const assetId = String(body?.assetId || "");
    const prompt = String(body?.prompt || "").trim();
    const duration = [4, 6, 8].includes(Number(body?.duration)) ? Number(body.duration) : 6;
    const resolution = body?.resolution === "1080p" && duration === 8 ? "1080p" : "720p";

    if (!assetId) return NextResponse.json({ error: "This product has no Cloudinary asset ID." }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: "Describe the motion you want first." }, { status: 400 });

    const res = await fetch(`https://api.cloudinary.com/v2/video/${cloudName}/image_to_video/generate`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_asset_id: assetId,
        aspect_ratio: "9:16",
        resolution,
        duration,
        generate_audio: Boolean(body?.generateAudio),
        enhance_prompt: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error?.message || data?.message || "Cloudinary AI video generation could not start.";
      const lower = String(message).toLowerCase();
      if (/subscription|required|not permitted|entitle|add-on|addon/.test(lower)) {
        return NextResponse.json({
          error: "Cloudinary Image-to-Video is not enabled on this product environment.",
          code: "IMAGE_TO_VIDEO_ADDON_REQUIRED",
          canFallback: true,
        }, { status: 402 });
      }
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json({ jobId: data?.data?.job_id, status: data?.data?.status || "pending" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI video generation failed." }, { status: 500 });
  }
}
