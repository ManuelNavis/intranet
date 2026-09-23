import { env } from "cloudflare:workers";

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB unavailable");
  return env.DB;
}

export type Editor = { email: string; added_at: number; added_by: string };

export async function listEditors(): Promise<Editor[]> {
  const result = await database().prepare("SELECT email, added_at, added_by FROM news_editors ORDER BY email")
    .all<Editor>();
  return result.results ?? [];
}

export async function addEditor(email: string, addedBy: string): Promise<boolean> {
  const result = await database().prepare("INSERT OR IGNORE INTO news_editors (email, added_at, added_by) VALUES (?, ?, ?)")
    .bind(email, Date.now(), addedBy).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function removeEditor(email: string): Promise<boolean> {
  const result = await database().prepare("DELETE FROM news_editors WHERE email = ?").bind(email).run();
  return (result.meta.changes ?? 0) > 0;
}
