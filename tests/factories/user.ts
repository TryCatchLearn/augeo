import { randomUUID } from "node:crypto";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

export function buildUser(
  overrides?: Partial<typeof schema.user.$inferInsert>,
) {
  const id = overrides?.id ?? randomUUID();

  return {
    id,
    name: "Augeo Seller",
    email: `${id}@example.test`,
    emailVerified: true,
    image: null,
    ...overrides,
  } satisfies typeof schema.user.$inferInsert;
}

export async function insertUser(
  db: LibSQLDatabase<typeof schema>,
  overrides?: Partial<typeof schema.user.$inferInsert>,
) {
  const user = buildUser(overrides);

  await db.insert(schema.user).values(user);

  return user;
}
