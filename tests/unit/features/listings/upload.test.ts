import { describe, expect, it, vi } from "vitest";
import { uploadListingImageToCloudinary } from "@/features/listings/hooks/use-listing-image-upload";

vi.mock("@/features/listings/actions", () => ({
  createListingImageUploadSignatureAction: vi.fn(),
}));

describe("listing upload helpers", () => {
  it("ignores non-computable progress events and resolves successful uploads", async () => {
    class SuccessXMLHttpRequest {
      responseType = "";
      response = {
        public_id: "cloudinary-public-id",
        secure_url: "https://res.cloudinary.com/demo/image/upload/detail.jpg",
      };
      status = 200;
      upload = {
        addEventListener: vi.fn((event: string, callback: EventListener) => {
          if (event === "progress") {
            callback({
              lengthComputable: false,
              loaded: 0,
              total: 0,
            } as unknown as Event);
            callback({
              lengthComputable: true,
              loaded: 25,
              total: 100,
            } as unknown as Event);
          }
        }),
      };

      private listeners = new Map<string, EventListener>();

      open() {}

      addEventListener(event: string, callback: EventListener) {
        this.listeners.set(event, callback);
      }

      send() {
        this.listeners.get("load")?.({} as Event);
      }
    }

    vi.stubGlobal(
      "XMLHttpRequest",
      SuccessXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );
    const onProgress = vi.fn();

    await expect(
      uploadListingImageToCloudinary(
        new File(["detail"], "detail.jpg", { type: "image/jpeg" }),
        {
          cloudName: "demo-cloud",
          apiKey: "demo-key",
          folder: "augeo/listings",
          timestamp: 1763611200,
          signature: "signed-payload",
        },
        onProgress,
      ),
    ).resolves.toEqual({
      public_id: "cloudinary-public-id",
      secure_url: "https://res.cloudinary.com/demo/image/upload/detail.jpg",
    });

    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it("rejects non-2xx upload responses", async () => {
    class FailureXMLHttpRequest {
      responseType = "";
      response = {};
      status = 500;
      upload = {
        addEventListener: vi.fn(),
      };

      private listeners = new Map<string, EventListener>();

      open() {}

      addEventListener(event: string, callback: EventListener) {
        this.listeners.set(event, callback);
      }

      send() {
        this.listeners.get("load")?.({} as Event);
      }
    }

    vi.stubGlobal(
      "XMLHttpRequest",
      FailureXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );

    await expect(
      uploadListingImageToCloudinary(
        new File(["detail"], "detail.jpg", { type: "image/jpeg" }),
        {
          cloudName: "demo-cloud",
          apiKey: "demo-key",
          folder: "augeo/listings",
          timestamp: 1763611200,
          signature: "signed-payload",
        },
        vi.fn(),
      ),
    ).rejects.toThrow("Image upload failed.");
  });

  it("rejects upload network errors", async () => {
    class ErrorXMLHttpRequest {
      responseType = "";
      response = {};
      status = 0;
      upload = {
        addEventListener: vi.fn(),
      };

      private listeners = new Map<string, EventListener>();

      open() {}

      addEventListener(event: string, callback: EventListener) {
        this.listeners.set(event, callback);
      }

      send() {
        this.listeners.get("error")?.({} as Event);
      }
    }

    vi.stubGlobal(
      "XMLHttpRequest",
      ErrorXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );

    await expect(
      uploadListingImageToCloudinary(
        new File(["detail"], "detail.jpg", { type: "image/jpeg" }),
        {
          cloudName: "demo-cloud",
          apiKey: "demo-key",
          folder: "augeo/listings",
          timestamp: 1763611200,
          signature: "signed-payload",
        },
        vi.fn(),
      ),
    ).rejects.toThrow("Image upload failed.");
  });
});
