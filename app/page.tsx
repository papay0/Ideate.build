"use client";

/**
 * OpenDesign Landing Page
 *
 * Design: Editorial/Magazine Aesthetic
 *
 * A refined, publication-quality landing page inspired by design magazines
 * like Bloomberg Businessweek and Stripe Press. Features elegant serif
 * typography, generous whitespace, and a warm, sophisticated color palette.
 *
 * Key design principles:
 * - Typography as the hero element
 * - Warm white background with terracotta accent
 * - Asymmetric layouts for visual interest
 * - Subtle, refined animations
 * - No gradients, glows, or decorative effects
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Pencil,
  Code2,
  ArrowRight,
  Github,
  Menu,
  X,
  Layers,
  Check,
  Crown,
  Zap,
  MessageSquare,
  Dumbbell,
  ChefHat,
  Plane,
  Music,
  Play,
  MousePointerClick,
  LucideIcon,
} from "lucide-react";
import { PLANS, MESSAGE_PACK } from "@/lib/constants/plans";
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
// Subtle, refined animations that don't distract
// ============================================================================

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

// ============================================================================
// Data
// ============================================================================

const features = [
  {
    icon: MousePointerClick,
    title: "Real Navigation, Not Mockups",
    description:
      "Click buttons. Tap links. Navigate between screens. Your prototype works like the real thing.",
  },
  {
    icon: Play,
    title: "Test It in Play Mode",
    description:
      "Enter full-screen Play mode and experience your app. Find UX issues before you write any code.",
  },
  {
    icon: Sparkles,
    title: "Watch It Generate Live",
    description:
      "See your screens appear in real-time as the AI builds them. No waiting, no refreshing.",
  },
];

// ============================================================================
// Example Prompts with Rich Data
// ============================================================================

interface ExamplePrompt {
  label: string;
  styleTag: string;
  description: string;
  icon: LucideIcon;
  fullPrompt: string;
}

const examplePrompts: ExamplePrompt[] = [
  {
    label: "Fitness Tracker",
    styleTag: "Warm Gradients",
    description: "Activity rings, workout cards, progress charts",
    icon: Dumbbell,
    fullPrompt: `Personal fitness dashboard. Daily activity rings showing steps, calories burned, and active minutes. Workout history displayed as cards with exercise type icons, duration, and intensity level. Weekly progress line chart with smooth curves. Achievement badges collection and current streak counter with flame icon.

Also create the workout detail screen and profile screen.

Warm gradient aesthetic. Soft coral (#FF8A80) and peach gradients transitioning to warm orange. Large rounded progress indicators with satisfying fill animations. Friendly rounded sans-serif typography. Organic blob shapes in background, motivational quotes section.`,
  },
  {
    label: "Recipe Collection",
    styleTag: "Editorial",
    description: "Ingredient cards, cooking mode, favorites",
    icon: ChefHat,
    fullPrompt: `Recipe collection app. Featured recipe hero section with beautiful food photography placeholder and cooking time badge. Ingredient list with quantity badges and checkable items. Step-by-step cooking mode with large readable text, timer widget, and progress indicator. Favorites collection organized in category tabs.

Also create the cooking mode screen and shopping list screen.

Editorial magazine aesthetic. Warm cream (#FFF8F0) and terracotta (#C17C60) palette. Elegant serif typography for headings, clean sans-serif for body. Card layouts with generous whitespace and subtle shadows. Sophisticated food photography placeholders with rounded corners.`,
  },
  {
    label: "Travel Planner",
    styleTag: "Wanderlust",
    description: "Trip cards, itinerary timeline, packing lists",
    icon: Plane,
    fullPrompt: `Trip planning app. Upcoming trips as cards with destination cover photos, countdown timer, and date range. Day-by-day itinerary displayed as vertical timeline with location pins, time slots, and activity icons. Packing checklist with categorized expandable sections. Budget tracker showing expense breakdown in a donut chart with category colors.

Also create the day detail screen and expense logging screen.

Vibrant wanderlust aesthetic. Ocean teal (#0097A7) and sunset coral (#FF7043) as primary colors. Polaroid-style photo frames with slight rotation. Handwritten accent font for headings. Map markers, dotted path lines connecting destinations, adventure-themed iconography.`,
  },
  {
    label: "Music Player",
    styleTag: "Dark Neon",
    description: "Now playing, visualizer, playlist grid",
    icon: Music,
    fullPrompt: `Music streaming app. Now playing screen featuring large album artwork with reflection effect, playback controls with scrubber, and like/shuffle/repeat buttons. Audio waveform visualizer bars animating with the beat. Up next queue as draggable list items. Playlist library displayed as a masonry grid of album art cards.

Also create the library browse screen and search screen.

Dark mode with neon accents. Deep charcoal (#1A1A2E) background with electric purple (#9D4EDD) and hot pink (#FF006E) gradient accents. Glassmorphic player controls with blur backdrop. Subtle glow effects on active elements. Bold geometric sans-serif typography with high contrast.`,
  },
];

const useCases = [
  {
    title: "Startup Founders",
    description:
      "Show investors a working prototype, not slides. Let them click through your app idea in real-time.",
  },
  {
    title: "Indie Developers",
    description:
      "Skip the design phase. Generate a clickable prototype in minutes and start building what matters.",
  },
  {
    title: "Product Managers",
    description:
      "Get stakeholder buy-in with prototypes they can actually test. No more explaining wireframes.",
  },
  {
    title: "Hackathon Teams",
    description:
      "Ship a polished demo on day one. Focus on your backend while AI handles the frontend.",
  },
  {
    title: "Freelancers & Agencies",
    description:
      "Win more clients with interactive prototypes. Show three concepts in the time it takes to make one.",
  },
];

// ============================================================================
// Component: Header
// Clean, minimal navigation
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
          <Link href="/" className="flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#B8956F]" />
            <span className="font-medium text-[#1A1A1A] tracking-tight">
              OpenDesign
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
            <span className="text-sm text-[#9A9A9A] flex items-center gap-1.5 cursor-not-allowed">
              Explore
              <span className="text-[10px] bg-[#F5F2EF] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                Soon
              </span>
            </span>
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
                  Get Started
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#6B6B6B] hover:text-[#1A1A1A]"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
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
              <span className="text-sm text-[#9A9A9A]">Explore (Coming Soon)</span>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm text-[#6B6B6B] text-left">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm bg-[#1A1A1A] text-white px-4 py-2 rounded-lg w-fit">
                    Get Started
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
      </div>
    </motion.header>
  );
}

// ============================================================================
// Component: Hero Section
// Bold typography-driven hero with asymmetric layout
// ============================================================================

// ============================================================================
// Component: Demo Video Browser Mockup
// Clean browser window frame with the demo video
// ============================================================================

function DemoVideoMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      {/* Ambient glow behind the browser */}
      <div className="absolute inset-0 blur-3xl opacity-15 bg-gradient-to-br from-[#B8956F] via-[#D4B896] to-[#E8D4C4] scale-105" />

      {/* Browser Window Frame - with relative positioning for the label */}
      <div className="relative">
        <div className="rounded-lg overflow-hidden shadow-2xl border border-[#E8E4E0]">
          {/* Browser Chrome / Title Bar - Compact */}
          <div className="bg-[#F5F2EF] px-3 py-2 flex items-center gap-8 border-b border-[#E8E4E0]">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>

            {/* URL - simple text, no box */}
            <span className="text-[11px] text-[#6B6B6B]">opendesign.build</span>
          </div>

          {/* Video content - slightly scaled to crop black bars */}
          <div className="bg-[#FAF8F5] overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full aspect-video object-cover scale-[1.04]"
            >
              <source
                src="https://xqpuvtopszitdtittjao.supabase.co/storage/v1/object/public/public-assets/OpenDesign%20Demo.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>

        {/* Floating label - positioned relative to the browser frame */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-[#E8E4E0] rounded-full px-4 py-1.5 shadow-lg z-10"
        >
          <span className="text-xs font-medium text-[#6B6B6B]">Live Demo</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function HeroSection() {
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [platform, setPlatform] = useState<Platform>("mobile");
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { savePendingPrompt } = usePendingPrompt();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Stream text character by character - fast, ~1 second total
  const streamText = useCallback(async (text: string) => {
    streamingRef.current.cancelled = false;
    setIsStreaming(true);
    setPrompt("");

    const startTime = Date.now();
    const targetDuration = 1500; // 1.5 seconds total

    for (let i = 0; i < text.length; i++) {
      if (streamingRef.current.cancelled) {
        break;
      }

      setPrompt(text.slice(0, i + 1));

      // Calculate how long we should have taken vs how long we actually took
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
      // Cancel any ongoing streaming
      streamingRef.current.cancelled = true;

      // Focus textarea and start streaming
      textareaRef.current?.focus();
      streamText(example.fullPrompt);
    },
    [streamText]
  );

  // Handle user typing - cancels streaming
  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isStreaming) {
        // User started typing, cancel streaming
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

    // Cancel any streaming
    streamingRef.current.cancelled = true;
    setIsStreaming(false);

    // Save prompt to localStorage for use after auth
    savePendingPrompt(prompt.trim(), platform);

    if (isSignedIn) {
      // Already logged in - go directly to home
      // Home page will detect pending prompt and create project
      router.push("/home");
    } else {
      // Not logged in - redirect to sign-in
      // After sign-in, Clerk redirects to /home (per env config)
      router.push("/sign-in");
    }
  };

  return (
    <section className="pt-32 pb-24 px-6 overflow-hidden" aria-label="AI App Prototyper Hero">
      <div className="max-w-7xl mx-auto">
        {/* Two-column layout: Content left, Video right (video is larger) */}
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-10 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Badges */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="mb-8 flex flex-wrap items-center gap-3"
            >
              <a
                href="https://github.com/papay0/opendesign"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E4E0] bg-white/50 text-sm text-[#1A1A1A] hover:bg-white hover:border-[#1A1A1A] hover:shadow-sm transition-all"
              >
                <Github className="w-4 h-4" />
                Open Source
                <ArrowRight className="w-3 h-3 text-[#6B6B6B]" />
              </a>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E4E0] bg-white/50 text-sm text-[#6B6B6B]">
                <Sparkles className="w-4 h-4 text-[#B8956F]" />
                1,000+ prototypes created
              </span>
            </motion.div>

            {/* Main headline - Large serif typography with SEO keywords */}
            <motion.h1
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="font-serif text-5xl md:text-6xl lg:text-7xl text-[#1A1A1A] tracking-tight leading-[1.05] mb-6"
            >
              From Idea to Working Demo.{" "}
              <span className="text-[#B8956F] italic">In 60 Seconds.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={slideUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
              className="text-xl text-[#6B6B6B] mb-10 leading-relaxed"
            >
              Describe your app. AI builds a clickable prototype with real navigation.
              Test the user flow before writing a single line of code.
            </motion.p>

            {/* Main Input Form */}
            <motion.form
              variants={slideUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              onSubmit={handleSubmit}
              className="mb-8"
            >
              <div className="bg-white border border-[#E8E4E0] rounded-2xl p-2 shadow-sm">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="A fitness app with workout tracking, a recipe collection with cooking mode..."
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
                    Generate it
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.form>
          </div>

          {/* Right Column - Demo Video in Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <DemoVideoMockup />
          </div>
        </div>

        {/* Inspiration Cards - Full width below the hero */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-16"
        >
          <p className="text-sm text-[#9A9A9A] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B8956F]" />
            Need inspiration?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examplePrompts.map((example) => {
              const IconComponent = example.icon;
              return (
                <motion.button
                  key={example.label}
                  variants={fadeIn}
                  onClick={() => handleExampleClick(example)}
                  className="text-left bg-white border border-[#E8E4E0] rounded-xl p-4 hover:border-[#B8956F] hover:shadow-md transition-all group"
                >
                  {/* Icon and Title Row */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FFF8F0] group-hover:border-[#F5E6D3] transition-colors">
                      <IconComponent className="w-5 h-5 text-[#B8956F]" />
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
                  {/* Description */}
                  <p className="text-xs text-[#6B6B6B] line-clamp-2">
                    {example.description}
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
// Component: Comparison Section
// Show OpenDesign vs competitors - Mobile and Desktop
// ============================================================================

// Placeholder images - replace with real screenshots
// Using picsum.photos for development placeholders
const COMPARISON_IMAGES = {
  mobile: {
    opendesign: "https://picsum.photos/390/844?random=1",
    v0: "https://picsum.photos/390/844?random=2",
    lovable: "https://picsum.photos/390/844?random=3",
    replit: "https://picsum.photos/390/844?random=4",
    prompt: "Music streaming app",
  },
  desktop: {
    opendesign: "https://picsum.photos/1440/900?random=5",
    v0: "https://picsum.photos/1440/900?random=6",
    lovable: "https://picsum.photos/1440/900?random=7",
    prompt: "Project management dashboard",
  },
};

// Phone mockup frame component
function PhoneMockup({
  image,
  label,
  isHero = false
}: {
  image: string;
  label: string;
  isHero?: boolean;
}) {
  return (
    <div className={`relative ${isHero ? "" : "opacity-75 hover:opacity-100 transition-opacity"}`}>
      {/* Label */}
      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-medium px-3 py-0.5 rounded-full ${
        isHero
          ? "bg-[#B8956F] text-white"
          : "bg-[#F5F2EF] text-[#6B6B6B] border border-[#E8E4E0]"
      }`}>
        {label}
      </div>

      {/* Phone Frame */}
      <div className={`relative bg-[#1A1A1A] rounded-[2.5rem] p-2 ${isHero ? "shadow-2xl" : "shadow-lg"}`}>
        {/* Screen */}
        <div className={`relative bg-[#FAF8F5] rounded-[2rem] overflow-hidden ${isHero ? "aspect-[390/844]" : "aspect-[390/844]"}`}>
          <img
            src={image}
            alt={`${label} mobile app output`}
            className={`w-full h-full object-cover object-top ${isHero ? "" : "grayscale-[30%]"}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[#9A9A9A] text-sm"><span>${label}</span></div>`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Browser mockup frame component
function BrowserMockup({
  image,
  label,
  isHero = false,
}: {
  image: string;
  label: string;
  isHero?: boolean;
}) {
  return (
    <div className={`relative ${isHero ? "" : "opacity-75 hover:opacity-100 transition-opacity"}`}>
      {/* Label */}
      <div className={`absolute -top-2.5 left-6 z-10 text-xs font-medium px-3 py-1 rounded-full ${
        isHero
          ? "bg-[#B8956F] text-white"
          : "bg-[#F5F2EF] text-[#6B6B6B] border border-[#E8E4E0]"
      }`}>
        {label}
      </div>

      {/* Browser Frame */}
      <div className={`bg-white rounded-xl overflow-hidden border ${isHero ? "border-[#B8956F] border-2 shadow-xl" : "border-[#E8E4E0] shadow-md"}`}>
        {/* Browser Chrome */}
        <div className="bg-[#F5F2EF] px-4 py-2.5 flex items-center gap-2 border-b border-[#E8E4E0]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 ml-3">
            <div className="bg-white rounded-md px-3 py-1.5 text-xs text-[#9A9A9A] max-w-[180px] border border-[#E8E4E0]">
              localhost:3000
            </div>
          </div>
        </div>

        {/* Screen */}
        <div className="aspect-[16/10] bg-[#FAF8F5] overflow-hidden">
          <img
            src={image}
            alt={`${label} desktop output`}
            className={`w-full h-full object-cover object-top ${isHero ? "" : "grayscale-[30%]"}`}
          />
        </div>
      </div>
    </div>
  );
}

function ComparisonSection() {
  return (
    <section className="py-24 px-6 bg-[#F5F2EF]" aria-label="OpenDesign vs Other AI Tools">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Same Prompt. Different Results.
          </h2>
          <p className="text-lg text-[#6B6B6B]">
            See how OpenDesign compares to other AI tools.
          </p>
        </motion.div>

        {/* ============ MOBILE COMPARISON ============ */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-24"
        >
          {/* Mobile Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px flex-1 bg-[#E8E4E0]" />
            <div className="flex items-center gap-3 bg-white border border-[#E8E4E0] rounded-full px-5 py-2">
              <span className="text-sm font-medium text-[#1A1A1A]">Mobile App</span>
              <span className="text-[#9A9A9A]">•</span>
              <code className="text-sm font-mono text-[#6B6B6B]">&quot;{COMPARISON_IMAGES.mobile.prompt}&quot;</code>
            </div>
            <div className="h-px flex-1 bg-[#E8E4E0]" />
          </div>

          {/* Mobile Phones Grid - All same size */}
          <div className="flex flex-wrap justify-center items-end gap-4 md:gap-6">
            <div className="w-36 md:w-44">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.opendesign}
                label="OpenDesign"
                isHero
              />
            </div>
            <div className="w-36 md:w-44">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.v0}
                label="v0"
              />
            </div>
            <div className="w-36 md:w-44">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.lovable}
                label="Lovable"
              />
            </div>
            <div className="w-36 md:w-44">
              <PhoneMockup
                image={COMPARISON_IMAGES.mobile.replit}
                label="Replit"
              />
            </div>
          </div>
        </motion.div>

        {/* ============ DESKTOP COMPARISON ============ */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Desktop Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px flex-1 bg-[#E8E4E0]" />
            <div className="flex items-center gap-3 bg-white border border-[#E8E4E0] rounded-full px-5 py-2">
              <span className="text-sm font-medium text-[#1A1A1A]">Desktop Website</span>
              <span className="text-[#9A9A9A]">•</span>
              <code className="text-sm font-mono text-[#6B6B6B]">&quot;{COMPARISON_IMAGES.desktop.prompt}&quot;</code>
            </div>
            <div className="h-px flex-1 bg-[#E8E4E0]" />
          </div>

          {/* Desktop - OpenDesign (left, larger) + Competitors (right, stacked) */}
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
            {/* OpenDesign - Hero */}
            <BrowserMockup
              image={COMPARISON_IMAGES.desktop.opendesign}
              label="OpenDesign"
              isHero
            />

            {/* Competitors - Stacked vertically */}
            <div className="flex flex-col gap-4">
              <BrowserMockup
                image={COMPARISON_IMAGES.desktop.v0}
                label="v0"
              />
              <BrowserMockup
                image={COMPARISON_IMAGES.desktop.lovable}
                label="Lovable"
              />
            </div>
          </div>
        </motion.div>

        {/* Caption */}
        <motion.p
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center text-sm text-[#6B6B6B] mt-12"
        >
          All outputs generated with default settings. No manual editing.
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// Component: Use Cases Section
// Who benefits from OpenDesign
// ============================================================================

function UseCasesSection() {
  return (
    <section className="py-24 px-6 bg-[#FAF8F5]" aria-label="Who Uses OpenDesign">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Built for Builders
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl">
            From pitch decks to hackathon demos, get a working prototype before lunch.
          </p>
        </motion.div>

        {/* Use Case Cards - 2 column grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-6"
        >
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              variants={slideUp}
              className="bg-white border border-[#E8E4E0] border-l-4 border-l-[#B8956F] rounded-xl p-6 hover:shadow-md transition-all"
            >
              <h3 className="font-serif text-xl text-[#1A1A1A] mb-2">
                {useCase.title}
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Component: Pricing Section
// Clean, transparent pricing with the editorial aesthetic
// ============================================================================

function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  // For annual, give 2 months free ($150/year = $12.50/month)
  const annualTotal = PLANS.pro.price * 10; // $150/year
  const annualPrice = annualTotal / 12; // $12.50/month

  return (
    <section id="pricing" className="py-24 px-6 bg-[#F5F2EF]" aria-label="Pricing Plans">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl mx-auto">
            Start for free, upgrade when you need more. No hidden fees.
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
          <span
            className={`text-sm font-medium transition-colors ${
              !isAnnual ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isAnnual ? "bg-[#B8956F]" : "bg-[#D4CFC9]"
            }`}
          >
            <motion.div
              animate={{ x: isAnnual ? 24 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              isAnnual ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
            }`}
          >
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
          <motion.div
            variants={slideUp}
            className="bg-white border border-[#E8E4E0] rounded-2xl p-8 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6B6B6B]" />
              </div>
              <h3 className="font-serif text-2xl text-[#1A1A1A]">Free</h3>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-[#1A1A1A]">$0</span>
              <span className="text-[#6B6B6B] ml-1">/month</span>
            </div>

            <div className="flex items-center gap-2 mb-6 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4E0]">
              <MessageSquare className="w-4 h-4 text-[#6B6B6B]" />
              <span className="text-sm text-[#1A1A1A]">
                <strong>{PLANS.free.messagesPerMonth}</strong> AI generations/month
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.free.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm text-[#6B6B6B]"
                >
                  <Check className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <SignedOut>
              <SignUpButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#E8E4E0] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#FAF8F5] hover:border-[#D4CFC9] transition-all">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/home"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#E8E4E0] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#FAF8F5] hover:border-[#D4CFC9] transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </SignedIn>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            variants={slideUp}
            className="bg-white border-2 border-[#B8956F] rounded-2xl p-8 relative hover:shadow-lg transition-all"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B8956F] text-white text-xs font-medium px-4 py-1 rounded-full">
              Most Popular
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#B8956F] flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-serif text-2xl text-[#1A1A1A]">Pro</h3>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-[#1A1A1A]">
                ${isAnnual ? annualPrice.toFixed(2) : PLANS.pro.price}
              </span>
              <span className="text-[#6B6B6B] ml-1">/month</span>
              {isAnnual && (
                <span className="ml-2 text-sm text-[#2E7D32]">
                  (${annualTotal}/year)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6 p-3 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
              <MessageSquare className="w-4 h-4 text-[#B8956F]" />
              <span className="text-sm text-[#1A1A1A]">
                <strong>{PLANS.pro.messagesPerMonth}</strong> AI generations/month
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.pro.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm text-[#1A1A1A]"
                >
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

        {/* BYOK and Message Pack Add-ons */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-8 space-y-4"
        >
          {/* BYOK Option */}
          <motion.div
            variants={slideUp}
            className="bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#B8956F]" />
              </div>
              <div>
                <p className="font-medium text-white">Bring Your Own Key</p>
                <p className="text-sm text-zinc-400">
                  Use your own API key for unlimited generations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-[#B8956F]/20 text-[#B8956F] px-3 py-1 rounded-full font-medium">
                Unlimited
              </span>
              <span className="text-xl font-bold text-white">Free</span>
            </div>
          </motion.div>

          {/* Message Pack Add-on */}
          <motion.div
            variants={slideUp}
            className="bg-white rounded-xl border border-[#E8E4E0] p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#B8956F]" />
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A]">Need more messages?</p>
                <p className="text-sm text-[#6B6B6B]">
                  Pro users can purchase extra message packs anytime
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xl font-bold text-[#1A1A1A]">
                ${MESSAGE_PACK.priceUsd}
              </p>
              <p className="text-sm text-[#6B6B6B]">
                for {MESSAGE_PACK.messages} messages
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-16"
        >
          <h3 className="font-serif text-2xl text-[#1A1A1A] text-center mb-8">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4">
            <motion.details
              variants={fadeIn}
              className="bg-white rounded-xl border border-[#E8E4E0] p-5 group"
            >
              <summary className="font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                What counts as a &quot;message&quot;?
                <span className="text-[#6B6B6B] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-sm text-[#6B6B6B] leading-relaxed">
                Each AI generation request counts as one message. This includes
                creating new screens and editing existing ones. Viewing, exporting,
                or navigating your prototypes does not count.
              </p>
            </motion.details>

            <motion.details
              variants={fadeIn}
              className="bg-white rounded-xl border border-[#E8E4E0] p-5 group"
            >
              <summary className="font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                What&apos;s the difference between Flash and Pro models?
                <span className="text-[#6B6B6B] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-sm text-[#6B6B6B] leading-relaxed">
                Flash is faster and great for quick iterations. Pro produces higher
                quality prototypes with more attention to detail. Free users have access
                to Flash only, while Pro subscribers can use both.
              </p>
            </motion.details>

            <motion.details
              variants={fadeIn}
              className="bg-white rounded-xl border border-[#E8E4E0] p-5 group"
            >
              <summary className="font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                Do unused messages roll over?
                <span className="text-[#6B6B6B] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-sm text-[#6B6B6B] leading-relaxed">
                Monthly message allowances reset at the start of each billing cycle.
                However, any extra message packs you purchase never expire.
              </p>
            </motion.details>

            <motion.details
              variants={fadeIn}
              className="bg-white rounded-xl border border-[#E8E4E0] p-5 group"
            >
              <summary className="font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                Can I cancel anytime?
                <span className="text-[#6B6B6B] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-sm text-[#6B6B6B] leading-relaxed">
                Yes! You can cancel your subscription at any time. You&apos;ll continue
                to have Pro access until the end of your current billing period.
              </p>
            </motion.details>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Component: CTA Section
// Clean, confident call-to-action
// ============================================================================

function CTASection() {
  return (
    <section className="py-24 px-6 bg-[#1A1A1A]" aria-label="Get Started with OpenDesign">
      <motion.div
        variants={slideUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="font-serif text-4xl md:text-5xl text-white tracking-tight mb-6">
          Your Next Prototype is 60 Seconds Away
        </h2>
        <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
          Describe it. Generate it. Click through it.
          Open source, no account required with BYOK.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-8 py-3.5 rounded-xl hover:bg-[#A6845F] transition-colors text-lg">
                Start Building
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/home"
              className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-8 py-3.5 rounded-xl hover:bg-[#A6845F] transition-colors text-lg"
            >
              My Projects
              <ArrowRight className="w-5 h-5" />
            </Link>
          </SignedIn>
          <a
            href="https://github.com/papay0/opendesign"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-6 py-3.5 rounded-xl transition-colors"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================================================
// Component: Footer
// Minimal, elegant footer
// ============================================================================

function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-[#E8E4E0]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#B8956F]" />
            <span className="text-sm font-medium text-[#1A1A1A]">OpenDesign</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[#6B6B6B]">
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
// Main Page Component
// ============================================================================

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Auto-redirect signed-in users to /home
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show nothing while checking auth to avoid flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B8956F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If signed in, show loading while redirecting
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
        <ComparisonSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
