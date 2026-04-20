/**
 * Seed: restore superadmin + clients
 * Run: node scripts/seed.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const prisma = new PrismaClient();

async function main() {
  // ── SUPER ADMIN ──
  const hash = await bcrypt.hash("Admin2026", 12);
  const admin = await prisma.user.upsert({
    where: { email: "superadmin" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin",
      username: "goeun-server-hub",
      password: hash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ superadmin:", admin.email, "/ username:", admin.username);

  // ── CLIENTS ──
  const clientsData = [
    {
      name: "M-Factory",
      slug: "m-factory",
      status: "ONLINE",
      contactEmail: "m.factoryandresort@gmail.com",
      contactPhone: "+66 095-241-1833",
      systemUrl: "https://m-factoryandresort.com",
    },
    {
      name: "M-Group",
      slug: "m-group",
      status: "ONLINE",
      contactEmail: "sale@m-group.in.th",
      contactPhone: "089-4871144",
      systemUrl: null,
    },
    {
      name: "GOEUN SERVER HUB",
      slug: "goeun-server-hub",
      status: "ONLINE",
      contactEmail: "goeunserverhub@gmail.com",
      contactPhone: "+66081-234567",
      systemUrl: null,
    },
  ];

  for (const c of clientsData) {
    const client = await prisma.client.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    console.log("✅ client:", client.name);
  }

  // ── LINK superadmin to GOEUN SERVER HUB ──
  const geClient = await prisma.client.findUnique({ where: { slug: "goeun-server-hub" } });
  if (geClient) {
    await prisma.user.update({
      where: { email: "superadmin" },
      data: { clientId: geClient.id },
    });
    console.log("✅ linked superadmin → GOEUN SERVER HUB");
  }

  console.log("\n🎉 Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
