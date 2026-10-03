import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
export const runtime="nodejs";
export async function POST(request:Request){
  try{ const {publicId}=await request.json(); if(!publicId) return NextResponse.json({error:"Missing publicId"},{status:400}); await cloudinary.uploader.destroy(String(publicId),{resource_type:"image",invalidate:true}); return NextResponse.json({ok:true}); }
  catch(error:any){ return NextResponse.json({error:error?.error?.message||error?.message||"Delete failed"},{status:500}); }
}
