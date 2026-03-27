"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const preservedBrowseKeys = [
  "status",
  "category",
  "price",
  "sort",
  "pageSize",
] as const;

type SearchParamsReader = {
  get(name: string): string | null;
};

function buildListingsSearchHref(
  pathname: string,
  searchParams: SearchParamsReader,
  query: string,
) {
  if (pathname !== "/listings") {
    if (query.length === 0) {
      return "/listings";
    }

    return `/listings?q=${encodeURIComponent(query)}`;
  }

  const nextSearchParams = new URLSearchParams();

  for (const key of preservedBrowseKeys) {
    const value = searchParams.get(key);

    if (value) {
      nextSearchParams.set(key, value);
    }
  }

  if (query.length > 0) {
    nextSearchParams.set("q", query);
  }

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
        <InputGroup>
          <InputGroupInput
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
          />
          <InputGroupAddon>
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border-0"
              aria-label="Submit listing search"
            >
              <SearchIcon data-icon="inline-start" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </search>
  );
}
