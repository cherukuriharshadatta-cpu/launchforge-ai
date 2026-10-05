import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { analyzeProduct } from "@/lib/aiVision";

export const runtime = "nodejs";

function cleanTag(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function marketingUrl(publicId: string, headline: string, cta: string, story = false) {
  const width = 1080;
  const height = story ? 1920 : 1080;
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width, height, crop: "fill", gravity: "auto" },
      { effect: "gradient_fade", y: 0.55 },
      {
        overlay: { font_family: "Arial", font_size: story ? 88 : 72, font_weight: "bold", text: headline.slice(0, 40) },
        color: "white"
      },
      { flags: "layer_apply", gravity: "south_west", x: 70, y: story ? 240 : 160 },
      {
        overlay: { font_family: "Arial", font_size: story ? 44 : 36, font_weight: "bold", text: cta.slice(0, 25) },
        color: "white"
      },
      { flags: "layer_apply", gravity: "south_west", x: 72, y: story ? 150 : 95 },
      { quality: "auto", fetch_format: "auto" }
    ]
  });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a product image." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "This MVP currently accepts images." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
    const uploaded: any = await cloudinary.uploader.upload(dataUri, {
      folder: "launchforge/inventory",
      resource_type: "image",
      tags: ["launchforge", "inventory", "unstructured-upload"],
      phash: true,
      quality_analysis: true,
      accessibility_analysis: process.env.CLOUDINARY_ACCESSIBILITY_ANALYSIS === "true",
    });

    // Analyze the immutable Cloudinary asset directly. This avoids a second public image fetch.
    const analysis = await analyzeProduct({ assetId: uploaded.asset_id, uri: uploaded.secure_url });
    const ai = analysis.data;
    const tags = ["launchforge", "inventory", ai.category, ai.color, ai.style, ...ai.tags]
      .map(cleanTag)
      .filter(Boolean);

    try {
      const uniqueTags = Array.from(new Set(tags));
      const context = [
        ["product_name", ai.name],
        ["category", ai.category],
        ["color", ai.color],
        ["material", ai.material],
        ["style", ai.style],
        ["description", ai.description],
        ["headline", ai.headline],
        ["caption", ai.caption],
        ["cta", ai.cta],
        ["product_family", ai.productFamily || ""],
        ["view", ai.view || "unknown"],
        ["etag", uploaded.etag || ""],
        ["phash", uploaded.phash || ""],
        ["focus_score", uploaded.quality_analysis?.focus ?? ""],
        ["ai_status", analysis.status],
        ["ai_message", analysis.message],
      ]
        .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, " ").slice(0, 900)}`)
        .join("|");

      await cloudinary.uploader.add_tag(uniqueTags.join(","), [uploaded.public_id], { resource_type: "image" });
      await cloudinary.uploader.add_context(context, [uploaded.public_id], { resource_type: "image" });
    } catch (e) {
      console.error("Metadata update warning", e);
    }

    const publicId = uploaded.public_id;
    const focusScore = Number(uploaded.quality_analysis?.focus ?? 0.75);
    const mediaHealth = focusScore < 0.5 ? "needs-fix" : focusScore < 0.7 ? "good" : "great";
    const accessibilityScore = Number(uploaded.accessibility_analysis?.colorblind_accessibility_score ?? NaN);
    const provenanceUrl = process.env.CLOUDINARY_C2PA_ENABLED === "true"
      ? cloudinary.url(publicId, { secure: true, flags: "c2pa", quality: "auto", fetch_format: "auto" })
      : undefined;
    const baseOptimized = [{ quality: "auto", fetch_format: "auto" }];

    return NextResponse.json({
      product: {
        publicId,
        assetId: uploaded.asset_id,
        original: uploaded.secure_url,
        catalog: cloudinary.url(publicId, { secure: true, transformation: [{ width: 900, height: 1100, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        square: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1080, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        portrait: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1350, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        story: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1920, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        backgroundRemoved: cloudinary.url(publicId, { secure: true, transformation: [{ effect: "background_removal" }, { width: 1000, height: 1200, crop: "fit" }, ...baseOptimized] }),
        marketingSquare: marketingUrl(publicId, ai.headline, ai.cta, false),
        marketingStory: marketingUrl(publicId, ai.headline, ai.cta, true),
        restored: cloudinary.url(publicId, { secure: true, transformation: [{ effect: "gen_restore" }, { effect: "improve:indoor:40" }, { width: 900, height: 1100, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        etag: uploaded.etag,
        phash: uploaded.phash,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        focusScore,
        mediaHealth,
        accessibilityScore: Number.isFinite(accessibilityScore) ? accessibilityScore : undefined,
        provenanceUrl,
        ai,
        aiStatus: analysis.status,
        aiMessage: analysis.message,
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed." }, { status: 500 });
  }
}
