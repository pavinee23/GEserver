'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/LocaleContext';
import { useSite } from '@/lib/SiteContext';
import { formatCurrencyBySite, getCurrencyCodeBySite } from '@/lib/currency';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Zap, TrendingDown, DollarSign, Leaf, Phone, Mail, MessageSquare,
  CheckCircle, Send, Activity, Cpu, Wifi, WifiOff, RefreshCw,
  Thermometer, ChevronDown, BarChart2, Users, Star, MapPin, Calendar,
  Shield,
} from 'lucide-react';

function L(locale, th, ko, en) {
  if (locale === 'th') return th;
  if (locale === 'ko') return ko;
  return en;
}
function fmt(n) { return n.toLocaleString(); }

const staffList = [
  { name: 'Nattapong S.', nameKo: '나타퐁 S.', nameTh: 'ณัฐพงศ์ ส.', role: 'Sales Engineer', roleTh: 'วิศวกรขาย', roleKo: '영업 엔지니어', phone: '+66 81-234-5678', email: 'nattapong@kenergy-save.com', line: '@kenergy_nat', available: true },
  { name: 'Sirikanya P.', nameKo: '시리칸야 P.', nameTh: 'ศิริกัญญา พ.', role: 'Customer Success', roleTh: 'ฝ่ายดูแลลูกค้า', roleKo: '고객 성공팀', phone: '+66 89-345-6789', email: 'sirikanya@kenergy-save.com', line: '@kenergy_siri', available: true },
  { name: 'Wanchai T.', nameKo: '완차이 T.', nameTh: 'วันชัย ท.', role: 'Technical Support', roleTh: 'ฝ่ายเทคนิค', roleKo: '기술 지원팀', phone: '+66 92-456-7890', email: 'wanchai@kenergy-save.com', line: '@kenergy_tech', available: false },
  { name: 'Minjun K.', nameKo: '민준 K.', nameTh: 'มินจุน เค.', role: 'Korea Sales Manager', roleTh: 'ผู้จัดการฝ่ายขาย เกาหลี', roleKo: '한국 영업 매니저', phone: '+82 10-1234-5678', email: 'minjun@kenergy-save.com', line: '@kenergy_kr', available: true },
];

export default function CustomersPage() {
  const { locale } = useLocale();
  const { selectedSite } = useSite();
  const [activeTab, setActiveTab] = useState('energy');
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState(null);

  // ── Live monitoring state ──
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [liveData, setLiveData] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveMetric, setLiveMetric] = useState('current');
  const [deviceDetails, setDeviceDetails] = useState(null);
  const liveTimer = useRef(null);
  const [sendingContact, setSendingContact] = useState(false);
  const [contactError, setContactError] = useState(null);

  const totalBefore = monthlyData.reduce((s, d) => s + d.before, 0);
  const totalAfter = monthlyData.reduce((s, d) => s + d.after, 0);
  const totalSavedKwh = totalBefore - totalAfter;
  const totalCostBefore = monthlyData.reduce((s, d) => s + d.costBefore, 0);
  const totalCostAfter = monthlyData.reduce((s, d) => s + d.costAfter, 0);
  const totalSavedBaht = totalCostBefore - totalCostAfter;
  const savingPct = totalBefore > 0 ? ((totalSavedKwh / totalBefore) * 100).toFixed(1) : '0.0';
  const co2Saved = (totalSavedKwh * 0.5313).toFixed(0);
  const currencyCode = getCurrencyCodeBySite(selectedSite, locale);
  const formatCost = (n) => formatCurrencyBySite(n, selectedSite, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const normalizeSnapshot = (raw, connection) => {
    const payload = raw;
    const metrics = payload?.metrics ?? (raw) ?? {};
    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      status: String(connection || '').toUpperCase() === 'ONLINE' ? 'online' : 'offline',
      totalPower: toNumber(metrics.totalPower),
      currentL1: toNumber(Array.isArray(metrics.current) ? metrics.current[0] : metrics.currentL1),
      currentL2: toNumber(Array.isArray(metrics.current) ? metrics.current[1] : metrics.currentL2),
      currentL3: toNumber(Array.isArray(metrics.current) ? metrics.current[2] : metrics.currentL3),
      powerFactor: toNumber(metrics.powerFactor),
      voltageL1: toNumber(Array.isArray(metrics.voltageLL) ? metrics.voltageLL[0] : metrics.voltageL1),
      voltageL2: toNumber(Array.isArray(metrics.voltageLL) ? metrics.voltageLL[1] : metrics.voltageL2),
      voltageL3: toNumber(Array.isArray(metrics.voltageLL) ? metrics.voltageLL[2] : metrics.voltageL3),
      frequency: toNumber(metrics.frequency),
      thdBefore: toNumber(metrics.thdBefore),
      thdAfter: toNumber(metrics.thdAfter),
      energySaved: toNumber(metrics.energySaved),
      co2Saved: toNumber(metrics.co2Saved),
    };
  };

  useEffect(() => {
    fetch(`/api/kenergy/dashboard-stats?site=${selectedSite}`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.recentDevices) {
          setDevices(j.data.recentDevices);
          if (j.data.recentDevices.length > 0) setSelectedDeviceId(String(j.data.recentDevices[0].deviceID));
        }
      }).catch(() => {});
  }, [selectedSite]);

  useEffect(() => {
    let active = true;

    fetch(`/api/kenergy/customer-dashboard?site=${selectedSite}`)
      .then(r => r.json())
      .then(j => {
        if (!active) return;
        if (j.success && Array.isArray(j.data?.monthly)) {
          setMonthlyData(j.data.monthly);
          setMonthlyError(null);
        } else {
          setMonthlyError(j.error || 'Failed to load monthly comparison data');
        }
      })
      .catch(() => {
        if (active) setMonthlyError('Failed to load monthly comparison data');
      })
      .finally(() => {
        if (active) setMonthlyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSite]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    fetchLive();
    if (liveTimer.current) clearInterval(liveTimer.current);
    liveTimer.current = setInterval(fetchLiveSnapshot, 30000);
    return () => { if (liveTimer.current) clearInterval(liveTimer.current); };
  }, [selectedDeviceId]);

  async function fetchLive() {
    setLiveLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [histRes, snapRes, devRes] = await Promise.all([
        fetch(`/api/kenergy/device-history?deviceId=${selectedDeviceId}&period=hour&from=${today}&to=${today}&limit=24`),
        fetch(`/api/kenergy/device-monitoring?deviceId=${selectedDeviceId}`),
        fetch(`/api/kenergy/devices-setting?site=all`),
      ]);
      const histJson = await histRes.json();
      const snapJson = await snapRes.json();
      const devJson  = await devRes.json();
      if (histJson.success) {
        const history = Array.isArray(histJson.history)
          ? histJson.history
          : Array.isArray(histJson.data)
            ? histJson.data
            : [];
        setLiveData(history);
      }

      let found = null;
      if (devJson.success) {
        found = devJson.devices?.find(d => String(d.deviceID) === String(selectedDeviceId));
        if (found) setDeviceDetails(found);
      }
      if (snapJson.success) setSnapshot(normalizeSnapshot(snapJson.data, found?.connection));
    } catch {}
    setLiveLoading(false);
  }

  async function fetchLiveSnapshot() {
    if (!selectedDeviceId) return;
    try {
      const r = await fetch(`/api/kenergy/device-monitoring?deviceId=${selectedDeviceId}`);
      const j = await r.json();
      if (j.success) setSnapshot(normalizeSnapshot(j.data, deviceDetails?.connection));
    } catch {}
  }
  const [chartType, setChartType] = useState('bar');
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const monthLabel = (d) => {
    const th = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ko = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const idx = Math.max(0, Math.min(11, d.monthIndex - 1));
    return locale === 'th' ? th[idx] : locale === 'ko' ? ko[idx] : en[idx];
  };

  const chartData = monthlyData.map(d => ({
    name: monthLabel(d),
    [L(locale,'ก่อนติดตั้ง','설치 전','Before')]: d.before,
    [L(locale,'หลังติดตั้ง','설치 후','After')]: d.after,
    [L(locale,`ก่อน (${currencyCode})`,`이전 비용 (${currencyCode})`,`Cost Before (${currencyCode})`)]: d.costBefore,
    [L(locale,`หลัง (${currencyCode})`,`이후 비용 (${currencyCode})`,`Cost After (${currencyCode})`)]: d.costAfter,
  }));

  const keyBefore  = L(locale,'ก่อนติดตั้ง','설치 전','Before');
  const keyAfter   = L(locale,'หลังติดตั้ง','설치 후','After');
  const keyCostB   = L(locale,`ก่อน (${currencyCode})`,`이전 비용 (${currencyCode})`,`Cost Before (${currencyCode})`);
  const keyCostA   = L(locale,`หลัง (${currencyCode})`,`이후 비용 (${currencyCode})`,`Cost After (${currencyCode})`);

  async function handleSend(e) {
    e.preventDefault();

    setSendingContact(true);
    setContactError(null);

    try {
      const response = await fetch('/api/kenergy/user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'General Feedback',
          subject: `Customer Dashboard Contact - ${contactForm.name}`,
          message: `Name: ${contactForm.name}\nPhone: ${contactForm.phone}\nEmail: ${contactForm.email || '-'}\n\n${contactForm.message}`,
          rating: 5,
          branch: selectedSite
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to send message');
      }

      setSent(true);
      setContactForm({ name: '', phone: '', email: '', message: '' });
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Failed to send message');
      setSent(false);
    } finally {
      setSendingContact(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-gray-50">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 shadow-2xl px-4 py-7 md:px-10 md:py-12">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.04)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize:'28px 28px'}} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/25 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-white/20 flex-shrink-0">
              <Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-300 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-white/30">⚡ K Energy Save</span>
              </div>
              <h1 className="text-lg md:text-3xl font-bold text-white leading-tight">{L(locale,'รายงานเปรียบเทียบพลังงาน','에너지 비교 보고서','Energy Comparison Report')}</h1>
              <p className="text-blue-100 text-xs md:text-sm mt-0.5 hidden sm:block">{L(locale,'เปรียบเทียบการใช้ไฟฟ้าและค่าใช้จ่ายก่อน-หลังติดตั้งเครื่อง K Energy Save','K Energy Save 설치 전후 전력 사용량 및 비용 비교','Electricity usage & cost comparison before/after K Energy Save installation')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="bg-white rounded-xl shadow-md">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* KPI chips */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-5 md:mt-8">
          {[
            { icon: Zap,          val: `${fmt(totalSavedKwh)} kWh`, label: L(locale,'ไฟฟ้าที่ประหยัด','절약 전력량','Energy Saved'),    color: 'from-yellow-400 to-amber-400', ring: 'ring-yellow-300/30' },
            { icon: DollarSign,   val: formatCost(totalSavedBaht),  label: L(locale,'ค่าไฟที่ประหยัด','절약 비용','Cost Saved'),         color: 'from-emerald-400 to-green-400', ring: 'ring-emerald-300/30' },
            { icon: TrendingDown, val: `${savingPct}%`,             label: L(locale,'% ที่ประหยัด','절약률','Saving Rate'),              color: 'from-sky-400 to-blue-400', ring: 'ring-sky-300/30' },
            { icon: Leaf,         val: `${fmt(Number(co2Saved))} kg`,label: L(locale,'CO₂ ที่ลดได้','CO₂ 절감량','CO₂ Reduced'),        color: 'from-teal-400 to-cyan-400', ring: 'ring-teal-300/30' },
          ].map(({ icon: Icon, val, label, color, ring }) => (
            <div key={label} className="group bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3 border border-white/25 hover:bg-white/25 hover:scale-[1.03] transition-all duration-200 cursor-default shadow-sm">
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ring-2 ${ring} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm md:text-xl leading-tight truncate tabular-nums">{val}</p>
                <p className="text-blue-100/80 text-xs truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6">

        {/* Tab switcher */}
        <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-md border border-gray-100/80 w-max md:w-fit">
            {[
              { key: 'energy',  label: L(locale,'กราฟไฟฟ้า','전력 그래프','Energy'),  icon: BarChart2 },
              { key: 'cost',    label: L(locale,'กราฟค่าไฟ','비용 그래프','Cost'),     icon: DollarSign },
              { key: 'live',    label: L(locale,'ไฟปัจจุบัน','실시간','Live'),         icon: Activity },
              { key: 'contact', label: L(locale,'ติดต่อ','연락','Contact'),            icon: Users },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Energy / Cost Charts ── */}
        {(activeTab === 'energy' || activeTab === 'cost') && (
          <>
            {/* Chart type toggle */}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition ${
                  chartType === 'bar' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                <BarChart2 className="w-3.5 h-3.5" />{L(locale,'แผนภูมิแท่ง','막대 차트','Bar')}
              </button>
              <button onClick={() => setChartType('line')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition ${
                  chartType === 'line' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                <Activity className="w-3.5 h-3.5" />{L(locale,'กราฟเส้น','선 차트','Line')}
              </button>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className={`h-1.5 w-full ${ activeTab === 'energy' ? 'bg-gradient-to-r from-red-400 via-orange-400 to-green-400' : 'bg-gradient-to-r from-orange-400 via-amber-400 to-blue-400' }`} />
              <div className="p-3 md:p-6">
                <h2 className="font-bold text-gray-800 text-base md:text-lg mb-1">
                  {activeTab === 'energy'
                    ? L(locale,'การใช้ไฟฟ้ารายเดือน (kWh)','월별 전력 사용량 (kWh)','Monthly Energy Usage (kWh)')
                    : L(locale,`ค่าใช้จ่ายรายเดือน (${currencyCode})`,`월별 전기 요금 (${currencyCode})`,`Monthly Cost (${currencyCode})`)}
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mb-4 md:mb-6">
                  {L(locale,'เปรียบเทียบก่อนและหลังติดตั้งเครื่อง K Energy Save','K Energy Save 설치 전후 비교','Before vs after K Energy Save installation')}
                </p>
                {monthlyLoading ? (
                  <div className="flex items-center justify-center h-[260px] text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v) =>
                      activeTab === 'energy'
                        ? Number(v).toLocaleString()
                        : formatCurrencyBySite(Number(v), selectedSite, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    } />
                    <Legend />
                    {activeTab === 'energy' ? <>
                      <Bar dataKey={keyBefore} fill="#ef4444" radius={[4,4,0,0]} />
                      <Bar dataKey={keyAfter}  fill="#22c55e" radius={[4,4,0,0]} />
                    </> : <>
                      <Bar dataKey={keyCostB} fill="#f97316" radius={[4,4,0,0]} />
                      <Bar dataKey={keyCostA} fill="#3b82f6" radius={[4,4,0,0]} />
                    </>}
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v) =>
                      activeTab === 'energy'
                        ? Number(v).toLocaleString()
                        : formatCurrencyBySite(Number(v), selectedSite, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    } />
                    <Legend />
                    {activeTab === 'energy' ? <>
                      <Line type="monotone" dataKey={keyBefore} stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey={keyAfter}  stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
                    </> : <>
                      <Line type="monotone" dataKey={keyCostB} stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey={keyCostA} stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                    </>}
                  </LineChart>
                )}
                  </ResponsiveContainer>
                )}
                {monthlyError && <p className="text-xs text-red-500 mt-3">{monthlyError}</p>}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">{L(locale,'ตารางเปรียบเทียบรายเดือน','월별 비교 표','Monthly Comparison Table')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                    <tr>
                      {[
                        L(locale,'เดือน','월','Month'),
                        L(locale,'ก่อน (kWh)','이전 (kWh)','Before (kWh)'),
                        L(locale,'หลัง (kWh)','이후 (kWh)','After (kWh)'),
                        L(locale,'ไฟฟ้าที่ประหยัด','전력 절약','Saved kWh'),
                        L(locale,`ก่อน (${currencyCode})`,`이전 비용 (${currencyCode})`,`Before (${currencyCode})`),
                        L(locale,`หลัง (${currencyCode})`,`이후 비용 (${currencyCode})`,`After (${currencyCode})`),
                        L(locale,`ประหยัดค่าไฟ (${currencyCode})`,`비용 절약 (${currencyCode})`,`Saved ${currencyCode}`),
                        L(locale,'% ประหยัด','절약률','Save %'),
                      ].map(h => (
                        <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyData.map((d, i) => {
                      const savedKwh = d.before - d.after;
                      const savedBaht = d.costBefore - d.costAfter;
                      const pct = d.before > 0 ? ((savedKwh / d.before) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={i} className={`hover:bg-blue-50/60 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-semibold text-gray-800">{monthLabel(d)} {d.year}</td>
                          <td className="px-4 py-3 text-red-600">{fmt(d.before)}</td>
                          <td className="px-4 py-3 text-green-600">{fmt(d.after)}</td>
                          <td className="px-4 py-3 font-semibold text-blue-700">{fmt(savedKwh)}</td>
                          <td className="px-4 py-3 text-red-500">{formatCost(d.costBefore)}</td>
                          <td className="px-4 py-3 text-green-600">{formatCost(d.costAfter)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">{formatCost(savedBaht)}</td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold">
                    <tr>
                      <td className="px-4 py-3.5">{L(locale,'รวม','합계','Total')}</td>
                      <td className="px-4 py-3.5 text-red-200">{fmt(totalBefore)}</td>
                      <td className="px-4 py-3.5 text-green-200">{fmt(totalAfter)}</td>
                      <td className="px-4 py-3.5 text-white">{fmt(totalSavedKwh)}</td>
                      <td className="px-4 py-3.5 text-red-200">{formatCost(totalCostBefore)}</td>
                      <td className="px-4 py-3.5 text-green-200">{formatCost(totalCostAfter)}</td>
                      <td className="px-4 py-3.5 text-white">{formatCost(totalSavedBaht)}</td>
                      <td className="px-4 py-3.5">
                        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full ring-1 ring-white/30">{savingPct}%</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {!monthlyLoading && monthlyData.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-400">
                    {L(locale,'ยังไม่มีข้อมูลรายเดือนในฐานข้อมูล','월별 데이터가 없습니다','No monthly data in database')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Live Devices ── */}
        {activeTab === 'live' && (
          <div className="space-y-5">

            {/* Device Selector + Refresh */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative w-full sm:w-auto">
                <select value={selectedDeviceId} onChange={e => { setSelectedDeviceId(e.target.value); }}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer sm:min-w-[220px]">
                  {devices.map(d => (
                    <option key={d.deviceID} value={String(d.deviceID)}>{d.deviceName || d.deviceID}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['current','power','voltage'].map(m => (
                  <button key={m} onClick={() => setLiveMetric(m)}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${
                      liveMetric === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {m === 'current' ? L(locale,'กระแสไฟ','전류','Current (A)')
                     : m === 'power'   ? L(locale,'กำลังไฟ','전력','Power (kW)')
                     : L(locale,'แรงดัน','전압','Voltage (V)')}
                  </button>
                ))}
              </div>
              <button onClick={fetchLive} disabled={liveLoading}
                className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition">
                <RefreshCw className={`w-4 h-4 ${liveLoading ? 'animate-spin text-blue-500' : ''}`} />
                {L(locale,'รีเฟรช','새로고침','Refresh')}
              </button>
            </div>

            {/* Snapshot KPI row */}
            {snapshot && (() => {
              const d = snapshot;
              const isOnline = d.status === 'online';
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { icon: isOnline ? Wifi : WifiOff, label: L(locale,'สถานะ','상태','Status'), val: isOnline ? L(locale,'ออนไลน์','온라인','Online') : 'Offline', color: isOnline ? 'text-emerald-600' : 'text-red-500', bg: isOnline ? 'bg-emerald-50' : 'bg-red-50' },
                    { icon: Zap,         label: L(locale,'กำลังไฟ (kW)','전력 (kW)','Power (kW)'),    val: (d.totalPower ?? 0).toFixed(2),   color: 'text-amber-600', bg: 'bg-amber-50' },
                    { icon: Activity,    label: L(locale,'L1 (A)','L1 (A)','L1 (A)'),                  val: (d.currentL1   ?? 0).toFixed(2),   color: 'text-blue-600',  bg: 'bg-blue-50' },
                    { icon: Activity,    label: L(locale,'L2 (A)','L2 (A)','L2 (A)'),                  val: (d.currentL2   ?? 0).toFixed(2),   color: 'text-violet-600',bg: 'bg-violet-50' },
                    { icon: Activity,    label: L(locale,'L3 (A)','L3 (A)','L3 (A)'),                  val: (d.currentL3   ?? 0).toFixed(2),   color: 'text-pink-600',  bg: 'bg-pink-50' },
                    { icon: Thermometer, label: L(locale,'Power Factor','역률','Power Factor'),          val: (d.powerFactor ?? 0).toFixed(3),   color: 'text-teal-600',  bg: 'bg-teal-50' },
                  ].map(({ icon: Icon, label, val, color, bg }) => (
                    <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:scale-[1.03] transition-all cursor-default border border-white/60`}>
                      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className={`font-bold text-lg leading-tight ${color}`}>{val}</p>
                        <p className="text-xs text-gray-500 truncate">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Line Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400" />
              <div className="p-3 md:p-6">
                <h2 className="font-bold text-gray-800 text-base md:text-lg mb-1">
                  {L(locale,'กราฟกระแสไฟรายชั่วโมง (วันนี้)','오늘 시간별 전류 그래프','Hourly Chart — Today')}
                </h2>
                <p className="text-gray-400 text-xs mb-3 md:mb-5">
                  {L(locale,'อัปเดตทุก 30 วินาที','30초마다 업데이트','Updates every 30 seconds')} · {selectedDeviceId}
                </p>
              {liveLoading ? (
                <div className="flex items-center justify-center h-52">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : liveData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-400">
                  <WifiOff className="w-10 h-10 mb-2" />
                  <p className="text-sm">{L(locale,'ยังไม่มีข้อมูลวันนี้','오늘 데이터 없음','No data for today')}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={liveData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }}
                      tickFormatter={v => v ? String(v).slice(11, 16) : ''} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={v => v ? String(v).slice(11, 16) : ''}
                      formatter={(v, name) => [v?.toFixed(2), name]} />
                    <Legend />
                    {liveMetric === 'current' && <>
                      <Line type="monotone" dataKey="currentL1" name="L1 (A)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="currentL2" name="L2 (A)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="currentL3" name="L3 (A)" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </>}
                    {liveMetric === 'power' && <>
                      <Line type="monotone" dataKey="totalPower" name={L(locale,'กำลังไฟ (kW)','전력 (kW)','Power (kW)')} stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                    </>}
                    {liveMetric === 'voltage' && <>
                      <Line type="monotone" dataKey="voltageL1" name="V-L1" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="voltageL2" name="V-L2" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="voltageL3" name="V-L3" stroke="#f97316" strokeWidth={2} dot={false} />
                    </>}
                  </LineChart>
                </ResponsiveContainer>
              )}
              </div>
            </div>

            {/* Device Detail Card */}
            {snapshot && (() => {
              const d = snapshot;
              const dev = devices.find(x => String(x.deviceID) === String(selectedDeviceId));
              const dd = deviceDetails;
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-violet-500" />
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <h2 className="font-bold text-gray-800">{L(locale,'รายละเอียดเครื่อง','기기 상세정보','Device Details')}</h2>
                  </div>

                  {/* Owner / Customer section */}
                  <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{L(locale,'ข้อมูลลูกค้า / เจ้าของเครื่อง','고객 / 기기 소유자 정보','Customer / Owner Information')}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'ชื่อเครื่อง / KSAVE ID','장치명 / KSAVE ID','Device Name / KSAVE ID')}</p>
                        <p className="font-semibold text-gray-800">{dev?.deviceName ?? selectedDeviceId}</p>
                        <p className="text-xs text-blue-500 font-mono mt-0.5">{dd?.ksaveID ?? dev?.ksaveID ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'ชื่อลูกค้า','고객명','Customer Name')}</p>
                        <p className="font-semibold text-gray-800">{dd?.customerName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'เบอร์โทร','전화번호','Phone')}</p>
                        {dd?.customerPhone
                          ? <a href={`tel:${dd.customerPhone}`} className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />{dd.customerPhone}
                            </a>
                          : <p className="font-semibold text-gray-800">-</p>}
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'ที่อยู่','주소','Address')}</p>
                        <p className="font-semibold text-gray-800 text-sm leading-snug">{dd?.customerAddress || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'อีเมลเจ้าของ','소유자 이메일','Owner Email')}</p>
                        <p className="font-semibold text-gray-800 break-all text-sm">{dd?.owner ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'สถานที่/ไซต์','설치 위치/사이트','Location / Site')}</p>
                        <p className="font-semibold text-gray-800">{dd?.location ?? dev?.location ?? '-'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dd?.site ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{L(locale,'วันที่ลงทะเบียน','등록일','Register Date')}</p>
                        <p className="font-semibold text-gray-800">{dd?.registerDate ?? '-'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">IP: {dd?.ipAddress ?? '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Electrical measurements grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-gray-100 text-sm">
                    {[
                      [L(locale,'สถานะเครื่อง','연결 상태','Connection'), dd?.connection ?? '-', dd?.connection === 'ONLINE' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'],
                      [L(locale,'แรงดัน L1 (V)','전압 L1 (V)','Voltage L1 (V)'), (d.voltageL1 ?? 0).toFixed(1), 'text-emerald-700'],
                      [L(locale,'แรงดัน L2 (V)','전압 L2 (V)','Voltage L2 (V)'), (d.voltageL2 ?? 0).toFixed(1), 'text-emerald-700'],
                      [L(locale,'แรงดัน L3 (V)','전압 L3 (V)','Voltage L3 (V)'), (d.voltageL3 ?? 0).toFixed(1), 'text-emerald-700'],
                      [L(locale,'กระแส L1 (A)','전류 L1 (A)','Current L1 (A)'), (d.currentL1 ?? 0).toFixed(2), 'text-blue-700'],
                      [L(locale,'กระแส L2 (A)','전류 L2 (A)','Current L2 (A)'), (d.currentL2 ?? 0).toFixed(2), 'text-violet-700'],
                      [L(locale,'กระแส L3 (A)','전류 L3 (A)','Current L3 (A)'), (d.currentL3 ?? 0).toFixed(2), 'text-pink-700'],
                      [L(locale,'กำลังไฟ (kW)','전력 (kW)','Total Power (kW)'), (d.totalPower ?? 0).toFixed(2), 'text-amber-700'],
                      [L(locale,'Power Factor','역률','Power Factor'), (d.powerFactor ?? 0).toFixed(3), 'text-gray-800'],
                      [L(locale,'ความถี่ (Hz)','주파수 (Hz)','Frequency (Hz)'), (d.frequency ?? 0).toFixed(1), 'text-gray-800'],
                      [L(locale,'THD ก่อน (%)','THD 이전 (%)','THD Before (%)'), (d.thdBefore ?? 0).toFixed(1), 'text-red-600'],
                      [L(locale,'THD หลัง (%)','THD 이후 (%)','THD After (%)'), (d.thdAfter ?? 0).toFixed(1), 'text-green-600'],
                      [L(locale,'พลังงานประหยัด (kWh)','절약 에너지 (kWh)','Energy Saved (kWh)'), (d.energySaved ?? 0).toFixed(2), 'text-emerald-700 font-bold'],
                      [L(locale,'CO₂ ลดได้ (kg)','CO₂ 절감 (kg)','CO₂ Saved (kg)'), (d.co2Saved ?? 0).toFixed(2), 'text-teal-700 font-bold'],
                    ].map(([label, val, cls]) => (
                      <div key={label} className="px-5 py-4 hover:bg-gray-50/80 transition-colors">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className={`font-semibold ${cls}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Contact Staff ── */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Staff Cards */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                {L(locale,'ทีมงาน K Energy Save','K Energy Save 담당자','K Energy Save Team')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffList.map((s, i) => {
                  const gradients = [
                    'from-blue-500 to-indigo-600',
                    'from-violet-500 to-purple-600',
                    'from-emerald-500 to-teal-600',
                    'from-orange-500 to-amber-600',
                  ];
                  return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                        {(locale === 'th' ? s.nameTh : locale === 'ko' ? s.nameKo : s.name).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800 truncate">
                            {locale === 'th' ? s.nameTh : locale === 'ko' ? s.nameKo : s.name}
                          </p>
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${s.available ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-xs text-blue-600 font-medium">
                          {locale === 'th' ? s.roleTh : locale === 'ko' ? s.roleKo : s.role}
                        </p>
                        <div className="mt-3 space-y-1.5">
                          <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            <Phone className="w-3.5 h-3.5 text-blue-500" />{s.phone}
                          </a>
                          <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors truncate">
                            <Mail className="w-3.5 h-3.5 text-blue-500" />{s.email}
                          </a>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                            <span>LINE: {s.line}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.available ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.available
                          ? L(locale,'✅ พร้อมให้บริการ','🟢 상담 가능','🟢 Available')
                          : L(locale,'⛔ ไม่ว่างในขณะนี้','🔴 현재 부재중','🔴 Unavailable')}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden h-fit">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-1">{L(locale,'ส่งข้อความหาเรา','메시지 보내기','Send us a message')}</h2>
                <p className="text-gray-500 text-sm mb-5">{L(locale,'ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง','24시간 내에 연락드리겠습니다','Our team will reply within 24 hours')}</p>
              {sent ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-9 h-9 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-gray-800">{L(locale,'ส่งข้อความเรียบร้อยแล้ว!','메시지가 전송되었습니다!','Message sent!')}</p>
                  <p className="text-sm text-gray-500 text-center">{L(locale,'เราจะติดต่อกลับโดยเร็วที่สุด','최대한 빨리 연락드리겠습니다','We will contact you as soon as possible')}</p>
                  <button onClick={() => setSent(false)} className="mt-2 text-blue-600 text-sm underline">
                    {L(locale,'ส่งอีกครั้ง','다시 보내기','Send another')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{L(locale,'ชื่อ','이름','Name')} *</label>
                    <input required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder={L(locale,'ชื่อของคุณ','성함을 입력하세요','Your name')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{L(locale,'เบอร์โทร','전화번호','Phone')} *</label>
                    <input required value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder={L(locale,'เบอร์โทรของคุณ','전화번호를 입력하세요','Your phone number')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{L(locale,'อีเมล','이메일','Email')}</label>
                    <input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{L(locale,'ข้อความ','메시지','Message')} *</label>
                    <textarea required rows={4} value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      placeholder={L(locale,'พิมพ์ข้อความของคุณ...','메시지를 입력하세요...','Type your message...')} />
                  </div>
                  <button type="submit" disabled={sendingContact} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                    <Send className="w-4 h-4" />
                    {sendingContact ? L(locale,'กำลังส่ง...','전송 중...','Sending...') : L(locale,'ส่งข้อความ','메시지 보내기','Send Message')}
                  </button>
                  {contactError && <p className="text-xs text-red-500">{contactError}</p>}
                </form>
              )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
