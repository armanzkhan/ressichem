export interface CustomerLedger {
  _id: string;
  customerId: {
    _id: string;
    companyName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  companyId: string;
  currentBalance: number;
  creditLimit: number;
  paymentTerms: string;
  accountStatus: 'Active' | 'Suspended' | 'Closed' | 'On Hold';
  lastPaymentDate?: string;
  lastInvoiceDate?: string;
  lastPaymentAmount: number;
  totalInvoiced: number;
  totalPaid: number;
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  creditUtilization: number;
  daysSinceLastPayment?: number;
  daysSinceLastInvoice?: number;
  aging?: AgingAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerTransaction {
  _id: string;
  customerId: string;
  companyId: string;
  transactionType: 'Invoice' | 'Payment' | 'Credit' | 'Adjustment' | 'Refund' | 'Write-off';
  referenceId: string;
  referenceNumber: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  description: string;
  transactionDate: string;
  paymentMethod?: 'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'Other';
  checkNumber?: string;
  bankReference?: string;
  notes?: string;
  isReversed: boolean;
  reversedBy?: string;
  reversedAt?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  netAmount: number;
  ageInDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgingAnalysis {
  current: number;      // 0-30 days
  days31to60: number;   // 31-60 days
  days61to90: number;   // 61-90 days
  over90: number;       // Over 90 days
  total: number;
}

export interface CustomerLedgerData {
  ledger: CustomerLedger;
  transactions: LedgerTransaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTransactions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaymentData {
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'Other';
  checkNumber?: string;
  bankReference?: string;
  description?: string;
  notes?: string;
  referenceId?: string;
  referenceNumber?: string;
}

export interface LedgerSummary {
  totalCustomers: number;
  totalOutstanding: number;
  totalInvoiced: number;
  totalPaid: number;
  activeCustomers: number;
  suspendedCustomers: number;
  overdueCustomers: number;
}

export interface AgingReport {
  ledgers: CustomerLedger[];
  totalAging: AgingAnalysis;
}
