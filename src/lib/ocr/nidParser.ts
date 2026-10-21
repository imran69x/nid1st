import { ExtractedNIDFields, OCRResult } from "@/types/nid";
import { isValidCalendarDate } from "../validation/nidSchema";
import { sanitizeExtractedDocument } from "./nidSanitizer";

/**
 * Bengali to English digit translation map
 */
const BENGALI_TO_ENGLISH_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * Convert Bengali digits to standard Arabic digits
 */
export function convertBengaliDigitsToEnglish(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => BENGALI_TO_ENGLISH_DIGITS[digit] || digit);
}

/**
 * Checks if a string contains Bengali Unicode characters
 */
export function hasBengaliCharacters(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * Checks if a string contains Latin English characters
 */
export function hasEnglishCharacters(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Month mappings for Bengali and English months
 */
const MONTH_MAP: Record<string, string> = {
  // English
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
  // Bengali
  "জানু": "01",
  "জানুয়ারী": "01",
  "জানুয়ারি": "01",
  "ফেব্রু": "02",
  "ফেব্রুয়ারী": "02",
  "ফেব্রুয়ারি": "02",
  "মার্চ": "03",
  "এপ্রিল": "04",
  "মে": "05",
  "জুন": "06",
  "জুলা": "07",
  "জুলাই": "07",
  "আগ": "08",
  "আগস্ট": "08",
  "সেপ্টে": "09",
  "সেপ্টেম্বর": "09",
  "অক্টো": "10",
  "অক্টোবর": "10",
  "নভে": "11",
  "নভেম্বর": "11",
  "ডিসে": "12",
  "ডিসেম্বর": "12",
};

/**
 * Parse and normalize date into DD-MM-YYYY format
 */
export function normalizeDateOfBirth(rawText: string): string {
  const converted = convertBengaliDigitsToEnglish(rawText);

  // Pattern 1: DD Month YYYY (e.g. 05 Oct 1994, 12 জানু ১৯৮৫)
  const monthNameMatch = converted.match(/(\d{1,2})\s+([A-Za-z\u0980-\u09FF]{3,10})[,\s]+(\d{4})/);
  if (monthNameMatch) {
    const rawDay = parseInt(monthNameMatch[1], 10);
    const monthKey = monthNameMatch[2].toLowerCase();
    const rawYear = parseInt(monthNameMatch[3], 10);

    const monthNumStr = MONTH_MAP[monthKey];
    if (monthNumStr) {
      const monthNum = parseInt(monthNumStr, 10);
      if (isValidCalendarDate(rawDay, monthNum, rawYear)) {
        const dd = rawDay < 10 ? `0${rawDay}` : `${rawDay}`;
        return `${dd}-${monthNumStr}-${rawYear}`;
      }
    }
  }

  // Pattern 2: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const numericMatch = converted.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (numericMatch) {
    const rawDay = parseInt(numericMatch[1], 10);
    const rawMonth = parseInt(numericMatch[2], 10);
    const rawYear = parseInt(numericMatch[3], 10);

    if (isValidCalendarDate(rawDay, rawMonth, rawYear)) {
      const dd = rawDay < 10 ? `0${rawDay}` : `${rawDay}`;
      const mm = rawMonth < 10 ? `0${rawMonth}` : `${rawMonth}`;
      return `${dd}-${mm}-${rawYear}`;
    }
  }

  // Pattern 3: YYYY-MM-DD (ISO format)
  const isoMatch = converted.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const rawYear = parseInt(isoMatch[1], 10);
    const rawMonth = parseInt(isoMatch[2], 10);
    const rawDay = parseInt(isoMatch[3], 10);

    if (isValidCalendarDate(rawDay, rawMonth, rawYear)) {
      const dd = rawDay < 10 ? `0${rawDay}` : `${rawDay}`;
      const mm = rawMonth < 10 ? `0${rawMonth}` : `${rawMonth}`;
      return `${dd}-${mm}-${rawYear}`;
    }
  }

  return "";
}

/**
 * Filter out boilerplate header text
 */
function isBoilerplateHeader(line: string): boolean {
  const normalized = line.toLowerCase();
  const boilerplateTerms = [
    "government of the people",
    "peoples republic of bangladesh",
    "republic of bangladesh",
    "national id card",
    "national identity card",
    "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার",
    "জাতীয় পরিচয়পত্র",
    "পরিচয়পত্র",
    "signature",
    "স্বাক্ষর",
    "প্রদানকারী",
    "কার্ড",
  ];
  return boilerplateTerms.some((term) => normalized.includes(term));
}

/**
 * Cleans extracted name values
 */
function cleanExtractedValue(val: string): string {
  return val
    .replace(/^[:;.,\-\s|]+/, "")
    .replace(/[:;.,\-\s|]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parses raw OCR text into Bangladesh NID fields
 */
export function parseBangladeshNIDText(rawText: string, ocrConfidence = 80): OCRResult {
  const startTime = Date.now();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const fields: ExtractedNIDFields = {
    nameBangla: "",
    nameEnglish: "",
    fatherNameBangla: "",
    fatherNameEnglish: "",
    motherNameBangla: "",
    motherNameEnglish: "",
    nidNumber: "",
    dateOfBirth: "",
  };

  const fieldConfidence: Record<keyof ExtractedNIDFields, number> = {
    nameBangla: 0,
    nameEnglish: 0,
    fatherNameBangla: 0,
    fatherNameEnglish: 0,
    motherNameBangla: 0,
    motherNameEnglish: 0,
    nidNumber: 0,
    dateOfBirth: 0,
  };

  // Convert all lines to search for NID number and DOB globally
  const allTextConverted = convertBengaliDigitsToEnglish(rawText);

  // 1. EXTRACT NID NUMBER
  // Standard NID lengths: 10 (smart card), 13 (old), 17 (old with birth year)
  // Look for keywords: "NID No", "ID NO", "NO:", "NID", or standalone 10/13/17 digits
  const nidRegex = /(?:NID\s*(?:NO|No|no)?|ID\s*(?:NO|No|no)?|জাতীয়\s*পরিচয়\s*নম্বর|নম্বর)\s*[:.\s-]*([0-9\s]{10,22})/i;
  const nidMatch = allTextConverted.match(nidRegex);
  if (nidMatch) {
    const candidate = nidMatch[1].replace(/\s+/g, "");
    if (/^(\d{10}|\d{13}|\d{17})$/.test(candidate)) {
      fields.nidNumber = candidate;
      fieldConfidence.nidNumber = 95;
    }
  }

  // If keyword didn't catch it, scan lines for standalone 10, 13, or 17 digit sequence
  if (!fields.nidNumber) {
    for (const line of lines) {
      const lineConv = convertBengaliDigitsToEnglish(line).replace(/[^\d]/g, "");
      if (/^(\d{10}|\d{13}|\d{17})$/.test(lineConv)) {
        fields.nidNumber = lineConv;
        fieldConfidence.nidNumber = 85;
        break;
      }
    }
  }

  // 2. EXTRACT DATE OF BIRTH
  const dobRegex = /(?:Date of Birth|DOB|জন্ম\s*তারিখ|তারিখ)\s*[:.\s-]*([A-Za-z0-9\u0980-\u09FF\s,.\/-]{6,25})/i;
  const dobMatch = rawText.match(dobRegex);
  if (dobMatch) {
    const parsedDob = normalizeDateOfBirth(dobMatch[1]);
    if (parsedDob) {
      fields.dateOfBirth = parsedDob;
      fieldConfidence.dateOfBirth = 95;
    }
  }

  // Fallback scan for date on lines containing date patterns
  if (!fields.dateOfBirth) {
    for (const line of lines) {
      const parsedDob = normalizeDateOfBirth(line);
      if (parsedDob) {
        fields.dateOfBirth = parsedDob;
        fieldConfidence.dateOfBirth = 80;
        break;
      }
    }
  }

  // 3. EXTRACT NAMES AND FAMILY FIELDS LINE-BY-LINE
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBoilerplateHeader(line)) continue;

    // --- BANGLA NAME ---
    // Often follows "নাম:" or "নাম"
    if (/^(নাম|নামঃ|নাম:)\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:নাম|নামঃ|নাম:)\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasBengaliCharacters(val)) {
          fields.nameBangla = val;
          fieldConfidence.nameBangla = 90;
        }
      }
    } else if (line === "নাম" || line === "নাম:" || line === "নামঃ") {
      // Value might be on the next line
      if (i + 1 < lines.length && hasBengaliCharacters(lines[i + 1]) && !isBoilerplateHeader(lines[i + 1])) {
        fields.nameBangla = cleanExtractedValue(lines[i + 1]);
        fieldConfidence.nameBangla = 85;
      }
    }

    // --- ENGLISH NAME ---
    // Often follows "Name:" or "Name"
    if (/^Name\s*[:.\-]\s*(.+)/i.test(line)) {
      const match = line.match(/^Name\s*[:.\-]\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasEnglishCharacters(val) && !/date of birth/i.test(val)) {
          fields.nameEnglish = val;
          fieldConfidence.nameEnglish = 90;
        }
      }
    } else if (/^Name$/i.test(line)) {
      if (i + 1 < lines.length && hasEnglishCharacters(lines[i + 1]) && !isBoilerplateHeader(lines[i + 1])) {
        const val = cleanExtractedValue(lines[i + 1]);
        if (!/date of birth/i.test(val)) {
          fields.nameEnglish = val;
          fieldConfidence.nameEnglish = 85;
        }
      }
    }

    // --- FATHER'S NAME (BANGLA) ---
    if (/^(পিতা|পিতার নাম|পিতাঃ|পিতা:)\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:পিতা|পিতার নাম|পিতাঃ|পিতা:)\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasBengaliCharacters(val)) {
          fields.fatherNameBangla = val;
          fieldConfidence.fatherNameBangla = 90;
        }
      }
    } else if (line === "পিতা" || line === "পিতা:" || line === "পিতার নাম") {
      if (i + 1 < lines.length && hasBengaliCharacters(lines[i + 1])) {
        fields.fatherNameBangla = cleanExtractedValue(lines[i + 1]);
        fieldConfidence.fatherNameBangla = 85;
      }
    }

    // --- FATHER'S NAME (ENGLISH) ---
    if (/^Father(?:'s)?\s*(?:Name)?\s*[:.\-]\s*(.+)/i.test(line)) {
      const match = line.match(/^Father(?:'s)?\s*(?:Name)?\s*[:.\-]\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasEnglishCharacters(val)) {
          fields.fatherNameEnglish = val;
          fieldConfidence.fatherNameEnglish = 90;
        }
      }
    }

    // --- MOTHER'S NAME (BANGLA) ---
    if (/^(মাতা|মাতার নাম|মাতাঃ|মাতা:)\s*(.+)/i.test(line)) {
      const match = line.match(/^(?:মাতা|মাতার নাম|মাতাঃ|মাতা:)\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasBengaliCharacters(val)) {
          fields.motherNameBangla = val;
          fieldConfidence.motherNameBangla = 90;
        }
      }
    } else if (line === "মাতা" || line === "মাতা:" || line === "মাতার নাম") {
      if (i + 1 < lines.length && hasBengaliCharacters(lines[i + 1])) {
        fields.motherNameBangla = cleanExtractedValue(lines[i + 1]);
        fieldConfidence.motherNameBangla = 85;
      }
    }

    // --- MOTHER'S NAME (ENGLISH) ---
    if (/^Mother(?:'s)?\s*(?:Name)?\s*[:.\-]\s*(.+)/i.test(line)) {
      const match = line.match(/^Mother(?:'s)?\s*(?:Name)?\s*[:.\-]\s*(.+)/i);
      if (match && match[1]) {
        const val = cleanExtractedValue(match[1]);
        if (hasEnglishCharacters(val)) {
          fields.motherNameEnglish = val;
          fieldConfidence.motherNameEnglish = 90;
        }
      }
    }
  }

  // 4. POSITIONAL HEURISTIC FALLBACK FOR UNLABELLED LINES (Smart Cards often have:
  // Line 1: Bangla Name
  // Line 2: English Name
  // Line 3: Bangla Father
  // Line 4: Bangla Mother
  if (!fields.nameBangla || !fields.nameEnglish) {
    const candidateLines = lines.filter(
      (l) =>
        !isBoilerplateHeader(l) &&
        !l.includes(fields.nidNumber) &&
        !/date of birth/i.test(l) &&
        !/জন্ম\s*তারিখ/i.test(l) &&
        l.length >= 3 &&
        l.length <= 45
    );

    for (const cLine of candidateLines) {
      if (!fields.nameBangla && hasBengaliCharacters(cLine) && !fields.fatherNameBangla.includes(cLine)) {
        // Check if not already used as father or mother
        if (cLine !== fields.fatherNameBangla && cLine !== fields.motherNameBangla) {
          fields.nameBangla = cleanExtractedValue(cLine);
          fieldConfidence.nameBangla = 70;
        }
      } else if (!fields.nameEnglish && hasEnglishCharacters(cLine) && !hasBengaliCharacters(cLine)) {
        if (!/^(id|nid|dob|card|bangladesh)/i.test(cLine)) {
          fields.nameEnglish = cleanExtractedValue(cLine);
          fieldConfidence.nameEnglish = 70;
        }
      }
    }
  }

  // Apply specialized Bangladeshi document sanitizer
  const sanitized = sanitizeExtractedDocument(fields);
  fields.nameBangla = sanitized.nameBangla;
  fields.nameEnglish = sanitized.nameEnglish;
  fields.fatherNameBangla = sanitized.fatherNameBangla;
  fields.fatherNameEnglish = sanitized.fatherNameEnglish;
  fields.motherNameBangla = sanitized.motherNameBangla;
  fields.motherNameEnglish = sanitized.motherNameEnglish;
  fields.nidNumber = sanitized.nidNumber;
  fields.dateOfBirth = sanitized.dateOfBirth;

  // Detect card type
  let cardTypeDetected: "smart_card" | "old_laminated" | "unknown" = "unknown";
  if (fields.nidNumber.length === 10) {
    cardTypeDetected = "smart_card";
  } else if (fields.nidNumber.length === 13 || fields.nidNumber.length === 17) {
    cardTypeDetected = "old_laminated";
  }

  return {
    rawText,
    confidence: ocrConfidence,
    fields,
    fieldConfidence,
    processingTimeMs: Date.now() - startTime,
    engine: "tesseract",
    cardTypeDetected,
  };
}
