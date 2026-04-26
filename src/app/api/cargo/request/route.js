import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function genNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `CGO${yy}${mm}${dd}-`;
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `${prefix}${rand}`;
}

// POST /api/cargo/request
// Body: { senderName, senderPhone, receiverName, receiverPhone, receiverAddress, direction, itemDesc, passportNo }
export async function POST(req) {
  try {
    const body = await req.json();

    const senderName = (body.senderName || "").trim();
    const receiverName = (body.receiverName || "").trim();
    const direction = body.direction === "KR_TO_TH" ? "KR_TO_TH" : "TH_TO_KR";

    if (!senderName || !receiverName) {
      return NextResponse.json({ error: "กรุณากรอกชื่อผู้ส่งและผู้รับ" }, { status: 400 });
    }

    // Generate unique number
    let number = genNumber();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.cargoOrder.findUnique({ where: { number } });
      if (!exists) break;
      number = genNumber();
      attempts++;
    }

    const order = await prisma.cargoOrder.create({
      data: {
        number,
        senderName,
        senderPhone: (body.senderPhone || "").trim() || null,
        receiverName,
        receiverPhone: (body.receiverPhone || "").trim() || null,
        receiverAddress: (body.receiverAddress || "").trim() || null,
        direction,
        itemDesc: (body.itemDesc || "").trim() || null,
        passportNo: (body.passportNo || "").trim() || null,
        imageUrl: (body.imageUrl || "").trim() || null,
        parcelImageUrl: (body.parcelImageUrl || "").trim() || null,
        status: "รอดำเนินการ",
        income: 0,
        expense: 0,
        currency: "THB",
      },
    });

    return NextResponse.json({ ok: true, number: order.number });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
