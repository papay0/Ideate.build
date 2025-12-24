/**
 * Image Proxy API
 *
 * Proxies image requests to Pexels API for contextually relevant stock photos.
 * Usage: /api/image?q=dog,puppy&w=200&h=300
 *
 * This allows AI-generated designs to reference images directly without post-processing.
 */

import { NextRequest, NextResponse } from "next/server";

const PEXELS_API_URL = "https://api.pexels.com/v1/search";

// In-memory cache for image URLs (query -> Pexels image URL)
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface PexelsPhoto {
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

/**
 * Determines orientation based on aspect ratio
 */
function getOrientation(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

/**
 * Select best image size based on requested dimensions
 */
function selectImageSize(photo: PexelsPhoto, width: number): string {
  if (width <= 100) return photo.src.tiny;
  if (width <= 200) return photo.src.small;
  if (width <= 400) return photo.src.medium;
  if (width <= 1000) return photo.src.large;
  return photo.src.large2x;
}

/**
 * Generate fallback picsum URL
 */
function getFallbackUrl(query: string, width: number, height: number): string {
  const seed = query.split(",")[0]?.trim().replace(/\s+/g, "-") || "default";
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const width = parseInt(searchParams.get("w") || "400", 10);
  const height = parseInt(searchParams.get("h") || "300", 10);

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter 'q'" },
      { status: 400 }
    );
  }

  // Validate dimensions
  const safeWidth = Math.min(Math.max(width, 50), 2000);
  const safeHeight = Math.min(Math.max(height, 50), 2000);

  // Create cache key
  const cacheKey = `${query}-${safeWidth}x${safeHeight}`;

  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.redirect(cached.url);
  }

  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn("[Image Proxy] No PEXELS_API_KEY configured, using fallback");
    return NextResponse.redirect(getFallbackUrl(query, safeWidth, safeHeight));
  }

  try {
    const orientation = getOrientation(safeWidth, safeHeight);
    const searchQuery = query.split(",").map((k) => k.trim()).join(" ");

    const url = new URL(PEXELS_API_URL);
    url.searchParams.set("query", searchQuery);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", orientation);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
      // Cache the fetch for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`[Image Proxy] Pexels error: ${response.status}`);
      return NextResponse.redirect(getFallbackUrl(query, safeWidth, safeHeight));
    }

    const data: PexelsResponse = await response.json();

    if (!data.photos || data.photos.length === 0) {
      console.log(`[Image Proxy] No results for "${searchQuery}"`);
      return NextResponse.redirect(getFallbackUrl(query, safeWidth, safeHeight));
    }

    const photo = data.photos[0];
    const imageUrl = selectImageSize(photo, safeWidth);

    // Cache the result
    imageCache.set(cacheKey, { url: imageUrl, timestamp: Date.now() });

    // Redirect to the actual image
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return NextResponse.redirect(getFallbackUrl(query, safeWidth, safeHeight));
  }
}
