"use client";
import { useState } from "react";

const STATUS_STEPS = [
  { key: "รับพัสดุเข้าคลังแล้ว", label: "รับพัสดุเข้าคลัง", sub: "소포 입고 완료", icon: "📦" },
  { key: "กำลังรีแพ็คพัสดุ", label: "รีแพ็คพัสดุ", sub: "재포장 중", icon: "🔄" },
  { key: "พัสดุกำลังเตรียมขึ้นเครื่อง", label: "เตรียมขึ้นเครื่อง", sub: "탑재 준비 중", icon: "🛫" },
  { key: "พัสดุกำลังดำเนินการศุลกากร", label: "ดำเนินการศุลกากร", sub: "통관 진행 중", icon: "🏛️" },
  { key: "พัสดุกำลังจัดส่งไปยังปลายทาง", label: "จัดส่งไปปลายทาง", sub: "배송 중", icon: "✈️" },
  { key: "พัสดุจัดส่งหน้าบ้านผู้รับเรียบร้อยแล้ว", label: "จัดส่งสำเร็จ", sub: "배송 완료", icon: "✅" },
];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputStyle = {
  width: "100%",
  background: "#1e2130",
  border: "1px solid #2a2d3a",
  borderRadius: 8,
  padding: "11px 14px",
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
const labelStyle = { fontSize: 12, color: "#8b8fa8", marginBottom: 6, display: "block" };
const cardStyle = {
  width: "100%",
  maxWidth: 520,
  background: "#16181f",
  borderRadius: 14,
  border: "1px solid #2a2d3a",
  padding: "28px 24px",
  boxShadow: "0 8px 40px rgba(0,0,0,.5)",
};

export default function CargoTrackPage() {
  const [tab, setTab] = useState("track");

  const [trackInput, setTrackInput] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");

  const [reqForm, setReqForm] = useState({
    senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
    receiverAddress: "", direction: "TH_TO_KR", itemDesc: "", passportNo: "",
  });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqDone, setReqDone] = useState(null);
  const [reqError, setReqError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  // parcel image (photo of package / tracking label)
  const [parcelFile, setParcelFile] = useState(null);
  const [parcelPreview, setParcelPreview] = useState(null);
  const [parcelUploading, setParcelUploading] = useState(false);
  const [parcelUploadedUrl, setParcelUploadedUrl] = useState("");

  const [showReg, setShowReg] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", phone: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regDone, setRegDone] = useState(false);
  const [regError, setRegError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    const num = trackInput.trim();
    if (!num) return;
    setTrackLoading(true); setTrackError(""); setTrackResult(null);
    try {
      const res = await fetch(`/api/cargo/track?number=${encodeURIComponent(num)}`);
      const d = await res.json();
      if (!res.ok) { setTrackError(d.error || "ไม่พบข้อมูล"); return; }
      setTrackResult(d.order);
    } catch { setTrackError("เชื่อมต่อไม่ได้ กรุณาลองใหม่"); }
    finally { setTrackLoading(false); }
  };

  const handleReqChange = (k, v) => setReqForm(f => ({ ...f, [k]: v }));

  const handleReqSubmit = async (e) => {
    e.preventDefault();
    if (!reqForm.senderName.trim() || !reqForm.receiverName.trim()) {
      setReqError("กรุณากรอกชื่อผู้ส่งและผู้รับ");
      return;
    }
    setReqLoading(true); setReqError(""); setReqDone(null);
    try {
      // Upload image first if selected
      let imageUrl = uploadedUrl;
      if (uploadFile && !uploadedUrl) {
        setUploadLoading(true);
        const fd = new FormData();
        fd.append("file", uploadFile);
        const upRes = await fetch("/api/cargo/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        setUploadLoading(false);
        if (!upRes.ok) { setReqError(upData.error || "อัปโหลดรูปไม่สำเร็จ"); setReqLoading(false); return; }
        imageUrl = upData.url;
        setUploadedUrl(imageUrl);
      }
      // Upload parcel image if selected
      let parcelImageUrl = parcelUploadedUrl;
      if (parcelFile && !parcelUploadedUrl) {
        setParcelUploading(true);
        const fd2 = new FormData();
        fd2.append("file", parcelFile);
        const upRes2 = await fetch("/api/cargo/upload", { method: "POST", body: fd2 });
        const upData2 = await upRes2.json();
        setParcelUploading(false);
        if (!upRes2.ok) { setReqError(upData2.error || "อัปโหลดรูปพัสดุไม่สำเร็จ"); setReqLoading(false); return; }
        parcelImageUrl = upData2.url;
        setParcelUploadedUrl(parcelImageUrl);
      }
      const res = await fetch("/api/cargo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reqForm, imageUrl, parcelImageUrl }),
      });
      const d = await res.json();
      if (!res.ok) { setReqError(d.error || "เกิดข้อผิดพลาด"); return; }
      setReqDone(d);
      setReqForm({ senderName: "", senderPhone: "", receiverName: "", receiverPhone: "", receiverAddress: "", direction: "TH_TO_KR", itemDesc: "", passportNo: "" });
      setUploadFile(null); setUploadPreview(null); setUploadedUrl("");
      setParcelFile(null); setParcelPreview(null); setParcelUploadedUrl("");
    } catch { setReqError("เชื่อมต่อไม่ได้ กรุณาลองใหม่"); }
    finally { setReqLoading(false); }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim()) { setRegError("กรุณากรอกชื่อ"); return; }
    setRegLoading(true); setRegError(""); setRegDone(false);
    try {
      const res = await fetch("/api/cargo/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const d = await res.json();
      if (!res.ok) { setRegError(d.error || "เกิดข้อผิดพลาด"); return; }
      setRegDone(true);
      setRegForm({ name: "", email: "", phone: "" });
    } catch { setRegError("เชื่อมต่อไม่ได้ กรุณาลองใหม่"); }
    finally { setRegLoading(false); }
  };

  const stepIndex = trackResult ? STATUS_STEPS.findIndex(s => s.key === trackResult.status) : -1;
  const isProblem = trackResult?.status === "มีปัญหา";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0f1a 0%,#141720 60%,#0a1020 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 16px 60px", fontFamily: "'Noto Sans Thai',sans-serif" }}>

      {showReg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowReg(false)}>
          <div style={{ background: "#16181f", borderRadius: 16, border: "1px solid #2a2d3a", padding: "28px 24px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#e2e8f0" }}>👤 ลงทะเบียนผู้ใช้</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>회원 등록 · สมัครรับบริการคาโก้</div>
              </div>
              <button onClick={() => { setShowReg(false); setRegDone(false); setRegError(""); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
            </div>
            {regDone ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>ลงทะเบียนสำเร็จ!</div>
                <div style={{ fontSize: 13, color: "#8b8fa8" }}>ทีมงานจะติดต่อกลับหาคุณเร็วๆ นี้</div>
                <button onClick={() => { setShowReg(false); setRegDone(false); }} style={{ marginTop: 20, padding: "10px 28px", background: "#facc15", color: "#000", fontWeight: 800, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>ปิด</button>
              </div>
            ) : (
              <form onSubmit={handleRegSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>ชื่อ-นามสกุล *</label>
                  <input style={inputStyle} placeholder="เช่น สมชาย ใจดี" value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>อีเมล</label>
                  <input style={inputStyle} type="email" placeholder="example@email.com" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>เบอร์โทรศัพท์</label>
                  <input style={inputStyle} placeholder="0812345678" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                {regError && <div style={{ padding: "9px 12px", background: "#2a1f1f", border: "1px solid #f8717144", borderRadius: 8, color: "#f87171", fontSize: 13 }}>⚠️ {regError}</div>}
                <button type="submit" disabled={regLoading} style={{ padding: "12px", background: "#facc15", color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 8, cursor: "pointer" }}>
                  {regLoading ? "⏳ กำลังบันทึก..." : "✅ ลงทะเบียน"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>✈️</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#facc15", letterSpacing: 1 }}>GOEUN SERVER HUB</div>
        <div style={{ fontSize: 13, color: "#8b8fa8", marginTop: 2 }}>บริการคาโก้ไทย-เกาหลี · 항공 화물 서비스</div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => { setShowReg(true); setRegDone(false); setRegError(""); }} style={{ padding: "9px 20px", background: "#1e2130", border: "1px solid #facc1540", borderRadius: 8, color: "#facc15", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans Thai',sans-serif" }}>
          👤 ลงทะเบียนผู้ใช้
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 520, display: "flex", gap: 8, marginBottom: 16 }}>
        {[["track","🔍 ตรวจสอบสถานะ"],["request","📬 แจ้งส่งสินค้า"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "11px 8px", borderRadius: 10, border: `1px solid ${tab === key ? "#facc15" : "#2a2d3a"}`, background: tab === key ? "#facc1515" : "#16181f", color: tab === key ? "#facc15" : "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans Thai',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "track" && (
        <>
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>🔍 ตรวจสอบสถานะพัสดุ</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>입력하신 화물 번호로 상태를 확인하세요</div>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="CGO260426-00001" value={trackInput} onChange={e => setTrackInput(e.target.value)} autoComplete="off" />
              <button type="submit" disabled={trackLoading} style={{ padding: "12px 22px", background: "#facc15", color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                {trackLoading ? "⏳" : "ค้นหา"}
              </button>
            </form>
            {trackError && <div style={{ marginTop: 12, padding: "10px 14px", background: "#2a1f1f", border: "1px solid #f8717144", borderRadius: 8, color: "#f87171", fontSize: 13 }}>⚠️ {trackError}</div>}
          </div>

          {trackResult && (
            <div style={{ ...cardStyle, marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>หมายเลขพัสดุ / 화물 번호</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "#facc15" }}>{trackResult.number}</div>
                </div>
                <span style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: isProblem ? "#f8717122" : "#4ade8022", color: isProblem ? "#f87171" : "#4ade80", border: `1px solid ${isProblem ? "#f87171" : "#4ade80"}44` }}>
                  {trackResult.status}
                </span>
              </div>

              {!isProblem && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx <= stepIndex;
                      const active = idx === stepIndex;
                      return (
                        <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div style={{ position: "absolute", top: 18, left: "50%", width: "100%", height: 3, background: idx < stepIndex ? "#facc15" : "#2a2d3a", zIndex: 0 }} />
                          )}
                          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${done ? "#facc15" : "#2a2d3a"}`, background: active ? "#facc15" : done ? "#facc1544" : "#1a1d27", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, zIndex: 1, position: "relative" }}>
                            {done ? step.icon : "○"}
                          </div>
                          <div style={{ fontSize: 10, color: done ? "#facc15" : "#64748b", fontWeight: done ? 700 : 400, textAlign: "center", marginTop: 6, lineHeight: 1.3 }}>{step.label}</div>
                          <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", marginTop: 2 }}>{step.sub}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isProblem && (
                <div style={{ padding: "12px 16px", background: "#2a1f1f", border: "1px solid #f8717144", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 18 }}>
                  ⚠️ พบปัญหาในการจัดส่ง กรุณาติดต่อเจ้าหน้าที่
                </div>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>📤 ผู้ส่ง</div>
                    <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{trackResult.senderName}</div>
                  </div>
                  <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>📬 ผู้รับ</div>
                    <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{trackResult.receiverName}</div>
                  </div>
                </div>
                <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>🛫 เส้นทาง</div>
                  <div style={{ fontSize: 13, color: trackResult.direction === "TH_TO_KR" ? "#facc15" : "#60a5fa", fontWeight: 700 }}>
                    {trackResult.direction === "TH_TO_KR" ? "🇹🇭 ไทย → เกาหลี 🇰🇷" : "🇰🇷 เกาหลี → ไทย 🇹🇭"}
                  </div>
                </div>
                {trackResult.trackingCode && (
                  <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>🏷️ Tracking Code</div>
                    <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700, fontFamily: "monospace" }}>{trackResult.trackingCode}</div>
                  </div>
                )}
                {trackResult.itemDesc && (
                  <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>📋 รายการสินค้า</div>
                    <div style={{ fontSize: 13, color: "#e2e8f0" }}>{trackResult.itemDesc}</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>📅 รับพัสดุ</div>
                    <div style={{ fontSize: 12, color: "#e2e8f0" }}>{fmtDate(trackResult.createdAt)}</div>
                  </div>
                  {trackResult.deliveredAt && (
                    <div style={{ background: "#1e2130", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 4 }}>✅ จัดส่งสำเร็จ</div>
                      <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>{fmtDate(trackResult.deliveredAt)}</div>
                    </div>
                  )}
                </div>
                {trackResult.notes && (
                  <div style={{ padding: "10px 14px", background: "#141720", border: "1px solid #2a2d3a", borderRadius: 8, fontSize: 12, color: "#8b8fa8" }}>
                    💬 {trackResult.notes}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 20, padding: "12px 14px", background: "#facc1510", border: "1px solid #facc1530", borderRadius: 8, textAlign: "center", fontSize: 12, color: "#facc15" }}>
                📞 มีคำถาม? ติดต่อ GOEUN SERVER HUB
              </div>
            </div>
          )}
        </>
      )}

      {tab === "request" && (
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>📬 แจ้งส่งสินค้า</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>화물 발송 신청 · กรอกข้อมูลเพื่อแจ้งจัดส่ง</div>

          {reqDone ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>แจ้งส่งสินค้าสำเร็จ!</div>
              <div style={{ fontSize: 13, color: "#8b8fa8", marginBottom: 16 }}>ทีมงานได้รับข้อมูลของคุณแล้ว</div>
              <div style={{ background: "#1e2130", borderRadius: 10, padding: "14px 18px", display: "inline-block" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>หมายเลขอ้างอิง</div>
                <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 900, color: "#facc15" }}>{reqDone.number}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>บันทึกหมายเลขนี้ไว้เพื่อตรวจสอบสถานะ</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button onClick={() => { setTab("track"); setTrackInput(reqDone.number); setReqDone(null); }} style={{ padding: "10px 20px", background: "#facc15", color: "#000", fontWeight: 800, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>🔍 ตรวจสอบสถานะ</button>
                <button onClick={() => setReqDone(null)} style={{ padding: "10px 20px", background: "#1e2130", border: "1px solid #2a2d3a", color: "#e2e8f0", fontWeight: 700, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>+ แจ้งส่งใหม่</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReqSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>🛫 เส้นทาง *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["TH_TO_KR","🇹🇭 ไทย → เกาหลี 🇰🇷"],["KR_TO_TH","🇰🇷 เกาหลี → ไทย 🇹🇭"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => handleReqChange("direction", val)}
                      style={{ padding: "11px 8px", borderRadius: 8, border: `1.5px solid ${reqForm.direction === val ? "#facc15" : "#2a2d3a"}`, background: reqForm.direction === val ? "#facc1515" : "#1e2130", color: reqForm.direction === val ? "#facc15" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #2a2d3a", paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: "#facc15", fontWeight: 700, marginBottom: 10 }}>📤 ข้อมูลผู้ส่ง</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>ชื่อผู้ส่ง *</label>
                    <input style={inputStyle} placeholder="ชื่อ-นามสกุล" value={reqForm.senderName} onChange={e => handleReqChange("senderName", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>เบอร์โทรผู้ส่ง</label>
                    <input style={inputStyle} placeholder="0812345678" value={reqForm.senderPhone} onChange={e => handleReqChange("senderPhone", e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #2a2d3a", paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700, marginBottom: 10 }}>📬 ข้อมูลผู้รับ</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>ชื่อผู้รับ *</label>
                    <input style={inputStyle} placeholder="ชื่อ-นามสกุล" value={reqForm.receiverName} onChange={e => handleReqChange("receiverName", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>เบอร์โทรผู้รับ</label>
                    <input style={inputStyle} placeholder="0812345678" value={reqForm.receiverPhone} onChange={e => handleReqChange("receiverPhone", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>ที่อยู่ผู้รับ</label>
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" value={reqForm.receiverAddress} onChange={e => handleReqChange("receiverAddress", e.target.value)} />
                </div>
                {/* Image upload */}
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>📷 อัปโหลดรูปที่อยู่ / หลักฐาน (ไม่บังคับ)</label>
                  <label htmlFor="cargo-img-upload" style={{ display: "block", cursor: "pointer" }}>
                    {uploadPreview ? (
                      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                        <img src={uploadPreview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, border: "1.5px solid #facc1560" }} />
                        <button type="button" onClick={e => { e.preventDefault(); setUploadFile(null); setUploadPreview(null); setUploadedUrl(""); }} style={{ position: "absolute", top: 6, right: 6, background: "#0f0f1acc", border: "1px solid #f8717166", borderRadius: "50%", width: 28, height: 28, color: "#f87171", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ border: "1.5px dashed #2a2d3a", borderRadius: 8, padding: "20px 16px", textAlign: "center", background: "#1e2130", color: "#64748b", fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                        <div style={{ fontWeight: 600, color: "#8b8fa8" }}>คลิกเพื่อเลือกรูปภาพ</div>
                        <div style={{ fontSize: 11, marginTop: 4, color: "#4a5568" }}>JPG, PNG, WEBP · ไม่เกิน 10MB</div>
                      </div>
                    )}
                  </label>
                  <input id="cargo-img-upload" type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadFile(f);
                      setUploadedUrl("");
                      const reader = new FileReader();
                      reader.onload = ev => setUploadPreview(ev.target.result);
                      reader.readAsDataURL(f);
                    }}
                  />
                </div>
              </div>

              <div style={{ borderTop: "1px solid #2a2d3a", paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 10 }}>📋 รายละเอียดสินค้า</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>รายการสินค้า / 물품 내역</label>
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} placeholder="เช่น เสื้อผ้า 3 ตัว, อาหารแห้ง, เครื่องสำอาง..." value={reqForm.itemDesc} onChange={e => handleReqChange("itemDesc", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>เลขพาสปอร์ต / เลขศุลกากร (ถ้ามี)</label>
                  <input style={inputStyle} placeholder="AA0000000" value={reqForm.passportNo} onChange={e => handleReqChange("passportNo", e.target.value)} />
                </div>
                {/* Parcel / tracking label photo */}
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>📦 รูปพัสดุ / รูปเลขไปรษณีย์ (ไม่บังคับ)</label>
                  <label htmlFor="cargo-parcel-upload" style={{ display: "block", cursor: "pointer" }}>
                    {parcelPreview ? (
                      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                        <img src={parcelPreview} alt="parcel preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: "1.5px solid #a78bfa60" }} />
                        <button type="button"
                          onClick={e => { e.preventDefault(); setParcelFile(null); setParcelPreview(null); setParcelUploadedUrl(""); }}
                          style={{ position: "absolute", top: 6, right: 6, background: "#0f0f1acc", border: "1px solid #f8717166", borderRadius: "50%", width: 28, height: 28, color: "#f87171", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ border: "1.5px dashed #3a3060", borderRadius: 8, padding: "20px 16px", textAlign: "center", background: "#1a1830", color: "#64748b", fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>📦</div>
                        <div style={{ fontWeight: 600, color: "#a78bfa" }}>คลิกเพื่อถ่ายรูปหรือเลือกไฟล์</div>
                        <div style={{ fontSize: 11, marginTop: 4, color: "#4a5568" }}>รูปพัสดุ, สติกเกอร์ไปรษณีย์, เลข Tracking · ไม่เกิน 10MB</div>
                      </div>
                    )}
                  </label>
                  <input id="cargo-parcel-upload" type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setParcelFile(f);
                      setParcelUploadedUrl("");
                      const reader = new FileReader();
                      reader.onload = ev => setParcelPreview(ev.target.result);
                      reader.readAsDataURL(f);
                    }}
                  />
                </div>
              </div>

              {reqError && <div style={{ padding: "9px 12px", background: "#2a1f1f", border: "1px solid #f8717144", borderRadius: 8, color: "#f87171", fontSize: 13 }}>⚠️ {reqError}</div>}

              <button type="submit" disabled={reqLoading || uploadLoading || parcelUploading} style={{ padding: "13px", background: "#facc15", color: "#000", fontWeight: 800, fontSize: 15, border: "none", borderRadius: 8, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
                {uploadLoading || parcelUploading ? "⏳ กำลังอัปโหลดรูป..." : reqLoading ? "⏳ กำลังส่งข้อมูล..." : "📬 ยืนยันแจ้งส่งสินค้า"}
              </button>
            </form>
          )}
        </div>
      )}

      <div style={{ marginTop: 40, fontSize: 11, color: "#3a3d4a", textAlign: "center" }}>
        © GOEUN SERVER HUB · บริการคาโก้ไทย-เกาหลี
      </div>
    </div>
  );
}
