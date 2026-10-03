import { NextResponse } from "next/server";

function cookieValue(cookie: string, name: string) {
  return cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookieValue(request.headers.get("cookie") || "", "ss_yt_state");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/social/youtube/callback`;

  if (!code || !state || !expectedState || state !== expectedState || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?social=youtube-error", origin));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token?.access_token) throw new Error(token?.error_description || "YouTube OAuth failed.");

    const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const channelData = await channelRes.json();
    const channel = channelData?.items?.[0];

    const response = NextResponse.redirect(new URL("/?social=youtube-connected", origin));
    const secure = origin.startsWith("https");
    response.cookies.set("ss_yt_token", token.access_token, { httpOnly: true, sameSite: "lax", secure, maxAge: token.expires_in || 3600, path: "/" });
    if (token.refresh_token) response.cookies.set("ss_yt_refresh", token.refresh_token, { httpOnly: true, sameSite: "lax", secure, maxAge: 180 * 24 * 60 * 60, path: "/" });
    response.cookies.set("ss_yt_channel", encodeURIComponent(channel?.snippet?.title || "YouTube channel"), { sameSite: "lax", secure, maxAge: 180 * 24 * 60 * 60, path: "/" });
    response.cookies.delete("ss_yt_state");
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/?social=youtube-error", origin));
  }
}
