import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

async function genInvoiceNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;
  const invPrefix = `INV${dateStr}`;

  // Find highest sequence for today (search both INV-prefixed and bare date formats)
  const [lastInv, lastBare] = await Promise.all([
    prisma.invoice.findFirst({
      where: { number: { startsWith: invPrefix } },
      orderBy: { number: "desc" },
    }),
    prisma.invoice.findFirst({
      where: { number: { startsWith: dateStr } },
      orderBy: { number: "desc" },
    }),
  ]);

  const parseSeq = (num) => {
    if (!num) return 0;
    const parts = num.replace(/^INV/, "").split("-");
    const n = parseInt(parts[1], 10);
    return isNaN(n) ? 0 : n;
  };

  const seq = Math.max(parseSeq(lastInv?.number), parseSeq(lastBare?.number)) + 1;

  return `INV${dateStr}-${String(seq).padStart(5, "0")}`;
}

// GET /api/admin/invoices?clientId=xxx
export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const invoices = await prisma.invoice.findMany({
      where: clientId ? { clientId } : {},
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[GET /api/admin/invoices]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// POST /api/admin/invoices — create invoice
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { clientId, amount, currency, status, dueDate, notes, receiptNumber, autoReceiptNumber } = body;

    if (!clientId || !amount) {
      return NextResponse.json({ error: "clientId และ amount จำเป็น" }, { status: 400 });
    }

    // generate sequential invoice number
    const number = await genInvoiceNumber();

    // auto-generate receipt number from invoice number if requested
    const finalReceiptNumber = autoReceiptNumber ? `RCP-${number}` : (receiptNumber || null);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        receiptNumber: finalReceiptNumber,
        clientId,
        amount: parseFloat(amount),
        currency: currency || "THB",
        status: status || "PENDING",
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: status === "PAID" ? new Date() : null,
        notes: notes || null,
      },
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/invoices]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
