"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/features/auth/session";
import {
  buildManualDraftDefaults,
  buildSmartListingDraftDefaults,
  canAddListingImage,
  canDeleteListing,
  canDeleteListingImage,
  canPublishListing,
  canReturnToDraft,
  getNextMainImageIdAfterDelete,
  getPublishedStatus,
  InvalidSmartListingResultError,
} from "@/features/listings/domain";
import {
  BidActionError,
  deleteDraftListingRecords,
  deleteListingImageRecord,
  incrementListingDescriptionGenerationCount,
  insertDraftWithMainImage,
  insertListingImage,
  placeBidForListing,
  setMainListingImage,
  updateDraftListing,
  updateListingStatus,
} from "@/features/listings/mutations";
import {
  getOwnedListing,
  listListingImageAssets,
} from "@/features/listings/queries";
import {
  addListingImageSchema,
  createDraftFromFirstUploadSchema,
  descriptionEnhancerRequestSchema,
  getRemainingDescriptionEnhancementRuns,
  hasDescriptionEnhancementRunsRemaining,
  listingIdActionSchema,
  listingImageActionSchema,
  placeBidSchema,
  saveDraftListingSchema,
  validateEnhancedDescription,
} from "@/features/listings/schema";
import type { ListingBidPlacedEvent } from "@/features/realtime/events";
import {
  publishListingBidPlaced,
  publishNotificationCreated,
} from "@/server/ably";
import {
  AiGenerationError,
  generateSmartListingFromImage,
  streamEnhancedDescription,
} from "@/server/ai";
import {
  createListingImageUploadSignature,
  deleteCloudinaryAssets,
} from "@/server/cloudinary";
import { formatListingPrice } from "./utils";

function parseOrThrow<TOutput>(
  parser: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: TOutput } | { success: false };
  },
  input: unknown,
  message: string,
) {
  const parsedInput = parser.safeParse(input);

  if (!parsedInput.success) {
    throw new Error(message);
  }

  return parsedInput.data;
}

function revalidateListingPaths(listingId: string) {
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/edit`);
  revalidatePath("/listings");
  revalidatePath("/dashboard/listings");
}

export async function createListingImageUploadSignatureAction() {
  await requireAuthenticatedSession();

  return createListingImageUploadSignature();
}

export async function createDraftFromFirstUploadAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    createDraftFromFirstUploadSchema,
    input,
    "Invalid draft payload",
  );
  const now = new Date();

  try {
    const defaults =
      parsedInput.creationMode === "manual"
        ? buildManualDraftDefaults(now)
        : buildSmartListingDraftDefaults(
            await generateSmartListingFromImage(parsedInput.uploadUrl),
            now,
          );
    const draft = await insertDraftWithMainImage({
      sellerId: session.user.id,
      uploadPublicId: parsedInput.uploadPublicId,
      uploadUrl: parsedInput.uploadUrl,
      defaults,
    });

    return {
      status: "created" as const,
      listingId: draft.id,
    };
  } catch (error) {
    if (
      error instanceof AiGenerationError ||
      error instanceof InvalidSmartListingResultError
    ) {
      return {
        status: "ai_failed" as const,
        errorMessage:
          "We couldn't create an AI draft right now. Retry AI or continue without AI.",
      };
    }

    throw error;
  }
}

export async function saveDraftListingAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    saveDraftListingSchema,
    input,
    "Invalid draft payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing cannot be edited.");
  }

  const result = await updateDraftListing(parsedInput);

  revalidateListingPaths(result.id);

  return { listingId: result.id };
}

export async function publishListingAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    listingIdActionSchema,
    input,
    "Invalid publish payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || !canPublishListing(existingListing.status)) {
    throw new Error("Listing cannot be published.");
  }

  const result = await updateListingStatus({
    listingId: parsedInput.listingId,
    status: getPublishedStatus(existingListing.startsAt),
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id, status: result.status };
}

export async function returnListingToDraftAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    listingIdActionSchema,
    input,
    "Invalid return-to-draft payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (
    !existingListing ||
    !canReturnToDraft(existingListing.status, existingListing.bidCount)
  ) {
    throw new Error("Listing cannot be returned to draft.");
  }

  const result = await updateListingStatus({
    listingId: parsedInput.listingId,
    status: "draft",
  });

  revalidateListingPaths(result.id);

  return { listingId: result.id, status: result.status };
}

export async function placeBidAction(input: unknown) {
  try {
    const session = await requireAuthenticatedSession();
    const parsedInput = parseOrThrow(
      placeBidSchema,
      input,
      "Invalid bid payload",
    );
    const result = await placeBidForListing({
      ...parsedInput,
      bidderId: session.user.id,
    });

    try {
      const event: ListingBidPlacedEvent = {
        listingId: result.listingId,
        currentBidCents: result.currentBidCents,
        bidCount: result.bidCount,
        minimumNextBidCents: result.minimumNextBidCents,
        highestBidderId: result.highestBidderId,
        bid: {
          id: result.bid.id,
          bidderId: result.bid.bidderId,
          bidderName: result.bid.bidderName,
          amountCents: result.bid.amountCents,
          createdAt: result.bid.createdAt.toISOString(),
        },
      };

      await publishListingBidPlaced(event);
    } catch (error) {
      console.error("Failed to publish listing bid update.", error);
    }

    if (result.previousHighestBidderId && result.notificationEvent) {
      try {
        await publishNotificationCreated(
          result.previousHighestBidderId,
          result.notificationEvent,
        );
      } catch (error) {
        console.error("Failed to publish notification update.", error);
      }
    }

    revalidateListingPaths(result.listingId);

    return {
      status: "success" as const,
      listingId: result.listingId,
    };
  } catch (error) {
    if (error instanceof BidActionError) {
      const minimumBidMatch = error.message.match(
        /^Bid must be at least (\d+) cents\.$/,
      );

      return {
        status: "error" as const,
        errorMessage: minimumBidMatch
          ? `Bid must be at least ${formatListingPrice(Number(minimumBidMatch[1]))}.`
          : error.message,
      };
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return {
        status: "error" as const,
        errorMessage: "Sign in to place a bid.",
      };
    }

    throw error;
  }
}

export async function deleteDraftListingAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    listingIdActionSchema,
    input,
    "Invalid delete payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || !canDeleteListing(existingListing.status)) {
    throw new Error("Listing cannot be deleted.");
  }

  const images = await listListingImageAssets(parsedInput.listingId);

  await deleteCloudinaryAssets(images.map((image) => image.publicId));

  const result = await deleteDraftListingRecords(parsedInput.listingId);

  revalidateListingPaths(result.id);

  return { listingId: result.id };
}

export async function addListingImageAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    addListingImageSchema,
    input,
    "Invalid add-image payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing image cannot be added.");
  }

  const images = await listListingImageAssets(parsedInput.listingId);

  if (!canAddListingImage(images.length)) {
    throw new Error("Listings can include up to 5 images.");
  }

  const result = await insertListingImage({
    listingId: parsedInput.listingId,
    uploadPublicId: parsedInput.uploadPublicId,
    uploadUrl: parsedInput.uploadUrl,
    isMain: images.length === 0,
  });

  revalidateListingPaths(result.listingId);

  return { listingId: result.listingId, imageId: result.id };
}

export async function setMainListingImageAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    listingImageActionSchema,
    input,
    "Invalid set-main payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing main image cannot be updated.");
  }

  const images = await listListingImageAssets(parsedInput.listingId);

  if (!images.some((image) => image.id === parsedInput.imageId)) {
    throw new Error("Listing image was not found.");
  }

  const result = await setMainListingImage({
    listingId: parsedInput.listingId,
    imageId: parsedInput.imageId,
  });

  revalidateListingPaths(result.listingId);

  return { listingId: result.listingId, imageId: result.id };
}

export async function deleteListingImageAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    listingImageActionSchema,
    input,
    "Invalid delete-image payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing image cannot be deleted.");
  }

  const images = await listListingImageAssets(parsedInput.listingId);
  const targetImage = images.find((image) => image.id === parsedInput.imageId);

  if (!targetImage) {
    throw new Error("Listing image was not found.");
  }

  if (!canDeleteListingImage(images.length)) {
    throw new Error("The final listing image cannot be deleted.");
  }

  await deleteCloudinaryAssets([targetImage.publicId]);

  const result = await deleteListingImageRecord({
    imageId: parsedInput.imageId,
    nextMainImageId: targetImage.isMain
      ? getNextMainImageIdAfterDelete(images, parsedInput.imageId)
      : null,
  });

  revalidateListingPaths(parsedInput.listingId);

  return { listingId: parsedInput.listingId, imageId: result.id };
}

export async function enhanceListingDescriptionAction(input: unknown) {
  const session = await requireAuthenticatedSession();
  const parsedInput = parseOrThrow(
    descriptionEnhancerRequestSchema,
    input,
    "Invalid description-enhancement payload",
  );
  const existingListing = await getOwnedListing(
    session.user.id,
    parsedInput.listingId,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing cannot be enhanced.");
  }

  if (
    !hasDescriptionEnhancementRunsRemaining(
      existingListing.aiDescriptionGenerationCount,
    )
  ) {
    throw new Error("AI description limit reached for this listing.");
  }

  const nextCount = existingListing.aiDescriptionGenerationCount + 1;

  await incrementListingDescriptionGenerationCount({
    listingId: parsedInput.listingId,
    sellerId: session.user.id,
    currentCount: existingListing.aiDescriptionGenerationCount,
  });

  const result = await streamEnhancedDescription(parsedInput);
  const validation = validateEnhancedDescription(
    result.text,
    parsedInput.description,
  );

  if (!validation.success) {
    throw new Error(validation.message);
  }

  return {
    text: validation.description,
    remainingRuns: getRemainingDescriptionEnhancementRuns(nextCount),
  };
}
