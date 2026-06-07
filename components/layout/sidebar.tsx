'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Settings, LogOut, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

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
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setName(data.user.user_metadata?.display_name || data.user.email?.charAt(0)?.toUpperCase() || '用')
      }
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-0
        w-[220px] bg-white border-r border-stone-200 h-screen flex flex-col
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-5 pt-5 mb-8">
          <Link href="/dashboard" className="text-xl font-semibold text-brand-600 tracking-tight" onClick={onClose}>
            TodoNow
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          {links.map(link => {
            const Icon = link.icon
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-r-lg mr-2 transition-colors
                  ${active ? 'bg-brand-50 text-brand-600 font-medium' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'}`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-5 py-4 border-t border-stone-200 mt-auto">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-medium shrink-0">
              {name}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-stone-800 truncate">{name}</div>
              <div className="text-[11px] text-stone-400 truncate">{email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-400 hover:bg-stone-50 hover:text-stone-600 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>
    </>
  )
}
