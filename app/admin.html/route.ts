import adminHtml from "../../intranet/admin.html?raw";
import { canEdit } from "../../db/news-permissions";

export const runtime = "edge";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  try {
    if (!await canEdit(request)) {
      return new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Accès refusé</title><main style="font:1rem system-ui;max-width:36rem;margin:4rem auto;padding:1rem"><h1>Accès refusé</h1><p>Votre compte n’est pas autorisé à gérer les actualités.</p><a href="/">Retour à l’intranet</a></main></html>', { status: 403, headers });
    }
    return new Response(adminHtml, { headers });
  } catch (error) {
    console.error("news.admin.access", error);
    return new Response("Vérification des droits momentanément indisponible.", { status: 503 });
  }
}
