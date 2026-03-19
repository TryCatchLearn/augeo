import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders its copy and listings calls to action", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Bid on remarkable pieces without the noise.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Augeo is a simple auction marketplace built to spotlight standout listings/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: "Browse upcoming listings",
      }),
    ).toHaveAttribute("href", "/listings");

    expect(
      screen.getByRole("link", {
        name: "Learn how auctions work",
      }),
    ).toHaveAttribute("href", "/listings");
  });
});
