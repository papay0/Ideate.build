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

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  Pencil,
  Code2,
  ArrowRight,
  Github,
  Menu,
  X,
  Layers,
} from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

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
    icon: Sparkles,
    title: "Generate with AI",
    description:
      "Describe your vision in plain English. Our AI transforms your ideas into beautiful, production-ready designs.",
  },
  {
    icon: Pencil,
    title: "Iterate Naturally",
    description:
      "Refine your designs through conversation. Request changes and see them come to life instantly.",
  },
  {
    icon: Code2,
    title: "Export Clean Code",
    description:
      "Get HTML and Tailwind CSS that's ready for production. Copy, paste, and ship.",
  },
];

const examplePrompts = [
  "A minimalist task manager",
  "Analytics dashboard",
  "E-commerce checkout flow",
  "Podcast app with dark mode",
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
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-[#1A1A1A] tracking-tight">
              OpenDesign
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <span className="text-sm text-[#9A9A9A] flex items-center gap-1.5 cursor-not-allowed">
              Pricing
              <span className="text-[10px] bg-[#F5F2EF] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                Soon
              </span>
            </span>
            <span className="text-sm text-[#9A9A9A] flex items-center gap-1.5 cursor-not-allowed">
              Explore
              <span className="text-[10px] bg-[#F5F2EF] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                Soon
              </span>
            </span>
            <a
              href="https://github.com/yourusername/opendesign"
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
                Dashboard
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
              <span className="text-sm text-[#9A9A9A]">Pricing (Coming Soon)</span>
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
                  Dashboard
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

function HeroSection() {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Navigate to design page with prompt
    console.log("Design prompt:", prompt);
  };

  return (
    <section className="pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Editorial badge */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 text-sm text-[#6B6B6B]">
            <span className="w-2 h-2 rounded-full bg-[#B8956F]" />
            Open Source · AI-Powered Design
          </span>
        </motion.div>

        {/* Main headline - Large serif typography */}
        <motion.h1
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="font-serif text-5xl md:text-7xl lg:text-8xl text-[#1A1A1A] tracking-tight leading-[1.05] mb-8 max-w-4xl"
        >
          Design anything{" "}
          <span className="text-[#B8956F] italic">in minutes</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={slideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="text-xl md:text-2xl text-[#6B6B6B] max-w-2xl mb-12 leading-relaxed"
        >
          Go from idea to beautiful mockups through conversation.
          Bring your own API key. No design skills required.
        </motion.p>

        {/* Main Input Form */}
        <motion.form
          variants={slideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="max-w-2xl mb-8"
        >
          <div className="bg-white border border-[#E8E4E0] rounded-2xl p-2 shadow-sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="I want to design an app that..."
              rows={3}
              className="w-full bg-transparent text-[#1A1A1A] placeholder-[#9A9A9A] text-lg px-4 py-3 resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs text-[#9A9A9A]">
                Press Enter or click to generate
              </span>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-5 py-2.5 rounded-xl hover:bg-[#A6845F] transition-colors"
              >
                Design it
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.form>

        {/* Example Prompts */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <p className="text-sm text-[#9A9A9A] mb-3">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <motion.button
                key={index}
                variants={fadeIn}
                onClick={() => setPrompt(example)}
                className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] bg-white border border-[#E8E4E0] hover:border-[#D4CFC9] px-4 py-2 rounded-full transition-all"
              >
                {example}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Component: Features Section
// Clean grid with elegant cards
// ============================================================================

function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-[#F5F2EF]">
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
            How it works
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl">
            A thoughtfully simple workflow that gets out of your way
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={slideUp}
              className="bg-white border border-[#E8E4E0] rounded-2xl p-8 hover:border-[#D4CFC9] hover:shadow-sm transition-all"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E8E4E0] flex items-center justify-center mb-6">
                <feature.icon className="w-5 h-5 text-[#B8956F]" />
              </div>

              {/* Content */}
              <h3 className="font-serif text-xl text-[#1A1A1A] mb-3">
                {feature.title}
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
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
    <section className="py-24 px-6 bg-[#1A1A1A]">
      <motion.div
        variants={slideUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="font-serif text-4xl md:text-5xl text-white tracking-tight mb-6">
          Ready to design?
        </h2>
        <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
          Start creating beautiful app designs in minutes.
          Open source, free to use, bring your own API key.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-8 py-3.5 rounded-xl hover:bg-[#A6845F] transition-colors text-lg">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/home"
              className="flex items-center gap-2 bg-[#B8956F] text-white font-medium px-8 py-3.5 rounded-xl hover:bg-[#A6845F] transition-colors text-lg"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </SignedIn>
          <a
            href="https://github.com/yourusername/opendesign"
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
            <div className="w-6 h-6 rounded-md bg-[#1A1A1A] flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-[#1A1A1A]">OpenDesign</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[#6B6B6B]">
            <a
              href="https://github.com/yourusername/opendesign"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1A1A1A] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/opendesign"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1A1A1A] transition-colors"
            >
              Twitter
            </a>
            <span className="text-[#9A9A9A]">MIT License</span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-[#9A9A9A]">
            © {new Date().getFullYear()} OpenDesign
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
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
