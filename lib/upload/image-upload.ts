import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

// Max input size (before compression) - generous limit for screenshots
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
// Target size after compression
const TARGET_SIZE_MB = 1.8; // Slightly under 2MB for safety margin

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadError {
  message: string;
  code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "UPLOAD_FAILED";
}

/**
 * Validates an image file before upload
 */
export function validateImage(file: File): UploadError | null {
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      message: `File size must be under ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      code: "FILE_TOO_LARGE",
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      message: "Only JPEG, PNG, GIF, and WebP images are allowed",
      code: "INVALID_TYPE",
    };
  }

  return null;
}

/**
 * Compresses an image to be under 2MB using browser-image-compression
 * Skips compression if already under target size
 */
async function compressImage(file: File): Promise<File> {
  const targetSizeBytes = TARGET_SIZE_MB * 1024 * 1024;

  // Skip compression if already under target
  if (file.size <= targetSizeBytes) {
    return file;
  }

  console.log(
    `[Image Compression] Compressing ${(file.size / 1024 / 1024).toFixed(2)}MB image...`
  );

  const compressedFile = await imageCompression(file, {
    maxSizeMB: TARGET_SIZE_MB,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: "image/webp",
  });

  console.log(
    `[Image Compression] Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
  );

  return compressedFile;
}

/**
 * Uploads an image to Supabase Storage
 * Automatically compresses large images to under 2MB before upload
 * Path format: {userId}/{projectId}/{timestamp}-{random}.{ext}
 */
export async function uploadImage(
  file: File,
  userId: string,
  projectId: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Compress image if needed (will skip if already under 2MB)
  const processedFile = await compressImage(file);

  // Use webp extension if compressed, otherwise keep original
  const wasCompressed = processedFile !== file;
  const ext = wasCompressed ? "webp" : file.name.split(".").pop() || "jpg";

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const path = `${userId}/${projectId}/${timestamp}-${random}.${ext}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(path, processedFile, {
      contentType: wasCompressed ? "image/webp" : file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("uploads")
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Deletes an image from Supabase Storage
 */
export async function deleteImage(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from("uploads").remove([path]);

  if (error) {
    console.error("Failed to delete image:", error);
  }
}

/**
 * Creates a preview URL for a local file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
