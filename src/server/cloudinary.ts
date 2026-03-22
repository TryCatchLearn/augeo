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
