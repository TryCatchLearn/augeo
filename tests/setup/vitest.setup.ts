import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { MockNextLink } from "../mocks/next-link";

vi.mock("next/link", () => ({
  default: MockNextLink,
}));
