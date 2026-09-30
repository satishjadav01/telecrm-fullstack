// // const express = require('express');
// // const cors = require('cors');
// // const helmet = require('helmet');
// // const compression = require('compression');
// // const pinoHttp = require('pino-http');

// // const logger = require('./config/logger');
// // const env = require('./config/env');
// // const errorMiddleware = require('./core/middleware/error.middleware');
// // const notFoundMiddleware = require('./core/middleware/not-found.middleware');
// // const rateLimitMiddleware = require('./core/middleware/rate-limit.middleware');
// // const auditMiddleware = require('./core/middleware/audit.middleware');
// // const authRoutes = require('./modules/auth/auth.routes');
// // const usersRoutes = require('./modules/users/users.routes');
// // const phoneDevicesRoutes = require('./modules/phoneDevices/phoneDevices.routes');
// // const leadsRoutes = require('./modules/leads/leads.routes');
// // const callsRoutes = require('./modules/calls/calls.routes');
// // const recordingsRoutes = require('./modules/recordings/recordings.routes');
// // const followupsRoutes = require('./modules/followups/followups.routes');
// // const reportsRoutes = require('./modules/reports/reports.routes');
// // const companiesRoutes = require('./modules/companies/companies.routes');
// // const rbacRoutes = require('./modules/rbac/rbac.routes');
// // const shopifyRoutes = require('./modules/integrations/shopify.routes');

// // const app = express();

// // app.use(helmet());
// // app.use(cors());
// // app.use(compression());
// // app.use(express.json({ limit: '2mb' }));
// // app.use(express.urlencoded({ extended: true }));
// // app.use(pinoHttp({ logger }));
// // app.use(rateLimitMiddleware);
// // app.use(auditMiddleware);

// // app.get('/health', (req, res) => {
// //   res.status(200).json({
// //     status: 'ok',
// //     service: 'tele-crm-backend',
// //     environment: env.nodeEnv,
// //     timestamp: new Date().toISOString(),
// //   });
// // });

// // app.get('/api', (req, res) => {
// //   res.status(200).json({ message: 'Tele CRM API is live' });
// // });

// // app.use('/api/auth', authRoutes);
// // app.use('/api/users', usersRoutes);
// // app.use('/api/phone-devices', phoneDevicesRoutes);
// // app.use('/api/leads', leadsRoutes);
// // app.use('/api/calls', callsRoutes);
// // app.use('/api', recordingsRoutes);
// // app.use('/api/follow-ups', followupsRoutes);
// // app.use('/api/reports', reportsRoutes);
// // app.use('/api/super/companies', companiesRoutes);
// // app.use('/api/super/rbac', rbacRoutes);
// // app.use('/api/integrations/shopify', shopifyRoutes);

// // app.use(notFoundMiddleware);
// // app.use(errorMiddleware);

// // module.exports = app;



// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const pinoHttp = require('pino-http');
// const path = require('path');

// const logger = require('./config/logger');
// const env = require('./config/env');
// const errorMiddleware = require('./core/middleware/error.middleware');
// const notFoundMiddleware = require('./core/middleware/not-found.middleware');
// const rateLimitMiddleware = require('./core/middleware/rate-limit.middleware');
// const auditMiddleware = require('./core/middleware/audit.middleware');
// const authRoutes = require('./modules/auth/auth.routes');
// const usersRoutes = require('./modules/users/users.routes');
// const phoneDevicesRoutes = require('./modules/phoneDevices/phoneDevices.routes');
// const leadsRoutes = require('./modules/leads/leads.routes');
// const callsRoutes = require('./modules/calls/calls.routes');
// const recordingsRoutes = require('./modules/recordings/recordings.routes');
// const followupsRoutes = require('./modules/followups/followups.routes');
// const reportsRoutes = require('./modules/reports/reports.routes');
// const companiesRoutes = require('./modules/companies/companies.routes');
// const rbacRoutes = require('./modules/rbac/rbac.routes');
// const shopifyRoutes = require('./modules/integrations/shopify.routes');

// const app = express();

// app.use(helmet());
// app.use(cors());
// app.use(compression());
// app.use(express.json({ limit: '2mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(pinoHttp({ logger }));
// app.use(rateLimitMiddleware);
// app.use(auditMiddleware);

// // Serve static files from the 'uploads' directory
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'ok',
//     service: 'tele-crm-backend',
//     environment: env.nodeEnv,
//     timestamp: new Date().toISOString(),
//   });
// });

// app.get('/api', (req, res) => {
//   res.status(200).json({ message: 'Tele CRM API is live' });
// });

// app.use('/api/auth', authRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/phone-devices', phoneDevicesRoutes);
// app.use('/api/leads', leadsRoutes);
// app.use('/api/calls', callsRoutes);
// app.use('/api', recordingsRoutes);
// app.use('/api/follow-ups', followupsRoutes);
// app.use('/api/reports', reportsRoutes);
// app.use('/api/super/companies', companiesRoutes);
// app.use('/api/super/rbac', rbacRoutes);
// app.use('/api/integrations/shopify', shopifyRoutes);

// app.use(notFoundMiddleware);
// app.use(errorMiddleware);

// module.exports = app;


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');

const logger = require('./config/logger');
const env = require('./config/env');
const errorMiddleware = require('./core/middleware/error.middleware');
const notFoundMiddleware = require('./core/middleware/not-found.middleware');
const rateLimitMiddleware = require('./core/middleware/rate-limit.middleware');
const auditMiddleware = require('./core/middleware/audit.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const phoneDevicesRoutes = require('./modules/phoneDevices/phoneDevices.routes');
const leadsRoutes = require('./modules/leads/leads.routes');
const callsRoutes = require('./modules/calls/calls.routes');
const recordingsRoutes = require('./modules/recordings/recordings.routes');
const followupsRoutes = require('./modules/followups/followups.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const companiesRoutes = require('./modules/companies/companies.routes');
const rbacRoutes = require('./modules/rbac/rbac.routes');
const shopifyRoutes = require('./modules/integrations/shopify.routes');

const app = express();

app.set('etag', false);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "media-src": ["'self'", "blob:"],
        "img-src": ["'self'", "data:", "blob:"],
      },
    },
  })
);
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));
app.use(rateLimitMiddleware);
app.use(auditMiddleware);

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tele-crm-backend',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Tele CRM API is live' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/phone-devices', phoneDevicesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api', recordingsRoutes);
app.use('/api/follow-ups', followupsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/super/companies', companiesRoutes);
app.use('/api/super/rbac', rbacRoutes);
app.use('/api/integrations/shopify', shopifyRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
