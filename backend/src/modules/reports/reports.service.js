const prisma = require('../../config/db');

const emptyToUndefined = (value) => (value === null || value === undefined || value === '' ? undefined : value);

const buildDateFilter = (from, to, field) => {
  const start = emptyToUndefined(from);
  const end = emptyToUndefined(to);
  if (!start && !end) return {};

  const range = {};
  if (start) range.gte = new Date(start);
  if (end) range.lte = new Date(end);

  return { [field]: range };
};

const buildCallWhere = (query = {}, companyId) => {
  const where = { ...buildDateFilter(query.from, query.to, 'createdAt'), companyId };
  if (query.agentId) where.agentId = query.agentId;
  if (query.source) where.lead = { source: query.source };
  return where;
};

const buildLeadWhere = (query = {}, companyId) => {
  const where = { ...buildDateFilter(query.from, query.to, 'createdAt'), isActive: true, companyId };
  if (query.agentId) where.assignedTo = query.agentId;
  if (query.source) where.source = query.source;
  return where;
};

const buildFollowUpWhere = (query = {}, companyId) => {
  const where = { ...buildDateFilter(query.from, query.to, 'dueAt'), companyId };
  if (query.agentId) where.assignedTo = query.agentId;
  if (query.source) where.lead = { source: query.source };
  return where;
};

const getAgentPerformance = async (query = {}, companyId) => {
  const where = buildCallWhere(query, companyId);

  const grouped = await prisma.call.groupBy({
    by: ['agentId', 'disposition'],
    where,
    _count: { _all: true },
  });

  const agentIds = [...new Set(grouped.map((item) => item.agentId).filter(Boolean))];
  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds }, companyId },
    select: { id: true, fullName: true, email: true, phone: true },
  });

  const byAgent = {};
  for (const row of grouped) {
    if (!byAgent[row.agentId]) {
      byAgent[row.agentId] = {
        agentId: row.agentId,
        totalCalls: 0,
        convertedCalls: 0,
        callbackCalls: 0,
        interestedCalls: 0,
        inProgressCalls: 0,
      };
    }

    byAgent[row.agentId].totalCalls += row._count._all;
    if (row.disposition === 'converted') byAgent[row.agentId].convertedCalls += row._count._all;
    if (row.disposition === 'callback') byAgent[row.agentId].callbackCalls += row._count._all;
    if (row.disposition === 'interested') byAgent[row.agentId].interestedCalls += row._count._all;
    if (!row.disposition) byAgent[row.agentId].inProgressCalls += row._count._all;
  }

  return Object.values(byAgent)
    .map((item) => {
      const agent = agents.find((a) => a.id === item.agentId) || null;
      const conversionRate = item.totalCalls
        ? Number(((item.convertedCalls / item.totalCalls) * 100).toFixed(2))
        : 0;
      const interestRate = item.totalCalls
        ? Number(((item.interestedCalls / item.totalCalls) * 100).toFixed(2))
        : 0;

      return {
        ...item,
        conversionRate,
        interestRate,
        agent,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);
};

const getConversionFunnel = async (query = {}, companyId) => {
  const where = buildLeadWhere(query, companyId);

  const totalLeads = await prisma.lead.count({ where });

  const stageCounts = await prisma.lead.groupBy({
    by: ['stage'],
    where,
    _count: { _all: true },
  });

  const stageMap = stageCounts.reduce((acc, item) => {
    acc[item.stage] = item._count._all;
    return acc;
  }, {});

  return {
    totalLeads,
    stages: {
      new: stageMap.new || 0,
      attempted: stageMap.attempted || 0,
      connected: stageMap.connected || 0,
      follow_up: stageMap.follow_up || 0,
      converted: stageMap.converted || 0,
      dropped: stageMap.dropped || 0,
    },
  };
};

const getFilterOptions = async (companyId) => {
  const [agents, sources] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, isActive: true, role: { code: 'agent' } },
      select: { id: true, fullName: true, email: true, phone: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: { companyId, isActive: true, source: { not: null } },
      _count: { _all: true },
      orderBy: { source: 'asc' },
    }),
  ]);

  return {
    agents,
    sources: sources.map((s) => s.source).filter(Boolean),
  };
};

const getActiveAgentsCount = async (companyId) => {
  return prisma.user.count({
    where: { companyId, isActive: true, role: { code: 'agent' } },
  });
};

const getCalendarData = async (query = {}, companyId) => {
  const callWhere = buildCallWhere(query, companyId);
  const followupWhere = buildFollowUpWhere(query, companyId);

  const [calls, followups] = await Promise.all([
    prisma.call.findMany({
      where: callWhere,
      select: {
        id: true,
        createdAt: true,
        direction: true,
        disposition: true,
        durationSeconds: true,
        notes: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        phoneDevice: {
          select: {
            id: true,
            label: true,
            phoneNumber: true,
            imei: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phonePrimary: true,
            source: true,
            stage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.followUp.findMany({
      where: followupWhere,
      select: {
        id: true,
        dueAt: true,
        status: true,
        reason: true,
        priority: true,
        assignedTo: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phonePrimary: true,
            source: true,
            stage: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
    }),
  ]);

  return { calls, followups };
};

const buildCalendarMonthRange = (calendarMonth) => {
  const monthStart = new Date(calendarMonth);
  if (Number.isNaN(monthStart.getTime())) return {};

  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { from: monthStart, to: monthEnd };
};

const getDashboardSummary = async (query = {}, companyId) => {
  const calendarQuery = query.calendarMonth
    ? { ...query, ...buildCalendarMonthRange(query.calendarMonth) }
    : query;

  const [funnel, performance, calendar, activeAgents] = await Promise.all([
    getConversionFunnel(query, companyId),
    getAgentPerformance(query, companyId),
    getCalendarData(calendarQuery, companyId),
    getActiveAgentsCount(companyId),
  ]);

  return { funnel, performance, calendar, activeAgents };
};

module.exports = {
  getAgentPerformance,
  getConversionFunnel,
  getFilterOptions,
  getCalendarData,
  getDashboardSummary,
};