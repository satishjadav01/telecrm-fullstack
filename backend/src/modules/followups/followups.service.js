const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const notificationsService = require('../notifications/notifications.service');

const hasQueryFilter = (query = {}, keys = []) => {
  if (query.hasFilter !== undefined) return Boolean(query.hasFilter);

  return keys.some((key) => {
    const value = query[key];
    if (value === undefined || value === null) return false;
    return String(value).trim() !== '';
  });
};

const followUpInclude = {
  lead: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phonePrimary: true,
      stage: true,
    },
  },
  assignee: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  creator: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  call: {
    select: {
      id: true,
      disposition: true,
      createdAt: true,
    },
  },
};

const buildFollowUpWhere = ({ companyId, query = {}, assignedTo }) => {
  const where = { companyId };

  if (assignedTo) {
    where.assignedTo = assignedTo;
  } else if (query.assignedTo) {
    where.assignedTo = query.assignedTo;
  }

  if (query.leadId) where.leadId = query.leadId;
  if (query.source) where.lead = { source: query.source };
  if (query.status) where.status = query.status;

  if (query.from || query.to) {
    where.dueAt = {};
    if (query.from) where.dueAt.gte = new Date(query.from);
    if (query.to) where.dueAt.lte = new Date(query.to);
  }

  if (query.search) {
    const q = String(query.search).trim();
    if (q) {
      const isPhoneQuery = /^\+?[0-9\s\-().]+$/.test(q);
      const digitsOnly = q.replace(/\D/g, '');
      const phoneQuery = isPhoneQuery && digitsOnly.length >= 4 ? digitsOnly : q;

      where.OR = [
        { reason: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
        { lead: { firstName: { contains: q, mode: 'insensitive' } } },
        { lead: { lastName: { contains: q, mode: 'insensitive' } } },
        { lead: { phonePrimary: { contains: phoneQuery, mode: 'insensitive' } } },
        { assignee: { fullName: { contains: q, mode: 'insensitive' } } },
        { assignee: { email: { contains: q, mode: 'insensitive' } } },
        { assignee: { phone: { contains: phoneQuery, mode: 'insensitive' } } },
      ];
    }
  }

  return where;
};

const listFollowUpsByScope = async ({ companyId, query = {}, assignedTo }) => {
  if (!companyId) {
    throw new AppError('Company not set for this user', 403);
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;
  const where = buildFollowUpWhere({ companyId, query, assignedTo });

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: followUpInclude,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.followUp.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    hasFilter: hasQueryFilter(query, ['assignedTo', 'leadId', 'status', 'source', 'from', 'to', 'search']),
  };
};

const listFollowUps = async (companyId, query = {}) => {
  return listFollowUpsByScope({ companyId, query });
};

const listMyFollowUps = async (userId, companyId, query = {}) => {
  return listFollowUpsByScope({ companyId, query, assignedTo: userId });
};

const createFollowUp = async (payload, currentUserId, companyId) => {
  const lead = await prisma.lead.findFirst({
    where: { id: payload.leadId, isActive: true, companyId },
    select: { id: true, assignedTo: true },
  });

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const assignedTo = payload.assignedTo || lead.assignedTo || currentUserId;
  if (!assignedTo) {
    throw new AppError('Unable to resolve assigned user for follow-up', 400);
  }

  const followUp = await prisma.followUp.create({
    data: {
      companyId,
      leadId: payload.leadId,
      assignedTo,
      callId: payload.callId || null,
      dueAt: payload.dueAt,
      reminderAt: payload.reminderAt || null,
      reason: payload.reason || null,
      priority: payload.priority || 3,
      note: payload.note || null,
      createdBy: currentUserId || null,
    },
    include: followUpInclude,
  });

  await notificationsService.scheduleFollowUpReminder(followUp);

  return followUp;
};

const updateFollowUp = async (id, payload, companyId) => {
  const existing = await prisma.followUp.findFirst({ where: { id, companyId } });

  if (!existing) {
    throw new AppError('Follow-up not found', 404);
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      assignedTo: payload.assignedTo ?? undefined,
      dueAt: payload.dueAt ?? undefined,
      reminderAt: payload.reminderAt !== undefined ? payload.reminderAt : undefined,
      reason: payload.reason ?? undefined,
      priority: payload.priority ?? undefined,
      note: payload.note ?? undefined,
      status: payload.status ?? undefined,
      completedAt: payload.completedAt ?? undefined,
    },
    include: followUpInclude,
  });

  if (updated.status === 'pending') {
    await notificationsService.scheduleFollowUpReminder(updated);
  }

  return updated;
};

module.exports = {
  listFollowUps,
  listMyFollowUps,
  createFollowUp,
  updateFollowUp,
};