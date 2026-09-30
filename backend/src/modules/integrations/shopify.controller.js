const shopifyService = require('./shopify.service');

const syncCheckouts = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const { startDate, endDate } = req.body || {};
    const result = await shopifyService.syncAbandonedCheckouts(companyId, userId, {
      startDate,
      endDate,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getCheckouts = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const result = await shopifyService.getAbandonedCheckouts(companyId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const importCheckout = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const checkoutData = req.body;

    const result = await shopifyService.importCheckoutAsLead(companyId, checkoutData, userId);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncCheckouts,
  getCheckouts,
  importCheckout,
};
