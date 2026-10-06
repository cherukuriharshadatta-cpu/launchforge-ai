import type { ProductAI } from "@/lib/types";

const fallback: ProductAI = {
  name: "New Product",
  category: "Uncategorized",
  color: "",
  material: "",
  style: "",
  description: "Product media is ready. Enable Cloudinary AI Vision to generate catalog details automatically.",
  tags: ["product", "catalog"],
  headline: "NEW ARRIVAL",
  caption: "New arrival — now available in our collection.",
  cta: "Shop now",
  productFamily: "product",
  view: "unknown",
};

function normalize(parsed: any): ProductAI {
  return {
    name: String(parsed?.name || fallback.name).trim(),
    category: String(parsed?.category || fallback.category).trim(),
    color: String(parsed?.color || "").trim(),
    material: String(parsed?.material || "").trim(),
    style: String(parsed?.style || "").trim(),
    description: String(parsed?.description || fallback.description).trim(),
    tags: Array.isArray(parsed?.tags)
      ? parsed.tags.map((v: unknown) => String(v).trim()).filter(Boolean).slice(0, 8)
      : fallback.tags,
    headline: String(parsed?.headline || fallback.headline).trim(),
    caption: String(parsed?.caption || fallback.caption).trim(),
    cta: String(parsed?.cta || fallback.cta).trim(),
    productFamily: String(parsed?.productFamily || parsed?.product_family || fallback.productFamily || "product").trim(),
    view: String(parsed?.view || fallback.view || "unknown").trim(),
  };
}

function parseStructuredValue(value: unknown): ProductAI | null {
  if (!value) return null;

  if (typeof value === "object") {
    return normalize(value);
  }

  const raw = String(value).trim();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    // Some model responses may still include a fenced JSON payload.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
      try {
        return normalize(JSON.parse(fenced));
      } catch {}
    }

    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return normalize(JSON.parse(raw.slice(first, last + 1)));
      } catch {}
    }
  }

  return null;
}

function friendlyError(status: number, body: string) {
  const text = body.toLowerCase();

  if (status === 401) return "Cloudinary AI authentication failed. Recheck the API key and API secret.";
  if (status === 403 || text.includes("addon") || text.includes("add-on")) {
    return "Cloudinary AI Vision is not enabled for this product environment. Install the free AI Vision add-on in Cloudinary Settings → Add-ons.";
  }
  if (status === 429) return "Cloudinary AI Vision rate/token limit reached. Try again after the quota resets.";
  if (status === 400) return `Cloudinary AI Vision rejected the request: ${body.slice(0, 180)}`;
  return `Cloudinary AI Vision returned HTTP ${status}.`;
}

export async function analyzeProduct(source: { assetId?: string; uri?: string }): Promise<{
  data: ProductAI;
  status: "enabled" | "fallback";
  message: string;
}> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloud || !key || !secret) {
    return {
      data: fallback,
      status: "fallback",
      message: "Cloudinary credentials are missing from .env.local.",
    };
  }

  const schema = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A concise ecommerce product title describing what is visibly shown. No brand unless clearly visible."
      },
      category: {
        type: "string",
        description: "A shopper-friendly top-level or second-level category such as Watches, Backpacks, Shirts, Sneakers, Jewellery, Beauty, Home Decor."
      },
      color: { type: "string", description: "Primary visible product color, otherwise empty string." },
      material: {
        type: "string",
        description: "Material only if visually supportable with reasonable confidence; otherwise empty string."
      },
      style: {
        type: "string",
        description: "Short visible style/use-case such as casual, sporty, formal, festive, travel, minimalist; otherwise empty string."
      },
      description: {
        type: "string",
        description: "One polished ecommerce sentence grounded only in the image. Do not invent price, size, fabric composition or hidden specifications."
      },
      tags: {
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 8,
        description: "Useful visual-search and commerce tags."
      },
      headline: {
        type: "string",
        description: "Short launch headline for a social creative, maximum 4 words, tailored to this product."
      },
      caption: {
        type: "string",
        description: "A concise Instagram-ready product caption, maximum 2 sentences, no unsupported claims."
      },
      cta: { type: "string", description: "Short CTA, maximum 3 words." },
      productFamily: {
        type: "string",
        description: "A stable canonical identity for grouping multiple photos of the SAME physical product design. Exclude color, camera angle, brand, gender, use-case and marketing adjectives such as casual/athletic/premium. Prefer visible construction in a consistent order: silhouette/product type + closure + distinctive construction. Reuse canonical vocabulary such as low-top, high-top, hook-and-loop, lace-up, thick sole, dual handles. Example: low-top hook-and-loop sneaker with thick sole; round-bezel analog watch with leather strap."
      },
      view: {
        type: "string",
        description: "Visible camera/view angle using one short value such as front, back, left side, right side, detail, top, three-quarter, or unknown."
      }
    },
    required: ["name", "category", "color", "material", "style", "description", "tags", "headline", "caption", "cta", "productFamily", "view"],
    additionalProperties: false
  };

  const prompt = [
    "You are the visual merchandising engine for a small ecommerce seller.",
    "Analyze this product image and convert what is visibly present into structured catalog and launch-marketing data.",
    "Be conservative: never invent specs, pricing, gender, material, brand, or features that cannot reasonably be inferred from the image.",
    "Use natural, professional ecommerce wording.",
    "productFamily is especially important. It is a SKU-grouping key, not a marketing title. Different views of the same physical design MUST receive the same productFamily whenever visible evidence supports that. Ignore color and camera angle, and avoid variable adjectives such as casual, athletic, stylish, premium or elegant. Prefer a canonical construction phrase such as 'low-top hook-and-loop sneaker with thick sole'.",
    "view must describe the visible camera angle without guessing hidden sides.",
    "Return exactly the JSON structure below.",
    "```json",
    JSON.stringify(schema),
    "```"
  ].join("\n");

  try {
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const cloudinarySource = source.assetId
      ? { asset_id: source.assetId }
      : { uri: source.uri };

    const res = await fetch(
      `https://api.cloudinary.com/v2/analysis/${encodeURIComponent(cloud)}/analyze/ai_vision_general`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: cloudinarySource, prompts: [prompt] }),
        cache: "no-store",
      }
    );

    const raw = await res.text();
    if (!res.ok) {
      console.error("AI Vision failed:", res.status, raw);
      return { data: fallback, status: "fallback", message: friendlyError(res.status, raw) };
    }

    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      return { data: fallback, status: "fallback", message: "Cloudinary AI Vision returned an invalid JSON response." };
    }

    const value = json?.data?.analysis?.responses?.[0]?.value;
    const parsed = parseStructuredValue(value);
    if (!parsed) {
      return {
        data: fallback,
        status: "fallback",
        message: "Cloudinary AI Vision responded, but the product data could not be parsed.",
      };
    }

    return {
      data: parsed,
      status: "enabled",
      message: `Analyzed with Cloudinary AI Vision${json?.data?.analysis?.model_version ? ` · model v${json.data.analysis.model_version}` : ""}.`,
    };
  } catch (error) {
    console.error("AI Vision error:", error);
    return {
      data: fallback,
      status: "fallback",
      message: error instanceof Error ? `AI Vision request failed: ${error.message}` : "AI Vision request failed.",
    };
  }
}
