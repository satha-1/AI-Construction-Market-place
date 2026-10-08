export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "customer" | "vendor" | "admin";
  created_at?: string;
};

export type AdminOverview = {
  users: number;
  customers: number;
  vendors: number;
  admins: number;
  projects: number;
  vendor_profiles: number;
  open_flags: number;
};

export type AdminRate = {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  default_formula: string;
  unit_rate: string;
  currency: string;
  effective_date: string;
};

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: string;
  budget_cap: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProject = Project & {
  owner_email: string;
  owner_name: string;
};

export type Document = {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  uploaded_at: string;
};

export type BoqItem = {
  id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  quantity: string | number | null;
  confidence_score: string | number | null;
  is_verified: boolean;
};

export type Flag = {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  confidence_score: string | number | null;
  status: string;
};

export type Vendor = {
  id: string;
  company_name: string;
  category: string | null;
  location: string | null;
};

const TOKEN_KEY = "conapp_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register: (payload: { email: string; password: string; full_name: string; role: string }) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<User>("/api/auth/me"),
  adminOverview: () => request<AdminOverview>("/api/admin/overview"),
  adminUsers: () => request<User[]>("/api/admin/users"),
  adminUpdateRole: (userId: string, role: string) =>
    request<User>(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  adminProjects: () => request<AdminProject[]>("/api/admin/projects"),
  adminRates: () => request<AdminRate[]>("/api/admin/rates"),
  adminUpdateRate: (rateId: string, payload: { unit_rate: number; currency: string }) =>
    request<AdminRate>(`/api/admin/rates/${rateId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  projects: () => request<Project[]>("/api/projects"),
  createProject: (payload: { name: string; description?: string; location?: string; budget_cap?: number }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) }),
  project: (id: string) => request<Project>(`/api/projects/${id}`),
  documents: (projectId: string) => request<Document[]>(`/api/projects/${projectId}/documents`),
  documentChunks: (projectId: string, docId: string) =>
    request<{ id: string; chunk_index: number; content: string; metadata: unknown }[]>(
      `/api/projects/${projectId}/documents/${docId}/chunks`,
    ),
  uploadDocument: (projectId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<Document>(`/api/projects/${projectId}/documents`, { method: "POST", body });
  },
  generateBoq: (projectId: string) => request(`/api/projects/${projectId}/boq/generate`, { method: "POST" }),
  calculateEstimate: (projectId: string) => request(`/api/projects/${projectId}/estimate/calculate`, { method: "POST" }),
  boq: (projectId: string) => request<{ boq: { id: string; version: number; status: string } | null; items: BoqItem[] }>(`/api/projects/${projectId}/boq`),
  estimate: (projectId: string) =>
    request<{ estimate: { id: string; total_cost: string | number; currency: string } | null; line_items: unknown[] }>(
      `/api/projects/${projectId}/estimate`,
    ),
  verification: (projectId: string) => request<Flag[]>(`/api/projects/${projectId}/verification-queue`),
  verifyAction: (flagId: string, action: "approve" | "reject" | "correct", body?: { new_value?: Record<string, unknown>; comment?: string }) =>
    request(`/api/verification/${flagId}/${action}`, { method: "POST", body: JSON.stringify(body ?? {}) }),
  audit: (projectId: string) => request<unknown[]>(`/api/projects/${projectId}/audit-log`),
  agentMessage: (projectId: string, message: string) =>
    request<{ id: string; final_response: string; status: string }>(`/api/projects/${projectId}/agent/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  agentTools: (runId: string) => request<unknown[]>(`/api/agent/runs/${runId}/tools`),
  vendors: () => request<Vendor[]>("/api/vendors"),
  marketplaceCatalog: (q?: string) =>
    request<unknown[]>(`/api/vendors/marketplace/catalog${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createVendor: (payload: { company_name: string; category?: string; location?: string; description?: string }) =>
    request<Vendor>("/api/vendors", { method: "POST", body: JSON.stringify(payload) }),
  myVendor: () => request<Vendor>("/api/vendors/me"),
  vendorCatalog: (vendorId: string) => request<unknown[]>(`/api/vendors/${vendorId}/catalog`),
  uploadVendorDocument: (vendorId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/vendors/${vendorId}/documents`, { method: "POST", body });
  },
  publishCatalogItem: (itemId: string) => request(`/api/vendors/catalog-items/${itemId}/publish`, { method: "POST" }),
  vendorSearch: (projectId: string) => request<{ matches: unknown[] }>(`/api/projects/${projectId}/vendor-search`, { method: "POST" }),
  rfqs: (projectId: string) => request<unknown[]>(`/api/projects/${projectId}/rfqs`),
  createRfq: (projectId: string, payload: { vendor_ids: string[]; boq_item_ids?: string[] }) =>
    request(`/api/projects/${projectId}/rfqs`, { method: "POST", body: JSON.stringify(payload) }),
  vendorRfqs: (vendorId: string) => request<unknown[]>(`/api/vendors/${vendorId}/rfqs`),
  compareRfq: (rfqId: string) => request<unknown>(`/api/rfqs/${rfqId}/comparison`),
  submitQuotation: (
    rfqId: string,
    payload: {
      currency?: string;
      lines: { rfq_line_item_id: string; unit_price: number; quantity: number; lead_time?: string }[];
    },
  ) => request(`/api/rfqs/${rfqId}/quotations`, { method: "POST", body: JSON.stringify(payload) }),
};
