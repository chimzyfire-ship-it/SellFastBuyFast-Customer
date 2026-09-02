import { apiRequest, createIdempotencyKey } from './apiClient';

function formatMessage(message) {
  return {
    id: message.id,
    sender: message.senderRole === 'user' ? 'user' : 'agent',
    agentName: message.senderRole === 'agent' ? 'SellFastBuyFast Support' : undefined,
    text: message.body,
    time: new Date(message.createdAt).toLocaleString(),
  };
}

export function formatTicket(ticket) {
  return {
    id: ticket.id,
    orderId: ticket.orderId,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status === 'pending' ? 'In Progress' : `${ticket.status.charAt(0).toUpperCase()}${ticket.status.slice(1)}`,
    createdAt: ticket.createdAt,
    messages: (ticket.messages || []).map(formatMessage),
  };
}

export async function listSupportTickets() {
  const tickets = await apiRequest('/v1/customer-care/tickets');
  return tickets.map(formatTicket);
}

export async function createSupportTicket(input) {
  return formatTicket(await apiRequest('/v1/customer-care/tickets', {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('ticket'),
    body: input,
  }));
}

export async function addSupportTicketMessage(ticketId, message) {
  return formatMessage(await apiRequest(`/v1/customer-care/tickets/${ticketId}/messages`, {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('ticket-message'),
    body: { message },
  }));
}

export function listReturnRequests() {
  return apiRequest('/v1/customer-care/returns');
}

export function createReturnRequest(input) {
  return apiRequest('/v1/customer-care/returns', {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('return'),
    body: input,
  });
}

export function listDisputes() {
  return apiRequest('/v1/customer-care/disputes');
}

export function createDispute(input) {
  return apiRequest('/v1/customer-care/disputes', {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('dispute'),
    body: input,
  });
}

export async function listNotifications() {
  const list = await apiRequest('/v1/notifications');
  return list.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    time: new Date(notification.createdAt).toLocaleString(),
    read: Boolean(notification.readAt),
    targetRoute: notification.data?.orderId ? 'order-detail' : undefined,
    targetParams: notification.data?.orderId ? { orderId: notification.data.orderId } : {},
  }));
}

export function markNotificationRead(notificationId) {
  return apiRequest(`/v1/notifications/${notificationId}/read`, { method: 'PATCH' });
}
