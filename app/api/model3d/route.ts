import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const productId = String(form.get("productId") || "product").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a GLB or zipped 3D model." }, { status: 400 });

    const name = file.name.toLowerCase();
    if (!name.endsWith(".glb") && !name.endsWith(".zip") && !name.endsWith(".gltf") && !name.endsWith(".gltz")) {
      return NextResponse.json({ error: "Use GLB when possible. ZIP/GLTF/GLTZ are also accepted by Cloudinary, but GLB is the most reliable Product Gallery format." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || (name.endsWith(".glb") ? "model/gltf-binary" : name.endsWith(".gltf") ? "model/gltf+json" : "application/zip");
    const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
    const uploaded: any = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: "launchforge/3d-models",
      public_id: `${productId}_${Date.now()}`,
      filename_override: file.name,
      tags: ["launchforge", "product-3d", productId],
    });

    return NextResponse.json({ cloudName: process.env.CLOUDINARY_CLOUD_NAME, model: { publicId: uploaded.public_id, secureUrl: uploaded.secure_url, format: uploaded.format || "glb" } });
  } catch (error: any) {
    const msg = error?.error?.message || error?.message || "3D model upload failed.";
    console.error(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
