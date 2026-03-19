import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { account, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

loadEnv({ path: ".env.local" });
loadEnv();

const usersToSeed = [
  {
    name: "Bob Bobbity",
    email: "bob@test.com",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "Alice Testerson",
    email: "alice@test.com",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Charlie Testwell",
    email: "charlie@test.com",
    image: "https://randomuser.me/api/portraits/men/68.jpg",
  },
] as const;

const sharedPassword = "Pa$$w0rd";

async function resetSeedUsers() {
  const existingUsers = await db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(
      inArray(
        user.email,
        usersToSeed.map((seedUser) => seedUser.email),
      ),
    );

  if (existingUsers.length === 0) {
    return;
  }

  const userIds = existingUsers.map((existingUser) => existingUser.id);

  await db.delete(session).where(inArray(session.userId, userIds));
  await db.delete(account).where(inArray(account.userId, userIds));
  await db.delete(user).where(inArray(user.id, userIds));
}

async function main() {
  await resetSeedUsers();

  for (const seedUser of usersToSeed) {
    await auth.api.signUpEmail({
      body: {
        name: seedUser.name,
        email: seedUser.email,
        password: sharedPassword,
        image: seedUser.image,
      },
    });
  }

  const createdUsers = await db
    .select({
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(
      inArray(
        user.email,
        usersToSeed.map((seedUser) => seedUser.email),
      ),
    );

  for (const createdUser of createdUsers) {
    if (!createdUser.image) {
      const matchingUser = usersToSeed.find(
        (seedUser) => seedUser.email === createdUser.email,
      );

      if (matchingUser) {
        await db
          .update(user)
          .set({
            image: matchingUser.image,
          })
          .where(and(eq(user.email, createdUser.email)));
      }
    }
  }

  console.log(
    `Seeded ${usersToSeed.length} users with the shared password ${sharedPassword}.`,
  );
}

main().catch((error) => {
  console.error("Failed to seed users.");
  console.error(error);
  process.exit(1);
});
