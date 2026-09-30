const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { PrismaClient } = require("@prisma/client");

ffmpeg.setFfmpegPath(ffmpegPath);
const prisma = new PrismaClient();

const transcodeToMp3 = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
};

async function fix() {
  console.log("Scanning recordings for AMR files disguised as M4A...");
  const recordings = await prisma.callRecording.findMany();
  let fixedCount = 0;

  for (const rec of recordings) {
    let absolutePath = path.resolve(process.cwd(), rec.filePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    // Check signature
    let isAmr = false;
    try {
      const fd = fs.openSync(absolutePath, "r");
      const buf = Buffer.alloc(6);
      fs.readSync(fd, buf, 0, 6, 0);
      fs.closeSync(fd);
      isAmr = buf.toString("ascii") === "#!AMR\n";
    } catch (e) {
      console.log(`Failed to read signature for ${rec.filePath}: ${e.message}`);
    }

    if (isAmr) {
      console.log(`Found AMR file disguised as ${rec.filePath}`);

      try {
        const parsedPath = path.parse(absolutePath);
        const amrPath = path.join(parsedPath.dir, `${parsedPath.name}.amr`);

        if (absolutePath !== amrPath) {
          fs.renameSync(absolutePath, amrPath);
          console.log(`Renamed to ${amrPath}`);
          absolutePath = amrPath;
        }

        const mp3Path = path.join(parsedPath.dir, `${parsedPath.name}.mp3`);
        console.log(`Transcoding to ${mp3Path}...`);
        await transcodeToMp3(absolutePath, mp3Path);
        console.log(`Transcoding complete.`);

        const relativeMp3Path = path
          .relative(process.cwd(), mp3Path)
          .replaceAll("\\", "/");
        const stat = fs.statSync(mp3Path);

        await prisma.callRecording.update({
          where: { id: rec.id },
          data: {
            filePath: relativeMp3Path,
            fileName: `${parsedPath.name}.mp3`,
            mimeType: "audio/mpeg",
            format: "mp3",
            fileSizeBytes: BigInt(stat.size),
          },
        });
        console.log(`Updated database record for ${rec.id}`);
        fixedCount++;
      } catch (err) {
        console.error(`Error processing ${rec.filePath}:`, err);
      }
    }
  }

  console.log(`Finished. Fixed ${fixedCount} files.`);
  await prisma.$disconnect();
}

fix();
