import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import {
  employeeOrgAssignments,
  orgBranches,
  orgDepartments,
  orgDesignations,
  people,
} from '@/db/schema';
import type {
  AssignOrgDto,
  BranchFilterDto,
  CreateBranchDto,
  CreateDepartmentDto,
  CreateDesignationDto,
  DepartmentFilterDto,
  DesignationFilterDto,
  EmployeeOrgAssignment,
  OrgAssignmentView,
  OrgBranch,
  OrgDepartment,
  OrgDesignation,
} from '@/org/org.types';

@Injectable()
export class OrgRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async listBranches(filters: BranchFilterDto) {
    const { page, pageSize, search, isActive } = filters;
    const conditions = [sql`1 = 1`];

    if (search) {
      conditions.push(ilike(orgBranches.name, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(orgBranches.isActive, isActive));
    }

    const rows = await this.db
      .select()
      .from(orgBranches)
      .where(and(...conditions))
      .orderBy(asc(orgBranches.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return rows as OrgBranch[];
  }

  async createBranch(payload: CreateBranchDto): Promise<OrgBranch> {
    const [branch] = await this.db
      .insert(orgBranches)
      .values({
        id: randomUUID(),
        name: payload.name,
        code: payload.code ?? null,
        address: payload.address ?? null,
        isActive: payload.isActive ?? true,
      })
      .returning();
    return branch as OrgBranch;
  }

  async updateBranch(branchId: string, payload: Partial<CreateBranchDto>) {
    const [branch] = await this.db
      .update(orgBranches)
      .set({
        name: payload.name,
        code: payload.code,
        address: payload.address,
        isActive: payload.isActive,
      })
      .where(eq(orgBranches.id, branchId))
      .returning();
    return branch as OrgBranch | undefined;
  }

  async deleteBranch(branchId: string): Promise<boolean> {
    const [branch] = await this.db
      .delete(orgBranches)
      .where(eq(orgBranches.id, branchId))
      .returning({ id: orgBranches.id });
    return Boolean(branch);
  }

  async listDepartments(filters: DepartmentFilterDto) {
    const { page, pageSize, search, isActive } = filters;
    const conditions = [sql`1 = 1`];

    if (search) {
      conditions.push(ilike(orgDepartments.name, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(orgDepartments.isActive, isActive));
    }

    const rows = await this.db
      .select()
      .from(orgDepartments)
      .where(and(...conditions))
      .orderBy(asc(orgDepartments.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return rows as OrgDepartment[];
  }

  async createDepartment(payload: CreateDepartmentDto): Promise<OrgDepartment> {
    const [department] = await this.db
      .insert(orgDepartments)
      .values({
        id: randomUUID(),
        name: payload.name,
        code: payload.code ?? null,
        description: payload.description ?? null,
        isActive: payload.isActive ?? true,
      })
      .returning();
    return department as OrgDepartment;
  }

  async updateDepartment(
    departmentId: string,
    payload: Partial<CreateDepartmentDto>,
  ) {
    const [department] = await this.db
      .update(orgDepartments)
      .set({
        name: payload.name,
        code: payload.code,
        description: payload.description,
        isActive: payload.isActive,
      })
      .where(eq(orgDepartments.id, departmentId))
      .returning();
    return department as OrgDepartment | undefined;
  }

  async deleteDepartment(departmentId: string): Promise<boolean> {
    const [department] = await this.db
      .delete(orgDepartments)
      .where(eq(orgDepartments.id, departmentId))
      .returning({ id: orgDepartments.id });
    return Boolean(department);
  }

  async listDesignations(filters: DesignationFilterDto) {
    const { page, pageSize, search, isActive, level } = filters;
    const conditions = [sql`1 = 1`];

    if (search) {
      conditions.push(ilike(orgDesignations.title, `%${search}%`));
    }
    if (isActive !== undefined) {
      conditions.push(eq(orgDesignations.isActive, isActive));
    }
    if (level !== undefined) {
      conditions.push(eq(orgDesignations.level, level));
    }

    const rows = await this.db
      .select()
      .from(orgDesignations)
      .where(and(...conditions))
      .orderBy(asc(orgDesignations.title))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return rows as OrgDesignation[];
  }

  async createDesignation(
    payload: CreateDesignationDto,
  ): Promise<OrgDesignation> {
    const [designation] = await this.db
      .insert(orgDesignations)
      .values({
        id: randomUUID(),
        title: payload.title,
        code: payload.code ?? null,
        description: payload.description ?? null,
        level: payload.level ?? null,
        isActive: payload.isActive ?? true,
      })
      .returning();
    return designation as OrgDesignation;
  }

  async updateDesignation(
    designationId: string,
    payload: Partial<CreateDesignationDto>,
  ) {
    const [designation] = await this.db
      .update(orgDesignations)
      .set({
        title: payload.title,
        code: payload.code,
        description: payload.description,
        level: payload.level,
        isActive: payload.isActive,
      })
      .where(eq(orgDesignations.id, designationId))
      .returning();
    return designation as OrgDesignation | undefined;
  }

  async deleteDesignation(designationId: string): Promise<boolean> {
    const [designation] = await this.db
      .delete(orgDesignations)
      .where(eq(orgDesignations.id, designationId))
      .returning({ id: orgDesignations.id });
    return Boolean(designation);
  }

  async upsertAssignment(
    personId: string,
    payload: AssignOrgDto,
    orgId: string,
  ) {
    const [assignment] = await this.db
      .insert(employeeOrgAssignments)
      .values({
        personId,
        orgId,
        branchId: payload.branchId ?? null,
        departmentId: payload.departmentId ?? null,
        designationId: payload.designationId ?? null,
        managerId: payload.managerId ?? null,
      })
      .onConflictDoUpdate({
        target: employeeOrgAssignments.personId,
        set: {
          orgId,
          branchId: payload.branchId ?? null,
          departmentId: payload.departmentId ?? null,
          designationId: payload.designationId ?? null,
          managerId: payload.managerId ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return assignment as EmployeeOrgAssignment;
  }

  async getAssignment(
    personId: string,
  ): Promise<EmployeeOrgAssignment | undefined> {
    const [assignment] = await this.db
      .select()
      .from(employeeOrgAssignments)
      .where(eq(employeeOrgAssignments.personId, personId))
      .limit(1);
    return assignment as EmployeeOrgAssignment | undefined;
  }

  async getDirectReports(
    managerId: string,
    orgId: string,
  ): Promise<OrgAssignmentView[]> {
    const rows = await this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        branchId: employeeOrgAssignments.branchId,
        departmentId: employeeOrgAssignments.departmentId,
        designationId: employeeOrgAssignments.designationId,
        managerId: employeeOrgAssignments.managerId,
        orgId: employeeOrgAssignments.orgId,
      })
      .from(employeeOrgAssignments)
      .innerJoin(people, eq(employeeOrgAssignments.personId, people.id))
      .where(
        and(
          eq(employeeOrgAssignments.managerId, managerId),
          eq(employeeOrgAssignments.orgId, orgId),
        ),
      )
      .orderBy(asc(people.firstName));

    return rows as OrgAssignmentView[];
  }

  async getPersonSummary(personId: string, orgId: string) {
    const [person] = await this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        managerId: employeeOrgAssignments.managerId,
        orgId: employeeOrgAssignments.orgId,
      })
      .from(people)
      .leftJoin(
        employeeOrgAssignments,
        eq(employeeOrgAssignments.personId, people.id),
      )
      .where(
        and(eq(people.id, personId), eq(employeeOrgAssignments.orgId, orgId)),
      )
      .limit(1);

    return person as OrgAssignmentView | undefined;
  }
}
