import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

export async function GET(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!customer) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (err) {
    console.error("[GET /api/admin/customers/:id]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, address, idCard, notes } = body;

    if (!String(name || "").trim()) return NextResponse.json({ error: "กรุณากรอกชื่อลูกค้า" }, { status: 400 });

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: String(name).trim(),
        phone: String(phone || "").trim() || null,
        email: String(email || "").trim() || null,
        address: String(address || "").trim() || null,
        idCard: String(idCard || "").trim() || null,
        notes: String(notes || "").trim() || null,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ customer });
  } catch (err) {
    console.error("[PUT /api/admin/customers/:id]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/customers/:id]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
