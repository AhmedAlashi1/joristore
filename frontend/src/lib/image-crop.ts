import { backendPublicOrigin } from './hosts';
import { absoluteStorageUrl } from './storage-origin';

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
  'payment-qr': {
    aspectRatio: 1,
    maxWidth: 800,
    hintAr: 'ارفع صورة QR للدفع (مربعة)',
    hintEn: 'Upload square payment QR image',
  },
  'payment-receipts': {
    aspectRatio: 3 / 4,
    maxWidth: 1200,
    hintAr: 'صورة إيصال أو إشعار الدفع',
    hintEn: 'Payment receipt screenshot',
  },
} satisfies Record<string, CropPreset>;

const DEFAULT_MAX_BYTES = 280_000;
const DEFAULT_PRODUCT_LONG_EDGE = 1200;

const INVALID_IMAGE = 'Invalid image';

function loadImageViaObjectUrl(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(INVALID_IMAGE));
    };
    img.src = url;
  });
}

function loadImageViaDataUrl(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error(INVALID_IMAGE));
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(INVALID_IMAGE));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(INVALID_IMAGE));
    reader.readAsDataURL(blob);
  });
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  try {
    return await loadImageViaObjectUrl(blob);
  } catch {
    return loadImageViaDataUrl(blob);
  }
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

  try {
    const img = await loadImageFromBlob(file);
    return imageToCanvas(img, maxLongEdge);
  } catch {
    return null;
  }
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

function watermarkAbsoluteUrls(pathOrUrl: string): string[] {
  const rel = resolveWatermarkFetchUrl(pathOrUrl);
  if (!rel) return [];

  if (/^https?:\/\//i.test(rel)) return [rel];

  const absolute = absoluteStorageUrl(rel);
  const bases = [
    absolute,
    `${backendPublicOrigin()}${rel.startsWith('/') ? rel : `/${rel}`}`,
    window.location.origin + (rel.startsWith('/') ? rel : `/${rel}`),
  ];
  return [...new Set(bases.filter(Boolean))];
}

function responseLooksLikeImage(contentType: string, blob: Blob): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json')) return false;
  const bt = blob.type.toLowerCase();
  if (bt.includes('text/html') || bt.includes('application/json')) return false;
  if (ct.startsWith('image/') || bt.startsWith('image/')) return true;
  return bt === '' || bt === 'application/octet-stream';
}

async function loadImageForWatermark(pathOrUrl: string): Promise<HTMLImageElement | null> {
  for (const absolute of watermarkAbsoluteUrls(pathOrUrl)) {
    try {
      const res = await fetch(absolute, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      const blob = await res.blob();
      if (!responseLooksLikeImage(contentType, blob)) continue;

      try {
        const img = await loadImageFromBlob(blob);
        if (img.naturalWidth > 0 && img.naturalHeight > 0) return img;
      } catch {
        // try next URL
      }
    } catch {
      // try next URL
    }
  }
  return null;
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

async function canvasToJpegFile(canvas: HTMLCanvasElement, baseName: string, maxBytes: number): Promise<File | null> {
  let quality = 0.88;
  let blob: Blob | null = null;

  while (quality >= 0.55) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= maxBytes) break;
    quality -= 0.07;
  }

  if (!blob) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  }
  if (!blob) return null;

  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
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
    const jpeg = await canvasToJpegFile(canvas, baseName, maxBytes);
    if (jpeg) return jpeg;
    throw new Error('Could not compress image');
  }

  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

async function drawWatermark(canvas: HTMLCanvasElement, watermarkLogoPathOrUrl: string): Promise<boolean> {
  try {
    const logo = await loadImageForWatermark(watermarkLogoPathOrUrl);
    if (!logo || logo.naturalWidth < 1 || logo.naturalHeight < 1) return false;

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
  } catch {
    return false;
  }
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
  try {
    if (file.type === 'image/svg+xml') {
      return { file, logoApplied: false };
    }

    const canvas = await fileToCanvas(file, options?.maxLongEdge ?? DEFAULT_PRODUCT_LONG_EDGE);
    if (!canvas) {
      if (/heic|heif/i.test(file.type) || /\.heif?$/i.test(file.name)) {
        throw new Error('HEIC');
      }
      return { file, logoApplied: false };
    }

    let logoApplied = false;
    const logoPath = options?.watermarkLogoPath?.trim();
    if (logoPath) {
      logoApplied = await drawWatermark(canvas, logoPath);
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'product';
    try {
      const outFile = await canvasToWebpFile(canvas, base, options?.maxBytes ?? DEFAULT_MAX_BYTES);
      return { file: outFile, logoApplied };
    } catch {
      const jpeg = await canvasToJpegFile(canvas, base, options?.maxBytes ?? DEFAULT_MAX_BYTES);
      if (jpeg) return { file: jpeg, logoApplied };
      return { file, logoApplied: false };
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'HEIC') throw e;
    return { file, logoApplied: false };
  }
}

/** Center-crop to aspect ratio and resize (categories, banners, logos). */
export async function cropImageFileForPreset(file: File, preset: CropPreset): Promise<File> {
  if (file.type === 'image/svg+xml') return file;

  const oriented = await fileToCanvas(file, Math.max(preset.maxWidth * 2, 2400));
  if (!oriented) return file;

  const pngBlob = await new Promise<Blob | null>((resolve) => oriented.toBlob(resolve, 'image/png'));
  if (!pngBlob) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImageFromBlob(pngBlob);
  } catch {
    return file;
  }
  const canvas = cropToCanvas(img, preset);
  if (!canvas) return file;

  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.88));
  if (!blob) return file;

  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mime });
}
