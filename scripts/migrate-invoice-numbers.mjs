/**
 * One-time migration: rename old INV-YYMM-XXXX invoice numbers
 * to new YYMMDD-00001 sequential format (based on createdAt date).
 * Run: node scripts/migrate-invoice-numbers.mjs
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const prisma = new PrismaClient();

async function main() {
  // Fetch all invoices ordered by createdAt asc
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, createdAt: true },
  });

  console.log(`Found ${invoices.length} invoice(s) to renumber.\n`);

  // Group by date string YYMMDD
  const byDay = {};
  for (const inv of invoices) {
    const d = new Date(inv.createdAt);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yy}${mm}${dd}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(inv);
  }

  // Build updates
  const updates = [];
  for (const [prefix, list] of Object.entries(byDay)) {
    list.forEach((inv, idx) => {
      const newNumber = `${prefix}-${String(idx + 1).padStart(5, "0")}`;
      updates.push({ id: inv.id, old: inv.number, newNumber });
    });
  }

  // Apply in a transaction using a temp suffix to avoid unique conflicts
  await prisma.$transaction(async (tx) => {
    // Step 1: rename all to a temp number to free up existing numbers
    for (const u of updates) {
      await tx.invoice.update({
        where: { id: u.id },
        data: { number: `TEMP-${u.id}` },
      });
    }
    // Step 2: rename to final new numbers
    for (const u of updates) {
      await tx.invoice.update({
        where: { id: u.id },
        data: { number: u.newNumber },
      });
      console.log(`  ${u.old.padEnd(20)} → ${u.newNumber}`);
    }
  });

  console.log(`\n✅ Renumbered ${updates.length} invoices successfully.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
