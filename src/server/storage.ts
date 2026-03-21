export type StorageUploadInput = {
  folder: string;
  fileName: string;
  contentType: string;
  data: Uint8Array;
};

export type StorageUploadResult = {
  publicId: string;
  url: string;
};

export interface StorageAdapter {
  uploadListingImage(input: StorageUploadInput): Promise<StorageUploadResult>;
  deleteAsset(publicId: string): Promise<void>;
}
