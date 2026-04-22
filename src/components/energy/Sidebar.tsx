"use client";

import { Home, BarChart2, MapPin, Bell, Settings, Monitor, Layout as LayoutIcon, Code, Users, FileText, MessageSquare, HelpCircle, UserCircle, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/LocaleContext";

const navigationItems = [
  { key: "dashboard", icon: Home, href: "/energy-dashboard/dashboard" },
  { key: "overview", icon: BarChart2, href: "/energy-dashboard/overview" },
  { key: "monitor", icon: Monitor, href: "/energy-dashboard/monitor" },
  { key: "location", icon: MapPin, href: "/energy-dashboard/location" },
];

const configurationItems = [
  { key: "notifications", icon: Bell, href: "/energy-dashboard/notifications" },
  { key: "devicesSetting", icon: Settings, href: "/energy-dashboard/devices-setting" },
  { key: "meterSetting", icon: LayoutIcon, href: "/energy-dashboard/meter-seting" },
];

const developerItems = [
  { key: "developer", icon: Code, href: "/developer" },
];

const supportItems = [
  { key: "productsInfo", icon: FileText, href: "/products-info" },
  { key: "supportTickets", icon: MessageSquare, href: "/support-tickets" },
  { key: "userFeedback", icon: Users, href: "/user-feedback" },
  { key: "helpDocs", icon: HelpCircle, href: "/help-docs" },
  { key: "userProfile", icon: UserCircle, href: "/profile" },
];

export default function Sidebar() {
  const { t, locale } = useLocale();
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">

      {/* Top: Logo */}
      <div className="px-4 pt-4 pb-2">
        {/* Company Name */}
        <div className="flex items-center gap-3 mb-1">
          <Image
            src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AMqDpBqx0RHlW36D/kenergysave-logo-m6L2JxknygHwL0Bj.png"
            alt="K Energy Save"
            width={96}
            height={96}
            className="w-24 h-24 object-contain flex-shrink-0"
          />
          <span className="text-sm font-bold text-gray-800 leading-tight">ZERA ENERGY</span>
        </div>
      </div>




      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-orange-300 to-transparent" />
            <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{t("navigation")}</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-orange-300 to-transparent" />
          </div>
          <ul className="space-y-0.5">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-md shadow-orange-200"
                        : "text-gray-600 hover:text-orange-600 hover:bg-orange-50 hover:translate-x-1"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-white/40 rounded-r-full" />}
                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-white" : "text-gray-400 group-hover:text-orange-500 group-hover:scale-110"}`} />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-300 to-transparent" />
            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t("configurations")}</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-300 to-transparent" />
          </div>
          <ul className="space-y-0.5">
            {configurationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md shadow-blue-200"
                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:translate-x-1"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-white/40 rounded-r-full" />}
                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-white" : "text-gray-400 group-hover:text-blue-500 group-hover:scale-110"}`} />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-purple-300 to-transparent" />
            <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{t("developer")}</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-purple-300 to-transparent" />
          </div>
          <ul className="space-y-0.5">
            {developerItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md shadow-purple-200"
                        : "text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:translate-x-1"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-white/40 rounded-r-full" />}
                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-white" : "text-gray-400 group-hover:text-purple-500 group-hover:scale-110"}`} />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-teal-300 to-transparent" />
            <h3 className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">{t("userSupports")}</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-teal-300 to-transparent" />
          </div>
          <ul className="space-y-0.5">
            {supportItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-teal-500 to-teal-400 text-white shadow-md shadow-teal-200"
                        : "text-gray-600 hover:text-teal-600 hover:bg-teal-50 hover:translate-x-1"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-white/40 rounded-r-full" />}
                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-white" : "text-gray-400 group-hover:text-teal-500 group-hover:scale-110"}`} />
                    <span className="text-sm font-medium">{t(item.key)}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Back to Main */}
      <div className="p-4 border-t">
        <Link
          href="/"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 w-full shadow-sm hover:shadow-md hover:shadow-red-200"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="text-sm font-semibold">
            {locale === "th" ? "กลับหน้าหลัก" : locale === "ko" ? "메인으로 돌아가기" : "Back to Main"}
          </span>
        </Link>
      </div>
    </div>
  );
}
