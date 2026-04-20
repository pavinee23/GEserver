import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// GET /api/admin/clients — list all clients with user count
export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true } },
        invoices: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true, status: true, amount: true, dueDate: true, paidAt: true, notes: true },
        },
        services: {
          include: { service: { select: { id: true, title: true, highlight: true } } },
        },
      },
    });
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("[GET /api/admin/clients]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// POST /api/admin/clients — create client
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug, description, status, contactEmail, contactPhone, address, systemUrl, logoUrl, serviceIds } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name และ slug จำเป็น" }, { status: 400 });
    }

    const existing = await prisma.client.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: "slug นี้มีอยู่แล้ว" }, { status: 409 });

    const client = await prisma.client.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        description: description || null,
        status: status || "COMING_SOON",
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        systemUrl: systemUrl || null,
        logoUrl: logoUrl || null,
        ...(Array.isArray(serviceIds) && serviceIds.length > 0 && {
          services: {
            create: serviceIds.map(serviceId => ({ serviceId })),
          },
        }),
      },
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/clients]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
