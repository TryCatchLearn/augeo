"use client";

import { RotateCcwIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingCategory } from "@/features/listings/domain";
import {
  publicListingCategoryOptions,
  publicListingPriceOptions,
  publicListingSortOptions,
} from "@/features/listings/helpers/browse-options";
import type {
  PublicListingPriceFilter,
  PublicListingSort,
  PublicListingsQuery,
} from "@/features/listings/helpers/browse-query";
import { createPublicListingsSearchParams } from "@/features/listings/helpers/browse-search-params";

type PublicListingsControlsProps = {
  query: PublicListingsQuery;
};

type ControlOption = {
  value: string;
  label: string;
};

type ControlConfig = {
  label: string;
  items: readonly ControlOption[];
  value: string;
  className: string;
  onValueChange: (value: string | null) => void;
};

export function PublicListingsControls({ query }: PublicListingsControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const controls: ControlConfig[] = [
    {
      label: "Category",
      items: publicListingCategoryOptions,
      value: query.category ?? "all",
      className: "w-auto min-w-44",
      onValueChange: (value: string | null) =>
        pushNextUrl({
          category:
            !value || value === "all" ? null : (value as ListingCategory),
        }),
    },
    {
      label: "Price",
      items: publicListingPriceOptions,
      value: query.price ?? "any",
      className: "w-auto min-w-36",
      onValueChange: (value: string | null) =>
        pushNextUrl({
          price:
            !value || value === "any"
              ? null
              : (value as PublicListingPriceFilter),
        }),
    },
    {
      label: "Sort",
      items: publicListingSortOptions,
      value: query.sort,
      className: "w-auto min-w-40",
      onValueChange: (value: string | null) =>
        pushNextUrl({
          sort: (value ?? "newest") as PublicListingSort,
        }),
    },
  ] as const;

  function pushNextUrl(
    updates: Partial<Pick<PublicListingsQuery, "category" | "price" | "sort">>,
  ) {
    const nextQuery: PublicListingsQuery = {
      ...query,
      ...updates,
      page: 1,
    };
    const searchParams = createPublicListingsSearchParams(nextQuery);
    const queryString = searchParams.toString();

    router.push(
      queryString.length > 0 ? `${pathname}?${queryString}` : pathname,
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {controls.map((control) => (
        <Select
          key={control.label}
          items={control.items}
          value={control.value}
          onValueChange={control.onValueChange}
        >
          <SelectTrigger
            aria-label={control.label}
            className={control.className}
          >
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            {control.items.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Reset filters"
        onClick={() =>
          pushNextUrl({
            category: null,
            price: null,
            sort: "newest",
          })
        }
      >
        <RotateCcwIcon />
      </Button>
    </div>
  );
}
