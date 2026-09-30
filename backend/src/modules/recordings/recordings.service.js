const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const prisma = require("../../config/db");
const AppError = require("../../core/errors/app-error");
const env = require("../../config/env");

const MANAGEMENT_ROLES = new Set([
  "admin",
  "manager",
  "team_lead",
  "super_admin",
]);

const transcodeToMp3 = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
};

const serializeRecording = (recording) => {
  if (!recording) return recording;
  return {
    ...recording,
    fileSizeBytes:
      typeof recording.fileSizeBytes === "bigint"
        ? recording.fileSizeBytes.toString()
        : recording.fileSizeBytes,
  };
};

const recordingInclude = {
  lead: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phonePrimary: true,
      stage: true,
    },
  },
  agent: {
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
  call: {
    select: {
      id: true,
      direction: true,
      disposition: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      createdAt: true,
    },
  },
};

const resolveCompanyFilter = (requester) => {
  if (!requester) return null;
  if (requester.role === "super_admin") return undefined;
  return requester.companyId || null;
};

const requireRequester = (requester) => {
  if (!requester?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const companyId = resolveCompanyFilter(requester);
  if (companyId === null) {
    throw new AppError("Company not set for this user", 403);
  }

  return companyId;
};

const hasQueryFilter = (query = {}, keys = []) => {
  if (query.hasFilter !== undefined) return Boolean(query.hasFilter);

  return keys.some((key) => {
    const value = query[key];
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "";
  });
};

const parseSearchDateRange = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^[0-9]+$/.test(trimmed)) return null;
  if (!/[-\/\.:T\s]/.test(trimmed) && !/[a-z]/i.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const hasTime = /\d{1,2}:\d{2}/.test(trimmed) || /t/i.test(trimmed);
  const start = new Date(parsed);
  const end = new Date(parsed);

  if (hasTime) {
    end.setMilliseconds(end.getMilliseconds() + 999);
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

const parseSearchDuration = (value) => {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  const hhmmss = text.match(/^([0-9]+):([0-5]?[0-9])(?::([0-5]?[0-9]))?$/);
  if (hhmmss) {
    const hours = Number(hhmmss[1]);
    const minutes = Number(hhmmss[2]);
    const seconds = Number(hhmmss[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*(h|m|s)$/);
  if (!match) return null;
  const valueNum = Number(match[1]);
  if (!Number.isFinite(valueNum)) return null;

  const unit = match[2];
  if (unit === "h") return Math.round(valueNum * 3600);
  if (unit === "m") return Math.round(valueNum * 60);
  return Math.round(valueNum);
};

const parseSearchSize = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)\s*(b|kb|mb|gb)$/i);
  if (!match) return null;
  const sizeValue = Number(match[1]);
  if (!Number.isFinite(sizeValue)) return null;

  const unit = String(match[2]).toLowerCase();
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return BigInt(Math.round(sizeValue * (multipliers[unit] || 1)));
};

const buildScopedWhere = ({ requester, query = {}, forceAgentId }) => {
  const companyId = requireRequester(requester);
  const where = {};

  if (companyId !== undefined) where.companyId = companyId;
  if (forceAgentId) where.agentId = forceAgentId;
  else if (query.agentId) where.agentId = query.agentId;
  if (query.leadId) where.leadId = query.leadId;
  if (query.source) where.lead = { source: query.source };

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  if (query.search) {
    const q = String(query.search).trim();
    if (q) {
      const isPhoneQuery = /^\+?[0-9\s\-().]+$/.test(q);
      const digitsOnly = q.replace(/\D/g, "");
      const searchFilters = [];

      if (isPhoneQuery && digitsOnly.length >= 4) {
        searchFilters.push(
          {
            lead: {
              phonePrimary: { contains: digitsOnly, mode: "insensitive" },
            },
          },
          { agent: { phone: { contains: digitsOnly, mode: "insensitive" } } },
        );
      } else {
        searchFilters.push(
          { lead: { firstName: { contains: q, mode: "insensitive" } } },
          { lead: { lastName: { contains: q, mode: "insensitive" } } },
          { lead: { phonePrimary: { contains: q, mode: "insensitive" } } },
          { agent: { fullName: { contains: q, mode: "insensitive" } } },
          { agent: { email: { contains: q, mode: "insensitive" } } },
          { agent: { phone: { contains: q, mode: "insensitive" } } },
          { fileName: { contains: q, mode: "insensitive" } },
          { mimeType: { contains: q, mode: "insensitive" } },
        );

        const words = q.split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
          searchFilters.push({
            lead: {
              AND: [
                { firstName: { contains: words[0], mode: "insensitive" } },
                {
                  lastName: {
                    contains: words[words.length - 1],
                    mode: "insensitive",
                  },
                },
              ],
            },
          });
        }

        const dateRange = parseSearchDateRange(q);
        if (dateRange) {
          searchFilters.push({
            createdAt: { gte: dateRange.start, lte: dateRange.end },
          });
        }

        const durationSeconds = parseSearchDuration(q);
        if (durationSeconds !== null) {
          searchFilters.push(
            { durationSeconds },
            { call: { durationSeconds } },
          );
        }

        const fileSizeBytes = parseSearchSize(q);
        if (fileSizeBytes !== null) {
          searchFilters.push({ fileSizeBytes });
        }
      }

      if (searchFilters.length) {
        where.OR = searchFilters;
      }
    }
  }

  return where;
};

const upsertCallRecording = async ({
  callId,
  userId,
  companyId,
  file,
  body = {},
}) => {
  const call = await prisma.call.findFirst({
    where: { id: callId, companyId },
    select: { id: true, leadId: true, agentId: true },
  });

  if (!call) throw new AppError("Call not found", 404);
  if (!file) throw new AppError("Recording file is required", 400);

  let finalFilePath = file.path;
  let finalFileName = file.filename;
  let finalMimeType = file.mimetype;
  let finalFormat = path
    .extname(file.filename || "")
    .replace(".", "")
    .toLowerCase();

  let isActuallyAmr = false;
  try {
    if (fs.existsSync(file.path)) {
      const fd = fs.openSync(file.path, "r");
      const buffer = Buffer.alloc(6);
      fs.readSync(fd, buffer, 0, 6, 0);
      fs.closeSync(fd);
      isActuallyAmr = buffer.toString("ascii") === "#!AMR\n";
    }
  } catch (sigError) {
    console.error("Failed to read file signature:", sigError);
  }

  if (isActuallyAmr || finalFormat === "erm" || finalFormat === "amr") {
    if (finalFormat !== "amr") {
      try {
        const parsedPath = path.parse(file.path);
        const newAmrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);
        fs.renameSync(file.path, newAmrPath);

        file.path = newAmrPath;
        finalFilePath = newAmrPath;
        finalFileName = `${parsedPath.name}.amr`;
        finalFormat = "amr";
        finalMimeType = "audio/amr";
      } catch (renameError) {
        console.error(
          "Failed to rename disguised AMR file to .amr:",
          renameError,
        );
      }
    }
  }

  const isMp3 =
    finalFormat === "mp3" ||
    finalMimeType === "audio/mpeg" ||
    finalMimeType === "audio/mp3";

  if (!isMp3) {
    try {
      const parsedPath = path.parse(file.path);
      const newFileName = `${parsedPath.name}.mp3`;
      const newFilePath = path.join(parsedPath.dir, newFileName);

      await transcodeToMp3(file.path, newFilePath);

      finalFilePath = newFilePath;
      finalFileName = newFileName;
      finalMimeType = "audio/mpeg";
      finalFormat = "mp3";
    } catch (error) {
      console.error(
        "Transcoding failed, falling back to original file:",
        error,
      );
    }
  }

  const relativePath = path
    .relative(process.cwd(), finalFilePath)
    .replaceAll("\\", "/");

  let finalSize = file.size;
  try {
    const stat = fs.statSync(finalFilePath);
    finalSize = stat.size;
  } catch (_) {
    // Keep multer's size when the filesystem stat is unavailable.
  }

  const data = {
    callId,
    companyId,
    leadId: call.leadId,
    agentId: call.agentId || userId,
    filePath: relativePath,
    fileName: finalFileName,
    mimeType: finalMimeType,
    fileSizeBytes: BigInt(finalSize),
    format: finalFormat,
    durationSeconds: body.durationSeconds ? Number(body.durationSeconds) : null,
    languageCode: body.languageCode || null,
    channel: body.channel || "mono",
    consentCaptured:
      body.consentCaptured === true || body.consentCaptured === "true" || false,
  };

  const recording = await prisma.callRecording.upsert({
    where: { callId },
    update: data,
    create: data,
    include: recordingInclude,
  });

  return serializeRecording(recording);
};

const getCallRecording = async (callId, requester) => {
  const where = buildScopedWhere({ requester });
  where.callId = callId;

  const recording = await prisma.callRecording.findFirst({
    where,
    include: recordingInclude,
  });

  if (!recording) {
    throw new AppError("Recording not found for this call", 404);
  }

  return serializeRecording(recording);
};

const listRecordings = async (requester, query = {}) => {
  if (!MANAGEMENT_ROLES.has(requester?.role)) {
    throw new AppError("Forbidden: insufficient role", 403);
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 50);
  const skip = (page - 1) * limit;
  const where = buildScopedWhere({ requester, query });

  const [items, total] = await Promise.all([
    prisma.callRecording.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: recordingInclude,
      skip,
      take: limit,
    }),
    prisma.callRecording.count({ where }),
  ]);

  return {
    items: items.map(serializeRecording),
    total,
    page,
    limit,
    hasFilter: hasQueryFilter(query, ["agentId", "leadId", "source", "from", "to", "search"]),
  };
};

const listLeadRecordings = async (leadId, requester) => {
  const where = buildScopedWhere({ requester });
  where.leadId = leadId;

  const recordings = await prisma.callRecording.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: recordingInclude,
  });

  return recordings.map(serializeRecording);
};

const listAgentRecordings = async (agentId, requester, query = {}) => {
  const isSelf = requester?.id === agentId;

  if (!MANAGEMENT_ROLES.has(requester?.role) && !isSelf) {
    throw new AppError("Forbidden: insufficient role", 403);
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 15);
  const skip = (page - 1) * limit;
  const where = buildScopedWhere({ requester, forceAgentId: agentId, query });

  const [items, total] = await Promise.all([
    prisma.callRecording.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: recordingInclude,
      skip,
      take: limit,
    }),
    prisma.callRecording.count({ where }),
  ]);

  return {
    items: items.map(serializeRecording),
    total,
    page,
    limit,
    hasFilter: hasQueryFilter(query, ["leadId", "source", "from", "to", "search"]),
  };
};

const resolveRecordingFileForStreaming = async ({ callId, requester }) => {
  const where = buildScopedWhere({ requester });
  where.callId = callId;

  const recording = await prisma.callRecording.findFirst({
    where,
    select: {
      id: true,
      callId: true,
      agentId: true,
      filePath: true,
      mimeType: true,
      fileName: true,
      fileSizeBytes: true,
      createdAt: true,
    },
  });

  if (!recording) {
    throw new AppError("Recording not found for this call", 404);
  }

  const isOwnerAgent = recording.agentId && recording.agentId === requester.id;

  if (!MANAGEMENT_ROLES.has(requester.role) && !isOwnerAgent) {
    throw new AppError("Forbidden: insufficient role", 403);
  }

  const uploadsBase = path.resolve(process.cwd(), env.uploadDir);
  const absolutePath = path.resolve(process.cwd(), recording.filePath);
  if (
    !absolutePath.startsWith(uploadsBase + path.sep) &&
    absolutePath !== uploadsBase
  ) {
    throw new AppError("Recording file path is invalid", 500);
  }

  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (_) {
    throw new AppError("Recording file is missing on server", 404);
  }

  if (!stat.isFile()) {
    throw new AppError("Recording file is not a file", 404);
  }

  let derivedMimeType = recording.mimeType || "application/octet-stream";
  if (derivedMimeType === "application/octet-stream") {
    const ext = path
      .extname(recording.fileName || recording.filePath || "")
      .toLowerCase();
    if (ext === ".mp3") derivedMimeType = "audio/mpeg";
    else if (ext === ".m4a") derivedMimeType = "audio/mp4";
    else if (ext === ".amr") derivedMimeType = "audio/amr";
    else if (ext === ".wav") derivedMimeType = "audio/wav";
    else if (ext === ".ogg") derivedMimeType = "audio/ogg";
    else if (ext === ".webm") derivedMimeType = "audio/webm";
    else derivedMimeType = "audio/mp3";
  }

  return {
    recording,
    absolutePath,
    size: stat.size,
    mimeType: derivedMimeType,
  };
};

module.exports = {
  upsertCallRecording,
  getCallRecording,
  listRecordings,
  listLeadRecordings,
  listAgentRecordings,
  resolveRecordingFileForStreaming,
};
