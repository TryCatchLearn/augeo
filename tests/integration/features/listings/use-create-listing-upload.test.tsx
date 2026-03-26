import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateListingUpload } from "@/features/listings/hooks/use-create-listing-upload";

const hoisted = vi.hoisted(() => ({
  createDraftFromFirstUploadAction: vi.fn(),
  uploadImage: vi.fn(),
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

vi.mock("@/features/listings/hooks/use-listing-image-upload", () => ({
  useListingImageUpload: () => ({
    uploadImage: hoisted.uploadImage,
  }),
}));

function HookHarness() {
  const state = useCreateListingUpload();

  return (
    <div>
      <p>{state.statusLabel}</p>
      {state.previewUrl ? <p>{state.previewUrl}</p> : null}
      {state.errorMessage ? <p role="alert">{state.errorMessage}</p> : null}
      <button type="button" onClick={() => state.handleContinue()}>
        Continue
      </button>
      <button type="button" onClick={() => state.handleContinueWithoutAi()}>
        Continue without AI
      </button>
      <button
        type="button"
        onClick={() =>
          state.handleFileSelection(
            new File(["cover"], "camera.jpg", { type: "image/jpeg" }),
          )
        }
      >
        Select
      </button>
      <button type="button" onClick={() => state.handleFileSelection(null)}>
        Clear
      </button>
    </div>
  );
}

describe("useCreateListingUpload", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    hoisted.createDraftFromFirstUploadAction.mockReset();
    hoisted.uploadImage.mockReset();
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

  it("ignores continue when no file is selected", async () => {
    render(<HookHarness />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });

    expect(hoisted.uploadImage).not.toHaveBeenCalled();
    expect(hoisted.createDraftFromFirstUploadAction).not.toHaveBeenCalled();
  });

  it("returns to preview state and shows an error when upload preparation fails", async () => {
    hoisted.uploadImage.mockRejectedValue(
      new Error("Unable to prepare the image upload."),
    );

    render(<HookHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    await waitFor(() => {
      expect(screen.getByText("blob:preview")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to prepare the image upload.",
    );
    expect(
      screen.getByText("First image ready for AI-assisted draft creation."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("reuses the uploaded image for the manual fallback path after AI failure", async () => {
    hoisted.uploadImage.mockResolvedValue({
      public_id: "cloudinary-public-id",
      secure_url: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
    });
    hoisted.createDraftFromFirstUploadAction
      .mockResolvedValueOnce({
        status: "ai_failed",
        errorMessage: "Retry AI or continue without AI.",
      })
      .mockResolvedValueOnce({
        status: "created",
        listingId: "listing-123",
      });

    render(<HookHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Retry AI or continue without AI.",
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue without AI" }),
      );
    });

    expect(hoisted.uploadImage).toHaveBeenCalledTimes(1);
    expect(hoisted.createDraftFromFirstUploadAction).toHaveBeenNthCalledWith(
      1,
      {
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        creationMode: "ai",
      },
    );
    expect(hoisted.createDraftFromFirstUploadAction).toHaveBeenNthCalledWith(
      2,
      {
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        creationMode: "manual",
      },
    );
    expect(push).toHaveBeenCalledWith("/listings/listing-123");
  });
});
