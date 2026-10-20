export interface DatabaseUser {
  id: string;
  username: string; // Login ID / User ID
  name?: string;     // Display Name / User Name
  password?: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: number;
  passwordUpdatedAt?: number;
  scanCount: number;
  canDeleteRecent?: boolean; // Admin approved permission to delete recent scans
  profilePic?: string; // Base64 data URL or image URL for round profile picture
  profilePicChangedByUser?: boolean; // Whether regular user has used their 1-time profile picture change
}

export interface SystemConfig {
  scanningEnabled: boolean;
  noticeMessage?: string;
  allowUserDeleteRecent?: boolean;
  hideRecentScans?: boolean; // When true, normal users cannot see Recent button
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

export interface RecentScanRecord {
  id: string;
  title: string;
  userId?: string;
  username?: string;
  userDisplayName?: string;
  createdAt: number;
  members: ExtractedMember[];
  totalMembers: number;
}


