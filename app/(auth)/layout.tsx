import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TodoNow - 登录',
  description: 'TodoNow 条件驱动任务通知系统',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
