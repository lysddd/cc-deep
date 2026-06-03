'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/tasks', label: '任务管理', icon: ListTodo },
  { href: '/settings', label: '个人设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">
          TodoNow
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => {
          const Icon = link.icon
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
        >
          <LogOut size={18} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
