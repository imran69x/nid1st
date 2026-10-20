import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { incrementUserScanCount, findUserById, findUserByUsername } from "@/lib/server/store";

export const maxDuration = 60; // 60 seconds max timeout for Vercel/Next.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, images, mimeType = "image/jpeg", userId, username } = body;

    // Check if user is locked/blocked
    if (userId || username) {
      let targetUser = userId ? await findUserById(userId) : null;
      if (!targetUser && username) {
        targetUser = await findUserByUsername(username);
      }
      if (targetUser && targetUser.isBlocked) {
        return NextResponse.json(
          { error: "Your account is locked. Please contact developer." },
          { status: 403 }
        );
      }
    }

    const imageList: string[] = images && Array.isArray(images) ? images : image ? [image] : [];

    if (imageList.length === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use gemini-3.5-flash-lite as verified working on the free tier
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const results = [];

    for (let i = 0; i < imageList.length; i++) {
      const rawImg = imageList[i];
      // Strip data url prefix if present
      const base64Data = rawImg.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      const prompt = `
You are an expert OCR and document data extractor specializing in Bangladeshi National Identity Cards (NID Smart Card and Old Laminated Cards) and Bangladesh Digital Birth Registration Certificates (জন্ম নিবন্ধন সনদ).

Analyze the provided image and extract the following information accurately.
Return ONLY a valid, raw JSON object (do not wrap in markdown \`\`\`json fences, just plain JSON).

Schema:
{
  "docType": "nid" or "birth_certificate",
  "nameBangla": "Full name in Bengali exactly as written",
  "nameEnglish": "Full name in English (ALL CAPS). If English name is not written on the card, transliterate the Bengali name accurately into standard Bangladeshi English. CRITICAL RULES: 'মোছাঃ' or 'মোসাঃ' MUST be 'MST.' (e.g. 'মোছাঃ রেহানা খাতুন' -> 'MST. REHANA KHATUN', NEVER use 'MOSA:'). 'মোঃ' or 'মুঃ' MUST be 'MD.' (e.g. 'মোঃ রফিকুল ইসলাম' -> 'MD. RAFIQUL ISLAM'). 'বেগম' -> 'BEGUM', 'খাতুন' -> 'KHATUN'.",
  "fatherNameBangla": "Father's name in Bengali",
  "fatherNameEnglish": "Father's name in English (ALL CAPS). CRITICAL: If English father name is NOT printed on the card (common in old NIDs and birth certificates), you MUST transliterate the Bengali father name accurately into standard Bangladeshi English (e.g. 'মোঃ আব্দুল জলিল' -> 'MD. ABDUL JALIL'). NEVER leave it blank if Bengali father name exists!",
  "motherNameBangla": "Mother's name in Bengali",
  "motherNameEnglish": "Mother's name in English (ALL CAPS). CRITICAL: If English mother name is NOT printed on the card, you MUST transliterate the Bengali mother name accurately into standard Bangladeshi English (e.g. 'মোছাঃ রেহানা খাতুন' -> 'MST. REHANA KHATUN'). NEVER leave it blank if Bengali mother name exists!",
  "nidNumber": "The 10-digit Smart Card NID number, 13-digit old NID number, 17-digit old NID number, or 17-digit Birth Certificate Registration Number. Clean digits only, convert Bengali digits (০-৯) to English (0-9).",
  "dateOfBirth": "Date of birth strictly formatted as DD-MM-YYYY (e.g., '10 Jan 2001' or '10/01/2001' or '১০ জানু ২০০১' MUST be '10-01-2001'). Always 2-digit day, 2-digit month, 4-digit year."
}

Rules:
1. Do not invent numbers. Extract the exact NID or Birth Registration number.
2. Date of birth MUST be formatted as DD-MM-YYYY.
3. For names where English is missing on the document, follow standard official Bangladeshi transliteration (মোছাঃ/মোসাঃ -> MST., মোঃ -> MD.).
4. Return ONLY valid JSON.
`;

      // Active working Gemini models verified for this API key
      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest"];
      let parsed = null;
      let lastError: any = null;

      for (const mName of candidateModels) {
        // Try up to 2 attempts per model to gracefully handle temporary 429 rate limits or 503 spikes
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const response = await model.generateContent([
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              prompt,
            ]);

            const rawText = response.response.text().trim();
            const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
            parsed = JSON.parse(cleanedJson);
            break; // successfully parsed
          } catch (mErr: any) {
            lastError = mErr;
            const errMsg = mErr?.message || "";
            const isRetryable = errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("RESOURCE_EXHAUSTED");

            if (isRetryable && attempt < 2) {
              console.warn(`Model ${mName} temporarily busy (attempt ${attempt}), waiting 1.5s...`);
              await new Promise((r) => setTimeout(r, 1500));
            } else {
              console.warn(`Model ${mName} failed:`, errMsg);
              break; // try next candidate model
            }
          }
        }
        if (parsed) break;
      }


      if (parsed) {
        // Normalize DOB to DD-MM-YYYY format just in case
        if (parsed.dateOfBirth) {
          parsed.dateOfBirth = normalizeDateString(parsed.dateOfBirth);
        }

        // Clean NID number digits
        if (parsed.nidNumber) {
          parsed.nidNumber = parsed.nidNumber.replace(/[^\d]/g, "");
        }

        results.push({
          memberIndex: i + 1,
          ...parsed,
        });
      } else {
        console.error(`All OCR models failed for image ${i + 1}:`, lastError);
        results.push({
          memberIndex: i + 1,
          docType: "nid",
          nameBangla: "",
          nameEnglish: "",
          fatherNameBangla: "",
          fatherNameEnglish: "",
          motherNameBangla: "",
          motherNameEnglish: "",
          nidNumber: "",
          dateOfBirth: "",
          error: lastError?.message || "Service temporarily busy, please retry in a moment.",
        });
      }
    }

    // Increment scan count strictly by 1 per scan operation (not per card count)
    const shouldIncrement = body.shouldIncrement !== undefined ? Boolean(body.shouldIncrement) : true;
    if (shouldIncrement && (userId || username)) {
      try {
        await incrementUserScanCount(userId || username, 1);
      } catch (e) {
        console.warn("Failed to increment scan count:", e);
      }
    }

    return NextResponse.json({
      success: true,
      members: results,
    });
  } catch (err: any) {
    console.error("API Error in /api/ocr:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error during OCR processing" },
      { status: 500 }
    );
  }
}

function normalizeDateString(dateStr: string): string {
  if (!dateStr) return "";
  // Check if already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

  // DD/MM/YYYY or DD.MM.YYYY
  const parts = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (parts) {
    const d = parts[1].padStart(2, "0");
    const m = parts[2].padStart(2, "0");
    const y = parts[3];
    return `${d}-${m}-${y}`;
  }

  // YYYY-MM-DD
  const isoParts = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoParts) {
    const y = isoParts[1];
    const m = isoParts[2].padStart(2, "0");
    const d = isoParts[3].padStart(2, "0");
    return `${d}-${m}-${y}`;
  }

  return dateStr;
}
