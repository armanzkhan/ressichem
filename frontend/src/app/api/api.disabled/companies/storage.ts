// In-memory storage for demo companies data
// This provides persistent data across API calls during development

export interface Company {
  _id: string;
  company_id: string;
  name: string;
  email: string;
  address: string;
  userCount: number;
  createdAt: string;
  isActive: boolean;
  industry: string;
  departments: string[];
}

// Demo companies data
export const demoCompanies: Company[] = [
  {
    _id: "company1",
    company_id: "RESSICHEM",
    name: "Ressichem",
    email: "admin@ressichem.com",
    address: "123 Chemical Street, Karachi, Pakistan",
    userCount: 25,
    createdAt: new Date().toISOString(),
    isActive: true,
    industry: "Chemical Manufacturing",
    departments: ["HR", "Finance", "IT", "Sales", "Production"]
  },
  {
    _id: "company2",
    company_id: "TECHCORP",
    name: "TechCorp Solutions",
    email: "contact@techcorp.com",
    address: "456 Tech Street, Lahore, Pakistan",
    userCount: 45,
    createdAt: new Date().toISOString(),
    isActive: true,
    industry: "Technology",
    departments: ["HR", "Finance", "IT", "Development", "Marketing"]
  },
  {
    _id: "company3",
    company_id: "GLOBALMFG",
    name: "Global Manufacturing Inc",
    email: "info@globalmfg.com",
    address: "789 Industrial Ave, Islamabad, Pakistan",
    userCount: 120,
    createdAt: new Date().toISOString(),
    isActive: true,
    industry: "Manufacturing",
    departments: ["HR", "Finance", "IT", "Production", "Quality"]
  },
  {
    _id: "company4",
    company_id: "RETAILMAX",
    name: "RetailMax Corporation",
    email: "support@retailmax.com",
    address: "321 Commerce Blvd, Karachi, Pakistan",
    userCount: 78,
    createdAt: new Date().toISOString(),
    isActive: false,
    industry: "Retail",
    departments: ["HR", "Finance", "IT", "Sales", "Operations"]
  }
];

// Helper functions for managing companies
export const addCompany = (company: Omit<Company, '_id' | 'createdAt'>): Company => {
  const newCompany: Company = {
    ...company,
    _id: `company_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  demoCompanies.push(newCompany);
  return newCompany;
};

export const updateCompany = (id: string, updates: Partial<Company>): Company | null => {
  const index = demoCompanies.findIndex(c => c._id === id);
  if (index === -1) return null;
  
  demoCompanies[index] = {
    ...demoCompanies[index],
    ...updates
  };
  return demoCompanies[index];
};

export const deleteCompany = (id: string): boolean => {
  const index = demoCompanies.findIndex(c => c._id === id);
  if (index === -1) return false;
  
  demoCompanies.splice(index, 1);
  return true;
};

export const getCompanyById = (id: string): Company | null => {
  return demoCompanies.find(c => c._id === id) || null;
};
