/** Core API read models consumed by this portal. Amounts are integer NGN minor-unit strings. */
export type Role =
  | "operations_admin"
  | "catalogue_moderator"
  | "support_agent"
  | "finance_reviewer"
  | "security_admin";
export type Section =
  | "overview"
  | "merchants"
  | "catalogue"
  | "orders"
  | "customers"
  | "returns"
  | "disputes"
  | "support"
  | "refunds"
  | "payouts"
  | "reconciliation"
  | "content"
  | "access"
  | "audit"
  | "settings";
export type ISODate = string;
export type MinorUnits = string;
export interface Viewer {
  id: string;
  email: string;
  name?: string;
  roles: Role[];
  requireMfa: boolean;
  capabilities: Array<"content:create" | "access:invite">;
}
export interface Envelope<T> {
  success: true;
  data: T;
}
export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}
export interface RecordBase {
  id: string;
  /** Non-null concurrency token used in If-Match. */
  version: string | number;
  name?: string;
  title?: string;
  subject?: string;
  reference?: string;
  status: string;
  registrationState?: "not_registered" | "in_review" | "registered";
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Action keys from contracts.mjs plus the auxiliary permissions below. */
  allowedActions: string[];
  actionBlockReason?: string;
  merchantId?: string;
  customerId?: string;
  orderId?: string;
  productId?: string;
  returnId?: string;
  disputeId?: string;
  refundId?: string;
  payoutId?: string;
  merchantName?: string;
  customerName?: string;
  assignedTo?: string;
  assignedToName?: string;
  requestedBy?: string;
  requestedByName?: string;
  amountMinor?: MinorUnits;
  totalMinor?: MinorUnits;
  priceMinor?: MinorUnits;
  email?: string;
  /** Domain-specific display fields are enumerated in ui.mjs FIELD_SETS and LIST_COLUMNS. */
  [field: string]: unknown;
}
export interface Page<T = RecordBase> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
export interface Activity {
  id: string;
  title?: string;
  action?: string;
  actorName?: string;
  createdAt: ISODate;
  note?: string;
  description?: string;
}
export interface Media {
  url: string;
  label?: string;
  alt: string;
}
export interface Document {
  id: string;
  name: string;
  type: string;
  createdAt: ISODate;
}
export interface Message {
  id: string;
  senderRole: "agent" | "user";
  senderName: string;
  body: string;
  createdAt: ISODate;
}
export interface Detail {
  record: RecordBase;
  activity: Activity[];
  media: Media[];
  documents: Document[];
  notes?: Activity[];
  messages?: Message[];
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    priceMinor: MinorUnits;
    available: number;
    reserved: number;
  }>;
  items?: Array<{
    id: string;
    name: string;
    variantName: string;
    quantity: number;
    totalMinor: MinorUnits;
  }>;
  tracking?: Activity[];
  entries?: Array<{
    id: string;
    reference: string;
    accountName: string;
    direction: "debit" | "credit";
    amountMinor: MinorUnits;
    createdAt: ISODate;
  }>;
}
export interface Overview {
  asOf: ISODate;
  metrics: Array<{
    label: string;
    value: number | MinorUnits;
    format: "count" | "money";
    section: Section;
    status?: string;
    description: string;
  }>;
  queues: Array<{
    label: string;
    count: number;
    section: Section;
    status?: string;
    description: string;
  }>;
  activity: Activity[];
}
export type AuxiliaryRecordAction =
  "add_note" | "reply_ticket" | "assign" | "edit_content" | "edit_roles";
export interface CampaignInput {
  title: string;
  placement: "home_hero" | "home_collection" | "category_feature";
  targetType: "category" | "product" | "merchant";
  targetId: string;
  imageUrl: string;
  altText: string;
  startsAt: ISODate;
  endsAt: ISODate;
  priority: number;
}
