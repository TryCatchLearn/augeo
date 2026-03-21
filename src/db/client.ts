import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

const url = getRequiredEnv("DATABASE_URL");

export const sqlite = createClient({ url });

export const db = drizzle(sqlite, { schema });
