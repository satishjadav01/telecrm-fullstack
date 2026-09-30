const leadsService = require("./leads.service");

const listLeads = async (req, res, next) => {
  try {
    const data = await leadsService.listLeads(req.query, req.user.companyId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listAgentQueue = async (req, res, next) => {
  try {
    const data = await leadsService.listAgentQueue({
      query: req.query,
      companyId: req.user.companyId,
      userId: req.user.id,
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const data = await leadsService.getLeadById(
      req.params.id,
      req.user.companyId,
    );
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const searchByPhone = async (req, res, next) => {
  try {
    const data = await leadsService.searchByPhone(
      req.query.phone,
      req.user.companyId,
    );
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    const data = await leadsService.createLead(
      req.body,
      req.user?.id || null,
      req.user.companyId,
    );
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const data = await leadsService.updateLead(
      req.params.id,
      req.body,
      req.user.companyId,
    );
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    await leadsService.deleteLead(req.params.id, req.user.companyId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const importLeadsExcel = async (req, res, next) => {
  try {
    const data = await leadsService.importLeadsExcel({
      file: req.file,
      companyId: req.user.companyId,
      currentUserId: req.user?.id || null,
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const assignImportedLeads = async (req, res, next) => {
  try {
    const data = await leadsService.assignImportedLeads({
      companyId: req.user.companyId,
      leadIds: req.body.leadIds,
      agentId: req.body.agentId,
      onlyUnassigned: req.body.onlyUnassigned !== false,
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
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
};
