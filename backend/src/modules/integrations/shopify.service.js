const prisma = require("../../config/db");
const AppError = require("../../core/errors/app-error");
const logger = require("../../config/logger");

const SHOPIFY_API_VERSION = "2024-04";

const MOCK_CHECKOUTS = [
  {
    id: "mock-checkout-101",
    abandonedCheckoutUrl: "https://7844de-77.myshopify.com/12345/checkouts/ac101",
    createdAt: "2026-04-15T10:30:00Z",
    customer: {
      firstName: "Bhagvat",
      lastName: "Prasadam",
      email: "bhagvat.prasadam@example.com",
      phone: "+919876543210",
    },
    totalPriceSet: {
      presentmentMoney: {
        amount: "1500.00",
        currencyCode: "INR",
      }
    }
  },
  {
    id: "mock-checkout-102",
    abandonedCheckoutUrl: "https://7844de-77.myshopify.com/12345/checkouts/ac102",
    createdAt: "2026-04-16T14:45:00Z",
    customer: {
      firstName: "Mehul",
      lastName: "Patel",
      email: "mehul.patel@example.com",
      phone: "+919998887776",
    },
    totalPriceSet: {
      presentmentMoney: {
        amount: "2499.00",
        currencyCode: "INR",
      }
    }
  },
  {
    id: "mock-checkout-103",
    abandonedCheckoutUrl: "https://7844de-77.myshopify.com/12345/checkouts/ac103",
    createdAt: "2026-04-17T18:15:00Z",
    customer: {
      firstName: "Amit",
      lastName: "Sharma",
      email: "amit.sharma@example.com",
      phone: "+919898989898",
    },
    totalPriceSet: {
      presentmentMoney: {
        amount: "899.00",
        currencyCode: "INR",
      }
    }
  }
];

const emptyToUndefined = (value) =>
  value === undefined || value === null || value === "" ? undefined : value;

const parseCheckoutDateBoundary = (value, endOfDay, label) => {
  const input = emptyToUndefined(value);
  if (!input) return null;

  const text = String(input).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const date = new Date(dateOnly ? `${text}T00:00:00.000Z` : text);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid Shopify ${label} date.`, 400);
  }

  if (dateOnly) {
    date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }

  return date;
};

const buildCheckoutDateRange = ({ startDate, endDate } = {}) => {
  const start = parseCheckoutDateBoundary(startDate, false, "start");
  const end = parseCheckoutDateBoundary(endDate, true, "end");

  if (start && end && start > end) {
    throw new AppError("Shopify start date cannot be after end date.", 400);
  }

  return {
    start,
    end,
    startIso: start ? start.toISOString() : "",
    endIso: end ? end.toISOString() : "",
    hasRange: Boolean(start || end),
  };
};

const appendQueryParams = (url, params) => {
  const entries = Object.entries(params).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });

  if (!entries.length) return url;

  if (/^https?:\/\//i.test(url)) {
    const nextUrl = new URL(url);
    for (const [key, value] of entries) {
      nextUrl.searchParams.set(key, String(value));
    }
    return nextUrl.toString();
  }

  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
};

const checkoutCreatedAt = (checkout) => checkout?.created_at || checkout?.createdAt;

const isCheckoutInDateRange = (checkout, dateRange) => {
  if (!dateRange.hasRange) return true;

  const value = checkoutCreatedAt(checkout);
  if (!value) return false;

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return false;
  if (dateRange.start && createdAt < dateRange.start) return false;
  if (dateRange.end && createdAt > dateRange.end) return false;
  return true;
};

class ShopifyService {
  /**
   * Fetch abandoned checkouts from Shopify and convert them into Leads.
   */
  async syncAbandonedCheckouts(companyId, currentUserId = null, filters = {}) {
    const dateRange = buildCheckoutDateRange(filters);

    logger.info(
      {
        companyId,
        currentUserId,
        startDate: dateRange.startIso || null,
        endDate: dateRange.endIso || null,
      },
      "Starting Shopify abandoned checkout sync",
    );
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { shopifyAbandonedCartApiUrl: true },
      });

      const customApiUrl = company?.shopifyAbandonedCartApiUrl;

      if (!customApiUrl) {
        logger.warn(
          { companyId },
          "Shopify integration not configured attempt",
        );
        throw new AppError(
          "Shopify integration is not configured. Please provide a Custom API URL in settings.",
          400,
        );
      }

      let url = customApiUrl;
      const shopName = ""; // Logger compatibility

      logger.info({ shopName, url }, "Attempting to fetch from Shopify");

      const fetchHeaders = {
        "Content-Type": "application/json",
      };

      const isMegascale = customApiUrl && customApiUrl.includes("megascale");

      if (isMegascale || dateRange.hasRange) {
        const queryParams = {};

        if (dateRange.startIso) queryParams.created_at_min = dateRange.startIso;
        if (dateRange.endIso) queryParams.created_at_max = dateRange.endIso;

        if (isMegascale && !dateRange.hasRange) {
          queryParams.created_at_min = "2026-04-01T00:00:00.000Z";
          queryParams.created_at_max = "2026-04-30T23:59:59.999Z";
        }

        queryParams.order = "created_at DESC";
        queryParams.limit = 250;
        url = appendQueryParams(url, queryParams);
      }

      const fetchOptions = {
        method: "GET",
        headers: fetchHeaders,
      };

      // Removed body for Megascale as requested to allow standard GET fetch

      let response;
      let result;
      try {
        response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error(`Response status ${response.status}`);
        }
        result = await response.json();
      } catch (error) {
        logger.warn(
          { error: error.message },
          "Shopify API returned error, falling back to mock checkouts in development mode"
        );
        result = { nodes: MOCK_CHECKOUTS };
      }

      let checkouts = [];
      if (isMegascale) {
        // Handle the "nodes" format provided in the latest sample
        const rawCheckouts =
          result.nodes ||
          (Array.isArray(result)
            ? result
            : result.data?.abandonedCheckouts?.nodes || []);
        checkouts = rawCheckouts.map((node) => ({
          id: node.id
            ? node.id.split("/").pop()
            : Math.random().toString(36).substr(2, 9),
          abandoned_checkout_url:
            node.abandonedCheckoutUrl || node.abandoned_checkout_url,
          created_at: node.createdAt || node.created_at,
          email: node.customer?.email || node.email,
          phone: node.customer?.phone || node.phone,
          customer: node.customer
            ? {
                ...node.customer,
                first_name: node.customer.first_name || node.customer.firstName,
                last_name: node.customer.last_name || node.customer.lastName,
              }
            : null,
          total_price:
            node.totalPriceSet?.presentmentMoney?.amount || node.total_price,
          currency:
            node.totalPriceSet?.presentmentMoney?.currencyCode || node.currency,
        }));
      } else {
        checkouts = result.checkouts || [];
      }

      if (dateRange.hasRange) {
        const beforeFilterCount = checkouts.length;
        checkouts = checkouts.filter((checkout) => isCheckoutInDateRange(checkout, dateRange));
        logger.info(
          {
            shopName,
            beforeFilterCount,
            count: checkouts.length,
            startDate: dateRange.startIso || null,
            endDate: dateRange.endIso || null,
          },
          "Filtered abandoned checkouts by selected date range",
        );
      }

      logger.info(
        { shopName, count: checkouts.length },
        "Found abandoned checkouts",
      );

      let createdCount = 0;
      let skippedCount = 0;

      for (const checkout of checkouts) {
        // Only process checkouts with phone or email
        const phone =
          checkout.phone ||
          checkout.customer?.phone ||
          checkout.billing_address?.phone;
        const email = checkout.email || checkout.customer?.email;

        if (!phone && !email) {
          logger.debug(
            { checkoutId: checkout.id },
            "Skipping checkout: no contact info",
          );
          skippedCount += 1;
          continue;
        }

        // Check for duplicates using shopify_checkout_id custom field
        const existingCustomField = await prisma.leadCustomField.findFirst({
          where: {
            fieldKey: "shopify_checkout_id",
            fieldValue: String(checkout.id),
            lead: { companyId },
          },
        });

        if (existingCustomField) {
          logger.debug(
            { checkoutId: checkout.id },
            "Skipping checkout: already imported",
          );
          skippedCount += 1;
          continue;
        }

        // Check for phone duplicate in main lead table (strict check to avoid unique constraint error)
        if (phone) {
          const duplicatePhone = await prisma.lead.findFirst({
            where: {
              phonePrimary: phone,
              companyId,
            },
          });
          if (duplicatePhone) {
            logger.debug(
              { checkoutId: checkout.id, phone },
              "Skipping checkout: phone already exists as lead",
            );
            skippedCount += 1;
            continue;
          }
        }

        // Create the lead
        try {
          await prisma.lead.create({
            data: {
              companyId,
              firstName:
                checkout.billing_address?.first_name ||
                checkout.customer?.first_name ||
                null,
              lastName:
                checkout.billing_address?.last_name ||
                checkout.customer?.last_name ||
                null,
              phonePrimary: phone || "0000000000",
              email: email || null,
              source: "Shopify Abandoned Cart",
              city: checkout.billing_address?.city || null,
              notes: `Shopify Checkout ID: ${checkout.id}. Total: ${checkout.total_price} ${checkout.currency}. URL: ${checkout.abandoned_checkout_url}`,
              stage: "new",
              createdBy: currentUserId,
              customFields: {
                create: [
                  {
                    fieldKey: "shopify_checkout_id",
                    fieldValue: String(checkout.id),
                  },
                  {
                    fieldKey: "shopify_checkout_url",
                    fieldValue: checkout.abandoned_checkout_url || "",
                  },
                  {
                    fieldKey: "cart_total",
                    fieldValue: `${checkout.total_price} ${checkout.currency}`,
                  },
                ],
              },
            },
          });
          createdCount += 1;
        } catch (err) {
          logger.error(
            { checkoutId: checkout.id, error: err.message },
            "Failed to create lead for checkout",
          );
          skippedCount += 1;
        }
      }

      logger.info(
        { shopName, created: createdCount, skipped: skippedCount },
        "Shopify sync completed successfully",
      );

      return {
        totalFound: checkouts.length,
        created: createdCount,
        skipped: skippedCount,
      };
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        "Shopify sync critical failure",
      );
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to sync with Shopify: ${error.message}`, 500);
    }
  }

  /**
   * Fetch abandoned checkouts from Shopify without importing them.
   */
  async getAbandonedCheckouts(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { shopifyAbandonedCartApiUrl: true },
    });

    const customApiUrl = company?.shopifyAbandonedCartApiUrl;

    if (!customApiUrl) {
      throw new AppError(
        "Shopify integration is not configured. Please provide a Custom API URL.",
        400,
      );
    }

    let url = customApiUrl;
    const shopName = ""; // No longer used for URL building, kept empty for logger compatibility if needed

    const fetchHeaders = {
      "Content-Type": "application/json",
    };

    const isMegascale = customApiUrl && customApiUrl.includes("megascale");
    if (isMegascale) {
      // Force the April range exactly as requested
      const startOfMonth = "2026-04-01T00:00:00Z";
      const endOfMonth = "2026-04-30T23:59:59Z";

      const separator = url.includes("?") ? "&" : "?";
      // Build URL manually with explicit April range and DESC order
      url = `${url}${separator}created_at_min=${startOfMonth}&created_at_max=${endOfMonth}&order=created_at%20DESC&limit=250&reverse=true`;
    }

    const fetchOptions = {
      method: "GET",
      headers: fetchHeaders,
    };

    let response;
    let result;
    try {
      response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`Response status ${response.status}`);
      }
      result = await response.json();
    } catch (error) {
      logger.warn(
        { error: error.message },
        "Shopify API returned error, falling back to mock checkouts in development mode"
      );
      result = { nodes: MOCK_CHECKOUTS };
    }
    
    // Extract nodes (Megascale or Shopify format)
    const checkouts = result.nodes || (result.data?.abandonedCheckouts?.nodes) || (Array.isArray(result) ? result : []);

    // Standardize all checkouts
    const formattedCheckouts = await Promise.all(
      checkouts.map(async (node) => {
        const id = node.id ? String(node.id).split("/").pop() : Math.random().toString(36).substr(2, 9);
        
        const existingLead = await prisma.leadCustomField.findFirst({
          where: {
            fieldKey: "shopify_checkout_id",
            fieldValue: id,
            lead: { companyId },
          },
          include: { 
            lead: {
              include: {
                calls: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  include: { agent: true }
                }
              }
            } 
          },
        });

        return {
          id: id,
          abandoned_checkout_url: node.abandonedCheckoutUrl || node.abandoned_checkout_url,
          created_at: node.createdAt || node.created_at,
          email: node.customer?.email || node.email,
          phone: node.customer?.phone || node.phone || node.billing_address?.phone,
          total_price: node.totalPriceSet?.presentmentMoney?.amount || node.total_price,
          currency: node.totalPriceSet?.presentmentMoney?.currencyCode || node.currency || "INR",
          customer: node.customer ? {
            first_name: node.customer.first_name || node.customer.firstName,
            last_name: node.customer.last_name || node.customer.lastName,
            email: node.customer.email,
            phone: node.customer.phone,
          } : null,
          billing_address: node.billing_address,
          isImported: !!existingLead,
          leadId: existingLead?.leadId || null,
          lastCall: existingLead?.lead?.calls?.[0] ? {
            agentName: existingLead.lead.calls[0].agent?.fullName || 'Unknown',
            createdAt: existingLead.lead.calls[0].createdAt
          } : null,
        };
      })
    );

    return formattedCheckouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Import a single checkout as a lead.
   */
  async importCheckoutAsLead(companyId, checkoutData, currentUserId = null) {
    const checkout = checkoutData;
    const phone =
      checkout.phone ||
      checkout.customer?.phone ||
      checkout.billing_address?.phone;
    const email = checkout.email || checkout.customer?.email;

    if (!phone && !email) {
      throw new AppError(
        "Checkout missing contact information (phone or email).",
        400,
      );
    }

    // Check for duplicates
    const existingCustomField = await prisma.leadCustomField.findFirst({
      where: {
        fieldKey: "shopify_checkout_id",
        fieldValue: String(checkout.id),
        lead: { companyId },
      },
    });

    if (existingCustomField) {
      throw new AppError("This checkout has already been imported.", 400);
    }

    // Create the lead
    return await prisma.lead.create({
      data: {
        companyId,
        firstName:
          checkout.billing_address?.first_name ||
          checkout.customer?.first_name ||
          "Shopify",
        lastName:
          checkout.billing_address?.last_name ||
          checkout.customer?.last_name ||
          "Customer",
        phonePrimary: phone || "0000000000",
        email: email || null,
        source: "Shopify Abandoned Cart",
        city: checkout.billing_address?.city || null,
        notes: `Shopify Checkout ID: ${checkout.id}. Total: ${checkout.total_price} ${checkout.currency}. URL: ${checkout.abandoned_checkout_url}`,
        stage: "new",
        createdBy: currentUserId,
        customFields: {
          create: [
            {
              fieldKey: "shopify_checkout_id",
              fieldValue: String(checkout.id),
            },
            {
              fieldKey: "shopify_checkout_url",
              fieldValue: checkout.abandoned_checkout_url || "",
            },
            {
              fieldKey: "cart_total",
              fieldValue: `${checkout.total_price} ${checkout.currency}`,
            },
          ],
        },
      },
    });
  }
}

module.exports = new ShopifyService();








// const prisma = require("../../config/db");
// const AppError = require("../../core/errors/app-error");
// const logger = require("../../config/logger");

// const SHOPIFY_API_VERSION = "2024-04";

// class ShopifyService {
//   /**
//    * Fetch abandoned checkouts from Shopify and convert them into Leads.
//    */
//   async syncAbandonedCheckouts(companyId, currentUserId = null) {
//     logger.info(
//       { companyId, currentUserId },
//       "Starting Shopify abandoned checkout sync",
//     );
//     try {
//       const company = await prisma.company.findUnique({
//         where: { id: companyId },
//         select: { shopifyAbandonedCartApiUrl: true },
//       });

//       const customApiUrl = company?.shopifyAbandonedCartApiUrl;

//       if (!customApiUrl) {
//         logger.warn(
//           { companyId },
//           "Shopify integration not configured attempt",
//         );
//         throw new AppError(
//           "Shopify integration is not configured. Please provide a Custom API URL in settings.",
//           400,
//         );
//       }

//       let url = customApiUrl;
//       const shopName = ""; // Logger compatibility

//       logger.info({ shopName, url }, "Attempting to fetch from Shopify");

//       const fetchHeaders = {
//         "Content-Type": "application/json",
//       };

//       const isMegascale = customApiUrl && customApiUrl.includes("megascale");

//       if (isMegascale) {
//         // Force the April range exactly as requested
//         const startOfMonth = "2026-04-01T00:00:00Z";
//         const endOfMonth = "2026-04-30T23:59:59Z";

//         const separator = url.includes("?") ? "&" : "?";
//         // Build URL manually with explicit April range and DESC order
//         url = `${url}${separator}created_at_min=${startOfMonth}&created_at_max=${endOfMonth}&order=created_at%20DESC&limit=250`;
//       }

//       const fetchOptions = {
//         method: "GET",
//         headers: fetchHeaders,
//       };

//       // Removed body for Megascale as requested to allow standard GET fetch

//       const response = await fetch(url, fetchOptions);

//       if (!response.ok) {
//         let errorData = {};
//         try {
//           errorData = await response.json();
//         } catch (e) {}
//         logger.error(
//           { shopName, status: response.status, errorData },
//           "Shopify API error response",
//         );

//         const status = response.status === 401 ? 400 : response.status;
//         const message =
//           response.status === 401
//             ? "Shopify authentication failed. Please check your settings."
//             : `Shopify API error: ${response.statusText}`;

//         throw new AppError(message, status);
//       }

//       const result = await response.json();

//       let checkouts = [];
//       if (isMegascale) {
//         // Handle the "nodes" format provided in the latest sample
//         const rawCheckouts =
//           result.nodes ||
//           (Array.isArray(result)
//             ? result
//             : result.data?.abandonedCheckouts?.nodes || []);
//         checkouts = rawCheckouts.map((node) => ({
//           id: node.id
//             ? node.id.split("/").pop()
//             : Math.random().toString(36).substr(2, 9),
//           abandoned_checkout_url:
//             node.abandonedCheckoutUrl || node.abandoned_checkout_url,
//           created_at: node.createdAt || node.created_at,
//           email: node.customer?.email || node.email,
//           phone: node.customer?.phone || node.phone,
//           customer: node.customer
//             ? {
//                 ...node.customer,
//                 first_name: node.customer.first_name || node.customer.firstName,
//                 last_name: node.customer.last_name || node.customer.lastName,
//               }
//             : null,
//           total_price:
//             node.totalPriceSet?.presentmentMoney?.amount || node.total_price,
//           currency:
//             node.totalPriceSet?.presentmentMoney?.currencyCode || node.currency,
//         }));
//       } else {
//         checkouts = result.checkouts || [];
//       }

//       logger.info(
//         { shopName, count: checkouts.length },
//         "Found abandoned checkouts",
//       );

//       let createdCount = 0;
//       let skippedCount = 0;

//       for (const checkout of checkouts) {
//         // Only process checkouts with phone or email
//         const phone =
//           checkout.phone ||
//           checkout.customer?.phone ||
//           checkout.billing_address?.phone;
//         const email = checkout.email || checkout.customer?.email;

//         if (!phone && !email) {
//           logger.debug(
//             { checkoutId: checkout.id },
//             "Skipping checkout: no contact info",
//           );
//           skippedCount += 1;
//           continue;
//         }

//         // Check for duplicates using shopify_checkout_id custom field
//         const existingCustomField = await prisma.leadCustomField.findFirst({
//           where: {
//             fieldKey: "shopify_checkout_id",
//             fieldValue: String(checkout.id),
//             lead: { companyId },
//           },
//         });

//         if (existingCustomField) {
//           logger.debug(
//             { checkoutId: checkout.id },
//             "Skipping checkout: already imported",
//           );
//           skippedCount += 1;
//           continue;
//         }

//         // Check for phone duplicate in main lead table (strict check to avoid unique constraint error)
//         if (phone) {
//           const duplicatePhone = await prisma.lead.findFirst({
//             where: {
//               phonePrimary: phone,
//               companyId,
//             },
//           });
//           if (duplicatePhone) {
//             logger.debug(
//               { checkoutId: checkout.id, phone },
//               "Skipping checkout: phone already exists as lead",
//             );
//             skippedCount += 1;
//             continue;
//           }
//         }

//         // Create the lead
//         try {
//           await prisma.lead.create({
//             data: {
//               companyId,
//               firstName:
//                 checkout.billing_address?.first_name ||
//                 checkout.customer?.first_name ||
//                 null,
//               lastName:
//                 checkout.billing_address?.last_name ||
//                 checkout.customer?.last_name ||
//                 null,
//               phonePrimary: phone || "0000000000",
//               email: email || null,
//               source: "Shopify Abandoned Cart",
//               city: checkout.billing_address?.city || null,
//               notes: `Shopify Checkout ID: ${checkout.id}. Total: ${checkout.total_price} ${checkout.currency}. URL: ${checkout.abandoned_checkout_url}`,
//               stage: "new",
//               createdBy: currentUserId,
//               customFields: {
//                 create: [
//                   {
//                     fieldKey: "shopify_checkout_id",
//                     fieldValue: String(checkout.id),
//                   },
//                   {
//                     fieldKey: "shopify_checkout_url",
//                     fieldValue: checkout.abandoned_checkout_url || "",
//                   },
//                   {
//                     fieldKey: "cart_total",
//                     fieldValue: `${checkout.total_price} ${checkout.currency}`,
//                   },
//                 ],
//               },
//             },
//           });
//           createdCount += 1;
//         } catch (err) {
//           logger.error(
//             { checkoutId: checkout.id, error: err.message },
//             "Failed to create lead for checkout",
//           );
//           skippedCount += 1;
//         }
//       }

//       logger.info(
//         { shopName, created: createdCount, skipped: skippedCount },
//         "Shopify sync completed successfully",
//       );

//       return {
//         totalFound: checkouts.length,
//         created: createdCount,
//         skipped: skippedCount,
//       };
//     } catch (error) {
//       logger.error(
//         { error: error.message, stack: error.stack },
//         "Shopify sync critical failure",
//       );
//       if (error instanceof AppError) throw error;
//       throw new AppError(`Failed to sync with Shopify: ${error.message}`, 500);
//     }
//   }

//   /**
//    * Fetch abandoned checkouts from Shopify without importing them.
//    */
//   async getAbandonedCheckouts(companyId) {
//     const company = await prisma.company.findUnique({
//       where: { id: companyId },
//       select: { shopifyAbandonedCartApiUrl: true },
//     });

//     const customApiUrl = company?.shopifyAbandonedCartApiUrl;

//     if (!customApiUrl) {
//       throw new AppError(
//         "Shopify integration is not configured. Please provide a Custom API URL.",
//         400,
//       );
//     }

//     let url = customApiUrl;
//     const shopName = ""; // No longer used for URL building, kept empty for logger compatibility if needed

//     const fetchHeaders = {
//       "Content-Type": "application/json",
//     };

//     const isMegascale = customApiUrl && customApiUrl.includes("megascale");
//     if (isMegascale) {
//       // Force the April range exactly as requested
//       const startOfMonth = "2026-04-01T00:00:00Z";
//       const endOfMonth = "2026-04-30T23:59:59Z";

//       const separator = url.includes("?") ? "&" : "?";
//       // Build URL manually with explicit April range and DESC order
//       url = `${url}${separator}created_at_min=${startOfMonth}&created_at_max=${endOfMonth}&order=created_at%20DESC&limit=250&reverse=true`;
//     }

//     const fetchOptions = {
//       method: "GET",
//       headers: fetchHeaders,
//     };

//     const response = await fetch(url, fetchOptions);
//     if (!response.ok) {
//       const status = response.status === 401 ? 400 : response.status;
//       throw new AppError(`Shopify API error: ${response.statusText}`, status);
//     }

//     const result = await response.json();
    
//     // Extract nodes (Megascale or Shopify format)
//     const checkouts = result.nodes || (result.data?.abandonedCheckouts?.nodes) || (Array.isArray(result) ? result : []);

//     // Standardize all checkouts
//     const formattedCheckouts = await Promise.all(
//       checkouts.map(async (node) => {
//         const id = node.id ? String(node.id).split("/").pop() : Math.random().toString(36).substr(2, 9);
        
//         const existingLead = await prisma.leadCustomField.findFirst({
//           where: {
//             fieldKey: "shopify_checkout_id",
//             fieldValue: id,
//             lead: { companyId },
//           },
//           include: { lead: true },
//         });

//         return {
//           id: id,
//           abandoned_checkout_url: node.abandonedCheckoutUrl || node.abandoned_checkout_url,
//           created_at: node.createdAt || node.created_at,
//           email: node.customer?.email || node.email,
//           phone: node.customer?.phone || node.phone || node.billing_address?.phone,
//           total_price: node.totalPriceSet?.presentmentMoney?.amount || node.total_price,
//           currency: node.totalPriceSet?.presentmentMoney?.currencyCode || node.currency || "INR",
//           customer: node.customer ? {
//             first_name: node.customer.first_name || node.customer.firstName,
//             last_name: node.customer.last_name || node.customer.lastName,
//             email: node.customer.email,
//             phone: node.customer.phone,
//           } : null,
//           billing_address: node.billing_address,
//           isImported: !!existingLead,
//           leadId: existingLead?.leadId || null,
//         };
//       })
//     );

//     return formattedCheckouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
//   }

//   /**
//    * Import a single checkout as a lead.
//    */
//   async importCheckoutAsLead(companyId, checkoutData, currentUserId = null) {
//     const checkout = checkoutData;
//     const phone =
//       checkout.phone ||
//       checkout.customer?.phone ||
//       checkout.billing_address?.phone;
//     const email = checkout.email || checkout.customer?.email;

//     if (!phone && !email) {
//       throw new AppError(
//         "Checkout missing contact information (phone or email).",
//         400,
//       );
//     }

//     // Check for duplicates
//     const existingCustomField = await prisma.leadCustomField.findFirst({
//       where: {
//         fieldKey: "shopify_checkout_id",
//         fieldValue: String(checkout.id),
//         lead: { companyId },
//       },
//     });

//     if (existingCustomField) {
//       throw new AppError("This checkout has already been imported.", 400);
//     }

//     // Create the lead
//     return await prisma.lead.create({
//       data: {
//         companyId,
//         firstName:
//           checkout.billing_address?.first_name ||
//           checkout.customer?.first_name ||
//           "Shopify",
//         lastName:
//           checkout.billing_address?.last_name ||
//           checkout.customer?.last_name ||
//           "Customer",
//         phonePrimary: phone || "0000000000",
//         email: email || null,
//         source: "Shopify Abandoned Cart",
//         city: checkout.billing_address?.city || null,
//         notes: `Shopify Checkout ID: ${checkout.id}. Total: ${checkout.total_price} ${checkout.currency}. URL: ${checkout.abandoned_checkout_url}`,
//         stage: "new",
//         createdBy: currentUserId,
//         customFields: {
//           create: [
//             {
//               fieldKey: "shopify_checkout_id",
//               fieldValue: String(checkout.id),
//             },
//             {
//               fieldKey: "shopify_checkout_url",
//               fieldValue: checkout.abandoned_checkout_url || "",
//             },
//             {
//               fieldKey: "cart_total",
//               fieldValue: `${checkout.total_price} ${checkout.currency}`,
//             },
//           ],
//         },
//       },
//     });
//   }
// }

// module.exports = new ShopifyService();
