const scheduledJobs = new Map();

const addScheduledJob = (key, timeoutId) => {
  const old = scheduledJobs.get(key);
  if (old) clearTimeout(old);
  scheduledJobs.set(key, timeoutId);
};

const clearScheduledJob = (key) => {
  const timeoutId = scheduledJobs.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledJobs.delete(key);
  }
};

module.exports = {
  addScheduledJob,
  clearScheduledJob,
};

