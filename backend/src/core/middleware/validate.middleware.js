module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) return res.status(400).json({ message: 'Validation failed', errors: result.error.issues });

  // Apply coerced/normalized values (e.g. z.coerce.boolean / z.coerce.number)
  if (result.data?.body !== undefined) req.body = result.data.body;
  if (result.data?.query !== undefined) req.query = result.data.query;
  if (result.data?.params !== undefined) req.params = result.data.params;

  next();
};

