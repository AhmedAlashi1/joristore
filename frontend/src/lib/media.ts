import { api } from './api';
import { ensureApiSuccess } from './api-response';

export type UploadFolder = 'logos' | 'banners' | 'categories' | 'products';

type UploadResult = { path: string; url: string };

export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/storage/')) {
    const origin = import.meta.env.VITE_API_ORIGIN;
    if (origin) return `${origin}${path}`;
    return path;
  }
  if (path.startsWith('/')) return path;
  return `/${path.replace(/^\/+/, '')}`;
}

export async function uploadMedia(file: File, folder: UploadFolder): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const res = await api.post('/admin/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return ensureApiSuccess<UploadResult>(res, '');
}
