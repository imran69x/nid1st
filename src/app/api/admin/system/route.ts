import { NextRequest, NextResponse } from "next/server";
import { readSystemConfig, writeSystemConfig } from "@/lib/server/store";

export async function GET() {
  try {
    const config = await readSystemConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    console.error("[System Config GET] Error:", err);
    return NextResponse.json(
      { scanningEnabled: true, noticeMessage: "System operational." },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await readSystemConfig();

    if (typeof body.scanningEnabled === "boolean") {
      config.scanningEnabled = body.scanningEnabled;
    }
    if (typeof body.allowUserDeleteRecent === "boolean") {
      config.allowUserDeleteRecent = body.allowUserDeleteRecent;
    }
    if (typeof body.hideRecentScans === "boolean") {
      config.hideRecentScans = body.hideRecentScans;
    }
    if (body.noticeMessage !== undefined) {
      config.noticeMessage = body.noticeMessage;
    }

    await writeSystemConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error("[System Config POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update system config" },
      { status: 500 }
    );
  }
}
