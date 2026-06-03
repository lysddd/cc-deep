import { Resend } from 'resend'
import { renderTemplate } from './templates'
import { createClient } from '@/lib/supabase/server'
import type { NotificationTemplate, NotificationRecipient } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

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
  const supabase = await createClient()
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
        from: 'TodoNow <noreply@todonow.app>',
        to: [recipient.email],
        subject,
        text: body + disclaimer,
      })

      results.push({ recipient: recipient.email, status: 'sent' })

      await supabase.from('notification_logs').insert({
        notification_id: input.notificationId,
        task_id: input.taskId,
        recipient: recipient.email,
        channel: 'email',
        status: 'sent',
      })
    } catch (error) {
      const errMsg = (error as Error).message
      results.push({ recipient: recipient.email, status: 'failed', error: errMsg })

      await supabase.from('notification_logs').insert({
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
