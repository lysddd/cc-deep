import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types'

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function bindWeChat(userId: string, openid: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ wechat_openid: openid })
    .eq('id', userId)

  if (error) throw new Error(`Failed to bind WeChat: ${error.message}`)
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Failed to delete account: ${error.message}`)
}
