import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const expectedState = request.headers.get("cookie")?.match(/(?:^|; )ss_ig_state=([^;]+)/)?.[1];
  const origin = url.origin;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/social/instagram/callback`;

  if (!code || !state || !expectedState || state !== expectedState || !appId || !appSecret) {
    return NextResponse.redirect(new URL("/?social=instagram-error", origin));
  }

  try {
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData?.access_token) throw new Error(tokenData?.error_message || "Instagram token exchange failed.");

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", tokenData.access_token);
    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    const accessToken = longData?.access_token || tokenData.access_token;

    const profileRes = await fetch(`https://graph.instagram.com/me?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`);
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile?.id) throw new Error(profile?.error?.message || "Could not load Instagram profile.");

    const response = NextResponse.redirect(new URL("/?social=instagram-connected", origin));
    const secure = origin.startsWith("https");
    response.cookies.set("ss_ig_token", accessToken, { httpOnly: true, sameSite: "lax", secure, maxAge: 60 * 24 * 60 * 60, path: "/" });
    response.cookies.set("ss_ig_id", String(profile.id), { httpOnly: true, sameSite: "lax", secure, maxAge: 60 * 24 * 60 * 60, path: "/" });
    response.cookies.set("ss_ig_username", String(profile.username || "Instagram"), { sameSite: "lax", secure, maxAge: 60 * 24 * 60 * 60, path: "/" });
    response.cookies.delete("ss_ig_state");
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/?social=instagram-error", origin));
  }
}
