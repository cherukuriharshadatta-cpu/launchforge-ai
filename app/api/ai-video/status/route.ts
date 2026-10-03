import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authHeader() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) throw new Error("Cloudinary API credentials are missing.");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function GET(request: Request) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is missing.");
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });

    const res = await fetch(`https://api.cloudinary.com/v2/video/${cloudName}/image_to_video/generate/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || "Could not check AI video status." }, { status: res.status });

    return NextResponse.json({
      status: data?.data?.status,
      url: data?.data?.url,
      publicId: data?.data?.public_id,
      message: data?.data?.message,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check AI video status." }, { status: 500 });
  }
}
