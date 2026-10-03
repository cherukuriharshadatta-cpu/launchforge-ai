import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const get = (name: string) => cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
  const connected = Boolean(get("ss_yt_token") || get("ss_yt_refresh"));
  return NextResponse.json({ connected, channel: decodeURIComponent(get("ss_yt_channel") || "") });
}
