interface Props {
  label: string
  value: number | string
  icon?: React.ReactNode
}

export function StatCard({ label, value, icon }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
