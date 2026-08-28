/* Shoplancia Admin Operations Portal Client Engine */

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
});

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
      <td>Ayo Ogundipe</td>
      <td>Ops Admin</td>
      <td>${activeActionType.toUpperCase()}</td>
      <td>${reason}</td>
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
