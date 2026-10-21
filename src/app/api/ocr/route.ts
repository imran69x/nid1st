import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { incrementUserScanCount, findUserById, findUserByUsername } from "@/lib/server/store";
import { sanitizeExtractedDocument } from "@/lib/ocr/nidSanitizer";

export const maxDuration = 60; // 60 seconds max timeout for Vercel/Next.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `You are an elite optical character recognition (OCR) and document intelligence system specialized in Bangladeshi National Identity Cards (Smart Cards and Old Laminated Cards) and Bangladesh Digital Birth Registration Certificates (ডিজিটাল জন্ম নিবন্ধন সনদ).

Your objective is to read every character on the document with maximum fidelity, accurately recognizing Bengali letters, conjunct consonants (যুক্তবর্ণ), diacritics, honorifics, numbers, and dates.`;

const EXTRACTION_PROMPT = `
Analyze the provided document image (Bangladeshi Smart NID, Old NID Card, or Digital Birth Registration Certificate) and extract the required fields.

The image might be rotated (90°, 180°, 270°) or captured at an angle. Auto-detect its orientation and extract all text in its natural orientation.

Return ONLY a valid JSON object matching this schema:
{
  "docType": "nid" or "birth_certificate",
  "nameBangla": "Exact full name in Bengali without any label prefix like 'নাম:' or 'নামঃ'",
  "nameEnglish": "Full name in English in ALL CAPS. If English name is not written, transliterate the Bengali name accurately into standard Bangladeshi English.",
  "fatherNameBangla": "Father's name in Bengali. DO NOT include label prefix ('পিতা:', 'পিতার নাম:') and DO NOT include nationality ('বাংলাদেশী')",
  "fatherNameEnglish": "Father's name in English in ALL CAPS. If not written on card (e.g. Smart NID), transliterate the Bengali father name into standard Bangladeshi English. NEVER leave blank if Bengali father name exists!",
  "motherNameBangla": "Mother's name in Bengali. DO NOT include label prefix ('মাতা:', 'মাতার নাম:') and DO NOT include nationality ('বাংলাদেশী')",
  "motherNameEnglish": "Mother's name in English in ALL CAPS. If not written on card (e.g. Smart NID), transliterate the Bengali mother name into standard Bangladeshi English. NEVER leave blank if Bengali mother name exists!",
  "nidNumber": "10-digit Smart Card NID, 13/17-digit old NID, or 17-digit Birth Certificate number. Clean digits only, convert Bengali digits (০-৯) to Arabic digits (0-9).",
  "dateOfBirth": "Date of birth strictly formatted as DD-MM-YYYY (e.g. '15-10-1990'). In Bangladesh official documents, day ALWAYS precedes month (DD-MM-YYYY), NEVER MM-DD-YYYY. Convert Bengali months and numerals to English."
}

CRITICAL RULES FOR ACCURACY:
1. NAME AND HONORIFIC STANDARDIZATION:
   - 'মোছাঃ' or 'মোসাঃ' in Bengali MUST be 'MST.' in English (e.g. 'মোছাঃ রেহানা খাতুন' -> 'MST. REHANA KHATUN'). NEVER output 'MOSA:'.
   - 'মোঃ' or 'মুঃ' in Bengali MUST be 'MD.' in English (e.g. 'মোঃ রফিকুল ইসলাম' -> 'MD. RAFIQUL ISLAM'). NEVER output 'MD:'.
   - 'বেগম' -> 'BEGUM', 'খাতুন' -> 'KHATUN', 'আক্তার' -> 'AKTER', 'চৌধুরী' -> 'CHOWDHURY', 'হোসেন' -> 'HOSSAIN', 'হক' -> 'HAQUE', 'উদ্দিন' -> 'UDDIN'.

2. FATHER & MOTHER'S NAMES:
   - For NID Smart Cards, English father and mother names are NOT printed on the card front. You MUST transliterate the Bengali father and mother names into standard Bangladeshi English (ALL CAPS).
   - In Digital Birth Certificates, Bengali is on the left and English is on the right. Immediately below the name is 'জাতীয়তা: বাংলাদেশী' / 'Nationality: Bangladeshi'. NEVER include 'বাংলাদেশী' or 'Bangladeshi' inside father or mother names!
   - Exclude markers like '(মৃত)' or '(Late)'.

3. DATE OF BIRTH:
   - MUST be formatted strictly as DD-MM-YYYY (2-digit day, 2-digit month, 4-digit year).
   - If written as '10 Jan 1995' or '১০ জানুয়ারি ১৯৯৫', format as '10-01-1995'.
   - If written as numeric '05/08/1990', in Bangladesh this ALWAYS means 5th of August 1990 ('05-08-1990'), NOT May 8th!
   - In birth certificates, ignore the written Bengali words under the numbers (e.g. 'পাঁচই আগস্ট...'), extract the numeric date.

4. NID / BIRTH REGISTRATION NUMBER:
   - Clean digits only.
   - Smart Card = 10 digits. Old NID = 13 or 17 digits. Birth Certificate = 17 digits.
`;

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

    // Active verified models on this API key (flash-lite gives ~1s response time and high reliability)
    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash",
    ];

    const results = [];

    for (let i = 0; i < imageList.length; i++) {
      const rawImg = imageList[i];
      // Strip data url prefix if present
      const base64Data = rawImg.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      let parsed: any = null;
      let lastError: any = null;

      for (const mName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const model = genAI.getGenerativeModel({
              model: mName,
              systemInstruction: SYSTEM_INSTRUCTION,
              generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                responseMimeType: "application/json",
              },
            });

            const response = await model.generateContent([
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              EXTRACTION_PROMPT,
            ]);

            const rawText = response.response.text().trim();
            let jsonString = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const objMatch = rawText.match(/\{[\s\S]*\}/);
            const arrMatch = rawText.match(/\[[\s\S]*\]/);
            if (objMatch && (!arrMatch || (objMatch.index ?? 0) <= (arrMatch.index ?? 0))) {
              jsonString = objMatch[0];
            } else if (arrMatch) {
              jsonString = arrMatch[0];
            }
            let rawParsed = JSON.parse(jsonString);
            parsed = Array.isArray(rawParsed) ? (rawParsed[0] || {}) : rawParsed;
            break; // successfully parsed
          } catch (mErr: any) {
            lastError = mErr;
            const errMsg = mErr?.message || "";
            const isRetryable =
              errMsg.includes("429") ||
              errMsg.includes("503") ||
              errMsg.includes("RESOURCE_EXHAUSTED");

            if (isRetryable && attempt < 2) {
              console.warn(`Model ${mName} temporarily busy (attempt ${attempt}), waiting 1.2s...`);
              await new Promise((r) => setTimeout(r, 1200));
            } else {
              console.warn(`Model ${mName} failed:`, errMsg);
              break; // try next candidate model
            }
          }
        }
        if (parsed) break;
      }

      if (parsed) {
        // High-accuracy sanitization and auto-completion pipeline
        const sanitized = sanitizeExtractedDocument(parsed);

        results.push({
          memberIndex: i + 1,
          ...sanitized,
        });
      } else {
        console.error(`All OCR models failed for image ${i + 1}:`, lastError);
        results.push({
          memberIndex: i + 1,
          docType: "nid" as const,
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
