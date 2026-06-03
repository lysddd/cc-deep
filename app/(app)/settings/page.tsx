'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/settings/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '注销失败')
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      setDeleteError((error as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">个人设置</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">账号安全</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          退出登录
        </button>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-2 text-red-600">危险区域</h2>
        <p className="text-sm text-gray-500 mb-4">
          注销账号将永久删除你的所有数据，包括任务、打卡记录、通知历史。此操作不可撤销。
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            注销账号
          </button>
        ) : (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-sm font-medium text-red-800 mb-3">
              确认注销？所有数据将被永久删除。
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-2">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? '注销中...' : '确认注销'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
