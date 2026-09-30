const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const data = await authService.getMyProfile(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  me,
};

