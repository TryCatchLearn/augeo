import { relations, sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import {
  listingCategories,
  listingConditions,
  listingOutcomes,
  listingStatuses,
} from "@/features/listings/domain";
import { notificationTypes } from "@/features/notifications/domain";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const listing = sqliteTable(
  "listing",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    location: text("location").notNull(),
    category: text("category", { enum: listingCategories }).notNull(),
    condition: text("condition", { enum: listingConditions }).notNull(),
    startingBidCents: integer("starting_bid_cents").notNull(),
    currentBidCents: integer("current_bid_cents"),
    bidCount: integer("bid_count").default(0).notNull(),
    version: integer("version").default(0).notNull(),
    reservePriceCents: integer("reserve_price_cents"),
    outcome: text("outcome", { enum: listingOutcomes }),
    winnerUserId: text("winner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    winningBidId: text("winning_bid_id").references(
      (): AnySQLiteColumn => bid.id,
      {
        onDelete: "set null",
      },
    ),
    aiDescriptionGenerationCount: integer("ai_description_generation_count")
      .default(0)
      .notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: listingStatuses }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("listing_sellerId_idx").on(table.sellerId),
    index("listing_status_idx").on(table.status),
  ],
);

export const listingImage = sqliteTable(
  "listing_image",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references((): AnySQLiteColumn => listing.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    url: text("url").notNull(),
    isMain: integer("is_main", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("listing_image_listingId_idx").on(table.listingId),
    index("listing_image_main_idx").on(table.listingId, table.isMain),
  ],
);

export const bid = sqliteTable(
  "bid",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    bidderId: text("bidder_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("bid_listing_createdAt_idx").on(table.listingId, table.createdAt),
    index("bid_listing_amount_idx").on(table.listingId, table.amountCents),
    index("bid_bidderId_idx").on(table.bidderId),
  ],
);

export const notification = sqliteTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: notificationTypes }).notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    payload: text("payload").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("notification_user_recent_idx").on(table.userId, table.createdAt),
    index("notification_user_unread_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  listings: many(listing),
  bids: many(bid),
  notifications: many(notification),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const listingRelations = relations(listing, ({ one, many }) => ({
  seller: one(user, {
    fields: [listing.sellerId],
    references: [user.id],
  }),
  winner: one(user, {
    fields: [listing.winnerUserId],
    references: [user.id],
  }),
  winningBid: one(bid, {
    fields: [listing.winningBidId],
    references: [bid.id],
  }),
  images: many(listingImage),
  bids: many(bid),
}));

export const listingImageRelations = relations(listingImage, ({ one }) => ({
  listing: one(listing, {
    fields: [listingImage.listingId],
    references: [listing.id],
  }),
}));

export const bidRelations = relations(bid, ({ one }) => ({
  listing: one(listing, {
    fields: [bid.listingId],
    references: [listing.id],
  }),
  bidder: one(user, {
    fields: [bid.bidderId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));
