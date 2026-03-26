// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  deleteResources: vi.fn(),
  config: vi.fn(),
  apiSignRequest: vi.fn(() => "signed-demo-payload"),
}));

vi.mock("cloudinary", () => ({
  v2: {
    api: {
      delete_resources: hoisted.deleteResources,
    },
    config: hoisted.config,
    utils: {
      api_sign_request: hoisted.apiSignRequest,
    },
  },
}));

describe("cloudinary server helpers", () => {
  beforeEach(() => {
    hoisted.deleteResources.mockReset();
    hoisted.config.mockReset();
    hoisted.apiSignRequest.mockReset();
    hoisted.apiSignRequest.mockReturnValue("signed-demo-payload");
    vi.resetModules();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_LISTING_IMAGES_FOLDER;
  });

  it("uses the default listing images folder when none is configured", async () => {
    const { getListingImagesFolder } = await import("@/server/cloudinary");

    expect(getListingImagesFolder()).toBe("augeo/listings");
  });

  it("reads the configured cloudinary environment variables", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "demo-key";
    process.env.CLOUDINARY_API_SECRET = "demo-secret";

    const { getCloudinaryConfig } = await import("@/server/cloudinary");

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      apiSecret: "demo-secret",
    });
  });

  it("returns early when there are no assets to delete", async () => {
    const { deleteCloudinaryAssets } = await import("@/server/cloudinary");

    await expect(deleteCloudinaryAssets([])).resolves.toBeUndefined();

    expect(hoisted.config).not.toHaveBeenCalled();
    expect(hoisted.deleteResources).not.toHaveBeenCalled();
  });

  it("creates signed upload parameters for listing images", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "demo-key";
    process.env.CLOUDINARY_API_SECRET = "demo-secret";

    const { createListingImageUploadSignature } = await import(
      "@/server/cloudinary"
    );

    expect(createListingImageUploadSignature(1763611200000)).toEqual({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "augeo/listings",
      timestamp: 1763611200,
      signature: "signed-demo-payload",
    });
    expect(hoisted.apiSignRequest).toHaveBeenCalledWith(
      {
        folder: "augeo/listings",
        timestamp: 1763611200,
      },
      "demo-secret",
    );
  });

  it("configures cloudinary and deletes uploaded image assets", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "demo-key";
    process.env.CLOUDINARY_API_SECRET = "demo-secret";

    const { deleteCloudinaryAssets } = await import("@/server/cloudinary");

    await deleteCloudinaryAssets(["listing/cover", "listing/detail"]);

    expect(hoisted.config).toHaveBeenCalledWith({
      cloud_name: "demo-cloud",
      api_key: "demo-key",
      api_secret: "demo-secret",
      secure: true,
    });
    expect(hoisted.deleteResources).toHaveBeenCalledWith(
      ["listing/cover", "listing/detail"],
      {
        resource_type: "image",
        type: "upload",
      },
    );
  });
});
