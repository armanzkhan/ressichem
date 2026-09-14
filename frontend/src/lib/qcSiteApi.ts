/**
 * QC Site Area API Service Layer
 * Centralized API calls for all QC Site Area SRS-Compliant modules
 */

import { getBackendUrl } from './getBackendUrl';
import { getAuthToken } from './auth';

function getToken(): string | null {
  return getAuthToken();
}

function getHeaders(): HeadersInit {
  const token = getToken();
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

const API_BASE = getBackendUrl();

// ========== Resin QC API ==========
export const resinQCApi = {
  getAll: async (params?: { batchNo?: string; productName?: string; grade?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/resin?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Resin QC records');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Resin QC record');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create Resin QC record');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update Resin QC record');
    return response.json();
  },
  remove: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete Resin QC record');
    return response.json();
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit Resin QC record');
    return response.json();
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to approve Resin QC record');
    return response.json();
  },

  reject: async (id: string, rejectionReason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/resin/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejectionReason }),
    });
    if (!response.ok) throw new Error('Failed to reject Resin QC record');
    return response.json();
  },

  getTrends: async (params?: { productName?: string; grade?: string; parameter?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.parameter) query.append('parameter', params.parameter);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/resin/trends?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Resin QC trends');
    return response.json();
  },
};

// ========== Hardener QC API ==========
export const hardenerQCApi = {
  getAll: async (params?: { batchNo?: string; productName?: string; grade?: string; category?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/hardener?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Hardener QC records');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Hardener QC record');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create Hardener QC record');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update Hardener QC record');
    return response.json();
  },
  remove: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete Hardener QC record');
    return response.json();
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit Hardener QC record');
    return response.json();
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to approve Hardener QC record');
    return response.json();
  },

  reject: async (id: string, rejectionReason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejectionReason }),
    });
    if (!response.ok) throw new Error('Failed to reject Hardener QC record');
    return response.json();
  },

  getTrends: async (params?: { productName?: string; grade?: string; category?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.category) query.append('category', params.category);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/hardener/trends?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Hardener QC trends');
    return response.json();
  },
};

// ========== LMS QC API ==========
export const lmsQCApi = {
  getAll: async (params?: { productType?: string; batchNo?: string; productName?: string; grade?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productType) query.append('productType', params.productType);
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/lms?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch LMS QC records');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch LMS QC record');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create LMS QC record');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update LMS QC record');
    return response.json();
  },
  remove: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete LMS QC record');
    return response.json();
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit LMS QC record');
    return response.json();
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to approve LMS QC record');
    return response.json();
  },

  reject: async (id: string, rejectionReason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/lms/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejectionReason }),
    });
    if (!response.ok) throw new Error('Failed to reject LMS QC record');
    return response.json();
  },
  getTrends: async (params?: { productType?: string; productName?: string; grade?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productType) query.append('productType', params.productType);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);

    const response = await fetch(`${API_BASE}/api/qc/site/lms/trends?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch LMS QC trends');
    return response.json();
  },
};

// ========== Packaging Material QC API ==========
export const packagingMaterialQCApi = {
  getAll: async (params?: { materialType?: string; materialName?: string; batchNo?: string; supplier?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.materialType) query.append('materialType', params.materialType);
    if (params?.materialName) query.append('materialName', params.materialName);
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.supplier) query.append('supplier', params.supplier);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Packaging Material QC records');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch Packaging Material QC record');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create Packaging Material QC record');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update Packaging Material QC record');
    return response.json();
  },

  approve: async (id: string, acceptanceNotes?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ acceptanceNotes }),
    });
    if (!response.ok) throw new Error('Failed to approve Packaging Material QC record');
    return response.json();
  },

  reject: async (id: string, rejectionNotes?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/packaging-material/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejectionNotes }),
    });
    if (!response.ok) throw new Error('Failed to reject Packaging Material QC record');
    return response.json();
  },
};

// ========== QA Bottle Filling API ==========
export const qaBottleFillingApi = {
  getAll: async (params?: { date?: string; operator?: string; shift?: string; machineId?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.operator) query.append('operator', params.operator);
    if (params?.shift) query.append('shift', params.shift);
    if (params?.machineId) query.append('machineId', params.machineId);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QA Bottle Filling records');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QA Bottle Filling record');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create QA Bottle Filling record');
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update QA Bottle Filling record');
    return response.json();
  },

  submit: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to submit QA Bottle Filling record');
    return response.json();
  },

  approve: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to approve QA Bottle Filling record');
    return response.json();
  },

  reject: async (id: string, rejectionReason?: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rejectionReason }),
    });
    if (!response.ok) throw new Error('Failed to reject QA Bottle Filling record');
    return response.json();
  },

  generateTraceabilitySheet: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/qa-bottle-filling/${id}/traceability-sheet`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to generate traceability sheet');
    return response.json();
  },
};

// ========== R&D Trial Batch API ==========
export const rdTrialBatchApi = {
  getAll: async (params?: { productFolder?: string; productName?: string; trialBatchNo?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productFolder) query.append('productFolder', params.productFolder);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.trialBatchNo) query.append('trialBatchNo', params.trialBatchNo);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch R&D Trial Batches');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch R&D Trial Batch');
    return response.json();
  },

  getByProductFolder: async (productFolder: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/product-folder/${productFolder}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch R&D Trial Batches by folder');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.error || result?.message || 'Failed to create R&D Trial Batch');
    }
    return result;
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update R&D Trial Batch');
    return response.json();
  },

  uploadLogSheet: async (id: string, file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
    if (companyId) headers['x-company-id'] = companyId;

    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/${id}/log-sheet`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || 'Failed to upload log sheet');
    return data;
  },

  compareTrials: async (data: { productFolder: string; currentTrialId: string; compareWith: string[] }) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/compare`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to compare trials');
    return response.json();
  },

  getCostComparison: async (productFolder: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/rnd-trials/cost-comparison/${productFolder}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch cost comparison');
    return response.json();
  },
};

// ========== Predictive Analytics API ==========
export const predictiveAnalyticsApi = {
  getBatchTrends: async (params?: { productType?: string; productName?: string; grade?: string; parameter?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productType) query.append('productType', params.productType);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.parameter) query.append('parameter', params.parameter);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/predictive-analytics/batch-trends?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch batch trends');
    return response.json();
  },

  getAbnormalityPredictions: async (params?: { productType?: string; productName?: string; grade?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productType) query.append('productType', params.productType);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/predictive-analytics/abnormality-predictions?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch abnormality predictions');
    return response.json();
  },
};

// ========== Power BI Export API ==========
export const powerBIExportApi = {
  exportResinQC: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/resin-qc?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export Resin QC data');
    return response.json();
  },

  exportHardenerQC: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/hardener-qc?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export Hardener QC data');
    return response.json();
  },

  exportTimeSeriesQC: async (params?: { module?: string; productName?: string; grade?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.module) query.append('module', params.module);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/timeseries-qc?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export time-series QC data');
    return response.json();
  },

  exportRDTrials: async (params?: { productFolder?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productFolder) query.append('productFolder', params.productFolder);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/rd-trials?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export R&D trial data');
    return response.json();
  },

  exportQALogs: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/qa-logs?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export QA logs');
    return response.json();
  },

  exportAll: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/site/powerbi-export/all?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export all data');
    return response.json();
  },
};

// ========== Document Index API ==========
export const qcDocumentIndexApi = {
  indexDocument: async (data: any) => {
    const response = await fetch(`${API_BASE}/api/qc/site/document-index/index`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to index document');
    return response.json();
  },

  search: async (params?: { batchNumber?: string; productName?: string; grade?: string; date?: string; module?: string; tags?: string[]; keyword?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.batchNumber) query.append('batchNumber', params.batchNumber);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.date) query.append('date', params.date);
    if (params?.module) query.append('module', params.module);
    if (params?.tags) params.tags.forEach(tag => query.append('tags', tag));
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    
    const response = await fetch(`${API_BASE}/api/qc/site/document-index/search?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search documents');
    return response.json();
  },

  getByBatchNumber: async (batchNumber: string) => {
    const response = await fetch(`${API_BASE}/api/qc/site/document-index/batch/${batchNumber}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch documents by batch number');
    return response.json();
  },

  getByProduct: async (productName: string, grade?: string) => {
    const url = grade 
      ? `${API_BASE}/api/qc/site/document-index/product/${productName}/${grade}`
      : `${API_BASE}/api/qc/site/document-index/product/${productName}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch documents by product');
    return response.json();
  },
};

// ========== Reporting API (Enhanced) ==========
export const qcSiteReportingApi = {
  getQCSummaryByBatch: async (params?: { batchNo?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.batchNo) query.append('batchNo', params.batchNo);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/summary/batch?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QC summary by batch');
    return response.json();
  },

  getQCSummaryByProduct: async (params?: { productName?: string; grade?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productName) query.append('productName', params.productName);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/summary/product?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QC summary by product');
    return response.json();
  },

  getQAAuditSummary: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/qa/audit-summary?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch QA audit summary');
    return response.json();
  },

  getBottleFillingTraceability: async (params?: { date?: string; operator?: string; shift?: string; machineId?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.operator) query.append('operator', params.operator);
    if (params?.shift) query.append('shift', params.shift);
    if (params?.machineId) query.append('machineId', params.machineId);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/qa/bottle-filling-traceability?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bottle filling traceability');
    return response.json();
  },

  getRDTrialHistory: async (params?: { productFolder?: string; productName?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.productFolder) query.append('productFolder', params.productFolder);
    if (params?.productName) query.append('productName', params.productName);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    
    const response = await fetch(`${API_BASE}/api/qc/reporting/rd/trial-history?${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch R&D trial history');
    return response.json();
  },
};

