import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";
import { ExtractedNIDFields, ExtractionRecord } from "@/types/nid";

const LOCAL_STORAGE_RECORDS_KEY = "nid_saved_records_local";

/**
 * Save an extraction record with explicit user consent
 */
export async function saveExtractionRecord(
  ownerUid: string,
  fields: ExtractedNIDFields,
  notes?: string,
  guestMode = false
): Promise<string> {
  const recordId = "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  if (guestMode || !isFirebaseConfigured || !db) {
    // Local storage fallback for guest/offline mode
    const records = getLocalRecords(ownerUid);
    const newRecord: ExtractionRecord = {
      id: recordId,
      ownerUid,
      extractedFields: fields,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes,
    };
    records.unshift(newRecord);
    localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));
    return recordId;
  }

  // Firebase Firestore write
  const recordRef = doc(db, "extractionRecords", recordId);
  await setDoc(recordRef, {
    ownerUid,
    extractedFields: fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    notes: notes || "",
  });

  // Increment user scan count in profile
  try {
    const userRef = doc(db, "users", ownerUid);
    await updateDoc(userRef, {
      scanCount: increment(1),
    });
  } catch (err) {
    // Non-fatal if user document doesn't exist yet
  }

  return recordId;
}

/**
 * Fetch records belonging exclusively to the authenticated user
 */
export async function getUserExtractionRecords(
  ownerUid: string,
  guestMode = false
): Promise<ExtractionRecord[]> {
  if (guestMode || !isFirebaseConfigured || !db) {
    return getLocalRecords(ownerUid);
  }

  try {
    const recordsRef = collection(db, "extractionRecords");
    const q = query(recordsRef, where("ownerUid", "==", ownerUid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ownerUid: data.ownerUid,
        extractedFields: data.extractedFields,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
        notes: data.notes,
      };
    });
  } catch (err) {
    console.warn("Could not query Firestore, reading local fallback:", err);
    return getLocalRecords(ownerUid);
  }
}

/**
 * Delete a single record ensuring user ownership
 */
export async function deleteExtractionRecord(
  recordId: string,
  ownerUid: string,
  guestMode = false
): Promise<void> {
  if (guestMode || !isFirebaseConfigured || !db) {
    const records = getLocalRecords(ownerUid);
    const filtered = records.filter((r) => r.id !== recordId);
    localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(filtered));
    return;
  }

  const recordRef = doc(db, "extractionRecords", recordId);
  await deleteDoc(recordRef);
}

/**
 * Delete all records belonging to the authenticated user
 */
export async function deleteAllUserRecords(ownerUid: string, guestMode = false): Promise<void> {
  if (guestMode || !isFirebaseConfigured || !db) {
    const records = getLocalRecords();
    const remaining = records.filter((r) => r.ownerUid !== ownerUid);
    localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(remaining));
    return;
  }

  const recordsRef = collection(db, "extractionRecords");
  const q = query(recordsRef, where("ownerUid", "==", ownerUid));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
}

/**
 * Helper to fetch local storage records
 */
function getLocalRecords(ownerUid?: string): ExtractionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
    if (!raw) return [];
    const list: ExtractionRecord[] = JSON.parse(raw);
    if (ownerUid) {
      return list.filter((r) => r.ownerUid === ownerUid);
    }
    return list;
  } catch {
    return [];
  }
}
