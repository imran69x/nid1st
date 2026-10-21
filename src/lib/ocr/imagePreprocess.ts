/**
 * Image preprocessing options for OCR optimization
 */
export interface ImageEnhancementOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  grayscale?: boolean;
  binarize?: boolean; // Binarization (thresholding) for sharp text
  threshold?: number; // 0 to 255 (default ~ 128)
  rotationAngle?: number; // 0, 90, 180, 270
}

/**
 * Creates an HTMLImageElement from a Data URL or Blob URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load image for processing: " + err));
    img.src = src;
  });
}

/**
 * Rotates and enhances an image using HTML5 Canvas
 */
export async function enhanceImageForOCR(
  imageSource: string | HTMLCanvasElement,
  options: ImageEnhancementOptions = {}
): Promise<{ dataUrl: string; blob: Blob }> {
  const {
    brightness = 0,
    contrast = 20, // subtle contrast boost by default for text clarity
    grayscale = true,
    binarize = false,
    threshold = 135,
    rotationAngle = 0,
  } = options;

  let sourceCanvas: HTMLCanvasElement;

  if (typeof imageSource === "string") {
    const img = await loadImage(imageSource);
    sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = img.naturalWidth || img.width;
    sourceCanvas.height = img.naturalHeight || img.height;
    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    ctx.drawImage(img, 0, 0);
  } else {
    sourceCanvas = imageSource;
  }

  // Handle Rotation
  const normalizedAngle = ((rotationAngle % 360) + 360) % 360;
  const isPerpendicular = normalizedAngle === 90 || normalizedAngle === 270;

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = isPerpendicular ? sourceCanvas.height : sourceCanvas.width;
  targetCanvas.height = isPerpendicular ? sourceCanvas.width : sourceCanvas.height;

  const ctx = targetCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.save();
  ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
  ctx.rotate((normalizedAngle * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  ctx.restore();

  // Apply Pixel Filters (Grayscale, Contrast, Brightness, Binarize)
  const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = imgData.data;

  // Contrast factor calculation
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    if (brightness !== 0) {
      r = Math.min(255, Math.max(0, r + brightness));
      g = Math.min(255, Math.max(0, g + brightness));
      b = Math.min(255, Math.max(0, b + brightness));
    }

    // Contrast
    if (contrast !== 0) {
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
    }

    // Grayscale
    if (grayscale || binarize) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (binarize) {
        const binVal = gray >= threshold ? 255 : 0;
        data[i] = binVal;
        data[i + 1] = binVal;
        data[i + 2] = binVal;
      } else {
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const dataUrl = targetCanvas.toDataURL("image/jpeg", 0.95);

  const blob = await new Promise<Blob>((resolve, reject) => {
    targetCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.95
    );
  });

  return { dataUrl, blob };
}

/**
 * Crops image to standard ID card aspect ratio (85.6mm x 53.98mm = ~1.586) or specified crop box
 */
export async function cropImageToBox(
  imageSource: string,
  box: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const img = await loadImage(imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, box.width);
  canvas.height = Math.max(1, box.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

  return canvas.toDataURL("image/jpeg", 0.95);
}

/**
 * Compresses an image file or dataUrl to an optimal size and resolution for OCR.
 * Resizes large camera photos (e.g. 12MP-50MP from phones/tablets) down to max 1600px
 * and compresses as JPEG with 0.82 quality. This reduces 5-10MB files to ~150-250KB,
 * keeping text razor-sharp while preventing payload size errors.
 */
export async function compressImageForUpload(
  fileOrDataUrl: File | string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  let objectUrlToRevoke: string | null = null;
  let src: string;

  if (typeof fileOrDataUrl === "string") {
    src = fileOrDataUrl;
  } else {
    src = URL.createObjectURL(fileOrDataUrl);
    objectUrlToRevoke = src;
  }

  try {
    const img = await loadImage(src);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // Scale down if larger than maxWidth or maxHeight
    if (width > maxWidth || height > maxHeight) {
      if (width / height > maxWidth / maxHeight) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D canvas context for compression");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill white background in case source is transparent PNG / WebP
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

