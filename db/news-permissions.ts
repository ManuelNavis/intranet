import type { NewsValues } from "./news";
import { env } from "cloudflare:workers";

export const ownerEmail = "manuel.navis.p@gmail.com";

export function authenticatedEmail(request: Request): string {
  return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() ?? "";
}

export function isOwner(request: Request): boolean {
  return authenticatedEmail(request) === ownerEmail;
}

export async function canEdit(request: Request): Promise<boolean> {
  if (isOwner(request)) return true;
  const email = authenticatedEmail(request);
  if (!email) return false;
  if (!env.DB) throw new Error("D1 binding DB unavailable");
  const row = await env.DB.prepare("SELECT email FROM news_editors WHERE email = ?").bind(email).first();
  return Boolean(row);
}

export async function authorizedWrite(request: Request): Promise<Response | null> {
  let allowed: boolean;
  try { allowed = await canEdit(request); }
  catch (error) { console.error("news.permissions", error); return Response.json({ error: "Vérification des droits indisponible." }, { status: 503 }); }
  if (!allowed) return Response.json({ error: "Accès réservé aux gestionnaires des actualités." }, { status: 403 });
  return checkOrigin(request);
}

export function ownerWrite(request: Request): Response | null {
  if (!isOwner(request)) return Response.json({ error: "Gestion des accès réservée au propriétaire." }, { status: 403 });
  return checkOrigin(request);
}

function checkOrigin(request: Request): Response | null {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Origine de la demande invalide." }, { status: 403 });
  }
  return null;
}

export function validateNews(input: unknown): NewsValues | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  const category = typeof data.category === "string" ? data.category.trim() : "";
  const date = typeof data.date === "string" ? data.date : "";
  const link = typeof data.link === "string" ? data.link.trim() : "";
  if (!title || title.length > 120 || !summary || summary.length > 600 || !category || category.length > 80) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return null;
  if (link && !/^https?:\/\/[^\s]+$/i.test(link) && !/^\/(?!\/)[^\s]*$/.test(link)) return null;
  if (link.length > 1000 || typeof data.published !== "boolean") return null;
  return { title, summary, category, date, link: link || null, published: data.published ? 1 : 0 };
}
