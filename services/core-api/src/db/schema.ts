import { 
  pgTable, 
  pgEnum, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  bigint, 
  integer, 
  jsonb,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role_type', [
  'buyer',
  'merchant_owner',
  'merchant_staff',
  'support_agent',
  'catalogue_moderator',
  'finance_reviewer',
  'operations_admin',
  'security_admin'
]);

export const merchantStatusEnum = pgEnum('merchant_status_type', [
  'pending_verification',
  'active',
  'suspended',
  'rejected'
]);

export const verificationStatusEnum = pgEnum('verification_status_type', [
  'pending',
  'approved',
  'rejected'
]);

export const productStatusEnum = pgEnum('product_status_type', [
  'draft',
  'pending_approval',
  'published',
  'archived'
]);

export const orderStatusEnum = pgEnum('order_status_type', [
  'pending_payment',
  'payment_confirmed',
  'processing',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
]);

export const paymentStatusEnum = pgEnum('payment_status_type', [
  'initialized',
  'successful',
  'failed',
  'abandoned'
]);

export const ledgerAccountTypeEnum = pgEnum('ledger_account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense'
]);

export const journalDirectionEnum = pgEnum('journal_direction_type', [
  'debit',
  'credit'
]);

export const payoutStatusEnum = pgEnum('payout_status_type', [
  'pending_approval',
  'approved',
  'rejected',
  'processing',
  'successful',
  'failed',
  'reversed'
]);

export const reservationStatusEnum = pgEnum('reservation_status_type', [
  'active',
  'committed',
  'released'
]);

export const shipmentStatusEnum = pgEnum('shipment_status_type', [
  'pending',
  'packed',
  'in_transit',
  'delivered',
  'return_in_transit'
]);

export const returnStatusEnum = pgEnum('return_status_type', [
  'requested',
  'approved',
  'rejected',
  'received',
  'refund_initiated',
  'completed'
]);

export const disputeStatusEnum = pgEnum('dispute_status_type', [
  'open',
  'under_review',
  'resolved_buyer',
  'resolved_merchant',
  'closed'
]);

export const ticketStatusEnum = pgEnum('ticket_status_type', [
  'open',
  'pending',
  'resolved',
  'closed'
]);

export const refundStatusEnum = pgEnum('refund_status_type', [
  'initialized',
  'successful',
  'failed'
]);

export const outboxStatusEnum = pgEnum('outbox_status_type', [
  'pending',
  'processing',
  'processed',
  'failed'
]);

// 1. Identity & Profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').default('buyer').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  contactName: text('contact_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  state: text('state').notNull(),
  lga: text('lga').notNull(),
  streetAddress: text('street_address').notNull(),
  landmark: text('landmark'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// 2. Merchants
export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  businessName: text('business_name').notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone').notNull(),
  state: text('state').notNull(),
  lga: text('lga').notNull(),
  address: text('address').notNull(),
  status: merchantStatusEnum('status').default('pending_verification').notNull(),
  commissionRateBps: integer('commission_rate_bps').default(1000).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const merchantMembers = pgTable('merchant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').default('owner').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const merchantVerifications = pgTable('merchant_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  cacNumber: text('cac_number'),
  tinNumber: text('tin_number'),
  idType: text('id_type'),
  idDocumentUrl: text('id_document_url'),
  utilityBillUrl: text('utility_bill_url'),
  status: verificationStatusEnum('status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => profiles.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const merchantBankAccounts = pgTable('merchant_bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  bankName: text('bank_name').notNull(),
  bankCode: text('bank_code').notNull(),
  accountNumber: text('account_number').notNull(),
  accountName: text('account_name').notNull(),
  paystackRecipientCode: text('paystack_recipient_code'),
  isVerified: boolean('is_verified').default(false).notNull(),
  isPrimary: boolean('is_primary').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// 3. Catalogue & Inventory
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'restrict' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  basePriceMinor: bigint('base_price_minor', { mode: 'number' }).notNull(),
  comparePriceMinor: bigint('compare_price_minor', { mode: 'number' }),
  currency: text('currency').default('NGN').notNull(),
  status: productStatusEnum('status').default('draft').notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  sku: text('sku').unique(),
  title: text('title').default('Default').notNull(),
  priceMinor: bigint('price_minor', { mode: 'number' }).notNull(),
  attributes: jsonb('attributes').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const productMedia = pgTable('product_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: text('media_type').default('image').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  altText: text('alt_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const inventoryLevels = pgTable('inventory_levels', {
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).primaryKey(),
  availableQuantity: integer('available_quantity').default(0).notNull(),
  reservedQuantity: integer('reserved_quantity').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const inventoryReservations = pgTable('inventory_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: reservationStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 4. Shopping & Orders
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  buyerId: uuid('buyer_id').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'restrict' }).notNull(),
  deliveryAddress: jsonb('delivery_address').notNull(),
  currency: text('currency').default('NGN').notNull(),
  subtotalMinor: bigint('subtotal_minor', { mode: 'number' }).notNull(),
  deliveryFeeMinor: bigint('delivery_fee_minor', { mode: 'number' }).default(0).notNull(),
  platformCommissionMinor: bigint('platform_commission_minor', { mode: 'number' }).default(0).notNull(),
  totalAmountMinor: bigint('total_amount_minor', { mode: 'number' }).notNull(),
  status: orderStatusEnum('status').default('pending_payment').notNull(),
  paymentMethod: text('payment_method').default('paystack').notNull(),
  trackingCode: text('tracking_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const orderLines = pgTable('order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }).notNull(),
  productTitle: text('product_title').notNull(),
  variantTitle: text('variant_title').notNull(),
  unitPriceMinor: bigint('unit_price_minor', { mode: 'number' }).notNull(),
  quantity: integer('quantity').notNull(),
  totalMinor: bigint('total_minor', { mode: 'number' }).notNull(),
  commissionMinor: bigint('commission_minor', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const orderStatusEvents = pgTable('order_status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  fromStatus: orderStatusEnum('from_status'),
  toStatus: orderStatusEnum('to_status').notNull(),
  actorId: uuid('actor_id').references(() => profiles.id),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 5. Payments
export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'restrict' }).notNull(),
  provider: text('provider').default('paystack').notNull(),
  providerReference: text('provider_reference').notNull().unique(),
  accessCode: text('access_code'),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').default('NGN').notNull(),
  status: paymentStatusEnum('status').default('initialized').notNull(),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const providerEvents = pgTable('provider_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  provider: text('provider').default('paystack').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 6. Double-Entry Ledger & Payouts
export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountCode: text('account_code').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: ledgerAccountTypeEnum('account_type').notNull(),
  currency: text('currency').default('NGN').notNull(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: text('reference').notNull().unique(),
  entryType: text('entry_type').notNull(),
  narration: text('narration').notNull(),
  currency: text('currency').default('NGN').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'restrict' }).notNull(),
  accountId: uuid('account_id').references(() => ledgerAccounts.id, { onDelete: 'restrict' }).notNull(),
  direction: journalDirectionEnum('direction').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'restrict' }).notNull(),
  bankAccountId: uuid('bank_account_id').references(() => merchantBankAccounts.id, { onDelete: 'restrict' }).notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').default('NGN').notNull(),
  feeMinor: bigint('fee_minor', { mode: 'number' }).default(0).notNull(),
  status: payoutStatusEnum('status').default('pending_approval').notNull(),
  providerReference: text('provider_reference').unique(),
  paystackTransferCode: text('paystack_transfer_code'),
  requestedBy: uuid('requested_by').references(() => profiles.id),
  approvedBy: uuid('approved_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => profiles.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').default({}).notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 7. Fulfilment
export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull().unique(),
  carrier: text('carrier').default('platform_default').notNull(),
  trackingCode: text('tracking_code'),
  status: shipmentStatusEnum('status').default('pending').notNull(),
  pickupEvidenceUrl: text('pickup_evidence_url'),
  deliveryEvidenceUrl: text('delivery_evidence_url'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const shipmentEvents = pgTable('shipment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  status: shipmentStatusEnum('status').notNull(),
  note: text('note'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull()
});

export const deliveryZones = pgTable('delivery_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  state: text('state').notNull(),
  lga: text('lga').notNull(),
  feeMinor: bigint('fee_minor', { mode: 'number' }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => ({
  stateLgaIdx: uniqueIndex('delivery_zones_state_lga_idx').on(t.state, t.lga)
}));

// 8. Returns, Disputes, Support
export const returnRequests = pgTable('return_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  buyerId: uuid('buyer_id').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'restrict' }).notNull(),
  reason: text('reason').notNull(),
  evidenceUrl: text('evidence_url'),
  status: returnStatusEnum('status').default('requested').notNull(),
  decidedBy: uuid('decided_by').references(() => profiles.id),
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  openedBy: uuid('opened_by').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
  reason: text('reason').notNull(),
  status: disputeStatusEnum('status').default('open').notNull(),
  resolutionNote: text('resolution_note'),
  resolvedBy: uuid('resolved_by').references(() => profiles.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  category: text('category').default('general').notNull(),
  subject: text('subject').notNull(),
  body: text('body'),
  status: ticketStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const supportTicketMessages = pgTable('support_ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
  senderRole: text('sender_role').default('user').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 9. Refunds
export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  paymentAttemptId: uuid('payment_attempt_id').references(() => paymentAttempts.id, { onDelete: 'restrict' }).notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').default('NGN').notNull(),
  reason: text('reason').notNull(),
  status: refundStatusEnum('status').default('initialized').notNull(),
  providerRefCode: text('provider_ref_code'),
  initiatedBy: uuid('initiated_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// 10. Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  data: jsonb('data').default({}).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 11. Outbox & Idempotency
export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  status: outboxStatusEnum('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
  lastError: text('last_error'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  scope: text('scope').notNull(),
  responseStatus: integer('response_status').notNull(),
  responseBody: jsonb('response_body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
