const callsService = require('./calls.service');

const startCall = async (req, res, next) => {
  try {
    const data = await callsService.startCall(req.body, req.user.id, req.user.companyId);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const applyDisposition = async (req, res, next) => {
  try {
    const data = await callsService.applyDisposition(req.params.id, req.body, req.user.id, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listCalls = async (req, res, next) => {
  try {
    const data = await callsService.listCalls(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getCallsSummary = async (req, res, next) => {
  try {
    const data = await callsService.getCallsSummary(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startCall,
  applyDisposition,
  listCalls,
  getCallsSummary,
};

