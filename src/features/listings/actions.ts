"use server";

import { z } from "zod";
import { getSession } from "@/features/auth/session";
import { createDraftFromFirstUpload } from "@/features/listings/mutations";

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
