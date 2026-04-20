import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: parseInt(id, 10) } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const body = await req.json();

  const data = {};
  const fields = ["sku", "category", "name", "nameEn", "nameZh", "unit", "minOrder", "minWholesale", "desc", "img", "stock", "active", "promotion"];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.price !== undefined) data.price = parseFloat(body.price);
  if (body.priceWholesale !== undefined) data.priceWholesale = parseFloat(body.priceWholesale);
  if (body.minOrder !== undefined) data.minOrder = parseInt(body.minOrder);
  if (body.minWholesale !== undefined) data.minWholesale = parseInt(body.minWholesale);
  if (body.stock !== undefined) data.stock = parseInt(body.stock);
  if (body.promotionPrice !== undefined) data.promotionPrice = body.promotionPrice ? parseFloat(body.promotionPrice) : null;

  // Check SKU uniqueness if changing
  if (data.sku) {
    const existing = await prisma.product.findFirst({ where: { sku: data.sku, NOT: { id } } });
    if (existing) return NextResponse.json({ error: "SKU นี้มีอยู่แล้ว" }, { status: 409 });
  }

  const updated = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
