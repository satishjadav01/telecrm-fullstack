const reportsService = require('./reports.service');

const getAgentPerformance = async (req, res, next) => {
  try {
    const data = await reportsService.getAgentPerformance(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getConversionFunnel = async (req, res, next) => {
  try {
    const data = await reportsService.getConversionFunnel(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getFilterOptions = async (req, res, next) => {
  try {
    const data = await reportsService.getFilterOptions(req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getCalendarData = async (req, res, next) => {
  try {
    const data = await reportsService.getCalendarData(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getDashboardSummary = async (req, res, next) => {
  try {
    const data = await reportsService.getDashboardSummary(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAgentPerformance,
  getConversionFunnel,
  getFilterOptions,
  getCalendarData,
  getDashboardSummary,
};

