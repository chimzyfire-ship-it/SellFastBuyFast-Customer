/* Shoplancia Vendor Portal Client Engine & Router */

const VIEW_TITLES = {
  'dashboard': 'Merchant Dashboard',
  'catalogue': 'Catalogue & Inventory Management',
  'add-product': 'Submit New Product for Moderation',
  'orders': 'Order Fulfillment & Dispatch Queue',
  'earnings': 'Earnings & Paystack Payout History',
  'onboarding': 'CAC & NUBAN KYC Verification',
  'team': 'Team Roster & Scope Permissions'
};

function switchView(viewId) {
  // Update Navigation Active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update Section Active state
  document.querySelectorAll('.view-section').forEach(sec => {
    if (sec.id === `view-${viewId}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // Update Page Title
  const heading = document.getElementById('page-heading');
  if (heading && VIEW_TITLES[viewId]) {
    heading.textContent = VIEW_TITLES[viewId];
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bind Navigation Clicks
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (targetView) switchView(targetView);
    });
  });
});

// Modal Handlers
function openPayoutModal() {
  document.getElementById('payout-modal').classList.add('active');
}

function closePayoutModal() {
  document.getElementById('payout-modal').classList.remove('active');
}

function openWaybillModal(orderId) {
  const title = document.getElementById('waybill-title');
  if (title) title.textContent = `Assign Courier Waybill (${orderId})`;
  document.getElementById('waybill-modal').classList.add('active');
}

function closeWaybillModal() {
  document.getElementById('waybill-modal').classList.remove('active');
}

// Submissions
function handleProductSubmit(e) {
  e.preventDefault();
  alert('Product successfully submitted for Operations Moderation review! You will receive notification within 12 hours.');
  switchView('catalogue');
}

function handlePayoutSubmit(e) {
  e.preventDefault();
  alert('Payout request submitted to Operations Finance Reviewer! Funds will settle to GTBank NUBAN upon dual-control authorization.');
  closePayoutModal();
}

function handleWaybillSubmit(e) {
  e.preventDefault();
  alert('Waybill assigned and order marked as Dispatched! Buyer tracking status has been updated.');
  closeWaybillModal();
}

// Filter Catalogue Search
function filterCatalogue(query) {
  const table = document.getElementById('catalogue-table');
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
