import 'reflect-metadata';
import { RBAC_ROLES_KEY, RBAC_SCOPE_KEY, RequireRoles } from '@/rbac/rbac.decorators';

class TestController {
  @RequireRoles('ADMIN', 'SCOPE')
  handler() {
    return 'ok';
  }
}

describe('RequireRoles', () => {
  it('sets roles and scope metadata', () => {
    const roles = Reflect.getMetadata(RBAC_ROLES_KEY, TestController.prototype.handler);
    const scope = Reflect.getMetadata(RBAC_SCOPE_KEY, TestController.prototype.handler);

    expect(roles).toEqual(['ADMIN']);
    expect(scope).toBe('SCOPE');
  });
});
