/**
 * Security limits for TodoNow MVP
 * Prevents abuse by capping actions per user
 */

export const LIMITS = {
  /** Max total tasks per user */
  MAX_TASKS: 10,

  /** Max active tasks per user */
  MAX_ACTIVE_TASKS: 9,

  /** Max notifications per task */
  MAX_NOTIFICATIONS_PER_TASK: 3,

  /** Max recipients per notification */
  MAX_RECIPIENTS_PER_NOTIFICATION: 5,

  /** Max check-ins per hour per user */
  MAX_CHECKINS_PER_HOUR: 100,

  /** Max notification emails per hour per user */
  MAX_EMAILS_PER_HOUR: 20,
} as const
