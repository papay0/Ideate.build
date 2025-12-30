"use client";

import { ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  onImageClick?: (url: string) => void;
  maxWidth?: string;
}

/**
 * Adaptive image gallery that adjusts layout based on image count:
 * - 1 image: Single image
 * - 2 images: Side by side
 * - 3 images: 2 on top, 1 spanning bottom
 * - 4 images: 2x2 grid
 * - 5 images: 2 on top, 3 on bottom
 */
export function ImageGallery({
  images,
  onImageClick,
  maxWidth = "max-w-[280px]",
}: ImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const count = images.length;

  // Single image
  if (count === 1) {
    return (
      <GalleryImage
        src={images[0]}
        onClick={() => onImageClick?.(images[0])}
        className="max-w-[200px] max-h-[200px] rounded-xl"
      />
    );
  }

  // 2 images: side by side
  if (count === 2) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${maxWidth}`}>
        {images.map((src, i) => (
          <GalleryImage
            key={i}
            src={src}
            onClick={() => onImageClick?.(src)}
            className="aspect-square rounded-lg"
          />
        ))}
      </div>
    );
  }

  // 3 images: 2 top, 1 spanning bottom
  if (count === 3) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${maxWidth}`}>
        <GalleryImage
          src={images[0]}
          onClick={() => onImageClick?.(images[0])}
          className="aspect-square rounded-tl-xl rounded-bl-none"
        />
        <GalleryImage
          src={images[1]}
          onClick={() => onImageClick?.(images[1])}
          className="aspect-square rounded-tr-xl rounded-br-none"
        />
        <GalleryImage
          src={images[2]}
          onClick={() => onImageClick?.(images[2])}
          className="col-span-2 aspect-[2/1] rounded-b-xl rounded-t-none"
        />
      </div>
    );
  }

  // 4 images: 2x2 grid
  if (count === 4) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${maxWidth}`}>
        {images.map((src, i) => (
          <GalleryImage
            key={i}
            src={src}
            onClick={() => onImageClick?.(src)}
            className={`aspect-square ${getCornerRadius(i, 4)}`}
          />
        ))}
      </div>
    );
  }

  // 5 images: 2 top, 3 bottom
  return (
    <div className={`grid grid-cols-6 gap-1 ${maxWidth}`}>
      {/* Top row: 2 images, each spanning 3 columns */}
      <GalleryImage
        src={images[0]}
        onClick={() => onImageClick?.(images[0])}
        className="col-span-3 aspect-square rounded-tl-xl"
      />
      <GalleryImage
        src={images[1]}
        onClick={() => onImageClick?.(images[1])}
        className="col-span-3 aspect-square rounded-tr-xl"
      />
      {/* Bottom row: 3 images, each spanning 2 columns */}
      <GalleryImage
        src={images[2]}
        onClick={() => onImageClick?.(images[2])}
        className="col-span-2 aspect-square rounded-bl-xl"
      />
      <GalleryImage
        src={images[3]}
        onClick={() => onImageClick?.(images[3])}
        className="col-span-2 aspect-square"
      />
      <GalleryImage
        src={images[4]}
        onClick={() => onImageClick?.(images[4])}
        className="col-span-2 aspect-square rounded-br-xl"
      />
    </div>
  );
}

// Helper for 2x2 grid corner rounding
function getCornerRadius(index: number, total: number): string {
  if (total !== 4) return "rounded-lg";
  switch (index) {
    case 0:
      return "rounded-tl-xl";
    case 1:
      return "rounded-tr-xl";
    case 2:
      return "rounded-bl-xl";
    case 3:
      return "rounded-br-xl";
    default:
      return "";
  }
}

// Individual gallery image with hover effect
function GalleryImage({
  src,
  onClick,
  className = "",
}: {
  src: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative group cursor-zoom-in overflow-hidden ${className}`}
      type="button"
    >
      <img
        src={src}
        alt="Reference image"
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <ZoomIn className="w-5 h-5 text-white drop-shadow-lg" />
      </div>
    </button>
  );
}
