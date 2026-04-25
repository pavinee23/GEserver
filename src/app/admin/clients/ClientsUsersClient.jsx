"use client";
import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

const STATUS_OPTS = ["ONLINE", "MAINTENANCE", "COMING_SOON", "OFFLINE"];
const ROLE_OPTS = ["CLIENT", "ADMIN", "SUPER_ADMIN"];
const EXPENSE_CATEGORIES = ["ค่าแรง/เงินเดือน", "ค่าอุปกรณ์/ซอฟต์แวร์", "ค่าโฆษณา", "ค่าเช่าเซิร์ฟเวอร์/โดเมน", "ค่าสาธารณูปโภค", "ค่าบริการภายนอก", "อื่นๆ"];

const STATUS_BADGE = {
  ONLINE:       { bg: "#14532d", color: "#4ade80", label: "Online" },
  MAINTENANCE:  { bg: "#422006", color: "#fb923c", label: "Maintenance" },
  COMING_SOON:  { bg: "#1e1b4b", color: "#a78bfa", label: "Coming Soon" },
  OFFLINE:      { bg: "#3b0000", color: "#f87171", label: "Offline" },
};
const ROLE_BADGE = {
  SUPER_ADMIN:  { bg: "#4c0519", color: "#fb7185", label: "Super Admin" },
  ADMIN:        { bg: "#172554", color: "#60a5fa", label: "Admin" },
  CLIENT:       { bg: "#14532d", color: "#4ade80", label: "Client" },
};
const INVOICE_BADGE = {
  PAID:      { bg: "#14532d", color: "#4ade80", label: "ชำระแล้ว ✓" },
  PENDING:   { bg: "#3b2800", color: "#fbbf24", label: "รอชำระ" },
  OVERDUE:   { bg: "#3b0000", color: "#f87171", label: "เกินกำหนด ⚠️" },
  CANCELLED: { bg: "#1e2130", color: "#8b8fa8", label: "ยกเลิก" },
};

const RECEIPT_ITEM_GRID = "minmax(260px,1.8fr) 96px 128px 112px 128px 168px 56px";
const RECEIPT_ITEM_MIN_WIDTH = 1010;
const RECEIPT_ITEM_CELL_PAD = "0 5px";

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calcReceiptItem(item) {
  const quantity = Math.max(0, Number(item.quantity || 0));
  const unitPrice = Math.max(0, Number(item.unitPrice || 0));
  const discountPercent = Math.max(0, Number(item.discountPercent || 0));
  const discountAmount = Math.max(0, Number(item.discountAmount || 0));
  const subtotal = roundMoney(quantity * unitPrice);
  const totalDiscount = roundMoney((subtotal * discountPercent / 100) + discountAmount);
  const netTotal = roundMoney(Math.max(0, subtotal - totalDiscount));
  return { quantity, unitPrice, discountPercent, discountAmount, subtotal, totalDiscount, netTotal };
}

function createEmptyReceiptItem() {
  return { description: "", quantity: "1", unitPrice: "", discountPercent: "", discountAmount: "" };
}

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

export default function ClientsUsersClient({ session }) {
  const [tab, setTab] = useState("clients"); // "clients" | "users" | "invoices" | "receipts" | "expenses"
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // services (for client form)
  const [services, setServices] = useState([]);

  // client modal
  const [clientModal, setClientModal] = useState(false);
  const [clientPickerModal, setClientPickerModal] = useState(false);
  const [editClientId, setEditClientId] = useState(null);
  const [selectedClientEditId, setSelectedClientEditId] = useState("");
  const [clientForm, setClientForm] = useState({
    name: "", nameTh: "", slug: "", description: "", status: "COMING_SOON",
    contactEmail: "", contactPhone: "", address: "", systemUrl: "", logoUrl: "", serviceIds: [],
  });
  const [savingClient, setSavingClient] = useState(false);
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false);

  // user modal
  const [userModal, setUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "", email: "", password: "", role: "CLIENT", clientId: "",
  });
  const [savingUser, setSavingUser] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  // invoice modal
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "", amount: "", currency: "THB", status: "PENDING", dueDate: "", notes: "", receiptNumber: "",
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [filterInvoiceClientId, setFilterInvoiceClientId] = useState("");
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState("");

  // receipt modal
  const [receiptModal, setReceiptModal] = useState(false);
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [receiptForm, setReceiptForm] = useState({
    clientId: "",
    customerName: "",
    customerAddress: "",
    customerPhone: "",
    customerEmail: "",
    currency: "THB",
    issuedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [createEmptyReceiptItem()],
  });
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [filterReceiptClientId, setFilterReceiptClientId] = useState("");

  // filters
  const [clientSearch, setClientSearch] = useState("");
  const [filterClientStatus, setFilterClientStatus] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [filterUserRole, setFilterUserRole] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  // customers
  const [customers, setCustomers] = useState([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({ clientId: "", name: "", phone: "", email: "", address: "", idCard: "", notes: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [filterCustomerClientId, setFilterCustomerClientId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // expenses
  const [expenses, setExpenses] = useState([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", currency: "THB", status: "รอชำระ", notes: "", date: "", receiptNumber: "", receiptFile: "" });
  const [expenseFileInputs, setExpenseFileInputs] = useState([]); // File objects array
  const [savingExpense, setSavingExpense] = useState(false);

  // ledger modal
  const [ledgerModal, setLedgerModal] = useState(false);
  const [ledgerCurrency, setLedgerCurrency] = useState("THB");
  const [ledgerFilterMode, setLedgerFilterMode] = useState("all"); // "all" | "number" | "date" | "range"
  const [ledgerFilterRef, setLedgerFilterRef] = useState("");
  const [ledgerFilterDate, setLedgerFilterDate] = useState("");
  const [ledgerFilterFrom, setLedgerFilterFrom] = useState("");
  const [ledgerFilterTo, setLedgerFilterTo] = useState("");
  const [ledgerPaidOnly, setLedgerPaidOnly] = useState(true);

  // report/print modal
  const [reportModal, setReportModal] = useState(false);
  const [reportDataType, setReportDataType] = useState("invoice"); // "invoice" | "expense"
  const [reportMode, setReportMode] = useState("number"); // "number" | "date" | "range"
  const [reportInvNum, setReportInvNum] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClients = useCallback(async () => {
    const d = await readJsonResponse(await fetch("/api/admin/clients"));
    setClients(d.clients || []);
  }, []);

  const loadServices = useCallback(async () => {
    const d = await readJsonResponse(await fetch("/api/admin/services"));
    setServices(d.services || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const url = filterClientId ? `/api/admin/users?clientId=${filterClientId}` : "/api/admin/users";
    const d = await readJsonResponse(await fetch(url));
    setUsers(d.users || []);
  }, [filterClientId]);

  const loadInvoices = useCallback(async () => {
    const url = filterInvoiceClientId ? `/api/admin/invoices?clientId=${filterInvoiceClientId}` : "/api/admin/invoices";
    const d = await readJsonResponse(await fetch(url));
    setInvoices(d.invoices || []);
  }, [filterInvoiceClientId]);

  const loadReceipts = useCallback(async () => {
    const url = filterReceiptClientId ? `/api/admin/receipts?clientId=${filterReceiptClientId}` : "/api/admin/receipts";
    const d = await readJsonResponse(await fetch(url));
    setReceipts(d.receipts || []);
  }, [filterReceiptClientId]);

  const loadExpenses = useCallback(async () => {
    const d = await readJsonResponse(await fetch("/api/admin/expenses"));
    setExpenses(d.expenses || []);
  }, []);

  const loadCustomers = useCallback(async () => {
    const url = filterCustomerClientId ? `/api/admin/customers?clientId=${filterCustomerClientId}` : "/api/admin/customers";
    const d = await readJsonResponse(await fetch(url));
    setCustomers(d.customers || []);
  }, [filterCustomerClientId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([loadClients(), loadUsers(), loadInvoices(), loadReceipts(), loadServices(), loadExpenses(), loadCustomers()])
      .then((results) => {
        if (!active) return;
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length > 0) {
          failed.forEach((result) => console.error("[admin/clients load]", result.reason));
          showToast("โหลดข้อมูลบางส่วนไม่สำเร็จ", false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadClients, loadUsers, loadInvoices, loadReceipts, loadServices, loadExpenses, loadCustomers]);

  // ── Client Modal ──
  const openAddClient = () => {
    setEditClientId(null);
    setClientForm({ name: "", nameTh: "", slug: "", description: "", status: "COMING_SOON", contactEmail: "", contactPhone: "", address: "", systemUrl: "", logoUrl: "", serviceIds: [] });
    setClientModal(true);
  };
  const openClientEditPicker = () => {
    if (clients.length === 0) {
      showToast("ยังไม่มีลูกค้าในระบบ", false);
      return;
    }
    setSelectedClientEditId(filteredClients[0]?.id || clients[0]?.id || "");
    setClientPickerModal(true);
  };
  const openEditClient = (c) => {
    setEditClientId(c.id);
    setClientForm({
      name: c.name, nameTh: c.nameTh || "", slug: c.slug, description: c.description || "", status: c.status,
      contactEmail: c.contactEmail || "", contactPhone: c.contactPhone || "", address: c.address || "", systemUrl: c.systemUrl || "", logoUrl: c.logoUrl || "",
      serviceIds: (c.services || []).map(cs => cs.serviceId || cs.service?.id).filter(Boolean),
    });
    setClientModal(true);
  };
  const startEditClientFromPicker = () => {
    const client = clients.find(c => c.id === selectedClientEditId);
    if (!client) {
      showToast("กรุณาเลือกลูกค้า", false);
      return;
    }
    setClientPickerModal(false);
    openEditClient(client);
  };
  const saveClient = async () => {
    setSavingClient(true);
    try {
      const url = editClientId ? `/api/admin/clients/${editClientId}` : "/api/admin/clients";
      const method = editClientId ? "PUT" : "POST";
      await readJsonResponse(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientForm) }));
      showToast(editClientId ? "อัพเดตลูกค้าสำเร็จ" : "เพิ่มลูกค้าสำเร็จ");
      setClientModal(false);
      loadClients();
    } catch (err) {
      showToast(err.message, false);
    } finally { setSavingClient(false); }
  };
  const uploadClientLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingClientLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "logos");
      const data = await readJsonResponse(await fetch("/api/admin/upload", { method: "POST", body: fd }));
      setClientForm((prev) => ({ ...prev, logoUrl: data.path || "" }));
      showToast("อัปโหลดโลโก้สำเร็จ");
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setUploadingClientLogo(false);
      e.target.value = "";
    }
  };
  const deleteClient = async (id, name) => {
    if (!confirm(`ลบลูกค้า "${name}" ? ผู้ใช้ที่ผูกไว้จะถูก unlink`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/clients/${id}`, { method: "DELETE" }));
      showToast("ลบลูกค้าสำเร็จ");
      loadClients();
      loadUsers();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  // ── User Modal ──
  const openAddUser = () => {
    setEditUserId(null);
    setUserForm({ name: "", email: "", password: "", role: "CLIENT", clientId: "" });
    setShowUserPassword(false);
    setUserModal(true);
  };
  const openEditUser = (u) => {
    setEditUserId(u.id);
    setUserForm({ name: u.name || "", email: u.email, password: "", role: u.role, clientId: u.clientId || "" });
    setShowUserPassword(false);
    setUserModal(true);
  };
  const saveUser = async () => {
    setSavingUser(true);
    try {
      const url = editUserId ? `/api/admin/users/${editUserId}` : "/api/admin/users";
      const method = editUserId ? "PUT" : "POST";
      const body = { ...userForm };
      if (!body.password) delete body.password;
      await readJsonResponse(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      showToast(editUserId ? "อัพเดต User สำเร็จ" : "เพิ่ม User สำเร็จ");
      setUserModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message, false);
    } finally { setSavingUser(false); }
  };
  const deleteUser = async (id, email) => {
    if (!confirm(`ลบ User "${email}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/users/${id}`, { method: "DELETE" }));
      showToast("ลบ User สำเร็จ");
      loadUsers();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  // ── Invoice CRUD ──
  const openAddInvoice = () => {
    setEditInvoiceId(null);
    setInvoiceForm({ clientId: "", amount: "", currency: "THB", status: "PENDING", dueDate: "", notes: "", receiptNumber: "" });
    setInvoiceModal(true);
  };
  const openAddReceipt = () => {
    setTab("receipts");
    setEditReceiptId(null);
    setReceiptForm({
      clientId: "",
      customerName: "",
      customerAddress: "",
      customerPhone: "",
      customerEmail: "",
      currency: "THB",
      issuedAt: new Date().toISOString().slice(0, 10),
      notes: "",
      items: [createEmptyReceiptItem()],
    });
    setReceiptModal(true);
  };
  const openEditReceipt = (receipt) => {
    setEditReceiptId(receipt.id);
    setReceiptForm({
      clientId: receipt.clientId,
      customerName: receipt.customerName || "",
      customerAddress: receipt.customerAddress || "",
      customerPhone: receipt.customerPhone || "",
      customerEmail: receipt.customerEmail || "",
      currency: receipt.currency || "THB",
      issuedAt: receipt.issuedAt ? new Date(receipt.issuedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: receipt.notes || "",
      items: (receipt.items || []).length > 0
        ? receipt.items.map(item => ({
            description: item.description || "",
            quantity: String(item.quantity ?? 1),
            unitPrice: String(item.unitPrice ?? 0),
            discountPercent: String(item.discountPercent ?? 0),
            discountAmount: String(item.discountAmount ?? 0),
          }))
        : [createEmptyReceiptItem()],
    });
    setReceiptModal(true);
  };
  const openEditInvoice = (inv) => {
    setEditInvoiceId(inv.id);
    const due = inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "";
    setInvoiceForm({ clientId: inv.clientId, amount: String(inv.amount), currency: inv.currency, status: inv.status, dueDate: due, notes: inv.notes || "", receiptNumber: inv.receiptNumber || "" });
    setInvoiceModal(true);
  };
  const saveInvoice = async () => {
    setSavingInvoice(true);
    try {
      const url = editInvoiceId ? `/api/admin/invoices/${editInvoiceId}` : "/api/admin/invoices";
      const method = editInvoiceId ? "PUT" : "POST";
      const payload = { ...invoiceForm };
      await readJsonResponse(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      showToast(editInvoiceId ? "อัพเดต Invoice สำเร็จ" : "สร้าง Invoice สำเร็จ");
      setInvoiceModal(false);
      loadInvoices(); loadClients();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    } finally { setSavingInvoice(false); }
  };
  const deleteInvoice = async (id, number) => {
    if (!confirm(`ลบ Invoice "${number}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" }));
      showToast("ลบ Invoice สำเร็จ");
      loadInvoices();
      loadClients();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  // ── Receipt CRUD ──
  const addReceiptItemRow = () => {
    setReceiptForm(prev => ({ ...prev, items: [...prev.items, createEmptyReceiptItem()] }));
  };
  const updateReceiptItemRow = (index, key, value) => {
    setReceiptForm(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => idx === index ? { ...item, [key]: value } : item),
    }));
  };
  const removeReceiptItemRow = (index) => {
    setReceiptForm(prev => ({
      ...prev,
      items: prev.items.length === 1 ? [createEmptyReceiptItem()] : prev.items.filter((_, idx) => idx !== index),
    }));
  };
  const saveReceipt = async () => {
    setSavingReceipt(true);
    try {
      const items = receiptForm.items
        .map((item) => {
          const line = calcReceiptItem(item);
          return {
            description: item.description.trim(),
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            discountAmount: line.discountAmount,
            subtotal: line.subtotal,
            totalDiscount: line.totalDiscount,
            amount: line.netTotal,
          };
        })
        .filter((item) => item.description || item.quantity || item.unitPrice || item.discountPercent || item.discountAmount);

      if (!editReceiptId && !receiptForm.clientId) {
        showToast("กรุณาเลือกผู้ออกบิล", false);
        return;
      }
      if (!receiptForm.customerName.trim()) {
        showToast("กรุณากรอกชื่อลูกค้า", false);
        return;
      }
      if (items.length === 0) {
        showToast("กรุณากรอกรายการอย่างน้อย 1 รายการ", false);
        return;
      }
      if (items.some((item) =>
        !item.description ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.discountPercent < 0 ||
        item.discountPercent > 100 ||
        item.discountAmount < 0 ||
        item.totalDiscount > item.subtotal
      )) {
        showToast("กรุณากรอกรายละเอียดรายการ ราคา และส่วนลดให้ถูกต้อง", false);
        return;
      }

      if (editReceiptId) {
        const d = await readJsonResponse(await fetch(`/api/admin/receipts/${editReceiptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: receiptForm.customerName.trim(),
            customerAddress: receiptForm.customerAddress.trim(),
            customerPhone: receiptForm.customerPhone.trim(),
            customerEmail: receiptForm.customerEmail.trim(),
            currency: receiptForm.currency,
            issuedAt: receiptForm.issuedAt,
            notes: receiptForm.notes,
            items,
          }),
        }));
        showToast(`อัพเดตใบเสร็จสำเร็จ — ${d.receipt?.number}`);
      } else {
        const d = await readJsonResponse(await fetch("/api/admin/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: receiptForm.clientId,
            customerName: receiptForm.customerName.trim(),
            customerAddress: receiptForm.customerAddress.trim(),
            customerPhone: receiptForm.customerPhone.trim(),
            customerEmail: receiptForm.customerEmail.trim(),
            currency: receiptForm.currency,
            issuedAt: receiptForm.issuedAt,
            notes: receiptForm.notes,
            items,
          }),
        }));
        showToast(`สร้างใบเสร็จสำเร็จ — ${d.receipt?.number}`);
      }
      setReceiptModal(false);
      loadReceipts();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    } finally { setSavingReceipt(false); }
  };
  const deleteReceipt = async (id, number) => {
    if (!confirm(`ลบใบเสร็จ "${number}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/receipts/${id}`, { method: "DELETE" }));
      showToast("ลบใบเสร็จสำเร็จ");
      loadReceipts();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  // ── Customer CRUD ──
  const openAddCustomer = () => {
    setEditCustomerId(null);
    setCustomerForm({ clientId: filterCustomerClientId || clients[0]?.id || "", name: "", phone: "", email: "", address: "", idCard: "", notes: "" });
    setCustomerModal(true);
  };
  const openEditCustomer = (c) => {
    setEditCustomerId(c.id);
    setCustomerForm({ clientId: c.clientId, name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", idCard: c.idCard || "", notes: c.notes || "" });
    setCustomerModal(true);
  };
  const saveCustomer = async () => {
    setSavingCustomer(true);
    try {
      const url = editCustomerId ? `/api/admin/customers/${editCustomerId}` : "/api/admin/customers";
      const method = editCustomerId ? "PUT" : "POST";
      const body = editCustomerId
        ? { name: customerForm.name, phone: customerForm.phone, email: customerForm.email, address: customerForm.address, idCard: customerForm.idCard, notes: customerForm.notes }
        : { ...customerForm };
      await readJsonResponse(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      showToast(editCustomerId ? "อัพเดตข้อมูลลูกค้าสำเร็จ" : "เพิ่มลูกค้าสำเร็จ");
      setCustomerModal(false);
      loadCustomers();
    } catch (err) {
      showToast(err.message, false);
    } finally { setSavingCustomer(false); }
  };
  const deleteCustomer = async (id, name) => {
    if (!confirm(`ลบลูกค้า "${name}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/customers/${id}`, { method: "DELETE" }));
      showToast("ลบลูกค้าสำเร็จ");
      loadCustomers();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  // ── Expense CRUD ──
  const openAddExpense = () => {
    setEditExpenseId(null);
    const today = new Date().toISOString().slice(0, 10);
    setExpenseForm({ category: "", amount: "", currency: "THB", status: "รอชำระ", notes: "", date: today, receiptNumber: "", receiptFile: "" });
    setExpenseFileInputs([]);
    setExpenseModal(true);
  };
  const openEditExpense = (exp) => {
    setEditExpenseId(exp.id);
    const d = exp.date ? new Date(exp.date).toISOString().slice(0, 10) : "";
    setExpenseForm({ category: exp.category, amount: String(exp.amount), currency: exp.currency, status: exp.status || "รอชำระ", notes: exp.notes || "", date: d, receiptNumber: exp.receiptNumber || "", receiptFile: exp.receiptFile || "" });
    setExpenseFileInputs([]);
    setExpenseModal(true);
  };
  const saveExpense = async () => {
    setSavingExpense(true);
    try {
      // Parse existing saved files (backward compat: may be JSON array or single path string)
      let existingPaths = [];
      if (expenseForm.receiptFile) {
        try { const p = JSON.parse(expenseForm.receiptFile); existingPaths = Array.isArray(p) ? p : [p]; }
        catch { existingPaths = [expenseForm.receiptFile]; }
      }
      // Upload each new file
      const newPaths = [];
      for (const file of expenseFileInputs) {
        const fd = new FormData();
        fd.append("file", file);
        const upData = await readJsonResponse(await fetch("/api/admin/upload", { method: "POST", body: fd }));
        newPaths.push(upData.path);
      }
      const allPaths = [...existingPaths, ...newPaths];
      const receiptFileSaved = allPaths.length === 0 ? "" : JSON.stringify(allPaths);
      const url = editExpenseId ? `/api/admin/expenses/${editExpenseId}` : "/api/admin/expenses";
      const method = editExpenseId ? "PUT" : "POST";
      await readJsonResponse(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...expenseForm, receiptFile: receiptFileSaved }) }));
      showToast(editExpenseId ? "อัพเดตค่าใช้จ่ายสำเร็จ" : "บันทึกค่าใช้จ่ายสำเร็จ");
      setExpenseModal(false);
      loadExpenses();
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, false);
    } finally { setSavingExpense(false); }
  };
  const deleteExpense = async (id, number) => {
    if (!confirm(`ลบบันทึกค่าใช้จ่าย "${number}" ?`)) return;
    try {
      await readJsonResponse(await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" }));
      showToast("ลบบันทึกสำเร็จ");
      loadExpenses();
    } catch (err) {
      showToast(err.message, false);
    }
  };

  const parseExpenseReceiptPaths = (receiptFile) => {
    if (!receiptFile) return [];
    try {
      const p = JSON.parse(receiptFile);
      return (Array.isArray(p) ? p : [p]).filter(Boolean);
    } catch {
      return [receiptFile].filter(Boolean);
    }
  };

  const printExpenseAttachment = (path) => {
    if (!path) return;
    const url = String(path);
    const isPdf = /\.pdf($|\?)/i.test(url);
    const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i.test(url);
    const win = window.open("", "_blank");
    if (!win) {
      showToast("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up", false);
      return;
    }

    const preview = isImage
      ? `<img src="${url}" style="max-width:100%;height:auto;border:1px solid #d5d9e5;border-radius:8px" alt="attachment"/>`
      : `<iframe src="${url}" style="width:100%;height:78vh;border:1px solid #d5d9e5;border-radius:8px;background:#fff"></iframe>`;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>พิมพ์ไฟล์แนบ</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; color: #0f172a; }
        .bar { display:flex; gap:8px; margin-bottom:10px; align-items:center; flex-wrap:wrap; }
        .btn { border:1px solid #cbd5e1; background:#f8fafc; border-radius:8px; padding:8px 12px; cursor:pointer; }
        .btn.primary { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
        @media print { .bar { display:none; } body { margin:0; } }
      </style>
    </head><body>
      <div class="bar">
        <button class="btn primary" onclick="window.print()">🖨️ พิมพ์ไฟล์</button>
        <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">เปิดไฟล์โดยตรง</a>
      </div>
      ${preview}
    </body></html>`);
    win.document.close();

    // Auto-open browser print dialog for PDF/Image attachments.
    if (isPdf || isImage) {
      setTimeout(() => {
        try { win.focus(); win.print(); } catch {}
      }, 500);
    }
  };

  const printExpenseAttachmentsBatch = (pathsRaw, title = "ไฟล์แนบค่าใช้จ่าย") => {
    const paths = (pathsRaw || []).filter(Boolean);
    if (paths.length === 0) {
      showToast("ไม่พบไฟล์แนบสำหรับพิมพ์", false);
      return;
    }

    const win = window.open("", "_blank");
    if (!win) {
      showToast("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up", false);
      return;
    }

    const sections = paths.map((path, idx) => {
      const url = String(path);
      const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i.test(url);
      const preview = isImage
        ? `<img src="${url}" style="max-width:100%;height:auto;border:1px solid #d5d9e5;border-radius:8px" alt="attachment-${idx + 1}"/>`
        : `<iframe src="${url}" style="width:100%;height:82vh;border:1px solid #d5d9e5;border-radius:8px;background:#fff"></iframe>`;

      return `<section class="page">
        <div class="meta">ไฟล์ ${idx + 1}/${paths.length}: ${url.split("/").pop()}</div>
        ${preview}
      </section>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; color: #0f172a; }
        .bar { display:flex; gap:8px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
        .btn { border:1px solid #cbd5e1; background:#f8fafc; border-radius:8px; padding:8px 12px; cursor:pointer; text-decoration:none; color:#0f172a; }
        .btn.primary { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
        .meta { font-size: 12px; color: #475569; margin: 0 0 8px 2px; }
        .page { margin-bottom: 16px; }
        .page:not(:last-child) { page-break-after: always; }
        @media print {
          .bar { display:none; }
          body { margin:0; }
          .page { margin:0; }
        }
      </style>
    </head><body>
      <div class="bar">
        <button class="btn primary" onclick="window.print()">🖨️ พิมพ์ทั้งหมด (${paths.length} ไฟล์)</button>
      </div>
      ${sections}
    </body></html>`);
    win.document.close();

    setTimeout(() => {
      try { win.focus(); win.print(); } catch {}
    }, 600);
  };

  const printExpenseBill = (exp) => {
    const KO_CATEGORY_MAP = {
      "ค่าเช่าเซิร์ฟเวอร์/โดเมน": "서버/도메인 임대료",
      "ค่าบริการภายนอก": "외부 서비스 비용",
      "ค่าจ้างพนักงาน": "직원 급여",
      "ค่าใช้จ่ายสำนักงาน": "사무실 비용",
      "ค่าขนส่ง": "운송비",
      "ค่าวัสดุ": "자재비",
      "ค่าโฆษณา": "광고비",
      "อื่นๆ": "기타",
    };
    const statusLabel = exp.status === "แนบใบเสร็จแล้ว" ? "영수증 첨부됨" : "결제 대기";
    const categoryLabel = KO_CATEGORY_MAP[exp.category] || exp.category;
    const receiptNo = exp.receiptNumber || "—";
    const note = exp.notes || "—";
    const amount = Number(exp.amount || 0);
    const currency = exp.currency || "THB";
    const dateText = exp.date ? new Date(exp.date).toLocaleDateString("ko-KR") : "—";
    const paths = parseExpenseReceiptPaths(exp.receiptFile);

    const attachmentRows = paths.length > 0
      ? paths.map((path, i) => {
          const filename = path.split("/").pop();
          const ext = filename.split(".").pop().toLowerCase();
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
          const isPdf = ext === "pdf";
          if (isImage) {
            return `<div class="att-item">
              <div class="att-label">📎 ${i + 1}. ${filename}</div>
              <img src="${path}" alt="${filename}" class="att-img" />
            </div>`;
          } else if (isPdf) {
            return `<div class="att-item">
              <div class="att-label">📄 ${i + 1}. <a href="${path}" target="_blank" rel="noopener noreferrer">${filename}</a></div>
              <iframe src="${path}" width="100%" height="480px" style="border:1px solid #e2e8f0;border-radius:6px;display:block;margin-top:6px;" title="${filename}"></iframe>
            </div>`;
          } else {
            return `<div class="att-item">
              <div class="att-label">📎 ${i + 1}. <a href="${path}" target="_blank" rel="noopener noreferrer">${filename}</a></div>
            </div>`;
          }
        }).join("")
      : "<div class=\"muted\">첨부 파일 없음</div>";

    const win = window.open("", "_blank");
    if (!win) {
      showToast("팝업이 차단되었습니다. 팝업을 허용해 주세요.", false);
      return;
    }

    win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <title>비용 청구서 ${exp.number}</title>
      <style>
        body { font-family: 'Noto Sans KR', 'Malgun Gothic', Arial, sans-serif; padding: 24px; color: #111; }
        h2 { margin: 0 0 4px; }
        .sub { color: #555; margin-bottom: 16px; font-size: 12px; }
        .box { border: 1px solid #d6d9e4; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
        .row { display: grid; grid-template-columns: 160px 1fr; border-bottom: 1px solid #eceff5; }
        .row:last-child { border-bottom: none; }
        .k { background: #f8fafc; padding: 10px 12px; color: #334155; font-weight: 700; }
        .v { padding: 10px 12px; }
        .amt { font-size: 20px; font-weight: 800; color: #b91c1c; }
        .att-wrap { padding: 12px 14px; border: 1px dashed #cbd5e1; border-radius: 8px; }
        .att-title { font-weight: 700; margin-bottom: 10px; font-size: 14px; }
        .att-item { margin-bottom: 14px; }
        .att-label { font-size: 12px; margin-bottom: 6px; color: #334155; }
        .att-img { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; display: block; }
        .att-pdf { border: 1px solid #e2e8f0; border-radius: 6px; display: block; }
        .muted { color: #64748b; font-size: 12px; }
        .print-btn { margin-top: 16px; padding: 9px 22px; font-size: 14px; cursor: pointer; background: #1e40af; color: #fff; border: none; border-radius: 6px; }
        @media print { .print-btn { display: none; } }
      </style>
    </head><body>
      <h2>비용 청구서</h2>
      <div class="sub">번호 ${exp.number} · 인쇄일시 ${new Date().toLocaleString("ko-KR")}</div>

      <div class="box">
        <div class="row"><div class="k">번호</div><div class="v"><strong>${exp.number}</strong></div></div>
        <div class="row"><div class="k">카테고리</div><div class="v">${categoryLabel}</div></div>
        <div class="row"><div class="k">금액</div><div class="v"><span class="amt">${amount.toLocaleString("ko-KR")}</span> ${currency}</div></div>
        <div class="row"><div class="k">상태</div><div class="v">${statusLabel}</div></div>
        <div class="row"><div class="k">영수증 번호</div><div class="v">${receiptNo}</div></div>
        <div class="row"><div class="k">비고</div><div class="v">${note}</div></div>
        <div class="row"><div class="k">날짜</div><div class="v">${dateText}</div></div>
      </div>

      <div class="att-wrap">
        <div class="att-title">첨부 파일</div>
        ${attachmentRows}
      </div>

      <button class="print-btn" onclick="window.print()">🖨️ 이 청구서 인쇄</button>
    </body></html>`);
    win.document.close();
  };

  const getReportItems = () => {
    const source = reportDataType === "invoice" ? invoices : expenses;
    const getDate = item => reportDataType === "invoice" ? item.createdAt : item.date;
    const getNum = item => item.number || "";
    if (reportMode === "number") {
      return source.filter(i => getNum(i).toLowerCase().includes(reportInvNum.toLowerCase()));
    }
    if (reportMode === "date" && reportDate) {
      return source.filter(i => new Date(getDate(i)).toISOString().slice(0, 10) === reportDate);
    }
    if (reportMode === "range" && (reportFrom || reportTo)) {
      return source.filter(i => {
        const d = new Date(getDate(i));
        const from = reportFrom ? new Date(reportFrom) : null;
        const to = reportTo ? new Date(reportTo + "T23:59:59") : null;
        return (!from || d >= from) && (!to || d <= to);
      });
    }
    return source;
  };

  const doPrint = () => {
    const items = getReportItems();
    const isInv = reportDataType === "invoice";
    const modeLabel = reportMode === "number" ? `เลขที่ "${reportInvNum}"` :
      reportMode === "date" ? `วันที่ ${new Date(reportDate + "T00:00:00").toLocaleDateString("th-TH")}` :
      `ช่วง ${reportFrom ? new Date(reportFrom + "T00:00:00").toLocaleDateString("th-TH") : "—"} ถึง ${reportTo ? new Date(reportTo + "T00:00:00").toLocaleDateString("th-TH") : "—"}`;
    const totalAmt = items.reduce((s, i) => s + Number(i.amount), 0);
    const rows = items.map(item => {
      if (isInv) {
        const clientName = clients.find(c => c.id === item.clientId)?.name || item.client?.name || "—";
        return `<tr>
          <td>${item.number}</td>
          <td>${clientName}</td>
          <td style="text-align:right">${Number(item.amount).toLocaleString("th-TH")} ${item.currency}</td>
          <td>${{ PAID: "ชำระแล้ว", PENDING: "รอชำระ", OVERDUE: "เกินกำหนด", CANCELLED: "ยกเลิก" }[item.status] || item.status}</td>
          <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString("th-TH") : "—"}</td>
          <td>${item.notes || "—"}</td>
          <td>${new Date(item.createdAt).toLocaleDateString("th-TH")}</td>
        </tr>`;
      } else {
        return `<tr>
          <td>${item.number}</td>
          <td>${item.category}</td>
          <td style="text-align:right">${Number(item.amount).toLocaleString("th-TH")} ${item.currency}</td>
          <td>${item.notes || "—"}</td>
          <td>${new Date(item.date).toLocaleDateString("th-TH")}</td>
        </tr>`;
      }
    }).join("");
    const headers = isInv
      ? "<th>เลข Invoice</th><th>บริษัท</th><th>ยอด</th><th>สถานะ</th><th>วันครบกำหนด</th><th>หมายเหตุ</th><th>สร้างเมื่อ</th>"
      : "<th>เลขที่</th><th>หมวดหมู่</th><th>ยอด</th><th>หมายเหตุ</th><th>วันที่</th>";
    const colspan = isInv ? 7 : 5;

    // For expense report: append JPG/JPEG attachments into the same printable page.
    const expenseImageAttachments = isInv ? [] : items.flatMap((item) => {
      const paths = parseExpenseReceiptPaths(item.receiptFile);
      return paths
        .filter((path) => /\.(jpe?g)($|\?)/i.test(String(path)))
        .map((path, idx) => ({
          number: item.number,
          fileName: String(path).split("/").pop(),
          path: String(path),
          idx,
        }));
    });

    const attachmentHtml = !isInv && expenseImageAttachments.length > 0
      ? `<h3 style="margin:22px 0 10px;color:#1a1a2e">ไฟล์แนบรูป (JPG) สำหรับพิมพ์รวม</h3>
         <div class="attach-wrap">
           ${expenseImageAttachments.map((f, i) => `
             <section class="attach-card">
               <div class="attach-meta">${i + 1}. ${f.number} · ${f.fileName || `ไฟล์ ${f.idx + 1}`}</div>
               <img src="${f.path}" alt="${f.fileName || "attachment"}" class="attach-img" />
             </section>
           `).join("")}
         </div>`
      : "";

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>รายงาน${isInv ? "Invoice" : "ค่าใช้จ่าย"}</title>
      <style>
        body { font-family: 'Sarabun', Arial, sans-serif; padding: 24px; color: #111; font-size: 13px; }
        h2 { margin-bottom: 4px; }
        .sub { color: #555; margin-bottom: 16px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; }
        td { padding: 7px 10px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) td { background: #f5f5f5; }
        .total { margin-top: 14px; font-size: 14px; font-weight: 700; text-align: right; }
        .attach-wrap { display: block; }
        .attach-card { margin: 0 0 18px; }
        .attach-meta { font-size: 12px; color: #334155; margin: 0 0 6px; }
        .attach-img { width: 100%; height: auto; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; }
        @media print { .attach-card { page-break-inside: avoid; } }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>รายงาน${isInv ? "Invoice" : "ค่าใช้จ่าย"} — ${modeLabel}</h2>
      <div class="sub">พิมพ์เมื่อ: ${new Date().toLocaleString("th-TH")} · รายการทั้งหมด ${items.length} รายการ</div>
      <table><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="${colspan}" style="text-align:center;padding:24px;color:#888">ไม่พบรายการ</td></tr>`}</tbody></table>
      <div class="total">รวมทั้งสิ้น: ${totalAmt.toLocaleString("th-TH")} ${items[0]?.currency || "THB"}</div>
      ${attachmentHtml}
      <br/><button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer">🖨️ พิมพ์</button>
    </body></html>`);
    win.document.close();
  };

  const printReceipt = (receipt) => {
    const issuer = clients.find(c => c.id === receipt.clientId) || receipt.client || {};
    const issuerName = issuer.nameTh || issuer.name || "—";
    const issuerAddressHtml = String(issuer.address || "").replace(/\n/g, "<br/>");
    const customerAddressHtml = String(receipt.customerAddress || "").replace(/\n/g, "<br/>");
    const issuedDateLabel = new Date(receipt.issuedAt).toLocaleDateString("th-TH");
    const grossTotal = roundMoney((receipt.items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0));
    const discountTotal = roundMoney((receipt.items || []).reduce((sum, item) => {
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      return sum + (subtotal * (Number(item.discountPercent || 0) / 100)) + Number(item.discountAmount || 0);
    }, 0));
    const rows = (receipt.items || []).map((item, idx) => {
      const subtotal = roundMoney(Number(item.quantity) * Number(item.unitPrice));
      const percentLabel = Number(item.discountPercent || 0) > 0 ? `${Number(item.discountPercent).toLocaleString("th-TH")}%` : "";
      const fixedLabel = Number(item.discountAmount || 0) > 0 ? Number(item.discountAmount).toLocaleString("th-TH") : "";
      const discountLabel = percentLabel && fixedLabel
        ? `${percentLabel} + ${fixedLabel}`
        : percentLabel || fixedLabel || "—";
      return `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>${item.description}</td>
        <td style="text-align:right">${Number(item.quantity).toLocaleString("th-TH")}</td>
        <td style="text-align:right">${Number(item.unitPrice).toLocaleString("th-TH")}</td>
        <td style="text-align:right">${subtotal.toLocaleString("th-TH")}</td>
        <td style="text-align:right">${discountLabel}</td>
        <td style="text-align:right;font-weight:700">${Number(item.amount).toLocaleString("th-TH")}</td>
      </tr>
    `;
    }).join("");
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${receipt.number}</title>
      <style>
        @page { size: A4 portrait; margin: 8mm 10mm; }
        :root {
          --ink: #14213d;
          --muted: #5b6475;
          --line: #d8deea;
          --soft: #f4f7fb;
          --accent: #174ea6;
          --accent-soft: #eef4ff;
          --accent-strong: #0f2f6f;
          --success: #1f7a4d;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 10px;
          color: var(--ink);
          font-family: 'Sarabun', Arial, sans-serif;
          font-size: 11.5px;
          background: linear-gradient(180deg, #f5f8fd 0%, #ffffff 200px);
        }
        .sheet {
          max-width: 190mm;
          margin: 0 auto;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(16, 37, 84, 0.1);
        }
        .topbar {
          padding: 8px 18px;
          background: linear-gradient(135deg, var(--accent-strong), var(--accent));
          color: #fff;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .topbar-label {
          font-size: 9.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.78;
        }
        .topbar-number {
          font-size: 13px;
          font-weight: 800;
        }
        .content {
          padding: 14px 16px;
        }
        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }
        .issuer {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }
        .logo {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: #fff;
          flex-shrink: 0;
        }
        .logo-fallback {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #dce8ff, #f2f7ff);
          color: var(--accent);
          font-size: 22px;
          font-weight: 800;
          border: 1px solid var(--line);
          flex-shrink: 0;
        }
        .title {
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 4px;
          line-height: 1.1;
        }
        .company {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 5px;
          line-height: 1.2;
        }
        .meta {
          color: var(--muted);
          line-height: 1.6;
          font-size: 11px;
        }
        .doc-meta {
          min-width: 200px;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff, var(--soft));
          flex-shrink: 0;
        }
        .doc-grid {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 5px 10px;
          align-items: start;
        }
        .doc-grid .label {
          color: var(--muted);
          font-size: 11px;
        }
        .doc-grid .value {
          font-weight: 700;
          font-size: 11.5px;
        }
        .party-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          margin-bottom: 10px;
        }
        .party,
        .total-card,
        .signature-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #fff;
        }
        .party {
          padding: 10px 12px;
          background: linear-gradient(180deg, #ffffff, #fbfcff);
        }
        .party-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          margin-bottom: 6px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .party-name {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 2px;
          line-height: 1.2;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 8px;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 12px;
        }
        th {
          padding: 7px 9px;
          text-align: left;
          font-size: 10.5px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #17325f, #1d4f9d);
        }
        td {
          padding: 6px 9px;
          border-bottom: 1px solid #e9edf5;
          vertical-align: top;
          background: #fff;
          font-size: 11px;
        }
        tbody tr:nth-child(even) td {
          background: #f8fbff;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .total-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 230px;
          gap: 10px;
          margin-top: 10px;
          align-items: start;
        }
        .notes {
          padding: 10px 12px;
          border: 1px dashed #bac6db;
          border-radius: 12px;
          background: #fcfdff;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 11px;
        }
        .notes-title {
          display: block;
          margin-bottom: 4px;
          color: var(--accent);
          font-weight: 800;
        }
        .total-card {
          padding: 10px 12px;
          background: linear-gradient(135deg, #f2f8f4, #ffffff);
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 4px 0;
          color: var(--muted);
          font-size: 11px;
        }
        .total-line strong {
          color: var(--ink);
        }
        .grand-total {
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        .grand-total .label {
          display: block;
          margin-bottom: 3px;
          color: var(--muted);
          font-size: 10px;
        }
        .grand-total .value {
          color: var(--success);
          font-size: 20px;
          font-weight: 900;
          line-height: 1.15;
        }
        .signature-wrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 240px;
          gap: 12px;
          margin-top: 12px;
          align-items: end;
        }
        .signature-card {
          padding: 10px 14px;
          background: linear-gradient(180deg, #ffffff, #fbfcff);
          min-height: 90px;
        }
        .signature-title {
          color: var(--accent);
          font-size: 11.5px;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .signature-line {
          margin-top: 28px;
          border-top: 1.5px solid #8190a9;
          padding-top: 6px;
          text-align: center;
          font-weight: 700;
          font-size: 11px;
        }
        .signature-hint {
          margin-top: 4px;
          text-align: center;
          color: var(--muted);
          font-size: 10.5px;
        }
        .signature-date {
          margin-top: 8px;
          color: var(--muted);
          font-size: 10.5px;
        }
        .signature-stamp {
          margin-top: 6px;
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .actions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }
        .print-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--accent-strong), var(--accent));
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        @media print {
          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .actions { display: none; }
        }
      </style></head><body>
      <div class="sheet">
        <div class="topbar">
          <div>
            <div class="topbar-label">Receipt</div>
            <div class="topbar-number">${issuerName}</div>
          </div>
          <div style="text-align:right">
            <div class="topbar-label">Receipt No.</div>
            <div class="topbar-number">${receipt.number}</div>
          </div>
        </div>
        <div class="content">
          <div class="head">
            <div class="issuer">
              ${issuer.logoUrl
                ? `<img class="logo" src="${issuer.logoUrl}" alt="${issuerName}" />`
                : `<div class="logo-fallback">${String(issuerName || "R").trim().charAt(0).toUpperCase() || "R"}</div>`
              }
              <div>
                <div class="title">ใบเสร็จรับเงิน</div>
                <div class="company">${issuerName}</div>
                ${issuerAddressHtml ? `<div class="meta">${issuerAddressHtml}</div>` : ""}
                ${issuer.contactPhone ? `<div class="meta">โทร: ${issuer.contactPhone}</div>` : ""}
                ${issuer.contactEmail ? `<div class="meta">อีเมล: ${issuer.contactEmail}</div>` : ""}
              </div>
            </div>
            <div class="doc-meta">
              <div class="doc-grid">
                <div class="label">เลขที่</div>
                <div class="value">${receipt.number}</div>
                <div class="label">วันที่ออก</div>
                <div class="value">${issuedDateLabel}</div>
                <div class="label">สกุลเงิน</div>
                <div class="value">${receipt.currency || "THB"}</div>
                <div class="label">จำนวนรายการ</div>
                <div class="value">${receipt.items?.length || 0} รายการ</div>
              </div>
            </div>
          </div>

          <div class="party-wrap">
            <div class="party">
              <div class="party-title">ลูกค้า / ผู้รับบิล</div>
              <div class="party-name">${receipt.customerName || "—"}</div>
              ${customerAddressHtml ? `<div class="meta">${customerAddressHtml}</div>` : ""}
              ${receipt.customerPhone ? `<div class="meta">โทร: ${receipt.customerPhone}</div>` : ""}
              ${receipt.customerEmail ? `<div class="meta">อีเมล: ${receipt.customerEmail}</div>` : ""}
            </div>
          </div>

          <table>
        <thead>
          <tr>
            <th style="width:34px;text-align:center">#</th>
            <th>รายการ</th>
            <th style="width:54px;text-align:right">จำนวน</th>
            <th style="width:100px;text-align:right">ราคาต่อหน่วย</th>
            <th style="width:84px;text-align:right">ก่อนลด</th>
            <th style="width:72px;text-align:right">ส่วนลด</th>
            <th style="width:90px;text-align:right">รวมสุทธิ</th>
          </tr>
        </thead>
        <tbody>
          ${rows || "<tr><td colspan='7' style='text-align:center;color:#777;padding:24px'>ไม่มีรายการ</td></tr>"}
        </tbody>
      </table>

          <div class="total-wrap">
            ${receipt.notes
              ? `<div class="notes"><span class="notes-title">หมายเหตุ</span>${receipt.notes}</div>`
              : "<div></div>"
            }
            <div class="total-card">
              <div class="total-line"><span>ยอดก่อนหักส่วนลด</span><strong>${Number(receipt.subtotal || grossTotal).toLocaleString("th-TH")}</strong></div>
              <div class="total-line"><span>ส่วนลดรวม</span><strong>${discountTotal.toLocaleString("th-TH")}</strong></div>
              <div class="grand-total">
                <span class="label">รวมทั้งสิ้น</span>
                <div class="value">${Number(receipt.total).toLocaleString("th-TH")} ${receipt.currency || "THB"}</div>
              </div>
            </div>
          </div>

          <div class="signature-wrap">
            <div></div>
            <div class="signature-card">
              <div class="signature-title">ผู้รับเงิน</div>
              <div class="signature-line">ลงชื่อ ............................................................</div>
              <div class="signature-hint">(ผู้รับเงิน / ผู้มีอำนาจลงนาม)</div>
              <div class="signature-date">วันที่ ....................................</div>
              <div class="signature-stamp">${issuerName}</div>
            </div>
          </div>

          <div class="actions">
            <button class="print-btn" onclick="window.print()">พิมพ์ใบเสร็จ</button>
          </div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
  };

  const doPrintLedger = (currency, filterMode, filterRef, filterDate, filterFrom, filterTo, paidOnly) => {
    const symMap = { THB: "\u0e3f", KRW: "\u20a9", USD: "$" };
    const sym = symMap[currency] || "";

    // Language pack
    const L = currency === "KRW" ? {
      locale: "ko-KR",
      title: "\uc218\uc785\u00b7\uc9c0\ucd9c \uc7a5\ubd80",
      printedAt: "\uc778\uc1c4 \uc77c\uc2dc",
      incomeTotal: "\ud83d\udcb0 \uc644\uac01 \ud569\uacc4",
      expenseTotal: "\ud83d\udcb8 \uc9c0\ucd9c \ud569\uacc4",
      profitLabel: "\ud83d\udcc8 \uc21c\uc774\uc775",
      lossLabel: "\ud83d\udcc9 \uc21c\uc190\uc2e4",
      profitBanner: "\ud83d\udcc8 \uc774\uc775",
      lossBanner: "\ud83d\udcc9 \uc190\uc2e4",
      incomeRow: "\ud83d\udcb0 \uc218\uc785",
      expenseRow: "\ud83d\udcb8 \uc9c0\ucd9c",
      colNo: "#",
      colDate: "\ub0a0\uc9dc",
      colRef: "\ucc38\uc870\ubc88\ud638",
      colDesc: "\ud56d\ubaa9 / \uc0c1\uc138",
      colIncome: "\uc218\uc785",
      colExpense: "\uc9c0\ucd9c",
      colBalance: "\ub204\uacc4\uc794\uc561",
      footerTotal: "\ud569\uacc4",
      footerItems: "\uac74",
      noData: "\ub370\uc774\ud130 \uc5c6\uc74c",
      printBtn: "\ud83d\udda8\ufe0f \uc778\uc1c4",
      statusMap: { PENDING: "\ubbf8\uacb0\uc81c", PAID: "\uacb0\uc81c\uc644\ub8cc", OVERDUE: "\uc5f0\uccb4", CANCELLED: "\ucd94\uc18c", "\u0e23\u0e2d\u0e0a\u0e33\u0e23\u0e30": "\ubbf8\uacb0\uc81c", "\u0e41\u0e19\u0e1a\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27": "\uc601\uc218\uc99d\ucca8\ubd80", "\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27": "\uacb0\uc81c\uc644\ub8cc", "\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14": "\uc5f0\uccb4", "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01": "\ucd94\uc18c" },
      categoryMap: { "\u0e04\u0e48\u0e32\u0e40\u0e0a\u0e48\u0e32\u0e40\u0e0b\u0e34\u0e23\u0e4c\u0e1f\u0e40\u0e27\u0e2d\u0e23\u0e4c/\u0e42\u0e14\u0e40\u0e21\u0e19": "\uc11c\ubc84/\ub3c4\uba54\uc778 \uc784\ub300\ub8cc", "\u0e04\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e20\u0e32\u0e22\u0e19\u0e2d\u0e01": "\uc678\ubd80 \uc11c\ube44\uc2a4 \ube44\uc6a9", "\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19": "\uc9c1\uc6d0 \uae09\uc5ec", "\u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19": "\uc0ac\ubb34\uc2e4 \ube44\uc6a9", "\u0e04\u0e48\u0e32\u0e02\u0e19\u0e2a\u0e48\u0e07": "\uc6b4\uc1a1\ube44", "\u0e04\u0e48\u0e32\u0e27\u0e31\u0e2a\u0e14\u0e38": "\uc790\uc7ac\ube44", "\u0e04\u0e48\u0e32\u0e42\u0e06\u0e29\u0e13\u0e32": "\uad11\uace0\ube44", "\u0e2d\u0e37\u0e48\u0e19\u0e46": "\uae30\ud0c0" },
    } : currency === "USD" ? {
      locale: "en-US",
      title: "Income & Expense Ledger",
      printedAt: "Printed",
      incomeTotal: "\ud83d\udcb0 Total Income",
      expenseTotal: "\ud83d\udcb8 Total Expense",
      profitLabel: "\ud83d\udcc8 Net Profit",
      lossLabel: "\ud83d\udcc9 Net Loss",
      profitBanner: "\ud83d\udcc8 Profit",
      lossBanner: "\ud83d\udcc9 Loss",
      incomeRow: "\ud83d\udcb0 Income",
      expenseRow: "\ud83d\udcb8 Expense",
      colNo: "#",
      colDate: "Date",
      colRef: "Reference",
      colDesc: "Item / Detail",
      colIncome: "Income",
      colExpense: "Expense",
      colBalance: "Running Balance",
      footerTotal: "Total",
      footerItems: "items",
      noData: "No records",
      printBtn: "\ud83d\udda8\ufe0f Print",
      statusMap: { PENDING: "Pending", PAID: "Paid", OVERDUE: "Overdue", CANCELLED: "Cancelled", "\u0e23\u0e2d\u0e0a\u0e33\u0e23\u0e30": "Pending", "\u0e41\u0e19\u0e1a\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27": "Receipt Attached", "\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27": "Paid", "\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14": "Overdue", "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01": "Cancelled" },
      categoryMap: { "\u0e04\u0e48\u0e32\u0e40\u0e0a\u0e48\u0e32\u0e40\u0e0b\u0e34\u0e23\u0e4c\u0e1f\u0e40\u0e27\u0e2d\u0e23\u0e4c/\u0e42\u0e14\u0e40\u0e21\u0e19": "Server/Domain Rental", "\u0e04\u0e48\u0e32\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e20\u0e32\u0e22\u0e19\u0e2d\u0e01": "External Service Fee", "\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19": "Employee Wages", "\u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19": "Office Expenses", "\u0e04\u0e48\u0e32\u0e02\u0e19\u0e2a\u0e48\u0e07": "Transport", "\u0e04\u0e48\u0e32\u0e27\u0e31\u0e2a\u0e14\u0e38": "Materials", "\u0e04\u0e48\u0e32\u0e42\u0e06\u0e29\u0e13\u0e32": "Advertising", "\u0e2d\u0e37\u0e48\u0e19\u0e46": "Others" },
    } : {
      locale: "th-TH",
      title: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a-\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22",
      printedAt: "\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e40\u0e21\u0e37\u0e48\u0e2d",
      incomeTotal: "\ud83d\udcb0 \u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a\u0e23\u0e27\u0e21",
      expenseTotal: "\ud83d\udcb8 \u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22\u0e23\u0e27\u0e21",
      profitLabel: "\ud83d\udcc8 \u0e01\u0e33\u0e44\u0e23\u0e2a\u0e38\u0e17\u0e18\u0e34\u0e4c",
      lossLabel: "\ud83d\udcc9 \u0e02\u0e32\u0e14\u0e17\u0e38\u0e19\u0e2a\u0e38\u0e17\u0e18\u0e34\u0e4c",
      profitBanner: "\ud83d\udcc8 \u0e01\u0e33\u0e44\u0e23",
      lossBanner: "\ud83d\udcc9 \u0e02\u0e32\u0e14\u0e17\u0e38\u0e19",
      incomeRow: "\ud83d\udcb0 \u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a",
      expenseRow: "\ud83d\udcb8 \u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22",
      colNo: "#",
      colDate: "\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48",
      colRef: "\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07",
      colDesc: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23/\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14",
      colIncome: "\u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a",
      colExpense: "\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22",
      colBalance: "\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e2a\u0e30\u0e2a\u0e21",
      footerTotal: "\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
      footerItems: "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23",
      noData: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23",
      printBtn: "\ud83d\udda8\ufe0f \u0e1e\u0e34\u0e21\u0e1e\u0e4c",
      statusMap: { PENDING: "\u0e23\u0e2d\u0e0a\u0e33\u0e23\u0e30", PAID: "\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27", OVERDUE: "\u0e40\u0e01\u0e34\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14", CANCELLED: "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01" },
      categoryMap: {},
    };

    const fmt = n => Math.abs(n).toLocaleString(L.locale);
    const PAID_INV = ["PAID"];
    const PAID_EXP = ["\u0e41\u0e19\u0e1a\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27", "PAID"];
    const curInvoices = invoices.filter(i => (i.currency || "THB") === currency && (!paidOnly || PAID_INV.includes(i.status)));
    const curExpenses = expenses.filter(e => (e.currency || "THB") === currency && (!paidOnly || PAID_EXP.includes(e.status)));
    const rows = [
      ...curInvoices.map(i => ({ date: new Date(i.createdAt), type: "income", ref: i.number, desc: i.client?.name || clients.find(c => c.id === i.clientId)?.name || "\u2014", detail: L.statusMap[i.status] || i.status, income: Number(i.amount), expense: 0 })),
      ...curExpenses.map(e => ({ date: new Date(e.date), type: "expense", ref: e.number, desc: L.categoryMap[e.category] || e.category, detail: L.statusMap[e.status] || e.status || L.statusMap["PENDING"], income: 0, expense: Number(e.amount) })),
    ].sort((a, b) => a.date - b.date).filter(r => {
      if (!filterMode || filterMode === "all") return true;
      if (filterMode === "number") return !filterRef || r.ref.toLowerCase().includes(filterRef.toLowerCase());
      if (filterMode === "date") { if (!filterDate) return true; const d = r.date.toISOString().slice(0, 10); return d === filterDate; }
      if (filterMode === "range") { const d = r.date.toISOString().slice(0, 10); if (filterFrom && d < filterFrom) return false; if (filterTo && d > filterTo) return false; return true; }
      return true;
    });
    let running = 0;
    const totalIncome = curInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = curExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalIncome - totalExpense;
    const isProfit = netProfit >= 0;
    const profitBg = isProfit ? "#e8f5e9" : "#fdecea";
    const profitColor = isProfit ? "#1b5e20" : "#b71c1c";
    const profitBorder = isProfit ? "#a5d6a7" : "#ef9a9a";
    const profitLabel = isProfit ? L.profitLabel : L.lossLabel;
    const profitValColor = isProfit ? "green" : "#c0392b";
    const profitSign = isProfit ? "+" : "-";
    const profitBannerLabel = isProfit ? L.profitBanner : L.lossBanner;
    const netProfitFmt = fmt(netProfit);
    const tableRows = rows.map((r, idx) => {
      running += r.income - r.expense;
      const runColor = running >= 0 ? "green" : "#c0392b";
      const runSign = running >= 0 ? "+" : "-";
      const refColor = r.type === "income" ? "#1a4a9e" : "#8b1a1a";
      const typeLabel = r.type === "income" ? L.incomeRow : L.expenseRow;
      const incCell = r.income > 0 ? "+" + sym + fmt(r.income) : "\u2014";
      const expCell = r.expense > 0 ? "-" + sym + fmt(r.expense) : "\u2014";
      return "<tr>" +
        "<td style='text-align:center;color:#888'>" + (idx + 1) + "</td>" +
        "<td style='white-space:nowrap'>" + r.date.toLocaleDateString(L.locale) + "</td>" +
        "<td><code style='font-size:11px;color:" + refColor + "'>" + r.ref + "</code></td>" +
        "<td>" + r.desc + "<br/><span style='font-size:11px;color:#666'>" + typeLabel + " \u00b7 " + r.detail + "</span></td>" +
        "<td style='text-align:right;color:green;font-weight:700'>" + incCell + "</td>" +
        "<td style='text-align:right;color:#c0392b;font-weight:700'>" + expCell + "</td>" +
        "<td style='text-align:right;font-weight:800;color:" + runColor + "'>" + runSign + sym + fmt(running) + "</td>" +
        "</tr>";
    }).join("");
    const win = window.open("", "_blank");
    const html =
      "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
      "<title>" + L.title + " (" + currency + ")</title>" +
      "<style>" +
      "body{font-family:'Sarabun','Malgun Gothic',Arial,sans-serif;padding:24px;color:#111;font-size:13px}" +
      "h2{margin-bottom:4px}.sub{color:#555;margin-bottom:12px;font-size:12px}" +
      ".summary{display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap}" +
      ".card{border:1px solid #ccc;border-radius:6px;padding:12px 20px;text-align:center;min-width:140px}" +
      ".card .label{font-size:11px;color:#888}.card .val{font-size:18px;font-weight:800}" +
      ".profit-banner{padding:10px 16px;border-radius:6px;font-weight:700;font-size:14px;margin-bottom:16px;" +
      "background:" + profitBg + ";color:" + profitColor + ";border:1px solid " + profitBorder + "}" +
      "table{width:100%;border-collapse:collapse}" +
      "th{background:#1a1a2e;color:#fff;padding:8px 10px;text-align:left;font-size:12px}" +
      "td{padding:7px 10px;border-bottom:1px solid #e0e0e0;vertical-align:top}" +
      "tr:nth-child(even) td{background:#fafafa}" +
      "tfoot td{font-weight:800;background:#f0f0f0;border-top:2px solid #333}" +
      "@media print{button{display:none}}" +
      "</style></head><body>" +
      "<div style='font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:4px'>GOEUN SERVER HUB</div>" +
      "<h2 style='margin:0 0 4px'>\ud83d\udcd2 " + L.title + " (" + currency + ")</h2>" +
      "<div class='sub'>" + L.printedAt + ": " + new Date().toLocaleString(L.locale) + "</div>" +
      "<div class='summary'>" +
        "<div class='card'><div class='label'>" + L.incomeTotal + "</div><div class='val' style='color:green'>" + sym + fmt(totalIncome) + "</div><div class='label'>" + currency + "</div></div>" +
        "<div class='card'><div class='label'>" + L.expenseTotal + "</div><div class='val' style='color:#c0392b'>" + sym + fmt(totalExpense) + "</div><div class='label'>" + currency + "</div></div>" +
        "<div class='card'><div class='label'>" + profitLabel + "</div><div class='val' style='color:" + profitValColor + "'>" + profitSign + sym + netProfitFmt + "</div><div class='label'>" + currency + "</div></div>" +
      "</div>" +
      "<div class='profit-banner'>" + profitBannerLabel + ": " + profitSign + sym + netProfitFmt + " " + currency + " &nbsp;|&nbsp; " + L.incomeTotal + " " + sym + fmt(totalIncome) + " &minus; " + L.expenseTotal + " " + sym + fmt(totalExpense) + "</div>" +
      "<table><thead><tr><th>" + L.colNo + "</th><th>" + L.colDate + "</th><th>" + L.colRef + "</th><th>" + L.colDesc + "</th>" +
      "<th style='text-align:right'>" + L.colIncome + "</th><th style='text-align:right'>" + L.colExpense + "</th><th style='text-align:right'>" + L.colBalance + "</th></tr></thead>" +
      "<tbody>" + (tableRows || "<tr><td colspan='7' style='text-align:center;padding:24px;color:#888'>" + L.noData + "</td></tr>") + "</tbody>" +
      "<tfoot><tr><td colspan='4'>" + L.footerTotal + " (" + rows.length + " " + L.footerItems + ")</td>" +
      "<td style='text-align:right;color:green'>+" + sym + fmt(totalIncome) + "</td>" +
      "<td style='text-align:right;color:#c0392b'>-" + sym + fmt(totalExpense) + "</td>" +
      "<td style='text-align:right;color:" + profitValColor + "'>" + profitSign + sym + netProfitFmt + "</td></tr></tfoot></table>" +
      "<br/><button onclick='window.print()' style='padding:8px 20px;font-size:14px;cursor:pointer'>" + L.printBtn + "</button>" +
      "</body></html>";
    win.document.write(html);
    win.document.close();
  };
  const filteredClients = clients.filter(c =>
    (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
     c.slug.toLowerCase().includes(clientSearch.toLowerCase())) &&
    (!filterClientStatus || c.status === filterClientStatus)
  );
  const filteredUsers = users.filter(u =>
    ((u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
    (!filterUserRole || u.role === filterUserRole)
  );
  const filteredInvoices = invoices.filter(i =>
    (!filterInvoiceClientId || i.clientId === filterInvoiceClientId) &&
    (!filterInvoiceStatus || i.status === filterInvoiceStatus)
  );
  const filteredReceipts = receipts.filter(r =>
    (!filterReceiptClientId || r.clientId === filterReceiptClientId)
  );

  const S = {
    bg: { background: "#0f1117", minHeight: "100dvh", color: "#e8eaf0" },
    nav: { background: "#16181f", borderBottom: "1px solid #2a2d3a", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    card: { background: "#16181f", border: "1px solid #2a2d3a", borderRadius: 10, padding: 20 },
    input: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#e8eaf0", borderRadius: 6, padding: "8px 12px", width: "100%", fontSize: 14, outline: "none" },
    inputNum: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#e8eaf0", borderRadius: 6, padding: "8px 12px", width: "100%", fontSize: 14, outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" },
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
          <Link href="/admin/products" style={{ color: "#8b8fa8", fontSize: 13, textDecoration: "none" }}>สินค้า</Link>
          <span style={{ color: "#7eb8f7", fontSize: 13, fontWeight: 600 }}>ลูกค้า &amp; Users</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#8b8fa8", fontSize: 13 }}>{session.user.name || session.user.email}</span>
          <Link href="/admin/payments" style={{ ...S.btn("#1a2e1a", "#4ade80"), textDecoration: "none", padding: "6px 14px" }}>
            💰 บันทึกการชำระเงิน
          </Link>
          <Link href="/mct-product" style={{ ...S.btn("#1e2336", "#7eb8f7"), textDecoration: "none", padding: "6px 14px" }}>
            📦 จัดการสินค้า
          </Link>
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
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "ลูกค้าทั้งหมด", value: clients.length, color: "#7eb8f7",
              onClick: () => { setTab("clients"); setFilterClientStatus(""); setClientSearch(""); } },
            { label: "ONLINE", value: clients.filter(c => c.status === "ONLINE").length, color: "#4ade80",
              onClick: () => { setTab("clients"); setFilterClientStatus("ONLINE"); setClientSearch(""); } },
            { label: "Users ทั้งหมด", value: users.length, color: "#a78bfa",
              onClick: () => { setTab("users"); setFilterUserRole(""); setUserSearch(""); } },
            { label: "Users (CLIENT)", value: users.filter(u => u.role === "CLIENT").length, color: "#fb923c",
              onClick: () => { setTab("users"); setFilterUserRole("CLIENT"); setUserSearch(""); } },
            { label: "รอชำระ", value: invoices.filter(i => i.status === "PENDING").length, color: "#fbbf24",
              onClick: () => { setTab("invoices"); setFilterInvoiceStatus("PENDING"); } },
            { label: "เกินกำหนด", value: invoices.filter(i => i.status === "OVERDUE").length, color: "#f87171",
              onClick: () => { setTab("invoices"); setFilterInvoiceStatus("OVERDUE"); } },
          ].map(s => (
            <div key={s.label} onClick={s.onClick} style={{ ...S.card, textAlign: "center", cursor: "pointer", transition: "border-color .15s",
              borderColor: "#2a2d3a", ":hover": { borderColor: s.color } }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2d3a"}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#8b8fa8", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {[["clients", "🏢 ลูกค้า"], ["users", "👤 Users"], ["invoices", "💳 การชำระเงิน"], ["receipts", "🧾 ใบเสร็จรับเงิน"], ["expenses", "📝 ค่าใช้จ่าย"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              ...S.btn(tab === key ? "#1e3a5f" : "#1e2130", tab === key ? "#7eb8f7" : "#8b8fa8"),
              border: tab === key ? "1px solid #3b82f6" : "1px solid #2a2d3a",
              padding: "9px 20px", fontSize: 14,
            }}>{label}</button>
          ))}
          <button style={{ ...S.btn("#2d2040", "#c084fc"), border: "1px solid #7c3aed", padding: "9px 20px", fontSize: 14 }}
            onClick={() => { setReportDataType(tab === "expenses" ? "expense" : "invoice"); setReportMode("number"); setReportInvNum(""); setReportDate(""); setReportFrom(""); setReportTo(""); setReportModal(true); }}>
            📊 รายงาน
          </button>
          <button style={{ ...S.btn("#0f2318", "#4ade80"), border: "1px solid #166534", padding: "9px 20px", fontSize: 14 }}
            onClick={() => { setLedgerCurrency("THB"); setLedgerModal(true); }}>
            📒 บัญชี ไทย-เกาหลี
          </button>
          <button style={{ ...S.btn("#1e3d2f", "#5ecb8a"), border: "1px solid #15803d", padding: "9px 20px", fontSize: 14 }}
            onClick={openAddReceipt}>
            🧾 บริการออกใบเสร็จของผู้ใช้บริการเรา
          </button>
        </div>

        {/* ── CLIENTS TAB ── */}
        {tab === "clients" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  style={{ ...S.input, maxWidth: 280 }}
                  placeholder="🔍 ค้นหาชื่อ / slug..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
                <select style={{ ...S.input, maxWidth: 160 }} value={filterClientStatus} onChange={e => setFilterClientStatus(e.target.value)}>
                  <option value="">ทุกสถานะ</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                {(filterClientStatus) && (
                  <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => { setFilterClientStatus(""); setClientSearch(""); }}>× ล้าง filter</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={openAddClient}>+ เพิ่มลูกค้าใหม่</button>
                <button style={S.btn("#0f2b3d", "#67e8f9")} onClick={openClientEditPicker}>🛠️ แก้ไขข้อมูลลูกค้า</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ชื่อบริษัท", "Slug", "สถานะ", "อีเมลติดต่อ", "เบอร์โทร", "URL ระบบ", "Users", "ค่าบริการรายเดือน", "ค่าเช่าโดเมนรายปี", "สร้างเมื่อ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredClients.length === 0 ? (
                    <tr><td colSpan={11} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีลูกค้า</td></tr>
                  ) : filteredClients.map(c => {
                    const sb = STATUS_BADGE[c.status] || STATUS_BADGE.OFFLINE;
                    const pendingInvoices = (c.invoices || []).filter(i => i.status === "PENDING");
                    const monthlyInv = pendingInvoices.filter(i => !/โดเมน/i.test(i.notes || ""));
                    const domainInv = pendingInvoices.filter(i => /โดเมน/i.test(i.notes || ""));
                    const renderPending = (list) => list.length === 0 ? <span style={{ color: "#4a5070", fontSize: 12 }}>✔ ไม่มีค้างชำระ</span> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {list.map(inv => (
                          <div key={inv.id} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ background: "#3d2e0a", color: "#fbbf24", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>รอชำระ</span>
                            <span style={{ color: "#8b8fa8", fontSize: 11 }}>
                              {Number(inv.amount).toLocaleString("th-TH")} THB
                              {inv.dueDate && ` · ครบ ${new Date(inv.dueDate).toLocaleDateString("th-TH")}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                    return (
                      <tr key={c.id}>
                        <td style={S.td}><span style={{ fontWeight: 600 }}>{c.name}</span></td>
                        <td style={S.td}><code style={{ color: "#8b8fa8", fontSize: 12 }}>{c.slug}</code></td>
                        <td style={S.td}>
                          <span style={{ background: sb.bg, color: sb.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{sb.label}</span>
                        </td>
                        <td style={S.td}>{c.contactEmail || <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={S.td}>{c.contactPhone || <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={S.td}>
                          {c.systemUrl ? (
                            <a href={c.systemUrl} target="_blank" rel="noopener noreferrer"
                              style={{ color: "#7eb8f7", fontSize: 12, textDecoration: "none", wordBreak: "break-all" }}
                              title={c.systemUrl}>
                              🔗 {c.systemUrl.replace(/^https?:\/\//, "").split("/")[0]}
                            </a>
                          ) : <span style={{ color: "#4a5070" }}>—</span>}
                        </td>
                        <td style={S.td}>
                          <span style={{ background: "#1a2744", color: "#7eb8f7", borderRadius: 4, padding: "2px 10px", fontWeight: 700 }}>{c._count.users}</span>
                        </td>
                        <td style={S.td}>{renderPending(monthlyInv)}</td>
                        <td style={S.td}>{renderPending(domainInv)}</td>
                        <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditClient(c)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteClient(c.id, c.name)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  style={{ ...S.input, maxWidth: 240 }}
                  placeholder="🔍 ค้นหาชื่อ / email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <select
                  style={{ ...S.input, maxWidth: 220 }}
                  value={filterClientId}
                  onChange={e => setFilterClientId(e.target.value)}
                >
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select style={{ ...S.input, maxWidth: 160 }} value={filterUserRole} onChange={e => setFilterUserRole(e.target.value)}>
                  <option value="">ทุก Role</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CLIENT">CLIENT</option>
                </select>
              </div>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={openAddUser}>+ เพิ่ม User ใหม่</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ชื่อ", "Username", "Password", "Email", "Role", "บริษัท", "สร้างเมื่อ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มี User</td></tr>
                  ) : filteredUsers.map(u => {
                    const rb = ROLE_BADGE[u.role] || ROLE_BADGE.CLIENT;
                    return (
                      <tr key={u.id}>
                        <td style={S.td}><span style={{ fontWeight: 600 }}>{u.name || <span style={{ color: "#4a5070" }}>—</span>}</span></td>
                        <td style={S.td}>
                          {u.username
                            ? <code style={{ background: "#1e2130", color: "#a78bfa", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>{u.username}</code>
                            : <span style={{ color: "#4a5070" }}>—</span>}
                        </td>
                        <td style={S.td}>
                          <span style={{ color: "#4a5070", letterSpacing: 2, fontSize: 13 }}>••••••••</span>
                        </td>
                        <td style={S.td}>{u.email}</td>
                        <td style={S.td}>
                          <span style={{ background: rb.bg, color: rb.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{rb.label}</span>
                        </td>
                        <td style={S.td}>{u.client ? <span style={{ color: "#7eb8f7" }}>{u.client.name}</span> : <span style={{ color: "#4a5070" }}>— ยังไม่ผูก —</span>}</td>
                        <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditUser(u)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteUser(u.id, u.email)}
                              disabled={u.id === session.user.id}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {tab === "invoices" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  style={{ ...S.input, maxWidth: 220 }}
                  value={filterInvoiceClientId}
                  onChange={e => setFilterInvoiceClientId(e.target.value)}
                >
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select style={{ ...S.input, maxWidth: 160 }} value={filterInvoiceStatus} onChange={e => setFilterInvoiceStatus(e.target.value)}>
                  <option value="">ทุกสถานะ</option>
                  <option value="PENDING">รอชำระ</option>
                  <option value="PAID">ชำระแล้ว</option>
                  <option value="OVERDUE">เกินกำหนด</option>
                  <option value="CANCELLED">ยกเลิก</option>
                </select>
                {(filterInvoiceStatus || filterInvoiceClientId) && (
                  <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => { setFilterInvoiceStatus(""); setFilterInvoiceClientId(""); }}>× ล้าง filter</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={openAddInvoice}>+ สร้าง Invoice ใหม่</button>
                <button style={S.btn("#1e3d2f", "#5ecb8a")} onClick={openAddReceipt}>🧾 สร้างใบเสร็จรับเงิน</button>
                <button style={S.btn("#2d2040", "#c084fc")} onClick={() => { setReportDataType("invoice"); setReportMode("number"); setReportInvNum(""); setReportDate(""); setReportFrom(""); setReportTo(""); setReportModal(true); }}>📊 รายงาน</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["เลข Invoice", "บริษัท", "ยอด", "สถานะ", "วันครบกำหนด", "ชำระเมื่อ", "หมายเหตุ", "สร้างเมื่อ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ไม่พบข้อมูล</td></tr>
                  ) : filteredInvoices.map(inv => {
                    const ib = INVOICE_BADGE[inv.status] || INVOICE_BADGE.PENDING;
                    return (
                      <tr key={inv.id}>
                        <td style={S.td}><code style={{ color: "#7eb8f7", fontSize: 12 }}>{inv.number}</code></td>
                        <td style={S.td}><span style={{ fontWeight: 600 }}>{inv.client?.name || "—"}</span></td>
                        <td style={S.td}>
                          <span style={{ fontWeight: 700, color: "#4ade80" }}>{Number(inv.amount).toLocaleString("th-TH")}</span>
                          {inv.currency !== "THB" && <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 700, color: "#a78bfa", background: "#1e1b4b", borderRadius: 4, padding: "1px 6px" }}>{inv.currency}</span>}
                        </td>
                        <td style={S.td}>
                          <span style={{ background: ib.bg, color: ib.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{ib.label}</span>
                        </td>
                        <td style={{ ...S.td, fontSize: 12 }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("th-TH") : <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{inv.paidAt ? <span style={{ color: "#4ade80" }}>{new Date(inv.paidAt).toLocaleDateString("th-TH")}</span> : <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={{ ...S.td, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.notes || <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(inv.createdAt).toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditInvoice(inv)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteInvoice(inv.id, inv.number)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── RECEIPTS TAB ── */}
        {tab === "receipts" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  style={{ ...S.input, maxWidth: 220 }}
                  value={filterReceiptClientId}
                  onChange={e => setFilterReceiptClientId(e.target.value)}
                >
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {filterReceiptClientId && (
                  <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setFilterReceiptClientId("")}>× ล้าง filter</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={S.btn("#1e3d2f", "#5ecb8a")} onClick={openAddReceipt}>+ สร้างใบเสร็จรับเงิน</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["เลขที่ใบเสร็จ", "ผู้ออกบิล", "ลูกค้า", "จำนวนรายการ", "รวม", "วันที่ออก", "หมายเหตุ", ""].map((h, i) => (
                      <th key={h || `h${i}`} style={{ ...S.th, whiteSpace: "nowrap", ...(i === 3 || i === 4 || i === 5 ? { textAlign: "right" } : {}), ...(i === 7 ? { width: 96 } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีใบเสร็จ</td></tr>
                  ) : filteredReceipts.map(receipt => (
                    <tr key={receipt.id}>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}><code style={{ color: "#5ecb8a", fontSize: 12 }}>{receipt.number}</code></td>
                      <td style={{ ...S.td, fontWeight: 600, whiteSpace: "nowrap" }}>{receipt.client?.name || "—"}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{receipt.customerName || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, fontSize: 12, color: "#8b8fa8", textAlign: "right", whiteSpace: "nowrap" }}>{receipt.items?.length || 0} รายการ</td>
                      <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: "#4ade80" }}>{Number(receipt.total).toLocaleString("th-TH")}</span>
                        <span style={{ marginLeft: 4, fontSize: 11, color: "#8b8fa8" }}>{receipt.currency || "THB"}</span>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, whiteSpace: "nowrap" }}>{new Date(receipt.issuedAt).toLocaleDateString("th-TH")}</td>
                      <td style={{ ...S.td, fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{receipt.notes || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={S.btn("#1a2d3d", "#7eb8f7")} title="แก้ไข" onClick={() => openEditReceipt(receipt)}>✏️</button>
                          <button style={S.btn("#0f3a2b", "#5ecb8a")} title="พิมพ์" onClick={() => printReceipt(receipt)}>🖨️</button>
                          <button style={S.btn("#2a1f1f", "#f87171")} title="ลบ" onClick={() => deleteReceipt(receipt.id, receipt.number)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === "customers" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  style={{ ...S.input, maxWidth: 220 }}
                  value={filterCustomerClientId}
                  onChange={e => { setFilterCustomerClientId(e.target.value); }}
                >
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  style={{ ...S.input, maxWidth: 200 }}
                  placeholder="ค้นหาชื่อ..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                <span style={{ fontSize: 12, color: "#8b8fa8" }}>
                  {customers.filter(c =>
                    (!filterCustomerClientId || c.clientId === filterCustomerClientId) &&
                    (!customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                  ).length} รายการ
                </span>
              </div>
              <button style={S.btn("#1e3d2f", "#5ecb8a")} onClick={openAddCustomer}>+ เพิ่มลูกค้า</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["บริษัท", "ชื่อลูกค้า", "เบอร์โทร", "อีเมล", "บัตรประชาชน", "หมายเหตุ", ""].map((h, i) => (
                      <th key={h || `ch${i}`} style={{ ...S.th, ...(i === 6 ? { width: 80 } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : customers.filter(c =>
                    (!filterCustomerClientId || c.clientId === filterCustomerClientId) &&
                    (!customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                  ).length === 0 ? (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีข้อมูลลูกค้า</td></tr>
                  ) : customers.filter(c =>
                    (!filterCustomerClientId || c.clientId === filterCustomerClientId) &&
                    (!customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                  ).map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontSize: 12, color: "#8b8fa8", whiteSpace: "nowrap" }}>{c.client?.name || "—"}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{c.phone || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{c.email || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{c.idCard || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={S.btn("#1a2d3d", "#7eb8f7")} title="แก้ไข" onClick={() => openEditCustomer(c)}>✏️</button>
                          <button style={S.btn("#2a1f1f", "#f87171")} title="ลบ" onClick={() => deleteCustomer(c.id, c.name)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {tab === "expenses" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#8b8fa8" }}>บันทึกค่าใช้จ่ายทั้งหมด {expenses.length} รายการ
                {expenses.length > 0 && (
                  <span style={{ marginLeft: 12, color: "#f87171", fontWeight: 700 }}>
                    รวม: {Object.entries(expenses.reduce((acc, e) => { const cur = e.currency || "THB"; acc[cur] = (acc[cur] || 0) + Number(e.amount); return acc; }, {})).map(([cur, total]) => `${total.toLocaleString("th-TH")} ${cur}`).join(" | ")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={S.btn("#3d1f1f", "#f87171")} onClick={openAddExpense}>📝 สร้างบันทึกค่าใช้จ่าย</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["เลขที่", "หมวดหมู่", "ยอด", "สถานะ", "เลขที่ใบเสร็จ", "หมายเหตุ", "วันที่", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : expenses.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีบันทึกค่าใช้จ่าย</td></tr>
                  ) : expenses.map(exp => (
                    <tr key={exp.id}>
                      <td style={S.td}><code style={{ color: "#f87171", fontSize: 12 }}>{exp.number}</code></td>
                      <td style={S.td}><span style={{ background: "#2a1515", color: "#fb923c", borderRadius: 4, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{exp.category}</span></td>
                      <td style={S.td}><span style={{ fontWeight: 700, color: "#f87171" }}>{Number(exp.amount).toLocaleString("th-TH")}</span>{exp.currency && exp.currency !== "THB" && <span style={{ marginLeft: 6, fontSize: 11, background: exp.currency === "KRW" ? "#1a1a2e" : "#1a2e1a", color: exp.currency === "KRW" ? "#818cf8" : "#4ade80", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{exp.currency === "KRW" ? "₩" : "$"} {exp.currency}</span>}</td>
                      <td style={S.td}>
                        {exp.status === "แนบใบเสร็จแล้ว"
                          ? <span style={{ fontSize: 11, background: "#14532d", color: "#4ade80", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>✅ แนบใบเสร็จแล้ว</span>
                          : <span style={{ fontSize: 11, background: "#2d1b4e", color: "#c084fc", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>⏳ รอชำระ</span>}
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>{exp.receiptNumber ? <code style={{ color: "#a78bfa", fontSize: 11 }}>{exp.receiptNumber}</code> : <span style={{ color: "#4a5070" }}>—</span>}{(() => { const paths = parseExpenseReceiptPaths(exp.receiptFile); if (paths.length === 0) return null; return <><span style={{ marginLeft: 6, display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>{paths.map((path, i) => <span key={i} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><a href={path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#60a5fa" }}>📄{paths.length > 1 ? i + 1 : ""}</a><button type="button" title="พิมพ์ไฟล์แนบ" onClick={() => printExpenseAttachment(path)} style={{ border: "1px solid #334155", background: "#0f172a", color: "#93c5fd", borderRadius: 4, fontSize: 10, lineHeight: 1.2, padding: "1px 4px", cursor: "pointer" }}>🖨️</button></span>)}</span>{paths.length > 1 && <button type="button" title="พิมพ์รวมทุกไฟล์แนบ" onClick={() => printExpenseAttachmentsBatch(paths, `ไฟล์แนบ ${exp.number}`)} style={{ marginLeft: 6, border: "1px solid #1e40af", background: "#1e3a8a", color: "#dbeafe", borderRadius: 4, fontSize: 10, lineHeight: 1.2, padding: "1px 6px", cursor: "pointer" }}>🖨️รวม</button>}</>; })()}</td>
                      <td style={{ ...S.td, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.notes || <span style={{ color: "#4a5070" }}>—</span>}</td>
                      <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(exp.date).toLocaleDateString("th-TH")}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={S.btn("#0f3a2b", "#5ecb8a")} title="พิมพ์บิล" onClick={() => printExpenseBill(exp)}>🖨️</button>
                          <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditExpense(exp)}>✏️</button>
                          <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteExpense(exp.id, exp.number)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── LEDGER MODAL ── */}
      {ledgerModal && (() => {
        const CURRENCIES = ["THB", "KRW", "USD"];
        const symMap = { THB: "฿", KRW: "₩", USD: "$" };
        const sym = symMap[ledgerCurrency] || "";
        const fmt = n => Math.abs(n).toLocaleString("th-TH");

        const PAID_STATUSES_INV = ["PAID"];
        const PAID_STATUSES_EXP = ["แนบใบเสร็จแล้ว", "PAID"];
        const curInvoices = invoices.filter(i => (i.currency || "THB") === ledgerCurrency && (!ledgerPaidOnly || PAID_STATUSES_INV.includes(i.status)));
        const curExpenses = expenses.filter(e => (e.currency || "THB") === ledgerCurrency && (!ledgerPaidOnly || PAID_STATUSES_EXP.includes(e.status)));

        // Build combined ledger rows sorted by date
        const rows = [
          ...curInvoices.map(i => ({
            id: i.id, date: new Date(i.createdAt), type: "income",
            ref: i.number, desc: i.client?.name || "—",
            detail: { PENDING: "รอชำระ", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", CANCELLED: "ยกเลิก" }[i.status] || i.status,
            income: Number(i.amount), expense: 0,
          })),
          ...curExpenses.map(e => ({
            id: e.id, date: new Date(e.date), type: "expense",
            ref: e.number, desc: e.category,
            detail: e.status || "รอชำระ",
            income: 0, expense: Number(e.amount),
          })),
        ].sort((a, b) => a.date - b.date);

        // Compute running balance
        let running = 0;
        const ledgerRows = rows.map(r => {
          running += r.income - r.expense;
          return { ...r, running };
        });

        const totalIncome = curInvoices.reduce((s, i) => s + Number(i.amount), 0);
        const totalExpense = curExpenses.reduce((s, e) => s + Number(e.amount), 0);
        const netProfit = totalIncome - totalExpense;
        const isProfit = netProfit >= 0;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}>
            <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 960, border: "1px solid #2a2d3a", marginTop: 16 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ color: "#8b8fa8", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>GOEUN SERVER HUB</div>
                  <h5 style={{ margin: 0, color: "#4ade80", fontSize: 17 }}>📒 บัญชีรายรับ-รายจ่าย</h5>
                </div>
                <button style={{ background: "none", border: "none", color: "#8b8fa8", fontSize: 22, cursor: "pointer" }} onClick={() => setLedgerModal(false)}>✕</button>
              </div>

              {/* Currency toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {CURRENCIES.map(cur => (
                  <button key={cur} style={{ padding: "7px 20px", borderRadius: 6, border: ledgerCurrency === cur ? "1px solid #4ade80" : "1px solid #2a2d3a", background: ledgerCurrency === cur ? "#0f2318" : "#1e2130", color: ledgerCurrency === cur ? "#4ade80" : "#8b8fa8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    onClick={() => setLedgerCurrency(cur)}>{symMap[cur]} {cur}</button>
                ))}
              </div>
              {/* Paid-only filter toggle */}
              <div style={{ marginBottom: 20 }}>
                <button onClick={() => setLedgerPaidOnly(p => !p)} style={{ ...S.btn(ledgerPaidOnly ? "#0f2318" : "#1e2130", ledgerPaidOnly ? "#4ade80" : "#8b8fa8"), border: ledgerPaidOnly ? "1px solid #4ade80" : "1px solid #2a2d3a", fontSize: 12, padding: "5px 14px" }}>
                  {ledgerPaidOnly ? "✅" : "⬜"} แสดงเฉพาะ ชำระแล้ว / แนบใบเสร็จแล้ว
                </button>
              </div>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "💰 รายรับรวม", value: totalIncome, color: "#4ade80", bg: "#0f2318", border: "#166534" },
                  { label: "💸 รายจ่ายรวม", value: totalExpense, color: "#f87171", bg: "#1f0f0f", border: "#7f1d1d" },
                  { label: isProfit ? "📈 กำไรสุทธิ" : "📉 ขาดทุนสุทธิ", value: netProfit, color: isProfit ? "#4ade80" : "#f87171", bg: isProfit ? "#0f2318" : "#1f0f0f", border: isProfit ? "#166534" : "#7f1d1d" },
                  { label: "📋 รายการทั้งหมด", value: rows.length, color: "#7eb8f7", bg: "#0f1830", border: "#1e3a5f", isCount: true },
                ].map(({ label, value, color, bg, border, isCount }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#8b8fa8", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>
                      {isCount ? value : `${sym}${fmt(value)}`}
                    </div>
                    {!isCount && <div style={{ fontSize: 11, color: "#4a5070", marginTop: 2 }}>{ledgerCurrency}</div>}
                  </div>
                ))}
              </div>

              {/* Profit/Loss banner */}
              <div style={{ background: isProfit ? "#052e16" : "#450a0a", border: `1px solid ${isProfit ? "#166534" : "#7f1d1d"}`, borderRadius: 8, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: isProfit ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 15 }}>
                  {isProfit ? "📈 กำไร" : "📉 ขาดทุน"}: {sym}{fmt(netProfit)} {ledgerCurrency}
                </span>
                <span style={{ color: "#8b8fa8", fontSize: 12 }}>
                  รายรับ {sym}{fmt(totalIncome)} − รายจ่าย {sym}{fmt(totalExpense)}
                </span>
              </div>

              {/* Combined ledger table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#", "วันที่", "เลขที่อ้างอิง", "รายการ / รายละเอียด", `รายรับ (${ledgerCurrency})`, `รายจ่าย (${ledgerCurrency})`, `คงเหลือสะสม`].map(h => (
                        <th key={h} style={{ ...S.th, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#4a5070", padding: 32 }}>ไม่มีรายการในสกุลเงินนี้</td></tr>
                    ) : ledgerRows.map((r, idx) => (
                      <tr key={r.id} style={{ background: idx % 2 === 0 ? "transparent" : "#0f111633" }}>
                        <td style={{ ...S.td, color: "#4a5070", fontSize: 11, textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ ...S.td, fontSize: 11, color: "#8b8fa8", whiteSpace: "nowrap" }}>{r.date.toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <code style={{ fontSize: 11, color: r.type === "income" ? "#7eb8f7" : "#f87171" }}>{r.ref}</code>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontSize: 13 }}>{r.desc}</div>
                          <div style={{ fontSize: 11, color: r.type === "income" ? "#facc15" : "#c084fc", marginTop: 2 }}>
                            {r.type === "income" ? "💰 รายรับ" : "💸 รายจ่าย"} · {r.detail}
                          </div>
                        </td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>
                          {r.income > 0 ? `+${sym}${fmt(r.income)}` : <span style={{ color: "#2a2d3a" }}>—</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#f87171" }}>
                          {r.expense > 0 ? `-${sym}${fmt(r.expense)}` : <span style={{ color: "#2a2d3a" }}>—</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: r.running >= 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                          {r.running >= 0 ? "+" : "-"}{sym}{fmt(r.running)}
                        </td>
                      </tr>
                    ))}
                    {/* Footer totals */}
                    {ledgerRows.length > 0 && (
                      <tr style={{ borderTop: "2px solid #2a2d3a", background: "#1e2130" }}>
                        <td colSpan={4} style={{ ...S.td, fontWeight: 700, color: "#8b8fa8" }}>รวมทั้งหมด</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: "#4ade80" }}>+{sym}{fmt(totalIncome)}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: "#f87171" }}>-{sym}{fmt(totalExpense)}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: isProfit ? "#4ade80" : "#f87171" }}>
                          {isProfit ? "+" : "-"}{sym}{fmt(netProfit)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setLedgerModal(false)}>ปิด</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── REPORT MODAL ── */}
      {reportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#c084fc" }}>📊 รายงาน / พิมพ์บิล</h5>
            <div style={{ display: "grid", gap: 16 }}>
              {/* ประเภทข้อมูล */}
              <div>
                <label style={S.label}>ประเภทรายงาน</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["invoice", "💳 Invoice"], ["expense", "📝 ค่าใช้จ่าย"], ["ledger", "📒 บัญชี"]].map(([v, l]) => (
                    <button key={v} style={{ ...S.btn(reportDataType === v ? "#2d2040" : "#1e2130", reportDataType === v ? "#c084fc" : "#8b8fa8"), border: reportDataType === v ? "1px solid #7c3aed" : "1px solid #2a2d3a", flex: 1 }} onClick={() => setReportDataType(v)}>{l}</button>
                  ))}
                </div>
              </div>
              {/* โหมด - ซ่อนเมื่อเป็น ledger */}
              {reportDataType !== "ledger" && (
              <div>
                <label style={S.label}>เงื่อนไขการค้นหา</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["number", "🔢 เลขที่บิล"], ["date", "📅 วันที่"], ["range", "📆 ช่วงวันที่"]].map(([v, l]) => (
                    <button key={v} style={{ ...S.btn(reportMode === v ? "#1a2040" : "#1e2130", reportMode === v ? "#7eb8f7" : "#8b8fa8"), border: reportMode === v ? "1px solid #3b82f6" : "1px solid #2a2d3a", flex: 1, fontSize: 12 }} onClick={() => setReportMode(v)}>{l}</button>
                  ))}
                </div>
              </div>
              )}
              {/* Ledger currency selector */}
              {reportDataType === "ledger" && (
              <div>
                <label style={S.label}>เลือกสกุลเงินที่ต้องการพิมพ์</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["THB", "฿ THB"], ["KRW", "₩ KRW"], ["USD", "$ USD"]].map(([cur, label]) => (
                    <button key={cur} style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: ledgerCurrency === cur ? "1px solid #4ade80" : "1px solid #2a2d3a", background: ledgerCurrency === cur ? "#0f2318" : "#1e2130", color: ledgerCurrency === cur ? "#4ade80" : "#8b8fa8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                      onClick={() => setLedgerCurrency(cur)}>{label}</button>
                  ))}
                </div>
                <div style={{ marginTop: 10, background: "#1a1d27", borderRadius: 8, padding: "10px 14px", border: "1px solid #2a2d3a", fontSize: 13, color: "#8b8fa8" }}>
                  {(() => { const ci = invoices.filter(i => (i.currency||"THB") === ledgerCurrency).length; const ce = expenses.filter(e => (e.currency||"THB") === ledgerCurrency).length; const ti = invoices.filter(i=>(i.currency||"THB")===ledgerCurrency).reduce((s,i)=>s+Number(i.amount),0); const te = expenses.filter(e=>(e.currency||"THB")===ledgerCurrency).reduce((s,e)=>s+Number(e.amount),0); const sym={THB:"฿",KRW:"₩",USD:"$"}[ledgerCurrency]||""; return <>รายรับ <span style={{color:"#4ade80",fontWeight:700}}>{ci} รายการ</span> · รายจ่าย <span style={{color:"#f87171",fontWeight:700}}>{ce} รายการ</span> · {ti-te >= 0 ? <span style={{color:"#4ade80"}}>📈 กำไร {sym}{(ti-te).toLocaleString("th-TH")}</span> : <span style={{color:"#f87171"}}>📉 ขาดทุน {sym}{Math.abs(ti-te).toLocaleString("th-TH")}</span>}</>; })()}
                </div>
                {/* Ledger search filter */}
                <div style={{ marginTop: 12 }}>
                  <label style={S.label}>เงื่อนไขการค้นหา</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["all", "📋 ทั้งหมด"], ["number", "🔢 เลขที่บิล"], ["date", "📅 วันที่"], ["range", "📆 ช่วงวันที่"]].map(([v, l]) => (
                      <button key={v} style={{ ...S.btn(ledgerFilterMode === v ? "#1a2040" : "#1e2130", ledgerFilterMode === v ? "#7eb8f7" : "#8b8fa8"), border: ledgerFilterMode === v ? "1px solid #3b82f6" : "1px solid #2a2d3a", flex: 1, fontSize: 11 }} onClick={() => setLedgerFilterMode(v)}>{l}</button>
                    ))}
                  </div>
                  {ledgerFilterMode === "number" && (
                    <input style={{ ...S.input, marginTop: 8 }} placeholder="เช่น EXP260420 หรือ INV260420" value={ledgerFilterRef} onChange={e => setLedgerFilterRef(e.target.value)} />
                  )}
                  {ledgerFilterMode === "date" && (
                    <input style={{ ...S.input, marginTop: 8 }} type="date" value={ledgerFilterDate} onChange={e => setLedgerFilterDate(e.target.value)} />
                  )}
                  {ledgerFilterMode === "range" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div><label style={S.label}>จากวันที่</label><input style={S.input} type="date" value={ledgerFilterFrom} onChange={e => setLedgerFilterFrom(e.target.value)} /></div>
                      <div><label style={S.label}>ถึงวันที่</label><input style={S.input} type="date" value={ledgerFilterTo} onChange={e => setLedgerFilterTo(e.target.value)} /></div>
                    </div>
                  )}
                </div>
                {/* Paid-only toggle in print modal */}
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => setLedgerPaidOnly(p => !p)} style={{ ...S.btn(ledgerPaidOnly ? "#0f2318" : "#1e2130", ledgerPaidOnly ? "#4ade80" : "#8b8fa8"), border: ledgerPaidOnly ? "1px solid #4ade80" : "1px solid #2a2d3a", fontSize: 12, padding: "5px 14px", width: "100%" }}>
                    {ledgerPaidOnly ? "✅" : "⬜"} แสดงเฉพาะ ชำระแล้ว / แนบใบเสร็จแล้ว เท่านั้น
                  </button>
                </div>
              </div>
              )}
              {/* Input ตามโหมด */}
              {reportDataType !== "ledger" && reportMode === "number" && (
                <div>
                  <label style={S.label}>เลขที่บิล (พิมพ์บางส่วนก็ได้)</label>
                  <input style={S.input} placeholder="เช่น INV260420 หรือ EXP260420" value={reportInvNum} onChange={e => setReportInvNum(e.target.value)} />
                </div>
              )}
              {reportDataType !== "ledger" && reportMode === "date" && (
                <div>
                  <label style={S.label}>วันที่</label>
                  <input style={S.input} type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                </div>
              )}
              {reportDataType !== "ledger" && reportMode === "range" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={S.label}>จากวันที่</label>
                    <input style={S.input} type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>ถึงวันที่</label>
                    <input style={S.input} type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                  </div>
                </div>
              )}
              {/* Preview count - ซ่อนเมื่อเป็น ledger */}
              {reportDataType !== "ledger" && (
              <div style={{ background: "#1a1d27", borderRadius: 8, padding: "10px 14px", border: "1px solid #2a2d3a", fontSize: 13, color: "#8b8fa8" }}>
                พบ <span style={{ color: "#c084fc", fontWeight: 700 }}>{getReportItems().length}</span> รายการ
                {getReportItems().length > 0 && (
                  <span style={{ marginLeft: 10 }}>· รวม <span style={{ color: "#4ade80", fontWeight: 700 }}>{getReportItems().reduce((s, i) => s + Number(i.amount), 0).toLocaleString("th-TH")}</span> {getReportItems()[0]?.currency || "THB"}</span>
                )}
              </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setReportModal(false)}>ยกเลิก</button>
              {reportDataType === "ledger" ? (
                <button style={S.btn("#0f2318", "#4ade80")} onClick={() => doPrintLedger(ledgerCurrency, ledgerFilterMode, ledgerFilterRef, ledgerFilterDate, ledgerFilterFrom, ledgerFilterTo, ledgerPaidOnly)}>
                  🖨️ พิมพ์บัญชี {ledgerCurrency}
                </button>
              ) : (
                <button style={S.btn("#2d2040", "#c084fc")} onClick={doPrint} disabled={getReportItems().length === 0}>
                  🖨️ เปิด / พิมพ์ ({getReportItems().length} รายการ)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER MODAL ── */}
      {customerModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, border: "1px solid #2a2d3a", maxHeight: "90vh", overflowY: "auto" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editCustomerId ? "✏️ แก้ไขข้อมูลลูกค้า" : "👥 เพิ่มลูกค้าใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              {!editCustomerId && (
                <div>
                  <label style={S.label}>บริษัท *</label>
                  <select style={S.input} value={customerForm.clientId} onChange={e => setCustomerForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">— เลือกบริษัท —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={S.label}>ชื่อลูกค้า *</label>
                <input style={S.input} value={customerForm.name} onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} placeholder="ชื่อ-นามสกุล หรือชื่อบริษัท" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>เบอร์โทร</label>
                  <input style={S.input} value={customerForm.phone} onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))} placeholder="08x-xxx-xxxx" />
                </div>
                <div>
                  <label style={S.label}>อีเมล</label>
                  <input style={S.input} type="email" value={customerForm.email} onChange={e => setCustomerForm(p => ({ ...p, email: e.target.value }))} placeholder="example@email.com" />
                </div>
              </div>
              <div>
                <label style={S.label}>เลขบัตรประชาชน / Passport</label>
                <input style={S.input} value={customerForm.idCard} onChange={e => setCustomerForm(p => ({ ...p, idCard: e.target.value }))} placeholder="x-xxxx-xxxxx-xx-x" />
              </div>
              <div>
                <label style={S.label}>ที่อยู่</label>
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }} value={customerForm.address} onChange={e => setCustomerForm(p => ({ ...p, address: e.target.value }))} placeholder="ที่อยู่" />
              </div>
              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={customerForm.notes} onChange={e => setCustomerForm(p => ({ ...p, notes: e.target.value }))} placeholder="บันทึกเพิ่มเติม" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setCustomerModal(false)}>ยกเลิก</button>
              <button style={S.btn("#15304d", "#7eb8f7")} onClick={saveCustomer} disabled={savingCustomer}>
                {savingCustomer ? "กำลังบันทึก..." : editCustomerId ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSE MODAL ── */}
      {expenseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 460, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#f87171" }}>{editExpenseId ? "✏️ แก้ไขค่าใช้จ่าย" : "📝 สร้างบันทึกค่าใช้จ่าย"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>หมวดหมู่ *</label>
                <select style={S.input} value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">— เลือกหมวดหมู่ —</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>ยอดเงิน *</label>
                  <input style={S.input} type="number" min="0" step="0.01" placeholder="0.00"
                    value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>สกุลเงิน</label>
                  <select style={S.input} value={expenseForm.currency} onChange={e => setExpenseForm(p => ({ ...p, currency: e.target.value }))}>
                    <option value="THB">THB — บาทไทย</option>
                    <option value="KRW">KRW — วอนเกาหลี ₩</option>
                    <option value="USD">USD — ดอลลาร์สหรัฐ $</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>วันที่</label>
                <input style={S.input} type="date" value={expenseForm.date}
                  onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["รอชำระ", "#7c3aed", "#c084fc"], ["แนบใบเสร็จแล้ว", "#166534", "#4ade80"]].map(([v, bg, color]) => (
                    <button key={v} type="button"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: expenseForm.status === v ? `1px solid ${color}` : "1px solid #2a2d3a", background: expenseForm.status === v ? bg + "33" : "#1e2130", color: expenseForm.status === v ? color : "#8b8fa8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      onClick={() => setExpenseForm(p => ({ ...p, status: v }))}>
                      {v === "รอชำระ" ? "⏳ รอชำระ" : "✅ แนบใบเสร็จแล้ว"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }} placeholder="รายละเอียดเพิ่มเติม..."
                  value={expenseForm.notes} onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>เลขที่ใบเสร็จ</label>
                <input style={S.input} type="text" placeholder="เช่น REC-2570-001"
                  value={expenseForm.receiptNumber} onChange={e => setExpenseForm(p => ({ ...p, receiptNumber: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>ไฟล์ใบเสร็จ (PDF / รูปภาพ) — เพิ่มได้หลายไฟล์</label>
                {/* Existing saved files */}
                {(() => {
                  const saved = parseExpenseReceiptPaths(expenseForm.receiptFile);
                  return saved.length > 0 ? (
                    <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {saved.length > 1 && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
                          <button type="button" title="พิมพ์รวมทุกไฟล์แนบ" onClick={() => printExpenseAttachmentsBatch(saved, `ไฟล์แนบ ${expenseForm.receiptNumber || 'ค่าใช้จ่าย'}`)} style={{ border: "1px solid #1e40af", background: "#1e3a8a", color: "#dbeafe", borderRadius: 4, fontSize: 11, lineHeight: 1.2, padding: "3px 8px", cursor: "pointer" }}>🖨️ พิมพ์รวมทุกไฟล์</button>
                        </div>
                      )}
                      {saved.map((path, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111827", borderRadius: 6, padding: "5px 10px", border: "1px solid #2a3a55" }}>
                          <a href={path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4ade80", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {path.split("/").pop()}</a>
                          <button type="button" title="พิมพ์ไฟล์แนบ" onClick={() => printExpenseAttachment(path)} style={{ border: "1px solid #334155", background: "#0f172a", color: "#93c5fd", borderRadius: 4, fontSize: 10, lineHeight: 1.2, padding: "2px 6px", cursor: "pointer" }}>🖨️</button>
                          <button type="button" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}
                            onClick={() => {
                              const newSaved = saved.filter((_, i) => i !== idx);
                              setExpenseForm(p => ({ ...p, receiptFile: newSaved.length === 0 ? "" : JSON.stringify(newSaved) }));
                            }}>✕</button>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                {/* New files queued */}
                {expenseFileInputs.length > 0 && (
                  <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {expenseFileInputs.map((file, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f1e30", borderRadius: 6, padding: "5px 10px", border: "1px solid #1e3a55" }}>
                        <span style={{ fontSize: 12, color: "#60a5fa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {file.name}</span>
                        <button type="button" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}
                          onClick={() => setExpenseFileInputs(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ ...S.btn("#1e2d3d", "#60a5fa"), cursor: "pointer", padding: "6px 14px", fontSize: 13, borderRadius: 6, border: "1px solid #2a3a55", userSelect: "none", display: "inline-block" }}>
                  📎 เพิ่มไฟล์
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple style={{ display: "none" }}
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setExpenseFileInputs(prev => [...prev, ...files]);
                      e.target.value = "";
                    }} />
                </label>
                {expenseFileInputs.length === 0 && !expenseForm.receiptFile && (
                  <span style={{ marginLeft: 10, fontSize: 12, color: "#4a5070" }}>ยังไม่มีไฟล์</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setExpenseModal(false)}>ยกเลิก</button>
              <button style={S.btn("#3d1f1f", "#f87171")} onClick={saveExpense} disabled={savingExpense}>
                {savingExpense ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT MODAL ── */}
      {clientPickerModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 460, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#67e8f9" }}>🛠️ แก้ไขข้อมูลลูกค้า</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>เลือกลูกค้าที่ต้องการแก้ไข</label>
                <select style={S.input} value={selectedClientEditId} onChange={e => setSelectedClientEditId(e.target.value)}>
                  <option value="">— เลือกลูกค้า —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ background: "#1a1d27", borderRadius: 8, padding: "12px 14px", border: "1px solid #2a2d3a", fontSize: 13, color: "#8b8fa8" }}>
                ใช้สำหรับแก้ไขข้อมูลลูกค้าในฐานข้อมูล เช่น ที่อยู่ เบอร์โทร อีเมล และโลโก้สำหรับหัวบิล
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setClientPickerModal(false)}>ยกเลิก</button>
              <button style={S.btn("#0f2b3d", "#67e8f9")} onClick={startEditClientFromPicker}>เปิดฟอร์มแก้ไข</button>
            </div>
          </div>
        </div>
      )}

      {clientModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, border: "1px solid #2a2d3a", maxHeight: "90vh", overflowY: "auto" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editClientId ? "✏️ แก้ไขลูกค้า" : "🏢 เพิ่มลูกค้าใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>ชื่อบริษัท *</label>
                <input style={S.input} value={clientForm.name}
                  onChange={e => setClientForm(p => ({ ...p, name: e.target.value, slug: editClientId ? p.slug : slugify(e.target.value) }))} />
              </div>
              <div>
                <label style={S.label}>ชื่อภาษาไทย (สำหรับหัวบิล)</label>
                <input style={S.input} placeholder="เช่น เอ็มรีสอร์ท" value={clientForm.nameTh}
                  onChange={e => setClientForm(p => ({ ...p, nameTh: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Slug (URL) *</label>
                <input style={S.input} value={clientForm.slug}
                  onChange={e => setClientForm(p => ({ ...p, slug: slugify(e.target.value) }))} />
              </div>
              <div>
                <label style={S.label}>คำอธิบาย</label>
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }} value={clientForm.description}
                  onChange={e => setClientForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.input} value={clientForm.status} onChange={e => setClientForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>อีเมลติดต่อ</label>
                  <input style={S.input} type="email" value={clientForm.contactEmail}
                    onChange={e => setClientForm(p => ({ ...p, contactEmail: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>เบอร์โทร</label>
                  <input style={S.input} value={clientForm.contactPhone}
                    onChange={e => setClientForm(p => ({ ...p, contactPhone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={S.label}>ที่อยู่สำหรับหัวบิล</label>
                <textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={clientForm.address}
                  onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>URL ระบบลูกค้า</label>
                <input style={S.input} placeholder="https://..." value={clientForm.systemUrl}
                  onChange={e => setClientForm(p => ({ ...p, systemUrl: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>โลโก้สำหรับหัวบิล (อัปโหลดไฟล์)</label>
                <input
                  style={{ ...S.input, padding: "8px 10px" }}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  onChange={uploadClientLogo}
                  disabled={uploadingClientLogo}
                />
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#8b8fa8" }}>
                    {uploadingClientLogo ? "กำลังอัปโหลดโลโก้..." : "รองรับ JPG, PNG, WEBP, GIF"}
                  </span>
                  {clientForm.logoUrl && (
                    <button
                      type="button"
                      style={S.btn("#2a1f1f", "#f87171")}
                      onClick={() => setClientForm(p => ({ ...p, logoUrl: "" }))}
                      disabled={uploadingClientLogo}
                    >
                      ลบโลโก้
                    </button>
                  )}
                </div>
                {clientForm.logoUrl && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={clientForm.logoUrl} alt={clientForm.name || "logo"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, border: "1px solid #2a2d3a" }} />
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#8b8fa8" }}>ตัวอย่างโลโก้บนหัวบิล</span>
                      <code style={{ fontSize: 11, color: "#67e8f9" }}>{clientForm.logoUrl}</code>
                    </div>
                  </div>
                )}
              </div>
              {/* Services */}
              <div>
                <label style={S.label}>ประเภทบริการ</label>
                {services.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#4a5070", margin: 0 }}>ยังไม่มีบริการในระบบ</p>
                ) : (
                  <div style={{ display: "grid", gap: 8, maxHeight: 180, overflowY: "auto", background: "#1e2130", borderRadius: 6, padding: "10px 12px", border: "1px solid #2a2d3a" }}>
                    {services.map(sv => {
                      const checked = clientForm.serviceIds.includes(sv.id);
                      return (
                        <label key={sv.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setClientForm(p => ({
                              ...p,
                              serviceIds: checked
                                ? p.serviceIds.filter(id => id !== sv.id)
                                : [...p.serviceIds, sv.id],
                            }))}
                            style={{ accentColor: "#7eb8f7", width: 15, height: 15 }}
                          />
                          <span style={{ fontSize: 13, color: "#e8eaf0", fontWeight: 600 }}>{sv.title}</span>
                          <span style={{ fontSize: 12, color: "#8b8fa8" }}>— {sv.highlight}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setClientModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveClient} disabled={savingClient || uploadingClientLogo}>
                {savingClient ? "กำลังบันทึก..." : uploadingClientLogo ? "กำลังอัปโหลดโลโก้..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER MODAL ── */}
      {userModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 460, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editUserId ? "✏️ แก้ไข User" : "👤 เพิ่ม User ใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>ชื่อ</label>
                <input style={S.input} value={userForm.name}
                  onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Email *</label>
                <input style={S.input} type="email" value={userForm.email}
                  onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>{editUserId ? "รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)" : "รหัสผ่าน *"}</label>
                <div style={{ display: "flex", gap: 0 }}>
                  <input
                    style={{ ...S.input, borderRadius: "6px 0 0 6px", borderRight: "none" }}
                    type={showUserPassword ? "text" : "password"}
                    value={userForm.password}
                    onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(v => !v)}
                    style={{ background: "#2a2d3a", border: "1px solid #2a2d3a", borderLeft: "none", borderRadius: "0 6px 6px 0", padding: "0 14px", cursor: "pointer", color: "#8b8fa8", fontSize: 16, flexShrink: 0 }}
                  >
                    {showUserPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label style={S.label}>Role</label>
                <select style={S.input} value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLE_OPTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>ผูกกับบริษัท</label>
                <select style={S.input} value={userForm.clientId} onChange={e => setUserForm(p => ({ ...p, clientId: e.target.value }))}>
                  <option value="">— ไม่ผูกกับบริษัทใด —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setUserModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveUser} disabled={savingUser}>
                {savingUser ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {receiptModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 760, border: "1px solid #2a2d3a", maxHeight: "90vh", overflowY: "auto" }}>
            <h5 style={{ margin: "0 0 20px", color: "#5ecb8a" }}>{editReceiptId ? "✏️ แก้ไขใบเสร็จรับเงิน" : "🧾 สร้างใบเสร็จรับเงิน"}</h5>
            {(() => {
              const issuer = clients.find(c => c.id === receiptForm.clientId);
              return (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>ผู้ออกบิล *</label>
                  {editReceiptId ? (
                    <input style={{ ...S.input, color: "#8b8fa8" }} value={clients.find(c => c.id === receiptForm.clientId)?.name || receiptForm.clientId} readOnly />
                  ) : (
                    <select style={S.input} value={receiptForm.clientId} onChange={e => setReceiptForm(p => ({ ...p, clientId: e.target.value }))}>
                      <option value="">— เลือกผู้ออกบิล —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label style={S.label}>สกุลเงิน</label>
                  <select style={S.input} value={receiptForm.currency} onChange={e => setReceiptForm(p => ({ ...p, currency: e.target.value }))}>
                    <option value="THB">THB — บาทไทย</option>
                    <option value="KRW">KRW — วอนเกาหลี ₩</option>
                    <option value="USD">USD — ดอลลาร์สหรัฐ $</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>วันที่ออกใบเสร็จ</label>
                  <input style={S.input} type="date" value={receiptForm.issuedAt} onChange={e => setReceiptForm(p => ({ ...p, issuedAt: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#1a1d27", borderRadius: 10, border: "1px solid #2a2d3a", padding: 16 }}>
                  <div style={{ fontSize: 12, color: "#8b8fa8", marginBottom: 8 }}>หัวบิล / ผู้ออกบิล</div>
                  {issuer ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {issuer.logoUrl && (
                        <img src={issuer.logoUrl} alt={issuer.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "1px solid #2a2d3a" }} />
                      )}
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#e8eaf0" }}>{issuer.name}</div>
                      {issuer.address && <div style={{ color: "#8b8fa8", fontSize: 13, whiteSpace: "pre-wrap" }}>{issuer.address}</div>}
                      {issuer.contactPhone && <div style={{ color: "#8b8fa8", fontSize: 13 }}>โทร: {issuer.contactPhone}</div>}
                      {issuer.contactEmail && <div style={{ color: "#8b8fa8", fontSize: 13 }}>อีเมล: {issuer.contactEmail}</div>}
                    </div>
                  ) : (
                    <div style={{ color: "#4a5070", fontSize: 13 }}>เลือกผู้ออกบิลเพื่อพรีวิวหัวบิล</div>
                  )}
                </div>
                <div style={{ background: "#1a1d27", borderRadius: 10, border: "1px solid #2a2d3a", padding: 16, display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "#8b8fa8" }}>ข้อมูลลูกค้า / ผู้รับบิล</div>
                  {customers.filter(c => !receiptForm.clientId || c.clientId === receiptForm.clientId).length > 0 && (
                    <div>
                      <label style={S.label}>เลือกจากรายชื่อลูกค้า</label>
                      <select
                        style={{ ...S.input, color: "#7eb8f7" }}
                        value=""
                        onChange={e => {
                          const cust = customers.find(c => c.id === e.target.value);
                          if (cust) setReceiptForm(p => ({ ...p, customerName: cust.name, customerPhone: cust.phone || "", customerEmail: cust.email || "", customerAddress: cust.address || "" }));
                        }}
                      >
                        <option value="">— เลือกเพื่อ autofill —</option>
                        {customers.filter(c => !receiptForm.clientId || c.clientId === receiptForm.clientId).map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={S.label}>ชื่อลูกค้า *</label>
                    <input style={S.input} value={receiptForm.customerName} onChange={e => setReceiptForm(p => ({ ...p, customerName: e.target.value }))} placeholder="เช่น บริษัท เอ บี ซี จำกัด" />
                  </div>
                  <div>
                    <label style={S.label}>ที่อยู่ลูกค้า</label>
                    <textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={receiptForm.customerAddress} onChange={e => setReceiptForm(p => ({ ...p, customerAddress: e.target.value }))} placeholder="ที่อยู่สำหรับออกบิล" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={S.label}>เบอร์โทรลูกค้า</label>
                      <input style={S.input} value={receiptForm.customerPhone} onChange={e => setReceiptForm(p => ({ ...p, customerPhone: e.target.value }))} placeholder="08x-xxx-xxxx" />
                    </div>
                    <div>
                      <label style={S.label}>อีเมลลูกค้า</label>
                      <input style={S.input} type="email" value={receiptForm.customerEmail} onChange={e => setReceiptForm(p => ({ ...p, customerEmail: e.target.value }))} placeholder="customer@example.com" />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#1a1d27", borderRadius: 10, border: "1px solid #2a2d3a", overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: RECEIPT_ITEM_GRID, background: "#11131a", borderBottom: "1px solid #2a2d3a", padding: 12, minWidth: RECEIPT_ITEM_MIN_WIDTH }}>
                  {["รายการ", "จำนวน", "ราคาต่อหน่วย", "ส่วนลด %", "ส่วนลดตัวเลข", "รวมสุทธิ", ""].map((h, idx) => (
                    <div
                      key={h || `blank-${idx}`}
                      style={{
                        padding: RECEIPT_ITEM_CELL_PAD,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#8b8fa8",
                        textAlign: idx === 0 ? "left" : idx === 6 ? "center" : "right",
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 10, padding: 12 }}>
                  {receiptForm.items.map((item, index) => {
                    const line = calcReceiptItem(item);
                    const lineSummary = [];
                    if (line.discountPercent > 0) lineSummary.push(`${line.discountPercent.toLocaleString("th-TH")}%`);
                    if (line.discountAmount > 0) lineSummary.push(line.discountAmount.toLocaleString("th-TH"));
                    return (
                      <div key={index} style={{ display: "grid", gridTemplateColumns: RECEIPT_ITEM_GRID, alignItems: "stretch", minWidth: RECEIPT_ITEM_MIN_WIDTH }}>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <input
                            style={S.input}
                            placeholder="เช่น ค่าบริการดูแลระบบเดือน เม.ย. 2569"
                            value={item.description}
                            onChange={e => updateReceiptItemRow(index, "description", e.target.value)}
                          />
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <input
                            style={S.inputNum}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={e => updateReceiptItemRow(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <input
                            style={S.inputNum}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e => updateReceiptItemRow(index, "unitPrice", e.target.value)}
                          />
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <input
                            style={S.inputNum}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={item.discountPercent}
                            onChange={e => updateReceiptItemRow(index, "discountPercent", e.target.value)}
                          />
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <input
                            style={S.inputNum}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.discountAmount}
                            onChange={e => updateReceiptItemRow(index, "discountAmount", e.target.value)}
                          />
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <div style={{ ...S.inputNum, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#5ecb8a", fontWeight: 700 }}>
                            <div style={{ width: "100%" }}>
                              <div>{line.netTotal.toLocaleString("th-TH")}</div>
                              {(line.discountPercent > 0 || line.discountAmount > 0) && (
                                <div style={{ fontSize: 11, color: "#8b8fa8", fontWeight: 500, textAlign: "right" }}>
                                  ลด {lineSummary.join(" + ")} จาก {line.subtotal.toLocaleString("th-TH")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: RECEIPT_ITEM_CELL_PAD }}>
                          <button type="button" style={{ ...S.btn("#2a1f1f", "#f87171"), padding: 0, width: 46, minWidth: 46, display: "grid", placeItems: "center", marginLeft: "auto" }} onClick={() => removeReceiptItemRow(index)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button type="button" style={S.btn("#15304d", "#7eb8f7")} onClick={addReceiptItemRow}>+ เพิ่มรายการ</button>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#8b8fa8" }}>
                    ก่อนลด {receiptForm.items.reduce((sum, item) => sum + calcReceiptItem(item).subtotal, 0).toLocaleString("th-TH")} ·
                    ส่วนลด {receiptForm.items.reduce((sum, item) => sum + calcReceiptItem(item).totalDiscount, 0).toLocaleString("th-TH")}
                  </div>
                  <div style={{ fontSize: 12, color: "#8b8fa8" }}>รวมทั้งสิ้น</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#5ecb8a" }}>
                    {receiptForm.items.reduce((sum, item) => sum + calcReceiptItem(item).netTotal, 0).toLocaleString("th-TH")} {receiptForm.currency}
                  </div>
                </div>
              </div>

              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea
                  style={{ ...S.input, height: 80, resize: "vertical" }}
                  placeholder="รายละเอียดเพิ่มเติมสำหรับใบเสร็จ"
                  value={receiptForm.notes}
                  onChange={e => setReceiptForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div style={{ fontSize: 12, color: "#8b8fa8" }}>
                {editReceiptId ? "แก้ไขข้อมูลใบเสร็จ — เลขที่ใบเสร็จจะไม่เปลี่ยนแปลง" : "ระบบจะสร้างเลขที่ใบเสร็จให้อัตโนมัติเมื่อบันทึก"}
              </div>
            </div>
              );
            })()}
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setReceiptModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3d2f", "#5ecb8a")} onClick={saveReceipt} disabled={savingReceipt}>
                {savingReceipt ? "กำลังบันทึก..." : editReceiptId ? "บันทึกการแก้ไข" : "ออกใบเสร็จ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICE MODAL ── */}
      {invoiceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480, border: "1px solid #2a2d3a", maxHeight: "90vh", overflowY: "auto" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editInvoiceId ? "✏️ แก้ไข Invoice" : "💳 สร้าง Invoice ใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              {!editInvoiceId && (
                <div>
                  <label style={S.label}>บริษัท *</label>
                  <select style={S.input} value={invoiceForm.clientId} onChange={e => setInvoiceForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">— เลือกบริษัท —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editInvoiceId && (
                <div>
                  <label style={S.label}>บริษัท</label>
                  <input style={{ ...S.input, color: "#8b8fa8" }} value={clients.find(c => c.id === invoiceForm.clientId)?.name || invoiceForm.clientId} readOnly />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>ยอดเงิน *</label>
                  <input style={S.input} type="number" min="0" step="0.01" value={invoiceForm.amount}
                    onChange={e => setInvoiceForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>สกุลเงิน</label>
                  <select style={S.input} value={invoiceForm.currency} onChange={e => setInvoiceForm(p => ({ ...p, currency: e.target.value }))}>
                    <option value="THB">THB — บาทไทย</option>
                    <option value="KRW">KRW — วอนเกาหลี ₩</option>
                    <option value="USD">USD — ดอลลาร์สหรัฐ $</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.input} value={invoiceForm.status} onChange={e => setInvoiceForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="PENDING">รอชำระ</option>
                  <option value="PAID">ชำระแล้ว</option>
                  <option value="OVERDUE">เกินกำหนด</option>
                  <option value="CANCELLED">ยกเลิก</option>
                </select>
              </div>
              <div>
                <label style={S.label}>วันครบกำหนดชำระ</label>
                <input style={S.input} type="date" value={invoiceForm.dueDate}
                  onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }} value={invoiceForm.notes}
                  onChange={e => setInvoiceForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setInvoiceModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveInvoice} disabled={savingInvoice}>
                {savingInvoice ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
