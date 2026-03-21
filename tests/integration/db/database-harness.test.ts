// @vitest-environment node

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { insertUser } from "../../factories/user";
import { createTestDatabase, type TestDatabase } from "../../helpers/database";

describe("test database harness", () => {
  let testDatabase: TestDatabase | undefined;

  afterEach(async () => {
    await testDatabase?.cleanup();
  });

  it("applies migrations and persists real Drizzle writes", async () => {
    testDatabase = await createTestDatabase();

    const createdUser = await insertUser(testDatabase.db, {
      name: "Integration Seller",
      email: "integration-seller@example.test",
    });

    const persistedUsers = await testDatabase.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, createdUser.id));

    expect(persistedUsers).toHaveLength(1);
    expect(persistedUsers[0]?.email).toBe("integration-seller@example.test");
  });
});
