import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) return NextResponse.redirect(new URL("/?social=instagram-not-configured", request.url));

  const origin = new URL(request.url).origin;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/social/instagram/callback`;
  const state = crypto.randomBytes(24).toString("hex");

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("force_reauth", "true");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("ss_ig_state", state, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), maxAge: 600, path: "/" });
  return response;
}
