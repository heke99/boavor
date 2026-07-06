'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { savePushSubscriptionAction, removePushSubscriptionAction } from '@/app/actions/push'

type PushState = 'unsupported' | 'not_configured' | 'default' | 'denied' | 'subscribed' | 'unsubscribed' | 'working'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

/**
 * Push notification opt-in for the settings page. Requires VAPID keys —
 * without NEXT_PUBLIC_VAPID_PUBLIC_KEY an honest "not configured" state is
 * shown instead of a broken toggle.
 */
export function PushSettings() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const [state, setState] = useState<PushState>('working')

  useEffect(() => {
    let cancelled = false
    async function resolveState() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported')
        return
      }
      if (!vapidKey) {
        setState('not_configured')
        return
      }
      if (Notification.permission === 'denied') {
        setState('denied')
        return
      }
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (!cancelled) setState(subscription ? 'subscribed' : 'unsubscribed')
    }
    resolveState().catch(() => setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [vapidKey])

  const subscribe = useCallback(async () => {
    if (!vapidKey) return
    setState('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'unsubscribed')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const json = subscription.toJSON()
      const result = await savePushSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      })
      setState(result.ok ? 'subscribed' : 'unsubscribed')
    } catch (error) {
      console.error('Push subscription failed', error)
      setState('unsubscribed')
    }
  }, [vapidKey])

  const unsubscribe = useCallback(async () => {
    setState('working')
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setState('unsubscribed')
    } catch (error) {
      console.error('Push unsubscribe failed', error)
      setState('subscribed')
    }
  }, [])

  return (
    <div className="rounded-2xl border border-[#e8ebf3] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <BellRing size={16} className="text-[#5b3df5]" />
        Pushnotiser i webbläsaren
      </div>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">
        Få notiser om nya meddelanden och statusändringar även när Bovaro inte är öppet.
      </p>
      <div className="mt-3">
        {state === 'working' ? <span className="text-sm text-[#6b7280]">Arbetar…</span> : null}
        {state === 'unsupported' ? (
          <span className="text-sm text-[#6b7280]">Din webbläsare stödjer inte pushnotiser.</span>
        ) : null}
        {state === 'not_configured' ? (
          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]">
            Pushnotiser är inte konfigurerade i den här miljön.
          </span>
        ) : null}
        {state === 'denied' ? (
          <span className="text-sm text-[#6b7280]">
            Notiser är blockerade för Bovaro. Ändra webbplatsbehörigheterna i webbläsaren för att aktivera.
          </span>
        ) : null}
        {state === 'unsubscribed' ? (
          <button
            type="button"
            onClick={subscribe}
            className="inline-flex items-center rounded-2xl bg-[#111827] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#0b1220]"
          >
            Aktivera pushnotiser
          </button>
        ) : null}
        {state === 'subscribed' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">Aktiverade</span>
            <button
              type="button"
              onClick={unsubscribe}
              className="inline-flex items-center rounded-2xl border border-[#d7dbe7] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f8fc]"
            >
              Stäng av
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
