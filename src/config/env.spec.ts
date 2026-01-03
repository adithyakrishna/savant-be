import { envSchema, validateEnv } from '@/config/env';

describe('env', () => {
  const baseEnv = {
    DATABASE_URL: 'postgres://example',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
  };

  it('parses defaults and coerces types', () => {
    const parsed = validateEnv({
      ...baseEnv,
      DB_SSL: 'true',
      DB_LOG_QUERIES: 'false',
      PORT: '4000',
    });

    expect(parsed.PORT).toBe(4000);
    expect(parsed.DB_SSL).toBe(true);
    expect(parsed.DB_LOG_QUERIES).toBe(false);
    expect(parsed.BETTER_AUTH_BASE_PATH).toBe('/auth');
  });

  it('rejects missing required values', () => {
    expect(() => validateEnv({})).toThrow();
  });

  it('accepts empty base url', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      BETTER_AUTH_BASE_URL: '',
    });
    expect(parsed.BETTER_AUTH_BASE_URL).toBe('');
  });
});
