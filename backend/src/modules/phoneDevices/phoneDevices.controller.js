const phoneDevicesService = require('./phoneDevices.service');

const listPhoneDevices = async (req, res, next) => {
  try {
    const data = await phoneDevicesService.listPhoneDevices(req.query, req.user.companyId || null);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createPhoneDevice = async (req, res, next) => {
  try {
    const data = await phoneDevicesService.createPhoneDevice(req.body, req.user.companyId || null);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updatePhoneDevice = async (req, res, next) => {
  try {
    const data = await phoneDevicesService.updatePhoneDevice(
      req.params.id,
      req.body,
      req.user.companyId || null
    );
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPhoneDevices,
  createPhoneDevice,
  updatePhoneDevice,
};
