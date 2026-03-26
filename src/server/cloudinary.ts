import { v2 as cloudinary } from "cloudinary";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";

const listingImagesFolderFallback = "augeo/listings";

export function getListingImagesFolder() {
  return getOptionalEnv(
    "CLOUDINARY_LISTING_IMAGES_FOLDER",
    listingImagesFolderFallback,
  );
}

export function getCloudinaryConfig() {
  return {
    cloudName: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: getRequiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: getRequiredEnv("CLOUDINARY_API_SECRET"),
  };
}

function configureCloudinary() {
  const config = getCloudinaryConfig();

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  return config;
}

export type CloudinaryUploadSignature = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

export function createListingImageUploadSignature(
  now = Date.now(),
): CloudinaryUploadSignature {
  const config = configureCloudinary();
  const timestamp = Math.floor(now / 1000);
  const folder = getListingImagesFolder();
  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      timestamp,
    },
    config.apiSecret,
  );

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder,
    timestamp,
    signature,
  };
}

export async function deleteCloudinaryAssets(publicIds: string[]) {
  if (!publicIds.length) {
    return;
  }

  configureCloudinary();

  await cloudinary.api.delete_resources(publicIds, {
    resource_type: "image",
    type: "upload",
  });
}
