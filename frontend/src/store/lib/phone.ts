/** Same rules as backend PhoneNormalizer — keeps login/register consistent. */
export function normalizeStorePhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('972')) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith('970')) {
    digits = `0${digits.slice(3)}`;
  }

  if (digits.length === 9 && digits.startsWith('5')) {
    digits = `0${digits}`;
  }

  return digits;
}

export function isValidStorePhone(normalized: string): boolean {
  return /^0?5\d{8}$/.test(normalized) || normalized.length >= 9;
}
