import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateListingUpload } from "@/features/listings/components/create-listing-upload";

const hoisted = vi.hoisted(() => ({
  createDraftFromFirstUploadAction: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push,
      refresh,
    }),
  };
});

vi.mock("@/features/listings/actions", () => ({
  createDraftFromFirstUploadAction: hoisted.createDraftFromFirstUploadAction,
}));

class MockXMLHttpRequest {
  static response = {
    public_id: "cloudinary-public-id",
    secure_url: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
  };

  static status = 200;

  method = "";
  url = "";
  responseType = "";
  response = MockXMLHttpRequest.response;
  status = MockXMLHttpRequest.status;
  upload = {
    addEventListener: vi.fn((event: string, callback: EventListener) => {
      if (event === "progress") {
        callback({
          lengthComputable: true,
          loaded: 50,
          total: 100,
        } as unknown as Event);
      }
    }),
  };

  private listeners = new Map<string, EventListener>();

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  addEventListener(event: string, callback: EventListener) {
    this.listeners.set(event, callback);
  }

  send() {
    this.listeners.get("load")?.({} as Event);
  }
}

describe("CreateListingUpload", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    hoisted.createDraftFromFirstUploadAction.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("supports the preview and cancel states before upload starts", async () => {
    render(<CreateListingUpload />);

    const input = screen.getByLabelText("Drop your first photo here", {
      selector: "input",
    });
    const file = new File(["preview"], "preview.jpg", { type: "image/jpeg" });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    expect(
      await screen.findByAltText("Selected listing preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Drop your first photo here")).toBeInTheDocument();
  });

  it("uploads the first image, creates a draft, and redirects to the detail page", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cloudName: "demo-cloud",
        apiKey: "demo-key",
        folder: "augeo/listings",
        timestamp: 1763611200,
        signature: "signed-payload",
      }),
    } as Response);
    hoisted.createDraftFromFirstUploadAction.mockResolvedValue({
      listingId: "listing-123",
    });

    render(<CreateListingUpload />);

    const input = screen.getByLabelText("Drop your first photo here", {
      selector: "input",
    });
    const file = new File(["create"], "camera.jpg", { type: "image/jpeg" });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/listings/listing-123");
    });

    expect(refresh).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/upload-signature",
      expect.objectContaining({ method: "POST" }),
    );
    expect(hoisted.createDraftFromFirstUploadAction).toHaveBeenCalledWith({
      uploadPublicId: "cloudinary-public-id",
      uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
      seed: "camera.jpg:6:cloudinary-public-id",
    });
  });
});
