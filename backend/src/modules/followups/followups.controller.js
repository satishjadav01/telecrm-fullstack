const followupsService = require('./followups.service');

const listFollowUps = async (req, res, next) => {
  try {
    const data = await followupsService.listFollowUps(req.user.companyId, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listMyFollowUps = async (req, res, next) => {
  try {
    const data = await followupsService.listMyFollowUps(req.user.id, req.user.companyId, req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createFollowUp = async (req, res, next) => {
  try {
    const data = await followupsService.createFollowUp(req.body, req.user.id, req.user.companyId);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateFollowUp = async (req, res, next) => {
  try {
    const data = await followupsService.updateFollowUp(req.params.id, req.body, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFollowUps,
  listMyFollowUps,
  createFollowUp,
  updateFollowUp,
};