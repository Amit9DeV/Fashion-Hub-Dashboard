export const rolePermissions = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard:view", "billing:use", "orders:view", "products:view", "inventory:view",
    "customers:view", "pricing:manage", "purchases:manage", "expenses:manage",
    "returns:manage", "reports:view", "whatsapp:manage",
  ],
  CASHIER: [
    "billing:use",
    "orders:view",
    "customers:view",
    "returns:manage",
    "products:view",
    "inventory:view",
  ],
};

export function can(user, permission) {
  const permissions = rolePermissions[user?.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}
