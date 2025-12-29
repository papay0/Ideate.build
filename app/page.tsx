"use client";

/**
 * Ideate.build Landing Page
 *
 * Design: Manifesto-Forward Editorial Aesthetic
 *
 * A refined, statement-driven landing page built around the philosophy
 * "Ideate. Build." — two words that say everything. Features elegant
 * typography, generous whitespace, and a warm, sophisticated color palette.
 *
 * Key design principles:
 * - Manifesto over features
 * - Typography as the hero
 * - Every word earns its place
 * - Warm white background with terracotta accent
 * - Generous whitespace
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Github,
  Menu,
  X,
  Check,
  Crown,
  Zap,
  MessageSquare,
  Sparkles,
  Play,
  MousePointerClick,
  Lightbulb,
  Wand2,
  Smartphone,
  Monitor,
  Dumbbell,
  ChefHat,
  Plane,
  Music,
  LucideIcon,
} from "lucide-react";
import { PLANS } from "@/lib/constants/plans";
import { usePendingPrompt } from "@/lib/hooks/usePendingPrompt";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { PlatformSelector } from "@/app/home/components/PlatformSelector";
import { type Platform } from "@/lib/constants/platforms";

// ============================================================================
// Animation Variants
// ============================================================================

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut" as const },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const letterReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ============================================================================
// Data
// ============================================================================

const SUPABASE_ASSETS = "https://xqpuvtopszitdtittjao.supabase.co/storage/v1/object/public/public-assets/images";

const HERO_PHONES = {
  phone1: `${SUPABASE_ASSETS}/hero-phone-1`,
  phone2: `${SUPABASE_ASSETS}/hero-phone-2`,
  phone3: `${SUPABASE_ASSETS}/hero-phone-3`,
};

const COMPARISON_IMAGES = {
  mobile: {
    opendesign: `${SUPABASE_ASSETS}/comparison-mobile-opendesign`,
    v0: `${SUPABASE_ASSETS}/comparison-mobile-v0`,
    lovable: `${SUPABASE_ASSETS}/comparison-mobile-lovable`,
    prompt: "Music streaming app",
  },
  desktop: {
    opendesign: `${SUPABASE_ASSETS}/comparison-desktop-opendesign`,
    v0: `${SUPABASE_ASSETS}/comparison-desktop-v0`,
    lovable: `${SUPABASE_ASSETS}/comparison-desktop-lovable`,
    prompt: "Recipe collection website",
  },
};

const personas = [
  { label: "Founders", description: "Show investors a working prototype, not slides" },
  { label: "Developers", description: "Skip the design phase, start building faster" },
  { label: "Product Managers", description: "Get stakeholder buy-in with real prototypes" },
  { label: "Designers", description: "Explore ideas at the speed of thought" },
  { label: "Hackathon Teams", description: "Ship a polished demo on day one" },
  { label: "Dreamers", description: "Turn any idea into something you can touch" },
];

// Example Prompts with Rich Data
interface ExamplePrompt {
  label: string;
  styleTag: string;
  description: {
    mobile: string;
    desktop: string;
  };
  icon: LucideIcon;
  fullPrompt: {
    mobile: string;
    desktop: string;
  };
}

const examplePrompts: ExamplePrompt[] = [
  {
    label: "Fitness Tracker",
    styleTag: "Warm Gradients",
    description: {
      mobile: "Activity rings, workout cards, progress charts",
      desktop: "Dashboard analytics, workout calendar, progress graphs",
    },
    icon: Dumbbell,
    fullPrompt: {
      mobile: `Personal fitness app. Daily activity rings showing steps, calories burned, and active minutes. Workout history displayed as cards with exercise type icons, duration, and intensity level. Weekly progress line chart with smooth curves. Achievement badges collection and current streak counter with flame icon.

Also create the workout detail screen and profile screen.

Warm gradient aesthetic. Soft coral (#FF8A80) and peach gradients transitioning to warm orange. Large rounded progress indicators with satisfying fill animations. Friendly rounded sans-serif typography. Organic blob shapes in background, motivational quotes section.`,
      desktop: `Personal fitness dashboard website. Hero section with large activity summary showing steps, calories, and active minutes as animated circular progress rings. Left sidebar navigation with user profile avatar. Main content area with workout calendar view showing completed workouts as colored dots. Detailed analytics section with line charts for weekly/monthly trends. Workout library displayed as a filterable grid of exercise cards with hover effects.

Also create the workout detail page and settings page.

Warm gradient aesthetic. Soft coral (#FF8A80) and peach gradients transitioning to warm orange. Large data visualizations with smooth animations. Clean sans-serif typography with generous spacing. Subtle grid background pattern, motivational banner section with gradient overlay.`,
    },
  },
  {
    label: "Recipe Collection",
    styleTag: "Editorial",
    description: {
      mobile: "Ingredient cards, cooking mode, favorites",
      desktop: "Recipe grid, cooking instructions, meal planning",
    },
    icon: ChefHat,
    fullPrompt: {
      mobile: `Recipe collection app. Featured recipe hero section with beautiful food photography placeholder and cooking time badge. Ingredient list with quantity badges and checkable items. Step-by-step cooking mode with large readable text, timer widget, and progress indicator. Favorites collection organized in category tabs.

Also create the cooking mode screen and shopping list screen.

Editorial magazine aesthetic. Warm cream (#FFF8F0) and terracotta (#C17C60) palette. Elegant serif typography for headings, clean sans-serif for body. Card layouts with generous whitespace and subtle shadows. Sophisticated food photography placeholders with rounded corners.`,
      desktop: `Recipe collection website. Full-width hero with featured recipe of the day, large food photography placeholder, and elegant overlay text. Navigation bar with category dropdown menus. Main content as a Pinterest-style masonry grid of recipe cards with hover zoom effect. Sidebar with popular tags, cooking time filters, and difficulty levels. Recipe detail layout with two-column design: left side for step-by-step instructions with numbered steps, right side for ingredient checklist with serving size adjuster.

Also create the meal planner page and shopping list page.

Editorial magazine aesthetic. Warm cream (#FFF8F0) and terracotta (#C17C60) palette. Elegant serif typography for headings, clean sans-serif for body. Card layouts with generous whitespace and subtle drop shadows. Sophisticated food photography placeholders with rounded corners. Print-friendly recipe view option.`,
    },
  },
  {
    label: "Travel Planner",
    styleTag: "Wanderlust",
    description: {
      mobile: "Trip cards, itinerary timeline, packing lists",
      desktop: "Trip dashboard, interactive map, booking management",
    },
    icon: Plane,
    fullPrompt: {
      mobile: `Trip planning app. Upcoming trips as cards with destination cover photos, countdown timer, and date range. Day-by-day itinerary displayed as vertical timeline with location pins, time slots, and activity icons. Packing checklist with categorized expandable sections. Budget tracker showing expense breakdown in a donut chart with category colors.

Also create the day detail screen and expense logging screen.

Vibrant wanderlust aesthetic. Ocean teal (#0097A7) and sunset coral (#FF7043) as primary colors. Polaroid-style photo frames with slight rotation. Handwritten accent font for headings. Map markers, dotted path lines connecting destinations, adventure-themed iconography.`,
      desktop: `Trip planning website. Dashboard with upcoming trips as large cards with destination cover photos, countdown timers, and quick action buttons. Main trip view with split layout: left panel showing day-by-day itinerary as an interactive timeline, right panel with embedded map showing all locations with connected route lines. Top navigation with trip switcher dropdown. Budget section with expense table, category breakdown charts, and currency converter. Accommodation and flight booking cards with confirmation details.

Also create the explore destinations page and trip sharing page.

Vibrant wanderlust aesthetic. Ocean teal (#0097A7) and sunset coral (#FF7043) as primary colors. Large hero images with parallax scrolling effect. Handwritten accent font for headings. Interactive map with custom styled markers, dotted path animations connecting destinations, adventure-themed iconography throughout.`,
    },
  },
  {
    label: "Music Player",
    styleTag: "Dark Neon",
    description: {
      mobile: "Now playing, visualizer, playlist grid",
      desktop: "Full player, library browser, queue management",
    },
    icon: Music,
    fullPrompt: {
      mobile: `Music streaming app. Now playing screen featuring large album artwork with reflection effect, playback controls with scrubber, and like/shuffle/repeat buttons. Audio waveform visualizer bars animating with the beat. Up next queue as draggable list items. Playlist library displayed as a masonry grid of album art cards.

Also create the library browse screen and search screen.

Dark mode with neon accents. Deep charcoal (#1A1A2E) background with electric purple (#9D4EDD) and hot pink (#FF006E) gradient accents. Glassmorphic player controls with blur backdrop. Subtle glow effects on active elements. Bold geometric sans-serif typography with high contrast.`,
      desktop: `Music streaming website. Three-column layout: left sidebar with navigation and playlists, center main content area, right sidebar with queue and lyrics. Now playing bar fixed at bottom with album art thumbnail, track info, playback controls, progress bar, and volume slider. Main view showing artist page with large header image, bio section, popular tracks table with hover play buttons, albums grid, and related artists. Library view with filterable/sortable table of saved tracks.

Also create the playlist detail page and search results page.

Dark mode with neon accents. Deep charcoal (#1A1A2E) background with electric purple (#9D4EDD) and hot pink (#FF006E) gradient accents. Glassmorphic panels with blur backdrop. Subtle glow effects on interactive elements. Audio waveform visualizer in now playing bar. Bold geometric sans-serif typography with high contrast. Smooth hover transitions throughout.`,
    },
  },
];

// ============================================================================
// Hero Phone Mockups
// ============================================================================

function HeroPhoneMockup({
  image,
  delay,
  className,
  rotation = 0,
  translateY = 0,
  isHero = false,
  onClick,
}: {
  image: string;
  delay: number;
  className?: string;
  rotation?: number;
  translateY?: number;
  isHero?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.85, rotate: rotation - 5 }}
      animate={{
        opacity: 1,
        y: translateY,
        scale: 1,
        rotate: rotation,
      }}
      transition={{
        duration: 1,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.03,
        y: translateY - 8,
        transition: { duration: 0.3 }
      }}
      className={`relative cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Layered shadow for depth */}
      <div
        className="absolute inset-0 rounded-[1.5rem] opacity-20"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
          transform: 'translateY(20px) translateX(10px) scale(0.95)',
          filter: 'blur(20px)',
        }}
      />

      {/* Phone Frame */}
      <div
        className={`relative bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] rounded-[1.5rem] p-[3px] ${
          isHero
            ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)]'
            : 'shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]'
        }`}
      >
        {/* Subtle highlight on bezel */}
        <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

        {/* Screen */}
        <div className="relative bg-[#FAF8F5] rounded-[1.35rem] overflow-hidden aspect-[390/844]">
          <img
            src={image}
            alt="Generated prototype"
            className="w-full h-full object-cover object-top"
          />
          {/* Screen glare effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </motion.div>
  );
}

function HeroPhoneMockups() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const heroImages = [
    { src: HERO_PHONES.phone2, label: "Travel App" },
    { src: HERO_PHONES.phone3, label: "Finance App" },
  ];

  return (
    <div className="relative w-full h-[420px] lg:h-[480px]">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ComparisonLightbox
          images={heroImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Ambient glow - warm, positioned behind phones */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-[100px] opacity-20 bg-gradient-to-br from-[#B8956F] via-[#D4B896] to-[#E8D4C4] rounded-full pointer-events-none" />

      {/* Secondary subtle glow */}
      <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] blur-[80px] opacity-10 bg-[#B8956F] rounded-full pointer-events-none" />

      {/* Phone composition - editorial overlap */}
      <div className="relative w-full h-full flex items-center justify-center">

        {/* Back phone - Finance (peek from behind right) */}
        <div className="absolute right-0 lg:right-4 top-1/2 -translate-y-1/2">
          <HeroPhoneMockup
            image={HERO_PHONES.phone3}
            delay={0.7}
            rotation={12}
            translateY={20}
            className="w-32 lg:w-40"
            onClick={() => setLightboxIndex(1)}
          />
        </div>

        {/* Hero phone - Travel (front and center-left) */}
        <div className="absolute left-1/2 -translate-x-[65%] lg:-translate-x-[60%] top-1/2 -translate-y-1/2 z-10">
          <HeroPhoneMockup
            image={HERO_PHONES.phone2}
            delay={0.5}
            rotation={-3}
            translateY={0}
            isHero
            className="w-40 lg:w-52"
            onClick={() => setLightboxIndex(0)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 border-b border-[#E8E4E0]">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-serif text-xl text-[#1A1A1A] tracking-tight">
              Ideate<span className="text-[#B8956F]">.</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/blog"
              className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Blog
            </Link>
            <a
              href="#pricing"
              className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Pricing
            </a>
            <a
              href="https://github.com/papay0/opendesign"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm bg-[#1A1A1A] text-white px-4 py-2 rounded-lg hover:bg-[#333] transition-colors">
                  Start Building
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/home"
                className="text-sm bg-[#1A1A1A] text-white px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
              >
                My Projects
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile Auth + Menu */}
          <div className="md:hidden flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-[#B8956F] hover:text-[#9A7B5B] transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-b border-[#E8E4E0]"
            >
              <div className="flex flex-col gap-4">
                <Link href="/blog" className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
                  Blog
                </Link>
                <a href="#pricing" className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
                  Pricing
                </a>
                <a
                  href="https://github.com/papay0/opendesign"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]"
                >
                  GitHub
                </a>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm text-[#6B6B6B] text-left">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm bg-[#1A1A1A] text-white px-4 py-2 rounded-lg w-fit">
                      Start Building
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/home"
                    className="text-sm bg-[#1A1A1A] text-white px-4 py-2 rounded-lg w-fit"
                  >
                    My Projects
                  </Link>
                </SignedIn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

// ============================================================================
// Hero Section - The Manifesto
// ============================================================================

function HeroSection() {
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [platform, setPlatform] = useState<Platform>("mobile");
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { savePendingPrompt } = usePendingPrompt();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Stream text character by character
  const streamText = useCallback(async (text: string) => {
    streamingRef.current.cancelled = false;
    setIsStreaming(true);
    setPrompt("");

    const startTime = Date.now();
    const targetDuration = 1500;

    for (let i = 0; i < text.length; i++) {
      if (streamingRef.current.cancelled) {
        break;
      }

      setPrompt(text.slice(0, i + 1));

      const expectedTime = ((i + 1) / text.length) * targetDuration;
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, expectedTime - elapsed);

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setIsStreaming(false);
  }, []);

  // Handle clicking an example card
  const handleExampleClick = useCallback(
    (example: ExamplePrompt) => {
      streamingRef.current.cancelled = true;
      textareaRef.current?.focus();
      streamText(example.fullPrompt[platform]);
    },
    [streamText, platform]
  );

  // Handle user typing - cancels streaming
  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isStreaming) {
        streamingRef.current.cancelled = true;
        setIsStreaming(false);
      }
      setPrompt(e.target.value);
    },
    [isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    streamingRef.current.cancelled = true;
    setIsStreaming(false);

    savePendingPrompt(prompt.trim(), platform);

    if (isSignedIn) {
      router.push("/home");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <section className="px-6 md:px-12 lg:px-16 pt-24 pb-16 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Two-column hero: Content left, Phones right */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
          {/* Left Column - Manifesto + Input */}
          <div>
            {/* Badges */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center gap-3 mb-8"
            >
              <a
                href="https://github.com/papay0/opendesign"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E4E0] bg-white/50 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-all"
              >
                <Github className="w-4 h-4" />
                Open Source
                <ArrowRight className="w-3 h-3" />
              </a>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E4E0] bg-white/50 text-sm text-[#6B6B6B]">
                <Sparkles className="w-4 h-4 text-[#B8956F]" />
                1,000+ prototypes created
              </span>
            </motion.div>

            {/* The Manifesto */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="mb-8"
            >
              <motion.h1 variants={letterReveal} className="mb-2">
                <span className="block font-serif text-6xl md:text-7xl lg:text-8xl text-[#1A1A1A] tracking-tight">
                  Ideate.
                </span>
              </motion.h1>
              <motion.h1 variants={letterReveal}>
                <span className="block font-sans text-6xl md:text-7xl lg:text-8xl text-[#B8956F] font-bold tracking-tight">
                  Build.
                </span>
              </motion.h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              variants={slideUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-[#6B6B6B] leading-relaxed max-w-md mb-8"
            >
              Describe your app idea.
              <br />
              Get a working prototype in seconds.
            </motion.p>

            {/* Input Form */}
            <motion.form
              variants={slideUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 }}
              onSubmit={handleSubmit}
              className="w-full max-w-lg"
            >
              <div className="bg-white border border-[#E8E4E0] rounded-2xl p-2 shadow-lg shadow-[#E8E4E0]/50">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="What will you build?"
                  rows={3}
                  className="w-full bg-transparent text-[#1A1A1A] placeholder-[#9A9A9A] text-lg px-4 py-3 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <PlatformSelector selected={platform} onChange={setPlatform} />
                  <button
                    type="submit"
                    disabled={isStreaming}
                    className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-5 py-2.5 rounded-xl hover:bg-[#A6845F] transition-colors disabled:opacity-50"
                  >
                    Build it
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.form>
          </div>

          {/* Right Column - Phone Mockups (hidden on mobile) */}
          <div className="hidden lg:flex justify-center lg:justify-end">
            <HeroPhoneMockups />
          </div>
        </div>

        {/* Inspiration Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-16"
        >
          <p className="text-sm text-[#9A9A9A] mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B8956F]" />
            Need inspiration?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {examplePrompts.map((example) => {
              const IconComponent = example.icon;
              return (
                <motion.button
                  key={example.label}
                  variants={fadeIn}
                  onClick={() => handleExampleClick(example)}
                  className="text-left bg-white border border-[#E8E4E0] rounded-xl p-4 hover:border-[#B8956F] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FFF8F0] group-hover:border-[#F5E6D3] transition-colors">
                      <IconComponent className="w-4 h-4 text-[#B8956F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#1A1A1A] text-sm">
                        {example.label}
                      </h3>
                      <span className="inline-block text-[10px] bg-[#F5F2EF] text-[#6B6B6B] px-2 py-0.5 rounded-full mt-1">
                        {example.styleTag}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B6B6B] line-clamp-2">
                    {example.description[platform]}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Transformation Section - From Words to Reality
// ============================================================================

function TransformationSection() {
  return (
    <section className="py-32 px-6 bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            From words to reality
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl mx-auto">
            Type a description. Get an interactive prototype you can click through.
          </p>
        </motion.div>

        {/* Transformation Visual */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-center"
        >
          {/* Left - The Prompt */}
          <motion.div
            variants={slideUp}
            className="bg-white border border-[#E8E4E0] rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4 text-sm text-[#9A9A9A]">
              <Lightbulb className="w-4 h-4" />
              Your idea
            </div>
            <p className="font-serif text-2xl md:text-3xl text-[#1A1A1A] leading-relaxed italic">
              &ldquo;A fitness app with activity dashboard and daily health tracking&rdquo;
            </p>
          </motion.div>

          {/* Arrow */}
          <motion.div
            variants={fadeIn}
            className="hidden lg:flex flex-col items-center gap-2"
          >
            <Wand2 className="w-6 h-6 text-[#B8956F]" />
            <div className="w-px h-12 bg-gradient-to-b from-[#B8956F] to-transparent" />
            <ArrowRight className="w-6 h-6 text-[#B8956F]" />
          </motion.div>

          {/* Right - The Result */}
          <motion.div variants={slideUp} className="relative">
            {/* Phone Mockup */}
            <div className="relative bg-[#1A1A1A] rounded-[2.5rem] p-2 shadow-2xl max-w-[280px] mx-auto">
              <div className="relative bg-[#FAF8F5] rounded-[2rem] overflow-hidden aspect-[390/844]">
                <img
                  src={HERO_PHONES.phone1}
                  alt="Generated fitness app prototype"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            {/* Badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#B8956F] text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
              Generated in 5 seconds
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Process Section - Three Steps
// ============================================================================

function ProcessSection() {
  const steps = [
    {
      number: "1",
      title: "Describe",
      description: "Type your app idea in plain English",
      icon: Lightbulb,
    },
    {
      number: "2",
      title: "Generate",
      description: "AI builds interactive screens in seconds",
      icon: Wand2,
    },
    {
      number: "3",
      title: "Test",
      description: "Click through your prototype like a real app",
      icon: MousePointerClick,
    },
  ];

  return (
    <section className="py-24 px-6 bg-[#F5F2EF]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              variants={slideUp}
              className="text-center"
            >
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white border border-[#E8E4E0] flex items-center justify-center shadow-sm">
                <step.icon className="w-7 h-7 text-[#B8956F]" />
              </div>

              {/* Number + Title */}
              <div className="mb-3">
                <span className="text-sm text-[#B8956F] font-medium">{step.number}</span>
                <h3 className="font-serif text-2xl text-[#1A1A1A]">{step.title}</h3>
              </div>

              {/* Description */}
              <p className="text-[#6B6B6B]">{step.description}</p>

              {/* Connector line (not on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-[#E8E4E0]" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Comparison Section
// ============================================================================

function PhoneMockup({
  image,
  label,
  isHero = false,
  onClick,
}: {
  image: string;
  label: string;
  isHero?: boolean;
  onClick?: () => void;
}) {
  const isIdeate = label === "Ideate";
  return (
    <div
      className={`relative cursor-pointer transition-transform hover:scale-[1.02] ${isHero ? "" : "opacity-90 hover:opacity-100"}`}
      onClick={onClick}
    >
      <div className={`relative bg-[#1A1A1A] rounded-[2.5rem] p-2 ${isHero ? "shadow-2xl" : "shadow-lg"}`}>
        <div className="relative bg-[#FAF8F5] rounded-[2rem] overflow-hidden aspect-[390/844]">
          <img
            src={image}
            alt={`${label} mobile app output`}
            className={`w-full h-full object-cover object-top ${isHero ? "" : "grayscale-[20%]"}`}
          />
        </div>
      </div>
      {/* Large label below the mockup */}
      <div className="mt-4 text-center">
        <span className={`text-lg font-semibold ${isIdeate ? "text-[#B8956F]" : "text-[#6B6B6B]"}`}>
          {isIdeate && "🏆 "}{label}
        </span>
        {!isIdeate && (
          <span className="block text-xs text-[#9A9A9A] mt-0.5">Other AI Tool</span>
        )}
      </div>
    </div>
  );
}

function BrowserMockup({
  image,
  label,
  isHero = false,
  compact = false,
  onClick,
}: {
  image: string;
  label: string;
  isHero?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const isIdeate = label === "Ideate";
  return (
    <div
      className={`relative cursor-pointer transition-transform hover:scale-[1.01] ${isHero ? "" : "opacity-90 hover:opacity-100"}`}
      onClick={onClick}
    >
      <div className={`bg-white rounded-xl overflow-hidden border ${isIdeate ? "border-[#B8956F] border-2 shadow-xl" : "border-[#E8E4E0] shadow-md"}`}>
        <div className="bg-[#F5F2EF] flex items-center gap-2 border-b border-[#E8E4E0] px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF5F57]" />
            <div className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
            <div className="w-2 h-2 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1">
            <div className="bg-white rounded text-[10px] text-[#9A9A9A] border border-[#E8E4E0] px-2 py-0.5 max-w-[140px]">
              {isIdeate ? "ideate.build" : "v0.app"}
            </div>
          </div>
        </div>
        <div className={`bg-[#FAF8F5] overflow-hidden ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
          <img
            src={image}
            alt={`${label} desktop output`}
            className={`w-full h-full object-cover object-top ${isIdeate ? "" : "grayscale-[20%]"}`}
          />
        </div>
      </div>
      {/* Large label below the mockup */}
      <div className="mt-4 text-center">
        <span className={`text-lg font-semibold ${isIdeate ? "text-[#B8956F]" : "text-[#6B6B6B]"}`}>
          {isIdeate && "🏆 "}{label}
        </span>
        {!isIdeate && (
          <span className="block text-xs text-[#9A9A9A] mt-0.5">Other AI Tool</span>
        )}
      </div>
    </div>
  );
}

function ComparisonLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: { src: string; label: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-8 h-8" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-4 md:left-8 text-white/70 hover:text-white transition-colors p-2"
      >
        <ArrowRight className="w-8 h-8 rotate-180" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-4 md:right-8 text-white/70 hover:text-white transition-colors p-2"
      >
        <ArrowRight className="w-8 h-8" />
      </button>

      <div className="relative flex flex-col items-center px-4" onClick={(e) => e.stopPropagation()}>
        <div className={`mb-4 text-lg font-medium px-6 py-2 rounded-full ${
          currentIndex === 0 ? "bg-[#B8956F] text-white" : "bg-white/10 text-white/90"
        }`}>
          {images[currentIndex].label}
        </div>

        <motion.img
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          src={images[currentIndex].src}
          alt={images[currentIndex].label}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
        />

        <div className="flex gap-2 mt-6">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonSection() {
  const [lightbox, setLightbox] = useState<{ type: "mobile" | "desktop"; index: number } | null>(null);

  const mobileImages = [
    { src: COMPARISON_IMAGES.mobile.opendesign, label: "Ideate" },
    { src: COMPARISON_IMAGES.mobile.v0, label: "v0" },
    { src: COMPARISON_IMAGES.mobile.lovable, label: "Lovable" },
  ];

  const desktopImages = [
    { src: COMPARISON_IMAGES.desktop.opendesign, label: "Ideate" },
    { src: COMPARISON_IMAGES.desktop.v0, label: "v0" },
  ];

  return (
    <section className="py-24 px-6 bg-[#FAF8F5]">
      {lightbox?.type === "mobile" && (
        <ComparisonLightbox
          images={mobileImages}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
      {lightbox?.type === "desktop" && (
        <ComparisonLightbox
          images={desktopImages}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Ideate vs Other AI Tools
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl mx-auto">
            Same prompt. Better design. 10x faster.
          </p>
        </motion.div>

        {/* Speed Comparison */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-20 max-w-3xl mx-auto"
        >
          <p className="text-center text-sm font-medium text-[#6B6B6B] mb-6 uppercase tracking-wide">
            Time to First Result
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-24 text-right">
                <span className="font-medium text-[#1A1A1A]">Ideate</span>
              </div>
              <div className="flex-1 h-10 bg-[#E8E4E0] rounded-full overflow-hidden">
                <div className="h-full bg-[#B8956F] rounded-full" style={{ width: '3%' }} />
              </div>
              <div className="w-28 text-left">
                <span className="text-lg font-bold text-[#B8956F]">5 sec</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-right">
                <span className="text-[#6B6B6B]">v0</span>
              </div>
              <div className="flex-1 h-10 bg-[#E8E4E0] rounded-full overflow-hidden">
                <div className="h-full bg-[#9A9A9A] rounded-full" style={{ width: '67%' }} />
              </div>
              <div className="w-28 text-left">
                <span className="text-lg font-bold text-[#6B6B6B]">2 min</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-right">
                <span className="text-[#6B6B6B]">Lovable</span>
              </div>
              <div className="flex-1 h-10 bg-[#E8E4E0] rounded-full overflow-hidden">
                <div className="h-full bg-[#9A9A9A] rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="w-28 text-left">
                <span className="text-lg font-bold text-[#6B6B6B]">3 min</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile Comparison */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-20"
        >
          {/* Prompt label */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white border border-[#E8E4E0] rounded-full px-6 py-3 shadow-sm">
              <Smartphone className="w-4 h-4 text-[#6B6B6B]" />
              <span className="text-sm text-[#6B6B6B]">Mobile App</span>
              <span className="text-[#D4CFC9]">•</span>
              <code className="text-sm font-mono text-[#1A1A1A]">&ldquo;Music streaming app&rdquo;</code>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-end gap-6 md:gap-10">
            <div className="w-48 md:w-56 lg:w-64">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.opendesign}
                label="Ideate"
                isHero
                onClick={() => setLightbox({ type: "mobile", index: 0 })}
              />
            </div>
            <div className="w-48 md:w-56 lg:w-64">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.v0}
                label="v0"
                onClick={() => setLightbox({ type: "mobile", index: 1 })}
              />
            </div>
            <div className="w-48 md:w-56 lg:w-64">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.lovable}
                label="Lovable"
                onClick={() => setLightbox({ type: "mobile", index: 2 })}
              />
            </div>
          </div>
        </motion.div>

        {/* Desktop Comparison */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Prompt label */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white border border-[#E8E4E0] rounded-full px-6 py-3 shadow-sm">
              <Monitor className="w-4 h-4 text-[#6B6B6B]" />
              <span className="text-sm text-[#6B6B6B]">Desktop Website</span>
              <span className="text-[#D4CFC9]">•</span>
              <code className="text-sm font-mono text-[#1A1A1A]">&ldquo;Recipe collection website&rdquo;</code>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center max-w-5xl mx-auto">
            <BrowserMockup
              image={COMPARISON_IMAGES.desktop.opendesign}
              label="Ideate"
              onClick={() => setLightbox({ type: "desktop", index: 0 })}
            />
            <BrowserMockup
              image={COMPARISON_IMAGES.desktop.v0}
              label="v0"
              onClick={() => setLightbox({ type: "desktop", index: 1 })}
            />
          </div>
        </motion.div>

        <motion.p
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center text-sm text-[#9A9A9A] mt-8"
        >
          Click any mockup to compare full-screen
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// Builders Section - Who It's For
// ============================================================================

function BuildersSection() {
  const [activePersona, setActivePersona] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 bg-[#F5F2EF]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Built for people with ideas
          </h2>
        </motion.div>

        {/* Persona Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {personas.map((persona, index) => (
            <motion.div
              key={persona.label}
              variants={slideUp}
              onMouseEnter={() => setActivePersona(index)}
              onMouseLeave={() => setActivePersona(null)}
              className={`relative bg-white border rounded-xl p-6 cursor-pointer transition-all ${
                activePersona === index
                  ? "border-[#B8956F] shadow-lg"
                  : "border-[#E8E4E0] hover:border-[#D4CFC9]"
              }`}
            >
              <h3 className="font-serif text-xl text-[#1A1A1A] mb-2">{persona.label}</h3>
              <AnimatePresence>
                {activePersona === index && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-[#6B6B6B]"
                  >
                    {persona.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing Section
// ============================================================================

function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const annualTotal = Math.round(PLANS.pro.price * 12 * 0.8); // 20% off = $192/year
  const annualPrice = annualTotal / 12; // $16/month

  return (
    <section id="pricing" className="py-24 px-6 bg-[#F5F2EF]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            Start free. Upgrade when you need more.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? "bg-[#B8956F]" : "bg-[#D4CFC9]"}`}
          >
            <motion.div
              animate={{ x: isAnnual ? 24 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>
            Annual
            <span className="ml-1.5 text-xs bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full">
              2 months free
            </span>
          </span>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
        >
          {/* Free Plan */}
          <motion.div variants={slideUp} className="bg-white border border-[#E8E4E0] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6B6B6B]" />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-[#1A1A1A]">Free</h3>
                <p className="text-sm text-[#6B6B6B]">Start with an idea</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-[#1A1A1A]">$0</span>
              <span className="text-[#6B6B6B] ml-1">/month</span>
            </div>

            <div className="flex items-center gap-2 mb-6 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4E0]">
              <MessageSquare className="w-4 h-4 text-[#6B6B6B]" />
              <span className="text-sm text-[#1A1A1A]">
                <strong>{PLANS.free.messagesPerMonth}</strong> generations/month
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.free.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                  <Check className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <SignedOut>
              <SignUpButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#E8E4E0] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#FAF8F5] transition-all">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/home"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#E8E4E0] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#FAF8F5] transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </SignedIn>
          </motion.div>

          {/* Pro Plan */}
          <motion.div variants={slideUp} className="bg-white border-2 border-[#B8956F] rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B8956F] text-white text-xs font-medium px-4 py-1 rounded-full">
              Most Popular
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#B8956F] flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-[#1A1A1A]">Pro</h3>
                <p className="text-sm text-[#6B6B6B]">Build without limits</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-[#1A1A1A]">
                ${isAnnual ? annualPrice.toFixed(2) : PLANS.pro.price}
              </span>
              <span className="text-[#6B6B6B] ml-1">/month</span>
              {isAnnual && (
                <span className="ml-2 text-sm text-[#2E7D32]">(${annualTotal}/year)</span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6 p-3 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
              <MessageSquare className="w-4 h-4 text-[#B8956F]" />
              <span className="text-sm text-[#1A1A1A]">
                <strong>{PLANS.pro.messagesPerMonth}</strong> generations/month
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.pro.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-[#1A1A1A]">
                  <Check className="w-4 h-4 text-[#B8956F] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <SignedOut>
              <SignUpButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#B8956F] text-white rounded-xl font-medium hover:bg-[#A6845F] transition-colors">
                  Upgrade to Pro
                  <Crown className="w-4 h-4" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/home"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#B8956F] text-white rounded-xl font-medium hover:bg-[#A6845F] transition-colors"
              >
                Upgrade to Pro
                <Crown className="w-4 h-4" />
              </Link>
            </SignedIn>
          </motion.div>
        </motion.div>

        {/* BYOK Option */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-8"
        >
          <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#B8956F]" />
              </div>
              <div>
                <p className="font-medium text-white">Bring Your Own Key</p>
                <p className="text-sm text-zinc-400">Use your own API key for unlimited generations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-[#B8956F]/20 text-[#B8956F] px-3 py-1 rounded-full font-medium">
                Unlimited
              </span>
              <span className="text-xl font-bold text-white">Free</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// ============================================================================
// Footer
// ============================================================================

function Footer() {
  return (
    <footer className="py-8 px-6 bg-[#FAF8F5] border-t border-[#E8E4E0]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className="font-serif text-lg text-[#1A1A1A]">Ideate</span>
            <span className="text-[#B8956F] text-lg">.</span>
            <span className="font-sans text-lg text-[#B8956F] font-bold">build</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[#6B6B6B]">
            <Link href="/blog" className="hover:text-[#1A1A1A] transition-colors">
              Blog
            </Link>
            <a
              href="https://github.com/papay0/opendesign"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1A1A1A] transition-colors"
            >
              GitHub
            </a>
            <span className="text-[#9A9A9A]">MIT License</span>
          </div>

          {/* Built by */}
          <p className="text-sm text-[#6B6B6B]">
            Built by{" "}
            <a
              href="https://x.com/papay0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1A1A1A] hover:text-[#B8956F] transition-colors"
            >
              @papay0
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B8956F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B8956F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Header />
      <main>
        <HeroSection />
        <TransformationSection />
        <ProcessSection />
        <ComparisonSection />
        <BuildersSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
