/**
 * Comprehensive Sanitizer, Normalizer & Transliteration Engine
 * for Bangladesh National Identity Cards (NID) and Digital Birth Registration Certificates.
 */

// Bengali to English digit translation map
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
 * Convert Bengali digits (০-৯) to Arabic digits (0-9)
 */
export function convertBengaliDigits(text: string): string {
  if (!text) return "";
  return text.replace(/[০-৯]/g, (digit) => BENGALI_TO_ENGLISH_DIGITS[digit] || digit);
}

// Bengali month mappings with all common Bengali and English spelling variants
const BENGALI_MONTHS: Record<string, string> = {
  // January
  "জানু": "01",
  "জানুয়ারি": "01",
  "জানুয়ারি": "01",
  "জানুয়ারী": "01",
  "জানুয়ারী": "01",
  "january": "01",
  "jan": "01",
  // February
  "ফেব্রু": "02",
  "ফেব্রুয়ারি": "02",
  "ফেব্রুয়ারি": "02",
  "ফেব্রুয়ারী": "02",
  "ফেব্রুয়ারী": "02",
  "february": "02",
  "feb": "02",
  // March
  "মার্চ": "03",
  "মার্স": "03",
  "march": "03",
  "mar": "03",
  // April
  "এপ্রিল": "04",
  "এপ্রি": "04",
  "april": "04",
  "apr": "04",
  // May
  "মে": "05",
  "may": "05",
  // June
  "জুন": "06",
  "june": "06",
  "jun": "06",
  // July
  "জুলা": "07",
  "জুলাই": "07",
  "july": "07",
  "jul": "07",
  // August
  "আগ": "08",
  "আগস্ট": "08",
  "আগষ্ট": "08",
  "august": "08",
  "aug": "08",
  // September
  "সেপ্টে": "09",
  "সেপ্টেম্বর": "09",
  "সেপটেম্বর": "09",
  "সেপ": "09",
  "september": "09",
  "sep": "09",
  "sept": "09",
  // October
  "অক্টো": "10",
  "অক্টোবর": "10",
  "october": "10",
  "oct": "10",
  // November
  "নভে": "11",
  "নভেম্বর": "11",
  "november": "11",
  "nov": "11",
  // December
  "ডিসে": "12",
  "ডিসেম্বর": "12",
  "december": "12",
  "dec": "12",
};

/**
 * Standardize and clean Date of Birth strictly into DD-MM-YYYY format
 */
export function sanitizeDateOfBirth(input: string): string {
  if (!input) return "";

  // Convert Bengali numbers to English
  let clean = convertBengaliDigits(input).trim();

  // Strip words in parentheses like (দশ জানুয়ারি দুই হাজার এক) or (TEN JANUARY TWO THOUSAND ONE)
  clean = clean.replace(/\([^)]*\)/g, "").trim();

  // Strip common label prefixes
  clean = clean.replace(/^(?:date\s*of\s*birth|dob|জন্ম\s*তারিখ|তারিখ|date)\s*[:.\-]?\s*/i, "").trim();

  // Check if already clean DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("-").map(Number);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2035) {
      return clean;
    }
  }

  // Case 1: "15 Oct 1990" or "15 অক্টোবর ১৯৯০" or "15-Oct-1990" or "15 Jan, 2001"
  const textMonthMatch = clean.match(/^(\d{1,2})[\s\-/,.]+([A-Za-z\u0980-\u09FF]+)[\s\-/,.]+(\d{4})$/);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monthRaw = textMonthMatch[2].toLowerCase().trim();
    const year = parseInt(textMonthMatch[3], 10);

    const monthNumStr = BENGALI_MONTHS[monthRaw];
    if (monthNumStr && day >= 1 && day <= 31 && year >= 1900 && year <= 2035) {
      const dd = day.toString().padStart(2, "0");
      return `${dd}-${monthNumStr}-${year}`;
    }
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  // In Bangladesh official documents, day always precedes month (DD-MM-YYYY)!
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2035) {
      const dd = day.toString().padStart(2, "0");
      const mm = month.toString().padStart(2, "0");
      return `${dd}-${mm}-${year}`;
    }
  }

  // Case 3: YYYY-MM-DD or YYYY/MM/DD (ISO standard format)
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2035) {
      const dd = day.toString().padStart(2, "0");
      const mm = month.toString().padStart(2, "0");
      return `${dd}-${mm}-${year}`;
    }
  }

  // Case 4: Any sequence containing 8 digits like 15101990 -> 15-10-1990
  const eightDigits = clean.replace(/[^\d]/g, "");
  if (eightDigits.length === 8) {
    const d1 = parseInt(eightDigits.slice(0, 2), 10);
    const m1 = parseInt(eightDigits.slice(2, 4), 10);
    const y1 = parseInt(eightDigits.slice(4, 8), 10);
    if (d1 >= 1 && d1 <= 31 && m1 >= 1 && m1 <= 12 && y1 >= 1900 && y1 <= 2035) {
      return `${d1.toString().padStart(2, "0")}-${m1.toString().padStart(2, "0")}-${y1}`;
    }
  }

  return clean;
}

/**
 * Remove document field label prefixes commonly caught by OCR
 */
function stripLabelPrefixes(val: string): string {
  if (!val) return "";
  let res = val.trim();

  // Strip prefixes ordered from most specific to least specific
  const prefixRegex = /^(?:পিতার\s*নাম[ঃ:]?|মাতার\s*নাম[ঃ:]?|father(?:'s)?\s*name[ঃ:]?|mother(?:'s)?\s*name[ঃ:]?|নাম[ঃ:]?|name[ঃ:]?|পিতা[ঃ:]?|মাতা[ঃ:]?|father[ঃ:]?|mother[ঃ:]?)\s*[:.\-]?\s*/i;
  res = res.replace(prefixRegex, "");

  // Strip numbers like "১. ", "1. ", "01. "
  res = res.replace(/^\d+[\s.)\-]+\s*/, "");

  return res.trim();
}

/**
 * Strip nationality artifacts (very common in Birth Certificates where "বাংলাদেশী" sits right under parents' names)
 */
function stripNationalityArtifacts(val: string): string {
  if (!val) return "";
  let res = val;

  // Bengali nationality markers
  res = res.replace(/[,;/-]?\s*(?:জাতীয়তা|জাতীয়তা)\s*[:.\-]?\s*বাংলাদেশী/gi, "");
  res = res.replace(/[,;/-]?\s*বাংলাদেশী\s*$/gi, "");
  res = res.replace(/^বাংলাদেশী\s*[,;/-]?/gi, "");

  // English nationality markers
  res = res.replace(/[,;/-]?\s*nationality\s*[:.\-]?\s*bangladeshi/gi, "");
  res = res.replace(/[,;/-]?\s*bangladeshi\s*$/gi, "");
  res = res.replace(/^bangladeshi\s*[,;/-]?/gi, "");

  // Deceased markers like (মৃত), মৃত, (Late), Late
  res = res.replace(/\((?:মৃত|late)\)/gi, "");
  res = res.replace(/^(?:মৃত|late)\s+/gi, "");

  return res.trim();
}

/**
 * Clean and standardize Bengali Name
 */
export function sanitizeBanglaName(name: string): string {
  if (!name) return "";

  let cleaned = stripLabelPrefixes(name);
  cleaned = stripNationalityArtifacts(cleaned);

  // Handle female honorifics: মোছাঃ / মোসাঃ first
  if (/^(?:মোছা|মোসা)/.test(cleaned)) {
    cleaned = cleaned.replace(/^(?:মোছা|মোসা)[ঃ:.]?[\s.]*/, "মোছাঃ ");
  } else if (/^মুঃ?[\s.:]+/.test(cleaned) || /^মুহাম্মদ[\s.]+/.test(cleaned)) {
    // Keep or normalize
  } else if (/^মো[ঃ:.]?\s+/.test(cleaned) || /^মোঃ/.test(cleaned)) {
    cleaned = cleaned.replace(/^মো[ঃ:.]?[\s.]*/, "মোঃ ");
  } else if (/^আ[ঃ:.]?\s+/.test(cleaned) || /^আঃ/.test(cleaned)) {
    cleaned = cleaned.replace(/^আ[ঃ:.]?[\s.]*/, "আঃ ");
  }

  // Remove trailing dots, hyphens, colons, commas
  cleaned = cleaned.replace(/^[:;.,\-\s|]+/, "").replace(/[:;.,\-\s|]+$/, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

/**
 * Clean and standardize English Name
 */
export function sanitizeEnglishName(name: string): string {
  if (!name) return "";

  let cleaned = stripLabelPrefixes(name);
  cleaned = stripNationalityArtifacts(cleaned);

  // Convert to ALL CAPS as required officially
  cleaned = cleaned.toUpperCase();

  // Standardize common Bangladeshi title typos:
  // "MOSA:", "MOSA.", "MOSA", "MOCHA:", "MOCHA", "MST:" -> "MST."
  cleaned = cleaned.replace(/^(?:MOSA[:.]?|MOCHA[:.]?|MST[:;]?)\s+/i, "MST. ");
  cleaned = cleaned.replace(/^(?:MD[:;]?|MOHD[:.]?)\s+/i, "MD. ");

  // Deduplicate repeated prefixes: "MD. MD." -> "MD.", "MST. MST." -> "MST."
  cleaned = cleaned.replace(/^MD\.\s+MD\.\s+/i, "MD. ");
  cleaned = cleaned.replace(/^MST\.\s+MST\.\s+/i, "MST. ");

  // Clean trailing punctuation
  cleaned = cleaned.replace(/^[:;,\-\s|]+/, "").replace(/[:;,\-\s|]+$/, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

/**
 * Common Bangladeshi Name Dictionary for high-accuracy transliteration
 */
const BANGLA_WORD_TRANSLITERATION: Record<string, string> = {
  "মোঃ": "MD.",
  "মুঃ": "MD.",
  "মোহাম্মদ": "MOHAMMAD",
  "মুহাম্মদ": "MUHAMMAD",
  "মোছাঃ": "MST.",
  "মোসাঃ": "MST.",
  "মোসাম্মৎ": "MOSAMMAT",
  "আঃ": "MD.",
  "আব্দুল": "ABDUL",
  "আবদুল": "ABDUL",
  "আব্দুর": "ABDUR",
  "আবদুর": "ABDUR",
  "করিম": "KARIM",
  "রহিম": "RAHIM",
  "কালাম": "KALAM",
  "সালাম": "SALAM",
  "আলম": "ALAM",
  "আলী": "ALI",
  "আলি": "ALI",
  "হোসেন": "HOSSAIN",
  "হোসাইন": "HOSSAIN",
  "হাসান": "HASAN",
  "হাছান": "HASAN",
  "আহমেদ": "AHMED",
  "আহমদ": "AHMED",
  "ইসলাম": "ISLAM",
  "রহমান": "RAHMAN",
  "খান": "KHAN",
  "চৌধুরী": "CHOWDHURY",
  "মিয়া": "MIA",
  "মিঞা": "MIA",
  "মিয়াঁ": "MIA",
  "বেগম": "BEGUM",
  "খাতুন": "KHATUN",
  "আক্তার": "AKTER",
  "আখতার": "AKTER",
  "পারভীন": "PARVIN",
  "পারভিন": "PARVIN",
  "সুলতানা": "SULTANA",
  "নাজনীন": "NAZNIN",
  "জাহান": "JAHAN",
  "বানু": "BANU",
  "নেছা": "NESA",
  "নেসা": "NESA",
  "বিবি": "BIBI",
  "শেখ": "SHEIKH",
  "সৈয়দ": "SYED",
  "কাজী": "KAZI",
  "গাজী": "GAZI",
  "শিকদার": "SHIKDAR",
  "সরকার": "SARKAR",
  "তালুকদার": "TALUKDER",
  "প্রামাণিক": "PRAMANIK",
  "প্রামানিক": "PRAMANIK",
  "মন্ডল": "MONDAL",
  "মণ্ডল": "MONDAL",
  "দেওয়ান": "DEWAN",
  "মল্লিক": "MOLLIK",
  "হক": "HAQUE",
  "উদ্দীন": "UDDIN",
  "উদ্দিন": "UDDIN",
  "রফিক": "RAFIQ",
  "শফিক": "SHAFIQ",
  "তারিক": "TARIQ",
  "শরীফ": "SHARIF",
  "লতিফ": "LATIF",
  "জলিল": "JALIL",
  "খলিল": "KHALIL",
  "রশিদ": "RASHID",
  "মজিদ": "MAJID",
  "ওয়াহেদ": "WAHED",
  "সোবহান": "SOBHAN",
  "মতিন": "MATIN",
  "ফজলু": "FAZLU",
  "জাহাঙ্গীর": "JAHANGIR",
  "শাহজাহান": "SHAHJAHAN",
  "নূর": "NOOR",
  "নুর": "NUR",
  "আমিন": "AMIN",
  "ইমরান": "IMRAN",
  "কামরুল": "KAMRUL",
  "তারেক": "TAREK",
  "সাইফুল": "SAIFUL",
  "মাহবুব": "MAHBUB",
  "মাহমুদ": "MAHMUD",
  "শামীম": "SHAMIM",
  "ফারুক": "FARUK",
  "হারুন": "HARUN",
  "আনিসুর": "ANISUR",
  "মিজানুর": "MIZANUR",
  "জিয়াউর": "ZIAUR",
  "মোস্তাফিজুর": "MOSTAFIZUR",
  "হাবিবুর": "HABIBUR",
  "লুৎফর": "LUTFAR",
  "মনির": "MONIR",
  "সাকিব": "SAKIB",
  "আরিফ": "ARIF",
  "ফাতেমা": "FATEMA",
  "আয়েশা": "AYESHA",
  "মরিয়ম": "MARIUM",
  "মরিয়ম": "MARIUM",
  "রোকসানা": "ROKSANA",
  "শিরিন": "SHIRIN",
  "রোজিনা": "ROJINA",
  "সাবিনা": "SABINA",
  "শাহনাজ": "SHAHNAZ",
  "রুমানা": "RUMANA",
  "ফারহানা": "FARHANA",
  "নাসরিন": "NASRIN",
  "স্বপ্না": "SWAPNA",
  "রেনু": "RENU",
  "মমতা": "MAMATA",
};

/**
 * Transliterates a Bengali name into standard Bangladeshi English ALL CAPS
 * if the English name is missing on the card (common for father/mother on Smart NID).
 */
export function transliterateBanglaNameToEnglish(banglaName: string): string {
  if (!banglaName) return "";
  const cleaned = sanitizeBanglaName(banglaName);
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/);
  const resultWords: string[] = [];

  for (const w of words) {
    if (BANGLA_WORD_TRANSLITERATION[w]) {
      resultWords.push(BANGLA_WORD_TRANSLITERATION[w]);
    } else {
      // Basic character fallback if not in dictionary
      let mapped = w;
      for (const [bnWord, enWord] of Object.entries(BANGLA_WORD_TRANSLITERATION)) {
        if (mapped.includes(bnWord)) {
          mapped = mapped.replace(new RegExp(bnWord, "g"), enWord + " ");
        }
      }
      mapped = mapped.replace(/[\u0980-\u09FF]/g, "").trim();
      if (mapped) {
        resultWords.push(mapped.toUpperCase());
      }
    }
  }

  const combined = resultWords.join(" ").replace(/\s{2,}/g, " ").trim();
  return sanitizeEnglishName(combined);
}

/**
 * Clean NID or Birth Certificate Registration Number
 */
export function sanitizeNidNumber(num: string): string {
  if (!num) return "";
  const converted = convertBengaliDigits(num);
  // Keep digits only
  return converted.replace(/[^\d]/g, "");
}

export interface ExtractedMemberData {
  docType?: "nid" | "birth_certificate";
  nameBangla: string;
  nameEnglish: string;
  fatherNameBangla: string;
  fatherNameEnglish: string;
  motherNameBangla: string;
  motherNameEnglish: string;
  nidNumber: string;
  dateOfBirth: string;
  error?: string;
}

/**
 * High-accuracy sanitization and auto-completion pipeline for extracted document records
 */
export function sanitizeExtractedDocument(data: any): ExtractedMemberData {
  const result: ExtractedMemberData = {
    docType: data?.docType === "birth_certificate" ? "birth_certificate" : "nid",
    nameBangla: sanitizeBanglaName(data?.nameBangla || ""),
    nameEnglish: sanitizeEnglishName(data?.nameEnglish || ""),
    fatherNameBangla: sanitizeBanglaName(data?.fatherNameBangla || ""),
    fatherNameEnglish: sanitizeEnglishName(data?.fatherNameEnglish || ""),
    motherNameBangla: sanitizeBanglaName(data?.motherNameBangla || ""),
    motherNameEnglish: sanitizeEnglishName(data?.motherNameEnglish || ""),
    nidNumber: sanitizeNidNumber(data?.nidNumber || ""),
    dateOfBirth: sanitizeDateOfBirth(data?.dateOfBirth || ""),
    error: data?.error,
  };

  // Auto-transliterate English name if missing but Bangla exists
  if (!result.nameEnglish && result.nameBangla) {
    result.nameEnglish = transliterateBanglaNameToEnglish(result.nameBangla);
  }

  // Auto-transliterate Father English name if missing (always missing on Smart Card front)
  if (!result.fatherNameEnglish && result.fatherNameBangla) {
    result.fatherNameEnglish = transliterateBanglaNameToEnglish(result.fatherNameBangla);
  }

  // Auto-transliterate Mother English name if missing (always missing on Smart Card front)
  if (!result.motherNameEnglish && result.motherNameBangla) {
    result.motherNameEnglish = transliterateBanglaNameToEnglish(result.motherNameBangla);
  }

  return result;
}
