const usersService = require('./users.service');

const listUsers = async (req, res, next) => {
  try {
    const data = await usersService.listUsers(req.query, {
      companyId: req.user.companyId || null,
      isSuper: req.user.role === 'super_admin',
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const data = await usersService.getUserById(req.params.id, {
      companyId: req.user.companyId || null,
      isSuper: req.user.role === 'super_admin',
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = await usersService.createUser(req.body, {
      companyId: req.user.companyId || null,
      isSuper: req.user.role === 'super_admin',
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const data = await usersService.updateUser(req.params.id, req.body, {
      companyId: req.user.companyId || null,
      isSuper: req.user.role === 'super_admin',
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
};
