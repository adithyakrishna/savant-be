import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StudentsService } from '@/students/students.service';

describe('StudentsService', () => {
  const adminSession = { user: { id: 'admin', emailVerified: true } } as any;
  const studentSession = {
    user: { id: 's1', emailVerified: true, personId: 'p1' },
  } as any;

  it('rejects when session is missing', async () => {
    const repo = { findById: jest.fn() } as any;
    const rbac = { getUserScopeRoles: jest.fn() } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getOne(null, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires admin to create', async () => {
    const repo = { create: jest.fn() } as any;
    const rbac = { requireRole: jest.fn().mockRejectedValue(new ForbiddenException()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.createOne(adminSession, {} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('validates required names', async () => {
    const repo = { create: jest.fn() } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, { firstName: '', lastName: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps EMAIL_EXISTS to conflict', async () => {
    const repo = { create: jest.fn().mockRejectedValue(new Error('EMAIL_EXISTS')) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, { firstName: 'Ada', lastName: 'Lovelace' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows create errors', async () => {
    const repo = { create: jest.fn().mockRejectedValue(new Error('boom')) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, { firstName: 'Ada', lastName: 'Lovelace' } as any),
    ).rejects.toThrow('boom');
  });

  it('returns all students', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([]) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getAll(adminSession, true)).resolves.toEqual([]);
  });

  it('defaults includeDeleted to false', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([]) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await service.getAll(adminSession);
    expect(repo.findAll).toHaveBeenCalledWith(false);
  });

  it('allows student to read self', async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ personId: 'p1' }) } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['STUDENT'])),
      requireRole: jest.fn(),
    } as any;
    const service = new StudentsService(repo, rbac);

    const result = await service.getOne(studentSession, 'p1');
    expect(result).toEqual({ personId: 'p1' });
  });

  it('rejects when student is not self', async () => {
    const repo = { findById: jest.fn() } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['STUDENT'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getOne(studentSession, 'p2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when student not found', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getOne(adminSession, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects empty name update', async () => {
    const repo = { update: jest.fn() } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps update EMAIL_EXISTS to conflict', async () => {
    const repo = { update: jest.fn().mockRejectedValue(new Error('EMAIL_EXISTS')) } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { email: 'a@example.com' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows update errors', async () => {
    const repo = { update: jest.fn().mockRejectedValue(new Error('boom')) } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).rejects.toThrow('boom');
  });

  it('throws when update returns undefined', async () => {
    const repo = { update: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a student', async () => {
    const repo = { update: jest.fn().mockResolvedValue({ personId: 'p1' }) } as any;
    const rbac = { getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).resolves.toEqual({ personId: 'p1' });
  });

  it('rejects delete when not found', async () => {
    const repo = { softDelete: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects hard delete when not found', async () => {
    const repo = { hardDelete: jest.fn().mockResolvedValue(false) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft deletes student', async () => {
    const repo = { softDelete: jest.fn().mockResolvedValue({ personId: 'p1' }) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1')).resolves.toEqual({
      removed: true,
      hardDelete: false,
    });
  });

  it('hard deletes student', async () => {
    const repo = { hardDelete: jest.fn().mockResolvedValue(true) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1', true)).resolves.toEqual({
      removed: true,
      hardDelete: true,
    });
  });

  it('restores a student', async () => {
    const repo = { restore: jest.fn().mockResolvedValue({ personId: 'p1' }) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.restoreOne(adminSession, 'p1')).resolves.toEqual({
      personId: 'p1',
    });
  });

  it('throws when restore misses', async () => {
    const repo = { restore: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.restoreOne(adminSession, 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
