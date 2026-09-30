const cron = require('node-cron');
const shopifyService = require('./shopify.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../config/logger');

/**
 * Syncs abandoned checkouts for all companies and converts them to leads.
 * Looks for checkouts created in the last 24 hours.
 */
async function syncAllCompaniesShopify() {
  logger.info('Starting scheduled Shopify abandoned cart sync...');
  
  try {
    // Find all companies that have a Shopify API URL configured
    const companies = await prisma.company.findMany({
      where: {
        shopifyAbandonedCartApiUrl: {
          not: null,
          not: ''
        }
      }
    });

    logger.info(`Found ${companies.length} companies with Shopify integration.`);

    for (const company of companies) {
      try {
        logger.info(`Syncing Shopify checkouts for company: ${company.name} (${company.id})`);
        
        // 1. Fetch checkouts from the last 24 hours
        // We use the service method which already has the logic for Megascale vs Shopify REST
        const checkouts = await shopifyService.getAbandonedCheckouts(company.id);
        
        // 2. Filter for only those in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCheckouts = checkouts.filter(c => {
          const createdAt = new Date(c.created_at);
          return createdAt >= twentyFourHoursAgo && !c.isImported;
        });

        logger.info(`Found ${recentCheckouts.length} new recent checkouts to import for ${company.name}.`);

        // 3. Import each as a lead
        let importCount = 0;
        for (const checkout of recentCheckouts) {
          try {
            await shopifyService.importCheckoutAsLead(company.id, checkout);
            importCount++;
          } catch (importErr) {
            // Skip if it's already imported or invalid contact
            logger.error({ error: importErr.message, checkoutId: checkout.id }, `Failed to auto-import checkout for ${company.name}`);
          }
        }

        logger.info(`Successfully auto-imported ${importCount} leads for ${company.name}.`);
      } catch (companyErr) {
        logger.error({ error: companyErr.message, companyId: company.id }, `Failed to sync Shopify for company ${company.name}`);
      }
    }
    
    logger.info('Scheduled Shopify sync completed.');
  } catch (err) {
    logger.error({ error: err.message }, 'Global Shopify sync cron failure');
  }
}

/**
 * Initializes the Shopify cron jobs.
 */
function initShopifyCron() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    syncAllCompaniesShopify();
  });

  // Also run once immediately on startup to catch up
  logger.info('Shopify cron initialized. Running initial sync...');
  syncAllCompaniesShopify();
}

module.exports = {
  initShopifyCron,
  syncAllCompaniesShopify
};
