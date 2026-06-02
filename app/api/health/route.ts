import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, service: 'bovaro', checks: { supabaseEnv: false, database: false } },
      { status: 503 },
    )
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, service: 'bovaro', checks: { supabaseEnv: true, database: false } },
      { status: 503 },
    )
  }

  const { error } = await supabase.from('listings').select('id', { count: 'exact', head: true }).limit(1)
  if (error) {
    return NextResponse.json(
      { ok: false, service: 'bovaro', checks: { supabaseEnv: true, database: false }, error: error.message },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true, service: 'bovaro', checks: { supabaseEnv: true, database: true } })
}
