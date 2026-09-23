import { env } from "cloudflare:workers";
import { addImage, getNewsForUpload, listImageRows } from "../../../../../db/news";
import { authorizedWrite } from "../../../../../db/news-permissions";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };
const maxSize = 8 * 1024 * 1024;

function detectImage(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  const denied = await authorizedWrite(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length") ?? 0) > maxSize + 1_000_000) {
    return Response.json({ error: "Photo trop volumineuse (8 Mo maximum)." }, { status: 413 });
  }
  const bucket = env.BUCKET;
  if (!bucket) return Response.json({ error: "Stockage des photos indisponible." }, { status: 503 });
  const { id } = await context.params;
  try {
    if (!await getNewsForUpload(id)) return Response.json({ error: "Actualité introuvable." }, { status: 404 });
    const existing = await listImageRows(id);
    if (existing.length >= 4) return Response.json({ error: "Quatre photos maximum par actualité." }, { status: 400 });
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || file.size < 1 || file.size > maxSize) {
      return Response.json({ error: "Choisissez une photo de 8 Mo maximum." }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = detectImage(bytes);
    if (!format) return Response.json({ error: "Utilisez une photo JPEG, PNG ou WebP." }, { status: 400 });
    const position = [1, 2, 3, 4].find(value => !existing.some(image => image.position === value));
    if (!position) return Response.json({ error: "Quatre photos maximum par actualité." }, { status: 400 });
    const key = `news/${id}/${crypto.randomUUID()}.${format.extension}`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: format.mime } });
    try {
      const image = await addImage(id, key, format.mime, position);
      return Response.json({ image }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await bucket.delete(key).catch(cleanupError => console.error("news.image.cleanup", cleanupError));
      throw error;
    }
  } catch (error) {
    console.error("news.image.upload", error);
    return Response.json({ error: "Envoi impossible. Réessayez ou choisissez un fichier plus petit." }, { status: 503 });
  }
}
