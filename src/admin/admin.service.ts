import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { AuthService } from '@/auth/auth.service';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { people, roleAssignments, studentProfiles, user } from '@/db/schema';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import type { Role } from '@/rbac/rbac.types';
import { RbacService } from '@/rbac/rbac.service';
import type { ProvisionUserDto } from '@/admin/admin.types';
import type { AuthSession } from '@/auth/auth.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  async provisionUser(actorSession: AuthSession, payload: ProvisionUserDto) {
    if (!actorSession?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const scopeId: string = payload.scopeId || DEFAULT_SCOPE_ID;
    const actorRoles = await this.rbacService.getUserScopeRoles(
      actorSession.user.id,
      scopeId,
    );

    if (!this.rbacService.canProvisionRole(actorRoles, payload.role)) {
      throw new ForbiddenException('Insufficient privileges to assign role');
    }

    if (payload.role === 'STUDENT' && !payload.passwordResetRedirectTo) {
      throw new BadRequestException(
        'passwordResetRedirectTo is required to provision student accounts',
      );
    }

    const person = await this.db
      .select()
      .from(people)
      .where(and(eq(people.id, payload.personId), eq(people.isDeleted, false)))
      .limit(1);

    if (person.length === 0) {
      throw new NotFoundException('Person not found');
    }

    const personRow = person[0];
    const requestedEmail = payload.email?.trim().toLowerCase();
    const existingEmail = personRow.email?.trim().toLowerCase();

    if (requestedEmail && existingEmail && requestedEmail !== existingEmail) {
      throw new BadRequestException('Email does not match person record');
    }

    const email = requestedEmail ?? existingEmail;
    if (!email) {
      throw new BadRequestException('Email is required to provision a user');
    }

    const existingUser = await this.db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('Auth user already exists for email');
    }

    const name = `${personRow.firstName} ${personRow.lastName}`.trim() || email;
    const password = randomUUID();

    const createdUser = await this.authService.createEmailPasswordUser({
      name,
      email,
      password,
      emailVerified: false,
    });

    if (!createdUser?.id) {
      throw new BadRequestException('Failed to create auth user');
    }
    const userId = createdUser.id;

    await this.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ personId: personRow.id })
        .where(eq(user.id, userId));

      if (!personRow.email) {
        await tx.update(people).set({ email }).where(eq(people.id, personRow.id));
      }

      if (payload.role === 'STUDENT') {
        await tx
          .insert(studentProfiles)
          .values({ personId: personRow.id })
          .onConflictDoNothing();

        await tx
          .insert(roleAssignments)
          .values({
            id: randomUUID(),
            userId,
            role: 'STUDENT',
            scopeId,
          })
          .onConflictDoNothing();
        return;
      }

      const roleRows = [
        {
          id: randomUUID(),
          userId,
          role: payload.role as Role,
          scopeId,
        },
        {
          id: randomUUID(),
          userId,
          role: 'PENDING' as Role,
          scopeId,
        },
      ];

      await tx
        .insert(roleAssignments)
        .values(roleRows)
        .onConflictDoNothing();
    });

    await this.authService.issueEmailVerificationToken({ email });

    if (payload.role === 'STUDENT' && payload.passwordResetRedirectTo) {
      await this.authService.requestPasswordReset({
        email,
        redirectTo: payload.passwordResetRedirectTo,
      });
    }

    return {
      userId: createdUser.id,
      personId: personRow.id,
      email,
      role: payload.role,
      scopeId,
    };
  }

  async listStudents(actorSession: AuthSession) {
    if (!actorSession?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    return this.db
      .select({
        personId: people.id,
        userId: user.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        scopeId: roleAssignments.scopeId,
      })
      .from(roleAssignments)
      .innerJoin(user, eq(roleAssignments.userId, user.id))
      .innerJoin(people, eq(user.personId, people.id))
      .where(
        and(
          eq(roleAssignments.role, 'STUDENT'),
          eq(roleAssignments.scopeId, DEFAULT_SCOPE_ID),
          eq(people.isDeleted, false),
        ),
      );
  }
}
