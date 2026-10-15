export interface ExtractedNIDFields {
  nameBangla: string;
  nameEnglish: string;
  fatherNameBangla: string;
  fatherNameEnglish: string;
  motherNameBangla: string;
  motherNameEnglish: string;
  nidNumber: string;
  dateOfBirth: string; // Formatted as DD-MM-YYYY
}

export interface OCRResult {
  rawText: string;
  confidence: number;
  fields: ExtractedNIDFields;
  fieldConfidence: Record<keyof ExtractedNIDFields, number>;
  processingTimeMs: number;
  engine: "tesseract" | "google_vision";
  cardTypeDetected?: "smart_card" | "old_laminated" | "unknown";
}

export interface ExtractionRecord {
  id: string;
  ownerUid: string;
  extractedFields: ExtractedNIDFields;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  cardType?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  createdAt: number;
  scanCount: number;
}
