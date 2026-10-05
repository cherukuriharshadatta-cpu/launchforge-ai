import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

type DemoDef = {
  file: string;
  slug: string;
  price: string;
  stock: string;
  ai: {
    name: string;
    category: string;
    color: string;
    material: string;
    style: string;
    description: string;
    tags: string[];
    headline: string;
    caption: string;
    cta: string;
    productFamily: string;
    view: string;
  };
};

const DEMO: DemoDef[] = [
  {
    file: "black-sneaker-side.jpg",
    slug: "black-hook-loop-sneaker",
    price: "₹2,199",
    stock: "12",
    ai: {
      name: "Black Hook-and-Loop Athletic Sneaker",
      category: "Sneakers",
      color: "Black",
      material: "Synthetic textile",
      style: "Sporty",
      description: "A black low-top sneaker with dual hook-and-loop straps and a cushioned athletic sole.",
      tags: ["black sneaker", "hook and loop", "athletic shoe", "low top", "thick sole", "casual footwear"],
      headline: "STEP INTO COMFORT",
      caption: "A versatile black sneaker built for everyday movement and clean styling.",
      cta: "Shop now",
      productFamily: "low-top hook-and-loop sneaker with thick sole",
      view: "left side",
    },
  },
  {
    file: "graphic-sneakers.jpg",
    slug: "graphic-lace-up-sneakers",
    price: "₹1,899",
    stock: "9",
    ai: {
      name: "Green and Yellow Graphic Lace-Up Sneakers",
      category: "Sneakers",
      color: "Green and yellow",
      material: "Canvas",
      style: "Streetwear",
      description: "Graphic low-top lace-up sneakers with bold green, mustard and cream color blocking.",
      tags: ["graphic sneakers", "lace up", "streetwear", "green shoes", "colorblock", "low top"],
      headline: "COLOR IN MOTION",
      caption: "A bold color-block sneaker designed to make everyday outfits stand out.",
      cta: "Explore",
      productFamily: "low-top lace-up graphic sneaker",
      view: "three-quarter",
    },
  },
  {
    file: "gold-watch.jpg",
    slug: "gold-analog-watch",
    price: "₹2,499",
    stock: "18",
    ai: {
      name: "Gold-Tone Analog Watch with Brown Leather Strap",
      category: "Watches",
      color: "Gold and brown",
      material: "Metal and leather",
      style: "Formal",
      description: "A classic gold-tone analog watch with a clean white dial and brown leather strap.",
      tags: ["analog watch", "gold watch", "leather strap", "formal watch", "classic accessories", "white dial"],
      headline: "TIME, REFINED",
      caption: "Classic proportions and warm gold tones for an effortless everyday statement.",
      cta: "Discover",
      productFamily: "round-bezel analog watch with leather strap",
      view: "front",
    },
  },
];

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
        color: "white",
      },
      { flags: "layer_apply", gravity: "south_west", x: 70, y: story ? 240 : 160 },
      {
        overlay: { font_family: "Arial", font_size: story ? 44 : 36, font_weight: "bold", text: cta.slice(0, 25) },
        color: "white",
      },
      { flags: "layer_apply", gravity: "south_west", x: 72, y: story ? 150 : 95 },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
}

export async function POST() {
  try {
    const products = [];

    for (const item of DEMO) {
      const filePath = path.join(process.cwd(), "public", "demo", item.file);
      const bytes = await readFile(filePath);
      const dataUri = `data:image/jpeg;base64,${bytes.toString("base64")}`;

      const uploaded: any = await cloudinary.uploader.upload(dataUri, {
        folder: "launchforge/demo-catalog",
        public_id: item.slug,
        overwrite: true,
        invalidate: false,
        resource_type: "image",
        tags: "launchforge,demo-catalog,judge-demo",
        phash: true,
        quality_analysis: true,
      });

      const context = [
        `product_name=${item.ai.name}`,
        `category=${item.ai.category}`,
        `color=${item.ai.color}`,
        `material=${item.ai.material}`,
        `style=${item.ai.style}`,
        `description=${item.ai.description}`,
        `product_family=${item.ai.productFamily}`,
        `view=${item.ai.view}`,
        `price=${item.price}`,
        `stock=${item.stock}`,
        `demo_mode=judge-safe`,
      ].join("|");

      try {
        await cloudinary.uploader.add_context(context, [uploaded.public_id], { resource_type: "image" });
        await cloudinary.uploader.add_tag(
          ["launchforge", "demo-catalog", item.ai.category, item.ai.style].join(","),
          [uploaded.public_id],
          { resource_type: "image" }
        );
      } catch (metadataError) {
        console.warn("Demo metadata warning:", metadataError);
      }

      const publicId = uploaded.public_id;
      const baseOptimized = [{ quality: "auto", fetch_format: "auto" }];
      const focusScore = Number(uploaded.quality_analysis?.focus ?? 0.9);

      products.push({
        publicId,
        assetId: uploaded.asset_id,
        original: uploaded.secure_url,
        catalog: cloudinary.url(publicId, { secure: true, transformation: [{ width: 900, height: 1100, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        square: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1080, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        portrait: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1350, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        story: cloudinary.url(publicId, { secure: true, transformation: [{ width: 1080, height: 1920, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        backgroundRemoved: cloudinary.url(publicId, { secure: true, transformation: [{ effect: "background_removal" }, { width: 1000, height: 1200, crop: "fit" }, ...baseOptimized] }),
        marketingSquare: marketingUrl(publicId, item.ai.headline, item.ai.cta, false),
        marketingStory: marketingUrl(publicId, item.ai.headline, item.ai.cta, true),
        restored: cloudinary.url(publicId, { secure: true, transformation: [{ effect: "gen_restore" }, { width: 900, height: 1100, crop: "fill", gravity: "auto" }, ...baseOptimized] }),
        etag: uploaded.etag,
        phash: uploaded.phash,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        focusScore,
        mediaHealth: focusScore < 0.5 ? "needs-fix" : focusScore < 0.7 ? "good" : "great",
        ai: item.ai,
        aiStatus: "enabled",
        aiMessage: "Judge demo catalog · pre-analyzed sample data loaded after the Cloudinary AI Vision free-tier quota was exhausted during final testing.",
        price: item.price,
        stock: item.stock,
      });
    }

    return NextResponse.json({
      mode: "judge-demo",
      reason: "ai-vision-quota",
      products,
    });
  } catch (error: any) {
    console.error("Demo catalog seed failed:", error);
    return NextResponse.json(
      { error: error?.error?.message || error?.message || "Could not seed the judge demo catalog." },
      { status: 500 }
    );
  }
}
