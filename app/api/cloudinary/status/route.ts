import { NextResponse } from "next/server";
import cloudinary, { cloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function GET() {
  const cfg = cloudinary.config();
  return NextResponse.json({
    configured: cloudinaryConfigured(),
    cloudName: cfg.cloud_name || null,
  });
}
