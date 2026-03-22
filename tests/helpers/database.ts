import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Client, createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/db/schema";

const migrationsFolder = resolve(process.cwd(), "drizzle");

export type TestDatabase = {
  client: Client;
  db: LibSQLDatabase<typeof schema>;
  url: string;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "augeo-test-db-"));
  const databasePath = join(tempDirectory, "test.sqlite");
  const url = `file:${databasePath}`;
  const client = createClient({ url });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder });

  return {
    client,
    db,
    url,
    reset: async () => {
      await resetTestDatabase(client);
    },
    cleanup: async () => {
      await client.close();
      await rm(tempDirectory, { recursive: true, force: true });
    },
  };
}

export async function resetTestDatabase(client: Client) {
  await client.execute("PRAGMA foreign_keys = OFF");

  const tables = await client.execute({
    sql: `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name != '__drizzle_migrations'
    `,
  });

  for (const row of tables.rows) {
    const tableName = String(row.name);

    await client.execute(`DELETE FROM "${tableName}"`);
  }

  await client.execute("PRAGMA foreign_keys = ON");
}
