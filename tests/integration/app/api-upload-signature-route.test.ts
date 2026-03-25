import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  apiSignRequest: vi.fn(() => "signed-demo-payload"),
}));

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      getSession: hoisted.getSession,
    },
  },
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    utils: {
      api_sign_request: hoisted.apiSignRequest,
    },
  },
}));

vi.mock("@/server/cloudinary", () => ({
  getCloudinaryConfig: () => ({
    cloudName: "demo-cloud",
    apiKey: "demo-key",
    apiSecret: "demo-secret",
  }),
  getListingImagesFolder: () => "augeo/listings",
}));

describe("POST /api/upload-signature", () => {
  it("rejects unauthenticated requests", async () => {
    hoisted.getSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/upload-signature/route");
    const response = await POST(
      new Request("http://localhost/api/upload-signature", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns signed upload parameters for authenticated requests", async () => {
    hoisted.getSession.mockResolvedValue({
      user: { id: "seller-1" },
      session: { id: "session-1" },
    });

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1763611200000);

    try {
      const { POST } = await import("@/app/api/upload-signature/route");
      const response = await POST(
        new Request("http://localhost/api/upload-signature", {
          method: "POST",
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
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
    } finally {
      dateNowSpy.mockRestore();
    }
  });
});
