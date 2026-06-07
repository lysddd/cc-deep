import type { ReactNode } from 'react'

interface Props {
  label: string
  value: number | string
  icon: ReactNode
  color: 'purple' | 'green' | 'blue'
}

const colors = {
  purple: { bg: 'bg-brand-50', text: 'text-brand-600' },
  green:  { bg: 'bg-lime-100', text: 'text-lime-700' },
  blue:   { bg: 'bg-blue-50', text: 'text-blue-600' },
}

export function StatCard({ label, value, icon, color }: Props) {
  const c = colors[color]
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-stone-400">{label}</span>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${c.bg} ${c.text}`}>
          {icon}
        </div>
      </div>
      <div className="text-[28px] font-semibold text-stone-800 leading-none">{value}</div>
    </div>
  )
}
