import { afterEach, beforeEach, vi } from "vitest";
import { MockNextLink } from "../mocks/next-link";

if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}

vi.mock("next/link", () => ({
  default: MockNextLink,
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
