import { env } from "cloudflare:workers";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  link: string | null;
  published: number;
  created_at: number;
  updated_at: number;
  images?: Array<{ id: string; url: string }>;
};

export type NewsImage = {
  id: string;
  news_id: string;
  object_key: string;
  mime: string;
  position: number;
  created_at: number;
};

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB unavailable");
  return env.DB;
}

// Import the current demonstration announcements once, outside schema migrations.
async function ensureInitialNews(db: D1Database) {
  const initialized = await db.prepare("SELECT value FROM news_meta WHERE key = ?")
    .bind("initial_news_imported").first();
  if (initialized) return;
  const created = Date.UTC(2026, 8, 18);
  const starter: Array<[string, string, string, string, string]> = [
    ["legacy-conges", "Nouvelle procédure de demande de congé", "Retrouvez les étapes et le formulaire dans votre espace RH.", "Ressources humaines", "2026-09-18"],
    ["legacy-seminaire", "Séminaire des agents : informations pratiques", "Consultez le programme et les consignes pour la journée.", "Vie de la collectivité", "2026-09-15"],
    ["legacy-ciril", "Maintenance programmée de Ciril", "Une intervention technique est prévue sur Ciril.", "Informatique", "2026-09-12"],
  ];
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO news_meta (key, value) VALUES (?, ?)")
      .bind("initial_news_imported", "1"),
    ...starter.map(([id, title, summary, category, date]) =>
      db.prepare("INSERT OR IGNORE INTO news (id, title, summary, category, date, link, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?)")
        .bind(id, title, summary, category, date, created, created)),
  ]);
}

export async function listNews(includeDrafts: boolean): Promise<NewsItem[]> {
  const db = database();
  await ensureInitialNews(db);
  const query = includeDrafts
    ? "SELECT * FROM news ORDER BY date DESC, created_at DESC LIMIT 100"
    : "SELECT * FROM news WHERE published = 1 ORDER BY date DESC, created_at DESC LIMIT 100";
  const result = await db.prepare(query).all<NewsItem>();
  const items = result.results ?? [];
  if (!items.length) return items;
  const images = await db.prepare(`SELECT id, news_id, position FROM news_images WHERE news_id IN (${items.map(() => "?").join(",")}) ORDER BY news_id, position`)
    .bind(...items.map(item => item.id)).all<Pick<NewsImage, "id" | "news_id" | "position">>();
  const byNews = new Map<string, Array<{ id: string; url: string }>>();
  for (const image of images.results ?? []) {
    const group = byNews.get(image.news_id) ?? [];
    group.push({ id: image.id, url: `/api/news/images/${encodeURIComponent(image.id)}` });
    byNews.set(image.news_id, group);
  }
  return items.map(item => ({ ...item, images: byNews.get(item.id) ?? [] }));
}

export async function insertNews(values: NewsValues): Promise<NewsItem> {
  const db = database();
  await ensureInitialNews(db);
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.prepare("INSERT INTO news (id, title, summary, category, date, link, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, values.title, values.summary, values.category, values.date, values.link, values.published, now, now).run();
  return (await db.prepare("SELECT * FROM news WHERE id = ?").bind(id).first<NewsItem>())!;
}

export async function updateNews(id: string, values: NewsValues): Promise<NewsItem | null> {
  const db = database();
  await db.prepare("UPDATE news SET title = ?, summary = ?, category = ?, date = ?, link = ?, published = ?, updated_at = ? WHERE id = ?")
    .bind(values.title, values.summary, values.category, values.date, values.link, values.published, Date.now(), id).run();
  return await db.prepare("SELECT * FROM news WHERE id = ?").bind(id).first<NewsItem>();
}

export async function deleteNews(id: string): Promise<boolean> {
  const db = database();
  const images = await db.prepare("SELECT object_key FROM news_images WHERE news_id = ?").bind(id).all<{ object_key: string }>();
  const result = await db.prepare("DELETE FROM news WHERE id = ?").bind(id).run();
  if ((result.meta.changes ?? 0) > 0 && env.BUCKET) {
    const cleanup = await Promise.allSettled((images.results ?? []).map(image => env.BUCKET!.delete(image.object_key)));
    for (const result of cleanup) if (result.status === "rejected") console.error("news.image.cleanup", result.reason);
  }
  return (result.meta.changes ?? 0) > 0;
}

export async function getNewsForUpload(id: string): Promise<NewsItem | null> {
  return database().prepare("SELECT * FROM news WHERE id = ?").bind(id).first<NewsItem>();
}

export async function listImageRows(id: string): Promise<NewsImage[]> {
  const result = await database().prepare("SELECT * FROM news_images WHERE news_id = ? ORDER BY position")
    .bind(id).all<NewsImage>();
  return result.results ?? [];
}

export async function getImageForDisplay(id: string): Promise<(NewsImage & { published: number }) | null> {
  return database().prepare("SELECT news_images.*, news.published FROM news_images JOIN news ON news.id = news_images.news_id WHERE news_images.id = ?")
    .bind(id).first<NewsImage & { published: number }>();
}

export async function addImage(newsId: string, objectKey: string, mime: string, position: number): Promise<{ id: string; url: string }> {
  const id = crypto.randomUUID();
  await database().prepare("INSERT INTO news_images (id, news_id, object_key, mime, position, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, newsId, objectKey, mime, position, Date.now()).run();
  return { id, url: `/api/news/images/${encodeURIComponent(id)}` };
}

export async function removeImage(newsId: string, imageId: string): Promise<boolean> {
  const db = database();
  const image = await db.prepare("SELECT * FROM news_images WHERE id = ? AND news_id = ?")
    .bind(imageId, newsId).first<NewsImage>();
  if (!image) return false;
  await db.prepare("DELETE FROM news_images WHERE id = ? AND news_id = ?").bind(imageId, newsId).run();
  try { await env.BUCKET?.delete(image.object_key); } catch (error) { console.error("news.image.cleanup", error); }
  return true;
}

export type NewsValues = Omit<NewsItem, "id" | "created_at" | "updated_at">;
