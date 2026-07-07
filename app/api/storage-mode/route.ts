import { isLocalCaptionStorage } from "@/lib/storageMode";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    local: isLocalCaptionStorage(),
  });
}
