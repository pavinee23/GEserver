export const dynamic = "force-dynamic";
export async function GET(req) {
  return Response.json({
    reqUrl: req.url,
    nextUrlHref: req.nextUrl?.href,
    nextUrlOrigin: req.nextUrl?.origin,
    nextUrlProtocol: req.nextUrl?.protocol,
    forwardedProto: req.headers.get("x-forwarded-proto"),
    forwardedHost: req.headers.get("x-forwarded-host"),
    host: req.headers.get("host"),
  });
}
