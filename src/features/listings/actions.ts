"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/session";
import {
  createDraftFromFirstUpload,
  deleteDraftListing,
  publishListing,
  returnListingToDraft,
  saveDraftListing,
} from "@/features/listings/mutations";
import {
  listingIdActionSchema,
  saveDraftListingSchema,
} from "@/features/listings/schema";

const createDraftSchema = z.object({
  uploadPublicId: z.string().min(1),
  uploadUrl: z.url(),
  seed: z.string().min(1),
});

export async function createDraftFromFirstUploadAction(input: {
  uploadPublicId: string;
  uploadUrl: string;
  seed: string;
}) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = createDraftSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid draft payload");
  }

  const draft = await createDraftFromFirstUpload({
    sellerId: session.user.id,
    ...parsedInput.data,
  });

  return { listingId: draft.id };
}

function revalidateListingPaths(listingId: string) {
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/edit`);
  revalidatePath("/listings");
  revalidatePath("/dashboard/listings");
}

export async function saveDraftListingAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = saveDraftListingSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid draft payload");
  }

  const result = await saveDraftListing({
    sellerId: session.user.id,
    ...parsedInput.data,
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id };
}

export async function publishListingAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = listingIdActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid publish payload");
  }

  const result = await publishListing({
    listingId: parsedInput.data.listingId,
    sellerId: session.user.id,
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id, status: result.status };
}

export async function returnListingToDraftAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = listingIdActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid return-to-draft payload");
  }

  const result = await returnListingToDraft({
    listingId: parsedInput.data.listingId,
    sellerId: session.user.id,
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id, status: result.status };
}

export async function deleteDraftListingAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = listingIdActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid delete payload");
  }

  const result = await deleteDraftListing({
    listingId: parsedInput.data.listingId,
    sellerId: session.user.id,
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id };
}
