"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { normalizePublicListingsQuery } from "@/features/listings/helpers/browse-query";
import { createPublicListingsSearchParams } from "@/features/listings/helpers/browse-search-params";
import { getPublicListingsQueryInput } from "@/features/listings/helpers/query-input";

function buildListingsSearchHref(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  query: string,
) {
  if (pathname !== "/listings") {
    if (query.length === 0) {
      return "/listings";
    }

    return `/listings?q=${encodeURIComponent(query)}`;
  }

  const nextSearchParams = createPublicListingsSearchParams({
    ...normalizePublicListingsQuery(getPublicListingsQueryInput(searchParams)),
    q: query,
    page: 1,
  });

  const nextQueryString = nextSearchParams.toString();

  return nextQueryString.length > 0
    ? `/listings?${nextQueryString}`
    : "/listings";
}

export function NavbarSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  return (
    <search aria-label="Listing search" className="w-full">
      <form
        className="w-full"
        onSubmit={(event) => {
          event.preventDefault();

          router.push(
            buildListingsSearchHref(pathname, searchParams, value.trim()),
          );
        }}
      >
        <div
          data-slot="input-group"
          className="flex w-full items-center rounded-full border border-input/90 bg-input/45 shadow-[inset_0_1px_0_color-mix(in_oklab,white_5%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-accent)_8%,transparent)] transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        >
          <input
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
            className="h-11 w-full min-w-0 rounded-l-full border-0 bg-transparent px-4 py-1 text-base outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
          <div
            data-slot="input-group-addon"
            className="flex shrink-0 items-center pr-1"
          >
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border-0"
              aria-label="Submit listing search"
            >
              <SearchIcon data-icon="inline-start" />
            </Button>
          </div>
        </div>
      </form>
    </search>
  );
}
