import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// GET /api/admin/services — list all services
export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const services = await prisma.service.findMany({
      orderBy: { title: "asc" },
      where: { active: true },
    });
    return NextResponse.json({ services });
  } catch (err) {
    console.error("[GET /api/admin/services]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// POST /api/admin/services — create service
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { title, description, highlight, price } = body;

    if (!title || !highlight) {
      return NextResponse.json({ error: "title และ highlight จำเป็น" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        title,
        description: description || null,
        highlight,
        price: price ? parseFloat(price) : null,
      },
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/services]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
