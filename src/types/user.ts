export interface DatabaseUser {
  id: string;
  username: string;
  password?: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: number;
  passwordUpdatedAt?: number;
  scanCount: number;
}

export interface SystemConfig {
  scanningEnabled: boolean;
  noticeMessage?: string;
}

export interface ExtractedMember {
  memberIndex: number;
  docType: "nid" | "birth_certificate";
  nameBangla: string;
  nameEnglish: string;
  fatherNameBangla: string;
  fatherNameEnglish: string;
  motherNameBangla: string;
  motherNameEnglish: string;
  nidNumber: string;
  dateOfBirth: string; // strictly DD-MM-YYYY
  error?: string;
}

