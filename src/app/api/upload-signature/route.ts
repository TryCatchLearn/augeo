import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  getCloudinaryConfig,
  getListingImagesFolder,
} from "@/server/cloudinary";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const folder = getListingImagesFolder();
  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      timestamp,
    },
    config.apiSecret,
  );

  return NextResponse.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder,
    timestamp,
    signature,
  });
}
