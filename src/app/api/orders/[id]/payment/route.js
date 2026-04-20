import { getOrder, updateOrder } from "@/lib/orderStore";
import { NextResponse } from "next/server";

// POST /api/orders/[id]/payment — submit payment slip (base64 or URL)
export async function POST(req, { params }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "Order already paid or cancelled" }, { status: 400 });
  }

  const body = await req.json();
  const { slipData, slipName } = body; // slipData = base64 data URL

  if (!slipData) return NextResponse.json({ error: "No slip provided" }, { status: 400 });

  const updated = updateOrder(id, {
    paymentSlip: slipData,
    slipName: slipName || "slip.jpg",
    status: "confirming",
    paidAt: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
