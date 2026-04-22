"use client"

import React from 'react'
import Link from 'next/link'

export default function DashboardAltPage() {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard (Alternate)</h1>
      <p style={{ color: '#6b7280' }}>This is the alternate dashboard page. Add content here.</p>
      <p><Link href="/Ksave-list" style={{ color: '#06b6d4' }}>Back to Ksave-list</Link></p>
    </div>
  )
}
