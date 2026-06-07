'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EmailInput } from '@/components/ui/email-input'
import { CheckCircle2 } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { window.location.href = '/dashboard' }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-brand-600 to-brand-900 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/5 rounded-full" />

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold text-white mb-4">TodoNow</h1>
          <p className="text-brand-100 text-lg mb-14">条件驱动的任务通知系统</p>

          <div className="space-y-5">
            {[
              '灵活的任务条件配置',
              '多渠道通知提醒',
              '微信端一键打卡',
              '数据安全审计追踪',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                <span className="text-white/85 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-3xl font-bold text-brand-600">TodoNow</h1>
            <p className="text-gray-500 text-sm mt-1">条件驱动的任务通知系统</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">欢迎回来</h2>
            <p className="text-gray-500 text-sm mb-8">登录你的账号</p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <EmailInput
                  value={email}
                  onChange={setEmail}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                  placeholder="••••••"
                />
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                  忘记密码？
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-800 focus:ring-4 focus:ring-brand-100 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? '登录中...' : '登 录'}
              </button>
            </form>

            <p className="text-sm text-gray-500 text-center mt-6">
              还没有账号？{' '}
              <Link href="/register" className="text-brand-600 hover:text-brand-800 font-medium">
                注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
