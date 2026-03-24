"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createDraftFromFirstUploadAction } from "@/features/listings/actions";
import {
  requestListingImageUploadSignature,
  uploadListingImageToCloudinary,
} from "@/features/listings/upload";

type UploadState = "idle" | "preview" | "uploading" | "processing";

export function useCreateListingUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function handleFileSelection(nextFile: File | null) {
    setErrorMessage(null);
    setProgress(0);
    setUploadState(nextFile ? "preview" : "idle");
    setFile(nextFile);
  }

  async function handleContinue() {
    if (!file) {
      return;
    }

    try {
      setErrorMessage(null);
      setProgress(1);
      setUploadState("uploading");

      const signedParams = await requestListingImageUploadSignature();
      const uploadResult = await uploadListingImageToCloudinary(
        file,
        signedParams,
        (percent) => {
          setProgress((currentProgress) => Math.max(currentProgress, percent));
        },
      );

      setProgress(100);
      setUploadState("processing");

      const { listingId } = await createDraftFromFirstUploadAction({
        uploadPublicId: uploadResult.public_id,
        uploadUrl: uploadResult.secure_url,
        seed: `${file.name}:${file.size}:${uploadResult.public_id}`,
      });

      router.push(`/listings/${listingId}`);
      router.refresh();
    } catch (error) {
      setUploadState("preview");
      setProgress(0);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the listing.",
      );
    }
  }

  const isBusy = uploadState === "uploading" || uploadState === "processing";
  const statusLabel =
    uploadState === "uploading"
      ? `Uploading ${progress}%`
      : uploadState === "processing"
        ? "Processing..."
        : file
          ? "First image ready to become your draft cover photo."
          : "Choose one strong image to start the listing.";

  return {
    errorMessage,
    file,
    inputRef,
    isBusy,
    isDragging,
    previewUrl,
    progress,
    statusLabel,
    uploadState,
    setIsDragging,
    handleContinue,
    handleFileSelection,
  };
}
