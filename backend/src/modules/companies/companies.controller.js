const companiesService = require('./companies.service');

const listCompanies = async (req, res, next) => {
  try {
    const data = await companiesService.listCompanies(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const data = await companiesService.createCompany(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const data = await companiesService.updateCompany(req.params.companyId, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createCompanyAdmin = async (req, res, next) => {
  try {
    const data = await companiesService.createCompanyAdmin(req.params.companyId, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const getMyCompanySettings = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const data = await companiesService.getCompanySettings(companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const updateMyCompanySettings = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const data = await companiesService.updateCompanySettings(companyId, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  createCompanyAdmin,
  getMyCompanySettings,
  updateMyCompanySettings,
};

