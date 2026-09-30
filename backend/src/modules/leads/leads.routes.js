const router = require("express").Router();

const validate = require("../../core/middleware/validate.middleware");
const { authenticate } = require("../../core/middleware/auth.middleware");
const {
  requireCompanyContext,
} = require("../../core/middleware/tenant.middleware");
const leadsController = require("./leads.controller");
const { uploadLeadImportFile } = require("./import-upload");
const {
  listLeadsSchema,
  leadIdParamsSchema,
  createLeadSchema,
  updateLeadSchema,
  importLeadsExcelSchema,
  assignImportedLeadsSchema,
  listAgentQueueSchema,
} = require("./leads.validation");

router.get(
  "/",
  authenticate,
  requireCompanyContext,
  validate(listLeadsSchema),
  leadsController.listLeads,
);
router.get(
  "/agent-queue",
  authenticate,
  requireCompanyContext,
  validate(listAgentQueueSchema),
  leadsController.listAgentQueue,
);
router.get(
  "/search-by-phone",
  authenticate,
  requireCompanyContext,
  leadsController.searchByPhone,
);
router.post(
  "/",
  authenticate,
  requireCompanyContext,
  validate(createLeadSchema),
  leadsController.createLead,
);
router.post(
  "/import-excel",
  authenticate,
  requireCompanyContext,
  validate(importLeadsExcelSchema),
  uploadLeadImportFile.single("file"),
  leadsController.importLeadsExcel,
);
router.post(
  "/assign-imported",
  authenticate,
  requireCompanyContext,
  validate(assignImportedLeadsSchema),
  leadsController.assignImportedLeads,
);
router.get(
  "/:id",
  authenticate,
  requireCompanyContext,
  validate(leadIdParamsSchema),
  leadsController.getLeadById,
);
router.put(
  "/:id",
  authenticate,
  requireCompanyContext,
  validate(updateLeadSchema),
  leadsController.updateLead,
);
router.delete(
  "/:id",
  authenticate,
  requireCompanyContext,
  validate(leadIdParamsSchema),
  leadsController.deleteLead,
);

module.exports = router;
