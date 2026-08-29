/* SellFastBuyFast Admin Operations Portal Client Engine & Live Supabase Integration */

const SUPABASE_URL = 'https://fuqrhfxptybipxbzveyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cXJoZnhwdHliaXB4Ynp2ZXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDY3MjYsImV4cCI6MjEwMzUyMjcyNn0.Q240FBpikqiWaGytkVP1RWVHGA-ZpvdVicY9qf4pvWw';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const VIEW_TITLES = {
  'work-queue': 'Operations Work Queue',
  'merchant-review': 'Merchant Verification Queue (KYC & CAC)',
  'catalogue-moderation': 'Catalogue Product Submission Queue',
  'order-exceptions': 'Order Exceptions & Logistics Monitor',
  'disputes-returns': 'Return Cases & Customer Disputes',
  'payout-review': 'Finance Payout Authorization Queue',
  'reconciliation': 'Paystack Ledger Reconciliation',
  'audit-logs': 'Immutable System Audit Log Trail'
};

let activeActionType = null;
let activeTargetName = null;

function switchView(viewId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    if (sec.id === `view-${viewId}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  const heading = document.getElementById('page-heading');
  if (heading && VIEW_TITLES[viewId]) {
    heading.textContent = VIEW_TITLES[viewId];
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (targetView) switchView(targetView);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }

  loadLiveMerchants();
});

// Load Live Merchants from Supabase
async function loadLiveMerchants() {
  if (!supabaseClient) return;

  try {
    const { data: merchants, error } = await supabaseClient
      .from('merchants')
      .select('*');

    if (error || !merchants) return;

    const countBadge = document.querySelector('.nav-item[data-view="merchant-review"] .nav-badge');
    if (countBadge) {
      const pendingCount = merchants.filter(m => m.status === 'pending_verification').length;
      countBadge.textContent = String(pendingCount);
    }
  } catch (err) {
    console.warn('Could not load live merchants:', err);
  }
}

function openActionModal(actionTitle, targetName, actionType) {
  activeActionType = actionType;
  activeTargetName = targetName;
  document.getElementById('modal-action-title').textContent = actionTitle;
  document.getElementById('modal-target-name').textContent = targetName;
  document.getElementById('audit-reason-input').value = '';
  document.getElementById('action-modal').classList.add('active');
}

function closeActionModal() {
  document.getElementById('action-modal').classList.remove('active');
}

function handleAuditSubmit(e) {
  e.preventDefault();
  const reason = document.getElementById('audit-reason-input').value;
  alert(`Audit record generated for ${activeActionType} on "${activeTargetName}". Reason: ${reason}`);
  closeActionModal();

  // Add to Audit Log Table
  const auditTable = document.getElementById('audit-table');
  if (auditTable) {
    const tbody = auditTable.getElementsByTagName('tbody')[0];
    const newRow = tbody.insertRow(0);
    const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    newRow.innerHTML = `
      <td>${now}</td>
      <td>Operations Admin</td>
      <td>Ops Admin</td>
      <td><span class="badge badge-success">${escapeHtml(activeActionType.toUpperCase())}</span></td>
      <td>${escapeHtml(reason)}</td>
    `;
  }
}

function filterAudit(query) {
  const table = document.getElementById('audit-table');
  if (!table) return;
  const rows = table.getElementsByTagName('tr');
  const term = query.toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const text = rows[i].textContent.toLowerCase();
    if (text.includes(term)) {
      rows[i].style.display = '';
    } else {
      rows[i].style.display = 'none';
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
