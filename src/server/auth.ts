import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

export const auth = betterAuth({
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL: getRequiredEnv("BETTER_AUTH_URL"),
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [nextCookies()],
});
