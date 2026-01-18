import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AssignOrgDto,
  BranchFilterDto,
  CreateBranchDto,
  CreateDepartmentDto,
  CreateDesignationDto,
  DepartmentFilterDto,
  DesignationFilterDto,
  OrgReportingNode,
  ReportingTreeDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
} from '@/org/org.types';
import { OrgRepository } from '@/org/org.repository';

@Injectable()
export class OrgService {
  constructor(private readonly orgRepository: OrgRepository) {}

  async listBranches(filters: BranchFilterDto) {
    return this.orgRepository.listBranches(filters);
  }

  async createBranch(payload: CreateBranchDto) {
    try {
      return await this.orgRepository.createBranch(payload);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('org_branches_code_unique')
      ) {
        throw new ConflictException('Branch code already exists');
      }
      if (
        error instanceof Error &&
        error.message.includes('org_branches_name_unique')
      ) {
        throw new ConflictException('Branch name already exists');
      }
      throw error;
    }
  }

  async updateBranch(branchId: string, payload: UpdateBranchDto) {
    const updated = await this.orgRepository.updateBranch(branchId, payload);
    if (!updated) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
    return updated;
  }

  async deleteBranch(branchId: string) {
    const removed = await this.orgRepository.deleteBranch(branchId);
    if (!removed) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }
    return { removed: true };
  }

  async listDepartments(filters: DepartmentFilterDto) {
    return this.orgRepository.listDepartments(filters);
  }

  async createDepartment(payload: CreateDepartmentDto) {
    try {
      return await this.orgRepository.createDepartment(payload);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('org_departments_code_unique')
      ) {
        throw new ConflictException('Department code already exists');
      }
      if (
        error instanceof Error &&
        error.message.includes('org_departments_name_unique')
      ) {
        throw new ConflictException('Department name already exists');
      }
      throw error;
    }
  }

  async updateDepartment(departmentId: string, payload: UpdateDepartmentDto) {
    const updated = await this.orgRepository.updateDepartment(
      departmentId,
      payload,
    );
    if (!updated) {
      throw new NotFoundException(`Department ${departmentId} not found`);
    }
    return updated;
  }

  async deleteDepartment(departmentId: string) {
    const removed = await this.orgRepository.deleteDepartment(departmentId);
    if (!removed) {
      throw new NotFoundException(`Department ${departmentId} not found`);
    }
    return { removed: true };
  }

  async listDesignations(filters: DesignationFilterDto) {
    return this.orgRepository.listDesignations(filters);
  }

  async createDesignation(payload: CreateDesignationDto) {
    try {
      return await this.orgRepository.createDesignation(payload);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('org_designations_code_unique')
      ) {
        throw new ConflictException('Designation code already exists');
      }
      if (
        error instanceof Error &&
        error.message.includes('org_designations_title_unique')
      ) {
        throw new ConflictException('Designation title already exists');
      }
      throw error;
    }
  }

  async updateDesignation(
    designationId: string,
    payload: UpdateDesignationDto,
  ) {
    const updated = await this.orgRepository.updateDesignation(
      designationId,
      payload,
    );
    if (!updated) {
      throw new NotFoundException(`Designation ${designationId} not found`);
    }
    return updated;
  }

  async deleteDesignation(designationId: string) {
    const removed = await this.orgRepository.deleteDesignation(designationId);
    if (!removed) {
      throw new NotFoundException(`Designation ${designationId} not found`);
    }
    return { removed: true };
  }

  async assignOrg(
    personId: string,
    payload: AssignOrgDto,
    orgId: string | null,
  ) {
    if (
      payload.branchId === undefined &&
      payload.departmentId === undefined &&
      payload.designationId === undefined &&
      payload.managerId === undefined
    ) {
      throw new BadRequestException('No org assignment changes provided');
    }

    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    if (payload.managerId && payload.managerId === personId) {
      throw new BadRequestException('Manager cannot be the same as employee');
    }

    return this.orgRepository.upsertAssignment(personId, payload, orgId);
  }

  async getReportingTree(
    managerId: string,
    query: ReportingTreeDto,
    orgId: string | null,
  ) {
    if (!managerId) {
      throw new BadRequestException('managerId is required');
    }

    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const manager = await this.orgRepository.getPersonSummary(managerId, orgId);
    if (!manager) {
      throw new NotFoundException(`Manager ${managerId} not found`);
    }

    const directReports = await this.orgRepository.getDirectReports(
      managerId,
      orgId,
    );

    const buildTree = async (
      personId: string,
      visited: Set<string>,
    ): Promise<OrgReportingNode> => {
      const person = await this.orgRepository.getPersonSummary(personId, orgId);
      if (!person) {
        return {
          personId,
          firstName: '',
          lastName: '',
          email: null,
          managerId: null,
          reports: [],
        };
      }

      if (visited.has(person.personId)) {
        return {
          personId: person.personId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          managerId: person.managerId,
          reports: [],
        };
      }

      visited.add(person.personId);

      if (!query.recursive) {
        return {
          personId: person.personId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          managerId: person.managerId,
          reports: [],
        };
      }

      const children = await this.orgRepository.getDirectReports(
        person.personId,
        orgId,
      );
      const reports = await Promise.all(
        children.map((child) => buildTree(child.personId, visited)),
      );
      return {
        personId: person.personId,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        managerId: person.managerId,
        reports,
      };
    };

    const visited = new Set<string>([manager.personId]);
    const reports = await Promise.all(
      directReports.map((report) => buildTree(report.personId, visited)),
    );

    return {
      personId: manager.personId,
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.email,
      managerId: manager.managerId,
      reports,
    };
  }
}
