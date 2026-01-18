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
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { HrmsAccessGuard } from '@/hrms/hrms.guard';
import { ORG_HEADER_KEY } from '@/org/org.constants';
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

@ApiTags('Org')
@ApiBearerAuth()
@ApiHeader({ name: ORG_HEADER_KEY, required: true, example: 'ORG-0' })
@Controller('org')
@UseGuards(VerifiedUserGuard, RolesGuard, HrmsAccessGuard, OrgContextGuard)
@RequireRoles(['SUPER_ADMIN', 'ADMIN'])
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('branches')
  @ApiOperation({ summary: 'List org branches' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'search', required: false, description: 'Name search' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  listBranches(
    @Query(new ZodValidationPipe(branchFilterSchema)) query: BranchFilterDto,
  ) {
    return this.orgService.listBranches(query);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create a branch' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'HQ' },
        code: { type: 'string', nullable: true, example: 'HQ-01' },
        address: { type: 'string', nullable: true, example: '123 Main St' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  createBranch(
    @Body(new ZodValidationPipe(createBranchSchema)) body: CreateBranchDto,
  ) {
    return this.orgService.createBranch(body);
  }

  @Patch('branches/:branchId')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'HQ' },
        code: { type: 'string', nullable: true, example: 'HQ-01' },
        address: { type: 'string', nullable: true, example: '123 Main St' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  updateBranch(
    @Param('branchId') branchId: string,
    @Body(new ZodValidationPipe(updateBranchSchema)) body: UpdateBranchDto,
  ) {
    return this.orgService.updateBranch(branchId, body);
  }

  @Delete('branches/:branchId')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  deleteBranch(@Param('branchId') branchId: string) {
    return this.orgService.deleteBranch(branchId);
  }

  @Get('departments')
  @ApiOperation({ summary: 'List org departments' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'search', required: false, description: 'Name search' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  listDepartments(
    @Query(new ZodValidationPipe(departmentFilterSchema))
    query: DepartmentFilterDto,
  ) {
    return this.orgService.listDepartments(query);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a department' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Engineering' },
        code: { type: 'string', nullable: true, example: 'ENG' },
        description: {
          type: 'string',
          nullable: true,
          example: 'Product engineering team',
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  createDepartment(
    @Body(new ZodValidationPipe(createDepartmentSchema))
    body: CreateDepartmentDto,
  ) {
    return this.orgService.createDepartment(body);
  }

  @Patch('departments/:departmentId')
  @ApiOperation({ summary: 'Update a department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Engineering' },
        code: { type: 'string', nullable: true, example: 'ENG' },
        description: {
          type: 'string',
          nullable: true,
          example: 'Product engineering team',
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  updateDepartment(
    @Param('departmentId') departmentId: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema))
    body: UpdateDepartmentDto,
  ) {
    return this.orgService.updateDepartment(departmentId, body);
  }

  @Delete('departments/:departmentId')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  deleteDepartment(@Param('departmentId') departmentId: string) {
    return this.orgService.deleteDepartment(departmentId);
  }

  @Get('designations')
  @ApiOperation({ summary: 'List org designations' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({ name: 'search', required: false, description: 'Title search' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description: 'Designation level',
  })
  listDesignations(
    @Query(new ZodValidationPipe(designationFilterSchema))
    query: DesignationFilterDto,
  ) {
    return this.orgService.listDesignations(query);
  }

  @Post('designations')
  @ApiOperation({ summary: 'Create a designation' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', example: 'Senior Engineer' },
        code: { type: 'string', nullable: true, example: 'SE-2' },
        description: {
          type: 'string',
          nullable: true,
          example: 'Senior engineering role',
        },
        level: { type: 'number', example: 2 },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  createDesignation(
    @Body(new ZodValidationPipe(createDesignationSchema))
    body: CreateDesignationDto,
  ) {
    return this.orgService.createDesignation(body);
  }

  @Patch('designations/:designationId')
  @ApiOperation({ summary: 'Update a designation' })
  @ApiParam({ name: 'designationId', description: 'Designation ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Senior Engineer' },
        code: { type: 'string', nullable: true, example: 'SE-2' },
        description: {
          type: 'string',
          nullable: true,
          example: 'Senior engineering role',
        },
        level: { type: 'number', example: 2 },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  updateDesignation(
    @Param('designationId') designationId: string,
    @Body(new ZodValidationPipe(updateDesignationSchema))
    body: UpdateDesignationDto,
  ) {
    return this.orgService.updateDesignation(designationId, body);
  }

  @Delete('designations/:designationId')
  @ApiOperation({ summary: 'Delete a designation' })
  @ApiParam({ name: 'designationId', description: 'Designation ID' })
  deleteDesignation(@Param('designationId') designationId: string) {
    return this.orgService.deleteDesignation(designationId);
  }

  @Patch('assignments/:personId')
  @ApiOperation({ summary: 'Assign org reporting attributes' })
  @ApiParam({ name: 'personId', description: 'Person ID to update' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        branchId: { type: 'string', nullable: true, example: 'branch_123' },
        departmentId: { type: 'string', nullable: true, example: 'dept_123' },
        designationId: { type: 'string', nullable: true, example: 'des_123' },
        managerId: { type: 'string', nullable: true, example: 'person_456' },
      },
    },
  })
  assignOrg(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(assignOrgSchema)) body: AssignOrgDto,
  ) {
    const orgId = (req as RequestWithOrgContext).orgId ?? null;
    return this.orgService.assignOrg(personId, body, orgId);
  }

  @Get('reporting/:managerId')
  @ApiOperation({ summary: 'Get reporting tree for a manager' })
  @ApiParam({ name: 'managerId', description: 'Manager person ID' })
  @ApiQuery({
    name: 'recursive',
    required: false,
    description: 'Include all nested reports',
  })
  getReportingTree(
    @Req() req: Request,
    @Param('managerId') managerId: string,
    @Query(new ZodValidationPipe(reportingTreeSchema)) query: ReportingTreeDto,
  ) {
    const orgId = (req as RequestWithOrgContext).orgId ?? null;
    return this.orgService.getReportingTree(managerId, query, orgId);
  }
}
