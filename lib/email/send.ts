import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { renderTemplate } from './templates'
import type { NotificationTemplate, NotificationRecipient } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Use service_role client for notification logging (cron has no user session)
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendNotificationEmail(input: {
  notificationId: string
  taskId: string
  template: NotificationTemplate
  recipients: NotificationRecipient[]
  variables: {
    task_name: string
    deadline: string
    receiver_name?: string
    creator_name: string
  }
}) {
  const results: Array<{ recipient: string; status: 'sent' | 'failed'; error?: string }> = []

  for (const recipient of input.recipients) {
    if (!recipient.email) continue

    const vars = {
      ...input.variables,
      receiver_name: recipient.name || input.variables.receiver_name || recipient.email,
    }

    const { subject, body, disclaimer } = renderTemplate(input.template, vars)

    try {
      await resend.emails.send({
        from: 'TodoNow <onboarding@resend.dev>',
        to: [recipient.email],
        subject,
        text: body + disclaimer,
      })

      results.push({ recipient: recipient.email, status: 'sent' })

      await adminClient.from('notification_logs').insert({
        notification_id: input.notificationId,
        task_id: input.taskId,
        recipient: recipient.email,
        channel: 'email',
        status: 'sent',
      })
    } catch (error) {
      const errMsg = (error as Error).message
      results.push({ recipient: recipient.email, status: 'failed', error: errMsg })

      await adminClient.from('notification_logs').insert({
        notification_id: input.notificationId,
        task_id: input.taskId,
        recipient: recipient.email,
        channel: 'email',
        status: 'failed',
        error_message: errMsg,
      })
    }
  }

  return results
}
