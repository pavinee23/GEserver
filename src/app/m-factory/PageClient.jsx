"use client";
import { useState, useEffect, useRef } from "react";
import GalleryGrid from "./GalleryGrid";
import ResortGrid from "./ResortGrid";

/* ─── Banner animations (injected once) ─────────────────── */
const BLINK_STYLE = `
@keyframes mf-border-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes mf-wobble {
  0%, 100% { transform: rotate(-2deg) scale(1); }
  25%       { transform: rotate(1.5deg) scale(1.04); }
  50%       { transform: rotate(-1deg) scale(1.02); }
  75%       { transform: rotate(2deg) scale(1.04); }
}
@keyframes mf-shine {
  0%   { background-position: 0% center; }
  100% { background-position: 200% center; }
}
@keyframes mf-glow {
  0%, 100% { box-shadow: 0 4px 24px rgba(220,38,38,0.55), 0 0 0 0 rgba(255,150,150,0); }
  50%       { box-shadow: 0 4px 52px rgba(255,60,60,1), 0 0 32px rgba(255,150,150,0.55); }
}
.mf-banner-wrap {
  position: relative;
  display: inline-block;
  border-radius: 999px;
  padding: 4px;
  animation: mf-wobble 2.8s ease-in-out infinite;
}
.mf-banner-wrap::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 999px;
  background: conic-gradient(from 0deg, #ffd93d, #ff6b6b, #ffffff, #ffd93d, #ff6b6b, #ffffff, #ffd93d);
  animation: mf-border-spin 1.6s linear infinite;
  z-index: 0;
}
.mf-banner-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.75rem;
  border-radius: 999px;
  background: linear-gradient(90deg, #b91c1c 0%, #ef4444 25%, #fca5a5 50%, #ef4444 75%, #b91c1c 100%);
  background-size: 200% 100%;
  color: #ffffff;
  font-weight: 900;
  font-size: clamp(1.2rem, 2.5vw, 1.6rem);
  text-decoration: none;
  letter-spacing: 0.03em;
  animation: mf-shine 2.5s linear infinite, mf-glow 1.5s ease-in-out infinite;
  cursor: pointer;
}
/* LED billboard */
@keyframes mf-led-flash {
  0%, 45%, 55%, 100% { opacity: 1; text-shadow: 0 0 12px #ff0000, 0 0 28px #ff4444, 0 0 54px #ff0000; }
  50%               { opacity: 0.15; text-shadow: none; }
}
@keyframes mf-dot-run {
  0%   { background: #ff0; box-shadow: 0 0 8px 2px #ff0; }
  33%  { background: #f00; box-shadow: 0 0 8px 2px #f00; }
  66%  { background: #fff; box-shadow: 0 0 8px 2px #fff; }
  100% { background: #ff0; box-shadow: 0 0 8px 2px #ff0; }
}
@keyframes mf-board-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,60,60,0.0), 0 8px 48px rgba(0,0,0,0.7); }
  50%       { box-shadow: 0 0 60px 12px rgba(255,30,30,0.55), 0 8px 48px rgba(0,0,0,0.7); }
}
@keyframes mf-board-pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,200,0,0.0), 0 8px 48px rgba(0,0,0,0.7); }
  50%       { box-shadow: 0 0 60px 12px rgba(255,200,0,0.6), 0 8px 48px rgba(0,0,0,0.7); }
}
@keyframes mf-marquee-left {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes mf-marquee-right {
  from { transform: translateX(-50%); }
  to   { transform: translateX(0); }
}
.mf-track {
  display: flex;
  width: max-content;
  gap: 1.5rem;
  padding-block: 0.5rem;
}
.mf-track-left  { animation: mf-marquee-left  50s linear infinite; }
.mf-track-right { animation: mf-marquee-right 50s linear infinite; }
.mf-track-left:hover,
.mf-track-right:hover { animation-play-state: paused; }
`;
let _blinkInjected = false;
function injectBlink() {
  if (_blinkInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = BLINK_STYLE;
  document.head.appendChild(s);
  _blinkInjected = true;
}

/* ─── Constants ─────────────────────────────────────────── */
const GOLD = "#c9a227";
const NAVY = "#0f172a";
const BLUE = "#1d4ed8";

/* ─── Scroll-reveal hook ─────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Content ────────────────────────────────────────────── */
const CONTENT = {
  th: {
    navServices: "บริการ",
    navGallery: "ภาพโครงการ",
    navResort: "ภาพรีสอร์ท",
    navContact: "ติดต่อเรา",
    brandSub: "โกดัง · โรงงาน · รีสอร์ท",
    heroBadge: "Premium Industrial & Resort",
    heroTitle: "M-Factory",
    heroLine1: "ขาย-ให้เช่าโกดัง โรงงานสำเร็จรูป",
    heroLine2: "พร้อมบริการที่พัก ค้างคืน-ชั่วคราว รีสอร์ทส่วนตัว",
    heroCta: "ติดต่อเรา",
    heroLearnMore: "ดูบริการของเรา",
    servicesBadge: "บริการของเรา",
    servicesHeading: "ครบทุกความต้องการด้านพื้นที่",
    galleryBadge: "ภาพโครงการ",
    galleryHeading: "โกดังและโรงงานที่กำลังก่อสร้าง",
    gallerySub: "สนใจสอบถามราคา นัดเยี่ยมชมโครงการ กรุณาสแกนคิวอาร์โค้ดไลน์",
    galleryCta: "🚨 สนใจเช่า-ซื้อโกดัง คลิก!!",
    resortBadge: "ภาพรีสอร์ท",
    resortHeading: "รีสอร์ทส่วนตัว เงียบสงบ เป็นส่วนตัว",
    bookBtn: "🏨 จองที่พัก คลิก!!",
    contactBadge: "ติดต่อเรา",
    contactHeading: "ติดต่อ M-Factory",
    contactSub: "สนใจเช่าหรือซื้อพื้นที่ ติดต่อเราได้เลย",
    qrLabel: "สแกน QR เพื่อติดต่อผ่าน LINE",
    addressName: "M-Factory & M-Resort",
    addressLine1: "16 ระแหง ซ.ขุนพินิจ อำเภอลาดหลุมแก้ว",
    addressLine2: "ปทุมธานี 12140 ประเทศไทย",
    contactAddressLine1: "222 ซอย คลองโซน 6 ตำบล ลาดหลุมแก้ว",
    contactAddressLine2: "อำเภอลาดหลุมแก้ว ปทุมธานี 12140 ไทย",
    mapsBtn: "ดูแผนที่ Google Maps",
    completedBadge: "✅ พร้อมให้เช่าแล้ว",
    completedTitle: "โครงการที่แล้วเสร็จ พร้อมให้เช่าแล้ว วันนี้",
    completedSub: "เยี่ยมชมสถานที่จริงได้เลย · ติดต่อสอบถามได้ตลอด 24 ชม.",
    completedMapsBtn: "🗺️ ดูแผนที่โครงการ",
    footerText: "© 2026 M-Factory · ขาย-ให้เช่าโกดัง โรงงาน รีสอร์ทส่วนตัว",
    stats: [
      { num: "500+", label: "ลูกค้าที่ไว้วางใจ" },
      { num: "10+", label: "ปีประสบการณ์" },
      { num: "24/7", label: "รักษาความปลอดภัย" },
      { num: "3", label: "ประเภทบริการ" },
    ],
    services: [
      {
        icon: "🏭",
        title: "ให้เช่าโกดัง",
        desc: "พื้นที่โกดังขนาดต่างๆ พร้อมระบบรักษาความปลอดภัย 24 ชั่วโมง เหมาะสำหรับจัดเก็บสินค้าและวัสดุทุกประเภท",
      },
      {
        icon: "🏗️",
        title: "ขาย-ให้เช่าโรงงาน",
        desc: "โรงงานพร้อมใช้งาน ระบบไฟฟ้าครบ รองรับการขยายกิจการอุตสาหกรรม ทั้งแบบให้เช่าและขายขาด",
      },
      {
        icon: "🏖️",
        title: "รีสอร์ทส่วนตัว",
        desc: "บริการที่พักรีสอร์ทส่วนตัวสำหรับพักผ่อนและจัดกิจกรรมองค์กร บรรยากาศเงียบสงบเป็นส่วนตัว",
      },
    ],
    reviewsBadge: "รีวิวจากลูกค้า",
    reviewsHeading: "เสียงจากผู้ใช้บริการจริง",
    reviewsSub: "ความไว้วางใจจากลูกค้ากว่า 500 ราย · คะแนนเฉลี่ย 4.9 / 5.0",
    reviewsTotal: "รีวิวทั้งหมด",
    reviewsVerified: "✓ ยืนยันแล้ว",
    reviews: [
      { name: "คุณสมชาย ปิยะโชติ", role: "เช่าโกดัง", text: "โกดังสะอาด กว้างขวาง ทีมงานใส่ใจลูกค้ามาก รักษาความปลอดภัย 24 ชม. สบายใจมากครับ", rating: 5, avatar: "👨‍💼", date: "มี.ค. 68" },
      { name: "บจก. ไทยโลจิสติกส์", role: "เช่าโกดัง", text: "ใช้งานมา 2 ปีแล้ว พื้นที่ตรงตามความต้องการ ที่จอดรถสะดวก ทำเลดีมากๆ ครับ", rating: 5, avatar: "🏢", date: "ก.พ. 68" },
      { name: "คุณวิไลพร สุขเจริญ", role: "เช่าโรงงาน", text: "โรงงานระบบไฟฟ้าครบ พร้อมใช้งานเลย ไม่ต้องรอนาน คุ้มค่ามากค่ะ แนะนำเลย", rating: 5, avatar: "👩‍💼", date: "เม.ย. 68" },
      { name: "คุณธนาธร วงศ์ชัย", role: "พักรีสอร์ท", text: "บรรยากาศสงบเงียบ สวยงาม เหมาะพักผ่อนสุดๆ พาครอบครัวมาแล้วประทับใจมากครับ", rating: 5, avatar: "👨", date: "ม.ค. 68" },
      { name: "คุณอัมพร แสงจันทร์", role: "เช่าโกดัง", text: "ราคายุติธรรม ทำเลดีใกล้ถนนใหญ่ ขนส่งสะดวก เหมาะสำหรับ SME มากค่ะ", rating: 5, avatar: "👩", date: "มี.ค. 68" },
      { name: "บจก. อีสาน อิมพอร์ต", role: "เช่าโรงงาน", text: "โรงงานได้มาตรฐาน ขยายธุรกิจได้ง่าย ทีมงานให้คำแนะนำดีมาก ประทับใจครับ", rating: 5, avatar: "🏭", date: "ก.พ. 68" },
      { name: "คุณพิชัย รุ่งเรือง", role: "จัดงานองค์กร", text: "จัดสัมมนาบริษัทที่นี่ สถานที่สวยงาม บริการดีเยี่ยม ผู้เข้าร่วมประทับใจทุกคนครับ", rating: 5, avatar: "👨‍💻", date: "เม.ย. 68" },
      { name: "คุณนันทิดา เพ็ชรสมุทร", role: "เช่าโกดัง", text: "กล้องวงจรปิดครบ มีเจ้าหน้าที่ตลอด 24 ชม. ของฝากไว้สบายใจมาก ไม่ต้องกังวลเลยค่ะ", rating: 5, avatar: "👩‍💼", date: "ม.ค. 68" },
      { name: "คุณประเสริฐ ตันติกุล", role: "เช่าโรงงาน", text: "ใช้บริการต่อเนื่อง 3 ปี ไม่เคยผิดหวัง ราคาดี บริการดี ทีมงานพร้อมช่วยเสมอครับ", rating: 5, avatar: "👨‍🔧", date: "มี.ค. 68" },
      { name: "คุณสุภาพร วัฒนศิริ", role: "พักรีสอร์ท", text: "สิ่งอำนวยความสะดวกครบ บรรยากาศดีมาก พาลูกๆ มาพัก ชอบมากเลยค่ะ จะมาอีกแน่นอน", rating: 5, avatar: "👩", date: "ก.พ. 68" },
      { name: "บจก. พรีเมียม สตอเรจ", role: "เช่าโกดัง", text: "ทำเลยอดเยี่ยม ใกล้ทางด่วน รองรับรถบรรทุกขนาดใหญ่ได้ดี ตอบโจทย์ logistics ครับ", rating: 5, avatar: "🏢", date: "เม.ย. 68" },
      { name: "คุณมานะ โชติกเสถียร", role: "เช่าโกดัง", text: "ระบบรักษาความปลอดภัยดีมาก พนักงานสุภาพ ตอบสนองรวดเร็ว ราคาคุ้มค่าครับ", rating: 5, avatar: "👨", date: "ม.ค. 68" },
      { name: "คุณกนกวรรณ ศรีประภา", role: "พักรีสอร์ท", text: "วิวสวย บรรยากาศเงียบสงบ เหมาะพักผ่อนช่วงวันหยุด ราคาเป็นมิตร แนะนำเลยค่ะ", rating: 5, avatar: "👩‍🎨", date: "มี.ค. 68" },
      { name: "คุณรัตนพล ชาญกิจ", role: "เช่าโรงงาน", text: "โรงงานพร้อมใช้งาน ไฟฟ้า 3 เฟส ระบบน้ำครบ ขยายธุรกิจสะดวกมาก ขอบคุณทีมงานครับ", rating: 5, avatar: "👨‍🔬", date: "เม.ย. 68" },
    ],
  },
  zh: {
    navServices: "服务",
    navGallery: "项目图片",
    navResort: "度假村图片",
    navContact: "联系我们",
    brandSub: "仓库 · 工厂 · 度假村",
    heroBadge: "Premium Industrial & Resort",
    heroTitle: "M-Factory",
    heroLine1: "出售/出租仓库及预制工厂",
    heroLine2: "住宿服务 · 私人度假村",
    heroCta: "联系我们",
    heroLearnMore: "了解更多",
    servicesBadge: "我们的服务",
    servicesHeading: "满足您的所有空间需求",
    galleryBadge: "项目图片",
    galleryHeading: "在建仓库及工厂",
    gallerySub: "如有意向，请扫描LINE二维码和我们预约参观",
    galleryCta: "🚨 有意租购仓库，请点击!!",
    resortBadge: "度假村图片",
    resortHeading: "私人度假村 · 宁静私密",
    bookBtn: "🏨 预订住宿 — 点击!!",
    contactBadge: "联系我们",
    contactHeading: "联系 M-Factory",
    contactSub: "有意租赁或购买场地？请立即联系我们",
    qrLabel: "扫描二维码通过LINE联系",
    addressName: "M-Factory & M-Resort",
    addressLine1: "16 Rahang, Soi Khunphinit, Lat Lum Kaeo",
    addressLine2: "Pathum Thani 12140, Thailand",
    contactAddressLine1: "222 Soi Khlong Zone 6, Tambon Lat Lum Kaeo",
    contactAddressLine2: "Lat Lum Kaeo, Pathum Thani 12140, Thailand",
    mapsBtn: "查看谷歌地图",
    completedBadge: "✅ 已竣工可出租",
    completedTitle: "已竣工项目 · 即日起可出租",
    completedSub: "欢迎现场参观 · 全天候24小时咨询服务",
    completedMapsBtn: "🗺️ 查看项目地图",
    footerText: "© 2026 M-Factory · 仓库 · 工厂 · 私人度假村",
    stats: [
      { num: "500+", label: "信任客户" },
      { num: "10+", label: "年经验" },
      { num: "24/7", label: "安保服务" },
      { num: "3", label: "服务类型" },
    ],
    services: [
      {
        icon: "🏭",
        title: "仓库出租",
        desc: "各种尺寸的仓库，配备24小时安保系统，适合存放各类货物和材料。",
      },
      {
        icon: "🏗️",
        title: "工厂出售/出租",
        desc: "配备完整电力系统的即用工厂，支持工业业务扩展，可租可售。",
      },
      {
        icon: "🏖️",
        title: "私人度假村",
        desc: "提供私人度假村住宿，适合休闲度假和企业活动，环境安静私密。",
      },
    ],
    reviewsBadge: "客户评价",
    reviewsHeading: "来自真实客户的声音",
    reviewsSub: "500+满意客户 · 平均评分 4.9 / 5.0",
    reviewsTotal: "总评价",
    reviewsVerified: "✓ 已验证",
    reviews: [
      { name: "Somchai P. 先生", role: "仓库租赁", text: "仓库干净宽敞，工作人员细心，24小时安保，非常放心。", rating: 5, avatar: "👨‍💼", date: "3月 25" },
      { name: "泰国物流公司", role: "仓库租赁", text: "使用2年了，空间符合需求，停车方便，位置很好。", rating: 5, avatar: "🏢", date: "2月 25" },
      { name: "Wilaiporn S. 女士", role: "工厂租赁", text: "工厂电力系统完备，即可使用，性价比极高。", rating: 5, avatar: "👩‍💼", date: "4月 25" },
      { name: "Thanathorn W. 先生", role: "度假村住宿", text: "环境安静优美，非常适合家庭度假，印象深刻！", rating: 5, avatar: "👨", date: "1月 25" },
      { name: "Amporn S. 女士", role: "仓库租赁", text: "价格合理，紧邻主干道，运输方便，适合中小企业。", rating: 5, avatar: "👩", date: "3月 25" },
      { name: "东北进口公司", role: "工厂租赁", text: "标准工厂，便于业务扩展，团队给予了很好的建议。", rating: 5, avatar: "🏭", date: "2月 25" },
      { name: "Pichai R. 先生", role: "企业活动", text: "在这里举办了公司研讨会，场地漂亮，服务一流，所有人都很满意。", rating: 5, avatar: "👨‍💻", date: "4月 25" },
      { name: "Nantida P. 女士", role: "仓库租赁", text: "全天候闭路电视，24小时驻守人员，货物非常安全。", rating: 5, avatar: "👩‍💼", date: "1月 25" },
      { name: "Prasert T. 先生", role: "工厂租赁", text: "连续使用3年，从未失望，价格好，团队很专业。", rating: 5, avatar: "👨‍🔧", date: "3月 25" },
      { name: "Supaporn W. 女士", role: "度假村住宿", text: "设施齐全，环境优美，带孩子来玩，大家都很喜欢，还会再来！", rating: 5, avatar: "👩", date: "2月 25" },
      { name: "高级仓储公司", role: "仓库租赁", text: "地处高速公路附近，大型卡车进出方便，非常适合物流。", rating: 5, avatar: "🏢", date: "4月 25" },
      { name: "Mana C. 先生", role: "仓库租赁", text: "安保系统完善，员工礼貌，响应迅速，物超所值。", rating: 5, avatar: "👨", date: "1月 25" },
      { name: "Kanokwan S. 女士", role: "度假村住宿", text: "风景美丽，宁静祥和，非常适合节假日休息，强烈推荐！", rating: 5, avatar: "👩‍🎨", date: "3月 25" },
      { name: "Rattanapol C. 先生", role: "工厂租赁", text: "配备三相电和完整供水系统，扩展业务很方便。", rating: 5, avatar: "👨‍🔬", date: "4月 25" },
    ],
  },
  en: {
    navServices: "Services",
    navGallery: "Gallery",
    navResort: "Resort Photos",
    navContact: "Contact",
    brandSub: "Warehouse · Factory · Resort",
    heroBadge: "Premium Industrial & Resort",
    heroTitle: "M-Factory",
    heroLine1: "Warehouse & Ready-Built Factory",
    heroLine2: "For Sale & Rent · Private Resort Stay",
    heroCta: "Contact Us",
    heroLearnMore: "Explore Services",
    servicesBadge: "Our Services",
    servicesHeading: "Complete Space Solutions",
    galleryBadge: "Project Gallery",
    galleryHeading: "Warehouses & Factories Under Construction",
    gallerySub: "Interested in pricing or a site visit? Scan the LINE QR code to get in touch.",
    galleryCta: "🚨 Interested in Rent / Buy — Click!!",
    resortBadge: "Resort Gallery",
    resortHeading: "Private Resort — Peaceful & Exclusive",
    bookBtn: "🏨 Book a Stay — Click!!",
    contactBadge: "Get In Touch",
    contactHeading: "Contact M-Factory",
    contactSub: "Interested in renting or buying a space? Contact us today",
    qrLabel: "Scan QR to contact via LINE",
    addressName: "M-Factory & M-Resort",
    addressLine1: "16 Rahang, Soi Khunphinit, Lat Lum Kaeo",
    addressLine2: "Pathum Thani 12140, Thailand",
    contactAddressLine1: "222 Soi Khlong Zone 6, Tambon Lat Lum Kaeo",
    contactAddressLine2: "Lat Lum Kaeo, Pathum Thani 12140, Thailand",
    mapsBtn: "View on Google Maps",
    completedBadge: "✅ Available for Rent Now",
    completedTitle: "Completed Project — Ready to Rent Today",
    completedSub: "Visit the site in person · Inquiries open 24/7",
    completedMapsBtn: "🗺️ View Project on Map",
    footerText: "© 2026 M-Factory · Warehouse · Factory · Private Resort",
    stats: [
      { num: "500+", label: "Trusted Clients" },
      { num: "10+", label: "Years Experience" },
      { num: "24/7", label: "Security Service" },
      { num: "3", label: "Service Types" },
    ],
    services: [
      {
        icon: "🏭",
        title: "Warehouse Rental",
        desc: "Various warehouse sizes with 24-hour security systems, suitable for storing goods and materials of all types.",
      },
      {
        icon: "🏗️",
        title: "Factory Sale & Rental",
        desc: "Ready-to-use factories with full electrical systems, supporting industrial business expansion — rent or outright purchase.",
      },
      {
        icon: "🏖️",
        title: "Private Resort",
        desc: "Private resort accommodation for relaxation and corporate events, in a quiet and peaceful environment.",
      },
    ],
    reviewsBadge: "Customer Reviews",
    reviewsHeading: "Trusted by Hundreds of Clients",
    reviewsSub: "500+ satisfied clients · Average rating 4.9 / 5.0",
    reviewsTotal: "Total Reviews",
    reviewsVerified: "✓ Verified",
    reviews: [
      { name: "Mr. Somchai P.", role: "Warehouse Rental", text: "Clean, spacious warehouse with attentive staff and 24-hour security. Truly peace of mind.", rating: 5, avatar: "👨‍💼", date: "Mar 25" },
      { name: "Thai Logistics Co.", role: "Warehouse Rental", text: "Been using for 2 years. Great location, easy truck access, exactly what we needed.", rating: 5, avatar: "🏢", date: "Feb 25" },
      { name: "Ms. Wilaiporn S.", role: "Factory Rental", text: "Factory fully equipped with electrical systems, ready to use immediately. Excellent value.", rating: 5, avatar: "👩‍💼", date: "Apr 25" },
      { name: "Mr. Thanathorn W.", role: "Resort Stay", text: "Peaceful and beautiful atmosphere, perfect for family getaways. Very impressed!", rating: 5, avatar: "👨", date: "Jan 25" },
      { name: "Ms. Amporn S.", role: "Warehouse Rental", text: "Fair pricing, excellent location near main road. Perfect for SME businesses.", rating: 5, avatar: "👩", date: "Mar 25" },
      { name: "Isan Import Co.", role: "Factory Rental", text: "Standard factory ready for industry. Team gave great guidance for expansion.", rating: 5, avatar: "🏭", date: "Feb 25" },
      { name: "Mr. Pichai R.", role: "Corporate Event", text: "Held our company seminar here — beautiful venue, excellent service, all attendees loved it.", rating: 5, avatar: "👨‍💻", date: "Apr 25" },
      { name: "Ms. Nantida P.", role: "Warehouse Rental", text: "Full CCTV coverage and staff on-site 24 hours. My goods are always safe here.", rating: 5, avatar: "👩‍💼", date: "Jan 25" },
      { name: "Mr. Prasert T.", role: "Factory Rental", text: "3 consecutive years of service, never disappointed. Great price, great team.", rating: 5, avatar: "👨‍🔧", date: "Mar 25" },
      { name: "Ms. Supaporn W.", role: "Resort Stay", text: "Great amenities, lovely atmosphere. Brought the kids and we all loved it. Coming back!", rating: 5, avatar: "👩", date: "Feb 25" },
      { name: "Premium Storage Co.", role: "Warehouse Rental", text: "Ideal location near expressway, handles large trucks easily. Perfect for logistics.", rating: 5, avatar: "🏢", date: "Apr 25" },
      { name: "Mr. Mana C.", role: "Warehouse Rental", text: "Excellent security system, polite staff, fast response. Well worth every baht.", rating: 5, avatar: "👨", date: "Jan 25" },
      { name: "Ms. Kanokwan S.", role: "Resort Stay", text: "Beautiful views, quiet and serene, perfect for holiday rest. Highly recommend!", rating: 5, avatar: "👩‍🎨", date: "Mar 25" },
      { name: "Mr. Rattanapol C.", role: "Factory Rental", text: "Factory with 3-phase power and full water systems. Made expanding my business easy.", rating: 5, avatar: "👨‍🔬", date: "Apr 25" },
    ],
  },
};

/* ─── Section Header ─────────────────────────────────────── */
function SectionHeader({ badge, heading }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        marginBottom: "3rem",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "0.4rem 1.2rem",
          borderRadius: 999,
          background: "linear-gradient(135deg, rgba(201,162,39,0.14), rgba(29,78,216,0.08))",
          border: "1px solid rgba(201,162,39,0.35)",
          color: GOLD,
          fontSize: "0.9rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginBottom: "1rem",
        }}
      >
        {badge}
      </div>
      <h2
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
          fontWeight: 900,
          margin: 0,
          color: NAVY,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        {heading}
      </h2>
      <div
        style={{
          width: 56,
          height: 4,
          background: "linear-gradient(90deg, #1d4ed8, #c9a227)",
          borderRadius: 999,
          margin: "1rem auto 0",
        }}
      />
    </div>
  );
}

/* ─── Service Card ───────────────────────────────────────── */
function ServiceCard({ service, index }) {
  const [ref, visible] = useReveal();
  const [hovered, setHovered] = useState(false);

  const accents = [
    { bg: "rgba(29,78,216,0.07)", border: "rgba(29,78,216,0.2)", bar: "linear-gradient(90deg, #1d4ed8, #60a5fa)" },
    { bg: "rgba(201,162,39,0.08)", border: "rgba(201,162,39,0.25)", bar: "linear-gradient(90deg, #c9a227, #fde68a)" },
    { bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.2)", bar: "linear-gradient(90deg, #059669, #6ee7b7)" },
  ];
  const ac = accents[index % accents.length];

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        borderRadius: "1.75rem",
        padding: "2rem",
        border: hovered ? "1px solid rgba(201,162,39,0.45)" : "1px solid rgba(37,99,235,0.1)",
        boxShadow: hovered
          ? "0 28px 64px rgba(15,23,42,0.14), 0 8px 24px rgba(201,162,39,0.1)"
          : "0 4px 28px rgba(15,23,42,0.06)",
        transform: visible
          ? hovered ? "translateY(-10px)" : "translateY(0)"
          : "translateY(40px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.35s ease, box-shadow 0.3s ease, border-color 0.3s ease`,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 4,
          background: ac.bar,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          borderRadius: "1.75rem 1.75rem 0 0",
        }}
      />
      <div
        style={{
          width: 64, height: 64,
          borderRadius: "1.25rem",
          background: ac.bg,
          border: "1px solid " + ac.border,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem",
          marginBottom: "1.25rem",
          transition: "transform 0.35s ease",
          transform: hovered ? "scale(1.1) rotate(6deg)" : "scale(1) rotate(0deg)",
        }}
      >
        {service.icon}
      </div>
      <h3
        style={{
          fontSize: "1.2rem", fontWeight: 800,
          color: NAVY, margin: "0 0 0.75rem",
          letterSpacing: "-0.01em",
        }}
      >
        {service.title}
      </h3>
      <p style={{ color: "#475569", lineHeight: 1.8, margin: 0, fontSize: "1rem" }}>
        {service.desc}
      </p>
    </div>
  );
}

/* ─── LED Billboard ──────────────────────────────────────── */
const DOT_COUNT = 22;
function LedBillboard({ text, theme = "red" }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 180);
    return () => clearInterval(id);
  }, []);

  const isGold = theme === "gold";
  // dot colors per theme
  const dotColors = isGold
    ? ["#ffd700", "#ffaa00", "#ffffff"]
    : ["#ffe000", "#ff2222", "#ffffff"];
  const dotGlows = isGold
    ? ["0 0 8px 3px #ffd700", "0 0 8px 3px #ffaa00", "0 0 8px 3px #fff"]
    : ["0 0 8px 3px #ffe000", "0 0 8px 3px #ff2222", "0 0 8px 3px #fff"];
  const textColor = "#111111";
  const textGlow = "0 1px 4px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)";
  const cornerColor = isGold ? "rgba(255,200,0,0.18)" : "rgba(255,40,40,0.18)";
  const subText = isGold ? "▶ คลิกเพื่อจองที่พักผ่าน LINE ◀" : "▶ คลิกเพื่อติดต่อผ่าน LINE ◀";
  const subColor = isGold ? "#7c5500" : "#991b1b";
  const borderColor = isGold ? "#2a2200" : "#1a1a1a";
  const pulseAnim = isGold
    ? "mf-board-pulse-gold 1.6s ease-in-out infinite"
    : "mf-board-pulse 1.6s ease-in-out infinite";

  const dots = Array.from({ length: DOT_COUNT });

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        background: "transparent",
        borderRadius: "1.5rem",
        padding: "1.5rem clamp(0.75rem, 3vw, 3.5rem)",
        border: "none",
        animation: pulseAnim,
        cursor: "pointer",
        overflow: "visible",
        minWidth: "min(96vw, 780px)",
      }}
    >
      {/* Running dot lights — top row */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", gap: "calc((100% - 22px) / 23)" }}>
        {dots.map((_, i) => {
          const phase = (i + tick) % 3;
          return (
            <div key={i} style={{
              width: 10, height: 10,
              borderRadius: "50%",
              background: dotColors[phase],
              boxShadow: dotGlows[phase],
              flexShrink: 0,
            }} />
          );
        })}
      </div>

      {/* Running dot lights — bottom row */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", gap: "calc((100% - 22px) / 23)" }}>
        {dots.map((_, i) => {
          const phase = ((DOT_COUNT - i) + tick) % 3;
          return (
            <div key={i} style={{
              width: 10, height: 10,
              borderRadius: "50%",
              background: dotColors[phase],
              boxShadow: dotGlows[phase],
              flexShrink: 0,
            }} />
          );
        })}
      </div>

      {/* Main text */}
      <div style={{
        fontSize: "clamp(1.3rem, 5.5vw, 4rem)",
        fontWeight: 900,
        color: textColor,
        letterSpacing: "0.04em",
        lineHeight: 1.2,
        textAlign: "center",
        animation: "mf-led-flash 1.2s ease-in-out infinite",
        fontFamily: "'Kanit', 'Itim', 'Inter', sans-serif",
        paddingBlock: "0.75rem",
        textShadow: textGlow,
        WebkitTextStroke: "0px transparent",
      }}>
        {text}
      </div>

    </div>
  );
}

/* ─── Review Card ───────────────────────────────────────── */
function ReviewCard({ review }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 288,
        flexShrink: 0,
        background: "#ffffff",
        borderRadius: "1.5rem",
        padding: "1.5rem",
        border: hovered ? "1.5px solid rgba(201,162,39,0.5)" : "1.5px solid rgba(37,99,235,0.1)",
        boxShadow: hovered
          ? "0 16px 48px rgba(15,23,42,0.13), 0 4px 12px rgba(201,162,39,0.1)"
          : "0 4px 20px rgba(15,23,42,0.07)",
        transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <div style={{ color: "#f59e0b", fontSize: "1.05rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
      </div>
      <p style={{ color: "#334155", fontSize: "0.93rem", lineHeight: 1.8, margin: "0 0 1.25rem", minHeight: 80 }}>
        &ldquo;{review.text}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #e0e7ff, #fef3c7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", flexShrink: 0,
            border: "2px solid rgba(201,162,39,0.3)",
          }}
        >
          {review.avatar}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: "0.92rem" }}>{review.name}</div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.15rem" }}>{review.role} · {review.date}</div>
        </div>
      </div>
    </div>
  );
}

const LANG_KEY = "goeun-agency-language";

/* ─── Main Page ──────────────────────────────────────────── */
export default function PageClient() {
  const [lang, setLang] = useState("th");
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = CONTENT[lang] ?? CONTENT.th;

  // Load saved language on mount
  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && CONTENT[saved]) setLang(saved);
  }, []);

  // Persist language on change
  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    injectBlink();
    const onScroll = () => setScrolled(window.scrollY > 60);
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Itim', 'Inter', sans-serif",
        background: "#f8faff",
        color: NAVY,
      }}
    >
      {/* ── Navbar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: scrolled ? "rgba(255,255,255,0.88)" : "#ffffff",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(201,162,39,0.25)"
            : "1px solid rgba(37,99,235,0.08)",
          boxShadow: scrolled
            ? "0 4px 32px rgba(15,23,42,0.12)"
            : "0 2px 16px rgba(29,86,232,0.07)",
          padding: isMobile ? "0.75rem 1rem" : "0.875rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div
            style={{
              width: 50, height: 50,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <span
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: "1.75rem", fontWeight: 900,
                color: GOLD, lineHeight: 1,
                letterSpacing: "-0.05em",
                textShadow: "0 2px 8px rgba(201,162,39,0.5)",
              }}
            >
              M
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: NAVY, letterSpacing: "-0.01em" }}>
              M-Factory
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", letterSpacing: "0.08em" }}>
              {t.brandSub}
            </div>
          </div>
        </div>

        {!isMobile ? (
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: t.navServices, href: "#services" },
              { label: t.navGallery, href: "#gallery" },
              { label: t.navResort, href: "#resort" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                style={{
                  color: "#334155", fontSize: "1rem", fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
            <a
              href="#contact"
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: 999,
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                color: "#fff", fontSize: "1rem", fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(15,23,42,0.22)",
                border: "1px solid rgba(201,162,39,0.25)",
              }}
            >
              {t.navContact}
            </a>
            <div style={{ display: "flex", gap: 4 }}>
              {[["th", "TH"], ["en", "EN"], ["zh", "中文"]].map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)}
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: 999,
                    border: "2px solid " + GOLD,
                    background: lang === l ? GOLD : "transparent",
                    color: lang === l ? NAVY : GOLD,
                    fontSize: "0.82rem", fontWeight: 700,
                    cursor: "pointer", letterSpacing: "0.03em",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[["th", "TH"], ["en", "EN"], ["zh", "中"]].map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)}
                  style={{
                    padding: "0.3rem 0.55rem",
                    borderRadius: 999,
                    border: "2px solid " + GOLD,
                    background: lang === l ? GOLD : "transparent",
                    color: lang === l ? NAVY : GOLD,
                    fontSize: "0.78rem", fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >{label}</button>
              ))}
            </div>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: "transparent",
                border: "2px solid " + NAVY,
                borderRadius: 8,
                padding: "0.35rem 0.6rem",
                cursor: "pointer",
                fontSize: "1.25rem",
                color: NAVY,
                lineHeight: 1,
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        )}
        {isMobile && menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "2px solid rgba(201,162,39,0.25)",
              boxShadow: "0 8px 32px rgba(15,23,42,0.15)",
              padding: "0.5rem 1.5rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              zIndex: 199,
            }}
          >
            {[
              { label: t.navServices, href: "#services" },
              { label: t.navGallery, href: "#gallery" },
              { label: t.navResort, href: "#resort" },
              { label: t.navContact, href: "#contact" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  color: NAVY,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "0.9rem 0",
                  borderBottom: "1px solid rgba(37,99,235,0.08)",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b4b 40%, #0a2580 75%, #0a0f1e 100%)",
          color: "#fff",
          padding: "clamp(4.5rem, 10vw, 8rem) 1.25rem clamp(4rem, 8vw, 7rem)",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", top: "-15%", right: "-8%",
            width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,162,39,0.14) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-25%", left: "-12%",
            width: 700, height: 700, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", top: "30%", left: "20%",
            width: 300, height: 300, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.45rem 1.4rem", borderRadius: 999,
              background: "rgba(201,162,39,0.12)",
              border: "1px solid rgba(201,162,39,0.4)",
              color: GOLD, fontSize: "0.9rem", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              marginBottom: "1.75rem",
            }}
          >
            ✦ {t.heroBadge}
          </div>

          <h1
            style={{
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              fontWeight: 900, lineHeight: 1.05,
              margin: "0 0 1.5rem",
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #ffffff 20%, #c9a227 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t.heroTitle}
          </h1>

          <p
            style={{
              fontSize: "clamp(1.15rem, 2.5vw, 1.55rem)",
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.75,
              maxWidth: 640,
              margin: "0 auto 2.75rem",
              fontWeight: 500,
            }}
          >
            {t.heroLine1}
            <br />
            <span style={{ color: GOLD, fontWeight: 700 }}>{t.heroLine2}</span>
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#contact"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "1rem 2.5rem", borderRadius: 999,
                background: "linear-gradient(135deg, #c9a227 0%, #e6c040 100%)",
                color: NAVY, fontWeight: 800, fontSize: "1.1rem",
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(201,162,39,0.4), 0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {t.heroCta} →
            </a>
            <a
              href="https://lin.ee/xrAU8PC"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "1rem 2.5rem", borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(201,162,39,0.5)",
                color: "#c9a227", fontWeight: 700, fontSize: "1.05rem",
                textDecoration: "none",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              {t.bookBtn}
            </a>
            <a
              href="#services"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "1rem 2.5rem", borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#fff", fontWeight: 600, fontSize: "1.05rem",
                textDecoration: "none",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              {t.heroLearnMore}
            </a>
          </div>
        </div>

        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(to bottom, transparent, #f8faff)",
            pointerEvents: "none",
          }}
        />
      </section>

      {/* ── Stats bar ── */}
      <section
        style={{
          background: "#ffffff",
          padding: "2.25rem 2rem",
          borderBottom: "1px solid rgba(37,99,235,0.07)",
          boxShadow: "0 4px 28px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            textAlign: "center",
          }}
        >
          {t.stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: "0.75rem",
                borderRight: i < t.stats.length - 1 ? "1px solid rgba(37,99,235,0.08)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: "2.25rem", fontWeight: 900, lineHeight: 1.1,
                  background: "linear-gradient(135deg, #1d4ed8 0%, #c9a227 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.num}
              </div>
              <div style={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 500, marginTop: "0.3rem" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{ padding: "5.5rem 2rem", background: "#f8faff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeader badge={t.servicesBadge} heading={t.servicesHeading} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.75rem",
            }}
          >
            {t.services.map((s, i) => (
              <ServiceCard key={s.title} service={s} index={i} />
            ))}
          </div>

          {/* ── Completed project banner ── */}
          <div
            style={{
              marginTop: "3rem",
              borderRadius: "1.25rem",
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)",
              padding: "2rem 2.5rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.25rem",
              boxShadow: "0 8px 40px rgba(15,23,42,0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              {/* Badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1.4rem",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #16a34a, #22c55e, #86efac, #22c55e, #16a34a)",
                  backgroundSize: "200% auto",
                  animation: "badgeShine 2.5s linear infinite",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 18px rgba(34,197,94,0.7), 0 0 40px rgba(34,197,94,0.35)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                }}
              >
                {t.completedBadge}
              </span>
              <div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "clamp(1.05rem, 2.2vw, 1.35rem)", lineHeight: 1.3 }}>
                  {t.completedTitle}
                </div>
                <div style={{ color: "#93c5fd", fontSize: "0.9rem", marginTop: "0.3rem" }}>
                  {t.completedSub}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  📍 {t.addressLine1} {t.addressLine2}
                </div>
                <div style={{ marginTop: "0.75rem", borderRadius: "0.75rem", overflow: "hidden", width: "100%", maxWidth: 360, height: 150, border: "1px solid rgba(255,255,255,0.15)" }}>
                  <iframe
                    src="https://maps.google.com/maps?q=13.99537020328643,100.38539160043001&output=embed&z=16"
                    width="100%"
                    height="150"
                    style={{ border: 0, display: "block" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="M-Factory Location"
                  />
                </div>
              </div>
            </div>
            <a
              href="https://maps.app.goo.gl/ujm6nE1CU3JKJHbx6"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.75rem",
                borderRadius: 999,
                background: "linear-gradient(135deg, #c9a227 0%, #e6c040 100%)",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 18px rgba(201,162,39,0.45)",
              }}
            >
              {t.completedMapsBtn}
            </a>
          </div>

          {/* ── Service preview photos ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginTop: "1.25rem",
            }}
          >
            {[
              "/m-factory/S__27058264.jpg",
              "/m-factory/S__26886151.jpg",
              "/m-factory/13976.jpg",
            ].map((src, i) => (
              <div key={src} style={{ borderRadius: "1.25rem", overflow: "hidden", boxShadow: "0 6px 32px rgba(15,23,42,0.13)" }}>
                <img
                  src={src}
                  alt="M-Factory โครงการพร้อมให้เช่า"
                  style={{
                    width: "100%", height: "auto", display: "block",
                    filter: i === 0 ? "brightness(1.12) saturate(1.35) contrast(1.08)" : "none",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section id="gallery" style={{ padding: "5.5rem 2rem", background: "#ffffff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeader badge={t.galleryBadge} heading={t.galleryHeading} />

          {/* Gallery sub text + LINE QR */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "1.25rem", flexWrap: "wrap",
            margin: "-0.5rem auto 2rem",
            maxWidth: 560,
            padding: "1.25rem 1.5rem",
            borderRadius: "1.25rem",
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "2px solid #86efac",
            boxShadow: "0 4px 20px rgba(34,197,94,0.15)",
          }}>
            <img
              src="/m-factory/line-qr.jpg"
              alt="LINE QR Code"
              style={{ width: 90, height: 90, borderRadius: "0.75rem", flexShrink: 0, objectFit: "cover", border: "2px solid #22c55e" }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#15803d", marginBottom: "0.35rem" }}>
                📍 {t.gallerySub}
              </div>
              <a
                href="https://lin.ee/xrAU8PC"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1.25rem", borderRadius: 999,
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(34,197,94,0.4)",
                }}
              >
                💬 LINE
              </a>
            </div>
          </div>

          {/* LED Billboard banner */}
          <div style={{ textAlign: "center", marginBottom: "3rem", marginTop: "-0.5rem" }}>
            <a
              href="https://lin.ee/xrAU8PC"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              <LedBillboard text={t.galleryCta} />
            </a>
          </div>

          <GalleryGrid />
        </div>
      </section>

      {/* ── Resort Gallery ── */}
      <section id="resort" style={{ padding: "5.5rem 2rem", background: "#f8faff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeader badge={t.resortBadge} heading={t.resortHeading} />
          {/* Pricing */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.75rem", marginTop: "-0.5rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.65rem",
              padding: "0.75rem 1.5rem", borderRadius: 999,
              background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
              border: "2px solid #f59e0b",
              boxShadow: "0 4px 18px rgba(245,158,11,0.2)",
            }}>
              <span style={{ fontSize: "1.4rem" }}>🌅</span>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>ค่าที่พัก ชั่วคราว</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#b45309" }}>เริ่มต้นเพียง <span style={{ color: "#d97706", fontSize: "1.35rem" }}>300</span> บาท</div>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.65rem",
              padding: "0.75rem 1.5rem", borderRadius: 999,
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              border: "2px solid #3b82f6",
              boxShadow: "0 4px 18px rgba(59,130,246,0.2)",
            }}>
              <span style={{ fontSize: "1.4rem" }}>🌙</span>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#1e3a8a", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>ค้างคืน</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#1d4ed8" }}>เริ่มต้นเพียง <span style={{ color: "#2563eb", fontSize: "1.35rem" }}>800</span> บาท</div>
              </div>
            </div>
          </div>
          {/* Book button below heading */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <a
              href="https://lin.ee/xrAU8PC"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              <LedBillboard text={t.bookBtn} theme="gold" />
            </a>
          </div>
          <ResortGrid />
        </div>
      </section>

      {/* ── Reviews ── */}
      <section id="reviews" style={{ padding: "5.5rem 0", background: "#f0f4ff", overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingInline: "2rem" }}>
          <SectionHeader badge={t.reviewsBadge} heading={t.reviewsHeading} />
          <p style={{ textAlign: "center", color: "#64748b", fontSize: "1rem", marginTop: "-1.5rem", marginBottom: "2rem" }}>
            {t.reviewsSub}
          </p>
          <div style={{ textAlign: "center", marginBottom: "3.5rem", marginTop: "-1rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <div>
                <div style={{ fontSize: "4.5rem", fontWeight: 900, lineHeight: 1, background: "linear-gradient(135deg, #c9a227, #e6c040)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>4.9</div>
                <div style={{ color: "#f59e0b", fontSize: "1.75rem", letterSpacing: "0.12em" }}>★★★★★</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.9 }}>
                  {[5,4,3,2,1].map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "#64748b", width: 12 }}>{s}</span>
                      <div style={{ width: 120, height: 7, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", width: s === 5 ? "92%" : s === 4 ? "6%" : "1%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderLeft: "1px solid rgba(37,99,235,0.15)", paddingLeft: "1.5rem" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: NAVY }}>500+</div>
                <div style={{ fontSize: "0.9rem", color: "#64748b" }}>{t.reviewsTotal}</div>
                <div style={{ marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.9rem", borderRadius: 999, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>
                  {t.reviewsVerified}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1 — scroll left */}
        <div style={{ overflow: "hidden", marginBottom: "1.5rem" }}>
          <div className="mf-track mf-track-left">
            {[...t.reviews.slice(0, 7), ...t.reviews.slice(0, 7)].map((r, i) => (
              <ReviewCard key={i} review={r} />
            ))}
          </div>
        </div>

        {/* Row 2 — scroll right */}
        <div style={{ overflow: "hidden" }}>
          <div className="mf-track mf-track-right">
            {[...t.reviews.slice(7), ...t.reviews.slice(7)].map((r, i) => (
              <ReviewCard key={i} review={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section
        id="contact"
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b4b 45%, #0a0f1e 100%)",
          padding: "6rem 2rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", top: "-20%", right: "-5%",
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,162,39,0.1) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-20%", left: "-8%",
            width: 450, height: 450, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(29,78,216,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              display: "inline-block",
              padding: "0.45rem 1.25rem", borderRadius: 999,
              background: "rgba(201,162,39,0.12)",
              border: "1px solid rgba(201,162,39,0.38)",
              color: GOLD, fontSize: "0.9rem", fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            ✦ {t.contactBadge}
          </div>

          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 900,
              margin: "0 0 0.75rem",
              background: "linear-gradient(135deg, #ffffff 20%, #c9a227 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
            }}
          >
            {t.contactHeading}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1.1rem", margin: "0 0 3rem" }}>
            {t.contactSub}
          </p>

          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "2rem",
              padding: "2.75rem 2.25rem",
              boxShadow: "0 40px 80px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", marginBottom: "2.25rem",
              }}
            >
              <div
                style={{
                  padding: 14,
                  background: "#ffffff",
                  borderRadius: "1.5rem",
                  border: "3px solid " + GOLD,
                  boxShadow: "0 16px 48px rgba(201,162,39,0.35), 0 4px 16px rgba(0,0,0,0.25)",
                }}
              >
                <img
                  src="/m-factory/line-qr.jpg"
                  alt="LINE QR Code M-Factory"
                  style={{
                    width: 180, height: 180,
                    objectFit: "cover",
                    borderRadius: "0.875rem",
                    display: "block",
                  }}
                />
              </div>
              <div style={{ marginTop: "1rem", color: GOLD, fontSize: "1rem", fontWeight: 600 }}>
                📲 {t.qrLabel}
              </div>
            </div>

            <div
              style={{
                display: "flex", gap: "1rem",
                justifyContent: "center", flexWrap: "wrap",
                marginBottom: "1.75rem",
              }}
            >
              <a
                href="tel:+660952411833"
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.85rem 1.5rem", borderRadius: 999,
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#fff", fontWeight: 600, fontSize: "1rem",
                  textDecoration: "none",
                }}
              >
                📞 095-241-1833
              </a>
              <a
                href="mailto:m.factoryandresort@gmail.com"
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.85rem 1.5rem", borderRadius: 999,
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#fff", fontWeight: 600, fontSize: "0.9rem",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                ✉️ m.factoryandresort@gmail.com
              </a>
            </div>

            <div
              style={{
                padding: "1.5rem",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "1.25rem",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: GOLD, marginBottom: "0.5rem" }}>
                📍 {t.addressName}
              </div>
              <div
                style={{
                  fontSize: "1rem", color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.75, marginBottom: "1.25rem",
                }}
              >
                {t.contactAddressLine1}
                <br />
                {t.contactAddressLine2}
              </div>
              <div style={{ borderRadius: "0.9rem", overflow: "hidden", marginBottom: "1.25rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                <iframe
                  src="https://maps.google.com/maps?q=14.0033987,100.3960986&output=embed&z=16"
                  width="100%"
                  height="240"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="M-Factory Location"
                />
              </div>
              <a
                href="https://www.google.com/maps/dir//%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%97%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%E0%B8%89%E0%B8%B1%E0%B8%99+%E0%B9%80%E0%B8%AD%E0%B9%87%E0%B8%A1%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%97+%E0%B9%80%E0%B8%AD%E0%B9%87%E0%B8%A1%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%97+222+%E0%B8%8B%E0%B8%AD%E0%B8%A2+%E0%B8%84%E0%B8%A5%E0%B8%AD%E0%B8%87%E0%B9%82%E0%B8%8B%E0%B8%99+6+%E0%B8%95%E0%B8%B3%E0%B8%9A%E0%B8%A5+%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%AB%E0%B8%A5%E0%B8%B8%E0%B8%A1%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%A7+%E0%B8%AD%E0%B8%B3%E0%B9%80%E0%B8%A0%E0%B8%AD%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%AB%E0%B8%A5%E0%B8%B8%E0%B8%A1%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%A7+%E0%B8%9B%E0%B8%97%E0%B8%B8%E0%B8%A1%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%B5+12140+%E0%B9%84%E0%B8%97%E0%B8%A2/data=!4m8!4m7!1m0!1m5!1m1!1s0x30e2894cd7823cdd:0xc1fa41978d8c6b19!2m2!1d100.3960986!2d14.0033987?entry=ttu&g_ep=EgoyMDI2MDQyMi4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.75rem 1.75rem", borderRadius: 999,
                  background: "linear-gradient(135deg, #c9a227 0%, #e6c040 100%)",
                  color: NAVY, fontWeight: 700, fontSize: "1rem",
                  textDecoration: "none",
                  boxShadow: "0 6px 24px rgba(201,162,39,0.4)",
                }}
              >
                🗺️ {t.mapsBtn}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          background: NAVY,
          padding: "2rem",
          textAlign: "center",
          color: "rgba(255,255,255,0.45)",
          fontSize: "0.95rem",
          borderTop: "1px solid rgba(201,162,39,0.18)",
        }}
      >
        <span style={{ color: GOLD, fontWeight: 700 }}>M-Factory</span>
        {" · "}
        {t.footerText.replace(/^© 2026 M-Factory · /, "")}
      </footer>
    </div>
  );
}
