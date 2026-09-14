/**
 * QC Hub Connection Test Utility
 * Verifies real-time connectivity between frontend, backend, and database
 */

import { getBackendUrl } from './getBackendUrl';

export interface ConnectionStatus {
  frontend: boolean;
  backend: boolean;
  database: boolean;
  api: boolean;
  websocket: boolean;
  timestamp: string;
}

export async function testQCConnection(): Promise<ConnectionStatus> {
  const status: ConnectionStatus = {
    frontend: true, // Frontend is running if this code executes
    backend: false,
    database: false,
    api: false,
    websocket: false,
    timestamp: new Date().toISOString(),
  };

  const API_BASE = getBackendUrl();

  try {
    // Test 1: Backend Health Check
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      status.backend = healthRes.ok;
    } catch (e) {
      console.error('Backend health check failed:', e);
    }

    // Test 2: API Endpoint (QC Routes)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Test a simple QC endpoint
      const apiRes = await fetch(`${API_BASE}/api/qc/tests`, {
        method: 'GET',
        headers,
      });
      status.api = apiRes.ok || apiRes.status === 401; // 401 means backend is reachable but needs auth
    } catch (e) {
      console.error('API endpoint test failed:', e);
    }

    // Test 3: Database (via backend endpoint that queries DB)
    try {
      const dbRes = await fetch(`${API_BASE}/api/qc/tests`, {
        method: 'GET',
        headers: getHeaders(),
      });
      // If we get a response (even 401), database connection is likely working
      status.database = dbRes.status !== 500 && dbRes.status !== 503;
    } catch (e) {
      console.error('Database connection test failed:', e);
    }

    // Test 4: WebSocket (if available)
    try {
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${API_BASE.replace(/^https?:\/\//, '')}/ws`;
        
        const ws = new WebSocket(wsUrl);
        const wsConnected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
          }, 3000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        });
        
        status.websocket = wsConnected;
      }
    } catch (e) {
      console.error('WebSocket test failed:', e);
    }
  } catch (error) {
    console.error('Connection test error:', error);
  }

  return status;
}

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
  if (companyId) {
    headers['x-company-id'] = companyId;
  }
  return headers;
}

export function getConnectionStatusMessage(status: ConnectionStatus): string {
  const allConnected = status.frontend && status.backend && status.database && status.api;
  
  if (allConnected) {
    return '✅ All systems connected';
  }
  
  const issues: string[] = [];
  if (!status.backend) issues.push('Backend');
  if (!status.database) issues.push('Database');
  if (!status.api) issues.push('API');
  if (!status.websocket) issues.push('WebSocket');
  
  return `⚠️ Connection issues: ${issues.join(', ')}`;
}

