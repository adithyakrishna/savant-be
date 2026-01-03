type PasswordResetTokenEntry = {
  token: string;
  url: string;
  createdAt: Date;
};

const resetTokens = new Map<string, PasswordResetTokenEntry>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function storePasswordResetToken(email: string, token: string, url: string) {
  resetTokens.set(normalizeEmail(email), { token, url, createdAt: new Date() });
}

export function getPasswordResetToken(email: string) {
  return resetTokens.get(normalizeEmail(email));
}

export function clearPasswordResetToken(email: string) {
  resetTokens.delete(normalizeEmail(email));
}
