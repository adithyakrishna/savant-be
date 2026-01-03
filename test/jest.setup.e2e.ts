import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const pnpmDir = join(process.cwd(), 'node_modules', '.pnpm');
const mockEntry = readdirSync(pnpmDir).find((entry) =>
  entry.startsWith('jest-mock@'),
);

if (!mockEntry) {
  throw new Error(
    'Unable to locate jest-mock in node_modules/.pnpm. Run pnpm install.',
  );
}

const mockPath = join(
  pnpmDir,
  mockEntry,
  'node_modules',
  'jest-mock',
);
const { ModuleMocker } = require(mockPath);
const mocker = new ModuleMocker(globalThis);

// Expose a minimal jest global for ESM tests that rely on global injection.
(globalThis as { jest?: unknown }).jest = {
  fn: mocker.fn.bind(mocker),
  spyOn: mocker.spyOn.bind(mocker),
  mocked: mocker.mocked.bind(mocker),
  clearAllMocks: mocker.clearAllMocks.bind(mocker),
  resetAllMocks: mocker.resetAllMocks.bind(mocker),
  restoreAllMocks: mocker.restoreAllMocks.bind(mocker),
};
