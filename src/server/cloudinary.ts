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

export async function deleteCloudinaryAssets(publicIds: string[]) {
  if (!publicIds.length) {
    return;
  }

  const { v2: cloudinary } = await import("cloudinary");
  const config = getCloudinaryConfig();

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  await cloudinary.api.delete_resources(publicIds, {
    resource_type: "image",
    type: "upload",
  });
}
