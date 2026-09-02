import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  disputes,
  notifications,
  orders,
  outboxEvents,
  returnRequests,
  shipments,
  supportTicketMessages,
  supportTickets,
} from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { transitionOrder } from '../orders/orderStateMachine.js';
import { assertDisputeEligibility, assertReturnEligibility } from './customerCare.policy.js';

export const customerCareRouter = Router();

const TicketSchema = z.object({
  orderId: z.string().uuid().optional(),
  category: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(4).max(180),
  message: z.string().trim().min(4).max(5000),
});
const MessageSchema = z.object({ message: z.string().trim().min(1).max(5000) });
const ReturnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(8).max(1000),
  evidenceUrl: z.string().url().max(2000).optional(),
});
const DisputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(8).max(2000),
});
const ReturnDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().min(2).max(1000),
});

const platformRoles = new Set([
  'support_agent',
  'catalogue_moderator',
  'finance_reviewer',
  'operations_admin',
  'security_admin',
]);

function assertMerchantCaseAccess(req: Request, merchantId: string): void {
  const isPlatformStaff = req.user!.roles.some((role) => platformRoles.has(role));
  if (!isPlatformStaff && !req.user!.merchantIds.includes(merchantId)) throw errors.forbidden();
}

customerCareRouter.use(requireAuth);

customerCareRouter.get('/tickets', async (req: Request, res: Response) => {
  try {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, req.user!.id))
      .orderBy(desc(supportTickets.updatedAt))
      .limit(100);
    const messages = tickets.length === 0 ? [] : await db
      .select()
      .from(supportTicketMessages)
      .where(inArray(supportTicketMessages.ticketId, tickets.map((ticket) => ticket.id)))
      .orderBy(asc(supportTicketMessages.createdAt));
    const byTicket = new Map<string, typeof messages>();
    for (const message of messages) {
      const current = byTicket.get(message.ticketId) ?? [];
      current.push(message);
      byTicket.set(message.ticketId, current);
    }
    res.json({
      success: true,
      data: tickets.map((ticket) => ({ ...ticket, messages: byTicket.get(ticket.id) ?? [] })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post('/tickets', idempotency('support-ticket-create'), async (req: Request, res: Response) => {
  try {
    const parsed = TicketSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);

    const ticket = await db.transaction(async (tx) => {
      if (parsed.data.orderId) {
        const [order] = await tx.select({ buyerId: orders.buyerId }).from(orders)
          .where(eq(orders.id, parsed.data.orderId)).limit(1);
        if (!order || order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');
      }

      const [created] = await tx.insert(supportTickets).values({
        userId: req.user!.id,
        orderId: parsed.data.orderId,
        category: parsed.data.category,
        subject: parsed.data.subject,
        body: parsed.data.message,
      }).returning();
      const [message] = await tx.insert(supportTicketMessages).values({
        ticketId: created.id,
        senderId: req.user!.id,
        senderRole: 'user',
        body: parsed.data.message,
      }).returning();
      await tx.insert(outboxEvents).values({
        type: 'support.ticket_created',
        payload: { ticketId: created.id, userId: req.user!.id, orderId: parsed.data.orderId },
      });
      return { ...created, messages: [message] };
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.id, req.params.id), eq(supportTickets.userId, req.user!.id))).limit(1);
    if (!ticket) throw errors.notFound('Support ticket not found.');
    const messages = await db.select().from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticket.id)).orderBy(asc(supportTicketMessages.createdAt));
    res.json({ success: true, data: { ...ticket, messages } });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post('/tickets/:id/messages', idempotency('support-ticket-message'), async (req: Request, res: Response) => {
  try {
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const message = await db.transaction(async (tx) => {
      const [ticket] = await tx.select().from(supportTickets)
        .where(and(eq(supportTickets.id, req.params.id), eq(supportTickets.userId, req.user!.id)))
        .limit(1).for('update');
      if (!ticket) throw errors.notFound('Support ticket not found.');
      if (['resolved', 'closed'].includes(ticket.status)) {
        throw errors.conflict('TICKET_CLOSED', 'This ticket no longer accepts replies.');
      }
      const [created] = await tx.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        senderId: req.user!.id,
        senderRole: 'user',
        body: parsed.data.message,
      }).returning();
      await tx.update(supportTickets).set({ status: 'open', updatedAt: new Date() })
        .where(eq(supportTickets.id, ticket.id));
      await tx.insert(outboxEvents).values({
        type: 'support.ticket_replied',
        payload: { ticketId: ticket.id, messageId: created.id },
      });
      return created;
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post(
  '/tickets/:id/agent-messages',
  requireRole('support_agent', 'operations_admin'),
  idempotency('support-ticket-agent-message'),
  async (req: Request, res: Response) => {
    try {
      const parsed = MessageSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [ticket] = await tx.select().from(supportTickets)
          .where(eq(supportTickets.id, req.params.id)).limit(1).for('update');
        if (!ticket) throw errors.notFound('Support ticket not found.');
        if (['resolved', 'closed'].includes(ticket.status)) {
          throw errors.conflict('TICKET_CLOSED', 'This ticket no longer accepts replies.');
        }
        const [message] = await tx.insert(supportTicketMessages).values({
          ticketId: ticket.id,
          senderId: req.user!.id,
          senderRole: 'agent',
          body: parsed.data.message,
        }).returning();
        await tx.update(supportTickets).set({ status: 'pending', updatedAt: new Date() })
          .where(eq(supportTickets.id, ticket.id));
        await tx.insert(notifications).values({
          userId: ticket.userId,
          type: 'support_reply',
          title: 'Support replied',
          body: `There is a new reply on “${ticket.subject}”.`,
          data: { ticketId: ticket.id, orderId: ticket.orderId },
        });
        return message;
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

customerCareRouter.post(
  '/tickets/:id/close',
  requireRole('support_agent', 'operations_admin'),
    idempotency('support-ticket-close'),
  async (req: Request, res: Response) => {
    try {
      const ticket = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(supportTickets)
          .where(eq(supportTickets.id, req.params.id)).limit(1).for('update');
        if (!existing) throw errors.notFound('Support ticket not found.');
        if (existing.status === 'closed') return existing;
        const [updated] = await tx.update(supportTickets)
          .set({ status: 'closed', updatedAt: new Date() })
          .where(eq(supportTickets.id, existing.id)).returning();
        await tx.insert(notifications).values({
          userId: updated.userId,
          type: 'support_closed',
          title: 'Support ticket closed',
          body: `“${updated.subject}” has been closed.`,
          data: { ticketId: updated.id, orderId: updated.orderId },
        });
        return updated;
      });
      res.json({ success: true, data: ticket });
    } catch (err) {
      sendError(res, err);
    }
  }
);

customerCareRouter.get('/returns', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(returnRequests)
      .where(eq(returnRequests.buyerId, req.user!.id)).orderBy(desc(returnRequests.createdAt)).limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post('/returns', idempotency('return-request-create'), async (req: Request, res: Response) => {
  try {
    const parsed = ReturnSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const created = await db.transaction(async (tx) => {
      const [record] = await tx.select({ order: orders, shipment: shipments })
        .from(orders).leftJoin(shipments, eq(shipments.orderId, orders.id))
        .where(eq(orders.id, parsed.data.orderId)).limit(1).for('update');
      if (!record || record.order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');
      assertReturnEligibility({
        orderStatus: record.order.status,
        deliveredAt: record.shipment?.deliveredAt ?? null,
        returnWindowDays: config.fulfilment.returnWindowDays,
      });
      const [existing] = await tx.select({ id: returnRequests.id }).from(returnRequests)
        .where(and(
          eq(returnRequests.orderId, record.order.id),
          notInArray(returnRequests.status, ['rejected', 'completed'])
        )).limit(1);
      if (existing) throw errors.conflict('RETURN_ALREADY_OPEN', 'This order already has an open return request.');

      const [request] = await tx.insert(returnRequests).values({
        orderId: record.order.id,
        buyerId: req.user!.id,
        merchantId: record.order.merchantId,
        reason: parsed.data.reason,
        evidenceUrl: parsed.data.evidenceUrl,
      }).returning();
      await tx.insert(outboxEvents).values({
        type: 'return.requested',
        payload: { returnId: request.id, orderId: record.order.id, merchantId: record.order.merchantId },
      });
      await tx.insert(notifications).values({
        userId: req.user!.id,
        type: 'return_requested',
        title: 'Return request received',
        body: 'Your return request is awaiting review.',
        data: { returnId: request.id, orderId: record.order.id },
      });
      return request;
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.get('/returns/:id', async (req: Request, res: Response) => {
  try {
    const [request] = await db.select().from(returnRequests)
      .where(and(eq(returnRequests.id, req.params.id), eq(returnRequests.buyerId, req.user!.id))).limit(1);
    if (!request) throw errors.notFound('Return request not found.');
    res.json({ success: true, data: request });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.get('/merchant/:merchantId/returns', async (req: Request, res: Response) => {
  try {
    assertMerchantCaseAccess(req, req.params.merchantId);
    const list = await db.select().from(returnRequests)
      .where(eq(returnRequests.merchantId, req.params.merchantId))
      .orderBy(desc(returnRequests.createdAt)).limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post(
  '/returns/:id/decision',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('return-decision'),
  async (req: Request, res: Response) => {
    try {
      const parsed = ReturnDecisionSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [request] = await tx.select().from(returnRequests)
          .where(eq(returnRequests.id, req.params.id)).limit(1).for('update');
        if (!request) throw errors.notFound('Return request not found.');
        assertMerchantCaseAccess(req, request.merchantId);
        if (request.status !== 'requested') {
          throw errors.conflict('RETURN_NOT_REVIEWABLE', 'This return request has already been reviewed.');
        }
        const now = new Date();
        const [updated] = await tx.update(returnRequests).set({
          status: parsed.data.decision,
          decidedBy: req.user!.id,
          decisionNote: parsed.data.note,
          decidedAt: now,
          updatedAt: now,
        }).where(eq(returnRequests.id, request.id)).returning();
        await tx.insert(outboxEvents).values({
          type: `return.${parsed.data.decision}`,
          payload: { returnId: request.id, orderId: request.orderId },
        });
        await tx.insert(notifications).values({
          userId: request.buyerId,
          type: `return_${parsed.data.decision}`,
          title: parsed.data.decision === 'approved' ? 'Return approved' : 'Return not approved',
          body: parsed.data.note,
          data: { returnId: request.id, orderId: request.orderId },
        });
        return updated;
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

customerCareRouter.post(
  '/returns/:id/received',
  requireRole('support_agent', 'operations_admin'),
  idempotency('return-received'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [request] = await tx.select().from(returnRequests)
          .where(eq(returnRequests.id, req.params.id)).limit(1).for('update');
        if (!request) throw errors.notFound('Return request not found.');
        if (request.status !== 'approved') {
          throw errors.conflict('RETURN_NOT_EXPECTED', 'Only an approved return can be marked received.');
        }
        const [updated] = await tx.update(returnRequests)
          .set({ status: 'received', updatedAt: new Date() })
          .where(eq(returnRequests.id, request.id)).returning();
        await tx.insert(outboxEvents).values({
          type: 'return.received',
          payload: { returnId: request.id, orderId: request.orderId, paymentActionDeferred: true },
        });
        await tx.insert(notifications).values({
          userId: request.buyerId,
          type: 'return_received',
          title: 'Returned item received',
          body: 'The returned item was received. Any payment adjustment remains pending the dedicated payment workflow.',
          data: { returnId: request.id, orderId: request.orderId },
        });
        return updated;
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

customerCareRouter.get('/disputes', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(disputes)
      .where(eq(disputes.openedBy, req.user!.id)).orderBy(desc(disputes.createdAt)).limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

customerCareRouter.post('/disputes', idempotency('dispute-create'), async (req: Request, res: Response) => {
  try {
    const parsed = DisputeSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const created = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1).for('update');
      if (!order || order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');
      assertDisputeEligibility(order.status);
      const [existing] = await tx.select({ id: disputes.id }).from(disputes)
        .where(and(eq(disputes.orderId, order.id), notInArray(disputes.status, ['closed']))).limit(1);
      if (existing) throw errors.conflict('DISPUTE_ALREADY_OPEN', 'This order already has an open dispute.');
      const [dispute] = await tx.insert(disputes).values({
        orderId: order.id,
        openedBy: req.user!.id,
        reason: parsed.data.reason,
      }).returning();
      await transitionOrder(tx, order.id, 'disputed', req.user!.id, 'Buyer opened a dispute');
      await tx.insert(outboxEvents).values({
        type: 'dispute.opened',
        payload: { disputeId: dispute.id, orderId: order.id, merchantId: order.merchantId },
      });
      await tx.insert(notifications).values({
        userId: req.user!.id,
        type: 'dispute_opened',
        title: 'Dispute opened',
        body: 'Your case is awaiting marketplace review.',
        data: { disputeId: dispute.id, orderId: order.id },
      });
      return dispute;
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    sendError(res, err);
  }
});
