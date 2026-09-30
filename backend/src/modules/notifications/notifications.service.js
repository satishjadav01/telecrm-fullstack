const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const { scheduleFollowUpReminderJob } = require('../../jobs/reminder.job');

const createNotification = async (payload) => {
  return prisma.notification.create({
    data: {
      userId: payload.userId,
      leadId: payload.leadId || null,
      followUpId: payload.followUpId || null,
      channel: payload.channel || 'in_app',
      status: payload.status || 'queued',
      title: payload.title || 'Follow-up Reminder',
      message: payload.message || 'You have a follow-up due soon',
      payload: payload.payload || null,
      scheduledAt: payload.scheduledAt || null,
    },
  });
};

const updateNotificationStatus = async (id, status) => {
  return prisma.notification.update({
    where: { id },
    data: {
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
      readAt: status === 'read' ? new Date() : undefined,
    },
  });
};

const markRead = async (id, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!notification) throw new AppError('Notification not found', 404);

  return updateNotificationStatus(id, 'read');
};

const scheduleFollowUpReminder = async (followUp) => {
  if (!followUp) return null;

  const reminderAt = followUp.reminderAt || followUp.dueAt;

  const notification = await createNotification({
    userId: followUp.assignedTo,
    leadId: followUp.leadId,
    followUpId: followUp.id,
    status: 'queued',
    title: 'Follow-up Reminder',
    message: `Follow-up is due at ${new Date(followUp.dueAt).toISOString()}`,
    payload: { followUpId: followUp.id, dueAt: followUp.dueAt },
    scheduledAt: reminderAt,
  });

  await scheduleFollowUpReminderJob({
    notificationId: notification.id,
    runAt: reminderAt,
    onRun: async () => {
      try {
        await updateNotificationStatus(notification.id, 'sent');
      } catch (_) {
        await updateNotificationStatus(notification.id, 'failed');
      }
    },
  });

  return notification;
};

module.exports = {
  createNotification,
  updateNotificationStatus,
  markRead,
  scheduleFollowUpReminder,
};

