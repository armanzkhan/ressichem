// In-memory storage for demo purposes
// Using global variable to persist across API calls
declare global {
  var __demoCustomers: any[] | undefined;
}

if (!global.__demoCustomers) {
  global.__demoCustomers = [
    {
      _id: "customer1",
      companyName: "ABC Construction Ltd",
      contactName: "John Smith",
      email: "john@abcconstruction.com",
      phone: "+1-555-0101",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "12345",
      country: "USA",
      company_id: "RESSICHEM",
      status: "active",
      customerType: "vip",
      totalOrders: 15,
      totalSpent: 45000,
      lastOrderDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "customer2",
      companyName: "XYZ Builders Inc",
      contactName: "Sarah Johnson",
      email: "sarah@xyzbuilders.com",
      phone: "+1-555-0102",
      street: "456 Oak Ave",
      city: "Los Angeles",
      state: "CA",
      zip: "90210",
      country: "USA",
      company_id: "RESSICHEM",
      status: "active",
      customerType: "premium",
      totalOrders: 8,
      totalSpent: 28000,
      lastOrderDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "customer3",
      companyName: "Metro Construction Co",
      contactName: "Mike Davis",
      email: "mike@metroconstruction.com",
      phone: "+1-555-0103",
      street: "789 Pine St",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      country: "USA",
      company_id: "RESSICHEM",
      status: "inactive",
      customerType: "regular",
      totalOrders: 3,
      totalSpent: 8500,
      lastOrderDate: new Date(Date.now() - 86400000 * 30).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "customer4",
      companyName: "Elite Manufacturing",
      contactName: "Jennifer Wilson",
      email: "jennifer@elitemanufacturing.com",
      phone: "+1-555-0104",
      street: "321 Industrial Blvd",
      city: "Houston",
      state: "TX",
      zip: "77001",
      country: "USA",
      company_id: "RESSICHEM",
      status: "active",
      customerType: "vip",
      totalOrders: 22,
      totalSpent: 75000,
      lastOrderDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: "customer5",
      companyName: "Tech Solutions Inc",
      contactName: "Robert Brown",
      email: "robert@techsolutions.com",
      phone: "+1-555-0105",
      street: "654 Tech Park Dr",
      city: "Austin",
      state: "TX",
      zip: "73301",
      country: "USA",
      company_id: "RESSICHEM",
      status: "suspended",
      customerType: "regular",
      totalOrders: 1,
      totalSpent: 2500,
      lastOrderDate: new Date(Date.now() - 86400000 * 60).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

export const demoCustomers = global.__demoCustomers;

export function addCustomer(customer: any) {
  const newCustomer = {
    ...customer,
    status: customer.status || "active",
    customerType: customer.customerType || "regular",
    totalOrders: customer.totalOrders || 0,
    totalSpent: customer.totalSpent || 0,
    lastOrderDate: customer.lastOrderDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  demoCustomers.push(newCustomer);
  return newCustomer;
}

export function getCustomer(id: string) {
  return demoCustomers.find(c => c._id === id);
}

export function updateCustomer(id: string, updates: any) {
  const index = demoCustomers.findIndex(c => c._id === id);
  if (index > -1) {
    demoCustomers[index] = { ...demoCustomers[index], ...updates, updatedAt: new Date().toISOString() };
    return demoCustomers[index];
  }
  return null;
}

export function deleteCustomer(id: string) {
  const initialLength = demoCustomers.length;
  global.__demoCustomers = demoCustomers.filter(c => c._id !== id); // Update global reference
  return global.__demoCustomers.length < initialLength;
}
