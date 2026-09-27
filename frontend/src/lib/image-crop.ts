export type CropPreset = {
  aspectRatio: number;
  maxWidth: number;
  hintAr: string;
  hintEn: string;
};

export const IMAGE_CROP_PRESETS = {
  products: {
    aspectRatio: 1,
    maxWidth: 1600,
    hintAr: 'ارفع الصورة كما هي — نضيف شعار المتجر ونضغطها WebP للجودة والحجم المناسب للمتجر.',
    hintEn: 'Upload as-is — we stamp the store logo and compress to WebP for quality and size.',
  },
  categories: {
    aspectRatio: 4 / 3,
    maxWidth: 900,
    hintAr: 'يُقصّ تلقائياً إلى 4:3 مثل صورة التصنيف',
    hintEn: 'Auto-cropped to 4:3 to match category tiles',
  },
  logos: {
    aspectRatio: 1,
    maxWidth: 512,
    hintAr: 'يُقصّ تلقائياً إلى مربع 1:1 للشعار',
    hintEn: 'Auto-cropped to 1:1 square for logo',
  },
  banners: {
    aspectRatio: 16 / 9,
    maxWidth: 1400,
    hintAr: 'يُقصّ تلقائياً إلى 16:9 للبانر',
    hintEn: 'Auto-cropped to 16:9 for banners',
  },
} satisfies Record<string, CropPreset>;

const DEFAULT_MAX_BYTES = 280_000;
const DEFAULT_PRODUCT_LONG_EDGE = 1200;

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };
    img.src = url;
  });
}

/** Reads phone EXIF orientation so canvas output matches what you see in the gallery. */
async function fileToCanvas(file: File, maxLongEdge: number): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      let outW = bitmap.width;
      let outH = bitmap.height;
      const longEdge = Math.max(outW, outH);
      if (longEdge > maxLongEdge) {
        const scale = maxLongEdge / longEdge;
        outW = Math.max(1, Math.round(outW * scale));
        outH = Math.max(1, Math.round(outH * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return null;
      }
      ctx.drawImage(bitmap, 0, 0, outW, outH);
      bitmap.close();
      return canvas;
    } catch {
      // fall through
    }
  }

  const img = await loadImageFromBlob(file);
  return imageToCanvas(img, maxLongEdge);
}

/** Prefer same-origin /storage for canvas (avoids CORS taint). */
export function resolveWatermarkFetchUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/storage/')) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (u.pathname.startsWith('/storage/')) {
        return `${u.pathname}${u.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function loadImageForWatermark(pathOrUrl: string): Promise<HTMLImageElement | null> {
  const fetchUrl = resolveWatermarkFetchUrl(pathOrUrl);
  if (!fetchUrl) return null;

  try {
    const absolute = fetchUrl.startsWith('http')
      ? fetchUrl
      : `${window.location.origin}${fetchUrl}`;
    const res = await fetch(absolute, { credentials: 'same-origin' });
    if (res.ok) {
      const blob = await res.blob();
      return loadImageFromBlob(blob);
    }
  } catch {
    // fall through
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = fetchUrl.startsWith('http') ? fetchUrl : `${window.location.origin}${fetchUrl}`;
  });
}

function cropToCanvas(img: HTMLImageElement, preset: CropPreset): HTMLCanvasElement | null {
  const sourceW = img.naturalWidth;
  const sourceH = img.naturalHeight;
  const targetRatio = preset.aspectRatio;
  const sourceRatio = sourceW / sourceH;

  let cropW = sourceW;
  let cropH = sourceH;
  if (sourceRatio > targetRatio) {
    cropW = sourceH * targetRatio;
  } else if (sourceRatio < targetRatio) {
    cropH = sourceW / targetRatio;
  }

  const sx = (sourceW - cropW) / 2;
  const sy = (sourceH - cropH) / 2;

  const outW = Math.min(preset.maxWidth, Math.round(cropW));
  const outH = Math.round(outW / targetRatio);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

  return canvas;
}

/** Scale down if needed; keep original aspect ratio (no crop). */
function imageToCanvas(img: HTMLImageElement, maxLongEdge: number): HTMLCanvasElement | null {
  let outW = img.naturalWidth;
  let outH = img.naturalHeight;
  if (outW < 1 || outH < 1) return null;

  const longEdge = Math.max(outW, outH);
  if (longEdge > maxLongEdge) {
    const scale = maxLongEdge / longEdge;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, outW, outH);
  return canvas;
}

async function canvasToWebpFile(canvas: HTMLCanvasElement, baseName: string, maxBytes: number): Promise<File> {
  let quality = 0.82;
  let blob: Blob | null = null;

  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.size <= maxBytes) break;
    quality -= 0.07;
  }

  if (!blob) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.75));
  }
  if (!blob) {
    throw new Error('Could not compress image');
  }

  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

async function drawWatermark(canvas: HTMLCanvasElement, watermarkLogoPathOrUrl: string): Promise<boolean> {
  const logo = await loadImageForWatermark(watermarkLogoPathOrUrl);
  if (!logo) return false;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const outW = canvas.width;
  const outH = canvas.height;
  const pad = Math.round(outW * 0.035);
  const logoW = Math.round(outW * 0.15);
  const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(logo, outW - logoW - pad, outH - logoH - pad, logoW, logoH);
  ctx.restore();
  return true;
}

export type ProductImagePublishOptions = {
  /** Storage path (/storage/...) or absolute URL */
  watermarkLogoPath?: string | null;
  maxBytes?: number;
  maxLongEdge?: number;
};

export type ProductImagePublishResult = {
  file: File;
  logoApplied: boolean;
};

/** Product publish: keep aspect ratio, optional logo, WebP size/quality tune. */
export async function prepareProductImageForPublish(
  file: File,
  options?: ProductImagePublishOptions,
): Promise<ProductImagePublishResult> {
  if (file.type === 'image/svg+xml') {
    return { file, logoApplied: false };
  }

  const canvas = await fileToCanvas(file, options?.maxLongEdge ?? DEFAULT_PRODUCT_LONG_EDGE);
  if (!canvas) {
    return { file, logoApplied: false };
  }

  let logoApplied = false;
  const logoPath = options?.watermarkLogoPath?.trim();
  if (logoPath) {
    logoApplied = await drawWatermark(canvas, logoPath);
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'product';
  const outFile = await canvasToWebpFile(canvas, base, options?.maxBytes ?? DEFAULT_MAX_BYTES);
  return { file: outFile, logoApplied };
}

/** Center-crop to aspect ratio and resize (categories, banners, logos). */
export async function cropImageFileForPreset(file: File, preset: CropPreset): Promise<File> {
  if (file.type === 'image/svg+xml') return file;

  const oriented = await fileToCanvas(file, Math.max(preset.maxWidth * 2, 2400));
  if (!oriented) return file;

  const pngBlob = await new Promise<Blob | null>((resolve) => oriented.toBlob(resolve, 'image/png'));
  if (!pngBlob) return file;

  const img = await loadImageFromBlob(pngBlob);
  const canvas = cropToCanvas(img, preset);
  if (!canvas) return file;

  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.88));
  if (!blob) return file;

  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mime });
}
