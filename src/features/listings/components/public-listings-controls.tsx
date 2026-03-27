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
import {
  createPublicListingsSearchParams,
  type PublicListingPriceFilter,
  type PublicListingSort,
  type PublicListingsQuery,
  publicListingCategoryOptions,
  publicListingPriceOptions,
  publicListingSortOptions,
} from "@/features/listings/browse";
import type { ListingCategory } from "@/features/listings/domain";

type PublicListingsControlsProps = {
  query: PublicListingsQuery;
};

export function PublicListingsControls({ query }: PublicListingsControlsProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      <Select
        items={publicListingCategoryOptions}
        value={query.category ?? "all"}
        onValueChange={(value) =>
          pushNextUrl({
            category: value === "all" ? null : (value as ListingCategory),
          })
        }
      >
        <SelectTrigger aria-label="Category" className="w-auto min-w-44">
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectContent>
          {publicListingCategoryOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={publicListingPriceOptions}
        value={query.price ?? "any"}
        onValueChange={(value) =>
          pushNextUrl({
            price: value === "any" ? null : (value as PublicListingPriceFilter),
          })
        }
      >
        <SelectTrigger aria-label="Price" className="w-auto min-w-36">
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectContent>
          {publicListingPriceOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={publicListingSortOptions}
        value={query.sort}
        onValueChange={(value) =>
          pushNextUrl({
            sort: value as PublicListingSort,
          })
        }
      >
        <SelectTrigger aria-label="Sort" className="w-auto min-w-40">
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectContent>
          {publicListingSortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
