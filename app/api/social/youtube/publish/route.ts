import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function cookieValue(cookie: string, name: string) {
  return cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are missing.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (!res.ok || !data?.access_token) throw new Error(data?.error_description || "Could not refresh YouTube access.");
  return data.access_token as string;
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  let accessToken = cookieValue(cookie, "ss_yt_token");
  const refreshToken = cookieValue(cookie, "ss_yt_refresh");
  if (!accessToken && refreshToken) accessToken = await refreshAccessToken(refreshToken);
  if (!accessToken) return NextResponse.json({ error: "Connect YouTube first." }, { status: 401 });

  try {
    const body = await request.json();
    const videoUrl = String(body?.videoUrl || "");
    const title = String(body?.title || "LaunchForge product video").slice(0, 100);
    const description = String(body?.description || "Created with LaunchForge AI").slice(0, 5000);
    if (!videoUrl.startsWith("https://")) return NextResponse.json({ error: "A public HTTPS video URL is required." }, { status: 400 });

    const mediaRes = await fetch(videoUrl);
    if (!mediaRes.ok) throw new Error("Could not download the generated video for YouTube upload.");
    const media = Buffer.from(await mediaRes.arrayBuffer());

    const boundary = `launchforge_${Date.now()}`;
    const metadata = JSON.stringify({
      snippet: { title, description, categoryId: "22" },
      // Unverified API projects are restricted to private uploads by YouTube.
      status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
    });

    const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipart = Buffer.concat([prefix, media, suffix]);

    const uploadRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(multipart.length),
      },
      body: multipart,
    });
    const data = await uploadRes.json();
    if (!uploadRes.ok || !data?.id) throw new Error(data?.error?.message || "YouTube upload failed.");

    return NextResponse.json({ ok: true, id: data.id, privacyStatus: data?.status?.privacyStatus || "private" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube upload failed." }, { status: 500 });
  }
}
