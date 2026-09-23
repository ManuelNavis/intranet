import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const news = sqliteTable("news", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  date: text("date").notNull(),
  link: text("link"),
  published: integer("published").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const newsMeta = sqliteTable("news_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const newsImages = sqliteTable("news_images", {
  id: text("id").primaryKey(),
  newsId: text("news_id").notNull().references(() => news.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_news_images_news_id").on(table.newsId),
  uniqueIndex("idx_news_images_news_position").on(table.newsId, table.position),
]);

export const newsEditors = sqliteTable("news_editors", {
  email: text("email").primaryKey(),
  addedAt: integer("added_at").notNull(),
  addedBy: text("added_by").notNull(),
});
