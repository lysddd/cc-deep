import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TodoNow',
  description: '条件驱动的任务通知系统',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  )
}
