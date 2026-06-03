import { z } from 'zod'

export const checkinConditionSchema = z.object({
  type: z.literal('checkin'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  count_per_period: z.number().int().min(1),
  grace_minutes: z.number().int().min(0).default(0),
  start_date: z.string().min(1),
})

export const deadlineConditionSchema = z.object({
  type: z.literal('deadline'),
  deadline: z.string().min(1),
  require_checkin: z.boolean().default(true),
  remind_before_minutes: z.array(z.number().int().min(0)).default([]),
})

export const countConditionSchema = z.object({
  type: z.literal('count'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  target_count: z.number().int().min(1),
  start_date: z.string().min(1),
})

export const taskConditionSchema = z.discriminatedUnion('type', [
  checkinConditionSchema,
  deadlineConditionSchema,
  countConditionSchema,
])

export const notificationTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

export const notificationRecipientSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
})

export const notificationSchema = z.object({
  channel: z.enum(['email', 'wechat_template']),
  recipients: z.array(notificationRecipientSchema).min(1),
  template: notificationTemplateSchema,
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  task_type: z.enum(['checkin', 'deadline', 'count']),
  condition_config: taskConditionSchema,
  notifications: z.array(notificationSchema).min(1),
})

export const updateTaskSchema = createTaskSchema.partial()

export const createCheckinSchema = z.object({
  task_id: z.string().uuid(),
  source: z.enum(['web', 'wechat']).default('web'),
})
