'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">邮件已发送</h1>
        <p className="text-gray-500 mb-6">
          如果该邮箱已注册，我们会发送一封密码重置邮件，请查收（含垃圾邮件箱）。
        </p>
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
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
