"use client";
import { useState, useCallback, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

const INVOICE_BADGE = {
  PAID:      { bg: "#14532d", color: "#4ade80", label: "ชำระแล้ว ✓" },
  PENDING:   { bg: "#3b2800", color: "#fbbf24", label: "รอชำระ" },
  OVERDUE:   { bg: "#3b0000", color: "#f87171", label: "เกินกำหนด ⚠️" },
  CANCELLED: { bg: "#1e2130", color: "#8b8fa8", label: "ยกเลิก" },
};

const STATUS_LABELS = {
  PAID: "ชำระแล้ว",
  PENDING: "รอชำระ",
  OVERDUE: "เกินกำหนด",
  CANCELLED: "ยกเลิก",
};

async function readJsonResponse(response) {
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `เกิดข้อผิดพลาด (${response.status})`);
  }

  return data;
}

export default function PaymentsClient({ session, clients, initialInvoices, initialError = "" }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // quick-record form
  const [form, setForm] = useState({
    clientId: "",
    amount: "",
    status: "PAID",
    dueDate: "",
    notes: "",
    receiptNumber: "",
  });

  // edit modal
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // filter
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialError) {
      showToast(initialError, false);
    }
  }, [initialError]);

  const reload = useCallback(async () => {
    const d = await readJsonResponse(await fetch("/api/admin/invoices"));
    setInvoices(d.invoices || []);
  }, []);

  // ── Quick Record ──
  const handleRecord = async (e) => {
    e.preventDefault();
    if (!form.clientId || !form.amount) {
      showToast("กรุณาเลือกบริษัทและกรอกยอดเงิน", false);
      return;
    }
    setSaving(true);
    try {
      const d = await readJsonResponse(await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, currency: "THB" }),
      }));
      showToast(`บันทึกการชำระเงินสำเร็จ — ${d.invoice?.number}`);
      setForm({ clientId: "", amount: "", status: "PAID", dueDate: "", notes: "", receiptNumber: "" });
      reload();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    } finally { setSaving(false); }
  };

  // ── Edit ──
  const openEdit = (inv) => {
    setEditId(inv.id);
    setEditForm({
      amount: String(inv.amount),
      status: inv.status,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
      notes: inv.notes || "",
      receiptNumber: inv.receiptNumber || "",
    });
    setEditModal(true);
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      await readJsonResponse(await fetch(`/api/admin/invoices/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      }));
      showToast("อัพเดตสำเร็จ");
      setEditModal(false);
      reload();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    } finally { setSaving(false); }
  };
  const deleteInv = async (id, number) => {
    if (!confirm(`ลบ Invoice "${number}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" }));
      showToast("ลบสำเร็จ");
      reload();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    }
  };

  const filtered = invoices.filter(inv =>
    (!filterStatus || inv.status === filterStatus) &&
    (!filterClientId || inv.clientId === filterClientId)
  );

  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = invoices.filter(i => i.status === "PENDING").reduce((s, i) => s + Number(i.amount), 0);
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((s, i) => s + Number(i.amount), 0);

  const S = {
    bg: { background: "#0f1117", minHeight: "100dvh", color: "#e8eaf0" },
    nav: { background: "#16181f", borderBottom: "1px solid #2a2d3a", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    card: { background: "#16181f", border: "1px solid #2a2d3a", borderRadius: 10, padding: 20 },
    input: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#e8eaf0", borderRadius: 6, padding: "8px 12px", width: "100%", fontSize: 14, outline: "none" },
    label: { fontSize: 12, color: "#8b8fa8", marginBottom: 4, display: "block" },
    btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 6, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }),
    th: { padding: "10px 14px", fontSize: 12, color: "#8b8fa8", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #2a2d3a", whiteSpace: "nowrap" },
    td: { padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #1e2130", verticalAlign: "middle" },
  };

  return (
    <div style={S.bg}>
      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#7eb8f7" }}>⚙️ Admin Panel</span>
          <Link href="/admin/clients" style={{ color: "#8b8fa8", fontSize: 13, textDecoration: "none" }}>ลูกค้า &amp; Users</Link>
          <span style={{ color: "#7eb8f7", fontSize: 13, fontWeight: 600 }}>💰 บันทึกการชำระเงิน</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#8b8fa8", fontSize: 13 }}>{session.user.name || session.user.email}</span>
          <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => signOut({ callbackUrl: "/login" })}>ออกจากระบบ</button>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#14532d" : "#7f1d1d", color: "#fff", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 14 }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e8eaf0" }}>💰 บันทึกการชำระเงินค่าบริการรายเดือน</h2>
          <p style={{ margin: "6px 0 0", color: "#8b8fa8", fontSize: 14 }}>จัดการและบันทึกการชำระค่าบริการดูแลระบบของลูกค้าแต่ละราย</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "ชำระแล้ว (THB)", value: totalPaid.toLocaleString("th-TH"), color: "#4ade80", count: invoices.filter(i => i.status === "PAID").length },
            { label: "รอชำระ (THB)", value: totalPending.toLocaleString("th-TH"), color: "#fbbf24", count: invoices.filter(i => i.status === "PENDING").length },
            { label: "เกินกำหนด (THB)", value: totalOverdue.toLocaleString("th-TH"), color: "#f87171", count: invoices.filter(i => i.status === "OVERDUE").length },
            { label: "Invoice ทั้งหมด", value: invoices.length, color: "#7eb8f7", count: null },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              {s.count !== null && <div style={{ fontSize: 12, color: "#8b8fa8" }}>{s.count} รายการ</div>}
              <div style={{ fontSize: 12, color: "#8b8fa8", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
          {/* ── Quick Record Form ── */}
          <div style={{ ...S.card }}>
            <h5 style={{ margin: "0 0 18px", color: "#7eb8f7", fontSize: 15, fontWeight: 700 }}>📝 บันทึกการชำระเงินใหม่</h5>
            <form onSubmit={handleRecord} style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>บริษัท *</label>
                <select style={S.input} value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} required>
                  <option value="">— เลือกบริษัท —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>ยอดเงิน (THB) *</label>
                <input style={S.input} type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div>
                <label style={S.label}>สถานะการชำระ</label>
                <select style={S.input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="PAID">✅ ชำระแล้ว</option>
                  <option value="PENDING">⏳ รอชำระ</option>
                  <option value="OVERDUE">⚠️ เกินกำหนด</option>
                </select>
              </div>
              <div>
                <label style={S.label}>วันครบกำหนด</label>
                <input style={S.input} type="date" value={form.dueDate}
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>รหัสใบเสร็จ</label>
                <input style={S.input} placeholder="เช่น REC-2604-001" value={form.receiptNumber}
                  onChange={e => setForm(p => ({ ...p, receiptNumber: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, height: 70, resize: "vertical" }}
                  placeholder="เช่น ค่าดูแลระบบเดือน เม.ย. 2569"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button type="submit" disabled={saving}
                style={{ ...S.btn("#1e3a5f", "#7eb8f7"), padding: "10px 0", fontSize: 14, width: "100%", opacity: saving ? 0.7 : 1 }}>
                {saving ? "กำลังบันทึก..." : "💾 บันทึกการชำระเงิน"}
              </button>
            </form>
          </div>

          {/* ── Invoice List ── */}
          <div style={S.card}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select style={{ ...S.input, maxWidth: 200 }} value={filterClientId} onChange={e => setFilterClientId(e.target.value)}>
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select style={{ ...S.input, maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">ทุกสถานะ</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <span style={{ color: "#8b8fa8", fontSize: 13 }}>{filtered.length} รายการ</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["เลข Invoice", "รหัสใบเสร็จ", "บริษัท", "ยอด (THB)", "สถานะ", "วันครบกำหนด", "วันชำระ", "หมายเหตุ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีรายการ</td></tr>
                  ) : filtered.map(inv => {
                    const ib = INVOICE_BADGE[inv.status] || INVOICE_BADGE.PENDING;
                    return (
                      <tr key={inv.id}>
                        <td style={S.td}>
                          <code style={{ color: "#7eb8f7", fontSize: 12 }}>{inv.number}</code>
                        </td>
                        <td style={S.td}>
                          {inv.receiptNumber
                            ? <code style={{ color: "#a78bfa", fontSize: 12 }}>{inv.receiptNumber}</code>
                            : <span style={{ color: "#4a5070" }}>—</span>}
                        </td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{inv.client?.name || "—"}</td>
                        <td style={S.td}><span style={{ fontWeight: 700, color: "#4ade80" }}>{Number(inv.amount).toLocaleString("th-TH")}</span></td>
                        <td style={S.td}>
                          <span style={{ background: ib.bg, color: ib.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{ib.label}</span>
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: "#8b8fa8" }}>
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("th-TH") : "—"}
                        </td>
                        <td style={{ ...S.td, fontSize: 12 }}>
                          {inv.paidAt ? <span style={{ color: "#4ade80" }}>{new Date(inv.paidAt).toLocaleDateString("th-TH")}</span> : <span style={{ color: "#4a5070" }}>—</span>}
                        </td>
                        <td style={{ ...S.td, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#8b8fa8" }}>
                          {inv.notes || "—"}
                        </td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEdit(inv)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteInv(inv.id, inv.number)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>✏️ แก้ไขการชำระเงิน</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>ยอดเงิน (THB)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.input} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="PAID">✅ ชำระแล้ว</option>
                  <option value="PENDING">⏳ รอชำระ</option>
                  <option value="OVERDUE">⚠️ เกินกำหนด</option>
                  <option value="CANCELLED">ยกเลิก</option>
                </select>
              </div>
              <div>
                <label style={S.label}>วันครบกำหนด</label>
                <input style={S.input} type="date" value={editForm.dueDate}
                  onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>รหัสใบเสร็จ</label>
                <input style={S.input} placeholder="เช่น REC-2604-001" value={editForm.receiptNumber || ""}
                  onChange={e => setEditForm(p => ({ ...p, receiptNumber: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, height: 70, resize: "vertical" }} value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setEditModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveEdit} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
