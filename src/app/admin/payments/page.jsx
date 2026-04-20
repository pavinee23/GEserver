import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PaymentsClient from "./PaymentsClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "บันทึกการชำระเงินค่าบริการ — Admin" };

export default async function PaymentsPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/login");

  let clients = [];
  let invoices = [];
  let initialError = "";

  try {
    [clients, invoices] = await Promise.all([
      prisma.client.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, status: true },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      }),
    ]);
  } catch (err) {
    console.error("[admin/payments/page]", err);
    initialError = "โหลดข้อมูลการชำระเงินไม่สำเร็จบางส่วน";
  }

  return <PaymentsClient session={session} clients={clients} initialInvoices={invoices} initialError={initialError} />;
}
