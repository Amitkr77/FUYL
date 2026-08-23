import { requirePermission, Permissions, Roles, authorize } from '../../src/shared/middleware/rbac.middleware';
import type { AuthedRequest } from '../../src/shared/middleware/auth.middleware';

function invoke(middleware: ReturnType<typeof requirePermission> | ReturnType<typeof authorize>, user?: AuthedRequest['user']) {
  const next = jest.fn();
  middleware({ user } as AuthedRequest, {} as never, next);
  return next;
}

describe('RBAC middleware', () => {
  it('allows staff with the requested permission', () => {
    const next = invoke(requirePermission(Permissions.WALLET_MANAGE), {
      userId: 'staff-id', email: 'staff@example.com', role: Roles.STAFF,
      permissions: [Permissions.WALLET_MANAGE],
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects staff without the requested permission', () => {
    const next = invoke(requirePermission(Permissions.WALLET_MANAGE), {
      userId: 'staff-id', email: 'staff@example.com', role: Roles.STAFF, permissions: [],
    });
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  it.each([Roles.ADMIN, Roles.SUPER_ADMIN])('keeps implicit full access for %s', (role) => {
    const next = invoke(requirePermission(Permissions.RETURNS_MANAGE), {
      userId: 'admin-id', email: 'admin@example.com', role, permissions: [],
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('does not let a granular permission bypass an explicit role guard', () => {
    const next = invoke(authorize(Roles.ADMIN, Roles.SUPER_ADMIN), {
      userId: 'staff-id', email: 'staff@example.com', role: Roles.STAFF,
      permissions: [Permissions.WALLET_MANAGE],
    });
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});
