'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verifyToken() {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')

      // Check for errors in URL hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const errorCode = hashParams.get('error_code')
        if (errorCode === 'otp_expired') {
          setMessage('此链接已过期，请重新申请密码重置')
          setMessageType('error')
          setChecking(false)
          return
        }
      }

      if (!tokenHash || type !== 'recovery') {
        setMessage('无效的密码重置链接，请重新申请')
        setMessageType('error')
        setChecking(false)
        return
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })

      if (error) {
        if (error.code === 'otp_expired') {
          setMessage('此链接已过期，请重新申请密码重置')
        } else {
          setMessage(error.message)
        }
        setMessageType('error')
      } else {
        setVerified(true)
      }
      setChecking(false)
    }
    verifyToken()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setMessageType('info')

    if (password !== confirmPassword) {
      setMessage('两次输入的密码不一致')
      setMessageType('error')
      return
    }

    if (password.length < 6) {
      setMessage('密码至少需要 6 位')
      setMessageType('error')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setMessageType('error')
    } else {
      setMessage('密码已成功更新！')
      setMessageType('success')
      setTimeout(() => router.push('/login'), 1500)
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400">验证中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">重置密码</h1>
      <p className="text-gray-500 text-center mb-6">请设置你的新密码</p>

      {message && (
        <div className={`text-sm p-3 rounded-lg mb-4 ${
          messageType === 'error' ? 'bg-red-50 text-red-600' :
          messageType === 'success' ? 'bg-green-50 text-green-600' :
          'bg-blue-50 text-blue-600'
        }`}>
          <p>{message}</p>
          {!verified && messageType === 'error' && (
            <Link href="/forgot-password" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              重新申请密码重置
            </Link>
          )}
        </div>
      )}

      {verified && messageType !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">新密码</label>
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

          <div>
            <label className="block text-sm font-medium mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="再次输入新密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '重置中...' : '确认修改'}
          </button>
        </form>
      )}
    </div>
  )
}
