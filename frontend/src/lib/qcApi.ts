/**
 * QC Hub API Service Layer
 * Centralized API calls for all QC Hub modules
 */

import { getBackendUrl } from './getBackendUrl';
import {
  ensureQcAccessToken,
  expireQcSessionAndRedirect,
  getStoredQcToken,
  repairQcSessionIfNeeded,
} from './portalSession';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  repairQcSessionIfNeeded();
  return getStoredQcToken();
}

function apiBase(): string {
  return getBackendUrl();
}

function getHeaders(tokenOverride?: string | null): HeadersInit {
  const token = tokenOverride ?? getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const companyId = localStorage.getItem('company_id') || 'RESSICHEM';
  headers['x-company-id'] = companyId;
  return headers;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await ensureQcAccessToken();
  return getHeaders(token);
}

/** Authenticated fetch; redirects to QC login when the session token is missing or rejected. */
async function qcAuthorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });

  if (response.status === 401 || response.status === 403) {
    expireQcSessionAndRedirect();
  }

  return response;
}

async function parseApiError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await response.json();
    if (body?.message) message = body.message;
  } catch {
    // response body not JSON
  }

  if (response.status === 404) {
    message = `${fallback} (API not found — restart the backend to load QC Hub reporting routes)`;
  } else if (response.status === 401 || response.status === 403) {
    if (/invalid or expired token/i.test(message)) {
      message = 'Session expired. Please sign in again at QC Hub login.';
    } else if (!message || message === fallback) {
      message = 'Session expired. Please sign in again at QC Hub login.';
    }
  }
  throw new Error(message);
}

const API_BASE = apiBase();

// ========== Raw Materials API ==========
export const rawMaterialApi = {
  getAll: async (params?: { category?: string; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    
    const response = await fetch(`${API_BASE}/api/qc/raw-materials?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch raw materials');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch raw material');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create raw material');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update raw material');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete raw material');
    return response.json();
  },

  getBatches: async (materialId?: string, params?: { status?: string; expiringSoon?: boolean }) => {
    const query = new URLSearchParams();
    if (materialId) query.append('materialId', materialId);
    if (params?.status) query.append('status', params.status);
    if (params?.expiringSoon) query.append('expiringSoon', 'true');

    const basePath = materialId ? `/api/qc/raw-materials/${materialId}/batches` : `/api/qc/raw-materials/batches`;
    const response = await fetch(`${API_BASE}${basePath}?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch batches');
    return response.json();
  },

  createBatch: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials/batches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create batch');
    return response.json();
  },

  updateBatch: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/raw-materials/batches/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update batch');
    return response.json();
  },
};

// ========== Formulations API ==========
export const formulationApi = {
  getAll: async (params?: { mode?: string; status?: string; productType?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.mode) query.append('mode', params.mode);
    if (params?.status) query.append('status', params.status);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.search) query.append('search', params.search);
    
    const response = await fetch(`${API_BASE}/api/qc/formulations?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch formulations');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch formulation');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create formulation');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update formulation');
    return response.json();
  },

  createVersion: async (parentId: string, data: { changeReason?: string; version?: string }) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${parentId}/version`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create version');
    return response.json();
  },

  submitToQC: async (id: string, comments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}/submit-to-qc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comments }),
    });
    if (!response.ok) throw new Error('Failed to submit to QC');
    return response.json();
  },

  approveForQC: async (id: string, comments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}/approve-for-qc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comments }),
    });
    if (!response.ok) throw new Error('Failed to approve for QC');
    return response.json();
  },

  freeze: async (id: string, freezeReason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}/freeze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ freezeReason }),
    });
    if (!response.ok) throw new Error('Failed to freeze formulation');
    return response.json();
  },

  generateBOM: async (id: string, quantity?: number) => {
    const query = quantity ? `?quantity=${quantity}` : '';
    const response = await fetch(`${API_BASE}/api/qc/formulations/${id}/bom${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to generate BOM');
    return response.json();
  },
};

// ========== R&D Experiments API ==========
export const rdExperimentApi = {
  getAll: async (params?: { status?: string; productType?: string; search?: string; assignedTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.search) query.append('search', params.search);
    if (params?.assignedTo) query.append('assignedTo', params.assignedTo);
    
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Failed to fetch experiments');
    }
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch experiment');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create experiment');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update experiment');
    return response.json();
  },

  addTrial: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}/trials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add trial');
    return response.json();
  },

  updateTrial: async (id: string, trialNo: number, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}/trials/${trialNo}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update trial');
    return response.json();
  },

  compareTrials: async (id: string, trialNos?: number[]) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}/compare`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ trialNos }),
    });
    if (!response.ok) throw new Error('Failed to compare trials');
    return response.json();
  },

  complete: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/rnd/experiments/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to complete experiment');
    return response.json();
  },
};

// ========== Complaints API ==========
export const complaintApi = {
  getAll: async (params?: { status?: string; severity?: string; productType?: string; from?: string; to?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.search) query.append('search', params.search);
    
    const response = await fetch(`${API_BASE}/api/qc/complaints?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Failed to fetch complaints');
    }
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch complaint');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create complaint');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update complaint');
    return response.json();
  },

  startInvestigation: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}/investigate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to start investigation');
    return response.json();
  },

  submitForReview: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}/submit-for-review`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit for review');
    return response.json();
  },

  managementReview: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}/management-review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to complete management review');
    return response.json();
  },

  resolve: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to resolve complaint');
    return response.json();
  },

  close: async (id: string, comments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/complaints/${id}/close`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comments }),
    });
    if (!response.ok) throw new Error('Failed to close complaint');
    return response.json();
  },
};

// ========== CAPA API ==========
export const capaApi = {
  getAll: async (params?: { status?: string; sourceType?: string; priority?: string; assignedTo?: string; from?: string; to?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.sourceType) query.append('sourceType', params.sourceType);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.assignedTo) query.append('assignedTo', params.assignedTo);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.search) query.append('search', params.search);
    
    const response = await fetch(`${API_BASE}/api/qc/capa?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch CAPAs');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch CAPA');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/capa`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create CAPA');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update CAPA');
    return response.json();
  },

  conductRootCauseAnalysis: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/root-cause-analysis`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to conduct root cause analysis');
    return response.json();
  },

  submitForApproval: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/submit-for-approval`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit for approval');
    return response.json();
  },

  approve: async (id: string, comments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comments }),
    });
    if (!response.ok) throw new Error('Failed to approve CAPA');
    return response.json();
  },

  startImplementation: async (id: string, notes?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/start-implementation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error('Failed to start implementation');
    return response.json();
  },

  updateImplementation: async (id: string, data: { progress?: number; notes?: string }) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/implementation`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update implementation');
    return response.json();
  },

  verify: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to verify CAPA');
    return response.json();
  },

  close: async (id: string, closureComments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/capa/${id}/close`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ closureComments }),
    });
    if (!response.ok) throw new Error('Failed to close CAPA');
    return response.json();
  },
};

// ========== MRM API ==========
export const mrmApi = {
  getAll: async (params?: { reviewPeriod?: string; status?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.reviewPeriod) query.append('reviewPeriod', params.reviewPeriod);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/mrm?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch MRMs');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch MRM');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create MRM');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update MRM');
    return response.json();
  },

  pullData: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm/${id}/pull-data`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to pull MRM data');
    return response.json();
  },

  complete: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to complete MRM');
    return response.json();
  },

  approve: async (id: string, comments?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/mrm/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comments }),
    });
    if (!response.ok) throw new Error('Failed to approve MRM');
    return response.json();
  },
};

// ========== Reporting API ==========
export const reportingApi = {
  generateCertificate: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/reporting/certificate/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to generate certificate');
    return response.json();
  },

  getPerformanceDashboard: async (params?: { from?: string; to?: string; productType?: string; grade?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.grade) query.append('grade', params.grade);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/dashboard/performance?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch performance dashboard');
    return response.json();
  },

  getComplaintDashboard: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/dashboard/complaints?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch complaint dashboard');
    return response.json();
  },

  getCAPADashboard: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/dashboard/capa?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch CAPA dashboard');
    return response.json();
  },

  getENCompliance: async (params?: { from?: string; to?: string; standardCode?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.standardCode) query.append('standardCode', params.standardCode);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/en-compliance?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch EN compliance');
    return response.json();
  },

  exportData: async (type: string, format: string = 'csv', params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    query.append('type', type);
    query.append('format', format);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/export?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export data');
    
    if (format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return { success: true };
    }
    
    return response.json();
  },
};

// ========== QC Hub Forms API (Existing) ==========
export const qcHubFormApi = {
  getAll: async (params?: { planGroup?: string; formType?: string; productType?: string; batchNo?: string; sampleTrackingNo?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.planGroup) query.append('planGroup', params.planGroup);
    if (params?.formType) query.append('formType', params.formType);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.sampleTrackingNo) query.append('sampleTrackingNo', params.sampleTrackingNo);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/hub/forms?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QC Hub forms');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QC Hub form');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create QC Hub form');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update QC Hub form');
    return response.json();
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit QC Hub form');
    return response.json();
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to approve QC Hub form');
    return response.json();
  },

  reject: async (id: string, reason: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to reject QC Hub form');
    return response.json();
  },

  uploadAttachment: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (companyId) {
      headers['x-company-id'] = companyId;
    }
    
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/${id}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload attachment');
    return response.json();
  },

  exportCsv: async (params?: { planGroup?: string; formType?: string; status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.planGroup) query.append('planGroup', params.planGroup);
    if (params?.formType) query.append('formType', params.formType);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', String(params.limit));
    
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (companyId) {
      headers['x-company-id'] = companyId;
    }
    
    const response = await fetch(`${API_BASE}/api/qc/hub/forms/export.csv?${query}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc_hub_forms_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
};

// ========== QC Hub Plan API (Existing) ==========
export const qcHubPlanApi = {
  getAll: async (params?: { planGroup?: string; productType?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.planGroup) query.append('planGroup', params.planGroup);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.active !== undefined) query.append('active', String(params.active));
    
    const response = await fetch(`${API_BASE}/api/qc/hub/plan?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QC Hub plan');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create QC Hub plan item');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/plan/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update QC Hub plan item');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/plan/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete QC Hub plan item');
    return response.json();
  },
};

// ========== Enhanced QC Results API ==========
export const qcResultApi = {
  getProductTests: async (productType: string) => {
    const response = await fetch(`${API_BASE}/api/qc/results/product-tests?productType=${productType}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch product tests');
    return response.json();
  },

  compareSpecs: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/results/${id}/compare-specs`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to compare specs');
    return response.json();
  },

  checkENCompliance: async (id: string, standardCode?: string) => {
    const query = standardCode ? `?standardCode=${standardCode}` : '';
    const response = await fetch(`${API_BASE}/api/qc/results/${id}/en-compliance${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to check EN compliance');
    return response.json();
  },
};

// ========== QC Hub Batch Records (Dry Mortar SRS 3.1) ==========
export const qcHubBatchApi = {
  getModules: async () => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/modules`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
  },
  getAll: async (params?: { module?: string; category?: string; productName?: string; batchNo?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '') query.append(k, String(v)); });
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch batch records');
    return response.json();
  },
  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch batch record');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to create batch record');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to update batch record');
    return response.json();
  },
  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}/submit`, { method: 'POST', headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to submit batch record');
    return response.json();
  },
  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}/approve`, { method: 'POST', headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to approve batch record');
    return response.json();
  },
  reject: async (id: string, reason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}/reject`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reason }) });
    if (!response.ok) throw new Error('Failed to reject batch record');
    return response.json();
  },
  getTrends: async (params?: { module?: string; productName?: string; grade?: string; parameter?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/trends?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch trends');
    return response.json();
  },
  uploadAttachment: async (id: string, file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (companyId) headers['x-company-id'] = companyId;
    const response = await fetch(`${API_BASE}/api/qc/hub/batch-records/${id}/attachments`, { method: 'POST', headers, body: formData });
    if (!response.ok) throw new Error('Failed to upload attachment');
    return response.json();
  },
};

// ========== QC Hub Analytics (Dry Mortar SRS 3.4 & 6) ==========
export const qcHubAnalyticsApi = {
  getDashboard: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const response = await fetch(`${API_BASE}/api/qc/hub/analytics/dashboard?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },
  getTrends: async (params?: { module?: string; productName?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE}/api/qc/hub/analytics/trends?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch analytics trends');
    return response.json();
  },
  getAbnormalityAlerts: async (params?: { module?: string; productName?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE}/api/qc/hub/analytics/abnormality?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch abnormality alerts');
    return response.json();
  },
  downloadPowerBI: async (format: 'csv' | 'xlsx' | 'json', params?: { module?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams({ format });
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE}/api/qc/hub/analytics/powerbi?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Export failed');
    if (format === 'json') return response.json();
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc_hub_dry_mortar.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
};

// ========== QC Hub Reporting (Dry Mortar SRS 3.6) ==========
async function fetchHubReport(path: string, fallback: string): Promise<any> {
  try {
    const response = await qcAuthorizedFetch(`${apiBase()}${path}`);
    if (!response.ok) await parseApiError(response, fallback);
    return response.json();
  } catch (e: any) {
    if (e?.name === 'TypeError' && /fetch/i.test(String(e?.message))) {
      throw new Error(`Cannot reach QC server at ${apiBase()}. Ensure backend is running on port 5000.`);
    }
    throw e;
  }
}

export const qcHubReportingApi = {
  getQcSummary: async (params?: { module?: string; productName?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    return fetchHubReport(`/api/qc/hub/reporting/qc-summary?${query}`, 'Failed to fetch QC summary');
  },
  getQaAuditReport: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    return fetchHubReport(`/api/qc/hub/reporting/qa-audit?${query}`, 'Failed to fetch QA audit report');
  },
  getRawMaterialReport: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    return fetchHubReport(`/api/qc/hub/reporting/raw-material?${query}`, 'Failed to fetch raw material report');
  },
  getPackagingReport: async () => fetchHubReport('/api/qc/hub/reporting/packaging', 'Failed to fetch packaging report'),
  getRndTrialReport: async () => fetchHubReport('/api/qc/hub/reporting/rnd-trials', 'Failed to fetch R&D trial report'),
  getProductComparison: async (productName: string, module?: string) => {
    const query = new URLSearchParams({ productName });
    if (module) query.append('module', module);
    return fetchHubReport(`/api/qc/hub/reporting/product-comparison?${query}`, 'Failed to fetch product comparison');
  },
  getTraceability: async (batchNo: string) =>
    fetchHubReport(
      `/api/qc/hub/reporting/traceability?batchNo=${encodeURIComponent(batchNo)}`,
      'Failed to fetch traceability report'
    ),
};

// ========== QC Hub NCR ==========
export const ncrApi = {
  getAll: async (params?: Record<string, string>) => {
    const query = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}/api/qc/hub/ncr?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch NCRs');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/ncr`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to create NCR');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/ncr/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to update NCR');
    return response.json();
  },
  close: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/ncr/${id}/close`, { method: 'POST', headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to close NCR');
    return response.json();
  },
};

// ========== QC Hub Calibration ==========
export const calibrationApi = {
  getAll: async (params?: Record<string, string>) => {
    const query = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}/api/qc/hub/calibration?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch calibration records');
    return response.json();
  },
  getDueSoon: async () => {
    const response = await fetch(`${API_BASE}/api/qc/hub/calibration/due-soon`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch due calibrations');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/calibration`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to create calibration record');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/calibration/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to update calibration record');
    return response.json();
  },
};

// ========== QC Hub Internal Audits ==========
export const internalAuditApi = {
  getAll: async (params?: Record<string, string>) => {
    const query = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}/api/qc/hub/audits?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch audits');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/audits`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to create audit');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/audits/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to update audit');
    return response.json();
  },
  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/hub/audits/${id}/approve`, { method: 'POST', headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to approve audit');
    return response.json();
  },
};

// ========== Packaging Material QC ==========
export const packagingMaterialApi = {
  getAll: async (params?: { materialType?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) query.append(k, v); });
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material?${query}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch packaging QC records');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Failed to create packaging QC record');
    return response.json();
  },
};

