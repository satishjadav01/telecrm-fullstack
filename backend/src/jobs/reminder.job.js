const { addScheduledJob, clearScheduledJob } = require('./queue');

const scheduleFollowUpReminderJob = async ({ notificationId, runAt, onRun }) => {
  const target = new Date(runAt).getTime();
  const delay = Math.max(0, target - Date.now());

  clearScheduledJob(notificationId);

  const timeoutId = setTimeout(async () => {
    try {
      await onRun();
    } finally {
      clearScheduledJob(notificationId);
    }
  }, delay);

  addScheduledJob(notificationId, timeoutId);
  return { notificationId, scheduledInMs: delay };
};

module.exports = {
  scheduleFollowUpReminderJob,
};

