'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LocaleProvider } from '@/lib/LocaleContext';
import { SiteProvider } from '@/lib/SiteContext';
import ClientLayout from '@/components/energy/ClientLayout';

export default function EnergyDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('energy_system_token');
    if (!token) {
      router.replace('/energy-dashboard-login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  return (
    <SiteProvider>
      <LocaleProvider>
        <ClientLayout>
          {children}
        </ClientLayout>
      </LocaleProvider>
    </SiteProvider>
  );
}
