import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// GET /api/admin/users — list all users (with client info)
export async function GET(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const users = await prisma.user.findMany({
      where: clientId ? { clientId } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        clientId: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// POST /api/admin/users — create user
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, role, clientId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "email และ password จำเป็น" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "email นี้มีอยู่แล้ว" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 12);

    // Auto-generate username from client slug
    let username = null;
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { slug: true } });
      if (client?.slug) {
        // Ensure unique: append suffix if slug already taken
        const base = client.slug;
        username = base;
        let suffix = 1;
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${base}-${suffix++}`;
        }
      }
    }

    const user = await prisma.user.create({
      data: {
        name: name || null,
        username,
        email,
        password: hashed,
        role: role || "CLIENT",
        clientId: clientId || null,
      },
      select: { id: true, name: true, username: true, email: true, role: true, clientId: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
