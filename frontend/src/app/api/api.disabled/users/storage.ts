// In-memory storage for demo purposes
// Using global variable to persist across API calls
declare global {
  var __demoUsers: any[] | undefined;
}

if (!global.__demoUsers) {
  global.__demoUsers = [
    {
      _id: "user1",
      user_id: "admin_001",
      firstName: "Super",
      lastName: "Admin",
      email: "admin@ressichem.com",
      phone: "+92-300-1234567",
      role: "Super Admin",
      company_id: "RESSICHEM",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "user2",
      user_id: "manager_001",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@ressichem.com",
      phone: "+92-300-2345678",
      role: "Sales Manager",
      company_id: "RESSICHEM",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "user3",
      user_id: "rep_001",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@ressichem.com",
      phone: "+92-300-3456789",
      role: "Sales Representative",
      company_id: "RESSICHEM",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "user4",
      user_id: "inventory_001",
      firstName: "Mike",
      lastName: "Davis",
      email: "mike.davis@ressichem.com",
      phone: "+92-300-4567890",
      role: "Inventory Manager",
      company_id: "RESSICHEM",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

export const demoUsers = global.__demoUsers;

export function addUser(user: any) {
  demoUsers.push(user);
  return user;
}

export function getUser(id: string) {
  return demoUsers.find(u => u._id === id);
}

export function updateUser(id: string, updates: any) {
  const index = demoUsers.findIndex(u => u._id === id);
  if (index > -1) {
    demoUsers[index] = { ...demoUsers[index], ...updates, updatedAt: new Date().toISOString() };
    return demoUsers[index];
  }
  return null;
}

export function getAllUsers() {
  return demoUsers;
}

export function deleteUser(id: string) {
  console.log("deleteUser called with ID:", id);
  console.log("Current users in storage:", demoUsers.map(u => ({ id: u._id, name: `${u.firstName} ${u.lastName}` })));
  console.log("Looking for user with ID:", id);
  
  const userExists = demoUsers.find(u => u._id === id);
  console.log("User found in storage:", !!userExists);
  
  if (!userExists) {
    console.log("User not found in in-memory storage");
    return false;
  }
  
  const initialLength = demoUsers.length;
  global.__demoUsers = demoUsers.filter(u => u._id !== id); // Update global reference
  const deleted = global.__demoUsers.length < initialLength;
  console.log("Delete successful:", deleted);
  console.log("Remaining users:", global.__demoUsers.length);
  return deleted;
}
