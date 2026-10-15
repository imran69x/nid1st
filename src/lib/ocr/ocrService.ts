import { createWorker, Worker } from "tesseract.js";
import { OCRResult } from "@/types/nid";
import { parseBangladeshNIDText } from "./nidParser";
import { enhanceImageForOCR, ImageEnhancementOptions } from "./imagePreprocess";

export type OCRProgressCallback = (progress: { status: string; progress: number }) => void;

let workerInstance: Worker | null = null;
let isWorkerInitializing = false;

/**
 * Initializes and caches a Tesseract.js worker with Bengali ('ben') and English ('eng') language packs
 */
async function getOrCreateTesseractWorker(onProgress?: OCRProgressCallback): Promise<Worker> {
  if (workerInstance) {
    return workerInstance;
  }

  if (isWorkerInitializing) {
    // Wait until worker is ready
    while (isWorkerInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (workerInstance) return workerInstance;
  }

  isWorkerInitializing = true;

  try {
    onProgress?.({ status: "Initializing OCR Engine...", progress: 0.1 });

    const worker = await createWorker(["ben", "eng"], 1, {
      logger: (m) => {
        if (m.status && typeof m.progress === "number") {
          onProgress?.({
            status: m.status === "recognizing text" ? "Recognizing Bengali and English text..." : m.status,
            progress: Math.min(1, Math.max(0.1, m.progress)),
          });
        }
      },
    });

    workerInstance = worker;
    return worker;
  } finally {
    isWorkerInitializing = false;
  }
}

/**
 * Perform local browser OCR on an image
 */
export async function performLocalOCR(
  imageSource: string,
  options?: {
    preprocess?: boolean;
    enhancement?: ImageEnhancementOptions;
    onProgress?: OCRProgressCallback;
  }
): Promise<OCRResult> {
  const { preprocess = true, enhancement, onProgress } = options || {};

  let finalImageToScan = imageSource;

  if (preprocess) {
    onProgress?.({ status: "Optimizing image readability...", progress: 0.05 });
    try {
      const enhanced = await enhanceImageForOCR(imageSource, {
        contrast: 25,
        brightness: 5,
        grayscale: true,
        ...enhancement,
      });
      finalImageToScan = enhanced.dataUrl;
    } catch (err) {
      console.warn("Preprocessing image failed, falling back to original:", err);
    }
  }

  onProgress?.({ status: "Loading Bengali & English language models...", progress: 0.15 });
  const worker = await getOrCreateTesseractWorker(onProgress);

  onProgress?.({ status: "Scanning National ID Card...", progress: 0.35 });
  const result = await worker.recognize(finalImageToScan);

  onProgress?.({ status: "Parsing and validating NID fields...", progress: 0.9 });
  const rawText = result.data.text || "";
  const confidence = result.data.confidence || 0;

  const parsed = parseBangladeshNIDText(rawText, confidence);
  parsed.engine = "tesseract";

  onProgress?.({ status: "Complete!", progress: 1.0 });

  return parsed;
}

/**
 * Perform server-side OCR via Next.js route handler
 */
export async function performServerOCR(
  imageBase64: string,
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  onProgress?.({ status: "Sending image to secure server OCR...", progress: 0.25 });

  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server OCR failed with status ${res.status}`);
  }

  onProgress?.({ status: "Finalizing extracted fields...", progress: 0.95 });
  const data: OCRResult = await res.json();
  onProgress?.({ status: "Complete!", progress: 1.0 });

  return data;
}

/**
 * Universal OCR runner that selects between local Tesseract and Server OCR
 */
export async function runNIDOCR(
  imageSource: string,
  provider: "tesseract" | "google_vision" = "tesseract",
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  if (provider === "google_vision") {
    try {
      return await performServerOCR(imageSource, onProgress);
    } catch (err) {
      console.warn("Cloud OCR failed, falling back to local Tesseract engine:", err);
      return await performLocalOCR(imageSource, { onProgress });
    }
  }

  return await performLocalOCR(imageSource, { onProgress });
}

/**
 * Terminate worker to free memory
 */
export async function terminateOCRWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
