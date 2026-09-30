const fs = require('fs');

const recordingsService = require('./recordings.service');

const uploadRecording = async (req, res, next) => {
  try {
    const data = await recordingsService.upsertCallRecording({
      callId: req.params.id,
      userId: req.user.id,
      companyId: req.user.companyId,
      file: req.file,
      body: req.body,
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const getCallRecording = async (req, res, next) => {
  try {
    const data = await recordingsService.getCallRecording(req.params.id, req.user);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listRecordings = async (req, res, next) => {
  try {
    const data = await recordingsService.listRecordings(req.user, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listLeadRecordings = async (req, res, next) => {
  try {
    const data = await recordingsService.listLeadRecordings(req.params.id, req.user);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listAgentRecordings = async (req, res, next) => {
  try {
    const data = await recordingsService.listAgentRecordings(req.params.id, req.user, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const streamCallRecording = async (req, res, next) => {
  try {
    const { absolutePath, size, mimeType } = await recordingsService.resolveRecordingFileForStreaming({
      callId: req.params.id,
      requester: req.user,
    });

    const range = req.headers.range;
    if (!range) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', String(size));
      res.setHeader('Accept-Ranges', 'bytes');
      fs.createReadStream(absolutePath).pipe(res);
      return;
    }

    const match = String(range).match(/bytes=(\d+)-(\d+)?/);
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return;
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', String(chunkSize));
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);

    fs.createReadStream(absolutePath, { start, end }).pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadRecording,
  getCallRecording,
  listRecordings,
  listLeadRecordings,
  listAgentRecordings,
  streamCallRecording,
};