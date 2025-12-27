import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { ArrowLeft, Calendar, Clock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Ideate",
      url: "https://ideate.build",
    },
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Header */}
      <header className="border-b border-[#E8E4E0]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Logo href="/" />
            <Link
              href="/blog"
              className="flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Posts
            </Link>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Meta */}
          <div className="mb-8">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-[#F5F2EF] text-[#6B6B6B] px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight leading-tight mb-6">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-xl text-[#6B6B6B] leading-relaxed mb-6">
              {post.description}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-[#9A9A9A] pb-8 border-b border-[#E8E4E0]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {post.readingTime} min read
              </span>
              <span>By {post.author}</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-[#1A1A1A] prose-headings:tracking-tight prose-p:text-[#4A4A4A] prose-p:leading-relaxed prose-a:text-[#B8956F] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#1A1A1A] prose-code:text-[#6B6B6B] prose-code:bg-[#F5F2EF] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#F5F2EF] prose-pre:text-[#4A4A4A] prose-pre:border prose-pre:border-[#E8E4E0] prose-pre:rounded-xl [&_pre_code]:text-[#4A4A4A] [&_pre_code]:bg-transparent [&_pre_code]:p-0 prose-blockquote:border-l-[#B8956F] prose-blockquote:text-[#6B6B6B] prose-li:text-[#4A4A4A] prose-th:text-[#1A1A1A] prose-td:text-[#4A4A4A]">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl text-white tracking-tight mb-4">
            Ready to design your app?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Create beautiful mobile and desktop mockups in minutes with AI. Open
            source and free to use.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#B8956F] text-white font-medium px-6 py-3 rounded-xl hover:bg-[#A6845F] transition-colors"
            >
              Try Ideate
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-6 py-3 rounded-xl transition-colors"
            >
              More Articles
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#E8E4E0]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo href="/" size="sm" />
          <p className="text-sm text-[#6B6B6B]">Open Source · MIT License</p>
        </div>
      </footer>
    </div>
  );
}
