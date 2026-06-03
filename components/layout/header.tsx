'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [email, setEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">TodoNow</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{email}</span>
      </div>
    </header>
  )
}
