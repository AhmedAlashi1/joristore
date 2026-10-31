const TOKEN_KEY = 'jori_partner_token';
const INFO_KEY = 'jori_partner_info';

export type PartnerInfo = {
  id: number;
  name: string;
  name_en?: string | null;
  login_phone: string;
};

export function setPartnerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getPartnerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPartnerInfo(info: PartnerInfo) {
  localStorage.setItem(INFO_KEY, JSON.stringify(info));
}

export function getPartnerInfo(): PartnerInfo | null {
  const raw = localStorage.getItem(INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PartnerInfo;
  } catch {
    return null;
  }
}

export function clearPartnerAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(INFO_KEY);
}

export function isPartnerAuthenticated() {
  return Boolean(getPartnerToken());
}
