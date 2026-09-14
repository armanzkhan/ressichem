declare global {
  var __demoRoles: any[] | undefined;
}

if (!global.__demoRoles) {
  global.__demoRoles = [
    {
      _id: "role1",
      name: "Super Admin",
      description: "Full system access with all permissions",
      permissions: [
        "user.view", "user.create", "user.edit", "user.delete",
        "role.view", "role.create", "role.edit", "role.delete",
        "customer.view", "customer.create", "customer.edit", "customer.delete",
        "product.view", "product.create", "product.edit", "product.delete",
        "order.view", "order.create", "order.edit", "order.delete", "order.updateStatus"
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "role2",
      name: "Sales Manager",
      description: "Manages sales team and customer orders",
      permissions: [
        "user.view", "user.create", "user.edit",
        "customer.view", "customer.create", "customer.edit", "customer.delete",
        "product.view",
        "order.view", "order.create", "order.edit", "order.updateStatus"
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "role3",
      name: "Sales Representative",
      description: "Handles customer interactions and order placement",
      permissions: [
        "customer.view", "customer.create", "customer.edit",
        "product.view",
        "order.view", "order.create", "order.edit"
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "role4",
      name: "Inventory Manager",
      description: "Manages product stock and inventory levels",
      permissions: [
        "product.view", "product.create", "product.edit", "product.delete",
        "order.view"
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

export const demoRoles = global.__demoRoles;

export function addRole(role: any) {
  demoRoles.push(role);
  return role;
}

export function getRole(id: string) {
  return demoRoles.find(r => r._id === id);
}

export function updateRole(id: string, updates: any) {
  const index = demoRoles.findIndex(r => r._id === id);
  if (index > -1) {
    demoRoles[index] = { ...demoRoles[index], ...updates, updatedAt: new Date().toISOString() };
    return demoRoles[index];
  }
  return null;
}

export function deleteRole(id: string) {
  const initialLength = demoRoles.length;
  global.__demoRoles = demoRoles.filter(r => r._id !== id); // Update global reference
  return global.__demoRoles.length < initialLength;
}
