import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN";
}

async function genCargoNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `CGO${yy}${mm}${dd}`;

  const last = await prisma.cargoOrder.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  const seq = last ? (parseInt(last.number.split("-")[1] || "0", 10) + 1) : 1;
  return `${prefix}-${String(seq).padStart(5, "0")}`;
}

// GET /api/admin/cargo
export async function GET(req) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const orders = await prisma.cargoOrder.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/cargo
export async function POST(req) {
  const session = await auth();
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { senderName, senderPhone, receiverName, receiverPhone, receiverAddress,
            direction, weightKg, sizeNote, itemDesc, currency, income, expense,
            status, trackingCode, notes, shippedAt, deliveredAt } = body;

    if (!senderName || !receiverName) {
      return NextResponse.json({ error: "senderName และ receiverName จำเป็น" }, { status: 400 });
    }

    const number = await genCargoNumber();
    const order = await prisma.cargoOrder.create({
      data: {
        number,
        senderName, senderPhone: senderPhone || null,
        receiverName, receiverPhone: receiverPhone || null,
        receiverAddress: receiverAddress || null,
        direction: direction || "TH_TO_KR",
        weightKg: weightKg ? parseFloat(weightKg) : null,
        sizeNote: sizeNote || null,
        itemDesc: itemDesc || null,
        currency: currency || "THB",
        income: parseFloat(income || 0),
        expense: parseFloat(expense || 0),
        status: status || "รับพัสดุแล้ว",
        trackingCode: trackingCode || null,
        notes: notes || null,
        shippedAt: shippedAt ? new Date(shippedAt) : null,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      },
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
