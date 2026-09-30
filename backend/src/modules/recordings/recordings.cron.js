const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

ffmpeg.setFfmpegPath(ffmpegPath);
const prisma = new PrismaClient();

const transcodeToMp3 = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

/**
 * Scans for non-MP3 recordings or disguised AMR files, and automatically transcodes them.
 */
async function autoConvertRecordings() {
  logger.info('Starting scheduled AMR/disguised recordings auto-conversion...');
  
  try {
    const recordings = await prisma.callRecording.findMany({
      where: {
        format: {
          not: 'mp3'
        }
      }
    });

    if (recordings.length === 0) {
      logger.info('No non-MP3 recordings found for conversion.');
      return;
    }

    logger.info(`Found ${recordings.length} potential recordings to inspect.`);
    let fixedCount = 0;

    for (const rec of recordings) {
      const absolutePath = path.resolve(process.cwd(), rec.filePath);
      
      if (!fs.existsSync(absolutePath)) {
        continue;
      }
      
      // Smart Signature Detection: Check if file starts with #!AMR\n
      let isAmr = false;
      try {
        const fd = fs.openSync(absolutePath, 'r');
        const buf = Buffer.alloc(6);
        fs.readSync(fd, buf, 0, 6, 0);
        fs.closeSync(fd);
        isAmr = buf.toString('ascii') === '#!AMR\n';
      } catch (e) {
        logger.error({ error: e.message, path: rec.filePath }, 'Failed to read file signature');
      }
      
      if (isAmr || rec.format === 'amr' || rec.format === 'erm') {
        try {
          const parsedPath = path.parse(absolutePath);
          let currentPath = absolutePath;

          // Rename disguised files to .amr so FFmpeg can handle decoding properly
          if (parsedPath.ext.toLowerCase() !== '.amr') {
            const amrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);
            fs.renameSync(absolutePath, amrPath);
            currentPath = amrPath;
            logger.info(`Renamed disguised AMR file to: ${amrPath}`);
          }
          
          const mp3Path = path.join(parsedPath.dir, `${parsedPath.name}.mp3`);
          logger.info(`Transcoding "${currentPath}" to "${mp3Path}"...`);
          
          await transcodeToMp3(currentPath, mp3Path);
          
          const relativeMp3Path = path.relative(process.cwd(), mp3Path).replaceAll('\\', '/');
          const stat = fs.statSync(mp3Path);
          
          await prisma.callRecording.update({
            where: { id: rec.id },
            data: {
              filePath: relativeMp3Path,
              fileName: `${parsedPath.name}.mp3`,
              mimeType: 'audio/mpeg',
              format: 'mp3',
              fileSizeBytes: BigInt(stat.size)
            }
          });

          logger.info(`Successfully auto-converted and updated recording ID: ${rec.id}`);
          fixedCount++;
        } catch (err) {
          logger.error({ error: err.message, recordingId: rec.id }, 'Failed to auto-convert recording');
        }
      }
    }
    
    logger.info(`Auto-conversion cycle completed. Converted ${fixedCount} files.`);
  } catch (err) {
    logger.error({ error: err.message }, 'Failed during auto-convert recordings job');
  }
}

/**
 * Initializes the recording auto-converter cron job.
 */
function initRecordingsCron() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    autoConvertRecordings();
  });

  logger.info('Recordings auto-converter cron initialized. Running initial scan...');
  autoConvertRecordings();
}

module.exports = {
  initRecordingsCron,
  autoConvertRecordings
};
