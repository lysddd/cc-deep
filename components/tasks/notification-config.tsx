'use client'

interface Recipient {
  email?: string
  name?: string
}

interface NotificationEntry {
  channel: string
  recipients: Recipient[]
  template: { subject: string; body: string }
}

interface Props {
  value: NotificationEntry[]
  onChange: (value: NotificationEntry[]) => void
}

const STORAGE_KEY = 'todonow_last_notification'

function loadDefaults(): { channel: string; recipients: { email?: string; name?: string }[]; template: { subject: string; body: string } } {
  if (typeof window === 'undefined') {
    return {
      channel: 'email',
      recipients: [{ email: '', name: '' }],
      template: {
        subject: '提醒：{{task_name}} 未按时完成',
        body: '你好，你设置的「{{task_name}}」任务需要在 {{deadline}} 前完成，目前尚未收到完成确认。\n\n—— TodoNow 自动提醒',
      },
    }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    channel: 'email',
    recipients: [{ email: '', name: '' }],
    template: {
      subject: '提醒：{{task_name}} 未按时完成',
      body: '你好，你设置的「{{task_name}}」任务需要在 {{deadline}} 前完成，目前尚未收到完成确认。\n\n—— TodoNow 自动提醒',
    },
  }
}

function saveDefaults(entry: { channel: string; recipients: { email?: string; name?: string }[]; template: { subject: string; body: string } }) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {}
}

export function NotificationConfig({ value, onChange }: Props) {
  function addNotification() {
    const defaults = loadDefaults()
    onChange([...value, defaults])
  }

  function updateNotification(index: number, field: string, val: unknown) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    saveDefaults(updated[index])
    onChange(updated)
  }

  function updateRecipient(notifIndex: number, recipIndex: number, field: string, val: string) {
    const updated = [...value]
    const recipients = [...updated[notifIndex].recipients]
    recipients[recipIndex] = { ...recipients[recipIndex], [field]: val }
    updated[notifIndex] = { ...updated[notifIndex], recipients }
    saveDefaults(updated[notifIndex])
    onChange(updated)
  }

  function addRecipient(notifIndex: number) {
    const updated = [...value]
    updated[notifIndex] = {
      ...updated[notifIndex],
      recipients: [...updated[notifIndex].recipients, { email: '', name: '' }],
    }
    onChange(updated)
  }

  function removeNotification(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function removeRecipient(notifIndex: number, recipIndex: number) {
    const updated = [...value]
    updated[notifIndex] = {
      ...updated[notifIndex],
      recipients: updated[notifIndex].recipients.filter((_, i) => i !== recipIndex),
    }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">通知规则</h4>
        <button
          type="button"
          onClick={addNotification}
          className="text-sm text-blue-600 hover:underline"
        >
          + 添加通知
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-400">尚未添加通知规则</p>
      )}

      {value.map((notif, ni) => (
        <div key={ni} className="border rounded-lg p-4 space-y-3 relative">
          <button
            type="button"
            onClick={() => removeNotification(ni)}
            className="absolute top-3 right-3 text-sm text-red-500 hover:underline"
          >
            删除
          </button>

          <div>
            <label className="block text-sm font-medium mb-1">通知渠道</label>
            <select
              value={notif.channel}
              onChange={e => updateNotification(ni, 'channel', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="email">邮件</option>
              <option value="wechat_template">微信模板消息</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">接收人</label>
              <button
                type="button"
                onClick={() => addRecipient(ni)}
                className="text-xs text-blue-600 hover:underline"
              >
                + 添加
              </button>
            </div>
            {notif.recipients.map((recip, ri) => (
              <div key={ri} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="姓名（选填）"
                  value={recip.name ?? ''}
                  onChange={e => updateRecipient(ni, ri, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="email"
                  placeholder="邮箱"
                  value={recip.email ?? ''}
                  onChange={e => updateRecipient(ni, ri, 'email', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                {notif.recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(ni, ri)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">邮件标题</label>
            <input
              type="text"
              value={notif.template.subject}
              onChange={e => {
                const t = { ...notif.template, subject: e.target.value }
                updateNotification(ni, 'template', t)
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮件正文</label>
            <textarea
              rows={4}
              value={notif.template.body}
              onChange={e => {
                const t = { ...notif.template, body: e.target.value }
                updateNotification(ni, 'template', t)
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              可用变量：{'{{task_name}}'} {'{{deadline}}'} {'{{receiver_name}}'} {'{{creator_name}}'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
