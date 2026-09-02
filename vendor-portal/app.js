/* SellFastBuyFast Vendor Portal — browser auth only; all business data uses Core API. */

const root = document.getElementById('portal-root');
const config = window.SFBF_VENDOR_CONFIG ?? {};

const VIEW_TITLES = {
  dashboard: 'Overview',
  catalogue: 'Catalogue & stock',
  'add-product': 'Add a product',
  fulfilment: 'Fulfilment queue',
  returns: 'Returns',
  profile: 'Business profile',
  team: 'Team',
  payments: 'Payments',
};

const state = {
  client: null,
  session: null,
  merchants: [],
  merchant: null,
  overview: null,
  products: [],
  orders: [],
  returns: [],
  team: [],
  categories: [],
  activeView: 'dashboard',
  loading: true,
  busy: null,
  modal: null,
  authError: '',
  formError: '',
  productErrors: {},
  productDraft: null,
  notice: null,
};

function hasRuntimeConfig() {
  const values = [config.apiUrl, config.supabaseUrl, config.supabaseAnonKey];
  return values.every((value) => typeof value === 'string' && value.trim() && !value.includes('YOUR-'));
}

function apiUrl(path) {
  return `${String(config.apiUrl).replace(/\/$/, '')}${path}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function icon(name) {
  return `<i data-lucide="${escapeAttribute(name)}" aria-hidden="true"></i>`;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatNaira(minor) {
  const amount = Number(minor ?? 0) / 100;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount);
}

function idempotencyKey(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED') {
    super(message);
    this.code = code;
  }
}

async function api(path, options = {}) {
  const { method = 'GET', body, idempotencyScope } = options;
  const { data: { session } } = await state.client.auth.getSession();
  if (!session?.access_token) throw new ApiError('Your session has ended. Please sign in again.', 'UNAUTHORIZED');
  state.session = session;

  const headers = { Authorization: `Bearer ${session.access_token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyScope) headers['Idempotency-Key'] = idempotencyKey(idempotencyScope);

  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the Core API. Check the portal configuration and API service.', 'NETWORK_ERROR');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The Core API returned an unreadable response.', 'INVALID_RESPONSE');
  }
  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.error?.message ?? 'The request could not be completed.', payload?.error?.code);
  }
  return payload.data;
}

function showNotice(message, type = 'success') {
  state.notice = { message, type };
  render();
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    state.notice = null;
    render();
  }, 5200);
}

function renderSetup() {
  root.setAttribute('aria-busy', 'false');
  root.innerHTML = `
    <section class="auth-screen">
      <div class="auth-card">
        <div class="auth-brand"><div class="brand-mark">S</div><div><strong>SellFastBuyFast</strong><span>Vendor portal setup</span></div></div>
        <h1>Configuration is needed</h1>
        <p class="subtle">This portal does not keep credentials in source code. Copy <code>config.example.js</code> to the ignored <code>config.js</code>, then provide the public Supabase URL, public anon key, and Core API URL.</p>
        <div class="notice notice-muted" role="status">${icon('shield-check')}<div><strong>Keep server credentials out of the browser.</strong><p>Never add a service-role key, database URL, or payment secret to <code>config.js</code>.</p></div></div>
      </div>
    </section>`;
  hydrateIcons();
}

function renderAuth() {
  root.setAttribute('aria-busy', 'false');
  root.innerHTML = `
    <section class="auth-screen">
      <form class="auth-card" id="sign-in-form" novalidate>
        <div class="auth-brand"><div class="brand-mark">S</div><div><strong>SellFastBuyFast</strong><span>Vendor portal</span></div></div>
        <h1>Welcome back</h1>
        <p class="subtle">Sign in with the account assigned to your merchant team.</p>
        ${state.authError ? `<div class="error-summary" id="auth-error" role="alert" tabindex="-1">${escapeHtml(state.authError)}</div>` : ''}
        <div class="form-group"><label class="form-label" for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required /></div>
        <div class="form-group"><label class="form-label" for="password">Password</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required /></div>
        <button class="btn btn-primary btn-full" type="submit" ${state.busy === 'sign-in' ? 'disabled' : ''}>${state.busy === 'sign-in' ? 'Signing in…' : `${icon('log-in')} Sign in`}</button>
      </form>
    </section>`;
  hydrateIcons();
}

function renderNoMerchant() {
  root.setAttribute('aria-busy', 'false');
  root.innerHTML = `
    <section class="empty-merchant-screen">
      <div class="empty-merchant-card">
        <div class="auth-brand"><div class="brand-mark">S</div><div><strong>SellFastBuyFast</strong><span>Vendor portal</span></div></div>
        <h1>No merchant workspace yet</h1>
        <p class="subtle">${escapeHtml(state.session?.user?.email ?? 'This account')} is not assigned to a merchant team. Ask a merchant owner or operations administrator to add the account, then refresh.</p>
        <div class="form-actions"><button type="button" class="btn btn-secondary" data-action="sign-out">Sign out</button><button type="button" class="btn btn-primary" data-action="refresh-workspace">${icon('refresh-cw')} Refresh</button></div>
      </div>
    </section>`;
  hydrateIcons();
}

function renderLoadingWorkspace() {
  root.setAttribute('aria-busy', 'true');
  root.innerHTML = `<section class="page"><div class="skeleton"></div><div class="metrics" style="margin-top:20px"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></section>`;
}

function navItem(view, iconName, label, count) {
  const active = state.activeView === view;
  return `<button class="nav-item" type="button" data-action="navigate" data-view="${view}" aria-current="${active ? 'page' : 'false'}">${icon(iconName)}<span>${label}</span>${count !== undefined ? `<span class="nav-count">${escapeHtml(count)}</span>` : ''}</button>`;
}

function merchantSelector() {
  if (state.merchants.length <= 1) return '';
  return `<select class="input" id="merchant-selector" aria-label="Switch merchant workspace">${state.merchants.map((merchant) => `<option value="${escapeAttribute(merchant.id)}" ${merchant.id === state.merchant?.id ? 'selected' : ''}>${escapeHtml(merchant.businessName)}</option>`).join('')}</select>`;
}

function renderShell() {
  const overview = state.overview;
  const pendingOrders = overview ? overview.fulfilment.awaitingAcceptance + overview.fulfilment.awaitingPacking : 0;
  const requestedReturns = overview?.returnRequests.requested ?? 0;
  root.setAttribute('aria-busy', String(state.loading));
  root.innerHTML = `
    <div class="portal-shell">
      <aside class="sidebar">
        <div class="sidebar-brand"><div class="brand-mark">S</div><div><div class="brand-name">SellFastBuyFast</div><small>Vendor portal</small></div></div>
        <nav aria-label="Vendor navigation">
          <div class="nav-label">Operate</div>
          ${navItem('dashboard', 'layout-dashboard', 'Overview')}
          ${navItem('catalogue', 'package', 'Catalogue', overview?.catalogue.total ?? '—')}
          ${navItem('fulfilment', 'truck', 'Fulfilment', pendingOrders || undefined)}
          ${navItem('returns', 'rotate-ccw', 'Returns', requestedReturns || undefined)}
          <div class="nav-label">Business</div>
          ${navItem('profile', 'store', 'Business profile')}
          ${navItem('team', 'users', 'Team')}
          ${navItem('payments', 'wallet', 'Payments')}
        </nav>
        <div class="sidebar-footer">
          ${merchantSelector()}
          <button type="button" class="merchant-switch" data-action="navigate" data-view="profile">${escapeHtml(state.merchant.businessName)}</button>
          <div class="member-role">${escapeHtml(overview?.viewer.memberRole ?? 'member')}</div>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar"><div class="topbar-title">${escapeHtml(VIEW_TITLES[state.activeView])}</div><div class="topbar-actions"><button class="btn btn-secondary" type="button" data-action="refresh-current">${icon('refresh-cw')} Refresh</button><button class="btn btn-primary" type="button" data-action="navigate" data-view="add-product">${icon('plus')} Add product</button></div></header>
        ${renderView()}
      </section>
    </div>
    ${renderModal()}
    ${state.notice ? `<div class="toast-stack" aria-live="polite"><div class="toast ${state.notice.type === 'error' ? 'toast-error' : ''}" role="status">${escapeHtml(state.notice.message)}</div></div>` : ''}`;
  hydrateIcons();
}

function renderView() {
  if (state.loading && !state.overview) return '<section class="page"><div class="skeleton"></div></section>';
  switch (state.activeView) {
    case 'catalogue': return renderCatalogue();
    case 'add-product': return renderAddProduct();
    case 'fulfilment': return renderFulfilment();
    case 'returns': return renderReturns();
    case 'profile': return renderProfile();
    case 'team': return renderTeam();
    case 'payments': return renderPayments();
    default: return renderDashboard();
  }
}

function statusBadge(status) {
  const normalized = String(status ?? '').replace(/_/g, ' ');
  const success = ['published', 'in transit', 'delivered', 'completed', 'approved', 'received'].includes(normalized);
  const danger = ['rejected', 'cancelled', 'archived'].includes(normalized);
  const warning = ['draft', 'pending approval', 'payment confirmed', 'processing', 'requested', 'pending'].includes(normalized);
  return `<span class="badge ${success ? 'badge-success' : danger ? 'badge-danger' : warning ? 'badge-warning' : 'badge-neutral'}">${escapeHtml(normalized)}</span>`;
}

function renderDashboard() {
  const overview = state.overview;
  const actionCount = overview.fulfilment.awaitingAcceptance + overview.fulfilment.awaitingPacking;
  const actionOrders = state.orders.filter((order) => ['payment_confirmed', 'processing'].includes(order.status)).slice(0, 5);
  return `
    <section class="page">
      <div class="page-heading"><div><h1>Run today’s operations</h1><p class="subtle">Live catalogue, fulfilment, return, and verification data for ${escapeHtml(state.merchant.businessName)}.</p></div><button class="btn btn-secondary" type="button" data-action="navigate" data-view="profile">${icon('shield-check')} Verification: ${escapeHtml(overview.verification.status)}</button></div>
      <div class="metrics">
        <article class="metric"><div class="metric-label">${icon('package-check')} Published products</div><div class="metric-value">${overview.catalogue.published}</div><div class="metric-note">${overview.catalogue.draft} draft · ${overview.catalogue.pendingApproval} under review</div></article>
        <article class="metric"><div class="metric-label">${icon('clipboard-check')} Fulfilment actions</div><div class="metric-value">${actionCount}</div><div class="metric-note">${overview.fulfilment.awaitingAcceptance} to accept · ${overview.fulfilment.awaitingPacking} to pack</div></article>
        <article class="metric"><div class="metric-label">${icon('rotate-ccw')} Return requests</div><div class="metric-value">${overview.returnRequests.requested}</div><div class="metric-note">${overview.returnRequests.open} open across all stages</div></article>
      </div>
      <div class="split">
        <section class="card"><div class="card-header"><div><h2>Orders needing action</h2><p class="small">Complete only the next valid fulfilment step.</p></div><button class="btn btn-quiet" type="button" data-action="navigate" data-view="fulfilment">Open queue ${icon('arrow-right')}</button></div>${renderOrderTable(actionOrders, true)}</section>
        <aside class="deferred-card"><h2>${icon('wallet')} Payments are intentionally deferred</h2><p>Settlement balances, bank-recipient setup, payout requests, and provider actions will arrive in the dedicated payment module. This portal does not show invented financial figures.</p></aside>
      </div>
    </section>`;
}

function productImage(product) {
  const url = safeUrl(product.media?.find((item) => item.mediaType === 'image')?.mediaUrl);
  return url ? `<img src="${escapeAttribute(url)}" alt="" loading="lazy" style="width:36px;height:36px;border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:9px">` : '';
}

function renderCatalogue() {
  const categoryNames = new Map(state.categories.map((category) => [category.id, category.name]));
  const rows = state.products.map((product) => {
    const variant = product.variants?.[0];
    const stock = variant ? `${variant.availableQuantity} available${variant.reservedQuantity ? ` · ${variant.reservedQuantity} reserved` : ''}` : 'No variants';
    const actions = [];
    if (variant) actions.push(`<button class="btn btn-quiet" type="button" data-action="edit-stock" data-variant-id="${escapeAttribute(variant.id)}" data-quantity="${escapeAttribute(variant.availableQuantity)}">Stock</button>`);
    if (product.status === 'draft') actions.push(`<button class="btn btn-quiet" type="button" data-action="submit-product" data-product-id="${escapeAttribute(product.id)}">Submit</button>`);
    return `<tr data-product-search="${escapeAttribute(`${product.title} ${variant?.sku ?? ''}`.toLowerCase())}"><td><div class="table-main">${productImage(product)}${escapeHtml(product.title)}</div><div class="table-sub">${escapeHtml(variant?.sku ? `SKU ${variant.sku}` : 'No SKU')}</div></td><td>${escapeHtml(categoryNames.get(product.categoryId) ?? 'Uncategorized')}</td><td>${variant ? formatNaira(variant.priceMinor) : '—'}</td><td>${escapeHtml(stock)}</td><td>${statusBadge(product.status)}</td><td><div class="actions">${actions.join('') || '—'}</div></td></tr>`;
  }).join('');
  return `
    <section class="page">
      <div class="page-heading"><div><h1>Catalogue & stock</h1><p class="subtle">Product updates remain draft until an operations moderator decides.</p></div><button class="btn btn-primary" type="button" data-action="navigate" data-view="add-product">${icon('plus')} Add product</button></div>
      <section class="card"><div class="card-header"><div><h2>All products</h2><p class="small">Availability changes are written through the Core API.</p></div><input class="input" id="catalogue-search" style="max-width:260px" type="search" placeholder="Search title or SKU" aria-label="Search catalogue" /></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || `<tr><td colspan="6">${renderEmpty('package-open', 'No products yet', 'Create a properly described product with an image, stock, and a category to start your catalogue.', 'Add product')}</td></tr>`}</tbody></table></div></section>
    </section>`;
}

function formValue(name, fallback = '') {
  return escapeAttribute(state.productDraft?.[name] ?? fallback);
}

function formError(name) {
  const error = state.productErrors[name];
  return error ? `<p class="field-error" id="${name}-error">${escapeHtml(error)}</p>` : '';
}

function renderAddProduct() {
  const categories = state.categories.map((category) => `<option value="${escapeAttribute(category.id)}" ${(state.productDraft?.categoryId ?? '') === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');
  const invalid = (name) => state.productErrors[name] ? 'aria-invalid="true" aria-describedby="' + name + '-error"' : '';
  return `
    <section class="page"><div class="page-heading"><div><h1>Add a product</h1><p class="subtle">Save a draft, or submit a complete product for operations moderation.</p></div></div>
      <form class="card" id="product-form" novalidate>
        <div class="card-body">
          ${state.formError ? `<div class="error-summary" id="product-error-summary" role="alert" tabindex="-1">${escapeHtml(state.formError)}</div>` : ''}
          <div class="form-grid">
            <div class="form-group span-2"><label class="form-label" for="product-title">Product title</label><input class="input" id="product-title" name="title" value="${formValue('title')}" ${invalid('title')} required />${formError('title')}</div>
            <div class="form-group"><label class="form-label" for="product-category">Category</label><select class="select" id="product-category" name="categoryId" ${invalid('categoryId')} required><option value="">Select a category</option>${categories}</select>${formError('categoryId')}</div>
            <div class="form-group"><label class="form-label" for="product-sku">Merchant SKU</label><input class="input" id="product-sku" name="sku" value="${formValue('sku')}" ${invalid('sku')} placeholder="e.g. SFBF-001" required />${formError('sku')}</div>
            <div class="form-group"><label class="form-label" for="product-price">Price (NGN)</label><input class="input" id="product-price" name="priceNaira" type="number" min="0.01" step="0.01" value="${formValue('priceNaira')}" ${invalid('priceNaira')} required />${formError('priceNaira')}</div>
            <div class="form-group"><label class="form-label" for="product-stock">Initial available stock</label><input class="input" id="product-stock" name="availableQuantity" type="number" min="0" step="1" value="${formValue('availableQuantity', '0')}" ${invalid('availableQuantity')} required />${formError('availableQuantity')}</div>
            <div class="form-group span-2"><label class="form-label" for="product-description">Description</label><textarea class="textarea" id="product-description" name="description" ${invalid('description')} required>${escapeHtml(state.productDraft?.description ?? '')}</textarea><p class="field-help">Explain material, condition, specifications, and any customer-relevant details.</p>${formError('description')}</div>
            <div class="form-group span-2"><label class="form-label" for="product-image">Product image URL</label><input class="input" id="product-image" name="imageUrl" type="url" value="${formValue('imageUrl')}" ${invalid('imageUrl')} placeholder="https://…" required />${formError('imageUrl')}</div>
          </div>
          <label class="checkbox-row"><input type="checkbox" name="submitForReview" ${state.productDraft?.submitForReview ? 'checked' : ''} /><span><strong>Submit for moderation after saving.</strong><br />A product must have its category, description, variant, and image before it can enter the review queue.</span></label>
          <div class="form-actions"><button class="btn btn-secondary" type="button" data-action="navigate" data-view="catalogue">Cancel</button><button class="btn btn-primary" type="submit" ${state.busy === 'create-product' ? 'disabled' : ''}>${state.busy === 'create-product' ? 'Saving…' : `${icon('save')} Save product`}</button></div>
        </div>
      </form>
    </section>`;
}

function deliveryAddress(order) {
  const address = order.deliveryAddress;
  if (!address || typeof address !== 'object') return 'Address unavailable';
  return [address.contactName, address.streetAddress, address.lga, address.state].filter(Boolean).join(' · ') || 'Address unavailable';
}

function nextOrderAction(order) {
  if (order.status === 'payment_confirmed') return `<button class="btn btn-primary" type="button" data-action="accept-order" data-order-id="${escapeAttribute(order.id)}">Accept order</button>`;
  if (order.status === 'processing' && order.shipment?.status === 'pending') return `<button class="btn btn-primary" type="button" data-action="pack-order" data-order-id="${escapeAttribute(order.id)}">Mark packed</button>`;
  if (order.status === 'processing' && order.shipment?.status === 'packed') return `<button class="btn btn-primary" type="button" data-action="ship-order" data-order-id="${escapeAttribute(order.id)}" data-order-number="${escapeAttribute(order.orderNumber)}">Dispatch</button>`;
  if (order.status === 'in_transit') return `<span class="small">Tracking: ${escapeHtml(order.shipment?.trackingCode ?? order.trackingCode ?? 'recorded')}</span>`;
  return '<span class="small">No merchant action</span>';
}

function renderOrderTable(orders, concise = false) {
  if (orders.length === 0) return `<div class="empty">${icon('check-check')}<h3>Nothing needs action</h3><p>New orders will appear here once server-confirmed and ready for merchant fulfilment.</p></div>`;
  const rows = orders.map((order) => `<tr><td><div class="table-main">${escapeHtml(order.orderNumber)}</div><div class="table-sub">${formatDate(order.createdAt)}</div></td><td>${escapeHtml(order.lines?.map((line) => `${line.productTitle}${line.variantTitle && line.variantTitle !== 'Default' ? ` · ${line.variantTitle}` : ''} ×${line.quantity}`).join(', ') || 'Line items unavailable')}</td>${concise ? '' : `<td>${escapeHtml(deliveryAddress(order))}</td>`}<td>${statusBadge(order.status)}${order.shipment ? `<div class="table-sub">${escapeHtml(order.shipment.status.replace(/_/g, ' '))}</div>` : ''}</td><td><div class="actions">${nextOrderAction(order)}</div></td></tr>`).join('');
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Items</th>${concise ? '' : '<th>Delivery address</th>'}<th>Status</th><th>Next step</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderFulfilment() {
  return `<section class="page"><div class="page-heading"><div><h1>Fulfilment queue</h1><p class="subtle">Accept, pack, and dispatch only the orders that the Core API makes ready.</p></div></div><section class="card"><div class="card-header"><div><h2>Merchant orders</h2><p class="small">Delivery confirmation is completed by authorised platform operations, not by the merchant portal.</p></div></div>${renderOrderTable(state.orders)}</section></section>`;
}

function renderReturns() {
  const rows = state.returns.map((request) => `<tr><td><div class="table-main">${escapeHtml(request.order?.orderNumber ?? 'Order')}</div><div class="table-sub">Requested ${formatDate(request.createdAt)}</div></td><td>${escapeHtml(request.reason)}</td><td>${statusBadge(request.status)}${request.decisionNote ? `<div class="table-sub">${escapeHtml(request.decisionNote)}</div>` : ''}</td><td><div class="actions">${request.status === 'requested' ? `<button class="btn btn-primary" type="button" data-action="return-decision" data-return-id="${escapeAttribute(request.id)}" data-decision="approved">Approve</button><button class="btn btn-danger" type="button" data-action="return-decision" data-return-id="${escapeAttribute(request.id)}" data-decision="rejected">Reject</button>` : '<span class="small">No merchant action</span>'}</div></td></tr>`).join('');
  return `<section class="page"><div class="page-heading"><div><h1>Returns</h1><p class="subtle">Your decision is recorded for the buyer. Return receipt and any payment adjustment remain an authorised operations workflow.</p></div></div><section class="card"><div class="card-header"><div><h2>Return requests</h2><p class="small">Only new requests can be approved or rejected.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Buyer reason</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || `<tr><td colspan="4">${renderEmpty('rotate-ccw', 'No return requests', 'Approved or active return requests will be kept here.', '')}</td></tr>`}</tbody></table></div></section></section>`;
}

function renderProfile() {
  const overview = state.overview;
  const merchant = overview.merchant;
  const verification = overview.verification;
  const owner = overview.viewer.isOwner;
  return `<section class="page"><div class="page-heading"><div><h1>Business profile</h1><p class="subtle">Keep merchant contact details accurate. Only the owner can change profile and verification details.</p></div></div>
    <div class="split">
      <section class="card"><div class="card-header"><div><h2>Merchant details</h2><p class="small">Status: ${escapeHtml(merchant.status)}</p></div></div><form class="card-body" id="business-profile-form" novalidate>
        ${!owner ? '<div class="notice notice-muted" role="status">' + icon('lock') + '<div><strong>Read-only for your team role.</strong><p>Ask the merchant owner to update business or verification information.</p></div></div>' : ''}
        <div class="form-group"><label class="form-label" for="business-name">Business name</label><input class="input" id="business-name" name="businessName" value="${escapeAttribute(merchant.businessName)}" ${owner ? '' : 'readonly'} /></div>
        <div class="form-group"><label class="form-label" for="business-description">Description</label><textarea class="textarea" id="business-description" name="description" ${owner ? '' : 'readonly'}>${escapeHtml(merchant.description ?? '')}</textarea></div>
        <div class="form-grid"><div class="form-group"><label class="form-label" for="business-email">Contact email</label><input class="input" id="business-email" name="contactEmail" type="email" value="${escapeAttribute(merchant.contactEmail)}" ${owner ? '' : 'readonly'} /></div><div class="form-group"><label class="form-label" for="business-phone">Contact phone</label><input class="input" id="business-phone" name="contactPhone" value="${escapeAttribute(merchant.contactPhone)}" ${owner ? '' : 'readonly'} /></div></div>
        <p class="field-help">${escapeHtml([merchant.address, merchant.lga, merchant.state].filter(Boolean).join(' · '))}</p>
        ${owner ? `<div class="form-actions"><button class="btn btn-primary" type="submit" ${state.busy === 'update-profile' ? 'disabled' : ''}>${state.busy === 'update-profile' ? 'Saving…' : 'Save changes'}</button></div>` : ''}
      </form></section>
      <section class="card"><div class="card-header"><div><h2>Verification</h2><p class="small">Merchant verification is reviewed by operations.</p></div>${statusBadge(verification.status)}</div><div class="card-body">
        ${verification.rejectionReason ? `<div class="notice notice-warning" role="status">${icon('triangle-alert')}<div><strong>Resubmission needed</strong><p>${escapeHtml(verification.rejectionReason)}</p></div></div>` : `<p class="subtle">${verification.status === 'approved' ? 'Your submitted verification is approved. Changes require an authorised operations review.' : 'Provide business documents for operations review. Document links should be from the approved secure storage workflow.'}</p>`}
        ${owner && verification.status !== 'approved' ? renderVerificationForm() : ''}
      </div></section>
    </div>
  </section>`;
}

function renderVerificationForm() {
  return `<form id="verification-form" novalidate><div class="form-group"><label class="form-label" for="cac-number">CAC number</label><input class="input" id="cac-number" name="cacNumber" required /></div><div class="form-group"><label class="form-label" for="tin-number">TIN (optional)</label><input class="input" id="tin-number" name="tinNumber" /></div><div class="form-group"><label class="form-label" for="id-type">ID type</label><select class="select" id="id-type" name="idType" required><option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver’s licence</option><option value="voters_card">Voter’s card</option></select></div><div class="form-group"><label class="form-label" for="id-document-url">Secure ID document URL</label><input class="input" id="id-document-url" name="idDocumentUrl" type="url" placeholder="https://…" required /></div><div class="form-group"><label class="form-label" for="utility-bill-url">Secure utility-bill URL</label><input class="input" id="utility-bill-url" name="utilityBillUrl" type="url" placeholder="https://…" required /></div><button class="btn btn-primary btn-full" type="submit" ${state.busy === 'submit-verification' ? 'disabled' : ''}>${state.busy === 'submit-verification' ? 'Submitting…' : 'Submit for review'}</button></form>`;
}

function renderTeam() {
  const rows = state.team.map((member) => `<tr><td><div class="table-main">${escapeHtml(member.fullName ?? 'Unnamed member')}</div><div class="table-sub">Joined ${formatDate(member.createdAt)}</div></td><td>${escapeHtml(member.email)}</td><td>${statusBadge(member.role)}</td></tr>`).join('');
  return `<section class="page"><div class="page-heading"><div><h1>Team</h1><p class="subtle">These are the authenticated members of this merchant workspace.</p></div></div><section class="card"><div class="card-header"><div><h2>Current members</h2><p class="small">Membership changes are intentionally kept out of this portal until the account invitation workflow is released.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Member</th><th>Email</th><th>Merchant role</th></tr></thead><tbody>${rows || `<tr><td colspan="3">${renderEmpty('users', 'No team data available', 'Refresh to load the merchant membership roster.', '')}</td></tr>`}</tbody></table></div></section></section>`;
}

function renderPayments() {
  return `<section class="page"><div class="page-heading"><div><h1>Payments</h1><p class="subtle">This operational boundary protects merchants and customers while payment work is still in progress.</p></div></div><section class="deferred-card"><h2>${icon('circle-pause')} Payment module deferred</h2><p>${escapeHtml(state.overview.paymentModule.message)}</p><p class="small" style="margin-top:12px">There are no payout, bank-account, transfer, refund, or settlement actions in this portal yet.</p></section></section>`;
}

function renderEmpty(iconName, title, text, actionLabel) {
  return `<div class="empty">${icon(iconName)}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${actionLabel ? `<button class="btn btn-primary" type="button" data-action="navigate" data-view="add-product">${escapeHtml(actionLabel)}</button>` : ''}</div>`;
}

function renderModal() {
  if (!state.modal) return '';
  const error = state.formError ? `<div class="error-summary" role="alert">${escapeHtml(state.formError)}</div>` : '';
  if (state.modal.type === 'stock') {
    return `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="stock-form" aria-modal="true" role="dialog" aria-labelledby="stock-modal-title"><div class="modal-header"><div><h2 id="stock-modal-title">Set available stock</h2><p class="small">Reserved units are preserved by the server.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>${error}<input type="hidden" name="variantId" value="${escapeAttribute(state.modal.variantId)}" /><div class="form-group"><label class="form-label" for="stock-quantity">Available quantity</label><input class="input" id="stock-quantity" name="availableQuantity" type="number" min="0" step="1" value="${escapeAttribute(state.modal.quantity)}" required /></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" ${state.busy === 'set-stock' ? 'disabled' : ''}>Save stock</button></div></form></div>`;
  }
  if (state.modal.type === 'ship') {
    return `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="ship-form" aria-modal="true" role="dialog" aria-labelledby="ship-modal-title"><div class="modal-header"><div><h2 id="ship-modal-title">Dispatch ${escapeHtml(state.modal.orderNumber)}</h2><p class="small">Only packed orders can be handed to a carrier.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>${error}<input type="hidden" name="orderId" value="${escapeAttribute(state.modal.orderId)}" /><div class="form-group"><label class="form-label" for="carrier">Carrier</label><input class="input" id="carrier" name="carrier" minlength="2" required /></div><div class="form-group"><label class="form-label" for="tracking-code">Tracking code</label><input class="input" id="tracking-code" name="trackingCode" minlength="2" required /></div><div class="form-group"><label class="form-label" for="pickup-evidence-url">Pickup evidence URL (optional)</label><input class="input" id="pickup-evidence-url" name="pickupEvidenceUrl" type="url" placeholder="https://…" /></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" ${state.busy === 'ship-order' ? 'disabled' : ''}>Confirm dispatch</button></div></form></div>`;
  }
  return `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="return-decision-form" aria-modal="true" role="dialog" aria-labelledby="return-modal-title"><div class="modal-header"><div><h2 id="return-modal-title">${state.modal.decision === 'approved' ? 'Approve' : 'Reject'} return</h2><p class="small">The buyer receives the reason you provide.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>${error}<input type="hidden" name="returnId" value="${escapeAttribute(state.modal.returnId)}" /><input type="hidden" name="decision" value="${escapeAttribute(state.modal.decision)}" /><div class="form-group"><label class="form-label" for="return-note">Decision note</label><textarea class="textarea" id="return-note" name="note" minlength="2" required></textarea></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button><button class="btn ${state.modal.decision === 'approved' ? 'btn-primary' : 'btn-danger'}" type="submit" ${state.busy === 'return-decision' ? 'disabled' : ''}>Confirm ${escapeHtml(state.modal.decision)}</button></div></form></div>`;
}

function hydrateIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });
}

function render() {
  if (!hasRuntimeConfig() || !window.supabase) return renderSetup();
  if (!state.session) return renderAuth();
  if (state.loading && state.merchants.length === 0) return renderLoadingWorkspace();
  if (state.merchants.length === 0) return renderNoMerchant();
  renderShell();
}

async function loadMerchantData() {
  if (!state.merchant) return;
  state.loading = true;
  render();
  const merchantId = state.merchant.id;
  const results = await Promise.allSettled([
    api(`/v1/vendor/merchant/${merchantId}/overview`),
    api(`/v1/catalog-management/merchant/${merchantId}/products`),
    api(`/v1/fulfilment/merchant/${merchantId}/orders`),
    api(`/v1/vendor/merchant/${merchantId}/returns`),
    api(`/v1/vendor/merchant/${merchantId}/team`),
    api('/v1/catalog/categories'),
  ]);
  const [overview, products, orders, returns, team, categories] = results;
  const failures = results.filter((result) => result.status === 'rejected');
  if (overview.status === 'rejected') throw overview.reason;
  state.overview = overview.value;
  state.products = products.status === 'fulfilled' ? products.value : [];
  state.orders = orders.status === 'fulfilled' ? orders.value : [];
  state.returns = returns.status === 'fulfilled' ? returns.value : [];
  state.team = team.status === 'fulfilled' ? team.value : [];
  state.categories = categories.status === 'fulfilled' ? categories.value : [];
  state.loading = false;
  render();
  if (failures.length > 0) showNotice('Some portal data could not load. Use Refresh to retry.', 'error');
}

async function loadWorkspace() {
  state.loading = true;
  render();
  try {
    const data = await api('/v1/vendor/me');
    state.merchants = data.merchants;
    const savedMerchantId = window.localStorage.getItem('sfbf-vendor-merchant-id');
    state.merchant = data.merchants.find((merchant) => merchant.id === savedMerchantId) ?? data.merchants[0] ?? null;
    if (!state.merchant) {
      state.loading = false;
      render();
      return;
    }
    await loadMerchantData();
  } catch (error) {
    state.loading = false;
    state.authError = error.message ?? 'Could not load your merchant workspace.';
    if (error.code === 'UNAUTHORIZED') state.session = null;
    render();
  }
}

async function setMerchant(merchantId) {
  const merchant = state.merchants.find((candidate) => candidate.id === merchantId);
  if (!merchant || merchant.id === state.merchant?.id) return;
  state.merchant = merchant;
  state.activeView = 'dashboard';
  window.localStorage.setItem('sfbf-vendor-merchant-id', merchant.id);
  try {
    await loadMerchantData();
  } catch (error) {
    state.loading = false;
    render();
    showNotice(error.message ?? 'Could not switch merchant workspace.', 'error');
  }
}

async function withBusy(key, task, successMessage) {
  state.busy = key;
  render();
  try {
    await task();
    state.modal = null;
    state.formError = '';
    await loadMerchantData();
    if (successMessage) showNotice(successMessage);
  } catch (error) {
    state.formError = error.message ?? 'The request could not be completed.';
    state.busy = null;
    render();
    showNotice(state.formError, 'error');
  } finally {
    state.busy = null;
  }
}

function productDataFromForm(form) {
  const values = Object.fromEntries(new FormData(form));
  const input = {
    title: String(values.title ?? '').trim(),
    categoryId: String(values.categoryId ?? ''),
    sku: String(values.sku ?? '').trim(),
    priceNaira: String(values.priceNaira ?? '').trim(),
    availableQuantity: String(values.availableQuantity ?? '').trim(),
    description: String(values.description ?? '').trim(),
    imageUrl: String(values.imageUrl ?? '').trim(),
    submitForReview: values.submitForReview === 'on',
  };
  const errors = {};
  if (input.title.length < 3) errors.title = 'Enter at least 3 characters.';
  if (!input.categoryId) errors.categoryId = 'Select a category.';
  if (input.sku.length < 2) errors.sku = 'Enter a SKU with at least 2 characters.';
  const priceMinor = Math.round(Number(input.priceNaira) * 100);
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) errors.priceNaira = 'Enter a valid positive price.';
  const availableQuantity = Number(input.availableQuantity);
  if (!Number.isSafeInteger(availableQuantity) || availableQuantity < 0) errors.availableQuantity = 'Enter a whole number of zero or more.';
  if (input.description.length < 10) errors.description = 'Describe the product in at least 10 characters.';
  if (!safeUrl(input.imageUrl)) errors.imageUrl = 'Enter a valid http(s) image URL.';
  return { input, errors, priceMinor, availableQuantity };
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'close-modal') {
    state.modal = null;
    state.formError = '';
    render();
    return;
  }
  if (action === 'navigate') {
    state.activeView = button.dataset.view;
    state.formError = '';
    state.productErrors = {};
    render();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return;
  }
  if (action === 'sign-out') {
    await state.client.auth.signOut();
    state.session = null;
    state.merchants = [];
    state.merchant = null;
    state.authError = '';
    render();
    return;
  }
  if (action === 'refresh-workspace' || action === 'refresh-current') {
    try { await (state.merchant ? loadMerchantData() : loadWorkspace()); } catch (error) { showNotice(error.message ?? 'Refresh failed.', 'error'); }
    return;
  }
  if (action === 'edit-stock') {
    state.modal = { type: 'stock', variantId: button.dataset.variantId, quantity: button.dataset.quantity };
    state.formError = '';
    render();
    return;
  }
  if (action === 'ship-order') {
    state.modal = { type: 'ship', orderId: button.dataset.orderId, orderNumber: button.dataset.orderNumber };
    state.formError = '';
    render();
    return;
  }
  if (action === 'return-decision') {
    state.modal = { type: 'return', returnId: button.dataset.returnId, decision: button.dataset.decision };
    state.formError = '';
    render();
    return;
  }
  if (action === 'submit-product') {
    await withBusy('submit-product', () => api(`/v1/catalog-management/products/${button.dataset.productId}/submit`, { method: 'POST', idempotencyScope: 'catalog-submit' }), 'Product submitted for moderation.');
    return;
  }
  if (action === 'accept-order') {
    await withBusy('accept-order', () => api(`/v1/fulfilment/orders/${button.dataset.orderId}/accept`, { method: 'POST', idempotencyScope: 'fulfilment-accept' }), 'Order accepted and ready for packing.');
    return;
  }
  if (action === 'pack-order') {
    await withBusy('pack-order', () => api(`/v1/fulfilment/orders/${button.dataset.orderId}/pack`, { method: 'POST', idempotencyScope: 'fulfilment-pack' }), 'Order marked as packed.');
  }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'merchant-selector') setMerchant(event.target.value);
});

document.addEventListener('input', (event) => {
  if (event.target.id !== 'catalogue-search') return;
  const term = event.target.value.trim().toLowerCase();
  document.querySelectorAll('[data-product-search]').forEach((row) => {
    row.hidden = !row.dataset.productSearch.includes(term);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.modal) {
    state.modal = null;
    state.formError = '';
    render();
  }
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'sign-in-form') {
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) {
      state.authError = 'Enter both your email and password.';
      render();
      document.getElementById('auth-error')?.focus();
      return;
    }
    state.busy = 'sign-in';
    state.authError = '';
    render();
    const { data, error } = await state.client.auth.signInWithPassword({ email, password });
    state.busy = null;
    if (error || !data.session) {
      state.authError = error?.message ?? 'Sign-in could not be completed.';
      render();
      document.getElementById('auth-error')?.focus();
      return;
    }
    state.session = data.session;
    await loadWorkspace();
    return;
  }
  if (form.id === 'product-form') {
    const { input, errors, priceMinor, availableQuantity } = productDataFromForm(form);
    state.productDraft = input;
    state.productErrors = errors;
    state.formError = Object.keys(errors).length ? 'Correct the highlighted fields before saving the product.' : '';
    if (Object.keys(errors).length) {
      render();
      window.setTimeout(() => document.getElementById('product-error-summary')?.focus(), 0);
      return;
    }
    await withBusy('create-product', async () => {
      const product = await api(`/v1/catalog-management/merchant/${state.merchant.id}/products`, {
        method: 'POST',
        idempotencyScope: 'catalog-create',
        body: {
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          variants: [{ sku: input.sku, title: 'Default', priceMinor, availableQuantity }],
          media: [{ mediaUrl: input.imageUrl, mediaType: 'image', altText: input.title, sortOrder: 0 }],
        },
      });
      if (input.submitForReview) await api(`/v1/catalog-management/products/${product.id}/submit`, { method: 'POST', idempotencyScope: 'catalog-submit' });
      state.productDraft = null;
      state.productErrors = {};
      state.activeView = 'catalogue';
    }, input.submitForReview ? 'Product created and submitted for moderation.' : 'Product saved as a draft.');
    return;
  }
  if (form.id === 'stock-form') {
    const variantId = form.elements.variantId.value;
    const availableQuantity = Number(form.elements.availableQuantity.value);
    if (!Number.isSafeInteger(availableQuantity) || availableQuantity < 0) {
      state.formError = 'Available quantity must be a whole number of zero or more.';
      render();
      return;
    }
    await withBusy('set-stock', () => api(`/v1/catalog-management/variants/${variantId}/inventory`, { method: 'PATCH', idempotencyScope: 'catalog-inventory', body: { availableQuantity } }), 'Available stock updated.');
    return;
  }
  if (form.id === 'ship-form') {
    const carrier = form.elements.carrier.value.trim();
    const trackingCode = form.elements.trackingCode.value.trim();
    const pickupEvidenceUrl = form.elements.pickupEvidenceUrl.value.trim();
    if (carrier.length < 2 || trackingCode.length < 2 || (pickupEvidenceUrl && !safeUrl(pickupEvidenceUrl))) {
      state.formError = 'Provide a carrier and tracking code. Pickup evidence must be a valid http(s) URL when supplied.';
      render();
      return;
    }
    await withBusy('ship-order', () => api(`/v1/fulfilment/orders/${form.elements.orderId.value}/ship`, { method: 'POST', idempotencyScope: 'fulfilment-ship', body: { carrier, trackingCode, ...(pickupEvidenceUrl ? { pickupEvidenceUrl } : {}) } }), 'Dispatch recorded and buyer notified.');
    return;
  }
  if (form.id === 'return-decision-form') {
    const note = form.elements.note.value.trim();
    if (note.length < 2) {
      state.formError = 'Add a short, clear note for the buyer.';
      render();
      return;
    }
    await withBusy('return-decision', () => api(`/v1/customer-care/returns/${form.elements.returnId.value}/decision`, { method: 'POST', idempotencyScope: 'return-decision', body: { decision: form.elements.decision.value, note } }), `Return ${form.elements.decision.value}.`);
    return;
  }
  if (form.id === 'business-profile-form') {
    const body = {
      businessName: form.elements.businessName.value.trim(),
      description: form.elements.description.value.trim() || null,
      contactEmail: form.elements.contactEmail.value.trim(),
      contactPhone: form.elements.contactPhone.value.trim(),
    };
    await withBusy('update-profile', () => api(`/v1/vendor/merchant/${state.merchant.id}/profile`, { method: 'PATCH', idempotencyScope: 'vendor-profile', body }), 'Business profile updated.');
    return;
  }
  if (form.id === 'verification-form') {
    const values = Object.fromEntries(new FormData(form));
    const body = {
      cacNumber: String(values.cacNumber ?? '').trim(),
      idType: String(values.idType ?? ''),
      idDocumentUrl: String(values.idDocumentUrl ?? '').trim(),
      utilityBillUrl: String(values.utilityBillUrl ?? '').trim(),
      ...(String(values.tinNumber ?? '').trim() ? { tinNumber: String(values.tinNumber).trim() } : {}),
    };
    await withBusy('submit-verification', () => api(`/v1/vendor/merchant/${state.merchant.id}/verification`, { method: 'POST', idempotencyScope: 'vendor-verification', body }), 'Verification submitted for operations review.');
  }
});

async function boot() {
  if (!hasRuntimeConfig() || !window.supabase) {
    renderSetup();
    return;
  }
  state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await state.client.auth.getSession();
  state.session = session;
  state.client.auth.onAuthStateChange((_event, nextSession) => {
    if (!nextSession && state.session) {
      state.session = null;
      state.merchants = [];
      state.merchant = null;
      render();
    }
  });
  if (session) await loadWorkspace();
  else {
    state.loading = false;
    render();
  }
}

boot();
