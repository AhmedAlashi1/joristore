import { api } from './api';
import { ensureApiSuccess } from './api-response';
import { absoluteStorageUrl } from './storage-origin';

export type UploadFolder = 'logos' | 'banners' | 'categories' | 'products';

type UploadResult = { path: string; url: string };

export function mediaUrl(path?: string | null): string {
  return absoluteStorageUrl(path);
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
