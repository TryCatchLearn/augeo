import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicListingsControls } from "@/features/listings/components/public-listings-controls";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/listings",
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => {
    function collectOptions(
      node: ReactNode,
    ): Array<{ value: string; label: ReactNode }> {
      if (!node) {
        return [];
      }

      if (Array.isArray(node)) {
        return node.flatMap(collectOptions);
      }

      if (typeof node !== "object") {
        return [];
      }

      if ("props" in node && node.props && typeof node.props === "object") {
        const maybeValue = "value" in node.props ? node.props.value : undefined;

        if (typeof maybeValue === "string") {
          return [
            {
              value: maybeValue,
              label:
                "children" in node.props
                  ? (node.props.children as ReactNode)
                  : null,
            },
          ];
        }

        return collectOptions(
          "children" in node.props ? (node.props.children as ReactNode) : null,
        );
      }

      return [];
    }

    const options = collectOptions(children);

    return (
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
  SelectTrigger: ({ children, ...props }: ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  SelectValue: () => null,
  SelectIcon: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="select-content">{children}</div>
  ),
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

describe("PublicListingsControls", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("updates the URL immediately when a filter changes", () => {
    render(
      <PublicListingsControls
        query={{
          status: "scheduled",
          q: "camera",
          category: null,
          price: null,
          sort: "newest",
          page: 2,
          pageSize: 12,
        }}
      />,
    );

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "electronics" },
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/listings?status=scheduled&q=camera&category=electronics&pageSize=12",
    );
  });

  it("resets category, price, and sort while preserving status, q, and pageSize", () => {
    render(
      <PublicListingsControls
        query={{
          status: "ended",
          q: "desk",
          category: "home_garden",
          price: "lt_100",
          sort: "price_desc",
          page: 3,
          pageSize: 24,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(mockPush).toHaveBeenCalledWith(
      "/listings?status=ended&q=desk&pageSize=24",
    );
  });
});
