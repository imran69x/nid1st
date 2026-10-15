import { z } from "zod";

/**
 * Validates whether day, month, year form a valid calendar date
 */
export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > new Date().getFullYear()) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = [
    31,
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}

/**
 * Validates a string date in DD-MM-YYYY format
 */
export function validateDateOfBirth(val: string): boolean {
  if (!val) return true; // Optional during intermediate input
  const match = val.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  return isValidCalendarDate(day, month, year);
}

/**
 * Validates Bangladeshi NID number:
 * - 10 digits: Smart Card NID
 * - 13 digits: Old NID without birth year prefix
 * - 17 digits: Old NID with 4-digit birth year prefix
 */
export function validateNIDNumber(val: string): boolean {
  if (!val) return true;
  const cleaned = val.replace(/\s+/g, "");
  return /^(\d{10}|\d{13}|\d{17})$/.test(cleaned);
}

export const nidFieldSchema = z.object({
  nameBangla: z.string().trim(),
  nameEnglish: z.string().trim(),
  fatherNameBangla: z.string().trim(),
  fatherNameEnglish: z.string().trim(),
  motherNameBangla: z.string().trim(),
  motherNameEnglish: z.string().trim(),
  nidNumber: z
    .string()
    .trim()
    .refine((val) => !val || validateNIDNumber(val), {
      message: "NID number must be 10, 13, or 17 digits (জাতীয় পরিচয়পত্র নম্বর ১০, ১৩ বা ১৭ ডিজিট হতে হবে)",
    }),
  dateOfBirth: z
    .string()
    .trim()
    .refine((val) => !val || validateDateOfBirth(val), {
      message: "Date of Birth must be a valid calendar date in DD-MM-YYYY format (জন্ম তারিখ DD-MM-YYYY ফরম্যাটে দিন)",
    }),
});

export type NIDFormData = z.infer<typeof nidFieldSchema>;
