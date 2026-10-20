import { NextRequest, NextResponse } from "next/server";
import { findUserById, findUserByUsername, writeUser } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  try {
    const { userId, profilePic } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (!profilePic || typeof profilePic !== "string") {
      return NextResponse.json({ error: "Profile picture data is required." }, { status: 400 });
    }

    let targetUser = await findUserById(userId);
    if (!targetUser) {
      targetUser = await findUserByUsername(userId);
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.isBlocked) {
      return NextResponse.json({ error: "Account is locked." }, { status: 403 });
    }

    // Constraint: Regular users can only change their profile picture ONCE.
    // Admin has unlimited changes.
    if (!targetUser.isAdmin && targetUser.profilePicChangedByUser) {
      return NextResponse.json(
        {
          error:
            "আপনি ইতিমধ্যে ১ বার প্রোফাইল ছবি পরিবর্তন করেছেন। আরও পরিবর্তনের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।",
        },
        { status: 403 }
      );
    }

    // Mark that regular user has used their 1-time change
    if (!targetUser.isAdmin) {
      targetUser.profilePicChangedByUser = true;
    }

    targetUser.profilePic = profilePic;
    await writeUser(targetUser);

    return NextResponse.json({
      success: true,
      message: "প্রোফাইল ছবি সফলভাবে পরিবর্তিত হয়েছে!",
      user: targetUser,
    });
  } catch (err: any) {
    console.error("[User Profile POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile picture" },
      { status: 500 }
    );
  }
}
