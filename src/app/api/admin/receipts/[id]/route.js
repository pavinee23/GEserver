import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
        description, quantity, unitPrice, discountPercent, discountAmount,
        subtotal, totalDiscount,
        amount: roundMoney(Math.max(0, subtotal - totalDiscount)),
        sortOrder: index,
      };
    })
    .filter((item) => item.description || item.quantity || item.unitPrice || item.discountPercent || item.discountAmount);
}

export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { customerName, customerAddress, customerPhone, customerEmail, currency, issuedAt, notes } = body;
    const items = normalizeReceiptItems(body.items);

    if (!String(customerName || "").trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อลูกค้า" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "กรุณากรอกรายการอย่างน้อย 1 รายการ" }, { status: 400 });
    }

    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const total = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));

    // Replace items: delete old, create new
    await prisma.receiptItem.deleteMany({ where: { receiptId: id } });

    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        customerName: String(customerName || "").trim(),
        customerAddress: String(customerAddress || "").trim() || null,
        customerPhone: String(customerPhone || "").trim() || null,
        customerEmail: String(customerEmail || "").trim() || null,
        currency: currency || "THB",
        issuedAt: issuedAt ? new Date(`${issuedAt}T00:00:00`) : undefined,
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

    return NextResponse.json({ receipt });
  } catch (err) {
    console.error("[PUT /api/admin/receipts/:id]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await prisma.receipt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/receipts]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
