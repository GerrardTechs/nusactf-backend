import bcrypt from "bcrypt";
import { timingSafeEqual } from "node:crypto";

/**
 * Verifies a submitted flag against a stored bcrypt hash.
 * Uses bcrypt's constant-time comparison internally.
 */
export async function verifyFlagHash(
  submittedFlag: string,
  flagHash: string
): Promise<boolean> {
  const normalized = submittedFlag.trim();
  if (!normalized || !flagHash) {
    return false;
  }

  try {
    return await bcrypt.compare(normalized, flagHash);
  } catch {
    return false;
  }
}

/**
 * Constant-time string equality — useful for comparing known plaintext tokens
 * in sandbox endpoints (not for user password storage).
 */
export function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
