import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// PUT /api/admin/users/[id]
export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, password, role, clientId } = body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 12);

    // If clientId changes, update username from new client slug
    if (clientId !== undefined) {
      data.clientId = clientId || null;
      if (clientId) {
        const client = await prisma.client.findUnique({ where: { id: clientId }, select: { slug: true } });
        if (client?.slug) {
          const base = client.slug;
          let username = base;
          let suffix = 1;
          while (true) {
            const conflict = await prisma.user.findUnique({ where: { username } });
            if (!conflict || conflict.id === id) break;
            username = `${base}-${suffix++}`;
          }
          data.username = username;
        }
      } else {
        data.username = null;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, email: true, role: true, clientId: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[PUT /api/admin/users]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    // Prevent deleting your own account
    if (id === session.user.id) {
      return NextResponse.json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/users]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
