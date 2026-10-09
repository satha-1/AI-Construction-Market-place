import { json, qs, request } from "./client";
import type {
  ActivityEntry,
  AdminOverview,
  AdminProject,
  AdminRate,
  AdminVendor,
  AgentReply,
  AgentRunSummary,
  AppNotification,
  AuditEntry,
  BoqItem,
  CatalogItem,
  CatalogItemInput,
  CustomerDashboard,
  Document,
  EstimateLine,
  Flag,
  MarketCatalog,
  MarketCategory,
  MarketVendor,
  MarketVendorDetail,
  Num,
  Project,
  QuotationInput,
  RfqComparison,
  RfqDetail,
  RfqSummary,
  User,
  Vendor,
  VendorDashboard,
  VendorInput,
  VendorMatch,
  VendorQuotationRow,
} from "./types";

export * from "./client";
export * from "./types";

const post = (body?: unknown): RequestInit => ({ method: "POST", ...(body === undefined ? {} : json(body)) });
const patch = (body: unknown): RequestInit => ({ method: "PATCH", ...json(body) });

export const api = {
  // auth
  register: (payload: { email: string; password: string; full_name: string; role: string }) =>
    request<User>("/api/auth/register", post(payload)),
  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string }>("/api/auth/login", post(payload)),
  me: () => request<User>("/api/auth/me"),

  // dashboards + notifications
  customerDashboard: () => request<CustomerDashboard>("/api/dashboard/customer"),
  vendorDashboard: () => request<VendorDashboard>("/api/dashboard/vendor"),
  notifications: (unreadOnly = false) =>
    request<{ unread: number; items: AppNotification[] }>(`/api/notifications${qs({ unread_only: unreadOnly ? "true" : undefined })}`),
  markNotificationRead: (id: string) => request(`/api/notifications/${id}/read`, post()),
  markAllNotificationsRead: () => request(`/api/notifications/read-all`, post()),

  // admin
  adminOverview: () => request<AdminOverview>("/api/admin/overview"),
  adminUsers: () => request<User[]>("/api/admin/users"),
  adminUpdateRole: (userId: string, role: string) => request<User>(`/api/admin/users/${userId}`, patch({ role })),
  adminSetUserActive: (userId: string, is_active: boolean) =>
    request<User>(`/api/admin/users/${userId}/status`, patch({ is_active })),
  adminVendors: () => request<AdminVendor[]>("/api/admin/vendors"),
  adminSetVendorStatus: (vendorId: string, status: string) =>
    request(`/api/admin/vendors/${vendorId}/status`, patch({ status })),
  adminProjects: () => request<AdminProject[]>("/api/admin/projects"),
  adminRates: () => request<AdminRate[]>("/api/admin/rates"),
  adminUpdateRate: (rateId: string, payload: { unit_rate: number; currency: string }) =>
    request<AdminRate>(`/api/admin/rates/${rateId}`, patch(payload)),
  adminAudit: (params: { action?: string; entity_type?: string; actor_type?: string; limit?: number; offset?: number }) =>
    request<{ total: number; items: AuditEntry[] }>(`/api/admin/audit-log${qs(params)}`),

  // projects
  projects: () => request<Project[]>("/api/projects"),
  createProject: (payload: { name: string; description?: string; location?: string; budget_cap?: number }) =>
    request<Project>("/api/projects", post(payload)),
  project: (id: string) => request<Project>(`/api/projects/${id}`),
  documents: (projectId: string) => request<Document[]>(`/api/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<Document>(`/api/projects/${projectId}/documents`, { method: "POST", body });
  },
  generateBoq: (projectId: string) => request(`/api/projects/${projectId}/boq/generate`, post()),
  calculateEstimate: (projectId: string) => request(`/api/projects/${projectId}/estimate/calculate`, post()),
  boq: (projectId: string) =>
    request<{ boq: { id: string; version: number; status: string } | null; items: BoqItem[] }>(`/api/projects/${projectId}/boq`),
  estimate: (projectId: string) =>
    request<{ estimate: { id: string; total_cost: Num; currency: string; version?: number } | null; line_items: EstimateLine[] }>(
      `/api/projects/${projectId}/estimate`,
    ),
  documentChunks: (projectId: string, docId: string) =>
    request<{ id: string; chunk_index: number; content: string }[]>(`/api/projects/${projectId}/documents/${docId}/chunks`),
  updateBoqItem: (itemId: string, payload: { quantity?: number; item_name?: string; is_verified?: boolean }) =>
    request(`/api/boq-items/${itemId}`, patch(payload)),
  agentTools: (runId: string) =>
    request<{ tool_name?: string; name?: string; status?: string; input?: unknown; output?: unknown; latency_ms?: number; [k: string]: unknown }[]>(`/api/agent/runs/${runId}/tools`),
  agentRuns: (projectId: string) => request<AgentRunSummary[]>(`/api/projects/${projectId}/agent/runs`),
  verification: (projectId: string) => request<Flag[]>(`/api/projects/${projectId}/verification-queue`),
  verifyAction: (flagId: string, action: "approve" | "reject" | "correct", body?: { new_value?: Record<string, unknown>; comment?: string }) =>
    request<{ flag_id: string; status: string; action: string; estimate?: { id: string; total_cost: Num; currency: string } }>(
      `/api/verification/${flagId}/${action}`,
      post(body ?? {}),
    ),
  audit: (projectId: string) => request<AuditEntry[]>(`/api/projects/${projectId}/audit-log`),
  agentMessage: (projectId: string, message: string) =>
    request<AgentReply>(`/api/projects/${projectId}/agent/message`, post({ message })),

  // vendors
  vendors: () => request<Vendor[]>("/api/vendors"),
  createVendor: (payload: VendorInput) => request<Vendor>("/api/vendors", post(payload)),
  updateVendor: (vendorId: string, payload: Partial<VendorInput>) => request<Vendor>(`/api/vendors/${vendorId}`, patch(payload)),
  myVendor: () => request<Vendor>("/api/vendors/me"),
  vendorCatalog: (vendorId: string) => request<CatalogItem[]>(`/api/vendors/${vendorId}/catalog`),
  createCatalogItem: (vendorId: string, payload: CatalogItemInput) =>
    request<{ id: string }>(`/api/vendors/${vendorId}/catalog-items`, post(payload)),
  updateCatalogItem: (itemId: string, payload: Partial<Pick<CatalogItem, "item_name" | "category" | "unit">> & { unit_price?: number; available_quantity?: number }) =>
    request(`/api/vendors/catalog-items/${itemId}`, patch(payload)),
  publishCatalogItem: (itemId: string) => request(`/api/vendors/catalog-items/${itemId}/publish`, post()),
  unpublishCatalogItem: (itemId: string) => request(`/api/vendors/catalog-items/${itemId}/unpublish`, post()),
  deleteCatalogItem: (itemId: string) => request(`/api/vendors/catalog-items/${itemId}`, { method: "DELETE" }),
  vendorDocuments: (vendorId: string) => request<Document[]>(`/api/vendors/${vendorId}/documents`),
  uploadVendorDocument: (vendorId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/vendors/${vendorId}/documents`, { method: "POST", body });
  },
  vendorSearch: (projectId: string) => request<{ matches: VendorMatch[] }>(`/api/projects/${projectId}/vendor-search`, post()),
  vendorQuotations: (vendorId: string) => request<VendorQuotationRow[]>(`/api/vendors/${vendorId}/quotations`),

  // rfq
  rfqs: (projectId: string) => request<RfqSummary[]>(`/api/projects/${projectId}/rfqs`),
  createRfq: (projectId: string, payload: { vendor_ids: string[]; boq_item_ids?: string[]; deadline?: string }) =>
    request<{ id: string }>(`/api/projects/${projectId}/rfqs`, post(payload)),
  rfq: (rfqId: string) => request<RfqDetail>(`/api/rfqs/${rfqId}`),
  vendorRfqs: (vendorId: string) => request<RfqSummary[]>(`/api/vendors/${vendorId}/rfqs`),
  submitQuotation: (rfqId: string, payload: QuotationInput) => request(`/api/rfqs/${rfqId}/quotations`, post(payload)),
  selectQuotation: (quotationId: string) => request(`/api/quotations/${quotationId}/select`, post()),
  rfqComparison: (rfqId: string) => request<RfqComparison>(`/api/rfqs/${rfqId}/comparison`),

  // public marketplace
  marketLocations: () => request<string[]>("/api/marketplace/locations"),
  marketCatalog: (params: { q?: string; category?: string; location?: string; vendor_id?: string; min_price?: number; max_price?: number; sort?: string; limit?: number; offset?: number }) =>
    request<MarketCatalog>(`/api/marketplace/catalog${qs(params)}`),
  marketCategories: () => request<MarketCategory[]>("/api/marketplace/categories"),
  marketVendors: (params: { q?: string; category?: string; location?: string }) => request<MarketVendor[]>(`/api/marketplace/vendors${qs(params)}`),
  marketVendor: (vendorId: string) => request<MarketVendorDetail>(`/api/marketplace/vendors/${vendorId}`),
};

export type { ActivityEntry };
