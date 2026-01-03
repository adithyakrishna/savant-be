import {
  account,
  accountRelations,
  jwks,
  people,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from '@/auth/better-auth.schema';
import { createTableRelationsHelpers } from 'drizzle-orm/relations';

describe('better-auth schema', () => {
  it('exports tables', () => {
    expect(people).toBeDefined();
    expect(user).toBeDefined();
    expect(session).toBeDefined();
    expect(account).toBeDefined();
    expect(verification).toBeDefined();
    expect(jwks).toBeDefined();
  });

  it('executes extra config builders', () => {
    const peopleBuilder = people[Symbol.for('drizzle:ExtraConfigBuilder')];
    const peopleCols = people[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(peopleBuilder(peopleCols)).toHaveLength(1);

    const sessionBuilder = session[Symbol.for('drizzle:ExtraConfigBuilder')];
    const sessionCols = session[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(sessionBuilder(sessionCols)).toHaveLength(1);

    const accountBuilder = account[Symbol.for('drizzle:ExtraConfigBuilder')];
    const accountCols = account[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(accountBuilder(accountCols)).toHaveLength(1);

    const verificationBuilder = verification[Symbol.for('drizzle:ExtraConfigBuilder')];
    const verificationCols = verification[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(verificationBuilder(verificationCols)).toHaveLength(1);
  });

  it('executes onUpdate functions', () => {
    expect(people.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(user.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(session.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(account.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(verification.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  it('executes foreign key references', () => {
    const userFks = user[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
      reference: () => unknown;
    }>;
    const sessionFks = session[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
      reference: () => unknown;
    }>;
    const accountFks = account[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
      reference: () => unknown;
    }>;

    userFks.forEach((fk) => fk.reference());
    sessionFks.forEach((fk) => fk.reference());
    accountFks.forEach((fk) => fk.reference());
  });

  it('enables RLS on tables', () => {
    people.enableRLS();
    user.enableRLS();
    session.enableRLS();
    account.enableRLS();
    verification.enableRLS();
    jwks.enableRLS();
  });

  it('builds relation configs', () => {
    const userConfig = userRelations.config(createTableRelationsHelpers(user));
    const sessionConfig = sessionRelations.config(createTableRelationsHelpers(session));
    const accountConfig = accountRelations.config(createTableRelationsHelpers(account));

    expect(userConfig.sessions.fieldName).toBe('sessions');
    expect(userConfig.accounts.fieldName).toBe('accounts');
    expect(sessionConfig.user.fieldName).toBe('user');
    expect(accountConfig.user.fieldName).toBe('user');
  });
});
