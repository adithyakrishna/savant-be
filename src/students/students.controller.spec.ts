import { StudentsController } from '@/students/students.controller';

describe('StudentsController', () => {
  it('passes query params to service', async () => {
    const service = {
      getAll: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({}),
      createOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({ removed: true, hardDelete: false }),
      restoreOne: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new StudentsController(service);
    const req = { authSession: { user: { id: 'u1' } } } as any;

    await controller.getStudents(req, 'true');
    await controller.getStudent(req, 'p1');
    await controller.createStudent(req, { firstName: 'Ada', lastName: 'Lovelace' } as any);
    await controller.updateStudent(req, 'p1', { firstName: 'Ada' } as any);
    await controller.deleteStudent(req, 'p1', 'true');
    await controller.restoreStudent(req, 'p1');

    expect(service.getAll).toHaveBeenCalledWith(req.authSession, true);
    expect(service.getOne).toHaveBeenCalledWith(req.authSession, 'p1');
    expect(service.createOne).toHaveBeenCalled();
    expect(service.updateOne).toHaveBeenCalledWith(req.authSession, 'p1', { firstName: 'Ada' });
    expect(service.deleteOne).toHaveBeenCalledWith(req.authSession, 'p1', true);
    expect(service.restoreOne).toHaveBeenCalledWith(req.authSession, 'p1');
  });

  it('defaults includeDeleted and hard delete when params are missing', async () => {
    const service = {
      getAll: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({}),
      createOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({ removed: true, hardDelete: false }),
      restoreOne: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new StudentsController(service);
    const req = {} as any;

    await controller.getStudents(req, undefined);
    await controller.deleteStudent(req, 'p1', undefined);

    expect(service.getAll).toHaveBeenCalledWith(null, false);
    expect(service.deleteOne).toHaveBeenCalledWith(null, 'p1', false);
  });
});
