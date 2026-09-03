export class RbacGuard {
  hasAccess(userRoles: string[], userPermissions: string[], requiredPermission: string): boolean {
    if (userRoles.includes('admin') || userRoles.includes('superadmin')) {
      return true;
    }
    return userPermissions.includes(requiredPermission);
  }
}
