const rbacService = require('./rbac.service');

const listRoles = async (req, res, next) => {
  try {
    const data = await rbacService.listRoles(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const data = await rbacService.createRole(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const data = await rbacService.updateRole(req.params.roleId, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const listPermissions = async (req, res, next) => {
  try {
    const data = await rbacService.listPermissions(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createPermission = async (req, res, next) => {
  try {
    const data = await rbacService.createPermission(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updatePermission = async (req, res, next) => {
  try {
    const data = await rbacService.updatePermission(req.params.permissionId, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getRolePermissions = async (req, res, next) => {
  try {
    const data = await rbacService.getRolePermissions(req.params.roleId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const setRolePermissions = async (req, res, next) => {
  try {
    const data = await rbacService.setRolePermissions(req.params.roleId, req.body.permissionIds);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRoles,
  createRole,
  updateRole,
  listPermissions,
  createPermission,
  updatePermission,
  getRolePermissions,
  setRolePermissions,
};

