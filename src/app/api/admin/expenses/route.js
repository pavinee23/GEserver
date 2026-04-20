import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

async function genExpenseNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;
  const prefix = `EXP${dateStr}`;

  const last = await prisma.expense.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  const parseSeq = (num) => {
    if (!num) return 0;
    const parts = num.replace(/^EXP/, "").split("-");
    const n = parseInt(parts[1], 10);
    return isNaN(n) ? 0 : n;
  };

  const seq = parseSeq(last?.number) + 1;
  return `EXP${dateStr}-${String(seq).padStart(5, "0")}`;
}

// GET /api/admin/expenses
export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ expenses });
  } catch (err) {
    console.error("[GET /api/admin/expenses]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// POST /api/admin/expenses
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { category, amount, currency, status, notes, date, receiptNumber, receiptFile } = body;

    if (!category || !amount) {
      return NextResponse.json({ error: "category และ amount จำเป็น" }, { status: 400 });
    }

    const number = await genExpenseNumber();

    const expense = await prisma.expense.create({
      data: {
        number,
        category,
        amount: parseFloat(amount),
        currency: currency || "THB",
        status: status || "รอชำระ",
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
        receiptNumber: receiptNumber || null,
        receiptFile: receiptFile || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/expenses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
