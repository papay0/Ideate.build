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

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { PLANS, MESSAGE_PACK } from "@/lib/constants/plans";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
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

const useCases = [
  {
    title: "Startup Founders",
    description:
      "Validate app ideas visually before investing in design. Create pitch deck mockups for investor meetings.",
  },
  {
    title: "Indie Developers",
    description:
      "Prototype app ideas without hiring a designer. Generate starting point designs to iterate from.",
  },
  {
    title: "Product Managers",
    description:
      "Visualize feature ideas for stakeholder presentations. Communicate product vision to engineering teams.",
  },
  {
    title: "Hackathon Builders",
    description:
      "Rapidly create polished UI for demo day. Go from idea to demo in hours, not days.",
  },
  {
    title: "Freelancers & Agencies",
    description:
      "Generate initial concepts for client presentations. Explore multiple design directions quickly.",
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

function HeroSection() {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Navigate to design page with prompt
    console.log("Design prompt:", prompt);
  };

  return (
    <section className="pt-32 pb-24 px-6" aria-label="AI App Designer Hero">
      <div className="max-w-6xl mx-auto">
        {/* Open Source badge */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mb-8"
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
        </motion.div>

        {/* Main headline - Large serif typography with SEO keywords */}
        <motion.h1
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="font-serif text-5xl md:text-7xl lg:text-8xl text-[#1A1A1A] tracking-tight leading-[1.05] mb-8 max-w-4xl"
        >
          AI App Designer.{" "}
          <span className="text-[#B8956F] italic">Mockups in minutes.</span>
        </motion.h1>

        {/* Subheadline with SEO keywords */}
        <motion.p
          variants={slideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="text-xl md:text-2xl text-[#6B6B6B] max-w-2xl mb-12 leading-relaxed"
        >
          Transform your app ideas into stunning mobile and desktop UI mockups instantly.
          Open source AI design tool — bring your own API key, no design skills required.
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
    <section className="py-24 px-6 bg-[#F5F2EF]" aria-label="How OpenDesign AI App Designer Works">
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
            How the AI Design Generator Works
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl">
            Create mobile and desktop app mockups in three simple steps
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
            Who Uses OpenDesign
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-xl">
            From solo founders to agencies, anyone can create professional app mockups
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
  const [isAnnual, setIsAnnual] = useState(false);

  // For annual, give 2 months free (10/12 = ~17% discount)
  const annualPrice = Math.round((PLANS.pro.price * 10) / 12);

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
                ${isAnnual ? annualPrice : PLANS.pro.price}
              </span>
              <span className="text-[#6B6B6B] ml-1">/month</span>
              {isAnnual && (
                <span className="ml-2 text-sm text-[#2E7D32]">
                  (${PLANS.pro.price * 10}/year)
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
                or navigating your designs does not count.
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
                quality designs with more attention to detail. Free users have access
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
          Start Designing Your App Today
        </h2>
        <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
          Create beautiful mobile and desktop UI mockups in minutes with AI.
          Open source, free forever — just bring your own API key.
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
        <FeaturesSection />
        <UseCasesSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
