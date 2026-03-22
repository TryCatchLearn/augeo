"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createDraftFromFirstUploadAction } from "@/features/listings/actions";

export type UploadSignatureResponse = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

type UploadState = "idle" | "preview" | "uploading" | "processing";

async function uploadToCloudinary(
  file: File,
  signedParams: UploadSignatureResponse,
  onProgress: (percent: number) => void,
) {
  const formData = new FormData();

  formData.set("file", file);
  formData.set("api_key", signedParams.apiKey);
  formData.set("folder", signedParams.folder);
  formData.set("signature", signedParams.signature);
  formData.set("timestamp", String(signedParams.timestamp));

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signedParams.cloudName}/image/upload`;

  return new Promise<{ public_id: string; secure_url: string }>(
    (resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("POST", cloudinaryUrl);
      request.responseType = "json";

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress(Math.round((event.loaded / event.total) * 100));
      });

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.response);
          return;
        }

        reject(new Error("Image upload failed."));
      });

      request.addEventListener("error", () => {
        reject(new Error("Image upload failed."));
      });

      request.send(formData);
    },
  );
}

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
      setUploadState("uploading");

      const signatureResponse = await fetch("/api/upload-signature", {
        method: "POST",
      });

      if (!signatureResponse.ok) {
        throw new Error("Unable to prepare the image upload.");
      }

      const signedParams =
        (await signatureResponse.json()) as UploadSignatureResponse;
      const uploadResult = await uploadToCloudinary(
        file,
        signedParams,
        setProgress,
      );

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
