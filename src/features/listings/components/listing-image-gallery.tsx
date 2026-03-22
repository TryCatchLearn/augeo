"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ListingImageGalleryProps = {
  title: string;
  images: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
};

export function ListingImageGallery({
  title,
  images,
}: ListingImageGalleryProps) {
  const initialImage =
    images.find((image) => image.isMain) ?? images[0] ?? null;
  const [selectedImageId, setSelectedImageId] = useState(
    initialImage?.id ?? "",
  );

  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? initialImage;

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

      {images.length > 0 ? (
        <div className="grid grid-cols-5 gap-3">
          {images.slice(0, 5).map((image, index) => {
            const isSelected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
