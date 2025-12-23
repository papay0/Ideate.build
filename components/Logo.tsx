/**
 * OpenDesign Logo Component
 *
 * Reusable logo with consistent branding across the site.
 * Uses the terracotta Layers icon as the primary visual.
 */

import Link from "next/link";
import { Layers } from "lucide-react";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: "w-5 h-5", text: "text-sm" },
  md: { icon: "w-6 h-6", text: "text-base" },
  lg: { icon: "w-8 h-8", text: "text-lg" },
};

export function Logo({
  href = "/",
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const { icon, text } = sizeMap[size];

  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Layers className={`${icon} text-[#B8956F]`} />
      {showText && (
        <span className={`font-medium text-[#1A1A1A] tracking-tight ${text}`}>
          OpenDesign
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
