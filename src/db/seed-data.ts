import type {
  ListingCategory,
  ListingCondition,
  ListingStatus,
} from "@/features/listings/domain";

export type SeedListing = {
  sellerEmail: "bob@test.com" | "alice@test.com" | "charlie@test.com";
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

export function buildSeedListings(now: Date): SeedListing[] {
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
      imageUrl: "https://picsum.photos/seed/leica-m6-film-camera-kit/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Carbon road bike race build",
      description:
        "Ultralight carbon build with deep wheels and a power meter.",
      location: "Boulder, CO",
      category: "sports_outdoors",
      condition: "like_new",
      startingBidCents: 245000,
      reservePriceCents: 285000,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 28),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/carbon-road-bike-race-build/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Vintage walnut record console",
      description:
        "Restored stereo console with a warm walnut cabinet and brass pulls.",
      location: "Austin, TX",
      category: "collectibles",
      condition: "good",
      startingBidCents: 68000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 40),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/vintage-walnut-record-console/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Japanese chef knife set",
      description:
        "Three-piece carbon steel set with magnetic walnut storage board.",
      location: "Seattle, WA",
      category: "home_garden",
      condition: "new",
      startingBidCents: 31500,
      reservePriceCents: 42000,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 52),
      status: "active",
      imageUrl: "https://picsum.photos/seed/japanese-chef-knife-set/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Mechanical keyboard artisan bundle",
      description:
        "Hot-swap board with aluminum case, artisan caps, and a coiled cable.",
      location: "San Jose, CA",
      category: "electronics",
      condition: "like_new",
      startingBidCents: 18500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 60),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/mechanical-keyboard-artisan-bundle/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "1960s aviation travel poster",
      description:
        "Large-format linen-backed poster with crisp color and light edge wear.",
      location: "Denver, CO",
      category: "art",
      condition: "fair",
      startingBidCents: 27000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 72),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/1960s-aviation-travel-poster/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Open-wheel racing sim cockpit",
      description:
        "Aluminum cockpit with seat, wheel mount, and integrated monitor stand.",
      location: "Phoenix, AZ",
      category: "toys_hobbies",
      condition: "good",
      startingBidCents: 94000,
      reservePriceCents: 110000,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 84),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/open-wheel-racing-sim-cockpit/1200/900",
    },
    {
      sellerEmail: "bob@test.com",
      title: "Draft teak credenza restoration",
      description:
        "Unfinished draft with restoration notes still being finalized.",
      location: "Minneapolis, MN",
      category: "home_garden",
      condition: "poor",
      startingBidCents: 52000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: "draft",
      imageUrl:
        "https://picsum.photos/seed/draft-teak-credenza-restoration/1200/900",
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
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 48),
      status: "active",
      imageUrl: "https://picsum.photos/seed/minimal-gold-signet-ring/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Studio ceramic floor vase",
      description:
        "Tall hand-thrown vase with a soft matte glaze and sculpted handles.",
      location: "Providence, RI",
      category: "home_garden",
      condition: "like_new",
      startingBidCents: 22000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 16),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
      status: "scheduled",
      imageUrl: "https://picsum.photos/seed/studio-ceramic-floor-vase/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Swiss field watch with box",
      description:
        "Automatic field watch with full kit, spare strap, and recent service card.",
      location: "Chicago, IL",
      category: "jewelry_watches",
      condition: "good",
      startingBidCents: 54000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 30),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 6),
      status: "scheduled",
      imageUrl:
        "https://picsum.photos/seed/swiss-field-watch-with-box/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Collector handheld console set",
      description:
        "Boxed special edition handheld with charger, case, and sealed accessories.",
      location: "Columbus, OH",
      category: "toys_hobbies",
      condition: "good",
      startingBidCents: 28000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 20),
      status: "ended",
      imageUrl:
        "https://picsum.photos/seed/collector-handheld-console-set/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Signed first pressing vinyl archive",
      description:
        "Rare signed pressing preserved in archival sleeves with tour inserts.",
      location: "Nashville, TN",
      category: "media",
      condition: "fair",
      startingBidCents: 46000,
      reservePriceCents: 52000,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 36),
      status: "ended",
      imageUrl:
        "https://picsum.photos/seed/signed-first-pressing-vinyl-archive/1200/900",
    },
    {
      sellerEmail: "alice@test.com",
      title: "Draft alpine shell sample",
      description:
        "Colorway test piece waiting on copy and final measurement details.",
      location: "Salt Lake City, UT",
      category: "fashion",
      condition: "new",
      startingBidCents: 19500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: "draft",
      imageUrl: "https://picsum.photos/seed/draft-alpine-shell-sample/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Boxed first-edition art monograph",
      description:
        "Hardcover monograph with slipcase, inserts, and crisp dust jacket.",
      location: "Los Angeles, CA",
      category: "media",
      condition: "like_new",
      startingBidCents: 12500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 32),
      status: "active",
      imageUrl:
        "https://picsum.photos/seed/boxed-first-edition-art-monograph/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Abstract monoprint pair",
      description: "Two framed works from a small-run studio print series.",
      location: "Santa Fe, NM",
      category: "art",
      condition: "like_new",
      startingBidCents: 56000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 12),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 4),
      status: "scheduled",
      imageUrl: "https://picsum.photos/seed/abstract-monoprint-pair/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Classic 35mm projector bundle",
      description:
        "Working projector with reel case, manuals, and a spare lamp.",
      location: "Madison, WI",
      category: "electronics",
      condition: "good",
      startingBidCents: 21000,
      reservePriceCents: null,
      startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 44),
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: "scheduled",
      imageUrl:
        "https://picsum.photos/seed/classic-35mm-projector-bundle/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Signed tour cycling jersey",
      description: "Framed and preserved jersey from a modern race team.",
      location: "Asheville, NC",
      category: "sports_outdoors",
      condition: "good",
      startingBidCents: 19500,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      status: "ended",
      imageUrl:
        "https://picsum.photos/seed/signed-tour-cycling-jersey/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Restored analog synthesizer",
      description:
        "Serviced analog synth with wood cheeks and a fresh calibration.",
      location: "Detroit, MI",
      category: "electronics",
      condition: "fair",
      startingBidCents: 88000,
      reservePriceCents: 98000,
      startsAt: null,
      endsAt: new Date(now.getTime() - 1000 * 60 * 60 * 54),
      status: "ended",
      imageUrl:
        "https://picsum.photos/seed/restored-analog-synthesizer/1200/900",
    },
    {
      sellerEmail: "charlie@test.com",
      title: "Draft touring motorcycle panniers",
      description:
        "Adventure pannier set awaiting fitment notes and hardware photos.",
      location: "Boise, ID",
      category: "vehicles",
      condition: "good",
      startingBidCents: 34000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      status: "draft",
      imageUrl:
        "https://picsum.photos/seed/draft-touring-motorcycle-panniers/1200/900",
    },
  ];
}
