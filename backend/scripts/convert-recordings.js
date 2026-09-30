
// // // const fs = require('fs');
// // // const path = require('path');
// // // const ffmpeg = require('fluent-ffmpeg');
// // // const { PrismaClient } = require('@prisma/client');
// // // const prisma = new PrismaClient();

// // // const transcodeToMp3 = (inputPath, outputPath) => {
// // //   return new Promise((resolve, reject) => {
// // //     ffmpeg(inputPath)
// // //       .toFormat('mp3')
// // //       .on('end', () => resolve(outputPath))
// // //       .on('error', (err) => reject(err))
// // //       .save(outputPath);
// // //   });
// // // };

// // // async function convertRecordings() {
// // //   console.log('Starting conversion of existing recordings to MP3...');
  
// // //   const recordings = await prisma.callRecording.findMany();
// // //   let convertedCount = 0;
// // //   let skippedCount = 0;
// // //   let errorCount = 0;

// // //   for (const recording of recordings) {
// // //     const isMp3 = recording.format === 'mp3' || 
// // //                   recording.mimeType === 'audio/mpeg' || 
// // //                   recording.mimeType === 'audio/mp3';

// // //     if (isMp3) {
// // //       skippedCount++;
// // //       continue;
// // //     }

// // //     const absolutePath = path.resolve(process.cwd(), recording.filePath);
    
// // //     if (!fs.existsSync(absolutePath)) {
// // //       console.warn(`File not found for recording ${recording.id}, skipping.`);
// // //       errorCount++;
// // //       continue;
// // //     }

// // //     try {
// // //       const parsedPath = path.parse(absolutePath);
// // //       const newFileName = `${parsedPath.name}.mp3`;
// // //       const newFilePath = path.join(parsedPath.dir, newFileName);
      
// // //       console.log(`Converting ${recording.fileName} to ${newFileName}...`);
      
// // //       await transcodeToMp3(absolutePath, newFilePath);
      
// // //       const newRelativePath = path.relative(process.cwd(), newFilePath).replaceAll('\\', '/');
// // //       const stat = fs.statSync(newFilePath);
      
// // //       await prisma.callRecording.update({
// // //         where: { id: recording.id },
// // //         data: {
// // //           filePath: newRelativePath,
// // //           fileName: newFileName,
// // //           mimeType: 'audio/mpeg',
// // //           fileSizeBytes: BigInt(stat.size),
// // //           format: 'mp3'
// // //         }
// // //       });
      
// // //       console.log(`Successfully converted ${recording.id}`);
// // //       convertedCount++;
// // //     } catch (err) {
// // //       console.error(`Failed to convert ${recording.id}:`, err);
// // //       errorCount++;
// // //     }
// // //   }

// // //   console.log('--- Conversion Summary ---');
// // //   console.log(`Converted: ${convertedCount}`);
// // //   console.log(`Skipped (already MP3): ${skippedCount}`);
// // //   console.log(`Errors: ${errorCount}`);
  
// // //   await prisma.$disconnect();
// // // }

// // // convertRecordings().catch(err => {
// // //   console.error('Fatal error during conversion:', err);
// // //   process.exit(1);
// // // });



// // const fs = require('fs');
// // const path = require('path');
// // const ffmpeg = require('fluent-ffmpeg');
// // const { PrismaClient } = require('@prisma/client');
// // const prisma = new PrismaClient();

// // const transcodeToMp3 = (inputPath, outputPath) => {
// //   return new Promise((resolve, reject) => {
// //     ffmpeg(inputPath)
// //       .toFormat('mp3')
// //       .on('end', () => resolve(outputPath))
// //       .on('error', (err) => reject(err))
// //       .save(outputPath);
// //   });
// // };

// // async function convertRecordings() {
// //   console.log('Starting conversion of existing recordings to MP3...');
  
// //   const recordings = await prisma.callRecording.findMany();
// //   let convertedCount = 0;
// //   let skippedCount = 0;
// //   let errorCount = 0;

// //   for (const recording of recordings) {
// //     const isMp3 = recording.format === 'mp3' || 
// //                   recording.mimeType === 'audio/mpeg' || 
// //                   recording.mimeType === 'audio/mp3';

// //     if (isMp3) {
// //       skippedCount++;
// //       continue;
// //     }

// //     let absolutePath = path.resolve(process.cwd(), recording.filePath);
// //     let finalFormat = recording.format;
// //     let finalFileName = recording.fileName;

// //     if (finalFormat === 'erm' || path.extname(absolutePath).toLowerCase() === '.erm') {
// //       try {
// //         const parsedPath = path.parse(absolutePath);
// //         const newAmrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);
// //         if (fs.existsSync(absolutePath)) {
// //           fs.renameSync(absolutePath, newAmrPath);
// //         }
// //         absolutePath = newAmrPath;
// //         finalFormat = 'amr';
// //         finalFileName = `${parsedPath.name}.amr`;
        
// //         const newRelativeAmrPath = path.relative(process.cwd(), newAmrPath).replaceAll('\\', '/');
// //         await prisma.callRecording.update({
// //           where: { id: recording.id },
// //           data: {
// //             filePath: newRelativeAmrPath,
// //             fileName: finalFileName,
// //             format: 'amr',
// //             mimeType: 'audio/amr'
// //           }
// //         });
// //         console.log(`Renamed recording ${recording.id} .erm to .amr on disk and updated database.`);
// //       } catch (renameError) {
// //         console.error(`Failed to rename existing .erm file to .amr for recording ${recording.id}:`, renameError);
// //       }
// //     }
    
// //     if (!fs.existsSync(absolutePath)) {
// //       console.warn(`File not found for recording ${recording.id}, skipping.`);
// //       errorCount++;
// //       continue;
// //     }

// //     try {
// //       const parsedPath = path.parse(absolutePath);
// //       const newFileName = `${parsedPath.name}.mp3`;
// //       const newFilePath = path.join(parsedPath.dir, newFileName);
      
// //       console.log(`Converting ${recording.fileName} to ${newFileName}...`);
      
// //       await transcodeToMp3(absolutePath, newFilePath);
      
// //       const newRelativePath = path.relative(process.cwd(), newFilePath).replaceAll('\\', '/');
// //       const stat = fs.statSync(newFilePath);
      
// //       await prisma.callRecording.update({
// //         where: { id: recording.id },
// //         data: {
// //           filePath: newRelativePath,
// //           fileName: newFileName,
// //           mimeType: 'audio/mpeg',
// //           fileSizeBytes: BigInt(stat.size),
// //           format: 'mp3'
// //         }
// //       });
      
// //       console.log(`Successfully converted ${recording.id}`);
// //       convertedCount++;
// //     } catch (err) {
// //       console.error(`Failed to convert ${recording.id}:`, err);
// //       errorCount++;
// //     }
// //   }

// //   console.log('--- Conversion Summary ---');
// //   console.log(`Converted: ${convertedCount}`);
// //   console.log(`Skipped (already MP3): ${skippedCount}`);
// //   console.log(`Errors: ${errorCount}`);
  
// //   await prisma.$disconnect();
// // }

// // convertRecordings().catch(err => {
// //   console.error('Fatal error during conversion:', err);
// //   process.exit(1);
// // });


// const fs = require("fs");
// const path = require("path");

// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");

// ffmpeg.setFfmpegPath(ffmpegPath);

// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// const transcodeToMp3 = (inputPath, outputPath) => {
//   return new Promise((resolve, reject) => {
//     ffmpeg(inputPath)
//       .toFormat("mp3")
//       .on("end", () => resolve(outputPath))
//       .on("error", (err) => reject(err))
//       .save(outputPath);
//   });
// };

// async function convertRecordings() {
//   console.log("Starting conversion of existing recordings to MP3...");

//   const recordings = await prisma.callRecording.findMany();
//   let convertedCount = 0;
//   let skippedCount = 0;
//   let errorCount = 0;

//   for (const recording of recordings) {
//     const isMp3 =
//       recording.format === "mp3" ||
//       recording.mimeType === "audio/mpeg" ||
//       recording.mimeType === "audio/mp3";

//     if (isMp3) {
//       skippedCount++;
//       continue;
//     }

//     let absolutePath = path.resolve(process.cwd(), recording.filePath);
//     let finalFormat = recording.format;
//     let finalFileName = recording.fileName;

//     let isActuallyAmr = false;
//     try {
//       if (fs.existsSync(absolutePath)) {
//         const fd = fs.openSync(absolutePath, "r");
//         const buffer = Buffer.alloc(6);
//         fs.readSync(fd, buffer, 0, 6, 0);
//         fs.closeSync(fd);
//         isActuallyAmr = buffer.toString("ascii") === "#!AMR\n";
//       }
//     } catch (sigError) {
//       console.error(`Failed to read file signature for recording ${recording.id}:`, sigError);
//     }

//     if (
//       isActuallyAmr ||
//       finalFormat === "erm" ||
//       path.extname(absolutePath).toLowerCase() === ".erm"
//     ) {
//       if (path.extname(absolutePath).toLowerCase() !== ".amr") {
//         try {
//           const parsedPath = path.parse(absolutePath);
//           const newAmrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);
//           if (fs.existsSync(absolutePath)) {
//             fs.renameSync(absolutePath, newAmrPath);
//           }
//           absolutePath = newAmrPath;
//           finalFormat = "amr";
//           finalFileName = `${parsedPath.name}.amr`;

//           const newRelativeAmrPath = path
//             .relative(process.cwd(), newAmrPath)
//             .replaceAll("\\", "/");
//           await prisma.callRecording.update({
//             where: { id: recording.id },
//             data: {
//               filePath: newRelativeAmrPath,
//               fileName: finalFileName,
//               format: "amr",
//               mimeType: "audio/amr",
//             },
//           });
//           console.log(
//             `Renamed recording ${recording.id} disguised AMR file to .amr on disk and updated database.`,
//           );
//         } catch (renameError) {
//           console.error(
//             `Failed to rename existing disguised AMR file to .amr for recording ${recording.id}:`,
//             renameError,
//           );
//         }
//       }
//     }

//     if (!fs.existsSync(absolutePath)) {
//       console.warn(`File not found for recording ${recording.id}, skipping.`);
//       errorCount++;
//       continue;
//     }

//     try {
//       const parsedPath = path.parse(absolutePath);
//       const newFileName = `${parsedPath.name}.mp3`;
//       const newFilePath = path.join(parsedPath.dir, newFileName);

//       console.log(`Converting ${recording.fileName} to ${newFileName}...`);

//       await transcodeToMp3(absolutePath, newFilePath);

//       const newRelativePath = path
//         .relative(process.cwd(), newFilePath)
//         .replaceAll("\\", "/");
//       const stat = fs.statSync(newFilePath);

//       await prisma.callRecording.update({
//         where: { id: recording.id },
//         data: {
//           filePath: newRelativePath,
//           fileName: newFileName,
//           mimeType: "audio/mpeg",
//           fileSizeBytes: BigInt(stat.size),
//           format: "mp3",
//         },
//       });

//       console.log(`Successfully converted ${recording.id}`);
//       convertedCount++;
//     } catch (err) {
//       console.error(`Failed to convert ${recording.id}:`, err);
//       errorCount++;
//     }
//   }

//   console.log("--- Conversion Summary ---");
//   console.log(`Converted: ${convertedCount}`);
//   console.log(`Skipped (already MP3): ${skippedCount}`);
//   console.log(`Errors: ${errorCount}`);

//   await prisma.$disconnect();
// }

// convertRecordings().catch((err) => {
//   console.error("Fatal error during conversion:", err);
//   process.exit(1);
// });




const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const prisma = require("../../config/db");
const AppError = require("../../core/errors/app-error");
const env = require("../../config/env");

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
  let finalFormat = path.extname(file.filename || "").replace(".", "").toLowerCase();

  console.log(`\n--- [Recording System] 📥 New Upload Received ---`);
  console.log(`[Recording System] Original name: "${file.originalname || "N/A"}"`);
  console.log(`[Recording System] Server temp path: "${file.path}"`);
  console.log(`[Recording System] Declared mimetype: "${file.mimetype}" | Extension: ".${finalFormat}"`);
  console.log(`[Recording System] Declared size: ${file.size} bytes`);

  // Smart Detection: Check if the file is an AMR file under the hood by reading its first 6 bytes
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
    console.error(`[Recording System] ❌ Failed to read file signature: ${sigError.message}`);
  }

  if (isActuallyAmr) {
    console.log(`[Recording System] 🔍 Signature Match: File starts with raw "#!AMR\\n" header! Genuine format is AMR.`);
  }

  if (isActuallyAmr || finalFormat === "erm" || finalFormat === "amr") {
    if (finalFormat !== "amr") {
      try {
        const parsedPath = path.parse(file.path);
        const newAmrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);
        
        console.log(`[Recording System] 📂 Disguised file detected! Renaming from "${file.path}" to "${newAmrPath}" so FFmpeg can decode it.`);
        fs.renameSync(file.path, newAmrPath);
        
        file.path = newAmrPath;
        finalFilePath = newAmrPath;
        finalFileName = `${parsedPath.name}.amr`;
        finalFormat = "amr";
        finalMimeType = "audio/amr";
        console.log(`[Recording System] ✅ Rename complete. New format set to AMR.`);
      } catch (renameError) {
        console.error(`[Recording System] ❌ Failed to rename disguised file to .amr:`, renameError);
      }
    }
  }

  const isMp3 = finalFormat === "mp3" || finalMimeType === "audio/mpeg" || finalMimeType === "audio/mp3";

  if (!isMp3) {
    try {
      const parsedPath = path.parse(file.path);
      const newFileName = `${parsedPath.name}.mp3`;
      const newFilePath = path.join(parsedPath.dir, newFileName);
      
      console.log(`[Recording System] ⚙️ Starting real-time transcoding to MP3:`);
      console.log(`[Recording System]   Source: "${file.path}"`);
      console.log(`[Recording System]   Target: "${newFilePath}"`);
      
      await transcodeToMp3(file.path, newFilePath);
      
      finalFilePath = newFilePath;
      finalFileName = newFileName;
      finalMimeType = "audio/mpeg";
      finalFormat = "mp3";
      console.log(`[Recording System] 🚀 SUCCESS: Successfully transcoded file to MP3! Path: "${newFilePath}"`);
    } catch (error) {
      console.error(`[Recording System] ❌ TRANSCODING FAILED! Falling back to saving the original file.`);
      console.error(`[Recording System] ❌ Error details:`, error);
      console.error(`[Recording System] 💡 TROUBLESHOOTING TIP: Ensure FFmpeg is installed and accessible in the system environment variables.`);
    }
  } else {
    console.log(`[Recording System] ℹ️ File is already in MP3 format. No transcoding needed.`);
  }
  console.log(`--- [Recording System] 📤 Processing Complete ---\n`);

  const relativePath = path
    .relative(process.cwd(), finalFilePath)
    .replaceAll("\\", "/");

  let finalSize = file.size;
  try {
    const stat = fs.statSync(finalFilePath);
    finalSize = stat.size;
  } catch (e) {}

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
  });

  return serializeRecording(recording);
};

const getCallRecording = async (callId, companyId) => {
  const recording = await prisma.callRecording.findFirst({
    where: { callId, companyId },
    include: {
      call: { select: { durationSeconds: true } },
    },
  });

  if (!recording) {
    throw new AppError("Recording not found for this call", 404);
  }

  return serializeRecording(recording);
};

const listLeadRecordings = async (leadId, companyId) => {
  const recordings = await prisma.callRecording.findMany({
    where: { leadId, companyId },
    orderBy: { createdAt: "desc" },
    include: {
      call: { select: { durationSeconds: true } },
      agent: { select: { id: true, fullName: true } },
    },
  });

  return recordings.map(serializeRecording);
};

const listAgentRecordings = async (agentId, companyId) => {
  const recordings = await prisma.callRecording.findMany({
    where: { agentId, companyId },
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phonePrimary: true,
        },
      },
      call: { select: { durationSeconds: true } },
    },
  });

  return recordings.map(serializeRecording);
};

const resolveRecordingFileForStreaming = async ({ callId, requester }) => {
  if (!requester?.id) throw new AppError("Unauthorized", 401);
  if (!requester.companyId && requester.role !== "super_admin") {
    throw new AppError("Company not set for this user", 403);
  }

  const recording = await prisma.callRecording.findFirst({
    where: { callId, companyId: requester.companyId || undefined },
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

  const role = requester.role || null;
  const isPrivileged =
    role === "admin" || role === "manager" || role === "team_lead";
  const isOwnerAgent = recording.agentId && recording.agentId === requester.id;

  if (!isPrivileged && !isOwnerAgent) {
    throw new AppError("Forbidden: insufficient role", 403);
  }

  // Prevent path traversal: only allow streaming files within the configured uploads directory.
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
  listLeadRecordings,
  listAgentRecordings,
  resolveRecordingFileForStreaming,
};
