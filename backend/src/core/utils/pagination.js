module.exports = (page = 1, limit = 20) => ({ skip: (Number(page) - 1) * Number(limit), take: Number(limit) });

