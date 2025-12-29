"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "Image preview", onClose }: ImageLightboxProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (src) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-[90vw] max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </motion.div>

          {/* Hint text */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Esc</kbd> or click outside to close
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Clickable image thumbnail component
interface ClickableImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick: () => void;
}

export function ClickableImage({ src, alt = "Image", className = "", onClick }: ClickableImageProps) {
  return (
    <button
      onClick={onClick}
      className={`relative group cursor-zoom-in inline-flex ${className}`}
      type="button"
    >
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
      {/* Hover overlay with zoom icon */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
        <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
      </div>
    </button>
  );
}
