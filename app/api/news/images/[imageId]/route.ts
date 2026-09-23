import { env } from "cloudflare:workers";
import { getImageForDisplay } from "../../../../../db/news";
import { canEdit } from "../../../../../db/news-permissions";

export const runtime = "edge";

type RouteContext = { params: Promise<{ imageId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { imageId } = await context.params;
    const image = await getImageForDisplay(imageId);
    if (!image || (!image.published && !await canEdit(request))) return new Response("Photo introuvable.", { status: 404 });
    if (!env.BUCKET) return new Response("Stockage des photos momentanément indisponible.", { status: 503 });
    const object = await env.BUCKET.get(image.object_key);
    if (!object) return new Response("Photo introuvable.", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("news.image.read", error);
    return new Response("Photo momentanément indisponible.", { status: 503 });
  }
}
