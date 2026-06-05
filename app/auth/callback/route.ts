import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash && type) {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
  }

  // Redirect password recovery to reset page
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
