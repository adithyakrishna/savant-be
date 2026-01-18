import { z } from 'zod';

export interface OrgBranch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgDepartment {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgDesignation {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  level: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeOrgAssignment {
  personId: string;
  orgId: string;
  branchId: string | null;
  departmentId: string | null;
  designationId: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgAssignmentView {
  personId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  branchId: string | null;
  departmentId: string | null;
  designationId: string | null;
  managerId: string | null;
  orgId: string | null;
}

export interface OrgReportingNode {
  personId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  managerId: string | null;
  reports: OrgReportingNode[];
}

const optionalString = z.string().trim().min(1).optional();

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 1))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: 'page must be a positive integer',
    }),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 20))
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 100, {
      message: 'pageSize must be between 1 and 100',
    }),
});

export const branchFilterSchema = paginationSchema.extend({
  search: optionalString,
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const departmentFilterSchema = paginationSchema.extend({
  search: optionalString,
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const designationFilterSchema = paginationSchema.extend({
  search: optionalString,
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  level: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value === undefined || Number.isInteger(value), {
      message: 'level must be an integer',
    }),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(1),
  code: optionalString,
  address: optionalString,
  isActive: z.boolean().optional(),
});

export const updateBranchSchema = z.object({
  name: optionalString,
  code: optionalString,
  address: optionalString,
  isActive: z.boolean().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1),
  code: optionalString,
  description: optionalString,
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
  name: optionalString,
  code: optionalString,
  description: optionalString,
  isActive: z.boolean().optional(),
});

export const createDesignationSchema = z.object({
  title: z.string().trim().min(1),
  code: optionalString,
  description: optionalString,
  level: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateDesignationSchema = z.object({
  title: optionalString,
  code: optionalString,
  description: optionalString,
  level: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const assignOrgSchema = z.object({
  branchId: z.string().trim().min(1).nullable().optional(),
  departmentId: z.string().trim().min(1).nullable().optional(),
  designationId: z.string().trim().min(1).nullable().optional(),
  managerId: z.string().trim().min(1).nullable().optional(),
});

export const reportingTreeSchema = z.object({
  recursive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type BranchFilterDto = z.infer<typeof branchFilterSchema>;
export type DepartmentFilterDto = z.infer<typeof departmentFilterSchema>;
export type DesignationFilterDto = z.infer<typeof designationFilterSchema>;
export type CreateBranchDto = z.infer<typeof createBranchSchema>;
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>;
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
export type CreateDesignationDto = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationDto = z.infer<typeof updateDesignationSchema>;
export type AssignOrgDto = z.infer<typeof assignOrgSchema>;
export type ReportingTreeDto = z.infer<typeof reportingTreeSchema>;
