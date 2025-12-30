"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ImagePlus, X, Loader2, Plus } from "lucide-react";
import {
  validateImage,
  uploadImage,
  createPreviewUrl,
  revokePreviewUrl,
} from "@/lib/upload/image-upload";

export const MAX_IMAGES = 5;

export interface UploadedImage {
  id: string;
  url: string;
  isUploading: boolean;
  previewUrl?: string;
}

interface MultiImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  userId: string;
  projectId: string;
  disabled?: boolean;
  onImageClick?: (index: number) => void;
}

export function MultiImageUpload({
  images,
  onImagesChange,
  maxImages = MAX_IMAGES,
  userId,
  projectId,
  disabled = false,
  onImageClick,
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current images for use in async callbacks
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setError(null);

      // Limit to remaining slots
      const remainingSlots = maxImages - imagesRef.current.length;
      const filesToUpload = files.slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        setError(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} allowed`);
      }

      // Process each file
      for (const file of filesToUpload) {
        const validationError = validateImage(file);
        if (validationError) {
          setError(validationError.message);
          continue;
        }

        const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const previewUrl = createPreviewUrl(file);

        // Add placeholder
        const newImage: UploadedImage = {
          id,
          url: "",
          isUploading: true,
          previewUrl,
        };
        const withPlaceholder = [...imagesRef.current, newImage];
        imagesRef.current = withPlaceholder; // Keep ref in sync to avoid race condition
        onImagesChange(withPlaceholder);

        // Upload
        try {
          const result = await uploadImage(file, userId, projectId);

          // Update with real URL
          const updated = imagesRef.current.map((img) =>
            img.id === id ? { ...img, url: result.url, isUploading: false } : img
          );
          imagesRef.current = updated; // Keep ref in sync
          onImagesChange(updated);
        } catch (err) {
          // Remove failed upload
          const filtered = imagesRef.current.filter((img) => img.id !== id);
          imagesRef.current = filtered; // Keep ref in sync
          onImagesChange(filtered);
          revokePreviewUrl(previewUrl);
          setError(err instanceof Error ? err.message : "Upload failed");
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [maxImages, userId, projectId, onImagesChange]
  );

  const handleRemove = useCallback(
    (imageId: string) => {
      const image = images.find((img) => img.id === imageId);
      if (image?.previewUrl) {
        revokePreviewUrl(image.previewUrl);
      }
      onImagesChange(images.filter((img) => img.id !== imageId));
      setError(null);
    },
    [images, onImagesChange]
  );

  const canAddMore = images.length < maxImages;
  const hasImages = images.length > 0;

  // If no images, show simple upload button
  if (!hasImages) {
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#9A9A9A] hover:text-[#B8956F] hover:bg-[#B8956F]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 group"
          title="Attach images (up to 5)"
          type="button"
        >
          <ImagePlus className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
        </button>
        {error && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap z-10 bg-white px-2 py-1 rounded shadow-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // With images, show thumbnail strip
  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        multiple
      />

      <div className="flex items-center gap-2">
        {/* Thumbnail strip */}
        <div className="flex items-center gap-1.5">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <button
                type="button"
                onClick={() => !image.isUploading && onImageClick?.(index)}
                disabled={image.isUploading}
                className={`relative block ${!image.isUploading && onImageClick ? 'cursor-pointer hover:ring-[#B8956F]/50' : ''}`}
              >
                <img
                  src={image.previewUrl || image.url}
                  alt="Upload preview"
                  className="w-10 h-10 object-cover rounded-xl ring-2 ring-[#B8956F]/20 shadow-sm"
                />
                {image.isUploading && (
                  <div className="absolute inset-0 bg-[#B8956F]/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
              </button>
              {!image.isUploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(image.id); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#9A9A9A] rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm ring-1 ring-[#E8E4E0] opacity-0 group-hover:opacity-100"
                  title="Remove image"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add more button */}
          {canAddMore && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-10 h-10 rounded-xl border-2 border-dashed border-[#D4CFC9] hover:border-[#B8956F] hover:bg-[#B8956F]/5 flex items-center justify-center text-[#9A9A9A] hover:text-[#B8956F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add more images"
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Counter */}
        <span
          className={`text-xs ml-1 ${
            images.length >= maxImages - 1
              ? "text-amber-600"
              : "text-[#9A9A9A]"
          }`}
        >
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap z-10 bg-white px-2 py-1 rounded shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
