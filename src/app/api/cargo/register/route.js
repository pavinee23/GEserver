import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CARGO_CLIENT_ID = "cargob1e1e0b3415111f1bf0a00155d839b3a";

// POST /api/cargo/register
// Body: { name, email, phone }
export async function POST(req) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const phone = (body.phone || "").trim();

    if (!name) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    }

    // Check duplicate email
    if (email) {
      const existing = await prisma.customer.findFirst({
        where: { clientId: CARGO_CLIENT_ID, email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "อีเมลนี้ลงทะเบียนไว้แล้ว", customer: existing },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        clientId: CARGO_CLIENT_ID,
        name,
        email: email || null,
        phone: phone || null,
      },
    });

    return NextResponse.json({ ok: true, customer });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
