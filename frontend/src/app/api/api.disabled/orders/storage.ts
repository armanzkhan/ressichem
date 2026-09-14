declare global {
  var __demoOrders: any[] | undefined;
}

if (!global.__demoOrders) {
  global.__demoOrders = [
    {
      _id: "demo1",
      orderNumber: "ORD-0001",
      customer: {
        _id: "customer1",
        companyName: "ABC Construction Ltd",
        contactName: "John Smith",
        email: "john@abcconstruction.com"
      },
      status: "pending",
      total: 52250,
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      items: [
        {
          product: { _id: "prod1", name: "Premium Dry Mix Mortar", price: 2500 },
          quantity: 10,
          unitPrice: 2500,
          total: 25000
        },
        {
          product: { _id: "prod3", name: "Waterproofing Membrane", price: 250 },
          quantity: 100,
          unitPrice: 250,
          total: 25000
        }
      ]
    },
    {
      _id: "demo2",
      orderNumber: "ORD-0002",
      customer: {
        _id: "customer2",
        companyName: "XYZ Builders Inc",
        contactName: "Sarah Johnson",
        email: "sarah@xyzbuilders.com"
      },
      status: "active",
      total: 24000,
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      items: [
        {
          product: { _id: "prod2", name: "Epoxy Floor Coating", price: 4500 },
          quantity: 5,
          unitPrice: 4500,
          total: 22500
        },
        {
          product: { _id: "prod4", name: "Concrete Repair Mortar", price: 150 },
          quantity: 10,
          unitPrice: 150,
          total: 1500
        }
      ]
    },
    {
      _id: "demo3",
      orderNumber: "ORD-0003",
      customer: {
        _id: "customer3",
        companyName: "Metro Construction Co",
        contactName: "Mike Davis",
        email: "mike@metroconstruction.com"
      },
      status: "completed",
      total: 15000,
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      items: [
        {
          product: { _id: "prod5", name: "Tile Adhesive", price: 1500 },
          quantity: 10,
          unitPrice: 1500,
          total: 15000
        }
      ]
    }
  ];
}

export const demoOrders = global.__demoOrders;

export function addOrder(order: any) {
  demoOrders.push(order);
  return order;
}

export function getOrder(id: string) {
  return demoOrders.find(o => o._id === id);
}

export function updateOrder(id: string, updates: any) {
  const index = demoOrders.findIndex(o => o._id === id);
  if (index > -1) {
    demoOrders[index] = { ...demoOrders[index], ...updates, updatedAt: new Date().toISOString() };
    return demoOrders[index];
  }
  return null;
}

export function deleteOrder(id: string) {
  const initialLength = demoOrders.length;
  global.__demoOrders = demoOrders.filter(o => o._id !== id); // Update global reference
  return global.__demoOrders.length < initialLength;
}

export function updateOrderStatus(id: string, status: string) {
  const index = demoOrders.findIndex(o => o._id === id);
  if (index > -1) {
    demoOrders[index].status = status;
    demoOrders[index].updatedAt = new Date().toISOString();
    return demoOrders[index];
  }
  return null;
}
