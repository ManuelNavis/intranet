import intranetHtml from "../intranet/index.html?raw";

export const runtime = "edge";

export function GET() {
  return new Response(intranetHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
