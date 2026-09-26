import type { CustomerProfile } from '../providers/customer-provider';

const STORAGE_KEY = 'jori_customer_id';
const PROFILE_KEY = 'jori_customer_profile';

export function getCustomerId(): number | null {
  const id = localStorage.getItem(STORAGE_KEY);
  return id ? Number(id) : null;
}

export function setCustomerId(id: number) {
  localStorage.setItem(STORAGE_KEY, String(id));
}

export function clearCustomerId() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getCachedCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerProfile;
  } catch {
    return null;
  }
}

export function setCachedCustomerProfile(profile: CustomerProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
