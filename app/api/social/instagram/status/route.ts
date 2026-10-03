import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const get = (name: string) => cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
  const connected = Boolean(get("ss_ig_token") && get("ss_ig_id"));
  return NextResponse.json({ connected, username: decodeURIComponent(get("ss_ig_username") || "") });
}
