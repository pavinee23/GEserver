import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// POST /api/admin/upload
export async function POST(req) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");
    const targetFolder = folder === "logos" ? "logos" : "receipts";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const ext = path.extname(file.name).toLowerCase();
    const allowed = targetFolder === "logos"
      ? [".jpg", ".jpeg", ".png", ".webp", ".gif"]
      : [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({
        error: targetFolder === "logos"
          ? "โลโก้ต้องเป็นไฟล์รูปภาพ JPG, PNG, WEBP หรือ GIF"
          : "ไฟล์ต้องเป็น PDF หรือรูปภาพเท่านั้น",
      }, { status: 400 });
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", targetFolder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    return NextResponse.json({ path: `/uploads/${targetFolder}/${safeName}` });
  } catch (err) {
    console.error("POST /api/admin/upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
