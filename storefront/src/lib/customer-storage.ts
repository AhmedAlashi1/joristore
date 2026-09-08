const STORAGE_KEY = 'jori_customer_id';

export function getCustomerId(): number | null {
  const id = localStorage.getItem(STORAGE_KEY);
  return id ? Number(id) : null;
}

export function setCustomerId(id: number) {
  localStorage.setItem(STORAGE_KEY, String(id));
}

export function clearCustomerId() {
  localStorage.removeItem(STORAGE_KEY);
}
