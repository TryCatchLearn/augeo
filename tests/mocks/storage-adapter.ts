import { randomUUID } from "node:crypto";
import type {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from "@/features/shared/storage/storage-adapter";

export class MockStorageAdapter implements StorageAdapter {
  uploads: StorageUploadInput[] = [];
  deletedPublicIds: string[] = [];

  async uploadListingImage(
    input: StorageUploadInput,
  ): Promise<StorageUploadResult> {
    this.uploads.push(input);

    return {
      publicId: `mock-${randomUUID()}`,
      url: `https://example.test/${input.folder}/${input.fileName}`,
    };
  }

  async deleteAsset(publicId: string) {
    this.deletedPublicIds.push(publicId);
  }
}
