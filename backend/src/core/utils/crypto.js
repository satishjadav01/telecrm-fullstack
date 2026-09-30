const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
const AppError = require('../errors/app-error');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = '1d';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

const signAccessToken = (payload) => {
  if (!env.jwtAccessSecret) {
    throw new AppError('JWT access secret is not configured', 500);
  }

  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

const signRefreshToken = (payload) => {
  if (!env.jwtRefreshSecret) {
    throw new AppError('JWT refresh secret is not configured', 500);
  }

  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

const verifyAccessToken = (token) => {
  if (!env.jwtAccessSecret) {
    throw new AppError('JWT access secret is not configured', 500);
  }

  return jwt.verify(token, env.jwtAccessSecret);
};

module.exports = {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
};

