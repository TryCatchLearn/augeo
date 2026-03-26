"use client";

import { createListingImageUploadSignatureAction } from "@/features/listings/actions";
import type { CloudinaryUploadSignature } from "@/server/cloudinary";

export async function uploadListingImageToCloudinary(
  file: File,
  signedParams: CloudinaryUploadSignature,
  onProgress: (percent: number) => void,
) {
  const formData = new FormData();

  formData.set("file", file);
  formData.set("api_key", signedParams.apiKey);
  formData.set("folder", signedParams.folder);
  formData.set("signature", signedParams.signature);
  formData.set("timestamp", String(signedParams.timestamp));

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signedParams.cloudName}/image/upload`;

  return new Promise<{ public_id: string; secure_url: string }>(
    (resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("POST", cloudinaryUrl);
      request.responseType = "json";

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress(Math.round((event.loaded / event.total) * 100));
      });

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.response);
          return;
        }

        reject(new Error("Image upload failed."));
      });

      request.addEventListener("error", () => {
        reject(new Error("Image upload failed."));
      });

      request.send(formData);
    },
  );
}

export function useListingImageUpload() {
  async function uploadImage(
    file: File,
    onProgress: (percent: number) => void,
  ) {
    const signedParams = await createListingImageUploadSignatureAction();

    return uploadListingImageToCloudinary(file, signedParams, onProgress);
  }

  return {
    uploadImage,
  };
}
