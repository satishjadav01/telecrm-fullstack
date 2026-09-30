const env = require('../../config/env');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  req.log?.error({
    message: err.message,
    statusCode,
    stack: err.stack,
    details: err.details || null,
  });

  const response = {
    message: err.message || 'Internal server error',
  };

  if (err.details) {
    response.details = err.details;
  }

  if (env.nodeEnv !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

