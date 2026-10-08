export type Role = "customer" | "vendor" | "admin";
export type Num = string | number;

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active?: boolean;
  created_at?: string;
};

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: string;
  budget_cap: Num | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProject = Project & { owner_email: string; owner_name: string };

export type AdminOverview = {
  users: number;
  customers: number;
  vendors: number;
  admins: number;
  projects: number;
  vendor_profiles: number;
  open_flags: number;
  rfqs: number;
  quotations: number;
  catalog_items: number;
  published_items: number;
  documents: number;
};

export type AdminRate = {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  default_formula: string;
  unit_rate: Num;
  currency: string;
  effective_date: string;
};

export type AdminVendor = {
  id: string;
  company_name: string;
  category: string | null;
  location: string | null;
  status: string;
  contact_email: string | null;
  owner_email: string;
  owner_name: string;
  catalog_items: number;
  published_items: number;
  created_at: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  actor_type: string;
  entity_type: string;
  entity_id: string | null;
  confidence_score: Num | null;
  created_at: string;
  user_email?: string | null;
  project_id?: string | null;
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
  quantity: Num | null;
  confidence_score: Num | null;
  is_verified: boolean;
};

export type EstimateLine = {
  id: string;
  boq_item_id: string;
  unit_rate: Num;
  quantity: Num;
  line_total: Num;
  rate_source: string;
};

export type Flag = {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  confidence_score: Num | null;
  status: string;
};

export type Vendor = {
  id: string;
  user_id?: string;
  company_name: string;
  category: string | null;
  location: string | null;
  description?: string | null;
  status?: string;
  contact_email?: string | null;
  phone?: string | null;
  website?: string | null;
  created_at?: string;
};

export type VendorInput = {
  company_name: string;
  category?: string;
  location?: string;
  description?: string;
  contact_email?: string;
  phone?: string;
  website?: string;
};

export type CatalogItem = {
  id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  unit_price: Num | null;
  available_quantity: Num | null;
  is_published: boolean;
  is_verified: boolean;
  confidence_score: Num | null;
};

export type CatalogItemInput = {
  item_name: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  available_quantity?: number;
  publish?: boolean;
};

export type MarketItem = {
  id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  unit_price: Num | null;
  available_quantity: Num | null;
  specifications?: Record<string, unknown> | null;
  vendor_id: string;
  company_name: string;
  vendor_location: string | null;
};

export type MarketCatalog = { total: number; items: MarketItem[] };
export type MarketCategory = { category: string; count: number };
export type MarketVendor = Vendor & { published_items: number };
export type MarketVendorDetail = Vendor & { items: MarketItem[] };

export type VendorMatch = {
  catalog_item_id: string;
  vendor_id: string;
  company_name: string | null;
  item_name: string;
  category: string | null;
  unit_price: string | null;
  unit: string | null;
  match_score: number;
  rationale: string;
  boq_item_id?: string;
  boq_item_name?: string;
};

export type RfqSummary = {
  id: string;
  status: string;
  boq_id: string;
  created_at: string;
  deadline: string | null;
  line_count: number;
  vendor_count?: number;
  quotation_count?: number;
  project_id?: string;
  project_name?: string | null;
  project_location?: string | null;
  has_quoted?: boolean;
  quotation_status?: string | null;
};

export type QuotationLine = {
  id: string;
  rfq_line_item_id: string;
  unit_price: Num;
  quantity: Num;
  line_total: Num;
  lead_time: string | null;
  notes: string | null;
};

export type Quotation = {
  id: string;
  vendor_id: string;
  company_name: string | null;
  status: string;
  total_price: Num;
  currency: string;
  submitted_at: string;
  lines: QuotationLine[];
};

export type RfqDetail = {
  id: string;
  status: string;
  created_at: string;
  deadline: string | null;
  project: { id: string; name: string; location: string | null };
  lines: { id: string; boq_item_id: string; item_name: string | null; category: string | null; unit: string | null; requested_quantity: Num }[];
  vendors: { id: string; company_name: string }[];
  quotations: Quotation[];
  lowest_total: Num | null;
  viewer: "customer" | "vendor";
};

export type QuotationInput = {
  currency?: string;
  lines: { rfq_line_item_id: string; unit_price: number; quantity: number; lead_time?: string; notes?: string }[];
};

export type VendorQuotationRow = {
  id: string;
  rfq_id: string;
  status: string;
  total_price: Num;
  currency: string;
  submitted_at: string;
  rfq_status: string | null;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type ActivityEntry = { id: string; action: string; actor_type: string; entity_type: string; created_at: string };

export type CustomerDashboard = {
  totals: { projects: number; documents: number; open_flags: number; rfqs: number; open_rfqs: number; quotations: number };
  projects_by_status: Record<string, number>;
  recent_projects: { id: string; name: string; status: string; location: string | null; budget_cap: Num | null; updated_at: string }[];
  activity: ActivityEntry[];
};

export type VendorDashboard =
  | { vendor: null }
  | {
      vendor: { id: string; company_name: string; status: string };
      totals: { catalog_items: number; published: number; drafts: number; rfqs: number; awaiting_quote: number; quotations: number; won: number };
      quotations_by_status: Record<string, number>;
      recent_rfqs: { id: string; status: string; created_at: string; deadline: string | null; has_quoted: boolean }[];
    };

export type AgentReply = { id: string; final_response: string; status: string };
