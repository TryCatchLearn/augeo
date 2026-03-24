"use client";

export type UploadSignatureResponse = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

export async function requestListingImageUploadSignature() {
  const signatureResponse = await fetch("/api/upload-signature", {
    method: "POST",
  });

  if (!signatureResponse.ok) {
    throw new Error("Unable to prepare the image upload.");
  }

  return (await signatureResponse.json()) as UploadSignatureResponse;
}

export async function uploadListingImageToCloudinary(
  file: File,
  signedParams: UploadSignatureResponse,
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
