import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { HrmsAccessGuard } from '@/hrms/hrms.guard';
import { OrgContextGuard, RequestWithOrg } from '@/org/org.guard';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { OrgService } from '@/org/org.service';
import type {
  AssignOrgDto,
  BranchFilterDto,
  CreateBranchDto,
  CreateDepartmentDto,
  CreateDesignationDto,
  DepartmentFilterDto,
  DesignationFilterDto,
  ReportingTreeDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
} from '@/org/org.types';
import {
  assignOrgSchema,
  branchFilterSchema,
  createBranchSchema,
  createDepartmentSchema,
  createDesignationSchema,
  departmentFilterSchema,
  designationFilterSchema,
  reportingTreeSchema,
  updateBranchSchema,
  updateDepartmentSchema,
  updateDesignationSchema,
} from '@/org/org.types';

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithOrgContext = RequestWithSession & RequestWithOrg;

@Controller('org')
@UseGuards(VerifiedUserGuard, RolesGuard, HrmsAccessGuard, OrgContextGuard)
@RequireRoles(['SUPER_ADMIN', 'ADMIN'])
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('branches')
  listBranches(
    @Query(new ZodValidationPipe(branchFilterSchema)) query: BranchFilterDto,
  ) {
    return this.orgService.listBranches(query);
  }

  @Post('branches')
  createBranch(
    @Body(new ZodValidationPipe(createBranchSchema)) body: CreateBranchDto,
  ) {
    return this.orgService.createBranch(body);
  }

  @Patch('branches/:branchId')
  updateBranch(
    @Param('branchId') branchId: string,
    @Body(new ZodValidationPipe(updateBranchSchema)) body: UpdateBranchDto,
  ) {
    return this.orgService.updateBranch(branchId, body);
  }

  @Delete('branches/:branchId')
  deleteBranch(@Param('branchId') branchId: string) {
    return this.orgService.deleteBranch(branchId);
  }

  @Get('departments')
  listDepartments(
    @Query(new ZodValidationPipe(departmentFilterSchema))
    query: DepartmentFilterDto,
  ) {
    return this.orgService.listDepartments(query);
  }

  @Post('departments')
  createDepartment(
    @Body(new ZodValidationPipe(createDepartmentSchema))
    body: CreateDepartmentDto,
  ) {
    return this.orgService.createDepartment(body);
  }

  @Patch('departments/:departmentId')
  updateDepartment(
    @Param('departmentId') departmentId: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema))
    body: UpdateDepartmentDto,
  ) {
    return this.orgService.updateDepartment(departmentId, body);
  }

  @Delete('departments/:departmentId')
  deleteDepartment(@Param('departmentId') departmentId: string) {
    return this.orgService.deleteDepartment(departmentId);
  }

  @Get('designations')
  listDesignations(
    @Query(new ZodValidationPipe(designationFilterSchema))
    query: DesignationFilterDto,
  ) {
    return this.orgService.listDesignations(query);
  }

  @Post('designations')
  createDesignation(
    @Body(new ZodValidationPipe(createDesignationSchema))
    body: CreateDesignationDto,
  ) {
    return this.orgService.createDesignation(body);
  }

  @Patch('designations/:designationId')
  updateDesignation(
    @Param('designationId') designationId: string,
    @Body(new ZodValidationPipe(updateDesignationSchema))
    body: UpdateDesignationDto,
  ) {
    return this.orgService.updateDesignation(designationId, body);
  }

  @Delete('designations/:designationId')
  deleteDesignation(@Param('designationId') designationId: string) {
    return this.orgService.deleteDesignation(designationId);
  }

  @Patch('assignments/:personId')
  assignOrg(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(assignOrgSchema)) body: AssignOrgDto,
  ) {
    const orgId = (req as RequestWithOrgContext).orgId ?? null;
    return this.orgService.assignOrg(personId, body, orgId);
  }

  @Get('reporting/:managerId')
  getReportingTree(
    @Req() req: Request,
    @Param('managerId') managerId: string,
    @Query(new ZodValidationPipe(reportingTreeSchema)) query: ReportingTreeDto,
  ) {
    const orgId = (req as RequestWithOrgContext).orgId ?? null;
    return this.orgService.getReportingTree(managerId, query, orgId);
  }
}
