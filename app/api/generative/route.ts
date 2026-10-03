import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mode = "background" | "recolor";

function cleanText(value: unknown, max = 140) {
  return String(value || "").replace(/[\n\r/]/g, " ").trim().slice(0, max);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady(url: string) {
  let lastStatus = 0;
  let lastMessage = "";

  for (let i = 0; i < 22; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      lastStatus = res.status;
      const contentType = res.headers.get("content-type") || "";

      if (res.ok && contentType.startsWith("image/")) {
        return { ready: true, status: res.status, message: "" };
      }

      const text = await res.text().catch(() => "");
      lastMessage = text.slice(0, 500);

      // Cloudinary can return 420/423 while a generative derivative is still being built.
      const pending = [420, 423, 425, 429, 502, 503].includes(res.status) || /pending|processing|try again/i.test(text);
      if (!pending) {
        let readable = text;
        try {
          const parsed = JSON.parse(text);
          readable = parsed?.error?.message || parsed?.message || parsed?.error || text;
        } catch {}
        throw new Error(String(readable || `Cloudinary returned HTTP ${res.status}`).slice(0, 260));
      }
    } catch (error: any) {
      if (i >= 21) throw error;
      lastMessage = error?.message || lastMessage;
    }

    await sleep(1250);
  }

  return { ready: false, status: lastStatus, message: lastMessage };
}

async function makeSafeRecolorSource(publicId: string) {
  // Generative recolor only supports non-transparent uploaded images. Create a
  // flattened JPEG derivative and upload it as a normal Cloudinary asset first.
  const flattenedUrl = cloudinary.url(publicId, {
    secure: true,
    format: "jpg",
    transformation: [
      { background: "white", flags: "flatten" },
      { quality: "auto:good" },
    ],
  });

  const safeId = `recolor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const uploaded: any = await cloudinary.uploader.upload(flattenedUrl, {
    resource_type: "image",
    folder: "launchforge/generative-sources",
    public_id: safeId,
    tags: ["launchforge-generative-source"],
    overwrite: true,
  });
  return uploaded.public_id as string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publicId = cleanText(body?.publicId, 240);
    const mode = String(body?.mode || "") as Mode;
    if (!publicId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });

    let url = "";
    let prompt = "";
    let label = "";
    let sourcePublicId = publicId;

    if (mode === "background") {
      prompt = cleanText(body?.prompt || "premium studio set with soft cinematic lighting", 140);
      const seed = Math.max(0, Math.min(9999, Number(body?.seed || 1)));
      url = cloudinary.url(publicId, {
        secure: true,
        transformation: [
          { effect: `gen_background_replace:prompt_${prompt};seed_${seed}` },
          { width: 1080, height: 1350, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });
      label = "Product scene";
    } else if (mode === "recolor") {
      const object = cleanText(body?.object || "product", 80);
      const color = cleanText(body?.color || "B23A48", 40).replace(/^#/, "");
      prompt = `${object} → #${color}`;
      sourcePublicId = await makeSafeRecolorSource(publicId);
      url = cloudinary.url(sourcePublicId, {
        secure: true,
        transformation: [
          { effect: `gen_recolor:prompt_${object};to-color_${color}` },
          { width: 1080, height: 1350, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });
      label = "AI colorway preview";
    } else {
      return NextResponse.json({ error: "Choose product scene or colorway mode." }, { status: 400 });
    }

    const state = await waitUntilReady(url);
    if (!state.ready) {
      return NextResponse.json({
        error: "Cloudinary is still generating this asset. Try again shortly.",
        code: "GENERATION_PENDING",
      }, { status: 425 });
    }

    return NextResponse.json({ variant: { mode, url, prompt, label, sourcePublicId } });
  } catch (error: any) {
    const msg = error?.error?.message || error?.message || "Generative transformation failed.";
    const lower = String(msg).toLowerCase();
    let friendly = msg;

    if (/subscription|entitle|not permitted|add-on|addon|403/.test(lower)) {
      friendly = "This Cloudinary generative capability is not enabled for this product environment yet. Your original product is unchanged.";
    } else if (/asia pacific|data center/.test(lower)) {
      friendly = "Generative recolor is currently unavailable in this Cloudinary data center. Your original product is unchanged.";
    } else if (/transparent|alpha/.test(lower)) {
      friendly = "Cloudinary could not recolor this source. LaunchForge already flattened a safe JPEG copy, but this asset still needs a simpler source image.";
    } else if (/success.?false/.test(lower)) {
      friendly = "Cloudinary did not produce a valid generative image for this request. Try a more specific object such as ‘shoe upper’, ‘shirt’, or ‘bag’.";
    }

    console.error("Creative Lab failed", error);
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
