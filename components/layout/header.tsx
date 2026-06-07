'use client'

import { Menu } from 'lucide-react'

interface Props {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: Props) {
  return (
    <header className="h-14 lg:hidden flex items-center gap-3 px-4 bg-white border-b border-stone-200 sticky top-0 z-30">
      <button onClick={onMenuClick} className="p-1.5 hover:bg-stone-50 rounded-md cursor-pointer">
        <Menu size={20} className="text-stone-500" />
      </button>
      <span className="text-base font-semibold text-stone-800">TodoNow</span>
    </header>
  )
}
