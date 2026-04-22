"use client"

import React from 'react'

type Vars = Record<string, string | number | undefined>

export default function PanelFrame({
  uid,
  panelId = 2,
  vars = {},
  height = 160,
  dashboard = '',
}: {
  uid: string
  panelId?: number
  vars?: Vars
  height?: number
  dashboard?: string
}) {
  const grafanaBase = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_GRAFANA_URL || window.location.origin.replace(/:\d+$/, ':3000'))

  const query = new URLSearchParams()
  query.set('orgId', '1')
  query.set('panelId', String(panelId))
  query.set('from', 'now-6h')
  query.set('to', 'now')
  if (dashboard) query.set('viewPanel', dashboard)
  Object.entries(vars || {}).forEach(([k, v]) => {
    if (v == null) return
    query.set(`var-${k}`, String(v))
  })

  const src = `${grafanaBase}/d-solo/${encodeURIComponent(uid)}?${query.toString()}`

  return (
    <div style={{ width: '100%', height }}>
      <iframe
        title={`grafana-panel-${uid}-${panelId}`}
        src={src}
        style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}
