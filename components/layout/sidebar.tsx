'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Settings, LogOut, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/tasks', label: '任务管理', icon: ListTodo },
  { href: '/settings', label: '个人设置', icon: Settings },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={
        `fixed md:sticky top-0 left-0 z-50 md:z-auto
         w-64 bg-white border-r min-h-screen flex flex-col
         transition-transform duration-200 ease-in-out
         ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`
      }>
        <div className="p-6 border-b flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600" onClick={onClose}>
            TodoNow
          </Link>
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => {
            const Icon = link.icon
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
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
    </>
  )
}
