module.exports = (req, res) => {
  req.log?.warn({
    method: req.method,
    path: req.originalUrl,
  }, 'Route not found');

  res.status(404).json({
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
  });
};
