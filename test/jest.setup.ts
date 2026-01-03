jest.mock('better-auth/minimal', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(() => 'adapter'),
}));

jest.mock('better-auth/plugins/bearer', () => ({
  bearer: jest.fn(() => ({ name: 'bearer' })),
}));

jest.mock('better-auth/plugins/jwt', () => ({
  jwt: jest.fn(() => ({ name: 'jwt' })),
}));
