export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_URL: process.env.AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
  });
}
