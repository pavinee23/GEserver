import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// PUT /api/admin/clients/[id]
export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, nameTh, description, status, contactEmail, contactPhone, address, systemUrl, logoUrl, serviceIds } = body;

    // Sync services if provided
    if (Array.isArray(serviceIds)) {
      await prisma.clientService.deleteMany({ where: { clientId: id } });
      if (serviceIds.length > 0) {
        await prisma.clientService.createMany({
          data: serviceIds.map(serviceId => ({ clientId: id, serviceId })),
          skipDuplicates: true,
        });
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(nameTh !== undefined && { nameTh }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(address !== undefined && { address }),
        ...(systemUrl !== undefined && { systemUrl }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
    });
    return NextResponse.json({ client });
  } catch (err) {
    console.error("[PUT /api/admin/clients]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}

// DELETE /api/admin/clients/[id]
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    // Unlink users first
    await prisma.user.updateMany({ where: { clientId: id }, data: { clientId: null } });
    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/clients]", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
