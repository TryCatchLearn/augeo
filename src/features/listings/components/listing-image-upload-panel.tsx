"use client";

import { ImagePlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { addListingImageAction } from "@/features/listings/actions";
import {
  canAddListingImage,
  maxListingImageCount,
} from "@/features/listings/domain";
import { useListingImageUpload } from "@/features/listings/hooks/use-listing-image-upload";
import { cn } from "@/lib/utils";

type ListingImageUploadPanelProps = {
  listingId: string;
  imageCount: number;
};

type UploadState = "idle" | "uploading" | "processing";

export function ListingImageUploadPanel({
  listingId,
  imageCount,
}: ListingImageUploadPanelProps) {
  const router = useRouter();
  const { uploadImage } = useListingImageUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = uploadState !== "idle";

  const handleUpload = async (file: File | null) => {
    if (!file || isBusy) {
      return;
    }

    if (!canAddListingImage(imageCount)) {
      setErrorMessage(
        `Listings can include up to ${maxListingImageCount} images.`,
      );
      return;
    }

    try {
      setErrorMessage(null);
      setProgress(1);
      setUploadState("uploading");

      const uploadResult = await uploadImage(file, (percent) => {
        setProgress((currentProgress) => Math.max(currentProgress, percent));
      });

      setProgress(100);
      setUploadState("processing");

      await addListingImageAction({
        listingId,
        uploadPublicId: uploadResult.public_id,
        uploadUrl: uploadResult.secure_url,
      });

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload the image right now.",
      );
    } finally {
      setUploadState("idle");
      setProgress(0);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const statusLabel =
    uploadState === "uploading"
      ? `Uploading ${progress}%`
      : uploadState === "processing"
        ? "Processing..."
        : `${imageCount} / ${maxListingImageCount} images`;

  return (
    <div className="space-y-4 rounded-[2rem] border border-border/70 bg-background/55 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Add More Images
        </h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Drop another photo into this draft to expand the thumbnail strip. You
          can keep up to {maxListingImageCount} images total.
        </p>
      </div>

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center transition-colors",
          isDragging &&
            "border-primary/55 bg-primary/8 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_22%,transparent)]",
          isBusy && "pointer-events-none opacity-80",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleUpload(event.dataTransfer.files[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label="Add another listing image"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            handleUpload(event.target.files?.[0] ?? null);
          }}
        />
        <div className="rounded-full border border-primary/25 bg-primary/10 p-4 text-primary">
          <ImagePlusIcon className="size-8" />
        </div>
        <p className="mt-4 text-lg font-semibold">Drop an image here</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Or click to choose another photo for this draft.
        </p>
      </label>

      <div className="space-y-3 rounded-[1.4rem] border border-border/70 bg-background/50 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium">{statusLabel}</p>
          {isBusy ? (
            <span className="text-muted-foreground">{progress}%</span>
          ) : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/75">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width] duration-300",
              uploadState === "processing" && "animate-pulse",
            )}
            style={{
              width: isBusy
                ? uploadState === "processing"
                  ? "100%"
                  : `${Math.max(progress, 8)}%`
                : "0%",
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isBusy || !canAddListingImage(imageCount)}
          onClick={() => inputRef.current?.click()}
        >
          {canAddListingImage(imageCount)
            ? "Choose Image"
            : "Image Limit Reached"}
        </Button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
