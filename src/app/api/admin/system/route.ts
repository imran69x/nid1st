import { NextRequest, NextResponse } from "next/server";
import { readSystemConfig, writeSystemConfig } from "@/lib/server/store";

export async function GET() {
  const config = readSystemConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = readSystemConfig();

    if (typeof body.scanningEnabled === "boolean") {
      config.scanningEnabled = body.scanningEnabled;
    }
    if (body.noticeMessage) {
      config.noticeMessage = body.noticeMessage;
    }

    writeSystemConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update system config" },
      { status: 500 }
    );
  }
}
