import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { account, listing, listingImage, session, user } from "@/db/schema";
import { buildSeedListings } from "@/db/seed-data";
import { auth } from "@/server/auth";

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
      id: user.id,
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

  const sellerIdsByEmail = new Map(
    createdUsers.map((createdUser) => [createdUser.email, createdUser.id]),
  );
  const now = new Date();
  const seededListings = buildSeedListings(now);

  await db.insert(listing).values(
    seededListings.map((seedListing) => {
      const listingId = randomUUID();
      const sellerId = sellerIdsByEmail.get(seedListing.sellerEmail);

      if (!sellerId) {
        throw new Error(`Missing seeded seller for ${seedListing.sellerEmail}`);
      }

      return {
        id: listingId,
        sellerId,
        title: seedListing.title,
        description: seedListing.description,
        location: seedListing.location,
        category: seedListing.category,
        condition: seedListing.condition,
        startingBidCents: seedListing.startingBidCents,
        reservePriceCents: seedListing.reservePriceCents,
        startsAt: seedListing.startsAt,
        endsAt: seedListing.endsAt,
        status: seedListing.status,
      };
    }),
  );

  const persistedListings = await db
    .select({
      id: listing.id,
      title: listing.title,
    })
    .from(listing);
  const listingIdsByTitle = new Map(
    persistedListings.map((persistedListing) => [
      persistedListing.title,
      persistedListing.id,
    ]),
  );

  await db.insert(listingImage).values(
    seededListings.map((seedListing) => {
      const persistedListingId = listingIdsByTitle.get(seedListing.title);

      if (!persistedListingId) {
        throw new Error(`Missing seeded listing for ${seedListing.title}`);
      }

      return {
        id: randomUUID(),
        listingId: persistedListingId,
        publicId: `seed/${seedListing.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
        url: seedListing.imageUrl,
        isMain: true,
      };
    }),
  );

  console.log(
    `Seeded ${usersToSeed.length} users and ${seededListings.length} listings with the shared password ${sharedPassword}.`,
  );
}

main().catch((error) => {
  console.error("Failed to seed users.");
  console.error(error);
  process.exit(1);
});
