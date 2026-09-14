// In-memory storage for demo products data
// This provides persistent data across API calls during development

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  company_id: string;
  createdAt: string;
  updatedAt: string;
}

// Demo products data
export const demoProducts: Product[] = [
  {
    _id: "product1",
    name: "Industrial Chemical A",
    description: "High-grade industrial chemical for manufacturing processes",
    price: 15000,
    category: "Chemicals",
    stock: 50,
    sku: "CHEM-A-001",
    company_id: "RESSICHEM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "product2",
    name: "Safety Equipment Set",
    description: "Complete safety equipment set for industrial workers",
    price: 8500,
    category: "Safety",
    stock: 25,
    sku: "SAFE-001",
    company_id: "RESSICHEM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "product3",
    name: "Laboratory Glassware",
    description: "Premium laboratory glassware for chemical analysis",
    price: 12000,
    category: "Laboratory",
    stock: 15,
    sku: "LAB-001",
    company_id: "RESSICHEM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "product4",
    name: "Chemical Storage Container",
    description: "Heavy-duty chemical storage container with safety features",
    price: 25000,
    category: "Storage",
    stock: 8,
    sku: "STOR-001",
    company_id: "RESSICHEM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "product5",
    name: "Industrial Solvent",
    description: "High-purity industrial solvent for cleaning applications",
    price: 18000,
    category: "Chemicals",
    stock: 30,
    sku: "SOLV-001",
    company_id: "RESSICHEM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper functions for managing products
export const addProduct = (product: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>): Product => {
  const newProduct: Product = {
    ...product,
    _id: `product_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  demoProducts.push(newProduct);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const index = demoProducts.findIndex(p => p._id === id);
  if (index === -1) return null;
  
  demoProducts[index] = {
    ...demoProducts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return demoProducts[index];
};

export const deleteProduct = (id: string): boolean => {
  const index = demoProducts.findIndex(p => p._id === id);
  if (index === -1) return false;
  
  demoProducts.splice(index, 1);
  return true;
};

export const getProductById = (id: string): Product | null => {
  return demoProducts.find(p => p._id === id) || null;
};
