import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, display_name } = await request.json()
    const errors: string[] = []

    if (email) {
      const { data } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (data) errors.push('该邮箱已被注册')
    }

    if (display_name) {
      const { data } = await adminClient
        .from('profiles')
        .select('id')
        .eq('display_name', display_name)
        .maybeSingle()

      if (data) errors.push('该显示名称已被使用')
    }

    return NextResponse.json({ available: errors.length === 0, errors })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
