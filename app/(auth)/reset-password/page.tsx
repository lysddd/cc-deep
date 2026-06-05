'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">密码已重置</h1>
        <p className="text-gray-500">密码修改成功，即将跳转到仪表盘...</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mt-4 block">
          立即前往
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">重置密码</h1>
      <p className="text-gray-500 text-center mb-6">请输入新密码</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '重置中...' : '重置密码'}
        </button>
      </form>
    </div>
  )
}
