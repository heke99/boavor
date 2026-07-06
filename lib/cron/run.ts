import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/database.types'

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

/**
 * Standard wrapper for cron endpoints: authorization, service client,
 * cron_run_logs bookkeeping (running → success/failed) and uniform JSON
 * responses.
 */
export async function runCronJob(
  request: NextRequest,
  jobName: string,
  handler: (supabase: ServiceClient) => Promise<Record<string, unknown>>,
): Promise<NextResponse> {
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' }, { status: 503 })
  }

  const { data: runLog } = await supabase
    .from('cron_run_logs')
    .insert({ job_name: jobName, status: 'running' })
    .select('id')
    .single()

  try {
    const result = await handler(supabase)

    if (runLog) {
      await supabase
        .from('cron_run_logs')
        .update({ status: 'success', finished_at: new Date().toISOString(), result: result as Json })
        .eq('id', runLog.id)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`Cron job ${jobName} failed`, error)

    if (runLog) {
      await supabase
        .from('cron_run_logs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error: message })
        .eq('id', runLog.id)
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
