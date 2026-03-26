"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createDraftFromFirstUploadAction } from "@/features/listings/actions";
import {
  requestListingImageUploadSignature,
  uploadListingImageToCloudinary,
} from "@/features/listings/upload";

type UploadState = "idle" | "preview" | "uploading" | "processing";
type UploadedImage = {
  publicId: string;
  url: string;
};
type CreationMode = "ai" | "manual";

export function useCreateListingUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFailureDialogOpen, setIsFailureDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(
    null,
  );
  const [activeCreationMode, setActiveCreationMode] =
    useState<CreationMode>("ai");

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
    setIsFailureDialogOpen(false);
    setProgress(0);
    setUploadedImage(null);
    setUploadState(nextFile ? "preview" : "idle");
    setFile(nextFile);
  }

  async function createDraft(creationMode: CreationMode) {
    if (!file) {
      return;
    }

    try {
      setErrorMessage(null);
      setIsFailureDialogOpen(false);
      setActiveCreationMode(creationMode);
      let nextUploadedImage = uploadedImage;

      if (!nextUploadedImage) {
        setProgress(1);
        setUploadState("uploading");

        const signedParams = await requestListingImageUploadSignature();
        const uploadResult = await uploadListingImageToCloudinary(
          file,
          signedParams,
          (percent) => {
            setProgress((currentProgress) =>
              Math.max(currentProgress, percent),
            );
          },
        );

        nextUploadedImage = {
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
        };
        setUploadedImage(nextUploadedImage);
      }

      setProgress(100);
      setUploadState("processing");

      const result = await createDraftFromFirstUploadAction({
        uploadPublicId: nextUploadedImage.publicId,
        uploadUrl: nextUploadedImage.url,
        creationMode,
      });

      if (result.status === "ai_failed") {
        setUploadState("preview");
        setErrorMessage(result.errorMessage);
        setIsFailureDialogOpen(true);
        return;
      }

      router.push(`/listings/${result.listingId}`);
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

  function handleFailureDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && errorMessage) {
      return;
    }

    setIsFailureDialogOpen(nextOpen);
  }

  async function handleContinue() {
    await createDraft("ai");
  }

  async function handleContinueWithoutAi() {
    await createDraft("manual");
  }

  const isBusy = uploadState === "uploading" || uploadState === "processing";
  const statusLabel =
    uploadState === "uploading"
      ? `Uploading ${progress}%`
      : uploadState === "processing"
        ? activeCreationMode === "manual"
          ? "Creating your draft without AI..."
          : "Asking AI to build your draft..."
        : errorMessage && uploadedImage
          ? "Image uploaded. Retry AI or continue without AI."
          : file
            ? uploadedImage
              ? "Image uploaded and ready for another AI pass."
              : "First image ready for AI-assisted draft creation."
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
    uploadedImage,
    uploadState,
    isFailureDialogOpen,
    setIsDragging,
    handleContinue,
    handleContinueWithoutAi,
    handleFailureDialogOpenChange,
    handleFileSelection,
  };
}
