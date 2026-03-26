"use client";

import { UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateListingUpload } from "@/features/listings/hooks/use-create-listing-upload";
import { cn } from "@/lib/utils";

export function CreateListingUpload() {
  const {
    errorMessage,
    file,
    inputRef,
    isBusy,
    isDragging,
    previewUrl,
    progress,
    statusLabel,
    uploadState,
    isFailureDialogOpen,
    setIsDragging,
    handleContinue,
    handleContinueWithoutAi,
    handleFailureDialogOpenChange,
    handleFileSelection,
  } = useCreateListingUpload();

  return (
    <div className="grid h-full min-h-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(20rem,1fr)]">
      <div className="h-full min-h-120 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_94%,white_4%),color-mix(in_oklab,var(--color-card)_96%,black_4%))] p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_10%,transparent),0_24px_70px_rgba(0,0,0,0.25)] lg:min-h-0">
        {previewUrl ? (
          <div className="h-full">
            <div className="relative flex h-full min-h-104 items-center justify-center overflow-hidden rounded-[1.6rem] border border-border/70 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_52%),linear-gradient(180deg,color-mix(in_oklab,var(--color-muted)_32%,black_68%),color-mix(in_oklab,var(--color-card)_94%,black_6%))] py-8">
              <Image
                src={previewUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 60rem, 100vw"
                className="scale-110 object-cover opacity-35 blur-3xl"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,10,20,0.12)_42%,rgba(5,10,20,0.58)_100%)]" />
              <div className="absolute inset-x-8 inset-y-8">
                <Image
                  src={previewUrl}
                  alt="Selected listing preview"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 60rem, 100vw"
                  className="object-contain"
                />
              </div>
            </div>
            {errorMessage && !isFailureDialogOpen ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <label
            className={cn(
              "flex h-full min-h-104 cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-border/80 bg-muted/15 px-8 py-12 text-center transition-colors",
              isDragging &&
                "border-primary/55 bg-primary/8 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_22%,transparent)]",
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
              handleFileSelection(event.dataTransfer.files[0] ?? null);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              aria-label="Drop your first photo here"
              className="sr-only"
              onChange={(event) => {
                handleFileSelection(event.target.files?.[0] ?? null);
              }}
            />
            <div className="rounded-full border border-primary/25 bg-primary/10 p-5 text-primary shadow-[0_0_28px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]">
              <UploadCloud className="size-10" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Drop your first photo here
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              Drag and drop an image or click anywhere in this panel to select
              one. We&apos;ll upload it once, ask AI to draft the core details,
              and send you to the private listing view to refine everything
              next.
            </p>
          </label>
        )}
      </div>

      <aside className="flex h-full min-h-120 flex-col rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-muted)_18%,transparent),color-mix(in_oklab,var(--color-card)_90%,black_10%))] p-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),0_24px_70px_rgba(0,0,0,0.22)] lg:min-h-0">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          How it works
        </p>
        <ol className="mt-6 space-y-6">
          {[
            [
              "Upload your first image",
              "Choose the photo that opens your draft.",
            ],
            [
              "AI builds the draft",
              "We upload the image, draft the listing details, and keep a manual fallback ready.",
            ],
            [
              "Refine and publish",
              "Next you land on the private listing page.",
            ],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-semibold text-primary">
                {index + 1}
              </div>
              <div>
                <h3 className="pt-1 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div
          className={cn(
            "mt-auto min-h-42 space-y-4 rounded-[1.4rem] border border-border/70 bg-background/50 p-4 transition-opacity",
            file ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={file ? undefined : true}
        >
          <div
            className={cn(
              "space-y-4",
              !file && "pointer-events-none select-none",
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium">{file?.name ?? "Reserved space"}</p>
                <span className="text-muted-foreground">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {file ? statusLabel : ""}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted/75">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-[width] duration-300",
                    uploadState === "processing" && "animate-pulse",
                  )}
                  style={{
                    width:
                      uploadState === "processing"
                        ? "100%"
                        : `${Math.max(progress, uploadState === "preview" ? 0 : 8)}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleFileSelection(null)}
                disabled={!file || isBusy}
              >
                <X />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleContinue}
                disabled={!file || isBusy}
              >
                {uploadState === "uploading"
                  ? "Uploading..."
                  : uploadState === "processing"
                    ? "Processing..."
                    : errorMessage
                      ? "Retry AI"
                      : "Create with AI"}
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <Dialog
        open={isFailureDialogOpen}
        onOpenChange={handleFailureDialogOpenChange}
      >
        <DialogContent
          className="w-[min(32rem,calc(100vw-2rem))]"
          showClose={false}
        >
          <DialogHeader>
            <DialogTitle>AI draft couldn&apos;t be completed</DialogTitle>
            <DialogDescription>
              {errorMessage ??
                "We couldn't create an AI draft right now. You can retry with the uploaded image or continue without AI."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="pt-1">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">
                {file
                  ? `Your uploaded image is still ready for ${file.name}.`
                  : "Your uploaded image is still ready."}
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={handleContinueWithoutAi}
              disabled={!file || isBusy}
            >
              Continue without AI
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!file || isBusy}
            >
              Retry AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
