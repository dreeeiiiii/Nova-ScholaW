import { v2 as cloudinary } from "cloudinary";
import config from "./env.js";

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export async function uploadBuffer(buffer, { folder, resourceType }) {
  const isTest = config.nodeEnv === 'test' || process.env.NODE_ENV === 'test';
  if (isTest) {
    const fakeId = `${folder}/test-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return {
      secure_url: `https://res.cloudinary.com/${config.cloudinaryCloudName}/${resourceType}/upload/${fakeId}.jpg`,
      public_id: fakeId,
    };
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error('[cloudinary] upload failed:', {
            folder,
            resourceType,
            message: error.message,
            http_code: error.http_code,
            name: error.name,
          });
          return reject(error);
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(public_id, resourceType) {
  const isTest = config.nodeEnv === 'test' || process.env.NODE_ENV === 'test';
  if (isTest) {
    return;
  }
  const result = await cloudinary.uploader.destroy(public_id, { resource_type: resourceType });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Failed to delete Cloudinary asset ${public_id}: ${result.result}`);
  }
}
