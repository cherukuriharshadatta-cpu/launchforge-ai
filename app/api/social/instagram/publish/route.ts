import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function cookieValue(cookie: string, name: string) {
  return cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookieValue(cookie, "ss_ig_token");
  const userId = cookieValue(cookie, "ss_ig_id");
  const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
  if (!token || !userId) return NextResponse.json({ error: "Connect Instagram first." }, { status: 401 });

  try {
    const body = await request.json();
    const videoUrl = String(body?.videoUrl || "");
    const caption = String(body?.caption || "").slice(0, 2200);
    if (!videoUrl.startsWith("https://")) return NextResponse.json({ error: "A public HTTPS video URL is required." }, { status: 400 });

    const createBody = new URLSearchParams({ media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true", access_token: token });
    const createRes = await fetch(`https://graph.instagram.com/${graphVersion}/${userId}/media`, { method: "POST", body: createBody });
    const createData = await createRes.json();
    if (!createRes.ok || !createData?.id) throw new Error(createData?.error?.message || "Instagram could not create the Reel container.");

    const containerId = createData.id;
    let ready = false;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`https://graph.instagram.com/${graphVersion}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
      const statusData = await statusRes.json();
      if (statusData?.status_code === "FINISHED") { ready = true; break; }
      if (statusData?.status_code === "ERROR") throw new Error(statusData?.status || "Instagram video processing failed.");
    }
    if (!ready) return NextResponse.json({ error: "Instagram is still processing the video. Try Publish again in a few seconds." }, { status: 409 });

    const publishBody = new URLSearchParams({ creation_id: containerId, access_token: token });
    const publishRes = await fetch(`https://graph.instagram.com/${graphVersion}/${userId}/media_publish`, { method: "POST", body: publishBody });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData?.id) throw new Error(publishData?.error?.message || "Instagram publish failed.");

    return NextResponse.json({ ok: true, id: publishData.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Instagram publish failed." }, { status: 500 });
  }
}
