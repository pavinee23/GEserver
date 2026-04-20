import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function genReceiptNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;
  const prefix = `RCP${dateStr}`;

  const lastReceipt = await prisma.receipt.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  const lastSeq = lastReceipt?.number ? parseInt(lastReceipt.number.split("-")[1], 10) || 0 : 0;
  return `${prefix}-${String(lastSeq + 1).padStart(5, "0")}`;
}

function normalizeReceiptItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const description = String(item?.description || "").trim();
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.unitPrice || 0);
      const discountPercent = Number(item?.discountPercent || 0);
      const discountAmount = Number(item?.discountAmount || 0);
      const subtotal = roundMoney(quantity * unitPrice);
      const totalDiscount = roundMoney((subtotal * discountPercent / 100) + discountAmount);

      return {
        description,
        quantity,
        unitPrice,
        discountPercent,
        discountAmount,
        subtotal,
        totalDiscount,
        amount: roundMoney(Math.max(0, subtotal - totalDiscount)),
        sortOrder: index,
      };
    })
    .filter((item) => item.description || item.quantity || item.unitPrice || item.discountPercent || item.discountAmount);
}

export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const receipts = await prisma.receipt.findMany({
      where: clientId ? { clientId } : {},
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, contactEmail: true, contactPhone: true, address: true, logoUrl: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ receipts });
  } catch (err) {
    console.error("[GET /api/admin/receipts]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { clientId, customerName, customerAddress, customerPhone, customerEmail, currency, issuedAt, notes } = body;
    const items = normalizeReceiptItems(body.items);

    if (!clientId) {
      return NextResponse.json({ error: "กรุณาเลือกผู้ออกบิล" }, { status: 400 });
    }

    if (!String(customerName || "").trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อลูกค้า" }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "กรุณากรอกรายการในใบเสร็จอย่างน้อย 1 รายการ" }, { status: 400 });
    }

    const invalidItem = items.find((item) =>
      !item.description ||
      item.quantity <= 0 ||
      item.unitPrice < 0 ||
      item.discountPercent < 0 ||
      item.discountPercent > 100 ||
      item.discountAmount < 0 ||
      item.totalDiscount > item.subtotal
    );
    if (invalidItem) {
      return NextResponse.json({ error: "กรุณากรอกรายละเอียดรายการ จำนวน ราคา และส่วนลดให้ถูกต้อง" }, { status: 400 });
    }

    const number = await genReceiptNumber();
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const total = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));

    const receipt = await prisma.receipt.create({
      data: {
        number,
        clientId,
        customerName: String(customerName || "").trim(),
        customerAddress: String(customerAddress || "").trim() || null,
        customerPhone: String(customerPhone || "").trim() || null,
        customerEmail: String(customerEmail || "").trim() || null,
        currency: currency || "THB",
        issuedAt: issuedAt ? new Date(`${issuedAt}T00:00:00`) : new Date(),
        notes: notes || null,
        subtotal,
        total,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, contactEmail: true, contactPhone: true, address: true, logoUrl: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/receipts]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
