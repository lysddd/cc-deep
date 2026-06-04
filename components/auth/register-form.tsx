'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleResendConfirm() {
    if (!email) return
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resend({ email, type: 'signup' })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('验证邮件已重新发送，请检查邮箱（含垃圾邮件箱）')
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Check email and display name availability
    const checkRes = await fetch('/api/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, display_name: displayName }),
    })

    const checkData = await checkRes.json()
    if (!checkData.available) {
      setError(checkData.errors.join('；'))
      setLoading(false)
      return
    }

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (signUpError) {
      // Handle specific error codes
      if (signUpError.code === 'email_not_confirmed') {
        setError('该邮箱已注册但未验证。请检查邮箱中的验证邮件（含垃圾邮件箱），或点击下方按钮重新发送')
      } else if (signUpError.code === 'user_already_exists' || signUpError.message?.includes('already')) {
        setError('该邮箱已被注册。如忘记密码请使用重置功能，或直接登录')
      } else {
        setError(signUpError.message)
      }
    } else if (data.user?.identities?.length === 0) {
      // User exists but identities is empty = already registered
      setError('该邮箱已注册但未验证。请检查邮箱中的验证邮件（含垃圾邮件箱），或点击下方按钮重新发送')
    } else {
      setSuccess('您的账户已成功创建。我们已向您的邮箱发送了一封确认邮件。请按照确认邮件中的说明激活您的账户。')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">TodoNow</h1>
      <p className="text-gray-500 text-center mb-6">创建新账号</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          <p>{error}</p>
          {error.includes('未验证') && (
            <button
              type="button"
              onClick={handleResendConfirm}
              disabled={loading}
              className="mt-2 text-blue-600 hover:underline text-sm font-medium"
            >
              重新发送验证邮件
            </button>
          )}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-4">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">显示名称</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="你的昵称"
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="至少 6 位"
          />
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          注册即表示同意
          <Link href="/terms" className="text-blue-600 hover:underline">服务条款</Link>
          和
          <Link href="/privacy" className="text-blue-600 hover:underline">隐私政策</Link>
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '处理中...' : '注册'}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        已有账号？<Link href="/login" className="text-blue-600 hover:underline">登录</Link>
      </p>
    </div>
  )
}
