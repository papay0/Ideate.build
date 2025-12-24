"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// Base skeleton with shimmer animation
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-[#F5F2EF]",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// Dashboard/Home page skeleton
export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-72 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Prompt Input - Matches new elevated card design */}
      <div className="relative bg-white rounded-3xl mb-8 shadow-[0_4px_24px_-4px_rgba(184,149,111,0.15)] p-6">
        {/* Header with title and platform selector */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>

        {/* Textarea area */}
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />

        {/* Bottom toolbar with separator */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E4E0]/60">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <Skeleton className="h-4 w-44 hidden sm:block" />
          </div>
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <Skeleton className="h-8 w-36 mb-6" />

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E8E4E0] rounded-2xl overflow-hidden"
            >
              {/* Preview area with emoji */}
              <div className="aspect-[4/3] bg-[#F5F2EF] flex items-center justify-center border-b border-[#E8E4E0]">
                <Skeleton className="w-16 h-16 rounded-2xl" />
              </div>
              {/* Content */}
              <div className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Project detail page skeleton - Desktop version
function ProjectSkeletonDesktop() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#E8E4E0] bg-white">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="w-1/3 min-w-[320px] max-w-[480px] flex flex-col border-r border-[#E8E4E0] bg-white">
          {/* Messages area */}
          <div className="flex-1 p-4 space-y-4">
            {/* User message */}
            <div className="flex justify-end">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
            </div>
            {/* Assistant message */}
            <div className="flex">
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            {/* Another user message */}
            <div className="flex justify-end">
              <Skeleton className="h-12 w-2/3 rounded-2xl" />
            </div>
          </div>
          {/* Input area - Matches unified container design */}
          <div className="p-3 border-t border-[#E8E4E0]">
            <div className="bg-[#F5F2EF] rounded-2xl border border-[#E8E4E0] p-2">
              <div className="flex items-end gap-2">
                <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Canvas */}
        <div className="flex-1 bg-[#FAF8F5] flex items-center justify-center p-8">
          <div className="flex gap-16">
            {/* Phone mockup skeleton */}
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-[200px] h-[420px] rounded-[2.5rem]" />
              <Skeleton className="h-5 w-24" />
            </div>
            {/* Another phone mockup skeleton */}
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-[200px] h-[420px] rounded-[2.5rem]" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project detail page skeleton - Mobile version
function ProjectSkeletonMobile() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header - Compact */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#E8E4E0] bg-white">
        <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Segmented Control */}
      <div className="px-4 py-3 border-b border-[#E8E4E0] bg-white">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Chat Content - Full width */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Messages area */}
        <div className="flex-1 p-4 space-y-4">
          {/* User message */}
          <div className="flex justify-end">
            <Skeleton className="h-16 w-4/5 rounded-2xl" />
          </div>
          {/* Assistant message */}
          <div className="flex">
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          {/* Another user message */}
          <div className="flex justify-end">
            <Skeleton className="h-12 w-3/4 rounded-2xl" />
          </div>
          {/* Another assistant message */}
          <div className="flex">
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
        {/* Input area */}
        <div className="p-3 border-t border-[#E8E4E0]">
          <div className="bg-[#F5F2EF] rounded-2xl border border-[#E8E4E0] p-2">
            <div className="flex items-end gap-2">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project detail page skeleton - Responsive
export function ProjectSkeleton() {
  return (
    <>
      {/* Desktop skeleton - hidden on mobile */}
      <div className="hidden md:block h-screen">
        <ProjectSkeletonDesktop />
      </div>
      {/* Mobile skeleton - hidden on desktop */}
      <div className="block md:hidden h-screen">
        <ProjectSkeletonMobile />
      </div>
    </>
  );
}
