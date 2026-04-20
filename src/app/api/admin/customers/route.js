import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const q = searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error("[GET /api/admin/customers]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { clientId, name, phone, email, address, idCard, notes } = body;

    if (!clientId) return NextResponse.json({ error: "กรุณาเลือกบริษัท" }, { status: 400 });
    if (!String(name || "").trim()) return NextResponse.json({ error: "กรุณากรอกชื่อลูกค้า" }, { status: 400 });

    const customer = await prisma.customer.create({
      data: {
        clientId,
        name: String(name).trim(),
        phone: String(phone || "").trim() || null,
        email: String(email || "").trim() || null,
        address: String(address || "").trim() || null,
        idCard: String(idCard || "").trim() || null,
        notes: String(notes || "").trim() || null,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/customers]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
