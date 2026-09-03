export interface UserSecurityContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export class RbacGuard {
  hasAccess(userRoles: string[], userPermissions: string[], requiredPermission: string): boolean {
    if (userRoles.includes('admin') || userRoles.includes('superadmin')) {
      return true;
    }

    if (userPermissions.includes(requiredPermission) || userPermissions.includes('*')) {
      return true;
    }

    // Check wildcard namespace permissions (e.g. 'eps:*' matches 'eps:equipment:read')
    const [ns] = requiredPermission.split(':');
    if (ns && userPermissions.includes(`${ns}:*`)) {
      return true;
    }

    return false;
  }

  hasAllPermissions(userRoles: string[], userPermissions: string[], required: string[]): boolean {
    return required.every(perm => this.hasAccess(userRoles, userPermissions, perm));
  }

  hasAnyPermission(userRoles: string[], userPermissions: string[], required: string[]): boolean {
    if (required.length === 0) return true;
    return required.some(perm => this.hasAccess(userRoles, userPermissions, perm));
  }

  extractContextFromHeaders(headers: Record<string, string | string[] | undefined>): UserSecurityContext {
    const userId = (headers['x-user-id'] as string) || 'anonymous';
    const rolesHeader = (headers['x-user-roles'] as string) || '';
    const permsHeader = (headers['x-user-permissions'] as string) || '';

    const roles = rolesHeader ? rolesHeader.split(',').map(r => r.trim()).filter(Boolean) : [];
    const permissions = permsHeader ? permsHeader.split(',').map(p => p.trim()).filter(Boolean) : [];

    return { userId, roles, permissions };
  }
}
