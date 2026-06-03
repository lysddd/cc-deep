import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-500 mb-6">页面不存在</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          返回首页
        </Link>
      </div>
    </div>
  )
}
