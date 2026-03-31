"use client";

import { StarIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import {
  deleteListingImageAction,
  setMainListingImageAction,
} from "@/features/listings/actions";
import { canDeleteListingImage } from "@/features/listings/domain";
import { cn } from "@/lib/utils";

type ListingImageGalleryProps = {
  listingId?: string;
  canManage?: boolean;
  title: string;
  images: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
};

export function ListingImageGallery({
  listingId,
  canManage = false,
  title,
  images,
}: ListingImageGalleryProps) {
  const [galleryImages, setGalleryImages] = useState(images);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextInitialImage =
      images.find((image) => image.isMain) ?? images[0] ?? null;

    setGalleryImages(images);
    setSelectedImageId(nextInitialImage?.id ?? "");
  }, [images]);

  const initialImage =
    galleryImages.find((image) => image.isMain) ?? galleryImages[0] ?? null;

  const selectedImage =
    galleryImages.find((image) => image.id === selectedImageId) ?? initialImage;

  const runManagedAction = (action: () => Promise<void>) => {
    setErrorMessage(null);
    void action()
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to update the listing images right now.",
        );
      })
      .finally(() => {
        setPendingImageId(null);
      });
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-4/3 overflow-hidden rounded-[1.6rem] border border-border/70 bg-muted">
        {selectedImage ? (
          <Image
            src={selectedImage.url}
            alt={title}
            fill
            sizes="(min-width: 1280px) 42rem, (min-width: 1024px) 60vw, 100vw"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Image coming soon
          </div>
        )}
      </div>

      {galleryImages.length > 0 ? (
        <div className="grid grid-cols-5 gap-3">
          {galleryImages.slice(0, 5).map((image, index) => {
            const isSelected = image.id === selectedImage?.id;
            const isPending = pendingImageId === image.id;

            return (
              <div key={image.id} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-2xl border border-border/70 bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary/50 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent),0_0_24px_color-mix(in_oklab,var(--color-primary)_16%,transparent)]"
                      : "hover:border-primary/30",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={`${title} thumbnail ${index + 1}`}
                    fill
                    sizes="8rem"
                    className="size-full object-cover"
                  />
                </button>

                {canManage && listingId ? (
                  <>
                    <button
                      type="button"
                      aria-label={
                        image.isMain
                          ? `Image ${index + 1} is the main image`
                          : `Set image ${index + 1} as main`
                      }
                      disabled={image.isMain || Boolean(pendingImageId)}
                      className={cn(
                        "absolute right-2 top-2 inline-flex size-8 items-center justify-center text-slate-300 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        image.isMain && "text-amber-400 hover:text-amber-400",
                        (image.isMain || Boolean(pendingImageId)) &&
                          "cursor-not-allowed opacity-60",
                      )}
                      onClick={() => {
                        setPendingImageId(image.id);
                        runManagedAction(async () => {
                          await setMainListingImageAction({
                            listingId,
                            imageId: image.id,
                          });
                          setGalleryImages((currentImages) =>
                            currentImages.map((currentImage) => ({
                              ...currentImage,
                              isMain: currentImage.id === image.id,
                            })),
                          );
                        });
                      }}
                    >
                      <StarIcon
                        className={cn("size-4", image.isMain && "fill-current")}
                      />
                    </button>

                    <ConfirmActionDialog
                      trigger={
                        <button
                          type="button"
                          aria-label={`Delete image ${index + 1}`}
                          disabled={
                            !canDeleteListingImage(galleryImages.length) ||
                            Boolean(pendingImageId)
                          }
                          className={cn(
                            "absolute left-2 top-2 inline-flex size-8 items-center justify-center text-slate-300 transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            (!canDeleteListingImage(galleryImages.length) ||
                              Boolean(pendingImageId)) &&
                              "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      }
                      title="Delete Listing Image"
                      description="This removes the image from the draft and deletes the uploaded asset permanently."
                      confirmLabel="Delete Image"
                      confirmVariant="destructive"
                      isPending={isPending}
                      onConfirm={() => {
                        setPendingImageId(image.id);
                        runManagedAction(async () => {
                          await deleteListingImageAction({
                            listingId,
                            imageId: image.id,
                          });
                          setGalleryImages((currentImages) => {
                            const remainingImages = currentImages.filter(
                              (currentImage) => currentImage.id !== image.id,
                            );

                            if (
                              image.isMain &&
                              remainingImages.length > 0 &&
                              !remainingImages.some(
                                (currentImage) => currentImage.isMain,
                              )
                            ) {
                              remainingImages[0] = {
                                ...remainingImages[0],
                                isMain: true,
                              };
                            }

                            return remainingImages;
                          });
                        });
                      }}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
