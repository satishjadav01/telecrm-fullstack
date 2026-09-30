const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const notificationsService = require('../notifications/notifications.service');

const phoneDevicesEnabled = typeof prisma.phoneDevice?.findFirst === 'function';

const dispositionToLeadStage = {
  no_answer: 'attempted',
  busy: 'attempted',
  interested: 'connected',
  not_interested: 'dropped',
  callback: 'follow_up',
  converted: 'converted',
};

const hasQueryFilter = (query = {}, keys = []) => {
  if (query.hasFilter !== undefined) return Boolean(query.hasFilter);

  return keys.some((key) => {
    const value = query[key];
    if (value === undefined || value === null) return false;
    return String(value).trim() !== '';
  });
};

const buildCallsWhere = (query = {}, companyId) => {
  const where = { companyId };

  if (query.disposition) where.disposition = query.disposition;
  if (query.direction) where.direction = query.direction;
  if (query.leadId) where.leadId = query.leadId;
  if (query.source) where.lead = { source: query.source };
  if (query.agentId) where.agentId = query.agentId;
  if (phoneDevicesEnabled && query.phoneDeviceId) where.phoneDeviceId = query.phoneDeviceId;

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  return where;
};

const startCall = async (payload, currentUserId, companyId) => {
  if (!currentUserId) throw new AppError('Unauthorized', 401);

  const lead = await prisma.lead.findFirst({
    where: { id: payload.leadId, isActive: true, companyId },
    select: { id: true, assignedTo: true, stage: true },
  });

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const assignedPhone = phoneDevicesEnabled
    ? await prisma.phoneDevice.findFirst({
        where: {
          companyId,
          assignedToUserId: currentUserId,
          isActive: true,
        },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      })
    : null;

  const call = await prisma.$transaction(async (tx) => {
    const include = {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phonePrimary: true,
        },
      },
    };

    if (phoneDevicesEnabled) {
      include.phoneDevice = {
        select: {
          id: true,
          label: true,
          imei: true,
          phoneNumber: true,
        },
      };
    }

    const createdCall = await tx.call.create({
      data: {
        companyId,
        leadId: payload.leadId,
        agentId: currentUserId,
        ...(phoneDevicesEnabled ? { phoneDeviceId: assignedPhone?.id || null } : {}),
        direction: payload.direction || 'outbound',
        startedAt: payload.startedAt || new Date(),
        notes: payload.notes || null,
      },
      include,
    });

    await tx.leadActivity.create({
      data: {
        leadId: payload.leadId,
        actorUserId: currentUserId,
        activityType: 'call_started',
        oldValue: { stage: lead.stage },
        newValue: { callId: createdCall.id, direction: createdCall.direction },
        note: payload.notes || 'Call started',
      },
    });

    return createdCall;
  });

  return call;
};

const applyDisposition = async (callId, payload, currentUserId, companyId) => {
  if (!currentUserId) throw new AppError('Unauthorized', 401);

  const existingCall = await prisma.call.findFirst({
    where: { id: callId, companyId },
    include: {
      lead: {
        select: {
          id: true,
          stage: true,
          assignedTo: true,
        },
      },
    },
  });

  if (!existingCall) {
    throw new AppError('Call not found', 404);
  }

  if (existingCall.disposition) {
    throw new AppError('Disposition already applied for this call', 400);
  }

  const endedAt = payload.endedAt ? new Date(payload.endedAt) : new Date();
  const startedAt = existingCall.startedAt || endedAt;
  const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));

  const stageFromDisposition = dispositionToLeadStage[payload.disposition] || 'attempted';

  const followUpRequired = payload.followUpRequired ?? payload.disposition === 'callback';
  const followUpAt = payload.followUpAt ? new Date(payload.followUpAt) : null;

  if (followUpRequired && !followUpAt) {
    throw new AppError('followUpAt is required when followUpRequired is true', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCall = await tx.call.update({
      where: { id: callId },
      data: {
        disposition: payload.disposition,
        notes: payload.notes ?? existingCall.notes,
        endedAt,
        durationSeconds,
        followUpRequired,
        followUpAt,
      },
    });

    const leadUpdateData = {
      stage: stageFromDisposition,
      lastCalledAt: endedAt,
      nextFollowUpAt: followUpRequired ? followUpAt : null,
      convertedAt: payload.disposition === 'converted' ? endedAt : null,
      droppedAt: payload.disposition === 'not_interested' ? endedAt : null,
    };

    const updatedLead = await tx.lead.update({
      where: { id: existingCall.leadId },
      data: leadUpdateData,
      select: {
        id: true,
        stage: true,
        lastCalledAt: true,
        nextFollowUpAt: true,
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: existingCall.leadId,
        actorUserId: currentUserId,
        activityType: 'call_disposition',
        oldValue: { stage: existingCall.lead.stage, disposition: null },
        newValue: {
          stage: updatedLead.stage,
          disposition: payload.disposition,
          followUpRequired,
          followUpAt,
        },
        note: payload.notes || `Call marked as ${payload.disposition}`,
      },
    });

    let followUp = null;

    if (followUpRequired) {
      followUp = await tx.followUp.create({
        data: {
          companyId,
          leadId: existingCall.leadId,
          callId: existingCall.id,
          assignedTo: existingCall.lead.assignedTo || currentUserId,
          dueAt: followUpAt,
          reason: payload.followUpReason || `Auto follow-up for ${payload.disposition}`,
          priority: payload.followUpPriority || 3,
          createdBy: currentUserId,
          note: payload.notes || null,
        },
      });
    }

    return {
      call: updatedCall,
      lead: updatedLead,
      followUp,
    };
  });

  if (result.followUp) {
    await notificationsService.scheduleFollowUpReminder(result.followUp);
  }

  return result;
};

const listCalls = async (query = {}, companyId) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = buildCallsWhere(query, companyId);
  const include = {
    lead: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phonePrimary: true,
      },
    },
    recording: {
      select: {
        id: true,
        createdAt: true,
        fileName: true,
        uploadedAt: true,
      },
    },
    agent: {
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    },
  };

  if (phoneDevicesEnabled) {
    include.phoneDevice = {
      select: {
        id: true,
        label: true,
        imei: true,
        phoneNumber: true,
        manufacturer: true,
        model: true,
      },
    };
  }

  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.call.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    hasFilter: hasQueryFilter(query, ['disposition', 'direction', 'leadId', 'agentId', 'phoneDeviceId', 'source', 'from', 'to']),
  };
};

const getCallsSummary = async (query = {}, companyId) => {
  const where = buildCallsWhere(query, companyId);

  const [totalCalls, grouped] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.groupBy({
      by: ['disposition'],
      where,
      _count: { _all: true },
    }),
  ]);

  const mix = {
    no_answer: 0,
    busy: 0,
    interested: 0,
    not_interested: 0,
    callback: 0,
    converted: 0,
    unknown: 0,
  };

  for (const row of grouped) {
    const key = row.disposition || 'unknown';
    if (!Object.prototype.hasOwnProperty.call(mix, key)) {
      mix.unknown += row._count._all;
    } else {
      mix[key] += row._count._all;
    }
  }

  const toPct = (count) => (totalCalls ? Number(((count / totalCalls) * 100).toFixed(2)) : 0);

  return {
    totalCalls,
    hasFilter: hasQueryFilter(query, ['disposition', 'direction', 'leadId', 'agentId', 'phoneDeviceId', 'source', 'from', 'to']),
    counts: mix,
    percentages: {
      no_answer: toPct(mix.no_answer),
      busy: toPct(mix.busy),
      interested: toPct(mix.interested),
      not_interested: toPct(mix.not_interested),
      callback: toPct(mix.callback),
      converted: toPct(mix.converted),
      unknown: toPct(mix.unknown),
    },
  };
};

module.exports = {
  startCall,
  applyDisposition,
  listCalls,
  getCallsSummary,
};

