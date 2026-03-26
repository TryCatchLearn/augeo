"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/session";
import {
  addListingImage,
  createDraftFromFirstUpload,
  deleteDraftListing,
  deleteListingImage,
  publishListing,
  returnListingToDraft,
  saveDraftListing,
  setMainListingImage,
} from "@/features/listings/mutations";
import {
  addListingImageSchema,
  listingIdActionSchema,
  listingImageActionSchema,
  saveDraftListingSchema,
} from "@/features/listings/schema";

const createDraftSchema = z.object({
  uploadPublicId: z.string().min(1),
  uploadUrl: z.url(),
  creationMode: z.enum(["ai", "manual"]),
});

export async function createDraftFromFirstUploadAction(input: {
  uploadPublicId: string;
  uploadUrl: string;
  creationMode: "ai" | "manual";
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

  if (draft.status === "ai_failed") {
    return {
      status: "ai_failed" as const,
      errorMessage: draft.message,
    };
  }

  return {
    status: "created" as const,
    listingId: draft.id,
  };
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

export async function addListingImageAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = addListingImageSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid add-image payload");
  }

  const result = await addListingImage({
    listingId: parsedInput.data.listingId,
    sellerId: session.user.id,
    uploadPublicId: parsedInput.data.uploadPublicId,
    uploadUrl: parsedInput.data.uploadUrl,
  });

  revalidateListingPaths(result.listingId);

  return { listingId: result.listingId, imageId: result.id };
}

export async function setMainListingImageAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = listingImageActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid set-main payload");
  }

  const result = await setMainListingImage({
    listingId: parsedInput.data.listingId,
    imageId: parsedInput.data.imageId,
    sellerId: session.user.id,
  });

  revalidateListingPaths(result.listingId);

  return { listingId: result.listingId, imageId: result.id };
}

export async function deleteListingImageAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsedInput = listingImageActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error("Invalid delete-image payload");
  }

  const result = await deleteListingImage({
    listingId: parsedInput.data.listingId,
    imageId: parsedInput.data.imageId,
    sellerId: session.user.id,
  });

  revalidateListingPaths(result.listingId);

  return { listingId: result.listingId, imageId: result.id };
}
