type VerificationTokenEntry = {
  token: string;
  createdAt: Date;
};

const verificationTokens = new Map<string, VerificationTokenEntry>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function storeVerificationToken(email: string, token: string): void {
  verificationTokens.set(normalizeEmail(email), {
    token,
    createdAt: new Date(),
  });
}

export function getVerificationToken(
  email: string,
): VerificationTokenEntry | undefined {
  return verificationTokens.get(normalizeEmail(email));
}

export function clearVerificationToken(email: string): void {
  verificationTokens.delete(normalizeEmail(email));
}
