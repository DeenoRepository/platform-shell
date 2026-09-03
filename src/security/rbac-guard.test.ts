import { describe, it, expect } from 'vitest';
import { RbacGuard } from './rbac-guard.js';

describe('RbacGuard', () => {
  const guard = new RbacGuard();

  it('allows access for admin and superadmin unconditionally', () => {
    expect(guard.hasAccess(['admin'], [], 'any:permission')).toBe(true);
    expect(guard.hasAccess(['superadmin'], [], 'any:permission')).toBe(true);
  });

  it('checks exact and global wildcard permissions', () => {
    expect(guard.hasAccess(['user'], ['eps:equipment:read'], 'eps:equipment:read')).toBe(true);
    expect(guard.hasAccess(['user'], ['eps:equipment:read'], 'eps:equipment:write')).toBe(false);
    expect(guard.hasAccess(['user'], ['*'], 'anything')).toBe(true);
  });

  it('checks namespace wildcard permissions', () => {
    expect(guard.hasAccess(['engineer'], ['eps:*'], 'eps:equipment:create')).toBe(true);
    expect(guard.hasAccess(['engineer'], ['eps:*'], 'wms:stock:read')).toBe(false);
  });

  it('checks all and any permissions', () => {
    const roles = ['operator'];
    const perms = ['wms:stock:read', 'eps:equipment:read'];

    expect(guard.hasAllPermissions(roles, perms, ['wms:stock:read', 'eps:equipment:read'])).toBe(true);
    expect(guard.hasAllPermissions(roles, perms, ['wms:stock:read', 'mro:work_order:write'])).toBe(false);

    expect(guard.hasAnyPermission(roles, perms, ['mro:work_order:write', 'wms:stock:read'])).toBe(true);
    expect(guard.hasAnyPermission(roles, perms, ['mro:work_order:write'])).toBe(false);
    expect(guard.hasAnyPermission(roles, perms, [])).toBe(true);
  });

  it('extracts security context from headers', () => {
    const ctx = guard.extractContextFromHeaders({
      'x-user-id': 'user-123',
      'x-user-roles': 'manager, engineer',
      'x-user-permissions': 'eps:*, wms:stock:read'
    });

    expect(ctx.userId).toBe('user-123');
    expect(ctx.roles).toEqual(['manager', 'engineer']);
    expect(ctx.permissions).toEqual(['eps:*', 'wms:stock:read']);

    const defaultCtx = guard.extractContextFromHeaders({});
    expect(defaultCtx.userId).toBe('anonymous');
    expect(defaultCtx.roles).toEqual([]);
    expect(defaultCtx.permissions).toEqual([]);
  });
});
