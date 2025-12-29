"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import {
  validateImage,
  uploadImage,
  createPreviewUrl,
  revokePreviewUrl,
} from "@/lib/upload/image-upload";

interface ImageUploadButtonProps {
  userId: string;
  projectId: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  currentImageUrl: string | null;
  disabled?: boolean;
}

export function ImageUploadButton({
  userId,
  projectId,
  onImageUploaded,
  onImageRemoved,
  currentImageUrl,
  disabled = false,
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError.message);
      return;
    }

    // Show preview immediately
    const preview = createPreviewUrl(file);
    setPreviewUrl(preview);

    // Upload
    setIsUploading(true);
    try {
      const result = await uploadImage(file, userId, projectId);
      onImageUploaded(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      revokePreviewUrl(preview);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    onImageRemoved();
    setError(null);
  };

  const displayUrl = currentImageUrl || previewUrl;

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {displayUrl ? (
        // Image preview - elegant thumbnail with ring
        <div className="relative inline-block group">
          <div className="relative">
            <img
              src={displayUrl}
              alt="Upload preview"
              className="w-9 h-9 object-cover rounded-xl ring-2 ring-[#B8956F]/20 shadow-sm"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-[#B8956F]/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>
          {!isUploading && (
            <button
              onClick={handleRemove}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#9A9A9A] rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm ring-1 ring-[#E8E4E0] opacity-0 group-hover:opacity-100"
              title="Remove image"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        // Upload button - clean minimal icon
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#9A9A9A] hover:text-[#B8956F] hover:bg-[#B8956F]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 group"
          title="Attach image (auto-compressed if needed)"
          type="button"
        >
          {isUploading ? (
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
          ) : (
            <ImagePlus className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap z-10 bg-white px-2 py-1 rounded shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
