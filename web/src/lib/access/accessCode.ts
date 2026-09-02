const ACCESS_CODE_LENGTH = 12;

/** Латиница и цифры без пробелов и разделителей (как в приглашении). */
export function normalizeAccessCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function generateAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(ACCESS_CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < ACCESS_CODE_LENGTH; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}
