import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AuthService } from '@/auth/auth.service';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import {
  employeeOrgAssignments,
  people,
  roleAssignments,
  user,
} from '@/db/schema';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import { RbacService } from '@/rbac/rbac.service';
import type { AuthSession } from '@/auth/auth.service';
import type {
  CreateStaffInput,
  StaffFilterInput,
  StaffProfile,
  StaffRole,
  UpdateStaffInput,
} from '@/staff/staff.types';
import { StaffRepository } from '@/staff/staff.repository';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  private async requireAdmin(session: AuthSession) {
    await this.rbacService.requireRole(session, ['SUPER_ADMIN', 'ADMIN']);
  }

  private async requireAdminOrSelf(session: AuthSession, personId: string) {
    if (!session?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const roles = await this.rbacService.getUserScopeRoles(
      session.user.id,
      DEFAULT_SCOPE_ID,
    );

    if (roles.has('SUPER_ADMIN') || roles.has('ADMIN')) {
      return;
    }

    if (session.user.personId && session.user.personId === personId) {
      return;
    }

    throw new ForbiddenException('Insufficient privileges');
  }

  private normalizeEmail(email?: string | null) {
    if (!email) {
      return null;
    }
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  async createOne(
    session: AuthSession,
    payload: CreateStaffInput,
    orgId: string,
  ): Promise<StaffProfile> {
    await this.requireAdmin(session);

    if (!payload.firstName || !payload.lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const normalizedEmail = this.normalizeEmail(payload.email ?? null);
    if (!normalizedEmail) {
      throw new BadRequestException(
        'Email is required to provision staff login',
      );
    }

    const [existing] = await this.db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.email, normalizedEmail))
      .limit(1);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const created = await this.staffRepository.create(payload, orgId);

    const password = nanoid(20);
    const name = `${created.firstName} ${created.lastName}`.trim();
    const createdUser = await this.authService.createEmailPasswordUser({
      name,
      email: normalizedEmail,
      password,
      emailVerified: false,
    });

    if (!createdUser?.id) {
      throw new BadRequestException('Failed to create auth user');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ personId: created.personId })
        .where(eq(user.id, createdUser.id));

      if (!created.email) {
        await tx
          .update(people)
          .set({ email: normalizedEmail })
          .where(eq(people.id, created.personId));
      }

      await tx.insert(roleAssignments).values({
        id: nanoid(10),
        userId: createdUser.id,
        role: payload.role as StaffRole,
        scopeId: DEFAULT_SCOPE_ID,
      });

      await tx
        .insert(employeeOrgAssignments)
        .values({ personId: created.personId, orgId })
        .onConflictDoUpdate({
          target: employeeOrgAssignments.personId,
          set: {
            orgId,
            updatedAt: new Date(),
          },
        });
    });

    const updated = await this.staffRepository.findById(
      created.personId,
      orgId,
    );
    if (!updated) {
      throw new BadRequestException('Failed to load staff profile');
    }
    return updated;
  }

  async listAll(session: AuthSession, filter: StaffFilterInput, orgId: string) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    return this.staffRepository.findAll(filter, orgId);
  }

  async getOne(
    session: AuthSession,
    personId: string,
    orgId: string,
  ): Promise<StaffProfile> {
    await this.requireAdminOrSelf(session, personId);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const staff = await this.staffRepository.findById(personId, orgId);
    if (!staff || staff.isDeleted) {
      throw new NotFoundException(`Staff ${personId} not found`);
    }
    return staff;
  }

  async updateOne(
    session: AuthSession,
    personId: string,
    payload: UpdateStaffInput,
    orgId: string,
  ) {
    const isAdmin = await this.isAdmin(session);
    if (!isAdmin) {
      await this.requireAdminOrSelf(session, personId);
    }
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const role = isAdmin ? payload.role : undefined;
    const active = isAdmin ? payload.active : undefined;
    const sanitizedPayload: UpdateStaffInput = isAdmin
      ? payload
      : {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          phone: payload.phone,
          avatar: payload.avatar,
          bio: payload.bio,
        };

    const updated = await this.staffRepository.update(
      personId,
      sanitizedPayload,
      role,
      active,
    );

    if (!updated) {
      throw new NotFoundException(`Staff ${personId} not found`);
    }

    return updated;
  }

  async deleteOne(session: AuthSession, personId: string, hardDelete: boolean) {
    await this.requireAdmin(session);
    const removed = hardDelete
      ? await this.staffRepository.hardDelete(personId)
      : await this.staffRepository.softDelete(personId);

    if (!removed) {
      throw new NotFoundException(`Staff ${personId} not found`);
    }

    return { removed: true, hardDelete };
  }

  async restoreOne(session: AuthSession, personId: string) {
    await this.requireAdmin(session);
    const restored = await this.staffRepository.restore(personId);
    if (!restored) {
      throw new NotFoundException(`Staff ${personId} not found`);
    }
    return { restored: true };
  }

  private async isAdmin(session: AuthSession) {
    if (!session?.user) {
      return false;
    }
    const roles = await this.rbacService.getUserScopeRoles(
      session.user.id,
      DEFAULT_SCOPE_ID,
    );
    return roles.has('SUPER_ADMIN') || roles.has('ADMIN');
  }
}
