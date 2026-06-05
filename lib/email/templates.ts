import type { NotificationTemplate } from '@/types'

interface TemplateVariables {
  task_name: string
  deadline: string
  receiver_name: string
  creator_name: string
}

export function renderTemplate(
  template: NotificationTemplate,
  variables: TemplateVariables
): { subject: string; body: string; disclaimer: string } {
  let subject = template.subject
  let body = template.body

  const varMap: Record<string, string> = {
    '{{task_name}}': variables.task_name,
    '{{deadline}}': variables.deadline,
    '{{receiver_name}}': variables.receiver_name,
    '{{creator_name}}': variables.creator_name,
  }

  for (const [key, value] of Object.entries(varMap)) {
    subject = subject.replaceAll(key, value)
    body = body.replaceAll(key, value)
  }

  const disclaimer = `\n\n---\n此提醒由 ${variables.creator_name} 通过 TodoNow 发送，如不想接收请联系发送者。`

  // Add TodoNow prefix to subject
  if (!subject.startsWith('【TodoNow】')) {
    subject = `【TodoNow】${subject}`
  }

  return { subject, body, disclaimer }
}
