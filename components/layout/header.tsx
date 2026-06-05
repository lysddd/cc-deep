'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Menu } from 'lucide-react'

interface Props {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: Props) {
  const [email, setEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 hover:bg-gray-100 rounded"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">TodoNow</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:block">{email}</span>
      </div>
    </header>
  )
}
