import { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Blog - The Prototyping Guide | Ideate",
  description:
    "Learn how product teams use prototyping to validate ideas faster. Practical guides for PMs, designers, and founders building digital products.",
  openGraph: {
    title: "Ideate Blog - The Prototyping Guide",
    description:
      "Learn how product teams use prototyping to validate ideas faster. Practical guides for PMs, designers, and founders.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="border-b border-[#E8E4E0]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Logo href="/" />
            <Link
              href="/"
              className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 border-b border-[#E8E4E0]">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#B8956F]" />
            Ideate Blog
          </span>
          <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] tracking-tight mb-4">
            The Prototyping Guide
          </h1>
          <p className="text-lg text-[#6B6B6B] max-w-2xl">
            Learn how product teams use prototyping to validate ideas faster.
            Practical guides for PMs, designers, and founders building digital products.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <main className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {posts.length === 0 ? (
            <p className="text-[#6B6B6B] text-center py-12">
              No posts yet. Check back soon!
            </p>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group bg-white border border-[#E8E4E0] rounded-2xl p-8 hover:border-[#D4CFC9] hover:shadow-sm transition-all"
                >
                  <Link href={`/blog/${post.slug}`}>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-[#F5F2EF] text-[#6B6B6B] px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] tracking-tight mb-3 group-hover:text-[#B8956F] transition-colors">
                      {post.title}
                    </h2>

                    {/* Description */}
                    <p className="text-[#6B6B6B] leading-relaxed mb-6">
                      {post.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-[#9A9A9A]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {post.readingTime} min read
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-sm text-[#B8956F] opacity-0 group-hover:opacity-100 transition-opacity">
                        Read more
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#1A1A1A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl text-white tracking-tight mb-4">
            Ready to prototype your idea?
          </h2>
          <p className="text-zinc-400 mb-8">
            Create interactive prototypes in seconds. Open source and free to
            use.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#B8956F] text-white font-medium px-6 py-3 rounded-xl hover:bg-[#A6845F] transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#E8E4E0]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo href="/" size="sm" />
          <p className="text-sm text-[#6B6B6B]">Open Source · MIT License</p>
        </div>
      </footer>
    </div>
  );
}
