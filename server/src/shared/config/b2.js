import { randomBytes } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from './env.js';

const s3 = new S3Client({
  endpoint: `https://${config.b2Endpoint}`,
  region: config.b2Region,
  credentials: {
    accessKeyId: config.b2KeyId,
    secretAccessKey: config.b2ApplicationKey,
  },
  forcePathStyle: true,
});

const sanitizeFilename = (filename) => {
  const base = String(filename ?? 'file').split('/').pop().split('\\').pop();
  const collapsed = base.replace(/\s+/g, '-');
  const asciiOnly = collapsed.replace(/[^\x20-\x7E]/g, '');
  const cleaned = asciiOnly.replace(/[^a-zA-Z0-9._-]/g, '');
  const lower = cleaned.toLowerCase() || 'file';
  return lower;
};

export async function uploadBuffer(buffer, { folder, contentType, filename }) {
  const safeFilename = sanitizeFilename(filename);
  const key = `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}-${safeFilename}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.b2BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return { key, size: buffer.length, contentType };
  } catch (error) {
    console.error('[b2] upload failed:', {
      folder,
      contentType,
      http_code: error.$metadata?.httpStatusCode,
    });
    throw error;
  }
}

export async function deleteObject(key) {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.b2BucketName,
        Key: key,
      })
    );
  } catch (error) {
    console.error('[b2] delete failed:', {
      http_code: error.$metadata?.httpStatusCode,
    });
    throw new Error('Failed to delete B2 object');
  }
}

export async function getPresignedUrl(key, expiresIn = config.b2PresignExpirySeconds) {
  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: config.b2BucketName,
        Key: key,
      }),
      { expiresIn }
    );
  } catch (error) {
    console.error('[b2] presign GET failed:', {
      expiresIn,
    });
    throw error;
  }
}

export async function getPresignedUploadUrl(key, contentType, expiresIn = config.b2PresignExpirySeconds) {
  try {
    return await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: config.b2BucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn }
    );
  } catch (error) {
    console.error('[b2] presign PUT failed:', {
      contentType,
      expiresIn,
    });
    throw error;
  }
}
