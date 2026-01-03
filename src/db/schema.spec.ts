import {
  guardianships,
  parentProfiles,
  roleAssignments,
  staffProfiles,
  studentProfiles,
  users,
} from '@/db/schema';

describe('db schema', () => {
  it('exports core tables', () => {
    expect(users).toBeDefined();
    expect(roleAssignments).toBeDefined();
    expect(studentProfiles).toBeDefined();
    expect(guardianships).toBeDefined();
  });

  it('executes extra config builders', () => {
    const builder = users[Symbol.for('drizzle:ExtraConfigBuilder')];
    const extraCols = users[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(builder(extraCols)).toHaveLength(1);

    const roleBuilder = roleAssignments[Symbol.for('drizzle:ExtraConfigBuilder')];
    const roleCols = roleAssignments[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(roleBuilder(roleCols)).toHaveLength(4);

    const guardianBuilder = guardianships[Symbol.for('drizzle:ExtraConfigBuilder')];
    const guardianCols = guardianships[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(guardianBuilder(guardianCols)).toHaveLength(1);
  });

  it('executes onUpdate functions', () => {
    expect(studentProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(parentProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(staffProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  it('executes foreign key references', () => {
    const tables = [roleAssignments, studentProfiles, parentProfiles, staffProfiles, guardianships];
    tables.forEach((table) => {
      const fks = table[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
        reference: () => unknown;
      }>;
      fks.forEach((fk) => fk.reference());
    });
  });
});
