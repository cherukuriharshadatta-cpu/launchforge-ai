import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReelProduct = {
  publicId: string;
  name?: string;
};

function assertCloudName() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is missing from .env.local");
  }
  return cloudName;
}

function encPublicId(publicId: string) {
  // Keep folder slashes, encode each path segment safely.
  return publicId
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function zoompanTransform(style: string, duration: number) {
  const du = Math.max(4, Math.min(8, Math.round(duration || 6)));

  // Cloudinary documented syntax:
  // e_zoompan:du_7;from_(x_0.0;y_0.0;zoom_4.5);to_(x_1.0;y_1.0;zoom_1.0)
  // We keep the product near center and use moderate zoom so it stays recognizable.
  if (style === "punch") {
    return `e_zoompan:du_${du};from_(x_0.50;y_0.50;zoom_1.0);to_(x_0.50;y_0.50;zoom_2.0)`;
  }

  if (style === "luxe") {
    return `e_zoompan:du_${du};from_(x_0.44;y_0.50;zoom_1.10);to_(x_0.56;y_0.50;zoom_1.55)`;
  }

  // Cinematic push.
  return `e_zoompan:du_${du};from_(x_0.50;y_0.50;zoom_1.0);to_(x_0.52;y_0.48;zoom_1.70)`;
}

function buildVideoUrl(publicId: string, style: string, duration: number) {
  const cloudName = assertCloudName();
  const motion = zoompanTransform(style, duration);

  // IMPORTANT:
  // 1) zoompan comes first on the IMAGE.
  // 2) after that Cloudinary is producing video frames, so we only apply
  //    ordinary video-safe scaling/padding.
  // 3) no g_auto, no q_auto/f_auto before zoompan.
  const after = "c_pad,w_720,h_1280,b_rgb:f5f4f1";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${motion}/${after}/${encPublicId(publicId)}.mp4`;
}

async function verifyVideo(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Range: "bytes=0-1023" },
    cache: "no-store",
  });

  if (!response.ok && response.status !== 206) {
    const cldError = response.headers.get("x-cld-error");
    throw new Error(
      cldError
        ? `Cloudinary video error: ${cldError}`
        : `Cloudinary video returned HTTP ${response.status}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mode = body?.mode === "campaign" ? "campaign" : "single";
    const style = ["cinematic", "punch", "luxe"].includes(body?.style)
      ? body.style
      : "cinematic";
    const duration = Number(body?.duration) || 6;
    const products = (Array.isArray(body?.products) ? body.products : []) as ReelProduct[];

    if (!products.length || !products[0]?.publicId) {
      return NextResponse.json(
        { error: "Choose a product first." },
        { status: 400 }
      );
    }

    // Submission-safe: single product is the reliable, polished path.
    // Campaign mode returns videos for each selected product rather than
    // forcing unrelated products into one slideshow.
    if (mode === "campaign") {
      const selected = products.filter((p) => p?.publicId).slice(0, 5);
      const clips = [];

      for (const product of selected) {
        const url = buildVideoUrl(product.publicId, style, duration);
        await verifyVideo(url);
        clips.push({
          url,
          publicId: product.publicId,
          name: product.name || "Product",
          style,
          durationEstimate: duration,
          mode: "single",
        });
      }

      return NextResponse.json({
        clips,
        reel: clips[0] || null,
      });
    }

    const product = products[0];
    const url = buildVideoUrl(product.publicId, style, duration);
    await verifyVideo(url);

    return NextResponse.json({
      reel: {
        url,
        publicId: product.publicId,
        name: product.name || "Product",
        format: "mp4",
        durationEstimate: duration,
        style,
        mode: "single",
      },
    });
  } catch (error: any) {
    console.error("LaunchForge reel generation failed:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not generate the product video.",
      },
      { status: 500 }
    );
  }
}
