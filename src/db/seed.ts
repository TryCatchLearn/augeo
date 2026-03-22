import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { account, listing, listingImage, session, user } from "@/db/schema";
import type {
  ListingCategory,
  ListingCondition,
  ListingStatus,
} from "@/features/listings/domain";
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

type SeedListing = {
  sellerEmail: (typeof usersToSeed)[number]["email"];
  title: string;
  description: string;
  location: string;
  category: ListingCategory;
  condition: ListingCondition;
  startingBidCents: number;
  reservePriceCents: number | null;
  startsAt: Date | null;
  endsAt: Date;
  status: ListingStatus;
  imageUrl: string;
};

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

function buildSeedListings(now: Date): SeedListing[] {
  return [
    {
      sellerEmail: "bob@test.com",
      title: "Leica M6 film camera kit",
      description: "Classic rangefinder body with a 50mm lens and strap.",
      location: "Portland, OR",
      category: "electronics",
      condition: "good",
      startingBidCents: 165000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 18),
      status: "active",
      imageUrl: "https://picsum.photos/seed/augeo-active-1/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Studio ceramic floor vase",
      description: "Tall hand-thrown vase with a soft matte glaze.",
      location: "Seattle, WA",
      category: "home_garden",
      condition: "like_new",
      startingBidCents: 22000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 36),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
      status: "scheduled",
      imageUrl: "https://picsum.photos/seed/augeo-scheduled-1/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Draft walnut side chair",
      description: "Prototype chair listing waiting for final details.",
      location: "Austin, TX",
      category: "home_garden",
      condition: "fair",
      startingBidCents: 14000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: "draft",
      imageUrl: "https://picsum.photos/seed/augeo-draft-1/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Draft mid-century bar cart",
      description: "Needs final photos before publishing.",
      location: "Denver, CO",
      category: "collectibles",
      condition: "good",
      startingBidCents: 48000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 6),
      status: "draft",
      imageUrl: "https://picsum.photos/seed/augeo-draft-2/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Signed tour cycling jersey",
      description: "Framed and preserved jersey from a modern race team.",
      location: "Boulder, CO",
      category: "sports_outdoors",
      condition: "good",
      startingBidCents: 19500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      status: "ended",
      imageUrl: "https://picsum.photos/seed/augeo-ended-1/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Minimal gold signet ring",
      description: "Solid gold signet ring with a softened brushed finish.",
      location: "Brooklyn, NY",
      category: "jewelry_watches",
      condition: "new",
      startingBidCents: 72000,
      reservePriceCents: 90000,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 52),
      status: "active",
      imageUrl: "https://picsum.photos/seed/augeo-active-2/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Abstract monoprint pair",
      description: "Two framed works from a small-run studio print series.",
      location: "Providence, RI",
      category: "art",
      condition: "like_new",
      startingBidCents: 56000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 12),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 4),
      status: "scheduled",
      imageUrl: "https://picsum.photos/seed/augeo-scheduled-2/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Collector's handheld console",
      description: "Boxed special edition handheld with charger and case.",
      location: "Chicago, IL",
      category: "toys_hobbies",
      condition: "good",
      startingBidCents: 28000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 20),
      status: "ended",
      imageUrl: "https://picsum.photos/seed/augeo-ended-2/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Selvedge denim jacket",
      description: "Rigid denim jacket with clean fades and metal hardware.",
      location: "Nashville, TN",
      category: "fashion",
      condition: "good",
      startingBidCents: 18000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 30),
      status: "active",
      imageUrl: "https://picsum.photos/seed/augeo-active-3/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Boxed first-edition art monograph",
      description: "Hardcover monograph with slipcase and original inserts.",
      location: "Los Angeles, CA",
      category: "media",
      condition: "like_new",
      startingBidCents: 12500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
      status: "active",
      imageUrl: "https://picsum.photos/seed/augeo-active-4/1200/900",
    },
  ];
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
