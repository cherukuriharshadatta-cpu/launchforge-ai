import { NextResponse } from "next/server";
import type { BrandStrategy, ProductAsset, SiteTheme } from "@/lib/types";

export const runtime = "nodejs";

function cleanHex(value: unknown, fallback: string) {
  const v = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

function fallbackTheme(text: string): Exclude<SiteTheme, "auto"> {
  const t = text.toLowerCase();
  if (/(watch|jewel|perfume|beauty|luxury|leather)/.test(t)) return "luxe";
  if (/(shoe|sneaker|sport|street|gym|running)/.test(t)) return "bold";
  if (/(shirt|dress|kurti|fashion|clothing|apparel|wear|saree|jacket)/.test(t)) return "editorial";
  if (/(phone|laptop|camera|electronic|tech|headphone|speaker|gadget)/.test(t)) return "tech";
  return "minimal";
}

function fallbackStrategy(products: ProductAsset[]): BrandStrategy {
  const text = products.flatMap(p => [p.ai.name, p.ai.category, p.ai.style, ...p.ai.tags]).join(" ");
  const theme = fallbackTheme(text);
  const categories = Array.from(new Set(products.map(p => p.ai.category).filter(Boolean)));
  const niche = categories.length > 2 ? "Multi-category lifestyle retail" : (categories[0] || "Modern ecommerce");
  const map: Record<Exclude<SiteTheme, "auto">, Pick<BrandStrategy, "personality" | "collectionName" | "heroLine" | "campaignAngle" | "accent" | "secondary" | "background">> = {
    editorial: { personality: "Editorial, modern, expressive", collectionName: "The Everyday Edit", heroLine: "Designed for the way you live.", campaignAngle: "Turn everyday essentials into an editorial launch story.", accent: "#7A5CFF", secondary: "#EDE6DB", background: "#F7F3ED" },
    luxe: { personality: "Refined, understated, premium", collectionName: "Signature Selection", heroLine: "Quiet details. Strong presence.", campaignAngle: "Position the collection as considered, premium and gift-worthy.", accent: "#B9955A", secondary: "#1D1B18", background: "#F3EFE7" },
    bold: { personality: "Energetic, youthful, high-contrast", collectionName: "Drop 01", heroLine: "Built to stand out.", campaignAngle: "Use fast cuts, strong type and drop-culture urgency.", accent: "#DFFF48", secondary: "#111111", background: "#F4F4EF" },
    tech: { personality: "Precise, futuristic, product-led", collectionName: "Next Essentials", heroLine: "Smarter objects for everyday life.", campaignAngle: "Lead with product details, clarity and futuristic motion.", accent: "#47E6FF", secondary: "#0A1114", background: "#EFF6F7" },
    minimal: { personality: "Clean, calm, versatile", collectionName: "New Essentials", heroLine: "Simple products. Better everyday.", campaignAngle: "Keep the launch clear, useful and visually consistent.", accent: "#111111", secondary: "#D9DED8", background: "#F7F7F4" },
  };
  return {
    niche,
    audience: "Digital-first shoppers looking for a curated, easy-to-browse collection",
    recommendedTheme: theme,
    ...map[theme],
  };
}

function normalize(parsed: any, fallback: BrandStrategy): BrandStrategy {
  const allowed: Exclude<SiteTheme, "auto">[] = ["editorial", "luxe", "bold", "minimal", "tech"];
  const theme = allowed.includes(parsed?.recommendedTheme) ? parsed.recommendedTheme : fallback.recommendedTheme;
  return {
    niche: String(parsed?.niche || fallback.niche).trim(),
    audience: String(parsed?.audience || fallback.audience).trim(),
    personality: String(parsed?.personality || fallback.personality).trim(),
    collectionName: String(parsed?.collectionName || fallback.collectionName).trim(),
    heroLine: String(parsed?.heroLine || fallback.heroLine).trim(),
    campaignAngle: String(parsed?.campaignAngle || fallback.campaignAngle).trim(),
    accent: cleanHex(parsed?.accent, fallback.accent),
    secondary: cleanHex(parsed?.secondary, fallback.secondary),
    background: cleanHex(parsed?.background, fallback.background),
    recommendedTheme: theme,
  };
}

function parseValue(value: unknown, fallback: BrandStrategy) {
  if (!value) return null;
  if (typeof value === "object") return normalize(value, fallback);
  const raw = String(value).trim();
  try { return normalize(JSON.parse(raw), fallback); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) { try { return normalize(JSON.parse(fenced), fallback); } catch {} }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) { try { return normalize(JSON.parse(raw.slice(first, last + 1)), fallback); } catch {} }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const products = (Array.isArray(body?.products) ? body.products : []).slice(0, 8) as ProductAsset[];
    if (!products.length) return NextResponse.json({ error: "Upload products first." }, { status: 400 });

    const fallback = fallbackStrategy(products);
    const hero = products.find(p => p.assetId) || products[0];
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud || !key || !secret || !hero?.assetId) {
      return NextResponse.json({ strategy: fallback, mode: "fallback" });
    }

    const catalogContext = products.map((p, i) => ({
      index: i + 1,
      name: p.ai.name,
      category: p.ai.category,
      color: p.ai.color,
      style: p.ai.style,
      tags: p.ai.tags.slice(0, 5),
    }));

    const schema = {
      type: "object",
      properties: {
        niche: { type: "string" },
        audience: { type: "string" },
        personality: { type: "string" },
        collectionName: { type: "string" },
        heroLine: { type: "string" },
        campaignAngle: { type: "string" },
        accent: { type: "string", description: "One accessible 6-digit hex color beginning with #" },
        secondary: { type: "string", description: "One 6-digit hex color beginning with #" },
        background: { type: "string", description: "One light or dark 6-digit hex color beginning with #" },
        recommendedTheme: { type: "string", enum: ["editorial", "luxe", "bold", "minimal", "tech"] },
      },
      required: ["niche","audience","personality","collectionName","heroLine","campaignAngle","accent","secondary","background","recommendedTheme"],
      additionalProperties: false,
    };

    const prompt = [
      "You are LaunchForge's AI merchandiser and brand strategist.",
      "Use the visible hero product plus the catalog context below to turn this inventory into ONE coherent launch direction.",
      "Do not invent price, demographics, quality claims, or product specs. The goal is positioning and visual direction, not factual product claims.",
      "Choose a niche, likely audience, brand personality, memorable collection name, hero line, campaign angle, and an accessible color palette inspired by the catalog.",
      `Catalog context: ${JSON.stringify(catalogContext)}`,
      "Return exactly this JSON schema:",
      "```json",
      JSON.stringify(schema),
      "```",
    ].join("\n");

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const res = await fetch(`https://api.cloudinary.com/v2/analysis/${encodeURIComponent(cloud)}/analyze/ai_vision_general`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: { asset_id: hero.assetId }, prompts: [prompt] }),
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json({ strategy: fallback, mode: "fallback" });
    const json: any = await res.json();
    const parsed = parseValue(json?.data?.analysis?.responses?.[0]?.value, fallback);
    return NextResponse.json({ strategy: parsed || fallback, mode: parsed ? "ai" : "fallback" });
  } catch (error) {
    console.error("Brand strategy error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not build brand strategy." }, { status: 500 });
  }
}
