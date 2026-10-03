import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

function contextValue(context: any, key: string) {
  return context?.custom?.[key] ?? context?.[key] ?? "";
}

export async function GET() {
  try {
    const result = await cloudinary.search
      .expression("resource_type:image AND tags=launchforge AND tags=inventory")
      .sort_by("created_at", "desc")
      .with_field("context")
      .with_field("tags")
      .max_results(100)
      .execute();

    const products = result.resources.map((r: any) => ({
      publicId: r.public_id,
      catalog: cloudinary.url(r.public_id, {
        secure: true,
        transformation: [
          { width: 700, height: 860, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" }
        ]
      }),
      square: cloudinary.url(r.public_id, {
        secure: true,
        transformation: [
          { width: 700, height: 700, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" }
        ]
      }),
      ai: {
        name: contextValue(r.context, "product_name") || r.public_id.split("/").pop(),
        category: contextValue(r.context, "category") || "Uncategorized",
        color: contextValue(r.context, "color"),
        material: contextValue(r.context, "material"),
        style: contextValue(r.context, "style"),
        description: contextValue(r.context, "description") || "Product generated from uploaded media.",
        headline: contextValue(r.context, "headline") || "NEW ARRIVAL",
        caption: contextValue(r.context, "caption") || "New arrival.",
        cta: contextValue(r.context, "cta") || "Shop now",
        tags: r.tags || [],
      },
      aiStatus: contextValue(r.context, "ai_status") || "fallback",
      aiMessage: contextValue(r.context, "ai_message") || "",
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load catalog." }, { status: 500 });
  }
}
