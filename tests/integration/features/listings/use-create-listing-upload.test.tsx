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
  requestListingImageUploadSignature: vi.fn(),
  uploadListingImageToCloudinary: vi.fn(),
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

vi.mock("@/features/listings/upload", () => ({
  requestListingImageUploadSignature:
    hoisted.requestListingImageUploadSignature,
  uploadListingImageToCloudinary: hoisted.uploadListingImageToCloudinary,
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
    hoisted.requestListingImageUploadSignature.mockReset();
    hoisted.uploadListingImageToCloudinary.mockReset();
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

    expect(hoisted.requestListingImageUploadSignature).not.toHaveBeenCalled();
    expect(hoisted.uploadListingImageToCloudinary).not.toHaveBeenCalled();
    expect(hoisted.createDraftFromFirstUploadAction).not.toHaveBeenCalled();
  });

  it("returns to preview state and shows an error when upload preparation fails", async () => {
    hoisted.requestListingImageUploadSignature.mockRejectedValue(
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
      screen.getByText("First image ready to become your draft cover photo."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
