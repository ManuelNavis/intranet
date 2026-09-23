import { removeImage } from "../../../../../../db/news";
import { authorizedWrite } from "../../../../../../db/news-permissions";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const denied = await authorizedWrite(request);
  if (denied) return denied;
  try {
    const { id, imageId } = await context.params;
    return await removeImage(id, imageId) ? new Response(null, { status: 204 })
      : Response.json({ error: "Photo introuvable." }, { status: 404 });
  } catch (error) {
    console.error("news.image.delete", error);
    return Response.json({ error: "Suppression impossible. Réessayez." }, { status: 503 });
  }
}
