import { insertNews, listNews } from "../../../db/news";
import { authorizedWrite, canEdit, validateNews } from "../../../db/news-permissions";

export const runtime = "edge";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const all = new URL(request.url).searchParams.get("all") === "1";
  try {
    const allowed = await canEdit(request);
    if (all && !allowed) return Response.json({ error: "Accès réservé aux gestionnaires des actualités." }, { status: 403 });
    const items = await listNews(all);
    return Response.json({ items, canEdit: allowed }, { headers: noStore });
  } catch (error) {
    console.error("news.list", error);
    return Response.json({ error: "Actualités momentanément indisponibles." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const denied = await authorizedWrite(request);
  if (denied) return denied;
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Données invalides." }, { status: 400 }); }
  const values = validateNews(input);
  if (!values) return Response.json({ error: "Vérifiez le titre, le texte, la date et le lien." }, { status: 400 });
  try {
    return Response.json({ item: await insertNews(values) }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("news.create", error);
    return Response.json({ error: "Enregistrement impossible. Réessayez." }, { status: 503 });
  }
}
