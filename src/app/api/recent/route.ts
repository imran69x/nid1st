import { NextRequest, NextResponse } from "next/server";
import {
  readRecentScans,
  saveRecentScan,
  deleteRecentScan,
  deleteRecentScansForUser,
  readSystemConfig,
  findUserById,
  findUserByUsername,
} from "@/lib/server/store";
import { RecentScanRecord } from "@/types/user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch recent scan records
// PRIVACY RULE:
// 1. In Personal Recent Scans page (/recent), any user (including Admin) ONLY sees their own scans.
// 2. In Admin Panel (all=true), Admin can see ALL users' scans or filter by user.
// 3. If hideRecentScans is enabled, regular users cannot access scans.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callerId = searchParams.get("callerId") || "";
    const filterUserId = searchParams.get("userId") || "";
    const showAll = searchParams.get("all") === "true";

    // Determine caller identity
    let caller = callerId ? await findUserById(callerId) : null;
    if (!caller && callerId) {
      caller = await findUserByUsername(callerId);
    }

    const config = await readSystemConfig();

    // If recent scans is hidden by admin and caller is not admin
    if (config.hideRecentScans && !caller?.isAdmin) {
      return NextResponse.json({
        success: true,
        scans: [],
        hidden: true,
        message: "রিসেন্ট স্ক্যান বর্তমানে অ্যাডমিন কর্তৃক বন্ধ রাখা হয়েছে।",
      });
    }

    const scans = await readRecentScans(500);

    // 1. Admin Panel Master Request: all=true allows admin to see all scans or filter by any user
    if (caller?.isAdmin && showAll) {
      if (filterUserId && filterUserId !== "all") {
        const cleanFilter = filterUserId.toLowerCase();
        const filtered = scans.filter(
          (s) =>
            (s.userId && s.userId.toLowerCase() === cleanFilter) ||
            (s.username && s.username.toLowerCase() === cleanFilter)
        );
        return NextResponse.json({ success: true, scans: filtered, isAdmin: true });
      }
      return NextResponse.json({ success: true, scans, isAdmin: true });
    }

    // 2. Personal Recent Scans view (/recent from sidebar/header):
    // Even if Admin, only show scans scanned with THIS logged-in ID!
    const selfTarget = (caller?.username || caller?.id || filterUserId || callerId).toLowerCase();
    if (!selfTarget) {
      return NextResponse.json({ success: true, scans: [], isAdmin: Boolean(caller?.isAdmin) });
    }

    const userOnlyScans = scans.filter(
      (s) =>
        (s.userId && s.userId.toLowerCase() === selfTarget) ||
        (s.username && s.username.toLowerCase() === selfTarget)
    );

    return NextResponse.json({
      success: true,
      scans: userOnlyScans,
      isAdmin: Boolean(caller?.isAdmin),
    });
  } catch (err: any) {
    console.error("[Recent Scans GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch recent scans" },
      { status: 500 }
    );
  }
}

// POST: Save or update a recent scan record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      members = [],
      userId = "",
      username = "",
      userDisplayName = "",
    } = body;

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "Scan record must contain at least one member" },
        { status: 400 }
      );
    }

    // Determine title from first card's name
    const firstMember = members[0] || {};
    const computedTitle =
      title && title.trim() !== "NID Document" && title.trim() !== ""
        ? title.trim()
        : firstMember.nameBangla ||
          firstMember.nameEnglish ||
          firstMember.nidNumber ||
          "NID Scan";

    const recordId =
      id || "scan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const record: RecentScanRecord = {
      id: recordId,
      title: computedTitle,
      userId,
      username,
      userDisplayName: userDisplayName || username,
      createdAt: Date.now(),
      totalMembers: members.length,
      members,
    };

    await saveRecentScan(record);

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error("[Recent Scans POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save recent scan" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a recent scan or all scans for a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("id");
    const callerId = searchParams.get("callerId") || searchParams.get("adminUserId") || "";
    const targetUserId = searchParams.get("clearUser"); // if admin wants to delete all scans for a user

    // Verify caller credentials
    let caller = callerId ? await findUserById(callerId) : null;
    if (!caller && callerId) {
      caller = await findUserByUsername(callerId);
    }

    const config = await readSystemConfig();
    const isCallerAdmin = Boolean(caller?.isAdmin);
    // Allowed if Admin, or if global allowUserDeleteRecent is enabled, or if this user is individually approved
    const hasPermission =
      isCallerAdmin ||
      Boolean(config.allowUserDeleteRecent) ||
      Boolean(caller?.canDeleteRecent);

    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Permission denied. You do not have permission to delete recent scans. (এডমিনের অনুমতি প্রয়োজন)",
        },
        { status: 403 }
      );
    }

    // Action 1: Delete all scans for a specific user
    if (targetUserId) {
      if (!isCallerAdmin && caller?.username !== targetUserId && caller?.id !== targetUserId) {
        return NextResponse.json(
          { error: "You can only delete your own scans" },
          { status: 403 }
        );
      }
      const count = await deleteRecentScansForUser(targetUserId);
      return NextResponse.json({
        success: true,
        message: `Deleted ${count} scan(s) for user`,
        deletedCount: count,
      });
    }

    // Action 2: Delete a single scan by ID
    if (!scanId) {
      return NextResponse.json({ error: "Scan ID is required" }, { status: 400 });
    }

    await deleteRecentScan(scanId);

    return NextResponse.json({
      success: true,
      message: "Recent scan record removed successfully",
    });
  } catch (err: any) {
    console.error("[Recent Scans DELETE] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete recent scan" },
      { status: 500 }
    );
  }
}
