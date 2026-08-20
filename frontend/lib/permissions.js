export const rolePermissions = {
  ADMIN: ["*"],
  MANAGER: ["dashboard:view", "billing:use", "orders:view", "products:view", "inventory:view", "customers:view"],
  CASHIER: ["billing:use", "orders:view", "customers:view"],
};

export function can(user, permission) {
  const permissions = rolePermissions[user?.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}
