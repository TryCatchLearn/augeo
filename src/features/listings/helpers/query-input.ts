import type {
  DashboardListingsQueryInput,
  PublicListingsQueryInput,
} from "@/features/listings/helpers/browse-query";

type SearchParamValue = string | string[] | undefined;

type SearchParamsRecord = Record<string, SearchParamValue>;
type SearchParamsReader = {
  get(name: string): string | null;
};

type SearchParamsSource = SearchParamsRecord | SearchParamsReader | undefined;

function getSingleSearchParamValue(
  value: SearchParamValue,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSearchParamsReader(
  source: SearchParamsSource,
): source is SearchParamsReader {
  return typeof source === "object" && source !== null && "get" in source;
}

function readSearchParam(source: SearchParamsSource, name: string) {
  if (!source) {
    return undefined;
  }

  if (isSearchParamsReader(source)) {
    return source.get(name) ?? undefined;
  }

  return getSingleSearchParamValue(source[name]);
}

export function getPublicListingsQueryInput(
  source?: SearchParamsSource,
): PublicListingsQueryInput {
  return {
    status: readSearchParam(source, "status"),
    q: readSearchParam(source, "q"),
    category: readSearchParam(source, "category"),
    price: readSearchParam(source, "price"),
    sort: readSearchParam(source, "sort"),
    page: readSearchParam(source, "page"),
    pageSize: readSearchParam(source, "pageSize"),
  };
}

export function getDashboardListingsQueryInput(
  source?: SearchParamsSource,
): DashboardListingsQueryInput {
  return {
    status: readSearchParam(source, "status"),
    page: readSearchParam(source, "page"),
    pageSize: readSearchParam(source, "pageSize"),
  };
}
