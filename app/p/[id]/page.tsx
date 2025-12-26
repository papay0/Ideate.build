/**
 * Public Prototype Viewer
 *
 * Shareable page for viewing prototypes.
 * URL: /p/[id]
 *
 * Features:
 * - Public access (no auth required)
 * - Slim header with OpenDesign branding + hotspot toggle
 * - Desktop: edge-to-edge, no device frame
 * - Mobile: phone frame for realistic preview
 * - Dark background
 */

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { buildPrototype } from "@/lib/prototype/builder";
import { PrototypeViewer } from "./PrototypeViewer";
import type { Metadata } from "next";

// Create Supabase client for server-side
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data: project } = await supabase
    .from("prototype_projects")
    .select("name, icon")
    .eq("id", id)
    .single();

  if (!project) {
    return {
      title: "Prototype Not Found - OpenDesign",
    };
  }

  return {
    title: `${project.icon || "🎨"} ${project.name} - OpenDesign Prototype`,
    description: `Interactive prototype created with OpenDesign`,
    openGraph: {
      title: `${project.name} - OpenDesign Prototype`,
      description: "Interactive prototype created with OpenDesign",
      type: "website",
    },
  };
}

export default async function PublicPrototypePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("prototype_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch screens
  const { data: screens, error: screensError } = await supabase
    .from("prototype_screens")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  if (screensError) {
    console.error("Error fetching screens:", screensError);
    notFound();
  }

  // Build the prototype HTML
  const prototypeHtml = buildPrototype({
    screens: (screens || []).map((s) => ({
      name: s.screen_name,
      html: s.html_content,
      isRoot: s.is_root,
    })),
    platform: project.platform as "mobile" | "desktop",
    projectName: project.name,
  });

  return (
    <PrototypeViewer
      prototypeHtml={prototypeHtml}
      platform={project.platform as "mobile" | "desktop"}
      projectName={project.name}
      projectIcon={project.icon}
    />
  );
}
