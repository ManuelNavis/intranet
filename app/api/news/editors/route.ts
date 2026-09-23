import { addEditor, listEditors, removeEditor } from "../../../../db/editors";
import { authenticatedEmail, isOwner, ownerEmail, ownerWrite } from "../../../../db/news-permissions";

export const runtime = "edge";

const noStore = { "Cache-Control": "private, no-store" };

function validEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$/i.test(email) ? email : null;
}

export async function GET(request: Request) {
  if (!isOwner(request)) return Response.json({ error: "Gestion des accès réservée au propriétaire." }, { status: 403, headers: noStore });
  try {
    return Response.json({ owner: ownerEmail, editors: await listEditors() }, { headers: noStore });
  } catch (error) {
    console.error("news.editors.list", error);
    return Response.json({ error: "Liste des accès momentanément indisponible." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const denied = ownerWrite(request);
  if (denied) return denied;
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Données invalides." }, { status: 400 }); }
  const email = validEmail((input as { email?: unknown })?.email);
  if (!email || email === ownerEmail) return Response.json({ error: "Saisissez l’adresse e-mail de la personne à autoriser." }, { status: 400 });
  try {
    if (!await addEditor(email, authenticatedEmail(request))) {
      return Response.json({ error: "Cette personne est déjà autorisée." }, { status: 409 });
    }
    return Response.json({ email }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("news.editors.add", error);
    return Response.json({ error: "Autorisation impossible. Réessayez." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const denied = ownerWrite(request);
  if (denied) return denied;
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Données invalides." }, { status: 400 }); }
  const email = validEmail((input as { email?: unknown })?.email);
  if (!email || email === ownerEmail) return Response.json({ error: "Cette autorisation ne peut pas être retirée." }, { status: 400 });
  try {
    return await removeEditor(email) ? new Response(null, { status: 204 })
      : Response.json({ error: "Personne introuvable." }, { status: 404 });
  } catch (error) {
    console.error("news.editors.remove", error);
    return Response.json({ error: "Retrait impossible. Réessayez." }, { status: 503 });
  }
}
