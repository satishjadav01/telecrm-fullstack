const prisma = require("../../config/db");
const AppError = require("../../core/errors/app-error");
const XLSX = require("xlsx");

const AGENT_ROLE_CODES = ["agent"];
const LEAD_STAGE_VALUES = new Set([
  "new",
  "attempted",
  "connected",
  "follow_up",
  "converted",
  "dropped",
]);
const LEAD_IMPORT_TEMPLATE_COLUMNS = [
  "firstName",
  "lastName",
  "phonePrimary",
  "phoneAlternate",
  "email",
  "source",
  "city",
  "stage",
  "priority",
  "notes",
];

const normalizePhone = (value) => (value || "").trim();
const normalizeText = (value) => String(value || "").trim();
const normalizeHeader = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const mapLeadInclude = {
  assignee: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
};

const findDuplicatePhone = async (
  phonePrimary,
  companyId,
  excludeLeadId = null,
) => {
  const where = {
    phonePrimary: normalizePhone(phonePrimary),
    isActive: true,
  };

  if (companyId) where.companyId = companyId;

  if (excludeLeadId) {
    where.NOT = { id: excludeLeadId };
  }

  return prisma.lead.findFirst({ where, select: { id: true } });
};

const getAssignableUsers = async (companyId) => {
  return prisma.user.findMany({
    where: {
      isActive: true,
      companyId,
      role: { code: { in: AGENT_ROLE_CODES } },
    },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
};

const getRoundRobinAssignee = async (companyId) => {
  const candidates = await getAssignableUsers(companyId);

  if (!candidates.length) {
    throw new AppError(
      "No active users available for round-robin assignment",
      400,
    );
  }

  const lastAssignedLead = await prisma.lead.findFirst({
    where: {
      isActive: true,
      companyId,
      assignedTo: { not: null },
    },
    select: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  if (!lastAssignedLead?.assignedTo) {
    return candidates[0].id;
  }

  const currentIndex = candidates.findIndex(
    (item) => item.id === lastAssignedLead.assignedTo,
  );
  if (currentIndex === -1 || currentIndex === candidates.length - 1) {
    return candidates[0].id;
  }

  return candidates[currentIndex + 1].id;
};

const createRoundRobinAllocator = async (companyId) => {
  const candidates = await getAssignableUsers(companyId);
  if (!candidates.length) {
    throw new AppError(
      "No active agents available for round-robin assignment",
      400,
    );
  }

  const candidateIds = candidates.map((c) => c.id);
  const lastAssignedLead = await prisma.lead.findFirst({
    where: {
      isActive: true,
      companyId,
      assignedTo: { in: candidateIds },
    },
    select: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  let nextIndex = 0;
  if (lastAssignedLead?.assignedTo) {
    const currentIndex = candidates.findIndex(
      (item) => item.id === lastAssignedLead.assignedTo,
    );
    if (currentIndex >= 0) {
      nextIndex = (currentIndex + 1) % candidates.length;
    }
  }

  return {
    next: () => {
      const selected = candidates[nextIndex].id;
      nextIndex = (nextIndex + 1) % candidates.length;
      return selected;
    },
  };
};

const resolveAssignee = async ({
  assignmentMode = "none",
  assignedTo,
  companyId,
}) => {
  if (assignmentMode === "none") return null;

  if (assignmentMode === "manual") {
    if (!assignedTo) {
      throw new AppError("assignedTo is required for manual assignment", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: assignedTo,
        isActive: true,
        companyId,
        role: { code: { in: AGENT_ROLE_CODES } },
      },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("Assigned user must be an active agent", 400);
    }

    return user.id;
  }

  if (assignmentMode === "round_robin") {
    return getRoundRobinAssignee(companyId);
  }

  throw new AppError("Invalid assignment mode", 400);
};

const hasQueryFilter = (query = {}, keys = []) => {
  if (query.hasFilter !== undefined) return Boolean(query.hasFilter);

  return keys.some((key) => {
    const value = query[key];
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "";
  });
};

const toRowModel = (row, rowNumber) => {
  const rowMap = {};
  for (const [key, value] of Object.entries(row || {})) {
    rowMap[normalizeHeader(key)] = normalizeText(value);
  }

  const getValue = (...aliases) => {
    for (const alias of aliases) {
      const key = normalizeHeader(alias);
      if (rowMap[key] !== undefined) return rowMap[key];
    }
    return "";
  };

  const phonePrimary = normalizePhone(
    getValue("phonePrimary", "phone", "primaryPhone"),
  );
  if (!phonePrimary) {
    throw new AppError(`Row ${rowNumber}: phonePrimary is required`, 400);
  }

  const stageRaw = normalizeText(getValue("stage")).toLowerCase();
  const stage = stageRaw ? stageRaw.replace(/\s+/g, "_") : "new";
  if (!LEAD_STAGE_VALUES.has(stage)) {
    throw new AppError(`Row ${rowNumber}: invalid stage "${stageRaw}"`, 400);
  }

  const priorityRaw = getValue("priority");
  const priorityParsed = priorityRaw ? Number(priorityRaw) : 3;
  const priority = Number.isInteger(priorityParsed) ? priorityParsed : NaN;
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
    throw new AppError(
      `Row ${rowNumber}: priority must be an integer between 1 and 5`,
      400,
    );
  }

  return {
    rowNumber,
    firstName: normalizeText(getValue("firstName")) || null,
    lastName: normalizeText(getValue("lastName")) || null,
    phonePrimary,
    phoneAlternate: normalizePhone(getValue("phoneAlternate")) || null,
    email: normalizeText(getValue("email")) || null,
    source: normalizeText(getValue("source")) || null,
    city: normalizeText(getValue("city")) || null,
    stage,
    priority,
    notes: normalizeText(getValue("notes")) || null,
  };
};

const parseLeadImportFile = (file) => {
  if (!file?.buffer?.length) {
    throw new AppError("Excel file is required", 400);
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new AppError("Uploaded file does not contain any sheet", 400);
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rows.length) {
    throw new AppError("Uploaded file is empty", 400);
  }

  return rows;
};

const listLeads = async (query, companyId) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = { isActive: true, companyId };

  if (query.stage) where.stage = query.stage;
  if (query.assignedTo) where.assignedTo = query.assignedTo;
  if (query.source) where.source = query.source;

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      const fromDate = toRangeStart(query.from);
      if (fromDate) where.createdAt.gte = fromDate;
    }
    if (query.to) {
      const toDate = toRangeEnd(query.to);
      if (toDate) where.createdAt.lte = toDate;
    }
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { phonePrimary: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: mapLeadInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    hasFilter: hasQueryFilter(query, ["search", "stage", "assignedTo", "source", "from", "to"]),
  };
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const toRangeStart = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const toRangeEnd = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const listAgentQueue = async ({ query = {}, companyId, userId }) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = {
    companyId,
    isActive: true,
    assignedTo: userId,
    stage: { in: ["new", "attempted", "connected", "follow_up"] },
    OR: [
      { lastCalledAt: null },
      { lastCalledAt: { lt: startOfToday() } },
      {
        calls: {
          some: {
            createdAt: { gte: startOfToday() },
            disposition: "no_answer",
          },
        },
      },
    ],
  };

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      const fromDate = toRangeStart(query.from);
      if (fromDate) where.createdAt.gte = fromDate;
    }
    if (query.to) {
      const toDate = toRangeEnd(query.to);
      if (toDate) where.createdAt.lte = toDate;
    }
    if (!Object.keys(where.createdAt).length) {
      delete where.createdAt;
    }
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: mapLeadInclude,
      orderBy: [{ createdAt: "asc" }, { priority: "asc" }],
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    hasFilter: hasQueryFilter(query, ["from", "to"]),
  };
};

const getLeadById = async (id, companyId) => {
  const lead = await prisma.lead.findFirst({
    where: { id, isActive: true, companyId },
    include: {
      ...mapLeadInclude,
      calls: {
        include: {
          agent: {
            select: {
              id: true,
              fullName: true,
            },
          },
          recording: {
            select: {
              id: true,
              fileName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  return lead;
};

const searchByPhone = async (phone, companyId) => {
  if (!phone) throw new AppError("Phone number is required", 400);

  const lead = await prisma.lead.findFirst({
    where: {
      phonePrimary: phone,
      isActive: true,
      companyId,
    },
    include: mapLeadInclude,
  });

  return lead; // Returns null if not found
};

const createLead = async (payload, currentUserId = null, companyId) => {
  const duplicate = await findDuplicatePhone(payload.phonePrimary, companyId);
  if (duplicate) {
    throw new AppError("Lead with this phone number already exists", 409);
  }

  const assigneeId = await resolveAssignee({
    assignmentMode: payload.assignmentMode || "none",
    assignedTo: payload.assignedTo,
    companyId,
  });

  return prisma.lead.create({
    data: {
      companyId,
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      phonePrimary: normalizePhone(payload.phonePrimary),
      phoneAlternate: payload.phoneAlternate || null,
      email: payload.email || null,
      source: payload.source || null,
      city: payload.city || null,
      stage: payload.stage || "new",
      priority: payload.priority || 3,
      notes: payload.notes || null,
      assignedTo: assigneeId,
      createdBy: currentUserId || null,
    },
    include: mapLeadInclude,
  });
};

const updateLead = async (id, payload, companyId) => {
  const existing = await prisma.lead.findFirst({
    where: { id, isActive: true, companyId },
    select: { id: true, phonePrimary: true },
  });

  if (!existing) {
    throw new AppError("Lead not found", 404);
  }

  if (
    payload.phonePrimary &&
    normalizePhone(payload.phonePrimary) !== existing.phonePrimary
  ) {
    const duplicate = await findDuplicatePhone(
      payload.phonePrimary,
      companyId,
      id,
    );
    if (duplicate) {
      throw new AppError("Lead with this phone number already exists", 409);
    }
  }

  let assigneeId;
  if (payload.assignmentMode) {
    assigneeId = await resolveAssignee({
      assignmentMode: payload.assignmentMode,
      assignedTo: payload.assignedTo || null,
      companyId,
    });
  }

  const data = {};

  if (payload.firstName !== undefined)
    data.firstName = payload.firstName || null;
  if (payload.lastName !== undefined) data.lastName = payload.lastName || null;
  if (payload.phonePrimary !== undefined)
    data.phonePrimary = normalizePhone(payload.phonePrimary);
  if (payload.phoneAlternate !== undefined)
    data.phoneAlternate = payload.phoneAlternate || null;
  if (payload.email !== undefined) data.email = payload.email || null;
  if (payload.source !== undefined) data.source = payload.source || null;
  if (payload.city !== undefined) data.city = payload.city || null;
  if (payload.stage !== undefined) data.stage = payload.stage;
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.notes !== undefined) data.notes = payload.notes || null;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.assignmentMode !== undefined) data.assignedTo = assigneeId;

  return prisma.lead.update({
    where: { id },
    data,
    include: mapLeadInclude,
  });
};

const deleteLead = async (id, companyId) => {
  const existing = await prisma.lead.findFirst({
    where: { id, isActive: true, companyId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Lead not found", 404);
  }

  return prisma.lead.update({
    where: { id },
    data: { isActive: false },
  });
};

const importLeadsExcel = async ({ file, companyId, currentUserId = null }) => {
  const rows = parseLeadImportFile(file);
  const allocator = await createRoundRobinAllocator(companyId);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const importedLeadIds = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2; // + header row
    try {
      const row = toRowModel(rows[index], rowNumber);
      const assignedTo = allocator.next();
      const existing = await prisma.lead.findFirst({
        where: {
          companyId,
          isActive: true,
          phonePrimary: row.phonePrimary,
        },
        select: { id: true },
      });

      if (existing) {
        const updatedLead = await prisma.lead.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            phoneAlternate: row.phoneAlternate,
            email: row.email,
            source: row.source,
            city: row.city,
            stage: row.stage,
            priority: row.priority,
            notes: row.notes,
            assignedTo,
          },
          select: { id: true },
        });
        importedLeadIds.push(updatedLead.id);
        updated += 1;
      } else {
        const createdLead = await prisma.lead.create({
          data: {
            companyId,
            firstName: row.firstName,
            lastName: row.lastName,
            phonePrimary: row.phonePrimary,
            phoneAlternate: row.phoneAlternate,
            email: row.email,
            source: row.source,
            city: row.city,
            stage: row.stage,
            priority: row.priority,
            notes: row.notes,
            assignedTo,
            createdBy: currentUserId || null,
          },
          select: { id: true },
        });
        importedLeadIds.push(createdLead.id);
        created += 1;
      }
    } catch (error) {
      skipped += 1;
      errors.push({
        row: rowNumber,
        message: error?.message || "Invalid row",
      });
    }
  }

  return {
    totalRows: rows.length,
    created,
    updated,
    skipped,
    errors,
    importedLeadIds,
    templateColumns: LEAD_IMPORT_TEMPLATE_COLUMNS,
  };
};

const assignImportedLeads = async ({
  companyId,
  leadIds,
  agentId,
  onlyUnassigned = true,
}) => {
  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      companyId,
      isActive: true,
      role: { code: { in: AGENT_ROLE_CODES } },
    },
    select: { id: true, fullName: true },
  });

  if (!agent) {
    throw new AppError(
      "Selected user is not an active agent in this company",
      400,
    );
  }

  const where = {
    id: { in: leadIds },
    companyId,
    isActive: true,
  };

  if (onlyUnassigned) {
    where.assignedTo = null;
  }

  const result = await prisma.lead.updateMany({
    where,
    data: { assignedTo: agent.id },
  });

  return {
    assignedCount: result.count || 0,
    requestedLeadCount: leadIds.length,
    agent: { id: agent.id, fullName: agent.fullName },
    onlyUnassigned,
  };
};

module.exports = {
  listLeads,
  listAgentQueue,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  importLeadsExcel,
  assignImportedLeads,
  searchByPhone,
  leadImportTemplateColumns: LEAD_IMPORT_TEMPLATE_COLUMNS,
};
