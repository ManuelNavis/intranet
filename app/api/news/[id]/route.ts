import { deleteNews, updateNews } from "../../../../db/news";
import { authorizedWrite, validateNews } from "../../../../db/news-permissions";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const denied = await authorizedWrite(request);
  if (denied) return denied;
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Données invalides." }, { status: 400 }); }
  const values = validateNews(input);
  if (!values) return Response.json({ error: "Vérifiez le titre, le texte, la date et le lien." }, { status: 400 });
  try {
    const { id } = await context.params;
    const item = await updateNews(id, values);
    return item ? Response.json({ item }, { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "Actualité introuvable." }, { status: 404 });
  } catch (error) {
    console.error("news.update", error);
    return Response.json({ error: "Modification impossible. Réessayez." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = await authorizedWrite(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return await deleteNews(id) ? new Response(null, { status: 204 })
      : Response.json({ error: "Actualité introuvable." }, { status: 404 });
  } catch (error) {
    console.error("news.delete", error);
    return Response.json({ error: "Suppression impossible. Réessayez." }, { status: 503 });
  }
}
