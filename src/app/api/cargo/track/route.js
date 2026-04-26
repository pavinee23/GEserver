import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/cargo/track?number=CGO260426-00001
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number")?.trim();

  if (!number) {
    return NextResponse.json({ error: "กรุณาระบุหมายเลขพัสดุ" }, { status: 400 });
  }

  try {
    const order = await prisma.cargoOrder.findUnique({
      where: { number },
      select: {
        number: true,
        senderName: true,
        receiverName: true,
        direction: true,
        weightKg: true,
        itemDesc: true,
        status: true,
        trackingCode: true,
        notes: true,
        shippedAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "ไม่พบหมายเลขพัสดุนี้" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
