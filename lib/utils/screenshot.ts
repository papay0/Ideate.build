import { toPng } from "html-to-image";
import JSZip from "jszip";

export interface CaptureOptions {
  scale?: number; // Default 2 for retina
  backgroundColor?: string;
}

/**
 * Capture a DOM element as a PNG blob
 */
export async function captureElement(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<Blob> {
  const { scale = 2, backgroundColor } = options;

  // Small delay to ensure styles (especially Tailwind CDN) are fully rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    backgroundColor,
    cacheBust: true,
  });

  // Convert data URL to blob
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download multiple blobs as a ZIP file
 */
export async function downloadAsZip(
  files: { blob: Blob; filename: string }[],
  zipFilename: string
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.filename, file.blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, zipFilename);
}

/**
 * Combine multiple image blobs into a single horizontal image
 */
export async function combineImagesHorizontally(
  blobs: Blob[],
  gap: number = 40,
  backgroundColor: string = "transparent"
): Promise<Blob> {
  // Load all images
  const images = await Promise.all(
    blobs.map((blob) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    })
  );

  // Calculate canvas dimensions
  const totalWidth =
    images.reduce((sum, img) => sum + img.width, 0) + gap * (images.length - 1);
  const maxHeight = Math.max(...images.map((img) => img.height));

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = maxHeight;
  const ctx = canvas.getContext("2d")!;

  // Fill background if not transparent
  if (backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalWidth, maxHeight);
  }

  // Draw images
  let x = 0;
  for (const img of images) {
    // Center vertically
    const y = (maxHeight - img.height) / 2;
    ctx.drawImage(img, x, y);
    x += img.width + gap;
    // Clean up object URL
    URL.revokeObjectURL(img.src);
  }

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create blob from canvas"));
      }
    }, "image/png");
  });
}

/**
 * Convert screen name to a safe filename
 */
export function toScreenFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ".png"
  );
}
