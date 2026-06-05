'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EmailInput } from '@/components/ui/email-input'

const MAX_ATTEMPTS = 3
const RATE_WINDOW_MS = 3600000 // 1 hour
const STORAGE_KEY = 'todonow_pwd_reset_attempts'

function checkRateLimit(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return true
    const attempts = JSON.parse(stored)
    const now = Date.now()
    // Clean old attempts
    const recent = attempts.filter((t: number) => now - t < RATE_WINDOW_MS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    return recent.length < MAX_ATTEMPTS
  } catch {
    return true
  }
}

function recordAttempt() {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const attempts = stored ? JSON.parse(stored) : []
    attempts.push(Date.now())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
  } catch {}
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址')
      return
    }

    if (!checkRateLimit()) {
      setError('操作过于频繁，请 1 小时后再试')
      return
    }

    setLoading(true)
    recordAttempt()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      if (error.code === 'over_email_send_rate_limit') {
        setError('邮件发送过于频繁，请稍后再试')
      } else {
        setError('发送失败，请稍后再试')
      }
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">邮件已发送</h1>
        <div className="text-gray-500 space-y-2 mb-6">
          <p>如果 <strong>{email}</strong> 已注册，我们会发送一封密码重置邮件。</p>
          <p className="text-sm text-gray-400">请检查收件箱（含垃圾邮件箱）。</p>
          <p className="text-sm text-gray-400">链接有效期为 1 小时。</p>
        </div>
        <div className="text-sm text-gray-400 mb-4">
          没有收到邮件？
          <button
            onClick={() => setSuccess(false)}
            className="text-blue-600 hover:underline ml-1"
          >
            重新发送
          </button>
        </div>
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          返回登录
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">忘记密码</h1>
      <p className="text-gray-500 text-center mb-6">输入注册邮箱，我们将发送重置链接</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">邮箱</label>
          <EmailInput
            value={email}
            onChange={setEmail}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '发送中...' : '发送重置邮件'}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        <Link href="/login" className="text-blue-600 hover:underline">返回登录</Link>
      </p>
    </div>
  )
}
