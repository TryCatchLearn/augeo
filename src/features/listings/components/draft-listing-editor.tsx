"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  enhanceListingDescriptionAction,
  saveDraftListingAction,
} from "@/features/listings/actions";
import {
  type ListingStatus,
  listingCategories,
  listingConditions,
} from "@/features/listings/domain";
import {
  descriptionEnhancerToneLabels,
  descriptionEnhancerTones,
  getRemainingDescriptionEnhancementRuns,
  type ListingDraftFormInput,
  type ListingDraftFormValues,
  listingDraftFormSchema,
} from "@/features/listings/schema";
import {
  dollarsToCents,
  formatDateTimeLocalInput,
  localDateTimeToIsoString,
} from "@/features/listings/utils";

type DraftListingEditorProps = {
  listing: {
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    condition: string;
    status: ListingStatus;
    startingBidCents: number;
    reservePriceCents: number | null;
    aiDescriptionGenerationCount: number;
    startsAt: Date | null;
    endsAt: Date;
  };
};

type DescriptionEnhancementTone = (typeof descriptionEnhancerTones)[number];

type DescriptionEnhancementState =
  | {
      status: "idle";
      preview: string;
      errorMessage: string | null;
    }
  | {
      status: "generating";
      preview: string;
      errorMessage: string | null;
    }
  | {
      status: "ready";
      preview: string;
      errorMessage: null;
    }
  | {
      status: "error";
      preview: string;
      errorMessage: string;
    };

function formatMoneyInput(cents: number | null) {
  if (cents === null) {
    return undefined;
  }

  return Number((cents / 100).toFixed(2));
}

function createIdleEnhancementState(): DescriptionEnhancementState {
  return {
    status: "idle",
    preview: "",
    errorMessage: null,
  };
}

export function DraftListingEditor({ listing }: DraftListingEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTone, setSelectedTone] =
    useState<DescriptionEnhancementTone>("friendly");
  const [remainingRuns, setRemainingRuns] = useState(
    getRemainingDescriptionEnhancementRuns(
      listing.aiDescriptionGenerationCount,
    ),
  );
  const [enhancementState, setEnhancementState] =
    useState<DescriptionEnhancementState>(createIdleEnhancementState);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ListingDraftFormInput, unknown, ListingDraftFormValues>({
    resolver: zodResolver(listingDraftFormSchema),
    defaultValues: {
      title: listing.title,
      description: listing.description,
      location: listing.location,
      category: listing.category as ListingDraftFormValues["category"],
      condition: listing.condition as ListingDraftFormValues["condition"],
      startingBidDollars: formatMoneyInput(listing.startingBidCents),
      reservePriceDollars: formatMoneyInput(listing.reservePriceCents),
      startsAt: formatDateTimeLocalInput(listing.startsAt),
      endsAt: formatDateTimeLocalInput(listing.endsAt),
    },
  });
  const [title, category, condition, description] = watch([
    "title",
    "category",
    "condition",
    "description",
  ]);

  const isGenerating = enhancementState.status === "generating";
  const hasReadyPreview = enhancementState.status === "ready";
  const hasPreviewPanel =
    enhancementState.status !== "idle" ||
    enhancementState.preview.length > 0 ||
    Boolean(enhancementState.errorMessage);
  const limitReached = remainingRuns <= 0;

  async function runDescriptionEnhancement() {
    try {
      setEnhancementState({
        status: "generating",
        preview: "",
        errorMessage: null,
      });

      const result = await enhanceListingDescriptionAction({
        listingId: listing.id,
        title,
        category,
        condition,
        description,
        tone: selectedTone,
      });

      setRemainingRuns(result.remainingRuns);
      setEnhancementState({
        status: "ready",
        preview: result.text,
        errorMessage: null,
      });
    } catch (error) {
      setEnhancementState({
        status: "error",
        preview: "",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unable to enhance the description right now.",
      });
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSaving(true);

      await saveDraftListingAction({
        listingId: listing.id,
        title: values.title,
        description: values.description,
        location: values.location,
        category: values.category,
        condition: values.condition,
        startingBidCents: dollarsToCents(values.startingBidDollars),
        reservePriceCents:
          values.reservePriceDollars === undefined
            ? null
            : dollarsToCents(values.reservePriceDollars),
        startsAt: values.startsAt
          ? localDateTimeToIsoString(values.startsAt)
          : null,
        endsAt: localDateTimeToIsoString(values.endsAt),
      });

      router.push(`/listings/${listing.id}`);
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the draft right now.",
      });
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Draft Editor
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Refine your listing before it goes live.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Save draft changes safely, keep the listing private, and return to the
          detail page when you are ready to publish.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <Card className="rounded-[2rem]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl">Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form
              className="flex flex-col gap-6"
              noValidate
              onSubmit={onSubmit}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(errors.title)}>
                  <FieldLabel htmlFor="listing-title">Title</FieldLabel>
                  <FieldContent>
                    <Input
                      id="listing-title"
                      aria-invalid={Boolean(errors.title)}
                      {...register("title")}
                    />
                    <FieldError errors={[errors.title]} />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="listing-description">
                    Description
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="listing-description"
                      aria-invalid={Boolean(errors.description)}
                      {...register("description")}
                    />
                    <FieldError errors={[errors.description]} />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors.location)}>
                  <FieldLabel htmlFor="listing-location">Location</FieldLabel>
                  <FieldContent>
                    <Input
                      id="listing-location"
                      aria-invalid={Boolean(errors.location)}
                      {...register("location")}
                    />
                    <FieldError errors={[errors.location]} />
                  </FieldContent>
                </Field>

                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={Boolean(errors.category)}>
                    <FieldLabel htmlFor="listing-category">Category</FieldLabel>
                    <FieldContent>
                      <Controller
                        control={control}
                        name="category"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => field.onChange(value)}
                          >
                            <SelectTrigger
                              id="listing-category"
                              aria-invalid={Boolean(errors.category)}
                            >
                              <SelectValue placeholder="Select a category" />
                              <SelectIcon />
                            </SelectTrigger>
                            <SelectContent>
                              {listingCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category.replaceAll("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.category]} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.condition)}>
                    <FieldLabel htmlFor="listing-condition">
                      Condition
                    </FieldLabel>
                    <FieldContent>
                      <Controller
                        control={control}
                        name="condition"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => field.onChange(value)}
                          >
                            <SelectTrigger
                              id="listing-condition"
                              aria-invalid={Boolean(errors.condition)}
                            >
                              <SelectValue placeholder="Select a condition" />
                              <SelectIcon />
                            </SelectTrigger>
                            <SelectContent>
                              {listingConditions.map((condition) => (
                                <SelectItem key={condition} value={condition}>
                                  {condition.replaceAll("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.condition]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={Boolean(errors.startingBidDollars)}>
                    <FieldLabel htmlFor="listing-starting-bid">
                      Starting Bid
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="listing-starting-bid"
                        type="number"
                        min="0.01"
                        step="0.01"
                        aria-invalid={Boolean(errors.startingBidDollars)}
                        {...register("startingBidDollars", {
                          valueAsNumber: true,
                        })}
                      />
                      <FieldDescription>
                        Enter the amount in USD.
                      </FieldDescription>
                      <FieldError errors={[errors.startingBidDollars]} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.reservePriceDollars)}>
                    <FieldLabel htmlFor="listing-reserve-price">
                      Reserve Price
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="listing-reserve-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        aria-invalid={Boolean(errors.reservePriceDollars)}
                        {...register("reservePriceDollars", {
                          setValueAs: (value) =>
                            value === "" ? undefined : Number(value),
                        })}
                      />
                      <FieldDescription>
                        Leave blank if there is no reserve.
                      </FieldDescription>
                      <FieldError errors={[errors.reservePriceDollars]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={Boolean(errors.startsAt)}>
                    <FieldLabel htmlFor="listing-starts-at">
                      Start At
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="listing-starts-at"
                        type="datetime-local"
                        aria-invalid={Boolean(errors.startsAt)}
                        {...register("startsAt")}
                      />
                      <FieldDescription>
                        Leave blank to publish immediately.
                      </FieldDescription>
                      <FieldError errors={[errors.startsAt]} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.endsAt)}>
                    <FieldLabel htmlFor="listing-ends-at">Ends At</FieldLabel>
                    <FieldContent>
                      <Input
                        id="listing-ends-at"
                        type="datetime-local"
                        aria-invalid={Boolean(errors.endsAt)}
                        {...register("endsAt")}
                      />
                      <FieldError errors={[errors.endsAt]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <FieldError errors={[errors.root]} />
              </FieldGroup>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => router.push(`/listings/${listing.id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl">AI Description Enhancer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <p className="text-sm leading-7 text-muted-foreground">
                Generate a rewritten draft description in a chosen tone. The
                preview stays separate until you accept it, and saving is still
                controlled by the main form.
              </p>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="description-enhancer-tone">
                  Tone
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={selectedTone}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedTone(value);
                      }
                    }}
                  >
                    <SelectTrigger id="description-enhancer-tone">
                      <SelectValue placeholder="Select a tone" />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectContent>
                      {descriptionEnhancerTones.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {descriptionEnhancerToneLabels[tone]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {limitReached
                      ? "AI run limit reached for this draft."
                      : `${remainingRuns} AI run${remainingRuns === 1 ? "" : "s"} remaining.`}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>

            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={limitReached || isGenerating}
              className="w-full"
              onClick={() => {
                void runDescriptionEnhancement();
              }}
            >
              {isGenerating ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              Refine description with AI
            </Button>

            {hasPreviewPanel ? (
              <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-sm text-muted-foreground">
                    {isGenerating
                      ? "Generating a draft rewrite now."
                      : "Review this version before accepting it into the form."}
                  </p>
                </div>

                {enhancementState.preview ? (
                  <div className="rounded-2xl bg-background p-4 text-sm leading-7 whitespace-pre-wrap">
                    {enhancementState.preview}
                  </div>
                ) : null}

                {enhancementState.errorMessage ? (
                  <p className="text-sm text-destructive">
                    {enhancementState.errorMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={limitReached || isGenerating}
                    onClick={() => {
                      void runDescriptionEnhancement();
                    }}
                  >
                    <SparklesIcon data-icon="inline-start" />
                    Regenerate
                  </Button>

                  {hasReadyPreview ? (
                    <Button
                      type="button"
                      onClick={() => {
                        setValue("description", enhancementState.preview, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors("description");
                        setEnhancementState(createIdleEnhancementState());
                      }}
                    >
                      Accept
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isGenerating}
                    onClick={() => {
                      setEnhancementState(createIdleEnhancementState());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
